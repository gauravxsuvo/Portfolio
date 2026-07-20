"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ANSI_ACCENT_COUNT, ansiAccent } from "@/lib/ansi";
import { unlockAchievement } from "@/lib/achievements";
import { bio } from "@/lib/data";

/**
 * The bouncing-logo screensaver, because this is a terminal from 1994 and that
 * is what they did when you walked away.
 *
 * A panel drifts across a blanked screen and takes the next accent in the retro
 * cycle every time it hits an edge — the one piece of the site where the whole
 * palette gets to show off in sequence rather than a slot at a time. Landing
 * exactly in a corner is the jackpot everyone has waited for at least once, and
 * it unlocks an achievement.
 *
 * ## What it costs when it isn't running (which is nearly always)
 *
 * Nothing measurable. While idle this is four passive listeners and one
 * timeout; there is no loop, no canvas and no element in the DOM until it
 * activates. The animation only exists while the visitor is demonstrably not
 * looking at the page, and it stops on the first input.
 *
 * ## Why it doesn't run everywhere
 *
 *   - **Touch and small screens**: a phone blanks its own screen, and it does a
 *     better job — it turns the backlight off. Burning a battery to draw a
 *     screensaver on top of a display that is about to sleep is the opposite of
 *     what the thing is for.
 *   - **`prefers-reduced-motion`**: an unattended element that starts moving on
 *     its own is exactly the case that setting exists for. There is no reduced
 *     variant, because a screensaver that doesn't move is a blank screen.
 *   - **`html[data-perf="low"]`**: the device already told us it can't hold a
 *     frame rate (see lib/perf-tier.ts).
 *   - **A hidden tab**: `visibilitychange` disarms it, so a background tab
 *     never starts one. Coming back re-arms the timer from zero.
 *
 * ## Why rAF and not CSS
 *
 * A CSS keyframe can bounce a box, but it can't bounce it off a viewport that
 * changed size, can't report a corner hit, and can't pick the next accent on
 * contact. It's one rAF loop moving one element by transform — no layout, no
 * paint beyond the panel itself — capped at 30fps because a screensaver has
 * nothing to gain from 60.
 */

/** Quiet time before the screen blanks. */
const IDLE_MS = 75_000;
/** px/second. Slow enough to read as drifting rather than as a bug. */
const SPEED = 46;
const FRAME_MS = 1000 / 30;
/** How close to a corner counts as a corner hit, in px. */
const CORNER_SLOP = 12;

const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

export function IdleScreensaver() {
  const reducedMotion = useReducedMotion();
  // Same gate as the ambient canvas: a real pointer on a screen big enough that
  // blanking it is a feature rather than a nuisance.
  const eligible = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const [active, setActive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------ idle timer */
  useEffect(() => {
    if (!eligible || reducedMotion) return;

    let timer: ReturnType<typeof setTimeout>;

    function arm() {
      clearTimeout(timer);
      // Never arm on a device that has already been demoted — checked at arm
      // time rather than at mount, since PerfGuard's verdict lands a few
      // seconds in and can flip either way during the session.
      if (document.documentElement.dataset.perf === "low") return;
      if (document.hidden) return;
      timer = setTimeout(() => setActive(true), IDLE_MS);
    }

    function wake() {
      setActive(false);
      arm();
    }

    function onVisibility() {
      if (document.hidden) clearTimeout(timer);
      else wake();
    }

    arm();
    for (const type of EVENTS) {
      window.addEventListener(type, wake, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      for (const type of EVENTS) window.removeEventListener(type, wake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [eligible, reducedMotion]);

  /* -------------------------------------------------------------- the drift */
  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    const { width: w, height: h } = panel.getBoundingClientRect();
    let x = Math.random() * Math.max(1, window.innerWidth - w);
    let y = Math.random() * Math.max(1, window.innerHeight - h);
    // A 45° start is what makes corner hits possible at all; anything else
    // eventually settles into a repeating diagonal that misses them forever.
    let dx = Math.random() < 0.5 ? -1 : 1;
    let dy = Math.random() < 0.5 ? -1 : 1;
    let raf = 0;
    let last = performance.now();
    // Both the position and the accent are written straight to the node. Keeping
    // the accent in React state would re-render this component on every bounce
    // *while* the loop is also writing style.transform on the same node — two
    // owners of one style attribute, which is the kind of thing that works until
    // it doesn't. One writer, no renders after mount.
    let accent = Math.floor(Math.random() * ANSI_ACCENT_COUNT);
    panel.style.setProperty("--retro-accent", ansiAccent(accent));

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < FRAME_MS) return;
      last = now;

      const maxX = Math.max(0, window.innerWidth - w);
      const maxY = Math.max(0, window.innerHeight - h);
      const step = (SPEED * dt) / 1000;

      x += dx * step;
      y += dy * step;

      let hitX = false;
      let hitY = false;
      if (x <= 0) { x = 0; dx = 1; hitX = true; }
      else if (x >= maxX) { x = maxX; dx = -1; hitX = true; }
      if (y <= 0) { y = 0; dy = 1; hitY = true; }
      else if (y >= maxY) { y = maxY; dy = -1; hitY = true; }

      if (hitX || hitY) {
        accent = (accent + 1) % ANSI_ACCENT_COUNT;
        panel!.style.setProperty("--retro-accent", ansiAccent(accent));
        // Both axes on the same frame, or near enough — the thing everyone has
        // waited for. Slop because an exact simultaneous hit is vanishingly
        // unlikely at a non-integer step size.
        const corner =
          (hitX && (y <= CORNER_SLOP || y >= maxY - CORNER_SLOP)) ||
          (hitY && (x <= CORNER_SLOP || x >= maxX - CORNER_SLOP));
        if (corner) unlockAchievement("cornerhit");
      }

      panel!.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const dismiss = useCallback(() => setActive(false), []);

  if (!eligible || reducedMotion || !active) return null;

  return (
    <div
      // Not a dialog and not focusable: it must never trap a keyboard user, and
      // any key press dismisses it through the wake listener above before this
      // element could have received the event anyway.
      aria-hidden="true"
      onPointerDown={dismiss}
      className="idle-screensaver fixed inset-0 z-[58] cursor-none bg-bg"
    >
      <div
        ref={panelRef}
        className="retro-accent absolute left-0 top-0 border border-current px-4 py-3 text-primary will-change-transform"
      >
        <p className="text-sm tracking-[0.2em]">
          {bio.handle}@mysuvo
          <span className="blink-hard ml-1">_</span>
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] opacity-60">
          no signal · move to resume
        </p>
      </div>
    </div>
  );
}
