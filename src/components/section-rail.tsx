"use client";

import { useSections } from "@/hooks/use-sections";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SHORTCUT_GROUPS } from "@/lib/shortcuts";

/**
 * A short legend, not the full cheatsheet: the rail is a narrow column and the
 * whole table doesn't fit. Picked from SHORTCUT_GROUPS by key rather than
 * retyped, so a renamed binding can't leave a stale label sitting here (this
 * used to be its own hardcoded list, and it never learned about ? or ctrl+r).
 */
// "/" stands in for ctrl+k, which carries the identical label and would just
// print "command palette" twice in a column this narrow. ? reveals the rest.
const LEGEND_KEYS = ["/", "?", "g h", "g p", "g c", "ctrl + r", "tab"];

const KEYS: [string, string][] = SHORTCUT_GROUPS.flatMap((g) => g.items)
  .filter((i) => LEGEND_KEYS.includes(i.keys))
  .sort((a, b) => LEGEND_KEYS.indexOf(a.keys) - LEGEND_KEYS.indexOf(b.keys))
  .map((i) => [i.keys, i.label]);

/**
 * Sticky right rail. On pages with sections it's a scroll-spy table of contents;
 * on the single-view pages (contact, project detail) there's nothing to spy on,
 * so it falls back to a key legend rather than rendering an empty box.
 */
export function SectionRail() {
  // Same reasoning as SystemRail: don't mount the IntersectionObserver at all on
  // viewports where the rail can never be seen.
  const shown = useMediaQuery("(min-width: 1280px)");
  const { sections, activeId } = useSections(shown);

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!shown) return null;

  return (
    <aside className="sticky top-24 h-fit w-52 shrink-0">
      {sections.length >= 2 ? (
        <nav aria-label="On this page" className="border border-border">
          <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-fg/40">
            +-- contents --+
          </p>
          <ul className="flex flex-col p-1.5">
            {sections.map((section, i) => {
              const active = section.id === activeId;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => go(section.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-baseline gap-2 px-1.5 py-1 text-left text-[11px] transition-colors ${
                      active ? "text-primary text-glow" : "text-fg/45 hover:text-fg/80"
                    }`}
                  >
                    <span aria-hidden="true" className={active ? "text-primary" : "text-fg/25"}>
                      {active ? "▶" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{section.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        <div aria-hidden="true" className="border border-border">
          <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-fg/40">
            +-- keys --+
          </p>
          <dl className="flex flex-col gap-1 p-3 text-[11px]">
            {KEYS.map(([key, label]) => (
              <div key={key} className="flex items-baseline justify-between gap-2">
                <dt className="text-secondary">{key}</dt>
                <dd className="text-fg/45">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </aside>
  );
}
