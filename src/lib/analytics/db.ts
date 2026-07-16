import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres access for analytics.
 *
 * The HTTP driver (not the WebSocket/Pool one) is deliberate: every query here
 * is a single independent statement, and serverless functions are the worst
 * possible place to hold a pooled TCP connection — instances are created and
 * discarded constantly, and Postgres' connection limit is the thing that
 * actually falls over first on a free tier.
 *
 * The whole module tolerates DATABASE_URL being unset. That's the normal state
 * in local dev and on a fresh clone, and analytics is not important enough to
 * break `next build` or a contributor's dev server over. Callers get null/empty
 * and carry on.
 */

let cachedSql: ReturnType<typeof neon> | null = null;

export function getSql(): ReturnType<typeof neon> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!cachedSql) cachedSql = neon(url);
  return cachedSql;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Creates the schema if absent.
 *
 * Called lazily from the ingest path rather than run as a migration step,
 * because this project has no migration tooling and adding a whole migration
 * runner for one table would be the larger sin. `IF NOT EXISTS` throughout
 * makes it idempotent and cheap; the `initialized` latch keeps it to one
 * round-trip per serverless instance rather than one per event.
 */
let initialized = false;

export async function ensureSchema(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (initialized) return true;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id          BIGSERIAL PRIMARY KEY,
        ts          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        name        TEXT         NOT NULL,
        path        TEXT         NOT NULL,
        visitor_id  TEXT         NOT NULL,
        session_id  TEXT         NOT NULL,
        referrer    TEXT,
        referrer_host TEXT,
        country     TEXT,
        region      TEXT,
        city        TEXT,
        device      TEXT,
        browser     TEXT,
        os          TEXT,
        screen_w    INTEGER,
        screen_h    INTEGER,
        ip_hash     TEXT,
        props       JSONB
      )
    `;

    // Every dashboard query is "recent events, filtered by name". A plain ts
    // index would still make the planner scan every name; this composite one
    // matches the actual access pattern. DESC because nothing ever asks for the
    // oldest rows first.
    await sql`CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS events_name_ts_idx ON events (name, ts DESC)`;
    // Unique-visitor and session counts are the two most expensive aggregates
    // on the dashboard; without these they degrade to a full scan as the table
    // grows.
    await sql`CREATE INDEX IF NOT EXISTS events_visitor_idx ON events (visitor_id, ts DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id, ts DESC)`;

    initialized = true;
    return true;
  } catch (err) {
    // Don't latch on failure — a transient error at cold start shouldn't
    // permanently convince this instance the schema is fine.
    console.error("[analytics] schema init failed:", err);
    return false;
  }
}

export type InsertableEvent = {
  name: string;
  path: string;
  visitorId: string;
  sessionId: string;
  referrer: string | null;
  referrerHost: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  screenW: number | null;
  screenH: number | null;
  ipHash: string | null;
  props: Record<string, unknown> | null;
};

/**
 * Bulk insert via UNNEST rather than N inserts or a generated VALUES list.
 * One round-trip for a whole batch, and because the arrays are still bound
 * parameters there is no string-built SQL anywhere in this path.
 */
export async function insertEvents(events: InsertableEvent[]): Promise<void> {
  const sql = getSql();
  if (!sql || events.length === 0) return;

  await sql`
    INSERT INTO events (
      name, path, visitor_id, session_id, referrer, referrer_host,
      country, region, city, device, browser, os, screen_w, screen_h,
      ip_hash, props
    )
    SELECT * FROM UNNEST(
      ${events.map((e) => e.name)}::text[],
      ${events.map((e) => e.path)}::text[],
      ${events.map((e) => e.visitorId)}::text[],
      ${events.map((e) => e.sessionId)}::text[],
      ${events.map((e) => e.referrer)}::text[],
      ${events.map((e) => e.referrerHost)}::text[],
      ${events.map((e) => e.country)}::text[],
      ${events.map((e) => e.region)}::text[],
      ${events.map((e) => e.city)}::text[],
      ${events.map((e) => e.device)}::text[],
      ${events.map((e) => e.browser)}::text[],
      ${events.map((e) => e.os)}::text[],
      ${events.map((e) => e.screenW)}::int[],
      ${events.map((e) => e.screenH)}::int[],
      ${events.map((e) => e.ipHash)}::text[],
      ${events.map((e) => (e.props ? JSON.stringify(e.props) : null))}::jsonb[]
    )
  `;
}

/**
 * Retention. The privacy policy promises raw events are deleted after 90 days,
 * and a promise with no enforcement is just a sentence — this is what makes it
 * true. Invoked opportunistically from the ingest path (see route.ts) so the
 * site needs no cron job, which Vercel's Hobby plan limits anyway.
 */
export async function purgeOldEvents(retentionDays = 90): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = (await sql`
    DELETE FROM events
    WHERE ts < now() - (${retentionDays} || ' days')::interval
    RETURNING 1
  `) as unknown[];
  return rows.length;
}
