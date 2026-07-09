const TOTAL_TICKS = 20;

export function ProgressBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  const filled = Math.round((clamped / max) * TOTAL_TICKS);
  const bar = "|".repeat(filled) + ".".repeat(TOTAL_TICKS - filled);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      className="flex flex-col gap-1"
    >
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-fg/50">{clamped}%</span>
      </div>
      <div aria-hidden="true" className="text-primary text-glow leading-none">
        [{bar}]
      </div>
    </div>
  );
}
