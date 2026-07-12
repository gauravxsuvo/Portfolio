export function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-2">
      <span aria-hidden="true" className="text-fg/40">
        {"//"}
      </span>
      <span className="text-fg/40">{index}</span>
      <h2 className="text-lg sm:text-xl font-bold tracking-wide text-primary text-glow">
        {label.toUpperCase()}
      </h2>
    </div>
  );
}
