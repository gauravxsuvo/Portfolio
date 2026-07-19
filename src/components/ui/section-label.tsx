import { retroAccentStyle } from "@/lib/ansi";

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
  // In retro mode each heading takes the next color in the ANSI cycle, keyed on
  // the section's own index so it's stable across renders and pages. Offset by
  // -1 so section 01 starts the cycle on green.
  const accent = retroAccentStyle(Number.parseInt(index, 10) - 1 || 0);

  return (
    <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-2">
      <span aria-hidden="true" className="text-fg/40">
        {"//"}
      </span>
      <span className="text-fg/40">{index}</span>
      <h2
        id={id}
        style={accent}
        className="retro-accent font-display text-2xl tracking-wide text-primary text-glow sm:text-3xl"
      >
        {label.toUpperCase()}
      </h2>
    </div>
  );
}
