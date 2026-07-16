import "server-only";

import { getSql } from "./db";

/**
 * Dashboard aggregates.
 *
 * Every function takes `days` and every query is parameterised — the range
 * comes from a URL query string, so it is attacker-controlled and never
 * interpolated into SQL. The neon tagged template binds parameters, but that
 * only holds while nobody hands it a pre-built string, hence clampDays() below
 * rather than trusting the caller.
 */

export type Row = { label: string; value: number };

/** The range selector is a fixed set; anything else is coerced to 30. */
export function clampDays(input: string | undefined): number {
  const allowed = [1, 7, 30, 90];
  const n = Number(input);
  return allowed.includes(n) ? n : 30;
}

export type Overview = {
  pageviews: number;
  visitors: number;
  sessions: number;
  avgSeconds: number;
  bounceRate: number;
};

export async function getOverview(days: number): Promise<Overview | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = (await sql`
    WITH window_events AS (
      SELECT * FROM events WHERE ts > now() - (${days} || ' days')::interval
    ),
    session_pages AS (
      SELECT session_id, count(*) AS views
      FROM window_events WHERE name = 'pageview'
      GROUP BY session_id
    )
    SELECT
      (SELECT count(*) FROM window_events WHERE name = 'pageview')            AS pageviews,
      (SELECT count(DISTINCT visitor_id) FROM window_events)                  AS visitors,
      (SELECT count(DISTINCT session_id) FROM window_events)                  AS sessions,
      -- Digit-bounded, not just "is digits": '^[0-9]+$' happily matches a
      -- 60-digit number, and one of those in an avg() makes "avg time" read as
      -- 4e59 seconds. Bounding the *pattern* rather than adding a range check
      -- is deliberate: a numeric range check in WHERE could be evaluated before
      -- the regex that makes its own cast safe, since Postgres doesn't promise
      -- to order WHERE conditions. The pattern can't have that problem.
      (SELECT coalesce(avg((props->>'seconds')::numeric), 0)
         FROM window_events
        WHERE name = 'page_exit' AND props->>'seconds' ~ '^[0-9]{1,4}$')      AS avg_seconds,
      (SELECT coalesce(
                100.0 * count(*) FILTER (WHERE views = 1) / nullif(count(*), 0), 0)
         FROM session_pages)                                                  AS bounce_rate
  `) as Record<string, unknown>[];

  const r = rows[0];
  if (!r) return null;
  return {
    pageviews: Number(r.pageviews ?? 0),
    visitors: Number(r.visitors ?? 0),
    sessions: Number(r.sessions ?? 0),
    avgSeconds: Math.round(Number(r.avg_seconds ?? 0)),
    bounceRate: Math.round(Number(r.bounce_rate ?? 0)),
  };
}

async function topBy(
  days: number,
  column: "path" | "country" | "device" | "browser" | "os" | "referrer_host",
  limit = 10
): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];

  // A switch, not string interpolation. `column` is internal today, but a
  // literal template hole in a SQL identifier position is exactly the shape of
  // bug that becomes an injection the first time someone wires it to a param.
  const rows = (await (async () => {
    switch (column) {
      case "path":
        return sql`SELECT path AS label, count(*) AS value FROM events
                   WHERE name='pageview' AND ts > now() - (${days} || ' days')::interval
                   GROUP BY path ORDER BY value DESC LIMIT ${limit}`;
      case "country":
        return sql`SELECT coalesce(country,'??') AS label, count(DISTINCT visitor_id) AS value FROM events
                   WHERE ts > now() - (${days} || ' days')::interval
                   GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`;
      case "device":
        return sql`SELECT coalesce(device,'unknown') AS label, count(DISTINCT session_id) AS value FROM events
                   WHERE ts > now() - (${days} || ' days')::interval
                   GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`;
      case "browser":
        return sql`SELECT coalesce(browser,'unknown') AS label, count(DISTINCT session_id) AS value FROM events
                   WHERE ts > now() - (${days} || ' days')::interval
                   GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`;
      case "os":
        return sql`SELECT coalesce(os,'unknown') AS label, count(DISTINCT session_id) AS value FROM events
                   WHERE ts > now() - (${days} || ' days')::interval
                   GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`;
      case "referrer_host":
        return sql`SELECT referrer_host AS label, count(*) AS value FROM events
                   WHERE name='pageview' AND referrer_host IS NOT NULL
                     AND ts > now() - (${days} || ' days')::interval
                   GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`;
    }
  })()) as Record<string, unknown>[];

  return rows.map((r) => ({ label: String(r.label ?? "unknown"), value: Number(r.value ?? 0) }));
}

