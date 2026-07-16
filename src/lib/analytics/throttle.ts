/**
 * Client-side spam control for analytics events.
 *
 * The problem this solves, concretely: somebody idly clicking around — opening
 * the palette twenty times, hammering the shell, dragging the theme slider —
 * generates hundreds of events that are all noise. They cost the visitor
 * bandwidth, cost me database rows, and make the dashboard lie, because "palette
 * opened 400 times" is one bored person, not a finding.
 *
 * Four layers, which is what the established tools do (Plausible and Umami both
 * filter client-side *and* server-side; GA4's guidance for a hot event is to
 * throttle it at the trigger). None of this is a security boundary — a hostile
 * client just won't run it — which is exactly why /api/track re-checks
 * everything independently. This layer is about the ordinary case: a real
 * visitor being enthusiastic with a mouse.
 *
 *   1. Dedupe    — identical event within a short window is dropped outright.
 *                  Kills double-clicks and repeated identical fires.
 *   2. Throttle  — per-event-type minimum interval, for the ones that can
 *                  legitimately repeat but not *that* fast.
 *   3. Bucket    — a token bucket over all events: sustained rate with a burst
 *                  allowance, so normal browsing never notices but a stuck
 *                  loop is capped.
 *   4. Session cap — a hard ceiling per session. Nothing honest reaches it.
 */

/** Sustained ~20 events/min, with a burst of 15 for a genuinely busy moment
 *  (landing on a page fires pageview + several vitals at once). */
const BUCKET_CAPACITY = 15;
const BUCKET_REFILL_PER_MS = 20 / 60_000;

/** No honest visit produces this many events. It's a backstop against a bug in
 *  this file, not against a person. */
const SESSION_EVENT_CAP = 300;

/** Identical event+path+props inside this window is a duplicate, not a repeat. */
const DEDUPE_WINDOW_MS = 1000;

/**
 * Per-type minimum gap. Only for events a person *can* repeat quickly and where
 * the repeats say nothing new. Absent from this list = only deduped, e.g.
 * pageview (a real navigation is always meaningful) and web_vital (fires once
 * per metric per page by construction).
 */
const MIN_INTERVAL_MS: Record<string, number> = {
  theme_change: 2000,
  palette_open: 1500,
  shell_command: 300,
  outbound: 500,
  email_click: 500,
  // The filter hook already debounces to the settled term; this is a backstop.
  filter: 800,
  achievement: 300,
};

type Bucket = { tokens: number; last: number };

const bucket: Bucket = { tokens: BUCKET_CAPACITY, last: 0 };
const lastSeen = new Map<string, number>();
const lastByType = new Map<string, number>();
let sessionCount = 0;

/** Stable key for "the same event happening again". */
function dedupeKey(name: string, path: string, props?: Record<string, unknown>): string {
  if (!props) return `${name}|${path}`;
  // Sorted so {a,b} and {b,a} are the same event, which they are.
  const flat = Object.keys(props)
    .sort()
    .map((k) => `${k}=${String(props[k])}`)
    .join(",");
  return `${name}|${path}|${flat}`;
}

function refill(now: number): void {
  if (bucket.last === 0) {
    bucket.last = now;
    return;
  }
  const elapsed = now - bucket.last;
  if (elapsed <= 0) return;
  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + elapsed * BUCKET_REFILL_PER_MS);
  bucket.last = now;
}

/** Keeps the dedupe map from growing without bound on a long session. */
function sweep(now: number): void {
  if (lastSeen.size < 200) return;
  for (const [k, t] of lastSeen) {
    if (now - t > DEDUPE_WINDOW_MS * 10) lastSeen.delete(k);
  }
}

export type ThrottleResult = { allowed: boolean; reason?: "duplicate" | "throttled" | "bucket" | "cap" };

/**
 * Decides whether one event may be sent. Call once per event, at the point of
 * queueing — it mutates the limiter state, so calling it speculatively would
 * consume budget for an event that never happens.
 */
export function allowEvent(
  name: string,
  path: string,
  props?: Record<string, unknown>,
  now: number = Date.now()
): ThrottleResult {
  if (sessionCount >= SESSION_EVENT_CAP) return { allowed: false, reason: "cap" };

  const key = dedupeKey(name, path, props);
  const seen = lastSeen.get(key);
  if (seen !== undefined && now - seen < DEDUPE_WINDOW_MS) {
    return { allowed: false, reason: "duplicate" };
  }

  const minGap = MIN_INTERVAL_MS[name];
  if (minGap !== undefined) {
    const prev = lastByType.get(name);
    if (prev !== undefined && now - prev < minGap) {
      return { allowed: false, reason: "throttled" };
    }
  }

  refill(now);
  if (bucket.tokens < 1) return { allowed: false, reason: "bucket" };

  bucket.tokens -= 1;
  lastSeen.set(key, now);
  lastByType.set(name, now);
  sessionCount += 1;
  sweep(now);
  return { allowed: true };
}

/** Test seam — resets every limiter to its initial state. */
export function __resetThrottle(): void {
  bucket.tokens = BUCKET_CAPACITY;
  bucket.last = 0;
  lastSeen.clear();
  lastByType.clear();
  sessionCount = 0;
}

export const __limits = {
  BUCKET_CAPACITY,
  SESSION_EVENT_CAP,
  DEDUPE_WINDOW_MS,
  MIN_INTERVAL_MS,
} as const;
