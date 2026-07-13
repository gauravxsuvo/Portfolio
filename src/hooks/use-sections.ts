"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PAGE_SECTIONS, type PageSection } from "@/lib/routes";

const EMPTY: PageSection[] = [];

/**
 * Scroll-spy for the section rail. The section list comes from the static route
 * map (see PAGE_SECTIONS) so it's correct on the first render; only the *active*
 * section is stateful, and that's set from an IntersectionObserver callback —
 * a genuine external subscription, not a render mirror.
 */
export function useSections(enabled = true) {
  const pathname = usePathname();
  // Stable module-level reference, so this doesn't churn the effect below.
  const sections = PAGE_SECTIONS[pathname] ?? EMPTY;
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // The rails are the only consumers and they don't render below xl, so don't
    // pay for an observer on viewports that can never show the result.
    if (!enabled || sections.length === 0) return;

    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    // Track every section's ratio rather than trusting whichever entry fired
    // last: with several sections on screen at once, "most recently crossed the
    // line" is not "the one you're looking at", and the highlight flickers.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const node of nodes) {
          const ratio = ratios.get(node.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = node.id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.9], rootMargin: "-72px 0px -35% 0px" }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections, enabled]);

  // Self-healing rather than reset-by-effect: after a navigation the old active
  // id no longer exists in the new page's list, so fall back to the first.
  const active =
    activeId && sections.some((s) => s.id === activeId) ? activeId : (sections[0]?.id ?? null);

  return { sections, activeId: active };
}
