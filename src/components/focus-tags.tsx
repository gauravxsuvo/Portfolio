"use client";

import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import { scrollToElement } from "@/lib/scroll";
import { retroAccentStyle } from "@/lib/ansi";

// grep does honest word-matching against real project/skill/publication text —
// it doesn't invent results. Two of the four bio.focus labels don't appear
// (even as separate words) anywhere in that content, even though the
// underlying work clearly qualifies: BharatSim IS a geospatial platform, and
// pairing Next.js with FastAPI IS full-stack. Rather than grep the label
// verbatim and land on "no matches", each tag searches a term that's actually
// present in the data it's meant to represent.
const SEARCH_TERM: Record<string, string> = {
  "geospatial systems": "geospatial",
  "full-stack development": "next.js",
};

export function FocusTags({ tags }: { tags: string[] }) {
  function handleClick(tag: string) {
    const el = document.getElementById("section-shell");
    scrollToElement(el, { block: "start" });
    const query = SEARCH_TERM[tag] ?? tag;
    window.dispatchEvent(
      new CustomEvent(SHELL_PREFILL_EVENT, { detail: `grep ${query}` })
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <button
          key={tag}
          type="button"
          onClick={() => handleClick(tag)}
          style={retroAccentStyle(i)}
          className="tap-target retro-hover border border-border px-2 py-0.5 text-xs text-fg/60 hover:text-primary hover:border-primary transition-colors"
        >
          {/* In retro mode the # prefix carries the tag's accent even at rest
              (custom properties inherit from the button), so the row reads as a
              colorful ANSI strip without shouting. */}
          <span aria-hidden="true" className="retro-accent">
            #
          </span>
          {tag.replace(/\s+/g, "-")}
        </button>
      ))}
    </div>
  );
}
