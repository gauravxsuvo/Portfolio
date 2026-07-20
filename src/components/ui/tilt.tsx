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

    /**
     * Measured on entry, not per move. getBoundingClientRect() inside a
     * pointermove handler forces a synchronous layout on every event — with a
     * card grid that meant a forced layout for each move across any card, which
     * is exactly the interaction where the cursor is expected to feel weightless.
     */
    let rect: DOMRect | null = null;

    function invalidate() {
      rect = null;
    }

    function onMove(e: PointerEvent) {
      if (!rect) rect = el!.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = px * max * 2;
      targetX = -py * max * 2;
      start();
    }
    function onEnter() {
      rect = el!.getBoundingClientRect();
      // Scrolling while hovering moves the card under the pointer; only then
      // does the cached rect go stale.
      window.addEventListener("scroll", invalidate, { passive: true });
    }
    function onLeave() {
      window.removeEventListener("scroll", invalidate);
      rect = null;
      targetX = 0;
      targetY = 0;
      start();
    }

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      el.style.transform = "";
    };
  }, [enabled, max]);

  // will-change only where the tilt actually runs. Applied unconditionally it
  // promoted every card to its own composited layer on devices that never tilt
  // anything — a phone loading /projects paid for eight permanent layers to
  // support a pointer it does not have.
  return (
    <div ref={ref} className={`h-full ${enabled ? "will-change-transform" : ""} ${className}`}>
      {children}
    </div>
  );
}
