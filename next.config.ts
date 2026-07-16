import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

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
 *
 * Dev needs two extra allowances, and ONLY dev gets them:
 *   'unsafe-eval'  — React uses eval() in development to rebuild callstacks
 *                    across environments; without it the dev overlay throws
 *                    "eval() is not supported in this environment".
 *   ws:            — the HMR socket. Browsers have historically not accepted
 *                    'self' as covering ws:// even on the same origin.
 * React never uses eval() in production, so the production policy stays tight.
 */
const scriptSrc = ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'"]
  .filter(Boolean)
  .join(" ");

const connectSrc = ["'self'", isDev && "ws:"].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // React inline style props (cursor transforms, slider gradients) are style
  // attributes, which style-src governs.
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts JetBrains Mono at build time, so no Google origin.
  "font-src 'self'",
  "img-src 'self' data: blob:",
  // The GitHub API is called server-side by /api/github; the browser only ever
  // talks to this origin.
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // The directives below don't inherit from default-src, so leaving them out
  // left real gaps even with `default-src 'self'` set:
  //   frame-src   — the site embeds no iframes at all; 'none' means an injected
  //                 <iframe> can't load anything, not even from this origin.
  //   worker-src  — falls back to script-src, which carries 'unsafe-inline';
  //                 pinning it to 'self' stops a blob: worker being spawned.
  //                 (img-src allows blob: for canvas work, so blob: is reachable.)
  //   media-src   — no <audio>/<video> anywhere.
  //   manifest-src— the PWA manifest is ours and same-origin.
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'self'",
  "media-src 'none'",
  "manifest-src 'self'",
  // Pointless over http://localhost and only ever a foot-gun there.
  !isDev && "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors on modern browsers; kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Everything this site will never legitimately ask for. Denying a feature
    // it doesn't use costs nothing and means an injected script can't prompt a
    // visitor for a camera or a payment sheet under this domain's name.
    value: [
      "accelerometer=()",
      "autoplay=()",
      "browsing-topics=()", // opts out of Chrome's ad-topics API entirely
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "idle-detection=()",
      "interest-cohort=()", // legacy FLoC opt-out; harmless to keep
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  // Severs the window.opener relationship, so a page this site opens can't
  // reach back into it, and isolates the browsing context group.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Stops another site embedding this one's responses as a subresource, which
  // is the read half of a Spectre-style cross-origin leak.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // The site resolves no third-party hostnames, so speculative DNS lookups
  // leak visitor IPs to nobody's benefit.
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Browsers ignore HSTS over plain http anyway, but there's no reason to ship a
  // two-year pin from a dev server.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

/**
 * Keeps the private surface out of search indexes at the transport layer.
 *
 * robots.txt is a request a crawler may ignore, and a <meta robots> tag only
 * exists once a page renders — neither covers a JSON endpoint. An X-Robots-Tag
 * header applies to every response including API routes, and the major crawlers
 * do honour it. Belt and braces with the meta tag on /admin.
 */
const noIndexHeader = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to anyone scanning.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: noIndexHeader },
      { source: "/admin", headers: noIndexHeader },
      { source: "/api/:path*", headers: noIndexHeader },
    ];
  },
};

export default nextConfig;
