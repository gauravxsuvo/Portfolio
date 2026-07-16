/**
 * Loading state for the dashboard.
 *
 * The queries take a beat — they're a dozen aggregates over a Postgres in
 * another region, and Neon's free tier cold-starts. With no feedback that reads
 * as the site hanging, which is the complaint that prompted this.
 *
 * Two things make it feel fast rather than merely honest:
 *   - It mirrors the real layout's shape and count, so the content lands in
 *     place instead of shoving the page around when it arrives.
 *   - It animates. A static grey block reads as broken; a pulsing one reads as
 *     working. `animate-pulse` degrades to nothing under prefers-reduced-motion
 *     via the global rule in globals.css, which is the correct behaviour — the
 *     skeleton is still legible as a placeholder without the motion.
 */

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 ${className}`} aria-hidden="true" />;
}

function StatSkeleton() {
  return (
    <div className="border border-border p-3">
      <Shimmer className="h-2 w-14" />
      <Shimmer className="mt-2.5 h-5 w-12" />
    </div>
  );
}

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="border border-border p-4">
      <Shimmer className="mb-3 h-2 w-24" />
      <div className="flex flex-col gap-2">
        {/* Descending widths so it reads as a ranked list rather than a grid of
            identical bars — the shape of the real thing is what stops the
            content jumping when it lands. */}
        {["w-5/6", "w-4/6", "w-3/6", "w-2/5", "w-1/3"].slice(0, rows).map((w) => (
          <div key={w} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <Shimmer className={`h-2.5 ${w}`} />
            <Shimmer className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    // aria-busy + a polite live region: a screen reader user gets told the
    // thing is loading rather than hearing an empty page.
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading analytics…</p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </dl>

      <div className="mt-4 border border-border p-3">
        <Shimmer className="mb-2 h-2 w-28" />
        <Shimmer className="h-5 w-full" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <PanelSkeleton key={i} rows={i % 2 === 0 ? 5 : 4} />
        ))}
      </div>
    </div>
  );
}
