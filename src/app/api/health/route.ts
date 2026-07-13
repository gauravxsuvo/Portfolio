import { NextResponse } from "next/server";
import { projects, publications, skillGroups } from "@/lib/data";

/**
 * Liveness + build metadata, in the spirit of the rest of the site: the shell's
 * `neofetch` reads a real endpoint rather than making numbers up.
 */
export const dynamic = "force-dynamic";

const BOOTED_AT = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "gauravxsuvo-portfolio",
      version: "3.1",
      // Major only. The exact patch version is free reconnaissance for anyone
      // matching a host against known CVEs, and the neofetch panel doesn't care.
      runtime: `node ${process.versions.node.split(".")[0]}.x`,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      region: process.env.VERCEL_REGION ?? "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      // Instance uptime, not user session uptime — a serverless instance is
      // recycled often, so this is honestly labelled rather than dressed up.
      instanceUptimeSeconds: Math.floor((Date.now() - BOOTED_AT) / 1000),
      content: {
        projects: projects.length,
        publications: publications.length,
        skills: skillGroups.reduce((n, g) => n + g.items.length, 0),
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
