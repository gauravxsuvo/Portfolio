"use client";

import { useEffect, useRef } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useAchievementCount } from "@/hooks/use-achievement-count";
import { useSections } from "@/hooks/use-sections";
import { useMediaQuery } from "@/hooks/use-media-query";
import { OPEN_PALETTE_EVENT } from "@/lib/shell-events";

const SESSION_START = Date.now();

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Sticky left rail — the wide-desktop margins were dead space, so they now carry
 * a live readout of the actual session.
 *
 * Every ticking value writes straight to a DOM node through a ref. These update
 * once or twice a second forever; routing them through React state would
 * re-render this subtree ~90 times a minute for no reason.
 */
export function SystemRail() {
  const clockRef = useRef<HTMLSpanElement>(null);
  const uptimeRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLSpanElement>(null);

  const found = useAchievementCount();
  // Gate on the same breakpoint the rail is shown at, and bail out of rendering
  // entirely below it. A `hidden xl:block` class would still mount the component
  // and run the fps rAF loop forever on every phone, for a counter nobody can see.
  const shown = useMediaQuery("(min-width: 1280px)");
  const { activeId } = useSections(shown);

  useEffect(() => {
    if (!shown) return;
    let raf = 0;
    let frames = 0;
    let lastSample = performance.now();

    function tick(now: number) {
      frames += 1;
      // Sample twice a second: often enough to feel live, rare enough that the
      // DOM writes are free.
      if (now - lastSample >= 500) {
        const fps = Math.round((frames * 1000) / (now - lastSample));
        if (fpsRef.current) fpsRef.current.textContent = String(Math.min(fps, 240));
        frames = 0;
        lastSample = now;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function updateClock() {
      const d = new Date();
      if (clockRef.current) {
        clockRef.current.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
      const secs = Math.floor((Date.now() - SESSION_START) / 1000);
      if (uptimeRef.current) {
        uptimeRef.current.textContent = `${Math.floor(secs / 60)}m ${pad(secs % 60)}s`;
      }
    }
    updateClock();
    const clockId = setInterval(updateClock, 1000);

    let scrollRaf = 0;
    function readScroll() {
      scrollRaf = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? Math.round((doc.scrollTop / scrollable) * 100) : 0;
      if (scrollRef.current) scrollRef.current.textContent = `${pct}%`;
      if (barRef.current) {
        const filled = Math.round(pct / 10);
        barRef.current.textContent = `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
      }
    }
    function onScroll() {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(readScroll);
    }

    function readViewport() {
      if (viewportRef.current) {
        viewportRef.current.textContent = `${window.innerWidth}x${window.innerHeight}`;
      }
      readScroll();
    }
    readViewport();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", readViewport, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      clearInterval(clockId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", readViewport);
    };
  }, [shown]);

  if (!shown) return null;

  const rows: [string, React.ReactNode][] = [
    ["time", <span key="t" ref={clockRef} className="tabular-nums" suppressHydrationWarning />],
    ["uptime", <span key="u" ref={uptimeRef} className="tabular-nums" suppressHydrationWarning />],
    ["fps", <span key="f" ref={fpsRef} className="tabular-nums" suppressHydrationWarning />],
    ["scroll", <span key="s" ref={scrollRef} className="tabular-nums" suppressHydrationWarning />],
    ["viewport", <span key="v" ref={viewportRef} className="tabular-nums" suppressHydrationWarning />],
  ];

  return (
    <aside aria-hidden="true" className="sticky top-24 h-fit w-52 shrink-0">
      <div className="border border-border">
        <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-fg/40">
          +-- system --+
        </p>
        <div className="flex flex-col gap-1 p-3 text-[11px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2">
              <span className="text-fg/40">{label}</span>
              <span className="text-primary">{value}</span>
            </div>
          ))}

          <div className="mt-1 border-t border-border pt-2">
            <p className="mb-1 text-fg/40">read</p>
            <span ref={barRef} className="block tracking-tight text-primary" suppressHydrationWarning />
          </div>

          <div className="mt-1 border-t border-border pt-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-fg/40">secrets</span>
              <span className="tabular-nums text-secondary">
                {found}/{ACHIEVEMENTS.length}
              </span>
            </div>
            {activeId && (
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-fg/40">section</span>
                <span className="truncate text-primary">{activeId.replace("section-", "")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        className="mt-3 w-full border border-border px-3 py-2 text-left text-[11px] text-fg/40 transition-colors hover:border-primary hover:text-primary"
      >
        <span className="text-primary">⌕</span> search — press /
      </button>
    </aside>
  );
}
