import { ImageResponse } from "next/og";
import { loadJetBrainsMono } from "./og-fonts";
import { bio } from "./data";
import { siteHost } from "./site";
import { getPageCard } from "./page-cards";
import { CrtGlow, CrtOverlay, OG_FRAME_STYLE } from "./og-crt";
import { OG_ACCENTS, OG_BG, OG_BORDER, OG_FG, OG_MIST, OG_PRIMARY } from "./og-theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card for an interior page.
 *
 * One renderer for all of them rather than a bespoke card per route: ten
 * hand-written layouts would drift apart the first time anyone adjusted the
 * type scale, and these pages differ only in three strings and an accent.
 *
 * Copy comes from `page-cards.ts`, which is also where the page's own title and
 * meta description come from — so the card cannot describe the page
 * differently from the page's own metadata.
 *
 * Read `og-crt.tsx` before touching the layers here; Satori fails silently on
 * most of the obvious ways to draw them.
 */
export function renderPageCard(path: string) {
  const card = getPageCard(path);
  if (!card) {
    throw new Error(
      `No PAGE_CARDS entry for "${path}". Add one in lib/page-cards.ts — the ` +
        `entry and this route's opengraph-image.tsx belong in the same commit.`
    );
  }

  const accent = OG_ACCENTS[card.accent - 1];

  // Long headings ("Accessibility", "Publications") would otherwise run into
  // the right edge at the size the short ones want to be.
  const headingSize = card.heading.length > 11 ? 82 : 96;

  return async function Image() {
    const fonts = await loadJetBrainsMono();

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: OG_BG,
            padding: 34,
            fontFamily: "JetBrains Mono",
          }}
        >
          <div style={OG_FRAME_STYLE}>
            <CrtGlow />

            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", fontSize: 22, color: accent, letterSpacing: 4 }}>
                    {`~${path}`}
                  </div>
                  {card.kind === "policy" && (
                    <div
                      style={{
                        display: "flex",
                        fontSize: 17,
                        color: OG_FG,
                        border: `1px solid ${OG_BORDER}`,
                        padding: "4px 12px",
                        letterSpacing: 3,
                      }}
                    >
                      POLICY
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", fontSize: 21, color: OG_BORDER }}>{siteHost}</div>
              </div>

              {/* One colour, palette carried by the bloom — the wordmark rule. */}
              <div
                style={{
                  display: "flex",
                  fontSize: headingSize,
                  fontWeight: 700,
                  color: OG_PRIMARY,
                  letterSpacing: -1,
                  marginTop: 30,
                  textShadow: `0 0 26px ${OG_MIST}a6, 0 0 62px ${OG_MIST}59`,
                }}
              >
                {card.heading}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: OG_FG,
                  marginTop: 24,
                  maxWidth: 930,
                  lineHeight: 1.45,
                }}
              >
                {card.blurb}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  borderTop: `1px solid ${OG_BORDER}`,
                  paddingTop: 22,
                }}
              >
                <div style={{ display: "flex", fontSize: 22, color: OG_PRIMARY, opacity: 0.75 }}>
                  {`guest@${bio.handle}:~$ `}
                  <span style={{ color: accent, marginLeft: 10 }}>{card.command}</span>
                  <span style={{ color: OG_MIST, marginLeft: 10 }}>_</span>
                </div>
                <div style={{ display: "flex", fontSize: 21, color: OG_BORDER }}>{bio.name}</div>
              </div>
            </div>

            <CrtOverlay />
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  };
}

/** Alt text, from the same registry so it can't drift from the card. */
export function pageCardAlt(path: string): string {
  const card = getPageCard(path);
  return card ? `${card.heading} · ${bio.name}` : bio.name;
}
