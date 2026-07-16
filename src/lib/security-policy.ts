import { bio } from "./data";
import { siteUrl } from "./site";

/**
 * Shared facts for the security policy, so the human page at /security and the
 * machine-readable /.well-known/security.txt can't disagree about the contact
 * address or the expiry date.
 */

export const SECURITY_POLICY_UPDATED = "2026-07-16";

/**
 * RFC 9116 requires an Expires field and says a scanner should treat the file
 * as stale past it. Twelve months out, recomputed at build time: a hardcoded
 * date would silently expire and turn the file into a signal that the site is
 * unmaintained.
 */
export function securityTxtExpiry(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCMilliseconds(0);
  return d.toISOString().replace(".000", "");
}

export const securityContactEmail = bio.email;
export const securityPolicyUrl = `${siteUrl}/security`;
