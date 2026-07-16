import { NextResponse } from "next/server";
import {
  checkPassword,
  isAuthConfigured,
  mintToken,
  noteAttempt,
  resetAttempts,
  SESSION_TTL_SECONDS,
} from "@/lib/analytics/auth";
import { failureCounts, recordLoginAttempt, type LoginOutcome } from "@/lib/analytics/admin-log";
import { viaTrustedEdge } from "@/lib/analytics/origin";
import { getClientIp, getGeo, parseBrowser, parseDevice, parseOs } from "@/lib/analytics/request";

/** Login. Exchanges the password for a short-lived, memory-only bearer token. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "authentication failed.";
const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * A password is a password, not a payload. Without a cap this route handed an
 * arbitrarily large body straight to JSON.parse() — /api/track learned that
 * lesson already and reads as text first; there's no reason this one shouldn't.
 */
const MAX_BODY_BYTES = 2_000;

/**
 * The global ceiling, counted in Postgres so it holds across every serverless
 * instance at once. See failureCounts() for why the per-instance limiter can't
 * do this job alone.
 *
 * Sized against what an honest login looks like: it's one person, who either
 * knows the password or is pasting it. Ten wrong guesses from one address in ten
 * minutes is already nothing a human does. Fifty site-wide is impossible unless
 * something is very wrong, which is exactly when a hard stop is wanted.
 *
 * Even at the global ceiling, an attacker gets 50 guesses per 10 minutes —
 * ~7,200 a day. Against 16 random characters that is not a rounding error away
 * from zero; it *is* zero. The limits and the password-length floor are one
 * defence, not two.
 */
const FAILURE_WINDOW_MINUTES = 10;
const MAX_FAILURES_FROM_IP = 10;
const MAX_FAILURES_GLOBAL = 50;

export async function POST(req: Request) {
  /**
   * Before anything else — before the throttle, before a row is written, before
   * an IP is even read.
   *
   * Everything below this line trusts cf-connecting-ip to say who's calling, and
   * that header is only trustworthy because Cloudflare overwrites it. A request
   * that reached Vercel's *.vercel.app hostname directly never met Cloudflare,
   * so it can claim any IP it likes — which doesn't just weaken the per-IP
   * limit, it dissolves it, and poisons the audit log with invented addresses at
   * the same time. Checking anything else first would mean reasoning about an
   * identity we have no reason to believe.
   *
   * 404, not 403: a probe that never went through the edge learns only that
   * there's nothing here, rather than "correct guess, wrong credential".
   */
  if (!viaTrustedEdge(req.headers)) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent") ?? "";
  const geo = getGeo(req.headers);

  /**
   * Every attempt that got as far as being judged is logged, whatever the
   * verdict — the failures are the whole point. A log that only records
   * successes tells you nothing about the person trying to become one. The one
   * exception is a request already refused by the throttle, which is recorded
   * once per burst rather than once per request; see AttemptCheck.
   *
   * Awaited rather than fired-and-forgotten: on a serverless runtime the
   * instance can be frozen the moment the response returns, and a dangling
   * promise is simply lost. An audit trail with holes in it under load is worse
   * than none, because you'd trust it. It's one insert on the login path only.
   */
  const log = (outcome: LoginOutcome) =>
    recordLoginAttempt({
      outcome,
      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      browser: parseBrowser(ua),
      os: parseOs(ua),
      device: parseDevice(ua),
      userAgent: ua || null,
    });

  /**
   * The throttle runs first — before the not-configured branch, before the body
   * is even read.
   *
   * Order matters here because every branch below writes an audit row, and this
   * is the only way an anonymous caller can put one there. Checking auth config
   * first (as this did) meant a misconfigured deployment appended a row per
   * request with no limit at all, and logging every throttled request meant the
   * limiter capped password *guesses* while leaving row *writes* unbounded —
   * so a script could bury every real login under thousands of identical rows
   * in a panel that shows the last 25. The throttle has to be the outermost
   * gate for it to bound anything.
   */
  const rateKey = ip ?? "unknown";
  const attempt = noteAttempt(rateKey);
  if (attempt.limited) {
    // One row per throttled burst, not per request. See AttemptCheck.
    if (attempt.firstRejection) await log("rate_limited");
    return NextResponse.json(
      { error: "too many attempts. try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  if (!isAuthConfigured()) {
    // Worth recording: someone found /admin on a deployment where the env vars
    // are missing, which is itself something to know about.
    await log("not_configured");
    return NextResponse.json(
      { error: "admin auth is not configured on this deployment." },
      { status: 503, headers: NO_STORE }
    );
  }

  /**
   * The global gate. Deliberately *not* logged when it refuses: the rows that
   * caused this decision are already in the table — that's what was counted —
   * and appending "blocked" rows for each rejected request is how an audit log
   * gets flooded by the attack it exists to record.
   *
   * Fails open to the in-memory limiter if the database is unreachable
   * (`null`), rather than closed. Failing closed here would hand anyone a
   * lockout: knock Neon over, or just wait for it to blink, and /admin is sealed
   * for everyone including me. The password is still the wall in that window,
   * and the per-instance limiter still stands.
   */
  const failures = await failureCounts(ip, FAILURE_WINDOW_MINUTES);
  if (
    failures &&
    (failures.fromIp >= MAX_FAILURES_FROM_IP || failures.total >= MAX_FAILURES_GLOBAL)
  ) {
    return NextResponse.json(
      { error: "too many attempts. try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  let password: unknown;
  try {
    const raw = await req.text();
    if (raw.length === 0 || raw.length > MAX_BODY_BYTES) throw new Error("body");
    password = (JSON.parse(raw) as Record<string, unknown>)?.password;
  } catch {
    await log("bad_password");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: NO_STORE });
  }

  // One message for "no password" and "wrong password" alike. A more specific
  // error would confirm to a guesser which half they got right.
  if (typeof password !== "string" || !checkPassword(password)) {
    await log("bad_password");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: NO_STORE });
  }

  // Don't let a successful login leave the throttle primed against yourself.
  resetAttempts(rateKey);
  await log("success");

  return NextResponse.json(
    { token: mintToken(), expiresIn: SESSION_TTL_SECONDS },
    { status: 200, headers: NO_STORE }
  );
}
