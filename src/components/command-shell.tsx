"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { PromptInput } from "@/components/ui/prompt-input";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import {
  COMPLETIONS,
  completionsFor,
  resolveCommand,
  runShellCommand,
} from "@/lib/shell-commands";
import { unlockAchievement } from "@/lib/achievements";

type Entry = { id: number; command: string; output: ReactNode; pending?: boolean };

const BANNER: Entry = {
  id: 0,
  command: "",
  output: (
    <p className="text-fg/50">
      type <span className="text-secondary">help</span> to see what this does.{" "}
      <span className="text-fg/30">(↑ history · tab completes)</span>
    </p>
  ),
};

/** Longest string that every candidate starts with — what a real shell fills in. */
function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

export function CommandShell() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([BANNER]);
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  const nextId = useRef(1);

  // Command history, newest last. `cursor` walks it; -1 means "at the live line".
  const historyRef = useRef<string[]>([]);
  const cursorRef = useRef(-1);
  const draftRef = useRef("");

  useEffect(() => {
    // Skip on mount — scrolling the shell's own internal history list into
    // view on first paint was dragging the whole page's scroll position down
    // with it (the shell isn't the first section on the page), hiding the
    // hero above it. Only scroll once the user actually runs a command.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries]);

  useEffect(() => {
    function onPrefill(e: Event) {
      const cmd = (e as CustomEvent<string>).detail;
      if (typeof cmd !== "string") return;
      setValue(cmd);
      inputRef.current?.focus();
    }
    window.addEventListener(SHELL_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(SHELL_PREFILL_EVENT, onPrefill);
  }, []);

  /** Candidate completions for whatever token the caret is sitting on. */
  const candidates = useCallback((text: string): { token: string; options: string[] } => {
    const parts = text.split(/\s+/);
    const token = parts[parts.length - 1] ?? "";
    const pool = parts.length <= 1 ? COMPLETIONS : completionsFor(parts[0].toLowerCase());
    return { token, options: pool.filter((o) => o.startsWith(token.toLowerCase())) };
  }, []);

  // Inline ghost suggestion: only when exactly one candidate is left, otherwise
  // it just lies to you. Derived from `value` — no state, no effect.
  const ghost = useMemo(() => {
    if (!value || value.endsWith(" ")) return "";
    const { token, options } = candidates(value);
    return options.length === 1 && options[0] !== token ? options[0].slice(token.length) : "";
  }, [value, candidates]);

  const push = useCallback((entry: Omit<Entry, "id">) => {
    const id = nextId.current++;
    setEntries((prev) => [...prev, { ...entry, id }]);
    return id;
  }, []);

  function handleTab() {
    const { token, options } = candidates(value);
    if (options.length === 0) return;

    unlockAchievement("tab");

    if (options.length === 1) {
      const head = value.slice(0, value.length - token.length);
      setValue(head + options[0] + " ");
      return;
    }

    const prefix = commonPrefix(options);
    if (prefix.length > token.length) {
      const head = value.slice(0, value.length - token.length);
      setValue(head + prefix);
      return;
    }

    // Ambiguous — print the candidates the way bash does instead of guessing.
    push({
      command: "",
      output: (
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-fg/60">
          {options.map((o) => (
            <span key={o}>{o}</span>
          ))}
        </p>
      ),
    });
  }

  function recallHistory(direction: -1 | 1) {
    const history = historyRef.current;
    if (history.length === 0) return;

    if (cursorRef.current === -1) {
      if (direction === 1) return; // already at the live line
      draftRef.current = value;
      cursorRef.current = history.length - 1;
    } else {
      const next = cursorRef.current + (direction === -1 ? -1 : 1);
      if (next >= history.length) {
        cursorRef.current = -1;
        setValue(draftRef.current);
        return;
      }
      cursorRef.current = Math.max(0, next);
    }
    setValue(history[cursorRef.current]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      handleTab();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      recallHistory(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      recallHistory(1);
      return;
    }
    if (e.key === "ArrowRight" && ghost) {
      // Accept the inline suggestion, readline-style.
      const caretAtEnd = e.currentTarget.selectionStart === value.length;
      if (caretAtEnd) {
        e.preventDefault();
        setValue(value + ghost);
      }
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setEntries([]);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      if (!value) return;
      push({ command: `${value}^C`, output: null });
      setValue("");
      cursorRef.current = -1;
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "u") {
      e.preventDefault();
      setValue("");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;

    setValue("");
    historyRef.current = [...historyRef.current, raw];
    cursorRef.current = -1;
    draftRef.current = "";

    const [cmd, ...rest] = raw.split(/\s+/);
    const name = cmd.toLowerCase();
    const arg = rest.join(" ");

    if (resolveCommand(name)?.name === "clear") {
      setEntries([]);
      return;
    }

    const past = historyRef.current.slice(0, -1);
    const result = runShellCommand({ name, arg, raw, history: past, router });

    if (result instanceof Promise) {
      const id = push({ command: raw, output: null, pending: true });
      result
        .then((output) =>
          setEntries((prev) =>
            prev.map((entry) => (entry.id === id ? { ...entry, output, pending: false } : entry))
          )
        )
        .catch(() =>
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === id
                ? { ...entry, output: <p className="text-error">command failed.</p>, pending: false }
                : entry
            )
          )
        );
      return;
    }

    push({ command: raw, output: result });
  }

  return (
    <TerminalWindow
      title="guest@gaurav — shell"
      meta="interactive"
      bodyClassName="flex flex-col gap-3"
      className="trace-box"
    >
      <div
        className="flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain text-xs sm:text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1;
          return (
            <div key={entry.id} aria-live={isLast ? "polite" : undefined}>
              {entry.command && (
                <p>
                  <span className="text-primary">guest@gauravxsuvo</span>
                  <span className="text-fg/50">:~$</span> {entry.command}
                </p>
              )}
              {entry.pending ? (
                <p className="mt-0.5 text-fg/40">
                  working
                  <span className="animate-blink">_</span>
                </p>
              ) : (
                entry.output && <div className="mt-0.5">{entry.output}</div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit}>
        <PromptInput
          ref={inputRef}
          promptLabel="guest@gauravxsuvo"
          path="~$"
          placeholder="type help to get started"
          value={value}
          ghost={ghost}
          onChange={(e) => {
            setValue(e.target.value);
            cursorRef.current = -1;
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Command shell input"
        />
      </form>
    </TerminalWindow>
  );
}
