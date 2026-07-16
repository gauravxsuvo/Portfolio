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

/**
 * Minimum secret lengths, enforced rather than suggested.
 *
 * Every other defence here is downstream of these two values actually being
 * unguessable. Rate limits raise the cost of each guess; they don't help if the
 * password is in a wordlist, because the attacker needs one guess. And the whole
 * scheme is public — the repository is open, so an attacker reads exactly how
 * this works, which is fine (it's meant to survive that) but removes any
 * pretence that a weak password is hidden behind clever code.
 *
 * 16 characters of random password is far past what an online attack can reach
 * through the limits below. 32 for the HMAC key because a guessable signing key
 * doesn't need the password at all — it forges the token and skips the login.
 *
 * This fails *closed*: too short and /admin is unreachable, exactly as if the
 * variable were missing. A warning that could be ignored would be worthless
 * precisely when it mattered, and "the deploy is broken" is a much better
 * failure than "the deploy is open".
 */
const MIN_PASSWORD_LENGTH = 16;
const MIN_SECRET_LENGTH = 32;

/** Latched so a hot instance logs this once, not once per request. */
let weakSecretsReported = false;

export function isAuthConfigured(): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;
  if (!password || !secret) return false;

  if (password.length < MIN_PASSWORD_LENGTH || secret.length < MIN_SECRET_LENGTH) {
    if (!weakSecretsReported) {
      weakSecretsReported = true;
      // Lengths only, never the values — this goes to a log aggregator.
      console.error(
        `[admin] DISABLED: secrets too short. ADMIN_PASSWORD is ${password.length} chars ` +
          `(needs >= ${MIN_PASSWORD_LENGTH}), ADMIN_SECRET is ${secret.length} chars ` +
          `(needs >= ${MIN_SECRET_LENGTH}). Generate with: ` +
          `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      );
    }
    return false;
  }
  return true;
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
 * Login throttle, layer one of two: fast, in-memory, per-instance.
 *
 * A single-password admin page with no rate limit has a password of "however
 * many guesses fit in a minute". This stops that, but it cannot be the whole
 * answer, and the reason is worth stating plainly: **serverless instances do not
 * share memory.** Every cold start brings an empty Map, so an attacker who
 * forces concurrency gets ATTEMPT_LIMIT guesses *per instance*, and the platform
 * will happily start as many instances as the incoming load asks for. Read that
 * way, this limit isn't "5 per 10 minutes" — it's "5 times however many
 * instances you can provoke", which is not a limit at all.
 *
 * So this layer's real job is narrow and it does it well: it's the cheap gate
 * that absorbs a flood without touching the database, which in turn bounds how
 * many database round-trips layer two can be made to perform.
 *
 * Layer two is the global one — see failureCounts() in admin-log.ts, called from
 * the session route. Postgres is shared by every instance, so a count taken
 * there is the real ceiling. The two compose: this one keeps the flood off the
 * database, that one makes the number mean something.
 */
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
type Attempt = { count: number; resetAt: number; rejectionLogged: boolean };
const attempts = new Map<string, Attempt>();

export type AttemptCheck = {
  /** Over the limit: refuse the request. */
  limited: boolean;
  /**
   * True on the *first* refusal of a window only.
   *
   * This exists because the audit log is a write path an anonymous caller can
   * trigger. Recording every throttled request meant a script could append rows
   * as fast as it could POST — filling the database, and worse, burying every
   * real login under thousands of identical "rate limited" rows in a panel that
   * only shows the last 25. An attacker who can erase the evidence of their own
   * attack by continuing it has beaten the log. One row per burst keeps the
   * signal ("this address got throttled at this time") and drops the flood.
   */
  firstRejection: boolean;
};

/** Records an attempt against `key` and says what to do about it. Mutates, so
 *  call exactly once per request. */
export function noteAttempt(key: string): AttemptCheck {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS, rejectionLogged: false });
    // Without this sweep the Map grows with every distinct IP forever.
    if (attempts.size > 1000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }
    return { limited: false, firstRejection: false };
  }
  entry.count += 1;
  if (entry.count <= ATTEMPT_LIMIT) return { limited: false, firstRejection: false };
  const firstRejection = !entry.rejectionLogged;
  entry.rejectionLogged = true;
  return { limited: true, firstRejection };
}

/** Clears the throttle for a key after a successful login. */
export function resetAttempts(key: string): void {
  attempts.delete(key);
}
