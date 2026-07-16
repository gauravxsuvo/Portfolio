import { NextResponse } from "next/server";
import {
  checkPassword,
  isAuthConfigured,
  mintToken,
  resetAttempts,
  SESSION_TTL_SECONDS,
  tooManyAttempts,
} from "@/lib/analytics/auth";
import { recordLoginAttempt, type LoginOutcome } from "@/lib/analytics/admin-log";
import { getClientIp, getGeo, parseBrowser, parseDevice, parseOs } from "@/lib/analytics/request";

/** Login. Exchanges the password for a short-lived, memory-only bearer token. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "authentication failed.";
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent") ?? "";
  const geo = getGeo(req.headers);

  /**
   * Every attempt is logged, whatever the outcome — the failures are the whole
   * point. A log that only records successes tells you nothing about the person
   * trying to become one.
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

  if (!isAuthConfigured()) {
    // Worth recording: someone found /admin on a deployment where the env vars
    // are missing, which is itself something to know about.
    await log("not_configured");
    return NextResponse.json(
      { error: "admin auth is not configured on this deployment." },
      { status: 503, headers: NO_STORE }
    );
  }

  const rateKey = ip ?? "unknown";
  if (tooManyAttempts(rateKey)) {
    await log("rate_limited");
    return NextResponse.json(
      { error: "too many attempts. try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  let password: unknown;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    password = body?.password;
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
