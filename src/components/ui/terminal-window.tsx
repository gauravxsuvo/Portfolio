import type { ReactNode } from "react";

type Accent = "primary" | "secondary" | "error";

const ACCENT_CLASSES: Record<Accent, string> = {
  primary: "border-border text-primary",
  secondary: "border-secondary text-secondary",
  error: "border-error text-error",
};

export function TerminalWindow({
  title,
  meta,
  accent = "primary",
  className = "",
  bodyClassName = "",
  children,
}: {
  title: string;
  meta?: string;
  accent?: Accent;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const accentClass = ACCENT_CLASSES[accent];

  return (
    <div className={`min-w-0 border bg-bg ${accentClass} ${className}`}>
      <div
        className={`flex items-center justify-between gap-3 border-b px-3 py-2 text-[11px] sm:text-xs ${accentClass}`}
      >
        <span className="min-w-0 truncate">
          <span aria-hidden="true" className="opacity-60">
            +---{" "}
          </span>
          {title.toUpperCase()}
          <span aria-hidden="true" className="opacity-60">
            {" "}
            ---+
          </span>
        </span>
        {meta && <span className="opacity-50 whitespace-nowrap">{meta}</span>}
      </div>
      <div className={`p-4 sm:p-5 text-fg ${bodyClassName}`}>{children}</div>
    </div>
  );
}
