import "server-only";

import { getSql } from "./db";

/**
 * Audit log for /admin login attempts — who has been trying to get into the
 * analytics panel, and whether they got in.
 *
 * Separate from `events` in every sense: different table, different lawful
 * basis, different privacy treatment. `events` is consented analytics about
 * visitors. This is a security log about attempts to open the door to that
 * data, including attempts that aren't me.
 *
 * **This is the one place the full IP is stored.** Everywhere else it's a
 * daily-rotating salted hash, and the privacy page says so. The carve-out is
 * deliberate and documented there, because a security log that can't answer
 * "who was that?" doesn't do the one job it exists for: a rotating hash makes
 * the same attacker look like a new one every midnight, and an unrecognised
 * login is only actionable if you can see where it came from.
 *
 * Lawful basis is legitimate interest (securing the site), not consent — you
 * can't ask an attacker for permission to log the attack. Scope is kept
 * proportionate: only /admin attempts, nothing about ordinary visitors, and the
 * same 90-day retention as everything else.
 */

export type LoginOutcome = "success" | "bad_password" | "rate_limited" | "not_configured";

export type LoginAttempt = {
  outcome: LoginOutcome;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string | null;
};

export type LoginRow = LoginAttempt & { ts: string };

let initialized = false;

/**
 * Created lazily, like the events table — this project has no migration runner
 * and adding one for two tables would be the larger sin. Called from both the
 * session route (which writes) and the stats route (which reads), so a fresh
 * deployment renders the panel before anyone has ever logged in rather than
 * erroring on a missing relation.
 */
export async function ensureAdminSchema(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (initialized) return true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_logins (
        id         BIGSERIAL PRIMARY KEY,
        ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
        outcome    TEXT        NOT NULL,
        ip         TEXT,
        country    TEXT,
        region     TEXT,
        city       TEXT,
        browser    TEXT,
        os         TEXT,
        device     TEXT,
        user_agent TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS admin_logins_ts_idx ON admin_logins (ts DESC)`;
    // The dashboard's two questions are "show me recent attempts" and "how many
    // failures lately" — both filter on outcome and sort by time.
    await sql`CREATE INDEX IF NOT EXISTS admin_logins_outcome_ts_idx ON admin_logins (outcome, ts DESC)`;
    initialized = true;
    return true;
  } catch (err) {
    // Don't latch on failure: a transient error at cold start shouldn't
    // convince this instance the table exists forever.
    console.error("[admin-log] schema init failed:", err);
    return false;
  }
}

/**
 * Records one attempt. Never throws.
 *
 * The swallow is load-bearing rather than lazy: this sits on the login path,
 * and an audit log that can lock you out of your own site when the database
 * hiccups has inverted its own purpose. A failure to log goes to the console
 * and the login proceeds on its own merits.
 */
export async function recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
  try {
    const sql = getSql();
    if (!sql) return;
    if (!(await ensureAdminSchema())) return;
    await sql`
      INSERT INTO admin_logins (outcome, ip, country, region, city, browser, os, device, user_agent)
      VALUES (
        ${attempt.outcome}, ${attempt.ip}, ${attempt.country}, ${attempt.region},
        ${attempt.city}, ${attempt.browser}, ${attempt.os}, ${attempt.device},
        ${attempt.userAgent?.slice(0, 400) ?? null}
      )
    `;
  } catch (err) {
    console.error("[admin-log] failed to record attempt:", err);
  }
}

/** Most recent attempts, newest first. */
export async function recentLogins(limit = 25): Promise<LoginRow[]> {
  const sql = getSql();
  if (!sql) return [];
  if (!(await ensureAdminSchema())) return [];
  const rows = (await sql`
    SELECT ts, outcome, ip, country, region, city, browser, os, device, user_agent
    FROM admin_logins
    ORDER BY ts DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    ts: r.ts instanceof Date ? r.ts.toISOString() : String(r.ts),
    outcome: String(r.outcome) as LoginOutcome,
    ip: (r.ip as string) ?? null,
    country: (r.country as string) ?? null,
    region: (r.region as string) ?? null,
    city: (r.city as string) ?? null,
    browser: (r.browser as string) ?? null,
    os: (r.os as string) ?? null,
    device: (r.device as string) ?? null,
    userAgent: (r.user_agent as string) ?? null,
  }));
}

export type FailureCounts = {
  /** Wrong passwords from this exact address inside the window. */
  fromIp: number;
  /** Wrong passwords from *everyone* inside the window. */
  total: number;
};

