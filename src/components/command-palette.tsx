"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projects, publications, bio } from "@/lib/data";
import { PRESETS } from "@/lib/color";
import {
  OPEN_THEME_PANEL_EVENT,
  setRetroTemplate,
  setThemeColor,
  setThemeMode,
} from "@/lib/theme";
import { RETRO_TEMPLATES } from "@/lib/retro-templates";
import { TRIGGER_MATRIX_EVENT } from "@/components/konami-listener";
import { OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import { unlockAchievement } from "@/lib/achievements";
import { isModalCapturingKeys, isTypingTarget } from "@/lib/keyboard";
import { OPEN_SHORTCUTS_EVENT } from "@/lib/shortcuts";
import { copyText } from "@/lib/clipboard";

type Item = {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords?: string;
  /** Leave the palette open and show `run`'s message instead of closing. */
  keepOpen?: boolean;
  run: () => void | Promise<string | void>;
};

/**
 * Subsequence match — the same feel as a fuzzy finder: "dpd" hits "DeepDarcy".
 * Returns a score so tighter matches float up, or -1 for no match at all.
 */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  const direct = h.indexOf(n);
  if (direct !== -1) return 1000 - direct;

  let score = 0;
  let hi = 0;
  let lastHit = -1;
  for (let ni = 0; ni < n.length; ni++) {
    const found = h.indexOf(n[ni], hi);
    if (found === -1) return -1;
    // Adjacent characters are worth more than scattered ones.
    score += found === lastHit + 1 ? 8 : 2;
    lastHit = found;
    hi = found + 1;
  }
  return score;
}

/**
 * Score one field, lifted clear of every lower-priority field.
 *
 * Which field matched has to outrank *how well* it matched, and a flat -1/-2
 * penalty did not achieve that: a direct hit scores `1000 - position`, so a
 * keyword matching at index 0 (1000, less the penalty) beat a label matching at
 * index 2 (998). Typing "contact" therefore ranked the "Copy email address"
 * action — whose keywords begin with "contact" — above the `~/contact` route
 * itself, and Enter copied an address instead of navigating.
 *
 * The gap is 2000 because no single fuzzyScore can reach it, so a label match
 * always wins over a keyword match regardless of where either landed. -1 stays
 * a "no match" sentinel and is never lifted.
 */
const TIER_GAP = 2000;

