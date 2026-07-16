import { NextResponse } from "next/server";
import { insertEvents, ensureSchema, isDbConfigured, purgeOldEvents, type InsertableEvent } from "@/lib/analytics/db";
import { isEventName, LIMITS, type EventProps } from "@/lib/analytics/events";
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
 *   1. Same-origin check      — blocks casual cross-site POST floods.
 *   2. Body size cap          — read as text first; a 2GB body must not be
 *                               handed to JSON.parse().
 *   3. Bot filter             — keeps crawler noise out of the data.
 *   4. Per-IP rate limit      — bounds a single flooder.
 *   5. Strict field validation — closed event vocabulary, clamped lengths.
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
const RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 } as const;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    // Opportunistic sweep. Without it this Map is an unbounded memory leak that
    // grows with every distinct IP for the life of the instance.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.maxRequests;
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
  if (!isDbConfigured()) return NO_CONTENT;
  if (!isSameOrigin(req)) return NO_CONTENT;

  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return NO_CONTENT;

  const ip = getClientIp(req.headers);
  if (rateLimited(ip ?? "unknown")) return NO_CONTENT;

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
      props: cleanProps(props),
    });
  }

  if (rows.length === 0) return NO_CONTENT;

  try {
    const ready = await ensureSchema();
    if (!ready) return NO_CONTENT;
    await insertEvents(rows);
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
  } catch {
    // ignore
  }
}