/**
 * The global login throttle — layer two, and the one that actually binds.
 *
 * The in-memory limiter in auth.ts can't see across serverless instances, so on
 * its own it caps guesses per instance rather than per attacker. Postgres is the
 * one thing every instance shares, and every failed attempt already writes a row
 * here, so this ceiling costs no new infrastructure: no Redis, no second vendor,
 * no paid tier. It's a single indexed count on a table that only grows when
 * someone is trying to get in.
 *
 * Two numbers, because they stop different attacks:
 *
 *   fromIp — the obvious one. Bounds a single source.
 *   total  — the backstop, and the more important of the two. A per-IP limit is
 *            worth nothing to an attacker with a botnet or a header they can
 *            spoof: they just rotate the key it's counted under and the limit
 *            never triggers. A count that isn't keyed on identity at all can't
 *            be evaded by changing identity.
 *
 * The tradeoff of `total` is real and deliberate: someone willing to burn enough
 * failed logins can lock *me* out for the window. That's the right trade. Being
 * unable to read my own analytics for ten minutes during an active brute-force
 * is an inconvenience; the alternative — an unbounded guess rate — is the whole
 * database. A lockout is also self-announcing, which a slow grind is not.
 *
 * Only 'bad_password' counts. Not 'rate_limited', which would make the block
 * feed itself, and not 'not_configured', which isn't a guess at anything.
 */
export async function failureCounts(
  ip: string | null,
  windowMinutes: number
): Promise<FailureCounts | null> {
  const sql = getSql();
  if (!sql) return null;
  if (!(await ensureAdminSchema())) return null;
  // One round-trip for both numbers, and it rides the existing
  // (outcome, ts DESC) index rather than needing one of its own.
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE ip IS NOT DISTINCT FROM ${ip}) AS from_ip,
      count(*)                                              AS total
    FROM admin_logins
    WHERE outcome = 'bad_password'
      AND ts > now() - (${windowMinutes} || ' minutes')::interval
  `) as Record<string, unknown>[];
  const r = rows[0];
  if (!r) return null;
  return { fromIp: Number(r.from_ip ?? 0), total: Number(r.total ?? 0) };
}

export type LoginSummary = {
  successes24h: number;
  failures24h: number;
  failures7d: number;
  /** Distinct IPs that failed in the last 7 days — more than a couple means
   *  someone is knocking, rather than you fat-fingering the password. */
  distinctFailingIps7d: number;
  lastSuccessTs: string | null;
  lastSuccessFrom: string | null;
};

export async function loginSummary(): Promise<LoginSummary | null> {
  const sql = getSql();
  if (!sql) return null;
  if (!(await ensureAdminSchema())) return null;
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE outcome = 'success' AND ts > now() - interval '24 hours')  AS s24,
      count(*) FILTER (WHERE outcome <> 'success' AND ts > now() - interval '24 hours') AS f24,
      count(*) FILTER (WHERE outcome <> 'success' AND ts > now() - interval '7 days')   AS f7,
      count(DISTINCT ip) FILTER (WHERE outcome <> 'success' AND ts > now() - interval '7 days') AS fips7,
      (SELECT ts FROM admin_logins WHERE outcome = 'success' ORDER BY ts DESC LIMIT 1) AS last_ok,
      (SELECT concat_ws(', ', nullif(city,''), nullif(country,''))
         FROM admin_logins WHERE outcome = 'success' ORDER BY ts DESC LIMIT 1)         AS last_ok_from
    FROM admin_logins
  `) as Record<string, unknown>[];
  const r = rows[0];
  if (!r) return null;
  const last = r.last_ok;
  return {
    successes24h: Number(r.s24 ?? 0),
    failures24h: Number(r.f24 ?? 0),
    failures7d: Number(r.f7 ?? 0),
    distinctFailingIps7d: Number(r.fips7 ?? 0),
    lastSuccessTs: last ? (last instanceof Date ? last.toISOString() : String(last)) : null,
    lastSuccessFrom: (r.last_ok_from as string) || null,
  };
}

/** Same 90-day retention as analytics events; the privacy page promises it. */
export async function purgeOldLogins(retentionDays = 90): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = (await sql`
    DELETE FROM admin_logins
    WHERE ts < now() - (${retentionDays} || ' days')::interval
    RETURNING 1
  `) as unknown[];
  return rows.length;
}
