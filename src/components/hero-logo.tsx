"use client";

import { useEffect, useRef, useState } from "react";
import { unlockAchievement } from "@/lib/achievements";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { bio } from "@/lib/data";

const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01アイウエオカキクケコ";
const CHAR_STEP_FRAMES = 3;
const SETTLE_FRAMES = 6;
const TICK_MS = 35;

// Deterministic "looks scrambled" text for the SSR-matching first render — must
// not call Math.random() there, or the server and client hydration passes
// produce different characters and React flags a hydration mismatch. True
// randomness only kicks in once `frame` advances past 0, which only happens
// client-side (post-hydration) via the rAF loop below.
function placeholderFrame(text: string): string {
  return text
    .split("")
    .map((ch, i) => (ch === " " ? " " : SCRAMBLE_CHARS[(i * 7 + 3) % SCRAMBLE_CHARS.length]))
    .join("");
}

function scrambledFrame(text: string, frame: number): string {
  if (frame === 0) return placeholderFrame(text);
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      const lockFrame = i * CHAR_STEP_FRAMES + SETTLE_FRAMES;
      if (frame >= lockFrame) return ch;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    })
    .join("");
}

export function HeroLogo() {
  const text = bio.name.toUpperCase();
  const reducedMotion = useReducedMotion();
  const totalFrames = text.length * CHAR_STEP_FRAMES + SETTLE_FRAMES;
  const [frame, setFrame] = useState(0);
  const [message, setMessage] = useState(false);
  const rafRef = useRef<number | null>(null);

  // requestAnimationFrame instead of setInterval: syncs to the display's real
  // refresh rate, costs nothing once the tab is backgrounded (browsers pause
  // rAF automatically), and only touches state when the *visible* frame
  // number actually changes rather than on a fixed timer tick.
  function startAnimation() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    let lastFrame = -1;
    function tick(now: number) {
      const f = Math.min(totalFrames, Math.floor((now - start) / TICK_MS));
      if (f !== lastFrame) {
        lastFrame = f;
        setFrame(f);
      }
      if (f < totalFrames) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (reducedMotion) return;
    startAnimation();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  function handleClick() {
    unlockAchievement("logo");
    setMessage(true);
    if (!reducedMotion) {
      setFrame(0);
      startAnimation();
    }
    setTimeout(() => setMessage(false), 2800);
  }

  const shown = reducedMotion ? text : scrambledFrame(text, frame);
  const done = reducedMotion || frame >= totalFrames;

  return (
    <div className="mb-6">
      <p aria-hidden="true" className="mb-2 text-xs tracking-[0.3em] text-secondary">
        [ SYSTEM ONLINE ]
      </p>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${bio.name} — click to replay identity scan`}
        className="block text-left"
      >
        <h1 className="glitch-hover warp-text break-words text-2xl font-bold tracking-wide text-primary sm:text-4xl lg:text-5xl xl:text-6xl">
          <span className="sr-only">{bio.name}</span>
          <span aria-hidden="true">
            {shown}
            <span className={done ? "animate-blink" : ""}>_</span>
          </span>
        </h1>
      </button>
      {message && (
        <p role="status" className="mt-1 text-xs text-secondary">
          identity re-scanned. try <span className="text-primary">achievements</span> in the
          shell below.
        </p>
      )}
    </div>
  );
}
