"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { THEME_CHANGE_EVENT, THEME_MODE_CHANGE_EVENT } from "@/lib/theme";

const GLYPHS = "01<>/{}[]#$*+=".split("");
const CELL = 28;

type Drifter = { x: number; y: number; speed: number; glyph: string; alpha: number };

/**
 * Faint drifting glyph field behind the content. Fills the big empty margins on a
 * wide display without competing with anything — it's clamped to very low alpha
 * and sits at z-0 under every real element.
 *
 * Capped at 24fps and skipped entirely on touch/small screens and under reduced
 * motion, so it can't cost a phone any battery.
 */
export function AmbientGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px)");
  const fine = useMediaQuery("(pointer: fine)");
  const enabled = wide && fine && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let drifters: Drifter[] = [];
    let raf = 0;
    let last = 0;
    let paused = document.hidden;

    function resize() {
      // DPR 1, deliberately. These glyphs are drawn at 3-10% alpha behind the
      // whole page; at that opacity the difference between a crisp and a soft
      // edge is not visible, but the difference in fill cost is 4x — a 1440x900
      // canvas at DPR 2 is 5.2 megapixels to clear and repaint on every frame,
      // and this was one of the two largest ambient CPU costs on the site
      // (~2 points of 6.8% idle). Retina sharpness on invisible text is the
      // easiest trade on the page.
      const dpr = 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area but is hard-capped — a 4K display shouldn't be
      // asked to animate thousands of glyphs.
      const count = Math.min(90, Math.floor((width * height) / 26000));
      drifters = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 4 + Math.random() * 14,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        alpha: 0.03 + Math.random() * 0.07,
      }));
    }
    resize();

    const primary = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() ||
      "#33ff00";
    let color = primary();
    const refreshColor = () => {
      color = primary();
    };

    /**
     * ~16fps, and scheduled with a timeout between frames rather than a
     * rAF-every-frame that early-returns.
     *
     * The old loop called requestAnimationFrame unconditionally and then bailed
     * on ~60% of those callbacks to hit 24fps. That still woke the main thread
     * 60 times a second forever, which is most of what stops a browser dropping
     * into an idle state — the rendering pipeline has to run whenever any rAF
     * is registered, whether or not the callback does anything.
     *
     * Now it sleeps between frames and only asks for a frame when it intends to
     * paint one. rAF is still used for the paint itself so drawing stays aligned
     * to vsync. Glyphs drift a few px/second, so 16fps is indistinguishable from
     * 24 here.
     */
    const FRAME_MS = 62;
    let timer: ReturnType<typeof setTimeout>;

    function schedule() {
      timer = setTimeout(() => {
        raf = requestAnimationFrame(draw);
      }, FRAME_MS);
    }

    function draw(now: number) {
      if (paused) {
        schedule();
        return;
      }
      const dt = Math.min(now - last, 250);
      last = now;

      ctx!.clearRect(0, 0, width, height);
      ctx!.font = `12px ui-monospace, monospace`;
      // Once per frame, not once per glyph: this was being assigned 90 times a
      // frame to the same value, and each assignment re-parses the colour
      // string. It has to stay inside draw() rather than move to setup, because
      // `color` is reassigned when the theme changes.
      ctx!.fillStyle = color;

      for (const d of drifters) {
        d.y += (d.speed * dt) / 1000;
        if (d.y > height + CELL) {
          d.y = -CELL;
          d.x = Math.random() * width;
          d.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        ctx!.globalAlpha = d.alpha;
        ctx!.fillText(d.glyph, d.x, d.y);
      }
      ctx!.globalAlpha = 1;
      schedule();
    }

    raf = requestAnimationFrame(draw);

    function onVisibility() {
      paused = document.hidden;
    }

    // Debounced: resize fires continuously while a window is dragged, and each
    // call reallocates the whole drifter array and re-rasters the canvas
    // backing store. Coalescing to one call after the drag settles also stops
    // the field visibly re-seeding on every intermediate width.
    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(THEME_CHANGE_EVENT, refreshColor);
    // Mode flips repaint --color-primary without a color-change broadcast.
    window.addEventListener(THEME_MODE_CHANGE_EVENT, refreshColor);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(THEME_CHANGE_EVENT, refreshColor);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, refreshColor);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
