/**
 * The glow a CRT throws onto the dark around it.
 *
 * Two very large, very soft pools of light — one above, one bouncing below —
 * in a single analogous hue pair per palette. The colours and the reasoning
 * live in `globals.css` under "Phosphor mist"; the short version is that
 * ambient light has one colour temperature, so pulling several unrelated
 * accents made it read as coloured circles rather than atmosphere.
 *
 * Server component, no props, no state — two spans and a stylesheet. Sits at
 * z-0 with the ambient canvas and is `pointer-events-none`, so it can never
 * intercept a click. Stops drifting under `prefers-reduced-motion`, where a
 * slowly breathing background is exactly what that setting is asking about.
 */
export function PhosphorMist() {
  return (
    <div className="phosphor-mist" aria-hidden="true">
      <span className="phosphor-mist-blob" />
      <span className="phosphor-mist-blob" />
    </div>
  );
}
