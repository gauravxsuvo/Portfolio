"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adjacentRoutes } from "@/lib/routes";

/**
 * Prev/next pager, plus `[` and `]` bindings so the whole site can be walked
 * end-to-end from the keyboard without ever reaching for the nav.
 */
export function PageNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { prev, next } = adjacentRoutes(pathname);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea)$/i.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "[" && prev) router.push(prev.href);
      if (e.key === "]" && next) router.push(next.href);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next, router]);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Previous and next page"
      className="mt-16 flex items-stretch gap-3 border-t border-border pt-6"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-1 flex-col gap-0.5 border border-border px-4 py-3 transition-colors hover:border-primary"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-fg/35">
            <span
              aria-hidden="true"
              className="inline-block transition-transform group-hover:-translate-x-1"
            >
              &lt;-
            </span>{" "}
            prev
          </span>
          <span className="truncate text-sm text-fg/70 group-hover:text-primary">{prev.label}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="group flex flex-1 flex-col items-end gap-0.5 border border-border px-4 py-3 transition-colors hover:border-primary"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-fg/35">
            next{" "}
            <span
              aria-hidden="true"
              className="inline-block transition-transform group-hover:translate-x-1"
            >
              -&gt;
            </span>
          </span>
          <span className="truncate text-sm text-fg/70 group-hover:text-primary">{next.label}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
