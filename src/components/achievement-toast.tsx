"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_EVENT,
  getAchievement,
} from "@/lib/achievements";

type Toast = { key: number; label: string; found: number; total: number };

const VISIBLE_MS = 3600;

/**
 * unlockAchievement() has always dispatched suvo:achievement — nothing was
 * listening, so every one of the site's secrets unlocked in total silence and
 * the only way to learn you'd found one was to type `achievements` in the shell.
 */
export function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    function onUnlock(e: Event) {
      const detail = (e as CustomEvent<{ id: string; found: number; total: number }>).detail;
      const achievement = getAchievement(detail?.id ?? "");
      if (!achievement) return;

      const key = Date.now() + Math.random();
      setToasts((t) => [
        ...t.slice(-2),
        {
          key,
          label: achievement.label,
          found: detail.found,
          total: detail.total ?? ACHIEVEMENTS.length,
        },
      ]);

      const id = setTimeout(
        () => setToasts((t) => t.filter((toast) => toast.key !== key)),
        VISIBLE_MS
      );
      timers.current.push(id);
    }

    window.addEventListener(ACHIEVEMENT_EVENT, onUnlock);
    const pending = timers.current;
    return () => {
      window.removeEventListener(ACHIEVEMENT_EVENT, onUnlock);
      pending.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className="toast-in border border-secondary bg-bg/95 px-3 py-2 shadow-none backdrop-blur-sm"
        >
          <div className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-secondary text-glow-amber tracking-[0.2em]">
              ACHIEVEMENT UNLOCKED
            </span>
            <span className="tabular-nums text-fg/50">
              {toast.found}/{toast.total}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-fg/85">{toast.label}</p>
          <div
            aria-hidden="true"
            className="mt-1.5 h-px w-full origin-left bg-secondary/60 toast-bar"
          />
        </div>
      ))}
    </div>
  );
}
