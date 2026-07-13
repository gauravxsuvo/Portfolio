"use client";

import { useEffect, useRef } from "react";

/**
 * Read-position rail along the nav's bottom edge. Writes a CSS variable straight
 * to the DOM node from a rAF-coalesced scroll listener rather than going through
 * React state — this fires on every scroll frame and has no business re-rendering
 * the tree.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    function update() {
      raf = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      el?.style.setProperty("--progress", String(Math.min(1, Math.max(0, progress))));
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="scroll-progress absolute inset-x-0 bottom-[-1px] h-px bg-primary"
    />
  );
}