function tieredScore(haystack: string, needle: string, tier: number): number {
  const score = fuzzyScore(haystack, needle);
  return score < 0 ? -1 : score + tier * TIER_GAP;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  /** Result line from a keepOpen action, shown in the footer bar. */
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    setNotice("");
    restoreFocusRef.current?.focus?.();
  }, []);

  /**
   * Run an item. Most close the palette first, so the page underneath is what
   * you see the result on; a `keepOpen` item stays and reports back instead.
   * Awaited rather than fire-and-forget — that is what stops a rejected
   * clipboard write escaping as an unhandled rejection.
   */
  const runItem = useCallback(
    async (item: Item) => {
      if (!item.keepOpen) {
        close();
        await item.run();
        return;
      }
      const message = await item.run();
      if (typeof message === "string") setNotice(message);
    },
    [close]
  );

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => router.push(path);

    return [
      { id: "nav-home", label: "~/home", hint: "go", group: "navigate", run: go("/") },
      { id: "nav-about", label: "~/about", hint: "go", group: "navigate", run: go("/about") },
      { id: "nav-projects", label: "~/projects", hint: "go", group: "navigate", run: go("/projects") },
      {
        id: "nav-experience",
        label: "~/experience",
        hint: "go",
        group: "navigate",
        run: go("/experience"),
      },
      {
        id: "nav-publications",
        label: "~/publications",
        hint: "go",
        group: "navigate",
        keywords: "research papers",
        run: go("/publications"),
      },
      { id: "nav-contact", label: "~/contact", hint: "go", group: "navigate", run: go("/contact") },

      ...projects.map((p) => ({
        id: `project-${p.slug}`,
        label: p.name,
        hint: p.tagline,
        group: "projects",
        keywords: p.stack.join(" "),
        run: go(`/projects/${p.slug}`),
      })),

      ...publications.map((p) => ({
        id: `pub-${p.id}`,
        label: p.title,
        hint: `${p.venue} · ${p.year}`,
        group: "publications",
        keywords: (p.tags ?? []).join(" "),
        run: go("/publications"),
      })),

      ...RETRO_TEMPLATES.map((t) => ({
        id: `retro-${t.id}`,
        label: `${t.label} palette`,
        hint: t.blurb,
        group: "retro palettes",
        keywords: `theme retro colorful palette ${t.id}`,
        run: () => {
          setRetroTemplate(t.id);
          unlockAchievement("theme");
        },
      })),

      {
        id: "theme-mode-mono",
        label: "Mono mode",
        hint: "one phosphor color",
        group: "display",
        keywords: "theme mode single phosphor",
        run: () => {
          setThemeMode("mono");
          unlockAchievement("theme");
        },
      },

      ...PRESETS.map((preset) => ({
        id: `theme-${preset.id}`,
        label: preset.label,
        hint: preset.hex,
        group: "phosphor",
        keywords: `theme color ${preset.id}`,
        run: () => {
          // Picking a color implies mono, same as the panel and the shell.
          setThemeMode("mono");
          setThemeColor(preset.hex, "shell");
          unlockAchievement("theme");
        },
      })),

      {
        id: "action-shortcuts",
        label: "Keyboard shortcuts",
        hint: "?",
        group: "actions",
        keywords: "keys help cheatsheet bindings",
        run: () => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT)),
      },
      {
        id: "action-display",
        label: "Open display settings",
        hint: "hue / saturation / crt",
        group: "actions",
        keywords: "theme color crt scanlines",
        run: () => window.dispatchEvent(new Event(OPEN_THEME_PANEL_EVENT)),
      },
      {
        id: "action-matrix",
        label: "Digital rain",
        hint: "you know the one",
        group: "actions",
        keywords: "matrix konami",
        run: () => window.dispatchEvent(new Event(TRIGGER_MATRIX_EVENT)),
      },
      {
        id: "action-replay",
        label: "Replay boot sequence",
        hint: "reboot the machine",
        group: "actions",
        keywords: "restart reboot",
        run: () => window.dispatchEvent(new Event("suvo:replay-boot")),
      },
      {
        id: "action-email",
        label: "Copy email address",
        hint: bio.email,
        group: "actions",
        keywords: "contact mail hire",
        // Stays open to report the outcome. Closing on a copy meant the palette
        // vanished and nothing anywhere said whether it had worked — and when
        // the clipboard was blocked (any non-secure context), the floating
        // promise rejected into the console instead of telling anyone.
        keepOpen: true,
        run: async () =>
          (await copyText(bio.email))
            ? `copied ${bio.email}`
            : "clipboard blocked — select the address on ~/contact instead",
      },
      {
        id: "action-github",
        label: "Open GitHub",
        hint: `github.com/${bio.handle}`,
        group: "actions",
        keywords: "code repos source",
        run: () =>
          window.open(`https://github.com/${bio.handle}`, "_blank", "noopener,noreferrer"),
      },
    ];
  }, [router]);

  const results = useMemo(() => {
    const matched = !query.trim()
      ? items
      : items
          .map((item) => ({
            item,
            score: Math.max(
              tieredScore(item.label, query, 2),
              tieredScore(item.keywords ?? "", query, 1),
              tieredScore(item.group, query, 0)
            ),
          }))
          .filter((r) => r.score >= 0)
          .sort((a, b) => b.score - a.score)
          .map((r) => r.item);

    // Decide group headers here rather than tracking a running variable during
    // the render pass.
    return matched.map((item, i) => ({
      item,
      showGroup: i === 0 || matched[i - 1].group !== item.group,
    }));
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Never steal keys from the boot overlay: it's a modal with its own input,
      // and it sits above this one. Without the check, "/" typed at the boot
      // prompt opened the palette on top of the screen the user hadn't cleared.
      if (isModalCapturingKeys()) return;

      const typing = isTypingTarget(e.target);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Closing goes through close() rather than setOpen(false), because the
        // toggle used to skip everything close() does: the query and the
        // highlighted index survived, so the next ctrl+k reopened onto the
        // previous search with a stale `active` row — and it captured the
        // palette's own input as the element to restore focus to, which is
        // unmounted a frame later, so focus fell to <body> instead of returning
        // to wherever the user opened it from.
        if (open) {
          close();
          return;
        }
        restoreFocusRef.current = document.activeElement as HTMLElement;
        setOpen(true);
        return;
      }
      // "/" is the classic focus-search key, but only when the user isn't
      // already typing into something.
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    }
    function onOpenRequest() {
      restoreFocusRef.current = document.activeElement as HTMLElement;
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  /**
   * Escape and Tab are handled on the dialog rather than the input, so they work
   * no matter which descendant has focus. Tab wraps between the input and the
   * ESC hint's neighbours instead of walking out into the page underneath —
   * aria-modal tells a screen reader the rest of the page is inert, but it does
   * nothing to the tab order, so without this the two disagreed.
   */
  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;

    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[active];
      if (!hit) return;
      void runItem(hit.item);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center bg-bg/80 px-4 pt-[12vh] backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onDialogKeyDown}
        className="palette-in w-full max-w-xl border border-primary bg-bg"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <span aria-hidden="true" className="text-primary text-glow text-sm">
            :
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              // Drop a stale result line as soon as the search moves on, so
              // "copied …" can't sit under a list it no longer describes.
              setNotice("");
            }}
            onKeyDown={onInputKeyDown}
            placeholder="jump to anything…"
            aria-label="Search commands, pages and projects"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg caret-primary outline-none placeholder:text-fg/30"
          />
          <kbd className="border border-border px-1.5 py-0.5 text-[10px] text-fg/40">ESC</kbd>
        </div>

        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain py-1">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-fg/40">
              no matches. try <span className="text-secondary">projects</span>.
            </li>
          )}
          {results.map(({ item, showGroup }, i) => {
            const isActive = i === active;
            return (
              <li key={item.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-fg/30">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => void runItem(item)}
                  className={`flex w-full items-baseline gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                    isActive ? "bg-primary text-bg" : "text-fg/80 hover:text-primary"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span
                    className={`ml-auto min-w-0 truncate text-xs ${
                      isActive ? "text-bg/70" : "text-fg/35"
                    }`}
                  >
                    {item.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[10px] text-fg/35">
          {notice ? (
            // aria-live so the outcome of a copy is announced, not just painted
            // — the whole reason this row exists is that the action used to
            // report nothing to anyone.
            <span role="status" className="min-w-0 flex-1 truncate text-secondary">
              {notice}
            </span>
          ) : (
            <>
              <span>↑↓ move</span>
              <span>⏎ select</span>
            </>
          )}
          <span className="ml-auto shrink-0">{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
