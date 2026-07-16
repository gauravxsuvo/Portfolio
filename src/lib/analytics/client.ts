"use client";

import { getSessionId, getVisitorId, readConsent } from "./consent";
import { LIMITS, type EventName, type EventProps } from "./events";
import { allowEvent } from "./throttle";

/**
 * The browser side of analytics.
 *
 * Two properties matter more than features here, because this runs on every
 * page of a site whose entire pitch is that it feels fast:
 *
 *   - It must never block or jank. Events are queued and flushed on an idle
 *     callback, batched into one request rather than one request per event.
 *     A visitor firing six events while poking the shell should cost one POST.
 *   - It must never break the page. Analytics is the least important code here;
 *     if the endpoint is down, the DB is gone, or an ad-blocker eats the
 *     request, every path swallows the error. Nothing this file does is allowed
 *     to surface to a visitor.
 */

type QueuedEvent = {
  name: EventName;
  path: string;
  props?: EventProps;
  referrer?: string | null;
};

let queue: QueuedEvent[] = [];
let flushHandle: number | null = null;
/** Set once the page is going away — forces the synchronous beacon path. */
let unloading = false;

const ENDPOINT = "/api/track";

/**
 * Paths that never report.
 *
 * /admin is the analytics dashboard itself. Tracking it means every time I open
 * it to read the numbers I add to them — my own visits would be a permanent
 * top-of-chart entry measuring nothing but my own curiosity, and worse, it
 * silently inflates the totals I'd then draw conclusions from. A dashboard that
 * counts its own reader is a broken instrument.
 */
function isExcluded(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Mirrors the server's validation. Doing it here too isn't redundant: it keeps
 * us from spending a visitor's bandwidth on a payload we know will be rejected,
 * and it means an oversized prop degrades to a truncated one rather than
 * silently dropping the whole event.
 */
function sanitizeProps(props?: EventProps): EventProps | undefined {
  if (!props) return undefined;
  const out: EventProps = {};
  let count = 0;
  for (const [key, value] of Object.entries(props)) {
    if (count >= LIMITS.maxPropKeys) break;
    if (value === undefined) continue;
    const k = clamp(key, LIMITS.maxPropKeyLength);
    if (typeof value === "string") {
      out[k] = clamp(value, LIMITS.maxPropValueLength);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[k] = value;
    } else if (typeof value === "boolean" || value === null) {
      out[k] = value;
    } else {
      continue;
    }
    count += 1;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  // Path only — never search or hash. A query string can carry an email in a
  // mailto-ish link or a token someone pasted, and this site has no legitimate
  // analytics use for one. Dropping it here means it cannot be stored by
  // accident later.
  return clamp(window.location.pathname, LIMITS.maxPathLength);
}

function buildBody(events: QueuedEvent[]) {
  return JSON.stringify({
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    screenW: typeof window !== "undefined" ? window.innerWidth : null,
    screenH: typeof window !== "undefined" ? window.innerHeight : null,
    events: events.map((e) => ({
      name: e.name,
      path: e.path,
      props: e.props,
      referrer: e.referrer ?? null,
    })),
  });
}

function send(events: QueuedEvent[]): void {
  if (events.length === 0) return;
  let body: string;
  try {
    body = buildBody(events);
  } catch {
    return;
  }

  // sendBeacon survives the page being torn down, which fetch() does not —
  // without it every page_exit and final scroll_depth event would be lost
  // exactly when the visitor leaves, i.e. always.
  if (unloading && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    } catch {
      // fall through to fetch
    }
  }

  try {
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      // Lets the request outlive the document during a soft navigation.
      keepalive: true,
      // No cookies needed: identity is in the payload, and omitting them keeps
      // this request cheap and unauthenticated by construction.
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // ignore
  }
}

function flush(): void {
  flushHandle = null;
  if (queue.length === 0) return;
  const batch = queue.slice(0, LIMITS.maxEventsPerRequest);
  queue = queue.slice(LIMITS.maxEventsPerRequest);
  send(batch);
  // A burst larger than one batch keeps draining rather than stranding events.
  if (queue.length > 0) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushHandle !== null || typeof window === "undefined") return;
  // requestIdleCallback keeps analytics off the critical path entirely; Safari
  // still lacks it, hence the timeout fallback. The 2s cap stops a permanently
  // busy page from never reporting.
  const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof ric === "function") {
    flushHandle = ric(() => flush(), { timeout: 2000 }) as unknown as number;
  } else {
    flushHandle = window.setTimeout(flush, 500);
  }
}

/** Public entry point. A no-op unless consent has been granted. */
export function track(name: EventName, props?: EventProps, path?: string): void {
  if (typeof window === "undefined") return;
  if (readConsent() !== "granted") return;
  const resolved = path ?? currentPath();
  if (isExcluded(resolved)) return;

  const clean = sanitizeProps(props);
  // Sanitize before the throttle check, not after: the dedupe key is built from
  // the props, and two events that only differ in a field the server would have
  // truncated away are the same event.
  if (!allowEvent(name, resolved, clean).allowed) return;

  queue.push({ name, path: resolved, props: clean });
  scheduleFlush();
}

/** Flush now, synchronously if the page is going away. */
export function flushNow(isUnloading = false): void {
  if (isUnloading) unloading = true;
  if (flushHandle !== null && typeof window !== "undefined") {
    const cic = (window as unknown as { cancelIdleCallback?: typeof cancelIdleCallback })
      .cancelIdleCallback;
    if (typeof cic === "function") {
      try {
        cic(flushHandle);
      } catch {
        window.clearTimeout(flushHandle);
      }
    } else {
      window.clearTimeout(flushHandle);
    }
    flushHandle = null;
  }
  flush();
}

/** Drop anything queued but unsent — used when consent is withdrawn mid-visit. */
export function discardQueue(): void {
  queue = [];
}