export const topPaths = (d: number) => topBy(d, "path");
export const topCountries = (d: number) => topBy(d, "country");
export const topDevices = (d: number) => topBy(d, "device");
export const topBrowsers = (d: number) => topBy(d, "browser");
export const topOses = (d: number) => topBy(d, "os");
export const topReferrers = (d: number) => topBy(d, "referrer_host");

/** Counts grouped by a JSON prop — used for shell commands, achievements etc. */
async function topProp(days: number, eventName: string, key: string, limit = 12): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    SELECT props->>${key} AS label, count(*) AS value
    FROM events
    WHERE name = ${eventName}
      -- Empty string, not just NULL: an event whose prop is "" is junk from a
      -- caller that didn't validate, and it renders as a nameless bar. IS NOT
      -- NULL alone would let it through.
      AND coalesce(props->>${key}, '') <> ''
      AND ts > now() - (${days} || ' days')::interval
    GROUP BY 1 ORDER BY value DESC LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value ?? 0) }));
}

export const topShellCommands = (d: number) => topProp(d, "shell_command", "name");
export const topAchievements = (d: number) => topProp(d, "achievement", "id");
export const topOutbound = (d: number) => topProp(d, "outbound", "to");
export const topSearches = (d: number) => topProp(d, "filter", "term");

/**
 * Filter terms that found nothing — the most actionable rows in the whole
 * dashboard, since each one is a person looking for something this site doesn't
 * have or doesn't name the way they expected.
 */
export async function zeroResultSearches(days: number, limit = 10): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    SELECT props->>'term' AS label, count(*) AS value
    FROM events
    WHERE name = 'filter'
      AND coalesce(props->>'term', '') <> ''
      AND (props->>'results') = '0'
      AND ts > now() - (${days} || ' days')::interval
    GROUP BY 1 ORDER BY value DESC LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value ?? 0) }));
}

/** Daily pageview series for the sparkline. Zero-filled so gaps read as zero
 *  rather than as a shorter, misleadingly smooth line. */
export async function pageviewSeries(days: number): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    SELECT to_char(d.day, 'MM-DD') AS label, coalesce(e.count, 0) AS value
    FROM generate_series(
           date_trunc('day', now()) - ((${days} - 1) || ' days')::interval,
           date_trunc('day', now()),
           '1 day'
         ) AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', ts) AS day, count(*) AS count
      FROM events
      WHERE name = 'pageview' AND ts > now() - (${days} || ' days')::interval
      GROUP BY 1
    ) e ON e.day = d.day
    ORDER BY d.day
  `) as Record<string, unknown>[];
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value ?? 0) }));
}

export type VitalRow = { metric: string; p75: number; rating: string };

/**
 * Web Vitals reported at the 75th percentile, which is the threshold Google
 * actually scores — an average would hide exactly the slow tail that fails the
 * assessment.
 */
export async function webVitals(days: number): Promise<VitalRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    SELECT props->>'metric' AS metric,
           percentile_cont(0.75) WITHIN GROUP (
             ORDER BY (props->>'value')::numeric
           ) AS p75,
           count(*) AS samples
    FROM events
    WHERE name = 'web_vital'
      AND props->>'metric' IS NOT NULL
      -- Same digit bound as avg_seconds above, for the same reason: this regex
      -- is what makes the ::numeric in percentile_cont safe, and an unbounded
      -- one lets a single hostile sample dominate the percentile.
      AND props->>'value' ~ '^[0-9]{1,7}(\\.[0-9]{1,4})?$'
      AND ts > now() - (${days} || ' days')::interval
    GROUP BY 1 ORDER BY 1
  `) as Record<string, unknown>[];

  // Google's published good/needs-improvement boundaries.
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  return rows.map((r) => {
    const metric = String(r.metric);
    const p75 = Number(r.p75 ?? 0);
    const t = thresholds[metric];
    const rating = !t ? "unknown" : p75 <= t[0] ? "good" : p75 <= t[1] ? "needs work" : "poor";
    return { metric, p75, rating };
  });
}

/** Scroll reach on the long pages: what share of pageviews got to each bucket. */
export async function scrollDepth(days: number): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    SELECT (props->>'pct') AS label, count(DISTINCT session_id || path) AS value
    FROM events
    WHERE name = 'scroll_depth'
      -- Must match the exact buckets the client emits, not merely "is not null".
      -- ORDER BY casts this to int, and a bad cast aborts the statement rather
      -- than skipping the row: with the stats route running everything in one
      -- Promise.all, a single junk value took the whole dashboard down for the
      -- 90 days until it aged out. The ingest route rejects these now
      -- (propsAreValid), but this is the layer that has to hold for rows already
      -- stored, and it costs one regex.
      AND props->>'pct' ~ '^(25|50|75|100)$'
      AND ts > now() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY (props->>'pct')::int
  `) as Record<string, unknown>[];
  return rows.map((r) => ({ label: `${r.label}%`, value: Number(r.value ?? 0) }));
}
