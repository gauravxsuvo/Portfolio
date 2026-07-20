"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Text that decodes out of noise the first time it scrolls into view.
 *
 * The hero already does this on load (see hero-logo.tsx) and it's the single
 * most terminal-looking thing on the site — a signal resolving rather than an
 * element sliding in. This is that effect for section headings, so scrolling
 * the page feels like a machine locking onto each block in turn instead of a
 * deck of cards fading up.
 *
 * Deliberately cheap, because unlike the hero there are six of these on the
 * homepage and it runs on every route:
 *
 *   - It runs **once**, then the observer disconnects and the component is
 *     inert for the rest of the session. Nothing here is an ambient loop.
 *   - Characters lock left-to-right on a fixed schedule, so the whole thing is
 *     over in ~420ms regardless of length.
 *   - One interval per heading while animating, and only while animating. At
 *     ~24fps that is ten renders of a single text node.
 *   - Spaces never scramble, so the word shape holds and the line never
 *     reflows — the animation costs no layout, only a text repaint.
 *
 * Accessibility follows the Typewriter pattern that the rest of the site uses:
 * the real string sits in an `sr-only` span and is what the heading's
 * accessible name resolves to; only a decorative `aria-hidden` copy animates.
 * A screen reader, a crawler and `prefers-reduced-motion` all get the finished
 * text and never see a frame of noise.
 */

// ASCII only. Section headings render in VT323, which has no CJK glyphs — a
// katakana scramble char would fall back to JetBrains Mono mid-animation and
// make the line jitter as glyph widths changed under it. Same trap as the hero.
const NOISE = "!<>-_\\/[]{}=+*^?#$%&@01";

/** Frames each character stays noisy before the one after it starts locking. */
const STEP_FRAMES = 1;
/** Frames before the first character locks. */
const LEAD_FRAMES = 3;
const FRAME_MS = 42;

/**
 * One frame of the decode, as a plain string.
 *
 * Called from the interval rather than during render: it uses Math.random, so
 * running it in a render body would make the component non-idempotent — React
 * is free to re-render at any time, and each of those would re-roll the noise
 * for a frame that had not actually advanced.
 */
function noisyFrame(text: string, frame: number): string {
  return text
    .split("")
    .map((ch, i) =>
      ch === " " || frame >= i * STEP_FRAMES + LEAD_FRAMES
        ? ch
        : NOISE[Math.floor(Math.random() * NOISE.length)]
    )
    .join("");
}

export function DecodeText({ text, className = "" }: { text: string; className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // The string actually painted, or null for "settled — show the real text".
  // Holding the rendered output rather than a frame counter is what keeps this
  // component pure: every frame is computed once, in the interval.
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const totalFrames = text.length * STEP_FRAMES + LEAD_FRAMES;
    let interval: ReturnType<typeof setInterval> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // One-shot: disconnect before starting, so a heading that leaves and
        // re-enters the viewport can never queue a second interval.
        observer.disconnect();
        let frame = 0;
        setShown(noisyFrame(text, 0));
        interval = setInterval(() => {
          frame += 1;
          if (frame >= totalFrames) {
            clearInterval(interval);
            // null rather than the finished string: from here the real text
            // renders directly and this component is inert for good.
            setShown(null);
            return;
          }
          setShown(noisyFrame(text, frame));
        }, FRAME_MS);
      },
      // Matches <Reveal/>'s trigger point so the decode and the block's fade-up
      // start together rather than a beat apart.
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [reducedMotion, text]);

  return (
    // data-anim: on paper the print stylesheet shows the sr-only string and
    // drops the animated copy. Without it a heading caught mid-decode prints
    // as literal noise — "@]}/ 0$^[/!" where "CORE SKILLS" should be.
    <span ref={ref} className={className} data-anim="">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown ?? text}</span>
    </span>
  );
}
