"use client";

import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import { scrollToElement } from "@/lib/scroll";

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
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => handleClick(tag)}
          className="border border-border px-2 py-0.5 text-xs text-fg/60 hover:text-primary hover:border-primary transition-colors"
        >
          #{tag.replace(/\s+/g, "-")}
        </button>
      ))}
    </div>
  );
}
