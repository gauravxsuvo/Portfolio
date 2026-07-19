"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { unlockAchievement } from "@/lib/achievements";
import { readSnakeBest, writeSnakeBest } from "@/lib/snake-score";

/**
 * Snake, playable inside the shell's scrollback.
 *
 * ## Why the board takes focus instead of listening on window
 *
 * The obvious implementation — a global keydown listener for the arrow keys —
 * is wrong here for two reasons that only show up in this particular page.
 * First, arrow keys scroll, and a game that silently eats the scroll keys of a
 * long page is worse than no game. Second, this site already has three other
 * things listening for bare keys on window (the konami sequence, the `g` nav
 * jumps, the palette's `/`), so a fourth global listener means WASD and the
 * arrows do two things at once.
 *
 * So the board is a real focusable element and only responds while it holds
 * focus. That makes the contract legible to the player — click it, or tab to it,
 * and the arrows are the game's; press q or tab away and they're the page's
 * again — and it means the keys are consumed exactly when someone is looking at
 * a game, which is the only time consuming them is correct. `preventDefault`
 * plus `stopPropagation` on the keys the game actually uses is then honest
 * rather than greedy: everything else still bubbles out normally.
 *
 * ## Reduced motion
 *
 * Nothing moves until a deliberate keypress — the board renders idle and waits,
 * so simply running `snake` never animates anything at anyone. That's the part
 * `prefers-reduced-motion` is about. Beyond that the animation *is* the
 * requested content, so it isn't suppressed; the idle screen just says plainly
 * that the game animates, which is what lets someone decide before it starts
 * rather than after.
 */

const COLS = 22;
const ROWS = 12;

/** Milliseconds per step. Speeds up as the snake grows, floored so it stays playable. */
const BASE_TICK_MS = 140;
const MIN_TICK_MS = 70;
const SPEEDUP_PER_FOOD = 4;

/** Score that earns the achievement — ten pellets, enough to prove it wasn't luck. */
const ACHIEVEMENT_SCORE = 100;
const POINTS_PER_FOOD = 10;

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type Phase = "idle" | "playing" | "dead";

const VECTORS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_TO_DIR: Record<string, Dir> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  k: "up",
  j: "down",
  h: "left",
  l: "right",
};

function initialSnake(): Point[] {
  const y = Math.floor(ROWS / 2);
  const x = Math.floor(COLS / 3);
  // Head first, so snake[0] is always the head.
  return [
    { x: x + 2, y },
    { x: x + 1, y },
    { x, y },
  ];
}

/** A free cell, chosen from the ones actually free rather than by rejection
 *  sampling — which gets slow exactly when the board is nearly won. */
function placeFood(snake: Point[]): Point {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return snake[0];
  return free[Math.floor(Math.random() * free.length)];
}

type State = {
  snake: Point[];
  food: Point;
  dir: Dir;
  score: number;
  phase: Phase;
};

function freshState(phase: Phase = "idle"): State {
  const snake = initialSnake();
  return { snake, food: placeFood(snake), dir: "right", score: 0, phase };
}

