"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function CursorTrail() {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (reducedMotion) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 10}px, 0)`;
        el.style.opacity = "1";
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[49] animate-blink text-primary text-glow opacity-0"
      style={{ willChange: "transform" }}
    >
      _
    </span>
  );
}
