import { NextResponse } from "next/server";
import { insertEvents, ensureSchema, isDbConfigured, purgeOldEvents, type InsertableEvent } from "@/lib/analytics/db";
import { purgeOldLogins } from "@/lib/analytics/admin-log";
import { isEventName, propsAreValid, LIMITS, type EventProps } from "@/lib/analytics/events";
import { viaTrustedEdge } from "@/lib/analytics/origin";
import {
  getClientIp,
  getGeo,
  hashIp,
  isBot,
  parseBrowser,
  parseDevice,
  parseOs,
  referrerHost,
} from "@/lib/analytics/request";

/**
 * Analytics ingest.
 *
 * This is the only endpoint on the site that writes to a database, and it is
 * public and unauthenticated by necessity — a tracker that required auth would
 * have to ship a credential to every browser, which is not a credential. So the
 * threat model is assumed-hostile: every field is treated as attacker-controlled,
 * nothing is trusted for anything but its own storage, and the worst outcome of
 * abuse is bad chart data rather than a compromised site.
 *
 * Defences, in the order they apply:
 *   1. Trusted-edge check     — proof the request came through our Cloudflare,
 *                               which is the only reason the headers below mean
 *                               anything. See the note at the top of POST().
 *   2. Same-origin check      — blocks casual cross-site POST floods.
 *   3. Body size cap          — read as text first; a 2GB body must not be
 *                               handed to JSON.parse().
 *   4. Bot filter             — keeps crawler noise out of the data.
 *   5. Per-IP rate limit      — bounds a single flooder.
 *   6. Strict field validation — closed event vocabulary, clamped lengths.
 *
 * It always answers 204. Telling an unauthenticated caller *why* their payload
 * was rejected just tells an abuser what to fix, and the browser has nothing
 * useful to do with the answer either way.
 */

export const runtime = "nodejs";
// Never cached, never prerendered: it's a write path.
export const dynamic = "force-dynamic";

const NO_CONTENT = new NextResponse(null, { status: 204 });

/**
 * In-memory per-instance rate limiter.
 *
 * Being honest about what this is: serverless instances don't share memory, so
 * the true global limit is (this limit x live instances). A distributed limiter
 * would need Redis — a second database and a paid tier — to defend a route
 * whose worst case is a junk row in a personal site's chart. This buys the
 * thing that actually matters, which is that one script hammering one instance
 * gets cut off, and it costs nothing.
 */
const RATE_LIMIT = {
  windowMs: 60_000,
  /** Requests per IP per minute. Each may carry a batch. */
  maxRequests: 60,
  /**
   * Events per IP per minute — the limit that actually matters.
   *
   * Capping requests alone was close to useless: 60 requests x 20 events per
   * batch is 1200 rows/minute from one address, which is precisely the flood
   * the limiter is supposed to stop. A real visitor generates a few dozen
   * events a minute at their most frantic, so 200 is generous and still two
   * orders of magnitude below what the request cap permitted.
   */
  maxEvents: 200,
} as const;

type Hit = { requests: number; events: number; resetAt: number };
const hits = new Map<string, Hit>();

function bucketFor(key: string, now: number): Hit {
  const entry = hits.get(key);
  if (entry && now <= entry.resetAt) return entry;
  const fresh: Hit = { requests: 0, events: 0, resetAt: now + RATE_LIMIT.windowMs };
  hits.set(key, fresh);
  // Opportunistic sweep. Without it this Map is an unbounded memory leak that
  // grows with every distinct IP for the life of the instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }
  return fresh;
}

/** Call once per request, before doing any work. */
function requestLimited(key: string, now: number): boolean {
  const b = bucketFor(key, now);
  b.requests += 1;
  return b.requests > RATE_LIMIT.maxRequests;
}

/**
 * Call with the number of rows a request wants to write. Charges the budget and
 * returns how many are allowed — a partial accept, so a visitor who trips the
 * limit mid-batch still gets their earlier events recorded rather than having
 * the whole batch silently vanish.
 */
function chargeEvents(key: string, want: number, now: number): number {
  const b = bucketFor(key, now);
  const remaining = Math.max(0, RATE_LIMIT.maxEvents - b.events);
  const granted = Math.min(want, remaining);
  b.events += granted;
  return granted;
}

/** Rejects cross-site POSTs. Not CSRF protection — there's nothing to forge
 *  here, no cookie is read — purely a cheap filter against drive-by junk. */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  // sendBeacon on some browsers omits Origin for same-origin requests.
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.slice(0, max);
}

/** Paths must look like paths. Anything else is junk or an injection attempt. */
function cleanPath(value: unknown): string | null {
  const raw = clamp(value, LIMITS.maxPathLength);
  if (!raw || !raw.startsWith("/")) return null;
  // Strip query/hash even if a client sent them — see client.ts currentPath().
  return raw.split(/[?#]/)[0] || "/";
}

function cleanProps(value: unknown): EventProps | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: EventProps = {};
  let n = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (n >= LIMITS.maxPropKeys) break;
    const key = k.slice(0, LIMITS.maxPropKeyLength);
    if (typeof v === "string") out[key] = v.slice(0, LIMITS.maxPropValueLength);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean" || v === null) out[key] = v;
    else continue;
    n += 1;
  }
  return n > 0 ? out : null;
}

function cleanDimension(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  // Bound to something physically plausible so a hostile payload can't write
  // a value that blows up a chart axis or overflows the int column.
  if (rounded < 0 || rounded > 20000) return null;
  return rounded;
}

