"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  version: string;
  runtime: string;
  env: string;
  region: string;
  commit: string;
  content: { projects: number; publications: number; skills: number };
};

type GithubStats = {
  ok: boolean;
  repos: { name: string; stars: number; language: string | null }[];
};

/**
 * Reads the site's own API routes so the "system status" panel is reporting real
 * server state (region, build commit, live star counts) rather than decoration.
 * Everything here is progressive: if either endpoint is unreachable the row just
 * doesn't render, and nothing above it is affected.
 */
export function LiveStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/health", { signal: controller.signal }).then((r) => r.json()),
      fetch("/api/github", { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([h, g]: [Health, GithubStats]) => {
        setHealth(h);
        setStats(g);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setFailed(true);
      });

    return () => controller.abort();
  }, []);

  if (failed) return null;

  const stars = stats?.repos?.reduce((n, r) => n + r.stars, 0) ?? null;

  const rows: [string, string][] = health
    ? [
        ["endpoint", "GET /api/health"],
        ["build", `${health.commit} · ${health.env} · ${health.region}`],
        ["runtime", health.runtime],
        [
          "indexed",
          `${health.content.projects} projects · ${health.content.publications} papers · ${health.content.skills} skills`,
        ],
        ...(stars !== null
          ? ([["github", `${stars} ★ across ${stats?.repos.length ?? 0} tracked repos`]] as [
              string,
              string,
            ][])
          : []),
      ]
    : [];

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-fg/40">
        <span
          className={`inline-block h-1.5 w-1.5 ${
            health ? "animate-flicker bg-primary" : "bg-fg/30"
          }`}
          aria-hidden="true"
        />
        live from the server
      </p>

      {!health ? (
        <p className="text-xs text-fg/30">
          querying
          <span className="animate-blink">_</span>
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-secondary">{k}:</dt>
              <dd className="truncate text-fg/70">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
