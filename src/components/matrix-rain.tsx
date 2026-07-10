"use client";

import { useEffect, useRef, useState } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";

const GLYPHS = "01アイウエオカキクケコgauravxsuvo</>{}[]#$".split("");
const FONT_SIZE = 16;

export function MatrixRain({ onDismiss }: { onDismiss: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  useEffect(() => {
    const timeout = setTimeout(onDismiss, 5000);
    const onKey = () => onDismiss();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let columns = Math.floor(width / FONT_SIZE);
    let drops = new Array(columns).fill(1);

    function onResize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      columns = Math.floor(width / FONT_SIZE);
      drops = new Array(columns).fill(1);
    }
    window.addEventListener("resize", onResize);

    let raf = 0;
    function draw() {
      ctx!.fillStyle = "rgba(10, 10, 10, 0.12)";
      ctx!.fillRect(0, 0, width, height);
      ctx!.fillStyle = "#33ff00";
      ctx!.font = `${FONT_SIZE}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx!.fillText(glyph, i * FONT_SIZE, drops[i] * FONT_SIZE);
        if (drops[i] * FONT_SIZE > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[46] flex items-center justify-center bg-bg/80"
      onClick={onDismiss}
    >
      {reducedMotion ? (
        <TerminalWindow title="secret found" meta="konami" accent="secondary">
          <p className="text-sm text-fg/80">
            ↑↑↓↓←→←→BA — you found it. click anywhere to continue.
          </p>
        </TerminalWindow>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      )}
    </div>
  );
}
