import { OG_BORDER, OG_MIST } from "./og-theme";

/**
 * The CRT treatment shared by every share card.
 *
 * The cards used to be flat: a bordered box of coloured text, with none of the
 * tube the whole site is built around. Someone seeing a link preview in a feed
 * got no signal about what they were about to open.
 *
 * Three layers, in the order the site draws them (globals.css): the mist glow
 * behind the content, the scanlines above it, and the corner falloff — which
 * is an inset shadow on the frame itself rather than a layer, see
 * OG_FRAME_STYLE.
 *
 * **Satori is not a browser, and every shortcut here failed silently.** None of
 * these threw, logged, or looked wrong in the source; each one just produced a
 * PNG missing the effect:
 *
 *   - `repeating-linear-gradient` renders nothing at all.
 *   - a plain gradient tiled with `background-size` + `background-repeat`
 *     renders nothing at all.
 *   - `inset: 0` is not expanded, so a layer written that way has zero size.
 *   - a stack of 1px-bordered rows needs an explicit width, and still did not
 *     paint.
 *   - `radial-gradient(ellipse <pct> <pct> ...)` ignores its stops and lays a
 *     near-uniform veil instead of a falloff.
 *   - `transparent` in a gradient is transparent *black*, and colour is
 *     interpolated without premultiplying alpha, so it smears grey.
 *
 * The lesson is the process, not the list: **verify these by sampling pixels
 * out of the rendered PNG**, never by reading the CSS. A column of luminance
 * values through the output is the only thing that actually proves a layer
 * rendered.
 */

/**
 * 6px rather than the site's 3px. A share card is almost always seen scaled
 * down — around 500px wide in a timeline, so 42% — and a 3px pitch lands at
 * 1.3px there, which resamples into flat grey haze instead of scanlines. 6px
 * survives the downscale as visible structure.
 */
const SCANLINE_PITCH = 6;
const SCANLINE_ALPHA = 0.055;
/** Tall enough to cover the frame at every card size; the rest is clipped. */
const SCANLINE_EXTENT = 700;

/**
 * One gradient with explicit px stops, built once at module load.
 *
 * A plain `linear-gradient` is the only one of these that Satori actually
 * rasterises, so the repeat has to be unrolled by hand into stop pairs.
 *
 * The gaps are `rgba(255,255,255,0)` and **must not** be `transparent` or
 * `rgba(0,0,0,0)`. Those are transparent *black*, and Satori interpolates
 * colour without premultiplying alpha, so every gap drags a film of
 * translucent black across the card — it knocked the near-white wordmark down
 * to grey and dimmed the whole image, while the scanlines themselves still
 * looked correct. Keeping both ends of each stop pair the same hue means only
 * the alpha moves.
 */
const SCANLINE_GRADIENT = `linear-gradient(to bottom, ${Array.from(
  { length: Math.ceil(SCANLINE_EXTENT / SCANLINE_PITCH) },
  (_, i) => {
    const top = i * SCANLINE_PITCH;
    return (
      `rgba(255,255,255,${SCANLINE_ALPHA}) ${top}px, ` +
      `rgba(255,255,255,${SCANLINE_ALPHA}) ${top + 1}px, ` +
      `rgba(255,255,255,0) ${top + 1}px, ` +
      `rgba(255,255,255,0) ${top + SCANLINE_PITCH}px`
    );
  }
).join(", ")})`;

/** Sits *behind* the content. Render first inside the frame. */
export function CrtGlow() {
  return (
    <div
      style={{
        position: "absolute",
        top: "-30%",
        left: "-15%",
        width: "85%",
        height: "150%",
        display: "flex",
        // The same eased falloff the site uses, for the same reason: a linear
        // ramp leaves a visible circular edge, and Satori has no cheap blur to
        // hide one with.
        backgroundImage: `radial-gradient(circle closest-side, ${OG_MIST}1f 0%, ${OG_MIST}14 35%, ${OG_MIST}0a 60%, ${OG_MIST}04 80%, transparent 100%)`,
      }}
    />
  );
}

/** Explicit sizing, never `inset: 0` — see the note at the top of this file. */
const FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
};

/**
 * Scanlines only — the corner falloff is the frame's inset shadow.
 *
 * Worth keeping the number: the radial-gradient version of that falloff took
 * the near-white wordmark from a measured peak luminance of 245 down to 142,
 * and still looked plausibly like a vignette in the output.
 */
export function CrtOverlay() {
  return <div style={{ ...FILL, backgroundImage: SCANLINE_GRADIENT }} />;
}

/** The frame every card sits in, so the chrome can't drift between them. */
export const OG_FRAME_STYLE = {
  position: "relative" as const,
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  border: `2px solid ${OG_BORDER}`,
  overflow: "hidden" as const,
  padding: "44px 60px",
  // The tube's corner falloff. Sized in px rather than vw: these images have
  // fixed dimensions, and Satori has no viewport to resolve vw against.
  boxShadow: "inset 0 0 150px rgba(0,0,0,0.75)",
};