export function SnakeGame() {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<State>(() => freshState());
  /**
   * Seeded straight from localStorage in the initializer, which is safe here in
   * a way it wouldn't be for most components: this one is only ever mounted as
   * the output of a shell command, so it has no server render to disagree with.
   * The alternative — read it in a mount effect — is a setState-in-effect and a
   * second render to show a number that was available all along.
   */
  const [best, setBest] = useState(readSnakeBest);
  const [focused, setFocused] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  /**
   * Direction changes queue instead of applying immediately. Two presses inside
   * one tick would otherwise let you turn 180° through an intermediate heading
   * — press up then left while moving right and the snake reverses into its own
   * neck, which reads as the game killing you for playing well.
   */
  const pending = useRef<Dir[]>([]);

  /**
   * Starting a run folds the finished one's score into `best` — a plain state
   * update in an event handler, which is where this belongs. Doing it from an
   * effect watching for death would be a cascading render, and it isn't needed:
   * while a run is live the header already displays max(best, score), so the
   * only moment `best` itself has to move is when the score is about to reset.
   */
  function start() {
    setBest((prev) => Math.max(prev, state.score));
    pending.current = [];
    setState(freshState("playing"));
  }

  const step = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "playing") return prev;

      // Apply at most one queued turn per tick, skipping any that would reverse.
      let dir = prev.dir;
      while (pending.current.length > 0) {
        const next = pending.current.shift()!;
        if (next !== OPPOSITE[dir] && next !== dir) {
          dir = next;
          break;
        }
      }

      const vector = VECTORS[dir];
      const head = { x: prev.snake[0].x + vector.x, y: prev.snake[0].y + vector.y };

      const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
      // The tail cell is vacated on this same tick, so moving into it is legal —
      // excluding it is the difference between "chased my tail" and "died for no
      // visible reason".
      const body = prev.snake.slice(0, -1);
      const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);

      if (hitWall || hitSelf) {
        return { ...prev, dir, phase: "dead" };
      }

      const ate = head.x === prev.food.x && head.y === prev.food.y;
      const snake = [head, ...(ate ? prev.snake : prev.snake.slice(0, -1))];
      const score = prev.score + (ate ? POINTS_PER_FOOD : 0);

      return {
        snake,
        food: ate ? placeFood(snake) : prev.food,
        dir,
        score,
        phase: "playing",
      };
    });
  }, []);

  /* ------------------------------------------------------------- game loop */
  useEffect(() => {
    if (state.phase !== "playing") return;
    const eaten = state.score / POINTS_PER_FOOD;
    const ms = Math.max(MIN_TICK_MS, BASE_TICK_MS - eaten * SPEEDUP_PER_FOOD);
    const id = setInterval(step, ms);
    return () => clearInterval(id);
    // Re-created when the score changes, which is what applies the speed-up.
  }, [state.phase, state.score, step]);

  /* ------------------------------------------- persist best + achievement */
  // Writing to localStorage and unlocking an achievement are both updates to
  // something outside React, which is what an effect is for. No setState here on
  // purpose — see start() for where `best` actually moves.
  useEffect(() => {
    if (state.phase !== "dead") return;
    if (state.score >= ACHIEVEMENT_SCORE) unlockAchievement("snake");
    if (state.score > readSnakeBest()) writeSnakeBest(state.score);
  }, [state.phase, state.score]);

  /* ----------------------------------------------------------- keyboard */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const key = e.key.toLowerCase();

    if (key === "q" || key === "escape") {
      e.preventDefault();
      boardRef.current?.blur();
      return;
    }

    if (key === "enter" || key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (state.phase !== "playing") start();
      return;
    }

    const dir = KEY_TO_DIR[key];
    if (!dir) return;

    // Only now — after establishing this is a key the game uses. Swallowing
    // everything would break tab-away, and swallowing nothing would scroll the
    // page under the board on every turn.
    e.preventDefault();
    e.stopPropagation();

    if (state.phase !== "playing") {
      start();
      pending.current = [dir];
      return;
    }
    // Bounded: a mash during one tick shouldn't bank a queue of turns that keep
    // applying after the player stopped pressing anything.
    if (pending.current.length < 2) pending.current.push(dir);
  }

  /** Losing focus pauses rather than kills — an accidental click elsewhere, or
   *  tabbing away to keep reading the page, shouldn't cost a run. */
  function onBlur() {
    setFocused(false);
    setState((prev) => (prev.phase === "playing" ? { ...prev, phase: "idle" } : prev));
  }

  /* -------------------------------------------------------------- render */
  const headKey = `${state.snake[0].x},${state.snake[0].y}`;
  const bodyKeys = new Set(state.snake.slice(1).map((p) => `${p.x},${p.y}`));
  const foodKey = `${state.food.x},${state.food.y}`;

  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    const cells = [];
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      let glyph = "·";
      let cls = "text-fg/15";
      if (key === headKey) {
        glyph = "█";
        cls = state.phase === "dead" ? "text-error" : "text-primary text-glow";
      } else if (bodyKeys.has(key)) {
        glyph = "▓";
        cls = state.phase === "dead" ? "text-error/60" : "text-primary/70";
      } else if (key === foodKey) {
        glyph = "◆";
        cls = "text-secondary";
      }
      cells.push(
        <span key={key} className={cls}>
          {glyph}
        </span>
      );
    }
    rows.push(
      <div key={y} className="flex">
        {cells}
      </div>
    );
  }

  const status =
    state.phase === "playing"
      ? "playing"
      : state.phase === "dead"
        ? "game over"
        : focused
          ? "ready — press an arrow"
          : "click or tab the board to play";

  return (
    <div className="text-xs sm:text-sm">
      <span className="sr-only">
        Snake, a keyboard game. Focus the board and use the arrow keys or WASD to steer. Current
        score {state.score}, best {best}.
      </span>

      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-fg/50">
        <span>
          score <span className="tabular-nums text-primary">{state.score}</span>
        </span>
        <span>
          best <span className="tabular-nums text-secondary">{Math.max(best, state.score)}</span>
        </span>
        <span
          className={
            state.phase === "dead"
              ? "text-error"
              : state.phase === "playing"
                ? "text-primary"
                : "text-fg/40"
          }
        >
          {status}
        </span>
      </div>

      <div
        ref={boardRef}
        role="application"
        aria-label="Snake game board"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        className={`inline-block border p-1.5 leading-none tracking-[0.15em] transition-colors ${
          focused ? "border-primary" : "border-border"
        }`}
      >
        {/* The grid is decorative: a screen reader gets the sr-only summary above
            rather than 264 punctuation characters read one at a time. */}
        <div aria-hidden="true" className="select-none">
          {rows}
        </div>
      </div>

      <p className="mt-1 text-fg/40">
        {state.phase === "dead" ? (
          <>
            <span className="text-error">dead.</span> press{" "}
            <span className="text-secondary">enter</span> to play again ·{" "}
            <span className="text-secondary">q</span> back to the shell
          </>
        ) : (
          <>
            <span className="text-secondary">↑←↓→</span> or{" "}
            <span className="text-secondary">wasd</span> to steer ·{" "}
            <span className="text-secondary">q</span> back to the shell
          </>
        )}
      </p>

      {reducedMotion && state.phase === "idle" && (
        <p className="mt-1 text-secondary">
          heads up: this one animates continuously while you play.
        </p>
      )}
    </div>
  );
}
