type Status = "ok" | "wip" | "err" | "live";

const STATUS_MAP: Record<Status, { label: string; className: string }> = {
  ok: { label: "OK", className: "text-primary border-primary" },
  live: { label: "LIVE", className: "text-primary border-primary" },
  wip: { label: "WIP", className: "text-secondary border-secondary" },
  err: { label: "ARCHIVED", className: "text-error border-error" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 text-[10px] leading-none tracking-widest ${className}`}
    >
      [{label}]
    </span>
  );
}
