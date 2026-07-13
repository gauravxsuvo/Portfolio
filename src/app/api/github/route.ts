import { NextResponse } from "next/server";
import { projects } from "@/lib/data";

/**
 * Server-side proxy for public GitHub repo stats.
 *
 * It exists rather than the client calling api.github.com directly for two
 * reasons: unauthenticated GitHub is rate-limited *per IP*, so from the browser
 * every visitor spends their own quota and a popular page starts 403ing; and a
 * token (if one is ever set) must never reach the client. Responses are cached
 * on the server for an hour, which is far more resolution than a star count needs.
 */

export const revalidate = 3600;

const CACHE_SECONDS = 3600;

type RepoStat = {
  name: string;
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string | null;
  url: string;
};

function parseRepo(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchRepo(owner: string, repo: string): Promise<RepoStat | null> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "gauravxsuvo-portfolio",
  };
  // Optional — raises the rate limit from 60/hr to 5000/hr. Absent in dev and
  // that is fine; the route degrades to the unauthenticated limit.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    name: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    pushed_at: string | null;
    html_url: string;
  };

  return {
    name: data.name,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    language: data.language ?? null,
    pushedAt: data.pushed_at ?? null,
    url: data.html_url,
  };
}

export async function GET() {
  const targets = projects
    .map((p) => (p.repoUrl ? parseRepo(p.repoUrl) : null))
    .filter((t): t is { owner: string; repo: string } => t !== null);

  const settled = await Promise.allSettled(
    targets.map(({ owner, repo }) => fetchRepo(owner, repo))
  );

  const repos = settled
    .filter(
      (r): r is PromiseFulfilledResult<RepoStat> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  const missing = targets.length - repos.length;

  return NextResponse.json(
    {
      ok: repos.length > 0,
      repos,
      fetchedAt: new Date().toISOString(),
      note:
        repos.length === 0
          ? "github api unreachable or rate-limited — try again shortly."
          : missing > 0
            ? `${missing} repo${missing === 1 ? "" : "s"} unavailable right now.`
            : undefined,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    }
  );
}
