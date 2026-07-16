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
import {
  appendHistory,
  clearHistory,
  readHistory,
  reverseSearch,
  writeHistory,
} from "@/lib/shell-history";

type Entry = { id: number; command: string; output: ReactNode; pending?: boolean };

/** ctrl+r state. `skip` counts how many older matches we've stepped past. */
type Search = { term: string; skip: number };

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

  /**
   * Command history, newest last, seeded straight from localStorage.
   *
   * State rather than a ref because ctrl+r renders the matched entry, so this is
   * render data — a ref read during render wouldn't re-run the match when the
   * list changed.
   *
   * The initializer is safe to run during a server render (readHistory returns []
   * without a window) and safe to run again on the client with a different value,
   * because nothing derived from history reaches the DOM until the user opens a
   * search: `search` starts null, so the first client paint matches the server's
   * regardless of what's in storage. That's what lets this skip the usual
   * mounted-gate — which for a visible section would mean popping the shell in
   * one frame late.
   */
  const [history, setHistory] = useState<string[]>(readHistory);
  // `cursor` walks the history; -1 means "at the live line". These two stay refs
  // — nothing renders them, and they're read and written inside one keystroke.
  const cursorRef = useRef(-1);
  const draftRef = useRef("");

  // ctrl+r reverse-i-search. null when not searching.
  const [search, setSearch] = useState<Search | null>(null);
  const searchHit = search ? reverseSearch(history, search.term, search.skip) : null;

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

  /** Leave reverse-search, optionally dropping the found command on the line. */
  function endSearch(accept: boolean) {
    if (accept && searchHit) setValue(searchHit.command);
    setSearch(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // ctrl+r: open reverse-i-search, or step to the next-older match if it's
    // already open. Browsers bind ctrl+r to reload, so this must preventDefault
    // before anything else gets a look at it.
    if (e.ctrlKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      unlockAchievement("reverse-search");
      setSearch((s) => {
        // Seeded with whatever is already on the line, so typing a few letters
        // and then hitting ctrl+r searches for them.
        if (!s) return { term: value, skip: 0 };
        // Hold at the oldest match instead of stepping into nothing — bash beeps
        // and stays put rather than blanking the line you were looking at.
        const next = s.skip + 1;
        return reverseSearch(history, s.term, next) ? { ...s, skip: next } : s;
      });
      return;
    }

    if (search) {
      // In search mode the input's text *is* the search term, so printable keys
      // fall through to onChange as usual. Only the exits are special.
      if (e.key === "Escape" || (e.ctrlKey && e.key.toLowerCase() === "g")) {
        e.preventDefault();
        endSearch(false);
        return;
      }
      // Any arrow or tab means "I'm done searching, let me edit this" — readline
      // leaves the search on a cursor key too. All four are listed rather than
      // just the horizontal pair: letting ↑ fall through to recallHistory would
      // load a *different* entry onto the line while the search prompt above it
      // still advertised the old term.
      if (e.key.startsWith("Arrow") || e.key === "Tab") {
        e.preventDefault();
        endSearch(true);
        return;
      }
      // Enter falls through to the form's submit, which runs the match directly.
    }

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

  /**
   * Execute one line. Takes the text explicitly rather than reading `value`,
   * because ctrl+r's Enter has to run the *matched* command — a setValue in the
   * same tick hasn't landed yet, so reading state here would run the search term
   * the user typed instead of the history entry they picked.
   */
  function runLine(raw: string) {
    if (!raw) return;

    setValue("");
    setSearch(null);
    cursorRef.current = -1;
    draftRef.current = "";

    // `history` still holds the list as it was *before* this line — which is
    // exactly what the command sees, so `history` doesn't list itself.
    const past = history;
    const next = appendHistory(past, raw);
    setHistory(next);
    writeHistory(next);

    const [cmd, ...rest] = raw.split(/\s+/);
    const name = cmd.toLowerCase();
    const arg = rest.join(" ");

    const resolved = resolveCommand(name);
    if (resolved?.name === "clear") {
      setEntries([]);
      return;
    }
    if (resolved?.name === "history" && arg.trim().toLowerCase() === "-c") {
      clearHistory();
      setHistory([]);
      push({ command: raw, output: <p className="text-fg/50">history cleared.</p> });
      return;
    }

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // In search mode the line holds the term, not a command — run the match.
    runLine((search && searchHit ? searchHit.command : value).trim());
  }

  return (
    <TerminalWindow
      title="guest@gaurav // shell"
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
          // bash swaps the whole prompt out during ctrl+r rather than decorating
          // it, which is the clearest signal that Enter is about to do something
          // different from what it usually does.
          promptLabel={search ? "(reverse-i-search)" : "guest@gauravxsuvo"}
          path={search ? `'${search.term}':` : "~$"}
          placeholder={search ? "type to search history" : "type help to get started"}
          value={value}
          ghost={search ? "" : ghost}
          onChange={(e) => {
            setValue(e.target.value);
            cursorRef.current = -1;
            // Editing the term restarts the walk from the newest match; keeping
            // the old skip would silently hide hits you'd just typed toward.
            if (search) setSearch({ term: e.target.value, skip: 0 });
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={search ? "Reverse history search" : "Command shell input"}
        />
      </form>

      {search && (
        <p className="-mt-1 text-xs" aria-live="polite">
          {searchHit ? (
            <>
              <span className="text-fg/40">↳ </span>
              <span className="text-primary">{searchHit.command}</span>
              <span className="ml-2 text-fg/30">
                ctrl+r older · ↹ edit · ⏎ run · esc cancel
              </span>
            </>
          ) : (
            <span className="text-fg/40">
              {search.term ? `no history match for "${search.term}"` : "type to search history"}
            </span>
          )}
        </p>
      )}
    </TerminalWindow>
  );
}
