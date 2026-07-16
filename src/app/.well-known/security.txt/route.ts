import { siteUrl } from "@/lib/site";
import { bio } from "@/lib/data";
import {
  securityContactEmail,
  securityPolicyUrl,
  securityTxtExpiry,
} from "@/lib/security-policy";

/**
 * RFC 9116 security.txt.
 *
 * The standard location a researcher (or an automated scanner) checks first to
 * find out where to report a vulnerability. Without it, someone who finds a
 * problem has to guess between a GitHub issue, LinkedIn, and giving up — and
 * "gave up" is how a quiet bug becomes a public one.
 *
 * It must be served from /.well-known/security.txt as text/plain. Static: none
 * of it depends on the request.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# Security contact for ${siteUrl}
# https://securitytxt.org / RFC 9116

Contact: mailto:${securityContactEmail}
Expires: ${securityTxtExpiry()}
Preferred-Languages: en
Canonical: ${siteUrl}/.well-known/security.txt
Policy: ${securityPolicyUrl}

# This is a personal portfolio site. There is no bug bounty and no budget for
# one — I can offer thanks and credit, and I will actually read your report and
# fix the thing. If you want money, this is not the target for you, and I'd
# rather tell you that up front than waste your time.

# In scope:
#   ${siteUrl}
#
# Out of scope (these are third parties, please report to them directly):
#   ${bio.github} and every repository under it -> GitHub
#   any *.vercel.app deployment                 -> Vercel
#   linked live demos on other hosts

# Please don't run automated scanners against this site at volume; it's on a
# free tier and the bill for the noise lands on me. Manual testing is welcome.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
