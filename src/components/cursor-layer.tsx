"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

const TRAIL_GLYPHS = "01<>/_[]{}#$*".split("");
/** Minimum pointer travel between trail glyphs, in px. Keeps the trail sparse. */
const TRAIL_SPACING = 34;
const MAX_TRAIL = 14;
/** How hard the reticle chases the pointer. 1 = instant, lower = more drag. */
const RING_EASE = 0.18;
/** Squared px gap at which the ring counts as arrived and the loop can park. */
const SETTLE_EPSILON = 0.01;

const INTERACTIVE = 'a,button,[role="button"],summary,label,select,[data-cursor-link]';
const TEXTUAL = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),textarea';

type Elements = {
  dot: HTMLDivElement;
  ring: HTMLDivElement;
  trail: HTMLDivElement;
};

/**
 * All the imperative work, kept out of the component so the elements arrive as
 * non-null parameters. Returns its own teardown.
 */
function attachCursor({ dot, ring, trail }: Elements): () => void {
  const root = document.documentElement;
  root.classList.add("custom-cursor");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;
  let lastTrailX = targetX;
  let lastTrailY = targetY;
  let visible = false;

  /**
   * Fixed pool of trail glyphs, reused round-robin.
   *
   * These used to be created and destroyed as the pointer moved: a new <span>,
   * an appendChild, an animationend listener and a remove() every 34px of
   * travel. Inserting and removing elements invalidates style for the subtree
   * and forces the browser back through recalc, so a fast mouse drag measured
   * ~2.4ms of style recalc *per pointer move* — on the one interaction where
   * latency is most visible, since the cursor is chasing the hand.
   *
   * The pool is allocated once and the fade is driven by the Web Animations API
   * rather than a CSS class. Restarting a CSS animation on a recycled node means
   * removing the animation, forcing a synchronous reflow to make the removal
   * take effect, then re-adding it — which trades the DOM churn for a forced
   * layout on every spawn and wins nothing. `element.animate()` restarts
   * cleanly with no reflow, and animating only transform and opacity keeps the
   * whole thing on the compositor.
   */
  const pool: HTMLSpanElement[] = [];
  let poolIndex = 0;
  for (let i = 0; i < MAX_TRAIL; i++) {
    const glyph = document.createElement("span");
    glyph.className = "cursor-trail-glyph";
    glyph.style.opacity = "0";
    trail.appendChild(glyph);
    pool.push(glyph);
  }

  function spawnGlyph(x: number, y: number) {
    const glyph = pool[poolIndex];
    poolIndex = (poolIndex + 1) % pool.length;
    glyph.textContent = TRAIL_GLYPHS[Math.floor(Math.random() * TRAIL_GLYPHS.length)];
    glyph.animate(
      [
        { opacity: 0.7, transform: `translate3d(${x}px, ${y}px, 0) scale(1)` },
        { opacity: 0, transform: `translate3d(${x}px, ${y + 14}px, 0) scale(0.7)` },
      ],
      { duration: 600, easing: "ease-out", fill: "forwards" }
    );
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    targetX = e.clientX;
    targetY = e.clientY;
    wake();

    if (!visible) {
      visible = true;
      // Jump to the pointer on first sight rather than easing in from the
      // middle of the screen.
      ringX = targetX;
      ringY = targetY;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    }

    const dx = targetX - lastTrailX;
    const dy = targetY - lastTrailY;
    if (dx * dx + dy * dy > TRAIL_SPACING * TRAIL_SPACING) {
      lastTrailX = targetX;
      lastTrailY = targetY;
      spawnGlyph(targetX, targetY);
    }

    const el = e.target as Element | null;
    const mode = el?.closest?.(INTERACTIVE)
      ? "link"
      : el?.closest?.(TEXTUAL)
        ? "text"
        : "";
    if (root.dataset.cursor !== mode) root.dataset.cursor = mode;
  }

  function hide() {
    visible = false;
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  }
  function onDown() {
    root.dataset.cursorDown = "true";
  }
  function onUp() {
    root.dataset.cursorDown = "false";
  }

  /**
   * The ring eases toward the pointer, so it still needs frames after the last
   * pointermove — but only until it arrives. Once it's within a subpixel of the
   * target there is nothing left to interpolate, so the loop parks itself and a
   * later move wakes it. Previously this ran at 60fps for as long as the tab was
   * open, including while the pointer sat still or had left the window entirely.
   */
  let raf = 0;

  function tick() {
    ringX += (targetX - ringX) * RING_EASE;
    ringY += (targetY - ringY) * RING_EASE;
    dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

    const dx = targetX - ringX;
    const dy = targetY - ringY;
    if (dx * dx + dy * dy < SETTLE_EPSILON) {
      // Snap the last fraction of a pixel so the parked position is exact.
      ringX = targetX;
      ringY = targetY;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", hide);
  window.addEventListener("blur", hide);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", hide);
    window.removeEventListener("blur", hide);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    root.classList.remove("custom-cursor");
    delete root.dataset.cursor;
    delete root.dataset.cursorDown;
    trail.replaceChildren();
  };
}

export function CursorLayer() {
  const reducedMotion = useReducedMotion();
  // Only run where a precise pointer actually exists. On a touch device the
  // reticle would be stranded at the last tap position, and `cursor: none` would
  // be applied for nothing.
  const finePointer = useMediaQuery("(pointer: fine)");
  const enabled = finePointer && !reducedMotion;

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const trail = trailRef.current;
    if (!dot || !ring || !trail) return;
    return attachCursor({ dot, ring, trail });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true">
      <div ref={trailRef} />
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }}>
        <i />
      </div>
    </div>
  );
}
