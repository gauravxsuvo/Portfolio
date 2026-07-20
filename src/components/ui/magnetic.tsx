"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Pulls its child toward the pointer while hovered. Desktop-only garnish: on a
 * coarse pointer there is no hover state to speak of, and with reduced motion it
 * degrades to a plain wrapper.
 */
export function Magnetic({
  children,
  strength = 0.32,
  className = "",
}: {
  children: ReactNode;
  /** Fraction of the pointer's offset from centre that the element travels. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    /**
     * The rest position, measured once on entry.
     *
     * getBoundingClientRect() used to run inside pointermove, which forces a
     * synchronous layout on every single move event — the most expensive thing
     * you can do in a pointer handler, and it was happening on every button on
     * the page that a cursor passed over.
     *
     * Caching also fixes a second, quieter problem: this element is being
     * translated by this very handler, so measuring it mid-move measured the
     * *displaced* box. The centre chased the pointer, dx shrank as it went, and
     * the pull converged to something weaker than `strength` asks for. Measured
     * on entry, the transform is still identity, so the rect is the true
     * rest position and the pull is the strength that was configured.
     */
    let rect: DOMRect | null = null;

    function invalidate() {
      rect = null;
    }

    function onMove(e: PointerEvent) {
      if (!el) return;
      if (!rect) rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    }
    function onEnter() {
      // Re-measured per entry rather than once at mount: layout moves with
      // reflows, font swaps and viewport changes.
      if (el) rect = el.getBoundingClientRect();
      // A scroll while hovering moves the box under the pointer, so the cached
      // rect is only valid until then. Listened to only while hovered.
      window.addEventListener("scroll", invalidate, { passive: true });
    }
    function reset() {
      window.removeEventListener("scroll", invalidate);
      rect = null;
      if (el) el.style.transform = "translate3d(0, 0, 0)";
    }

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      window.removeEventListener("scroll", invalidate);
      reset();
    };
  }, [reducedMotion, strength]);

  return (
    <span ref={ref} className={`magnetic inline-flex ${className}`}>
      {children}
    </span>
  );
}
