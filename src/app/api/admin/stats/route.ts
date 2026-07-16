import { NextResponse } from "next/server";
import { bearerFrom, isAuthConfigured, mintToken, verifyToken, SESSION_TTL_SECONDS } from "@/lib/analytics/auth";
import { isDbConfigured } from "@/lib/analytics/db";
import {
  clampDays,
  getOverview,
  pageviewSeries,
  scrollDepth,
  topAchievements,
  topBrowsers,
  topCountries,
  topDevices,
  topOses,
  topOutbound,
  topPaths,
  topReferrers,
  topSearches,
  topShellCommands,
  webVitals,
  zeroResultSearches,
} from "@/lib/analytics/queries";

/**
 * The dashboard's data, behind a bearer token.
 *
 * Every response mints a fresh token, which is what makes the five-minute
 * window *sliding* rather than absolute: reading the dashboard keeps you in,
 * walking away logs you out. The client swaps its token for the new one on each
 * load.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503, headers: NO_STORE });
  }

  if (!verifyToken(bearerFrom(req.headers))) {
    // 401 is the signal the client turns back into the login screen. It covers
    // both "never logged in" and "token aged out", which are the same thing
    // from here.
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "no-database", token: mintToken(), expiresIn: SESSION_TTL_SECONDS },
      { status: 200, headers: NO_STORE }
    );
  }

  const days = clampDays(new URL(req.url).searchParams.get("range") ?? undefined);

  try {
    // One await, not fourteen sequential ones. These are independent queries and
    // Promise.all runs them concurrently; awaited in series this route would
    // take the sum of every round-trip rather than the slowest one — which is
    // most of why the dashboard felt slow.
    const [
      overview,
      series,
      paths,
      referrers,
      countries,
      devices,
      browsers,
      oses,
      shell,
      achievements,
      outbound,
      scroll,
      vitals,
      searches,
      zeroSearches,
    ] = await Promise.all([
      getOverview(days),
      pageviewSeries(days),
      topPaths(days),
      topReferrers(days),
      topCountries(days),
      topDevices(days),
      topBrowsers(days),
      topOses(days),
      topShellCommands(days),
      topAchievements(days),
      topOutbound(days),
      scrollDepth(days),
      webVitals(days),
      topSearches(days),
      zeroResultSearches(days),
    ]);

    return NextResponse.json(
      {
        days,
        overview,
        series,
        paths,
        referrers,
        countries,
        devices,
        browsers,
        oses,
        shell,
        achievements,
        outbound,
        scroll,
        vitals,
        searches,
        zeroSearches,
        fetchedAt: new Date().toISOString(),
        // Sliding session: this response is proof of activity.
        token: mintToken(),
        expiresIn: SESSION_TTL_SECONDS,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    console.error("[admin] stats query failed:", err);
    return NextResponse.json(
      { error: "query-failed", token: mintToken(), expiresIn: SESSION_TTL_SECONDS },
      { status: 200, headers: NO_STORE }
    );
  }
}
