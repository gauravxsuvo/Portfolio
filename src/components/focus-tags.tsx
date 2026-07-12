"use client";

import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";

export function FocusTags({ tags }: { tags: string[] }) {
  function handleClick(tag: string) {
    const el = document.getElementById("section-shell");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(
      new CustomEvent(SHELL_PREFILL_EVENT, { detail: `grep ${tag}` })
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
