"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Drives two CSS custom properties from scroll velocity:
 *   --scroll-warp  0..1  how hard the CRT is being pushed
 *   --scroll-dir  -1..1  direction, so the chromatic split leans the right way
 *
 * A real CRT smears when the image moves fast; flinging the page now produces a
 * brief RGB split and a scanline squeeze that settles the moment you stop. It's
 * expressed as a single variable so the effect itself is pure CSS and the JS
 * never touches layout.
 *
 * The rAF loop is started by a scroll and stops itself once the warp has decayed
 * to zero — an always-on 60fps loop would keep a phone's CPU awake for the entire
 * time the page sits idle in a background tab.
 */
export function ScrollFx() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const root = document.documentElement;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let warp = 0;
    let raf = 0;

    function frame(now: number) {
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const delta = y - lastY;
      // px per ms, normalised so a hard fling lands near 1.
      const velocity = Math.min(1, (Math.abs(delta) / dt) * 0.28);

      // Rise fast, fall slow — snapping straight back to zero reads as a flicker.
      warp = velocity > warp ? velocity : warp + (velocity - warp) * 0.12;

      // Read direction from `delta`, before lastY is overwritten below.
      if (delta !== 0) root.style.setProperty("--scroll-dir", delta > 0 ? "1" : "-1");

      lastY = y;
      lastT = now;

      if (warp < 0.002) {
        // Settled. Park the loop until the next scroll wakes it.
        warp = 0;
        root.style.setProperty("--scroll-warp", "0");
        raf = 0;
        return;
      }

      root.style.setProperty("--scroll-warp", warp.toFixed(3));
      raf = requestAnimationFrame(frame);
    }

    function onScroll() {
      if (raf) return;
      // Refresh the clock but NOT lastY: it still holds the position the loop
      // parked at, so the first frame measures the real distance travelled.
      // Resetting it here makes delta zero, warp zero, and the loop parks again
      // immediately — the effect never fires at all.
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--scroll-warp");
      root.style.removeProperty("--scroll-dir");
    };
  }, [reducedMotion]);

  return null;
}
