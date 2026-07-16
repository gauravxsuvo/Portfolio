import { NextResponse } from "next/server";
import {
  checkPassword,
  isAuthConfigured,
  mintToken,
  resetAttempts,
  SESSION_TTL_SECONDS,
  tooManyAttempts,
} from "@/lib/analytics/auth";
import { getClientIp } from "@/lib/analytics/request";

/** Login. Exchanges the password for a short-lived, memory-only bearer token. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "authentication failed.";

export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "admin auth is not configured on this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const ip = getClientIp(req.headers) ?? "unknown";
  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: "too many attempts. try again later." },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  let password: unknown;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    password = body?.password;
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // One message for "no password" and "wrong password" alike. A more specific
  // error would confirm to a guesser which half they got right.
  if (typeof password !== "string" || !checkPassword(password)) {
    return NextResponse.json(
      { error: GENERIC_ERROR },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Don't let a successful login leave the throttle primed against yourself.
  resetAttempts(ip);

  return NextResponse.json(
    { token: mintToken(), expiresIn: SESSION_TTL_SECONDS },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
