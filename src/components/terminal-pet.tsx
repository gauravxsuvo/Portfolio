"use client";

import { useEffect, useRef, useState } from "react";
import { unlockAchievement } from "@/lib/achievements";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * A one-line ASCII cat that lives in the footer.
 *
 * Pure kaomoji, no images and no emoji — the same register as the shell's
 * `flip` and `sl`. It blinks occasionally (skipped under reduced motion),
 * answers clicks with a short line, and after enough attention unlocks an
 * achievement. All state is in memory: the cat remembers nothing about you,
 * which also means it needs no entry in the storage inventory.
 */

const FACE_IDLE = "[=^.^=]";
const FACE_BLINK = "[=-.-=]";
const FACE_HAPPY = "[=^o^=]";

const REPLIES = [
  "meow",
  "prrrr",
  "mrow?",
  "*ignores you*",
  "meow meow (cat for `hire him`)",
  "purring at 60fps",
  "*knocks your cursor off the table*",
];

const PETS_FOR_ACHIEVEMENT = 5;
const REPLY_MS = 2200;
const BLINK_MS = 180;

export function TerminalPet() {
  const reducedMotion = useReducedMotion();
  const [face, setFace] = useState(FACE_IDLE);
  const [reply, setReply] = useState<string | null>(null);
  const petCount = useRef(0);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Idle blink on a randomized interval, so it reads as alive rather than
  // metronomic. Chained timeouts instead of setInterval: each cycle picks a
  // fresh delay.
  useEffect(() => {
    if (reducedMotion) return;
    let blinkTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function scheduleBlink() {
      blinkTimer = setTimeout(() => {
        if (cancelled) return;
        // Don't blink over a reaction face — the reply timeout resets to idle.
        setFace((f) => (f === FACE_IDLE ? FACE_BLINK : f));
        openTimer = setTimeout(() => {
          if (cancelled) return;
          setFace((f) => (f === FACE_BLINK ? FACE_IDLE : f));
          scheduleBlink();
        }, BLINK_MS);
      }, 3500 + Math.random() * 4500);
    }
    scheduleBlink();
    return () => {
      cancelled = true;
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, [reducedMotion]);

  function handlePet() {
    petCount.current += 1;
    if (petCount.current >= PETS_FOR_ACHIEVEMENT) unlockAchievement("pet");
    setFace(FACE_HAPPY);
    setReply(REPLIES[Math.floor(Math.random() * REPLIES.length)]);
    clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      setFace(FACE_IDLE);
      setReply(null);
    }, REPLY_MS);
  }

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <button
        type="button"
        onClick={handlePet}
        aria-label="Pet the terminal cat"
        title="pet the cat"
        className="tap-target-sm select-none text-secondary transition-colors hover:text-primary"
      >
        {face}
      </button>
      {/* role=status so the meow is announced, not just painted. */}
      <span role="status" className="text-fg/50">
        {reply}
      </span>
    </span>
  );
}
