/**
 * The analytics event vocabulary, shared by the browser tracker and the ingest
 * route.
 *
 * This is a closed union rather than an open `string` on purpose. The ingest
 * endpoint is public and unauthenticated — anything on the internet can POST to
 * it. A closed set means a junk or hostile payload is rejected at the door
 * instead of becoming a permanent row that quietly poisons the dashboard, and
 * it stops the events table filling with typo'd near-duplicates
 * ("outbound_click" vs "outbound-click") that only surface months later when a
 * count looks wrong.
 */
/**
 * Every name here must be fired somewhere and described on /privacy. Declaring
 * one that nothing sends is not harmless: "easter_egg" and "copy" sat here
 * unfired, and "filter" was listed on the privacy page as collected while no
 * code sent it — a policy claiming collection that wasn't happening, which is
 * the same drift as one hiding collection that was.
 */
export const EVENT_NAMES = [
  "pageview",
  "web_vital",
  "scroll_depth",
  "page_exit",
  "outbound",
  "email_click",
  "shell_command",
  "achievement",
  "palette_open",
  "theme_change",
  "filter",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const EVENT_NAME_SET: ReadonlySet<string> = new Set(EVENT_NAMES);

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && EVENT_NAME_SET.has(value);
}

/** Arbitrary per-event detail. Kept flat and small — see LIMITS below. */
export type EventProps = Record<string, string | number | boolean | null>;

export type TrackPayload = {
  name: EventName;
  path: string;
  props?: EventProps;
  /** Milliseconds since the session's first event. Set by the client. */
  sessionId: string;
  visitorId: string;
  referrer?: string | null;
  /** Viewport width, the one device fact the server can't infer from headers. */
  screenW?: number | null;
  screenH?: number | null;
};

/**
 * Hard caps enforced on *both* sides. The client obeys them so it never sends
 * something the server will drop; the server re-checks because a client is only
 * a suggestion. Sized so one row stays comfortably small — 0.5GB of Neon free
 * tier is millions of events only if a row can't grow unbounded.
 */
export const LIMITS = {
  /** One POST may carry a batch; this bounds the fan-out per request. */
  maxEventsPerRequest: 20,
  maxPathLength: 512,
  maxReferrerLength: 512,
  maxPropKeys: 12,
  maxPropKeyLength: 40,
  maxPropValueLength: 200,
  /** Total serialized bytes of one request body. */
  maxBodyBytes: 16_000,
} as const;
