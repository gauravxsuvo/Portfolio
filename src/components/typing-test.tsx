"use client";

import { useRef, useState } from "react";
import { unlockAchievement } from "@/lib/achievements";
import { readTypetestBest, writeTypetestBest } from "@/lib/typetest-score";

/**
 * A typing-speed test, playable inside the shell's scrollback.
 *
 * Same interaction contract as the snake board: it's a real form control that
 * only reacts while focused, so it never fights the page's other key listeners
 * (konami, `g` jumps, `/`). Timing starts on the first keystroke, not on mount
 * — running the command and reading the sentence first costs nothing.
 *
 * WPM is the standard gross measure: (characters / 5) / minutes. Accuracy
 * counts every wrong keystroke, including ones later backspaced away — fixing
 * a typo costs time, but the typo still happened.
 */

const SENTENCES = [
  "the quick brown fox jumps over the lazy dog",
  "there is no place like 127.0.0.1",
  "it works on my machine is a lifestyle not an excuse",
  "cache invalidation and naming things remain undefeated",
  "git commit -m final final v2 actually final",
  "real programmers test in production on a friday",
  "the best error message is the one that never shows up",
  "hardware eventually fails and software eventually works",
  "a good terminal needs no mouse and fears no dark mode",
  "first solve the problem then write the code",
];

/** Completing a run at or above this speed earns the achievement. */
const ACHIEVEMENT_WPM = 60;

function pickSentence(previous?: string): string {
  const pool = SENTENCES.filter((s) => s !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

type Phase = "idle" | "running" | "done";

export function TypingTest() {
  const [target, setTarget] = useState(() => pickSentence());
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);
  // Gross WPM so far, recomputed inside the change handler (refs and clocks are
  // off-limits during render). A stale number between keystrokes is fine.
  const [liveWpm, setLiveWpm] = useState<number | null>(null);
  // Seeded straight from localStorage: like the snake board, this component is
  // only ever mounted from a shell command, so there is no server render to
  // disagree with.
  const [best, setBest] = useState(readTypetestBest);
  const startedAt = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function restart() {
    setTarget((prev) => pickSentence(prev));
    setTyped("");
    setErrors(0);
    setResult(null);
    setLiveWpm(null);
    setPhase("idle");
    startedAt.current = null;
    inputRef.current?.focus();
  }

  function finish(finalErrors: number) {
    const elapsedMs = performance.now() - (startedAt.current ?? performance.now());
    // Sub-second runs are either superhuman or synthetic; either way don't
    // divide by ~zero.
    const minutes = Math.max(elapsedMs, 1000) / 60000;
    const wpm = Math.round(target.length / 5 / minutes);
    const accuracy = Math.max(
      0,
      Math.round(((target.length - finalErrors) / target.length) * 100)
    );
    setResult({ wpm, accuracy });
    setPhase("done");
    if (wpm > best) {
      setBest(wpm);
      writeTypetestBest(wpm);
    }
    if (wpm >= ACHIEVEMENT_WPM) unlockAchievement("wpm");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === "done") return;
    const next = e.target.value;

    if (phase === "idle" && next.length > 0) {
      startedAt.current = performance.now();
      setPhase("running");
    }

    // Count a fresh error only when a newly typed character misses. Growth by
    // more than one character can't come from typing (paste is blocked below).
    let nextErrors = errors;
    if (next.length === typed.length + 1) {
      const i = next.length - 1;
      if (next[i] !== target[i]) nextErrors = errors + 1;
    }

    // Don't let the field run past the target — trailing garbage would make
    // "finished" ambiguous.
    const clamped = next.slice(0, target.length);
    setErrors(nextErrors);
    setTyped(clamped);

    if (startedAt.current !== null && clamped.length >= 5) {
      const minutes = Math.max(performance.now() - startedAt.current, 1000) / 60000;
      setLiveWpm(Math.round(clamped.length / 5 / minutes));
    }

    if (clamped === target) finish(nextErrors);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const key = e.key.toLowerCase();
    if (key === "escape" || (key === "q" && phase === "done")) {
      e.preventDefault();
      inputRef.current?.blur();
      return;
    }
    if (key === "enter" && phase === "done") {
      e.preventDefault();
      restart();
    }
  }

  return (
    <div className="text-xs sm:text-sm">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-fg/50">
        <span>
          wpm{" "}
          <span className="tabular-nums text-primary">
            {result ? result.wpm : (liveWpm ?? "--")}
          </span>
        </span>
        <span>
          best <span className="tabular-nums text-secondary">{best || "--"}</span>
        </span>
        {result && (
          <span>
            accuracy <span className="tabular-nums text-primary">{result.accuracy}%</span>
          </span>
        )}
      </div>

      <p className="max-w-prose border border-border p-2 leading-relaxed" aria-hidden="true">
        {[...target].map((ch, i) => {
          let cls = "text-fg/40";
          if (i < typed.length) {
            cls = typed[i] === ch ? "text-primary" : "bg-error/30 text-error";
          } else if (i === typed.length && phase !== "done") {
            cls = "border-b border-primary text-fg";
          }
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden="true" className="text-primary">
          &gt;
        </span>
        <label htmlFor="typetest-input" className="sr-only">
          Typing test. Type the sentence shown above: {target}
        </label>
        <input
          ref={inputRef}
          id="typetest-input"
          value={typed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={(e) => e.preventDefault()}
          // Not disabled when done — a disabled input can't take focus, and the
          // enter/q keys the hint advertises arrive through this element.
          // handleChange already drops edits in the done phase.
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`min-w-0 flex-1 border border-border bg-bg px-2 py-1 text-fg caret-primary outline-none focus-visible:border-primary ${
            phase === "done" ? "opacity-60" : ""
          }`}
        />
      </div>

      <p className="mt-1 text-fg/40" role="status">
        {phase === "done" && result ? (
          <>
            <span className={result.wpm >= ACHIEVEMENT_WPM ? "text-primary" : "text-secondary"}>
              {result.wpm} wpm at {result.accuracy}% accuracy.
            </span>{" "}
            <span className="text-secondary">enter</span> for a new sentence ·{" "}
            <span className="text-secondary">q</span> back to the shell
          </>
        ) : phase === "running" ? (
          "go go go..."
        ) : (
          "the clock starts on your first keystroke. no pasting — that's cheating."
        )}
      </p>
    </div>
  );
}
