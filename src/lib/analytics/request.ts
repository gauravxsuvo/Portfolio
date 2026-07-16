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
 * x-forwarded-for is a client-settable header; it is only trustworthy because
 * Vercel's proxy overwrites it before our code runs. The FIRST entry is the
 * original client — later ones are the proxy chain. (Reading the last entry is
 * a classic bug that rate-limits the CDN instead of the visitor.)
 */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? null;
}

export type Geo = { country: string | null; region: string | null; city: string | null };

export function getGeo(headers: Headers): Geo {
  const decode = (value: string | null): string | null => {
    if (!value) return null;
    try {
      // Vercel percent-encodes city names so a header stays ASCII-safe.
      return decodeURIComponent(value) || null;
    } catch {
      return value;
    }
  };
  return {
    country: headers.get("x-vercel-ip-country"),
    region: headers.get("x-vercel-ip-country-region"),
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
