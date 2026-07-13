import type { InputHTMLAttributes, Ref } from "react";

export function PromptInput({
  promptLabel = "guest@site",
  path = "~$",
  className = "",
  ghost,
  ref,
  ...rest
}: {
  promptLabel?: string;
  path?: string;
  className?: string;
  /** Dim inline completion rendered after the caret, shell-style. */
  ghost?: string;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-center gap-2 border-b border-border pb-2 ${className}`}>
      <span className="whitespace-nowrap text-sm text-primary">
        {promptLabel}
        <span className="text-fg/50">:{path}</span>
      </span>
      <span className="relative min-w-0 flex-1">
        <input
          ref={ref}
          {...rest}
          className="w-full min-w-0 bg-transparent text-sm text-fg caret-primary outline-none placeholder:text-fg/30"
        />
        {ghost && (
          // Mirrors the typed value with an invisible span so the suggestion
          // lands exactly where the caret is — only holds up because the whole
          // site is monospace.
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center whitespace-pre text-sm"
          >
            <span className="invisible">{String(rest.value ?? "")}</span>
            <span className="text-fg/25">{ghost}</span>
          </span>
        )}
      </span>
    </label>
  );
}
