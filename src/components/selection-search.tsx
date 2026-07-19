"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import { useMediaQuery } from "@/hooks/use-media-query";
import { scrollToElement } from "@/lib/scroll";

type Pos = { x: number; y: number; text: string };

const MIN = 2;
const MAX = 48;

/**
 * Highlight any text on the page and get a "grep this" action next to the
 * selection, which drops the term into the shell and runs it.
 *
 * Fine-pointer only: on touch this would fight the OS's own copy/paste callout,
 * which is a worse experience than not having the feature.
 */
export function SelectionSearch() {
  const router = useRouter();
  const fine = useMediaQuery("(pointer: fine)");
  const [pos, setPos] = useState<Pos | null>(null);

  const clear = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!fine) return;

    function read() {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";

      if (!selection || selection.isCollapsed || text.length < MIN || text.length > MAX) {
        setPos(null);
        return;
      }
      // Ignore selections inside inputs — the user is editing, not researching.
      const anchor = selection.anchorNode;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (el?.closest("input, textarea, [data-no-selection-search]")) {
        setPos(null);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos(null);
        return;
      }
      setPos({ x: rect.left + rect.width / 2, y: rect.top, text });
    }

    // pointerup rather than selectionchange: the latter fires on every character
    // as the selection is being dragged, so the button would jitter along under
    // the cursor mid-drag.
    document.addEventListener("pointerup", read);
    document.addEventListener("keyup", read);
    window.addEventListener("scroll", clear, { passive: true });
    return () => {
      document.removeEventListener("pointerup", read);
      document.removeEventListener("keyup", read);
      window.removeEventListener("scroll", clear);
    };
  }, [fine, clear]);

  if (!fine || !pos) return null;

  function run() {
    if (!pos) return;
    const term = pos.text;
    setPos(null);
    window.getSelection()?.removeAllRanges();
    router.push("/");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(SHELL_PREFILL_EVENT, { detail: `grep ${term}` }));
      scrollToElement(document.getElementById("section-shell"), { block: "center" });
    }, 120);
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()} // don't drop the selection before onClick
      onClick={run}
      style={{ left: pos.x, top: pos.y }}
      className="palette-in fixed z-[64] -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap border border-primary bg-bg px-2 py-1 text-[11px] text-primary shadow-none hover:bg-primary hover:text-bg"
    >
      [ grep &quot;{pos.text.length > 18 ? `${pos.text.slice(0, 18)}…` : pos.text}&quot; ]
    </button>
  );
}
