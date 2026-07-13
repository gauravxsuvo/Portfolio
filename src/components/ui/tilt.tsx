"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Subtle 3D tilt toward the pointer. The rotation lives on this wrapper, not the
 * card, because the card's own :hover already animates a translate — putting both
 * on one element means the inline transform silently wins and the lift disappears.
 */
export function Tilt({
  children,
  max = 5,
  className = "",
}: {
  children: ReactNode;
  /** Peak rotation in degrees at the corners. */
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enabled = fine && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let running = false;

    function loop() {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      el!.style.transform = `perspective(900px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;

      if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
        running = false;
        if (targetX === 0 && targetY === 0) el!.style.transform = "";
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }

    function onMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = px * max * 2;
      targetX = -py * max * 2;
      start();
    }
    function onLeave() {
      targetX = 0;
      targetY = 0;
      start();
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [enabled, max]);

  return (
    <div ref={ref} className={`h-full will-change-transform ${className}`}>
      {children}
    </div>
  );
}
