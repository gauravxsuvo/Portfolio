import { OG_ACCENT_1, OG_BG, OG_MIST, OG_PRIMARY } from "./og-theme";

/**
 * The site mark: a prompt chevron and a block cursor.
 *
 * Shared by the favicon and the apple touch icon so the two can't drift.
 *
 * Drawn as geometry, not as the text ">_". Two reasons, both learned from what
 * was here before. A glyph pair is cramped in a 16px box — the old mark set `>`
 * and `_` at their natural baselines, so the underscore sat well below the
 * chevron's centre and the whole thing read as bottom-left-heavy rather than as
 * one mark. And text at 16px depends on font hinting that Satori doesn't do,
 * where a rotated-border chevron is exact at any size.
 *
 * The chevron is coral (accent slot 1, the ansi default's lead) rather than the
 * site's near-white chrome. A near-white mark on black disappears into dark
 * browser chrome and looks like every other dark favicon in the tab strip; a
 * saturated hue is identifiable in both light and dark tab bars, and coral is
 * the colour the page's own first section heading is set in.
 */

/**
 * Below ~24px there is no room for both shapes: the cursor block lands at 2px
 * wide and reads as a stray dot. Small sizes get a bigger chevron on its own,
 * which is the part that carries the meaning.
 */
const DETAIL_THRESHOLD = 24;

/**
 * A square rotated 45° with only its top and right borders drawn. The two
 * edges join exactly at the corner, which separately-rotated bars do not.
 *
 * Its ink does *not* fill its layout box, and getting this wrong is why the
 * first version rendered small and sat right of centre. A square of side `s`
 * rotated 45° has a bounding box of `s√2`, centred on the box centre — but
 * only two of its four edges are painted, so the visible ">" occupies the
 * right half of that bounding box: horizontally from the box centre to
 * `0.707s` past it, vertically the full `1.414s`.
 *
 * So the wrapper is sized to the *ink* (0.707s × 1.414s) and the square is
 * pulled left so the ink sits flush inside it. Flex layout then centres the
 * real shape instead of an oversized empty box.
 *
 * The 0.4 pull-back is measured, not derived: geometry says 0.354s, but the
 * painted edge also carries the border's own width, and Satori's rotation
 * origin doesn't land where a browser's does. 0.4s is what actually renders
 * centred — verified against the ink bounding box at 16, 32, 48 and 180px.
 */
function Chevron({ side, stroke }: { side: number; stroke: number }) {
  const inkW = Math.round(side * 0.707);
  const inkH = Math.round(side * 1.414);

  return (
    <div style={{ display: "flex", width: inkW, height: inkH, alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          width: side,
          height: side,
          marginLeft: -Math.round(side * 0.4),
          borderTop: `${stroke}px solid ${OG_ACCENT_1}`,
          borderRight: `${stroke}px solid ${OG_ACCENT_1}`,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

export function SiteMark({ px }: { px: number }) {
  const detailed = px >= DETAIL_THRESHOLD;

  // Sized from the ink, not the box. A favicon that uses a fifth of its tile
  // reads as a speck in a tab strip — these land near a quarter, with the
  // chevron alone standing taller at small sizes since it is on its own there.
  const side = Math.round(px * (detailed ? 0.36 : 0.5));
  const stroke = Math.max(2, Math.round(px * (detailed ? 0.1 : 0.13)));

  const cursorW = Math.max(2, Math.round(px * 0.12));
  const cursorH = Math.max(4, Math.round(px * 0.34));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(px * 0.09),
      }}
    >
      <Chevron side={side} stroke={stroke} />
      {detailed && (
        <div
          style={{
            display: "flex",
            width: cursorW,
            height: cursorH,
            backgroundColor: OG_PRIMARY,
          }}
        />
      )}
    </div>
  );
}

/**
 * The tile the mark sits on. `scanlines` is for sizes where a 3px pitch is
 * actually resolvable — on a 16px favicon it is just noise that muddies the
 * chevron's edges.
 */
export function MarkTile({
  px,
  children,
  scanlines = false,
}: {
  px: number;
  children: React.ReactNode;
  scanlines?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: OG_BG,
      }}
    >
      {scanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `radial-gradient(circle at 50% 45%, ${OG_MIST}1f 0%, transparent 68%)`,
          }}
        />
      )}
      <div style={{ position: "relative", display: "flex" }}>{children}</div>
      {scanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) ${Math.max(
              1,
              Math.round(px / 60)
            )}px, transparent ${Math.max(1, Math.round(px / 60))}px, transparent ${Math.max(
              3,
              Math.round(px / 20)
            )}px)`,
          }}
        />
      )}
    </div>
  );
}
