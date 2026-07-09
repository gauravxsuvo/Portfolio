import type { InputHTMLAttributes } from "react";

export function PromptInput({
  promptLabel = "guest@site",
  path = "~$",
  className = "",
  ...rest
}: {
  promptLabel?: string;
  path?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-center gap-2 border-b border-border pb-2 ${className}`}>
      <span className="text-primary whitespace-nowrap text-sm">
        {promptLabel}
        <span className="text-fg/50">:{path}</span>
      </span>
      <input
        {...rest}
        className="flex-1 min-w-0 bg-transparent outline-none text-fg placeholder:text-fg/30 caret-primary text-sm"
      />
    </label>
  );
}
