import { NextResponse } from "next/server";
import {
  checkPassword,
  isAuthConfigured,
  mintToken,
  noteAttempt,
  resetAttempts,
  SESSION_TTL_SECONDS,
} from "@/lib/analytics/auth";
import { recordLoginAttempt, type LoginOutcome } from "@/lib/analytics/admin-log";
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

export async function POST(req: Request) {
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
