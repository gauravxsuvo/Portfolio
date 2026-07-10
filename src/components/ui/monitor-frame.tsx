import type { ReactNode } from "react";

export function MonitorFrame({
  children,
  label = "SUVO-TERM 3000",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="w-full max-w-2xl border-8 border-neutral-800 bg-neutral-900 p-3 sm:p-4">
      <div className="border border-neutral-700 bg-bg p-3 sm:p-5">{children}</div>
      <div className="mt-3 flex items-center justify-between px-1 text-[10px] tracking-widest text-neutral-500">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 bg-primary animate-flicker"
          />
          PWR
        </span>
      </div>
    </div>
  );
}
