import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Auth for /admin.
 *
 * This guards every visitor's browsing history, so it's treated as a real auth
 * system despite having exactly one user. Two secrets, both required, both
 * env-only:
 *
 *   ADMIN_PASSWORD  — what you type.
 *   ADMIN_SECRET    — HMAC key for the session token.
 *
 * **There is no cookie.** The token is returned in the response body and the
 * dashboard holds it in a React state variable, nowhere else. That's a
 * deliberate answer to "I shouldn't stay logged in if I refresh or close the
 * tab": a cookie's entire purpose is to survive those, so honouring that
 * requirement with one would mean setting a cookie and then building machinery
 * to defeat it. Memory has the wanted lifetime natively — a refresh drops the
 * JS heap, and the token with it.
 *
 * The tradeoff, stated plainly: a cookie can be httpOnly and therefore
 * unreadable by injected script, whereas an in-memory token is readable by any
 * XSS on the page. That's an acceptable trade *here* because the CSP blocks
 * third-party script outright, the site renders no user-supplied HTML, and the
 * token dies in five minutes regardless. It also removes CSRF as a category
 * entirely: nothing is sent ambiently, so there's nothing to forge.
 *
 * If either secret is unset, auth fails closed and /admin is unreachable. The
 * tempting alternative — a default password, or skipping auth when
 * unconfigured — would mean a forgotten env var silently publishes the
 * analytics of everyone who ever visited.
 */

/**
 * Five minutes, sliding. Every authenticated response mints a fresh token, so
 * activity extends the session and idleness ends it. Short because the only
 * thing behind it is a dashboard you read for a minute at a time.
 */
export const SESSION_TTL_SECONDS = 5 * 60;

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
}

/**
 * Compares without leaking the answer through timing.
 *
 * `a === b` on a secret returns as soon as it hits a differing byte, so the
 * time it takes reveals how many leading characters were right — enough to
 * recover a password one character at a time. timingSafeEqual always reads
 * every byte. It also throws on a length mismatch (which itself leaks length),
 * so both sides are hashed to a fixed 32 bytes first.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(value: string): string {
  const secret = process.env.ADMIN_SECRET as string;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Token: <issuedAt>.<nonce>.<hmac>. The nonce keeps two tokens minted in the
 *  same millisecond distinct. */
export function mintToken(): string {
  const issued = Date.now().toString(36);
  const nonce = randomBytes(12).toString("base64url");
  const body = `${issued}.${nonce}`;
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | null | undefined): boolean {
  if (!token || !isAuthConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issued, nonce, mac] = parts;
  // Verify the signature BEFORE trusting any other field: without this the
  // expiry check below would be reading an attacker-supplied timestamp.
  if (!safeEqual(mac, sign(`${issued}.${nonce}`))) return false;

  const issuedMs = parseInt(issued, 36);
  if (!Number.isFinite(issuedMs)) return false;
  const ageSeconds = (Date.now() - issuedMs) / 1000;
  // Reject future-dated tokens too — with a valid signature that should be
  // impossible, so it means clock skew or a leaked secret.
  if (ageSeconds < -60 || ageSeconds > SESSION_TTL_SECONDS) return false;
  return true;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !isAuthConfigured()) return false;
  return safeEqual(candidate, expected);
}

/** Reads the bearer token from an Authorization header. */
export function bearerFrom(headers: Headers): string | null {
  const raw = headers.get("authorization");
  if (!raw) return null;
  const [scheme, token] = raw.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Login throttle.
 *
 * A single-password admin page with no rate limit has a password of "however
 * many guesses fit in a minute". Per-instance and in-memory, with the same
 * caveat as the ingest limiter (instances don't share state) — but here it
 * backs a real password rather than being the only defence, so the goal is to
 * make online brute force impractical, not impossible.
 */
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    // Without this sweep the Map grows with every distinct IP forever.
    if (attempts.size > 1000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > ATTEMPT_LIMIT;
}

/** Clears the throttle for a key after a successful login. */
export function resetAttempts(key: string): void {
  attempts.delete(key);
}
