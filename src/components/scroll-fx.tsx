"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Drives two CSS custom properties from scroll velocity:
 *   --scroll-warp  0..1  how hard the CRT is being pushed
 *   --scroll-dir  -1..1  direction, so the chromatic split leans the right way
 *
 * A real CRT smears when the image moves fast; flinging the page now produces a
 * brief RGB split and a scanline squeeze that settles the moment you stop. All of
 * it is expressed as one variable so the actual effect is pure CSS and the JS
 * never touches layout.
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
      // px per ms, normalised so a hard fling lands near 1.
      const velocity = Math.min(1, (Math.abs(y - lastY) / dt) * 0.28);

      // Rise fast, fall slow — a snap back to zero reads as a flicker.
      warp = velocity > warp ? velocity : warp + (velocity - warp) * 0.12;
      if (warp < 0.002) warp = 0;

      root.style.setProperty("--scroll-warp", warp.toFixed(3));
      root.style.setProperty("--scroll-dir", y >= lastY ? "1" : "-1");

      lastY = y;
      lastT = now;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      root.style.removeProperty("--scroll-warp");
      root.style.removeProperty("--scroll-dir");
    };
  }, [reducedMotion]);

  return null;
}
