import { ImageResponse } from "next/og";
import { loadJetBrainsMono } from "./og-fonts";
import { bio } from "./data";
import { CrtGlow, CrtOverlay, OG_FRAME_STYLE } from "./og-crt";
import {
  OG_ACCENTS,
  OG_ACCENT_3,
  OG_BG,
  OG_BORDER,
  OG_FG,
  OG_MIST,
  OG_PRIMARY,
} from "./og-theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${bio.name}, ${bio.role}`;

/**
 * The site's front page, compressed to a card.
 *
 * It mirrors the real hero — status badge, wordmark, summary, focus tags,
 * prompt — rather than inventing a layout, so the preview and the page read as
 * the same object.
 *
 * Two things drive the type sizes. A social card is almost never seen at
 * 1200x630: in a feed it lands around 500px wide, so everything here is sized
 * to survive being scaled to ~40%. And the wordmark is the only element
 * allowed to be loud — the previous version set the name in magenta and
 * repeated `guest@gauravxsuvo:~$` three times, which at feed size collapsed
 * into an illegible smear of prompts with one bright pink line through it.
 */
export default async function renderBanner() {
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

          {/* Everything below sits above the glow and under the scanlines. */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 12, height: 12, backgroundColor: OG_ACCENT_3 }} />
                <div style={{ display: "flex", fontSize: 22, color: OG_ACCENT_3, letterSpacing: 6 }}>
                  [ SYSTEM ONLINE ]
                </div>
              </div>
              <div style={{ display: "flex", fontSize: 20, color: OG_BORDER }}>~/portfolio</div>
            </div>

            {/* The wordmark: one colour, palette carried by the bloom — the
                same rule the hero follows on the site. */}
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                color: OG_PRIMARY,
                letterSpacing: -1,
                marginTop: 26,
                textShadow: `0 0 26px ${OG_MIST}a6, 0 0 62px ${OG_MIST}59`,
              }}
            >
              {bio.name}
              <span style={{ color: OG_MIST }}>_</span>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 25,
                color: OG_FG,
                marginTop: 20,
                maxWidth: 880,
                lineHeight: 1.45,
              }}
            >
              {bio.summary}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
              {bio.focus.map((tag, i) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    fontSize: 20,
                    color: OG_FG,
                    border: `1px solid ${OG_BORDER}`,
                    padding: "7px 14px",
                  }}
                >
                  <span style={{ color: OG_ACCENTS[i % OG_ACCENTS.length] }}>#</span>
                  {tag.replace(/\s+/g, "-")}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", fontSize: 22, color: OG_PRIMARY, opacity: 0.75 }}>
                guest@{bio.handle}:~$
                <span style={{ color: OG_MIST, marginLeft: 10 }}>_</span>
              </div>
              <div style={{ display: "flex", fontSize: 22, color: OG_BORDER }}>mysuvo.com</div>
            </div>
          </div>

          <CrtOverlay />
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
