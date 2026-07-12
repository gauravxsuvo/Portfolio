import { ImageResponse } from "next/og";
import { loadJetBrainsMono } from "./og-fonts";
import { bio } from "./data";
import { OG_AMBER, OG_BG, OG_BORDER, OG_GREEN } from "./og-theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${bio.name} — ${bio.role}`;

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
          padding: 40,
          fontFamily: "JetBrains Mono",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            border: `2px solid ${OG_BORDER}`,
            padding: "40px 56px",
            boxShadow: `inset 0 0 160px rgba(51,255,0,0.07)`,
          }}
        >
          <div style={{ display: "flex", fontSize: 18, color: OG_GREEN, opacity: 0.5, letterSpacing: 2 }}>
            +--- GAURAV@PORTFOLIO:~$ ---+
          </div>

          <div style={{ display: "flex", fontSize: 22, color: OG_GREEN, opacity: 0.55, marginTop: 24 }}>
            guest@gauravxsuvo:~$ whoami
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: OG_GREEN, marginTop: 6 }}>
            {bio.name}
          </div>

          <div style={{ display: "flex", fontSize: 22, color: OG_GREEN, opacity: 0.55, marginTop: 28 }}>
            guest@gauravxsuvo:~$ cat role.txt
          </div>
          <div style={{ display: "flex", fontSize: 24, color: OG_AMBER, marginTop: 4 }}>
            {"> "}
            {bio.role}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: OG_GREEN, opacity: 0.6, marginTop: 2 }}>
            {"> "}
            {bio.location}
          </div>

          <div style={{ display: "flex", fontSize: 22, color: OG_GREEN, opacity: 0.55, marginTop: 28 }}>
            guest@gauravxsuvo:~$ ls focus/
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {bio.focus.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: OG_GREEN,
                  opacity: 0.85,
                  border: `1px solid ${OG_BORDER}`,
                  padding: "5px 12px",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", fontSize: 20, color: OG_GREEN, opacity: 0.7, marginTop: "auto" }}>
            guest@gauravxsuvo:~$ _
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            color: OG_GREEN,
            opacity: 0.35,
            marginTop: 14,
          }}
        >
          <div style={{ display: "flex" }}>~/portfolio</div>
          <div style={{ display: "flex" }}>{bio.handle}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
