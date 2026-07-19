/**
 * The haze that hangs in front of a CRT in a dark room.
 *
 * Three big, heavily-blurred colour blobs drifting on long offset loops, at low
 * enough opacity that you read it as atmosphere rather than as shapes. In retro
 * mode each blob takes a different accent slot, so the mist changes character
 * with the palette; in mono they all fall back to the single phosphor colour.
 *
 * Server component, no props, no state — it's three divs and a stylesheet. It
 * sits at z-0 with the ambient canvas and is `pointer-events-none`, so it can
 * never intercept a click. Killed entirely under `prefers-reduced-motion`,
 * where a slowly breathing background is exactly the kind of thing that
 * setting is asking about.
 */
export function PhosphorMist() {
  return (
    <div className="phosphor-mist" aria-hidden="true">
      <span className="phosphor-mist-blob" />
      <span className="phosphor-mist-blob" />
      <span className="phosphor-mist-blob" />
    </div>
  );
}
