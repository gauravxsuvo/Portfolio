import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * script-src carries 'unsafe-inline' deliberately. Next.js emits its own inline
 * bootstrap/flight scripts, and the theme-init script in the root layout has to
 * run before hydration to avoid a colour flash. Locking those down needs a
 * per-request nonce, which requires proxy.ts and forces every page out of static
 * generation — a real cost for a site that is otherwise entirely prerendered.
 *
 * So this policy is honest about what it buys: it does NOT stop inline script
 * injection. It DOES block loading script from any third-party origin, block
 * <base> and <object> injection, block the site being framed (clickjacking), and
 * stop forms being posted off-origin — which are the realistic vectors here,
 * given the site renders no user-supplied HTML anywhere.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  // React inline style props (cursor transforms, slider gradients) are style
  // attributes, which style-src governs.
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts JetBrains Mono at build time, so no Google origin.
  "font-src 'self'",
  "img-src 'self' data: blob:",
  // The GitHub API is called server-side by /api/github; the browser only ever
  // talks to this origin.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors on modern browsers; kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to anyone scanning.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
