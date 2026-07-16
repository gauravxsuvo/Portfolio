"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorFrame } from "@/components/ui/monitor-frame";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketButton } from "@/components/ui/bracket-button";
import { unlockAchievement } from "@/lib/achievements";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BOOT_LOG = [
  "[ OK ] loading kernel modules",
  "[ OK ] mounting ~/portfolio",
  "[ OK ] starting gauravxsuvo.service",
  "[ OK ] compiling skills.db",
  "[ OK ] link established",
  "welcome, guest.",
];

const LINE_DELAY = 130;

type HistoryEntry = { command: string; output?: string; isError?: boolean };

function normalize(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [value, setValue] = useState("");
  const [booting, setBooting] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onComplete]);

  useEffect(() => {
    if (!booting) return;
    if (revealedCount >= BOOT_LOG.length) {
      const id = setTimeout(onComplete, reducedMotion ? 0 : 500);
      return () => clearTimeout(id);
    }
    const id = setTimeout(
      () => setRevealedCount((c) => c + 1),
      reducedMotion ? 0 : LINE_DELAY
    );
    return () => clearTimeout(id);
  }, [booting, revealedCount, reducedMotion, onComplete]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    const normalized = normalize(raw);

    if (normalized === "suvo init") {
      unlockAchievement("boot");
      setBooting(true);
      setValue("");
      return;
    }

    if (normalized === "help" || normalized === "?") {
      setHistory((h) => [...h, { command: raw, output: 'try: suvo init' }]);
    } else {
      setHistory((h) => [
        ...h,
        { command: raw, output: `bash: ${raw}: command not found`, isError: true },
      ]);
    }
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center p-4 sm:p-10">
      <div className="flex w-full max-w-2xl flex-col items-center gap-3">
        <MonitorFrame>
          <TerminalWindow title="gauravxsuvo // boot" meta="tty1">
            <div className="flex flex-col gap-1 text-xs sm:text-sm">
              <p className="text-fg/50">
                SUVO OS [Version 3.1] (c) {new Date().getFullYear()} Gaurav Raj Singh
              </p>

              {history.map((entry, i) => (
                <div key={i}>
                  <p>
                    <span className="text-primary">guest@gauravxsuvo</span>
                    <span className="text-fg/50">:boot~$</span> {entry.command}
                  </p>
                  {entry.output && (
                    <p className={entry.isError ? "text-error" : "text-fg/60"}>
                      {entry.output}
                    </p>
                  )}
                </div>
              ))}

              {!booting && (
                <>
                  <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2"
                  >
                    <label htmlFor="boot-input" className="sr-only">
                      Boot terminal. type suvo init and press enter
                    </label>
                    <span className="text-primary whitespace-nowrap">
                      guest@gauravxsuvo
                    </span>
                    <span className="text-fg/50 whitespace-nowrap">:boot~$</span>
                    <input
                      ref={inputRef}
                      id="boot-input"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent text-fg caret-primary outline-none"
                    />
                  </form>
                  <p className="mt-1 text-fg/40">
                    hint: type{" "}
                    <span className="text-secondary">suvo init</span> and
                    press enter
                  </p>
                </>
              )}

              {booting && (
                <div className="mt-1">
                  <span className="sr-only">{BOOT_LOG.join(". ")}</span>
                  <div aria-hidden="true">
                    {BOOT_LOG.slice(0, revealedCount).map((line, i) => (
                      <p
                        key={i}
                        className={
                          line.startsWith("[ OK ]") ? "text-primary" : "text-fg"
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TerminalWindow>
        </MonitorFrame>

        <BracketButton
          variant="ghost"
          onClick={onComplete}
          aria-label="Skip boot sequence and enter site"
          className="text-fg/50"
        >
          SKIP INTRO
        </BracketButton>
      </div>
    </div>
  );
}
