import { ImageResponse } from "next/og";
import { loadJetBrainsMono } from "@/lib/og-fonts";
import { CrtGlow, CrtOverlay, OG_FRAME_STYLE } from "@/lib/og-crt";
import {
  OG_ACCENTS,
  OG_ACCENT_5,
  OG_BG,
  OG_BORDER,
  OG_FG,
  OG_MIST,
  OG_PRIMARY,
  STATUS_STYLE,
} from "@/lib/og-theme";
import { projects } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Project · Gaurav Raj Singh's portfolio";

/**
 * A metadata image route inside a dynamic segment does *not* inherit the
 * `generateStaticParams` on its sibling page.tsx — it needs its own, and without
 * one this route was the only part of /projects/[slug] left rendering on demand
 * (the build printed it as `ƒ /projects/-/opengraph-image` while the page itself
 * was `●` prerendered). Every social crawler that unfurled a project link paid
 * for a cold Satori render plus a font load, on the request that decides whether
 * a link preview appears at all.
 */
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/**
 * Unknown slugs 404 instead of rendering.
 *
 * The handler used to fall back to `project?.name ?? slug`, which meant
 * /projects/<anything>/opengraph-image returned a 1200x630 PNG with that
 * arbitrary text set in the site's own frame, colours and wordmark — a
 * convincing branded image, on this domain, saying whatever the URL said. The
 * page route already 404s for slugs that aren't real; its image had no reason
 * to be more generous. `false` also matches page.tsx, so the two routes now
 * agree on which slugs exist.
 */
export const dynamicParams = false;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  const fonts = await loadJetBrainsMono();

  // dynamicParams=false means only the slugs above reach this, so `project` is
  // always found; the fallbacks are belt-and-braces rather than a live path.
  const name = project?.name ?? slug;
  const tagline = project?.tagline ?? "";
  const stack = project?.stack ?? [];
  const status = project ? STATUS_STYLE[project.status] : STATUS_STYLE.ok;
  const year = project?.year ?? "";

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 21, color: OG_ACCENT_5, letterSpacing: 4 }}>
                {`~/projects/${slug}`}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: status.color,
                  border: `1px solid ${status.color}`,
                  padding: "5px 14px",
                  letterSpacing: 2,
                }}
              >
                {`[${status.label}]`}
              </div>
            </div>

            {/* Same rule as the wordmark on the home card: one colour, and the
                palette arrives through the bloom rather than through the type. */}
            <div
              style={{
                display: "flex",
                fontSize: 80,
                fontWeight: 700,
                color: OG_PRIMARY,
                letterSpacing: -1,
                marginTop: 30,
                textShadow: `0 0 26px ${OG_MIST}a6, 0 0 62px ${OG_MIST}59`,
              }}
            >
              {name}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 29,
                color: OG_FG,
                marginTop: 22,
                maxWidth: 940,
                lineHeight: 1.4,
              }}
            >
              {tagline}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 32 }}>
              {stack.map((tech, i) => (
                <div
                  key={tech}
                  style={{
                    display: "flex",
                    fontSize: 21,
                    color: OG_FG,
                    border: `1px solid ${OG_BORDER}`,
                    padding: "7px 14px",
                  }}
                >
                  <span style={{ color: OG_ACCENTS[i % OG_ACCENTS.length] }}>#</span>
                  {tech}
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
                {`gauravxsuvo/${slug}`}
                <span style={{ color: OG_MIST, marginLeft: 10 }}>_</span>
              </div>
              <div style={{ display: "flex", fontSize: 22, color: OG_BORDER }}>{year}</div>
            </div>
          </div>

          <CrtOverlay />
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
