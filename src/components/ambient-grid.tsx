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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (paused) return;
      const dt = now - last;
      if (dt < 42) return; // ~24fps
      last = now;

      ctx!.clearRect(0, 0, width, height);
      ctx!.font = `12px ui-monospace, monospace`;

      for (const d of drifters) {
        d.y += (d.speed * dt) / 1000;
        if (d.y > height + CELL) {
          d.y = -CELL;
          d.x = Math.random() * width;
          d.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        ctx!.globalAlpha = d.alpha;
        ctx!.fillStyle = color;
        ctx!.fillText(d.glyph, d.x, d.y);
      }
      ctx!.globalAlpha = 1;
    }
    raf = requestAnimationFrame(draw);

    function onVisibility() {
      paused = document.hidden;
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(THEME_CHANGE_EVENT, refreshColor);
    // Mode flips repaint --color-primary without a color-change broadcast.
    window.addEventListener(THEME_MODE_CHANGE_EVENT, refreshColor);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
