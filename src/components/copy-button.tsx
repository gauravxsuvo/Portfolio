"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export function CopyButton({
  text,
  label = "COPY",
  copiedLabel = "COPIED",
  className = "",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    // copyText resolves false rather than throwing, and falls back to the
    // legacy path in a non-secure context — see lib/clipboard.ts.
    if (!(await copyText(text))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`tap-target border border-border px-2 py-0.5 text-[11px] tracking-wide text-fg/60 hover:text-primary hover:border-primary transition-colors ${className}`}
    >
      [{copied ? copiedLabel : label}]
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "copied to clipboard" : ""}
      </span>
    </button>
  );
}
