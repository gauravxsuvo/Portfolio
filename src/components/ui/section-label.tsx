import { retroAccentStyle } from "@/lib/ansi";
import { DecodeText } from "@/components/ui/decode-text";

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
  // In retro mode each heading takes the next colour in the ANSI cycle, keyed
  // on the section's own index so it's stable across renders and pages. The
  // style sits on the wrapper, not the h2, because custom properties inherit —
  // that's what lets the index number pick up the same accent.
  const accent = retroAccentStyle(Number.parseInt(index, 10) - 1 || 0);

  return (
    <div
      style={accent}
      className="divider-scan mb-6 flex items-baseline gap-3 border-b border-border pb-2"
    >
      <span aria-hidden="true" className="text-fg/40">
        {"//"}
      </span>
      <span className="retro-accent text-fg/40 opacity-70">{index}</span>
      <h2
        id={id}
        className="retro-accent font-display text-2xl tracking-wide text-primary text-glow sm:text-3xl"
      >
        {/* Decodes out of noise the first time it scrolls into view — the same
            signal-locking-on idea as the hero's identity scan, and the reason
            the divider's scanning beam has something to be scanning *for*.
            Keeps the real string in an sr-only span, so this heading's
            accessible name (and every aria-labelledby pointing at it) is
            unaffected. */}
        <DecodeText text={label.toUpperCase()} />
        {/* A cursor parked after the heading, as if the line were just typed.
            aria-hidden so it isn't read as part of the accessible name. */}
        <span aria-hidden="true" className="blink-hard ml-1 opacity-70">
          _
        </span>
      </h2>
      {/* The scanning beam. A real element rather than a `::after` so the
          travelling band can be a clipped child and therefore a pure transform
          — see "divider beam" in globals.css for the measurement that motivated
          it. The clip is on this 1px strip, so the heading's glow is untouched. */}
      <span aria-hidden="true" className="divider-beam">
        <i />
      </span>
    </div>
  );
}