export async function POST(req: Request) {
  /**
   * First, before any header is read for anything.
   *
   * The rate limiter below is keyed on getClientIp(), and getClientIp() trusts
   * cf-connecting-ip for one reason only: Cloudflare overwrites it, so a client
   * can't choose its own value. That reasoning is void for a request that never
   * went through Cloudflare — and Vercel answers on its own public *.vercel.app
   * hostname, so such a request is a curl command away.
   *
   * On that path every defence here quietly inverts. The per-IP request and
   * event caps are keyed on a value the caller picks, so rotating the header
   * per request means no limit at all. hashIp() hashes an invented address, so
   * "unique visitors" counts whatever the attacker felt like typing. getGeo()
   * reads invented cf-* headers. The limiter isn't weakened by this; it's
   * dissolved, and the write path behind it is the site's only database.
   *
   * /api/admin/* has had this gate for exactly the same reason. It belongs here
   * too — this route is unauthenticated, which makes it the *easier* target, not
   * a less important one.
   *
   * Unset ORIGIN_VERIFY_SECRET means "not enforced", so dev, previews and fresh
   * clones are unaffected. 204 like every other rejection: this endpoint never
   * explains itself to a caller.
   */
  if (!viaTrustedEdge(req.headers)) return NO_CONTENT;

  if (!isDbConfigured()) return NO_CONTENT;
  if (!isSameOrigin(req)) return NO_CONTENT;

  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return NO_CONTENT;

  const ip = getClientIp(req.headers);
  const rateKey = ip ?? "unknown";
  const now = Date.now();
  if (requestLimited(rateKey, now)) return NO_CONTENT;

  // Read as text, not req.json(): the size has to be checked before anything
  // tries to parse it.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NO_CONTENT;
  }
  if (raw.length === 0 || raw.length > LIMITS.maxBodyBytes) return NO_CONTENT;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NO_CONTENT;
  }
  if (!body || typeof body !== "object") return NO_CONTENT;

  const { visitorId, sessionId, screenW, screenH, events } = body as Record<string, unknown>;
  const visitor = clamp(visitorId, 64);
  const session = clamp(sessionId, 64);
  if (!visitor || !session) return NO_CONTENT;
  if (!Array.isArray(events) || events.length === 0) return NO_CONTENT;

  const geo = getGeo(req.headers);
  const ipHash = hashIp(ip);
  const browser = parseBrowser(ua);
  const os = parseOs(ua);
  const device = parseDevice(ua);
  const w = cleanDimension(screenW);
  const h = cleanDimension(screenH);

  const rows: InsertableEvent[] = [];
  for (const item of events.slice(0, LIMITS.maxEventsPerRequest)) {
    if (!item || typeof item !== "object") continue;
    const { name, path, props, referrer } = item as Record<string, unknown>;
    if (!isEventName(name)) continue;
    const cleanedPath = cleanPath(path);
    if (!cleanedPath) continue;

    const cleanedProps = cleanProps(props);
    // Drop the whole event, not just the offending prop. A scroll_depth with no
    // usable pct isn't a partial measurement worth keeping — and a stored prop
    // that a dashboard query will later cast is the one input here that can do
    // more than skew a chart. See propsAreValid().
    if (!propsAreValid(name, cleanedProps)) continue;

    const ref = clamp(referrer, LIMITS.maxReferrerLength);
    const host = referrerHost(ref);
    rows.push({
      name,
      path: cleanedPath,
      visitorId: visitor,
      sessionId: session,
      // Only the host is persisted; see referrerHost() for why the full URL is
      // dropped. Storing `host` in both columns keeps the schema stable if we
      // ever decide to keep more.
      referrer: host,
      referrerHost: host,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device,
      browser,
      os,
      screenW: w,
      screenH: h,
      ipHash,
      props: cleanedProps,
    });
  }

  if (rows.length === 0) return NO_CONTENT;

  // Charge the per-IP event budget only for rows that survived validation —
  // junk shouldn't consume a legitimate visitor's allowance on a shared NAT.
  const granted = chargeEvents(rateKey, rows.length, now);
  if (granted === 0) return NO_CONTENT;
  const accepted = granted < rows.length ? rows.slice(0, granted) : rows;

  try {
    const ready = await ensureSchema();
    if (!ready) return NO_CONTENT;
    await insertEvents(accepted);
    void maybePurge();
  } catch (err) {
    // Swallowed on purpose. A failed analytics write is not a visitor's problem
    // and must never turn into a visible error; it's logged for us instead.
    console.error("[analytics] insert failed:", err);
  }

  return NO_CONTENT;
}

/**
 * Retention enforcement without a cron job.
 *
 * Vercel's Hobby plan caps cron to one job a day, and this doesn't warrant
 * spending it. Instead each instance rolls a ~1-in-500 chance per ingest, so on
 * any site with traffic the purge runs regularly, and on a site with no traffic
 * there's nothing to purge. Failures are ignored — retention is a promise about
 * the steady state, not something worth failing an ingest over.
 */
let lastPurge = 0;
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function maybePurge(): Promise<void> {
  if (Math.random() > 1 / 500) return;
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  try {
    const deleted = await purgeOldEvents(90);
    if (deleted > 0) console.log(`[analytics] purged ${deleted} events past retention`);
    // The admin login log rides the same schedule. Smaller table, but the
    // privacy page promises 90 days for it too, and a retention promise kept
    // on one table and forgotten on the other is just a wrong promise.
    const logs = await purgeOldLogins(90);
    if (logs > 0) console.log(`[admin-log] purged ${logs} login rows past retention`);
  } catch {
    // ignore
  }
}
