import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Auth for /admin.
 *
 * This guards every visitor's browsing history on the site, so it gets treated
 * as a real auth system despite having exactly one user. Two secrets, both
 * required, both env-only:
 *
 *   ADMIN_PASSWORD  — what you type.
 *   ADMIN_SECRET    — HMAC key for the session cookie.
 *
 * A stateless signed cookie rather than a session table: there's one user, so a
 * DB round-trip per page load buys nothing. The tradeoff is that sessions can't
 * be revoked individually — rotating ADMIN_SECRET invalidates all of them at
 * once, which for a single-user dashboard is a complete answer.
 *
 * If either secret is unset, auth fails closed and /admin is unreachable. The
 * tempting alternative — a default password, or skipping auth when unconfigured
 * — would mean a forgotten env var silently publishes the analytics of everyone
 * who ever visited. An admin page nobody can open is a much better failure than
 * one everybody can.
 */

/**
 * The __Host- prefix is enforced by the browser, not by us: it refuses to store
 * the cookie unless it's Secure, Path=/, and has no Domain attribute. That last
 * part is the point — it makes the cookie unsettable by any subdomain, so a
 * compromised or attacker-registered *.mysuvo.com can't "toss" a suvo_admin
 * cookie up to the parent domain and interfere with the session.
 *
 * It requires Secure, which localhost-over-http can't satisfy, so dev drops the
 * prefix. The name differing between dev and prod is fine: nothing reads this
 * cookie but this module.
 */
const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-suvo_admin" : "suvo_admin";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

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

/** Token: <issuedAt>.<nonce>.<hmac>. The nonce makes tokens distinct even
 *  within the same second, so a re-login doesn't mint a byte-identical cookie. */
function mintToken(): string {
  const issued = Date.now().toString(36);
  const nonce = randomBytes(12).toString("base64url");
  const body = `${issued}.${nonce}`;
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string): boolean {
  if (!isAuthConfigured()) return false;
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

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, mintToken(), {
    // Unreadable from JS, so the site's own XSS surface can't exfiltrate it.
    httpOnly: true,
    // Not sent over plain http in production. Left off in dev because
    // localhost isn't https and the cookie would simply never be stored.
    secure: process.env.NODE_ENV === "production",
    // "strict", not "lax": nothing should ever link into an authed /admin from
    // another site, so there's no usability cost, and it closes cross-site
    // request forgery on the logout/read routes entirely.
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthed(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : false;
}
