import type { Row } from "@/lib/analytics/queries";

/**
 * A ranked list drawn as ASCII bars.
 *
 * Deliberately not a charting library: this site has zero UI dependencies and
 * renders everything in a monospace grid, so a bar made of block glyphs is both
 * more on-theme and about 40KB cheaper than the alternative. Monospace means
 * every glyph is the same width, so the bars line up exactly — the one place
 * where a terminal aesthetic is genuinely better at this than an SVG chart.
 */

const BAR_WIDTH = 18;

export function StatBars({
  title,
  rows,
  empty = "no data yet",
  format,
}: {
  title: string;
  rows: Row[];
  empty?: string;
  format?: (value: number) => string;
}) {
  // Scale to the largest row, not the total: these are rankings, and against a
  // total the long tail collapses into invisible slivers.
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <section className="border border-border p-4">
      <h2 className="mb-3 text-xs uppercase tracking-[0.15em] text-secondary">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-fg/30">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-xs">
          {rows.map((row) => {
            const filled = max > 0 ? Math.round((row.value / max) * BAR_WIDTH) : 0;
            return (
              <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="min-w-0 truncate text-fg/70" title={row.label}>
                  {row.label}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {/* The bar is decoration; the number beside it is the real
                      content, so screen readers get the number and skip this. */}
                  <span aria-hidden="true" className="hidden text-primary sm:inline">
                    {"█".repeat(filled)}
                    <span className="text-border">{"░".repeat(BAR_WIDTH - filled)}</span>
                  </span>
                  <span className="w-12 text-right text-fg">
                    {format ? format(row.value) : row.value.toLocaleString()}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
