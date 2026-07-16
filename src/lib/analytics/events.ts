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
 * Rules for the props that a dashboard query later casts to a number.
 *
 * Deliberately narrower than "validate every prop". Most props are free text
 * that only ever gets counted and rendered, so a junk `shell_command.name` is a
 * silly bar in a chart and nothing worse — that's the accepted cost of a public
 * ingest endpoint. But a few props are read back out of JSONB and cast (`::int`,
 * `::numeric`) by /admin's queries, and Postgres does not shrug at a bad cast:
 * it aborts the whole statement. Since the stats route runs its queries in one
 * Promise.all, a single `{ pct: "lol" }` row from one anonymous POST takes the
 * *entire* dashboard down — and keeps it down for the 90 days until that row
 * ages out.
 *
 * So the criterion for appearing here is exactly "SQL casts this": if you write
 * a query that casts a new prop, it needs a rule below, and the matching regex
 * guard in queries.ts.
 */
type NumericRule = { min: number; max: number; oneOf?: readonly number[] };

const NUMERIC_PROP_RULES: Partial<Record<EventName, Record<string, NumericRule>>> = {
  // scrollDepth() casts pct to int and orders by it.
  scroll_depth: { pct: { min: 25, max: 100, oneOf: [25, 50, 75, 100] } },
  // getOverview() averages seconds as numeric. Upper bound matches the client's
  // own "a tab left open overnight isn't engagement" cutoff.
  page_exit: { seconds: { min: 1, max: 3599 } },
  // webVitals() takes a percentile over value. An hour is far past "poor" for
  // every metric Google defines; anything beyond it is noise or malice.
  web_vital: { value: { min: 0, max: 3_600_000 } },
};

/**
 * True if every numeric-constrained prop on this event is in range.
 *
 * Rejects rather than coerces. A value outside these bounds cannot have come
 * from this site's own code, so there is no honest reading to salvage — clamping
 * it would just launder a hostile payload into a plausible-looking row.
 */
export function propsAreValid(name: EventName, props: EventProps | null | undefined): boolean {
  const rules = NUMERIC_PROP_RULES[name];
  if (!rules) return true;
  for (const [key, rule] of Object.entries(rules)) {
    const value = props?.[key];
    // Absent is fine: the queries all skip null props. It's a *present but
    // wrong* value that breaks them.
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    if (rule.oneOf) {
      if (!rule.oneOf.includes(value)) return false;
    } else if (value < rule.min || value > rule.max) {
      return false;
    }
  }
  return true;
}

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
