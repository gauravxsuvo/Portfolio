"use client";

import { useState } from "react";

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
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — silently no-op, button just stays as-is
    }
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
