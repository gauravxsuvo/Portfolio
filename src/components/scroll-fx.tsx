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
 *
 * ## These are written to the two consuming elements, never to :root
 *
 * This was, by a wide margin, the most expensive thing on the site — and the
 * least visible, because "the JS never touches layout" was true and beside the
 * point. Custom properties are *inherited*. Setting one on <html> invalidates
 * the computed style of every element that could inherit it, which is all ~700
 * of them, and this ran once per frame for the whole duration of every scroll.
 * The result was a full-document style recalculation per frame.
 *
 * Measured while scrolling the homepage, with the CPU throttled 4x to stand in
 * for a mid-range phone — removing one layer at a time:
 *
 *     baseline ......................... 50.0ms/frame  (20fps)
 *     --scroll-warp not written to root  16.7ms/frame  (60fps)
 *     everything else tried .............. 50.0ms/frame  (no change)
 *
 * Nothing else registered at all: not the CRT overlay, the aperture grille, the
 * vignette, the mist, the ambient canvas, the text-shadows, the sticky header,
 * backdrop-filters, or disabling every animation on the page.
 *
 * Only `.crt-overlay::before` and `.warp-text` read these variables, so they are
 * set on those two nodes directly. A pseudo-element inherits from its
 * originating element, so the overlay's ::before still sees it. Invalidation
 * goes from the entire document to two subtrees of two or three nodes each.
 *
 * `:root` keeps a static 0 default in globals.css so anything that reads the
 * variable before a scroll happens resolves sanely — that value never changes,
 * so it costs nothing.
 */
export function ScrollFx() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    /**
     * The two elements that actually read the variables.
     *
     * Re-resolved lazily rather than captured once: the CRT overlay can be
     * toggled off and back on from the display panel, and `.warp-text` is the
     * hero wordmark, which only exists on the homepage and is replaced on every
     * client-side navigation. `isConnected` catches a node that has been
     * swapped out from under us.
     */
    let crtEl: HTMLElement | null = null;
    let warpEl: HTMLElement | null = null;

    function resolveTargets() {
      if (!crtEl?.isConnected) crtEl = document.querySelector<HTMLElement>(".crt-overlay");
      if (!warpEl?.isConnected) warpEl = document.querySelector<HTMLElement>(".warp-text");
    }

    function setVar(name: string, value: string) {
      crtEl?.style.setProperty(name, value);
      warpEl?.style.setProperty(name, value);
    }

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
      if (delta !== 0) setVar("--scroll-dir", delta > 0 ? "1" : "-1");

      lastY = y;
      lastT = now;

      if (warp < 0.002) {
        // Settled. Park the loop until the next scroll wakes it.
        warp = 0;
        setVar("--scroll-warp", "0");
        raf = 0;
        return;
      }

      setVar("--scroll-warp", warp.toFixed(3));
      raf = requestAnimationFrame(frame);
    }

    function onScroll() {
      if (raf) return;
      // Once per scroll burst rather than per frame: the loop parks between
      // gestures, so this is roughly one querySelector per flick.
      resolveTargets();
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
      for (const el of [crtEl, warpEl]) {
        el?.style.removeProperty("--scroll-warp");
        el?.style.removeProperty("--scroll-dir");
      }
    };
  }, [reducedMotion]);

  return null;
}
