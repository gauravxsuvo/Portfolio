"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projects, publications, bio } from "@/lib/data";
import { PRESETS } from "@/lib/color";
import { OPEN_THEME_PANEL_EVENT, setThemeColor } from "@/lib/theme";
import { TRIGGER_MATRIX_EVENT } from "@/components/konami-listener";
import { OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import { unlockAchievement } from "@/lib/achievements";

type Item = {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords?: string;
  run: () => void;
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

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    restoreFocusRef.current?.focus?.();
  }, []);

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

      ...PRESETS.map((preset) => ({
        id: `theme-${preset.id}`,
        label: preset.label,
        hint: preset.hex,
        group: "phosphor",
        keywords: `theme color ${preset.id}`,
        run: () => {
          setThemeColor(preset.hex, "shell");
          unlockAchievement("theme");
        },
      })),

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
        run: () => navigator.clipboard?.writeText(bio.email),
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
              fuzzyScore(item.label, query),
              fuzzyScore(item.keywords ?? "", query) - 1,
              fuzzyScore(item.group, query) - 2
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
      const target = e.target as HTMLElement | null;
      const typing = !!target && /^(input|textarea)$/i.test(target.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement as HTMLElement;
        setOpen((v) => !v);
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
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
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
      close();
      hit.item.run();
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
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
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
                  onClick={() => {
                    close();
                    item.run();
                  }}
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
          <span>↑↓ move</span>
          <span>⏎ select</span>
          <span className="ml-auto">{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
