export function SectionLabel({
  index,
  label,
  id,
}: {
  index: string;
  label: string;
  /**
   * Wire this to the parent <section aria-labelledby>. Every section on the site
   * pointed at an id like "shell-heading" that nothing actually rendered, so the
   * accessible name silently fell back to nothing.
   */
  id?: string;
}) {
  return (
    <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-2">
      <span aria-hidden="true" className="text-fg/40">
        {"//"}
      </span>
      <span className="text-fg/40">{index}</span>
      <h2
        id={id}
        className="text-lg font-bold tracking-wide text-primary text-glow sm:text-xl"
      >
        {label.toUpperCase()}
      </h2>
    </div>
  );
}
