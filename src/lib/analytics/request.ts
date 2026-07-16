import "server-only";

import { createHash } from "node:crypto";

/**
 * Deriving device/geo/identity facts from a request, server-side.
 *
 * All of this is done on the server rather than in the browser for one reason:
 * the browser is not a trustworthy narrator of its own user agent, and more
 * importantly, asking it to report geo means asking for a permission prompt or
 * calling a third-party IP-lookup service — sending every visitor's IP to a
 * vendor to learn a two-letter country code. Vercel already puts the country in
 * a request header for free, and it never leaves this origin.
 */

/** Hand-rolled rather than pulling in ua-parser-js (~30KB + a transitive tree).
 *
 * This is a portfolio site's analytics: it needs "Chrome / macOS / desktop" for
 * a dashboard bar chart, not forensic accuracy across 20 years of browsers. The
 * ordering below is load-bearing — every Chromium browser lies about being
 * Chrome and Safari, and Chrome claims to be Safari, so the specific brands
 * must be tested before the generic ones or everything collapses into "Chrome".
 */
export function parseBrowser(ua: string): string {
  if (!ua) return "unknown";
  const tests: [RegExp, string][] = [
    [/edg(?:e|ios|a)?\//i, "Edge"],
    [/opr\/|opera/i, "Opera"],
    [/samsungbrowser/i, "Samsung Internet"],
    [/brave/i, "Brave"],
    [/vivaldi/i, "Vivaldi"],
    [/firefox|fxios/i, "Firefox"],
    [/chrome|crios|chromium/i, "Chrome"],
    [/safari/i, "Safari"],
  ];
  for (const [re, name] of tests) if (re.test(ua)) return name;
  return "Other";
}

export function parseOs(ua: string): string {
  if (!ua) return "unknown";
  const tests: [RegExp, string][] = [
    // iPadOS 13+ reports a Macintosh UA, so iPad must be checked before macOS.
    [/ipad/i, "iPadOS"],
    [/iphone|ipod/i, "iOS"],
    [/android/i, "Android"],
    [/cros/i, "ChromeOS"],
    [/windows nt/i, "Windows"],
    [/mac os x|macintosh/i, "macOS"],
    [/linux/i, "Linux"],
  ];
  for (const [re, name] of tests) if (re.test(ua)) return name;
  return "Other";
}

export type DeviceClass = "mobile" | "tablet" | "desktop";

export function parseDevice(ua: string): DeviceClass {
  if (!ua) return "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Bot filter.
 *
 * Without this the dashboard is fiction. A public site is crawled constantly,
 * and headless checkers, uptime pingers and preview-card fetchers (Slack,
 * Discord, WhatsApp) outnumber humans on a low-traffic personal site — they'd
 * show up as a suspiciously engaged US desktop Chrome audience.
 *
 * Note this is a *best-effort* filter on a self-declared string, and it is only
 * used to discard data. That's the right shape of decision to make on an
 * untrusted input: a bot that lies gets counted (a small error in a chart), but
 * nothing is ever granted on the strength of it.
 */
const BOT_RE =
  /bot|crawl|spider|slurp|search|fetch|monitor|curl|wget|python-requests|axios|node-fetch|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|embedly|preview|scrape|http-client|go-http|java\/|okhttp/i;

export function isBot(ua: string): boolean {
  if (!ua) return true; // A real browser always sends one. No UA = not a person.
  return BOT_RE.test(ua);
}

/**
 * A daily-rotating, salted hash of the IP — the raw address is never written
 * anywhere.
 *
 * The point of storing it at all is abuse control: it's what lets the ingest
 * route rate-limit a flood without keeping a log of who visited. Two properties
 * make it safe to keep:
 *
 *   - Salted with a server secret, so the hash can't be reversed by anyone who
 *     obtains the database. IPv4 has only ~4 billion values; an unsalted SHA-256
 *     of one is trivially brute-forced with a laptop and a wordlist, which is
 *     why "we hash IPs" is not on its own a meaningful privacy claim.
 *   - Rotated daily, so the same visitor is not linkable across days even by us.
 *
 * If ANALYTICS_SALT is unset we return null rather than falling back to an
 * unsalted hash. Storing a reversible identifier is worse than storing nothing,
 * and a missing env var must not silently downgrade a privacy guarantee.
 */
export function hashIp(ip: string | null): string | null {
  const salt = process.env.ANALYTICS_SALT;
  if (!ip || !salt) return null;
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * The client's IP.
 *
 * These headers are all client-settable and are only trustworthy because a
 * proxy we control overwrites them before our code runs. Order matters:
 *
 *   cf-connecting-ip — set by Cloudflare, always the real visitor. Cloudflare
 *                      strips any inbound copy, so it can't be spoofed through
 *                      them. This site is proxied by Cloudflare, so it wins.
 *   true-client-ip   — the same thing under its enterprise name.
 *   x-forwarded-for  — the FIRST entry is the original client; later ones are
 *                      the proxy chain. (Reading the last entry is the classic
 *                      bug that rate-limits the CDN instead of the visitor.)
 */
export function getClientIp(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const trueClient = headers.get("true-client-ip");
  if (trueClient) return trueClient.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? null;
}

export type Geo = { country: string | null; region: string | null; city: string | null };

/** Cloudflare uses these for "unknown" and "Tor exit node" respectively. */
const CF_NON_COUNTRIES = new Set(["XX", "T1"]);

/**
 * Where the visitor actually is.
 *
 * There are two proxies in front of this code — Cloudflare, then Vercel — and
 * that broke the naive version badly enough to be worth explaining.
 *
 * Vercel's x-vercel-ip-* headers are derived from the IP that connects to
 * *Vercel's* edge. With Cloudflare proxying the domain, that IP is a Cloudflare
 * PoP, not the visitor: a visitor in India was reported as Singapore, because
 * Cloudflare's free plan routes a lot of Indian traffic through its Singapore
 * PoP (CF-RAY ends `-SIN`, and Vercel then serves from `sin1`). So the Vercel
 * headers were faithfully reporting where *Cloudflare* was, which is not a fact
 * anyone wants in an analytics dashboard.
 *
 * Cloudflare's own cf-ipcountry is computed from the real visitor IP before any
 * of that, so it's authoritative here and takes precedence.
 *
 * The city/region handling is the subtle part. cf-ipcity and cf-region only
 * exist if the "Add visitor location headers" Managed Transform is enabled in
 * Cloudflare (it's free). Absent that, the only city on offer is Vercel's —
 * which is the PoP's city and therefore wrong in exactly the cases where the
 * country was wrong. So Vercel's city/region are only trusted when its country
 * agrees with Cloudflare's, i.e. when there was no PoP skew to begin with.
 * Storing nothing beats storing "Singapore" for someone in Agra.
 */
export function getGeo(headers: Headers): Geo {
  const decode = (value: string | null): string | null => {
    if (!value) return null;
    try {
      // Vercel percent-encodes city names so the header stays ASCII-safe.
      return decodeURIComponent(value).trim() || null;
    } catch {
      return value.trim() || null;
    }
  };

  const cfCountryRaw = headers.get("cf-ipcountry")?.trim().toUpperCase() || null;
  const cfCountry = cfCountryRaw && !CF_NON_COUNTRIES.has(cfCountryRaw) ? cfCountryRaw : null;

  // The *presence* of any Cloudflare header is the signal that matters, not its
  // value: it means Vercel's edge saw a Cloudflare PoP rather than the visitor,
  // so every x-vercel-ip-* value is a fact about Cloudflare's network. Falling
  // back to them when cf-ipcountry is "XX" (unknown) or "T1" (Tor) would
  // reintroduce the exact bug — Cloudflare saying "I don't know" is not an
  // invitation to believe the PoP's location instead.
  const behindCloudflare = cfCountryRaw !== null || headers.has("cf-ray");

  const country = cfCountry ?? (behindCloudflare ? null : headers.get("x-vercel-ip-country")?.trim().toUpperCase() || null);

  // Present only with Cloudflare's "Add visitor location headers" Managed
  // Transform enabled (free tier). Computed from the real visitor IP.
  const cfCity = decode(headers.get("cf-ipcity"));
  const cfRegion = decode(headers.get("cf-region"));
  if (cfCity || cfRegion) {
    return { country, region: cfRegion, city: cfCity };
  }

  if (behindCloudflare) {
    // Country from Cloudflare, but no city worth having. Null beats "Singapore"
    // for a visitor in Agra.
    return { country, region: null, city: null };
  }

  return {
    country,
    region: headers.get("x-vercel-ip-country-region")?.trim() || null,
    city: decode(headers.get("x-vercel-ip-city")),
  };
}

/**
 * Only the referrer's host is kept, never the full URL.
 *
 * A full referrer routinely carries private context in its path and query —
 * an internal Jira ticket, a Slack workspace, a search query, a session token
 * someone stuck in a URL. The host answers the only question the dashboard
 * actually asks ("where do people come from?"), so the rest is dropped at the
 * boundary and never reaches storage.
 */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
