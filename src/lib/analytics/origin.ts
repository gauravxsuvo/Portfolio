import "server-only";

import { safeEqual } from "./auth";

/**
 * Proof that a request actually arrived through our own Cloudflare edge.
 *
 * ## The hole this closes
 *
 * DNS points www.mysuvo.com at Cloudflare, which proxies to Vercel — but Vercel
 * still answers on its own *.vercel.app hostname, and that name is public
 * (certificate transparency logs list it; it's also guessable). Anything that
 * connects there reaches the application with Cloudflare skipped entirely.
 *
 * That matters because of what the code trusts. getClientIp() reads
 * cf-connecting-ip first, and the comment there is careful to say *why* that's
 * safe: Cloudflare overwrites the header on the way through, so a client can't
 * forge it. That reasoning is exactly true and completely void if the client
 * never went through Cloudflare. On a direct hit, cf-connecting-ip is just a
 * string the caller typed, so every per-IP limit on the site counts each request
 * under whatever identity the attacker felt like inventing that millisecond. The
 * same goes for cf-ipcountry and the geo columns.
 *
 * ## Why a shared secret and not something cleverer
 *
 * The airtight answer is Authenticated Origin Pulls — Cloudflare presents a
 * client certificate and the origin refuses anyone without it. Vercel doesn't
 * expose the TLS layer needed to verify one, so it isn't available here.
 *
 * Checking the caller's IP against Cloudflare's published ranges was the other
 * candidate. It means shipping a list that changes without warning, and the list
 * has to be fetched from somewhere at runtime or it goes stale into a silent
 * outage. A shared secret is one string, has no expiry, and fails in exactly one
 * direction.
 *
 * So: Cloudflare sets a header on every request it forwards, we check it, and
 * nothing that hasn't been through Cloudflare can produce it. The secret only
 * ever exists in Cloudflare's rule config and Vercel's environment; it is never
 * sent to a browser and never appears in a response.
 *
 * ## Why unset means "allow"
 *
 * Fail-open is deliberate and narrow. `next dev` on localhost has no Cloudflare
 * in front of it, a fresh clone has no secret, and a preview deployment isn't
 * proxied — all three must keep working, and the alternative is a project that
 * can't be run at all until someone configures a CDN. This is a lock on a door
 * that's only worth locking in production; unset means the lock isn't installed
 * yet, not that it's broken.
 *
 * The consequence, stated so nobody has to discover it: **removing
 * ORIGIN_VERIFY_SECRET from Vercel silently reopens the bypass.** It is the
 * whole mechanism. If it's set here it must also be set in the Cloudflare rule,
 * and the two must match.
 */

/** Cloudflare sets this on every request it forwards. Not a standard header —
 *  the name is arbitrary and only has to agree with the Transform Rule. */
export const ORIGIN_VERIFY_HEADER = "x-origin-verify";

export function viaTrustedEdge(headers: Headers): boolean {
  const expected = process.env.ORIGIN_VERIFY_SECRET;
  // Not configured: nothing to compare against, so nothing is enforced. See the
  // "Why unset means allow" note above — this is the dev/preview path.
  if (!expected) return true;

  const given = headers.get(ORIGIN_VERIFY_HEADER);
  if (!given) return false;
  // Constant-time: an attacker who could time this would recover the secret one
  // byte at a time, and unlike the admin password there's no rate limit standing
  // in front of it — the check runs before any throttle, by design.
  return safeEqual(given, expected);
}
