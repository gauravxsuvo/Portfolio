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

/**
 * GitHub's own rule for owner and repo names: letters, digits, dot, dash,
 * underscore. Nothing else is a valid segment.
 */
const SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;

function parseRepo(repoUrl: string): { owner: string; repo: string } | null {
  // Anchored to the real host via URL parsing, not a substring match. The old
  // regex looked for "github.com/" anywhere in the string, so
  // "https://evil.com/github.com/a/b" matched and was treated as a GitHub repo.
  let url: URL;
  try {
    url = new URL(repoUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;

  const [, owner, rawRepo] = url.pathname.split("/");
  if (!owner || !rawRepo) return null;
  const repo = rawRepo.replace(/\.git$/, "");

  // Rejects "..", empty segments, and anything with a slash or encoded byte.
  // Without this, an owner of ".." makes the request URL below normalise to
  // https://api.github.com/admin — a path traversal out of /repos/. Today
  // repoUrl only ever comes from the static data in data.ts, so this isn't
  // reachable; it's here so that stops being load-bearing.
  if (!SEGMENT_RE.test(owner) || !SEGMENT_RE.test(repo)) return null;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") return null;

  return { owner, repo };
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

  // encodeURIComponent belt-and-braces on top of the SEGMENT_RE check above:
  // the validation is what makes this safe, but interpolating an unencoded
  // value into a URL is the habit worth not having.
  const path = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await fetch(`https://api.github.com/repos/${path}`, {
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
          ? "github api unreachable or rate-limited. try again shortly."
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
