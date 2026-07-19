import { ImageResponse } from "next/og";
import { loadJetBrainsMono } from "@/lib/og-fonts";
import { OG_BG, OG_BORDER, OG_GREEN, STATUS_STYLE } from "@/lib/og-theme";
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
            padding: "44px 56px",
            boxShadow: `inset 0 0 160px rgba(51,255,0,0.07)`,
          }}
        >
          <div style={{ display: "flex", fontSize: 18, color: OG_GREEN, opacity: 0.5, letterSpacing: 2 }}>
            {`+--- PROJECT / ${slug} ---+`}
          </div>

          <div style={{ display: "flex", fontSize: 22, color: OG_GREEN, opacity: 0.55, marginTop: 30 }}>
            {`guest@gauravxsuvo:~$ cat projects/${slug}/README.md`}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26 }}>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: OG_GREEN }}>{name}</div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: status.color,
                border: `1px solid ${status.color}`,
                padding: "4px 12px",
                letterSpacing: 2,
              }}
            >
              {`[${status.label}]`}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 26, color: OG_GREEN, opacity: 0.75, marginTop: 14 }}>
            {tagline}
          </div>

          <div style={{ display: "flex", fontSize: 20, color: OG_GREEN, opacity: 0.45, marginTop: 36 }}>
            stack:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {stack.map((tech) => (
              <div
                key={tech}
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: OG_GREEN,
                  opacity: 0.85,
                  border: `1px solid ${OG_BORDER}`,
                  padding: "5px 12px",
                }}
              >
                {tech}
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
          <div style={{ display: "flex" }}>{`gauravxsuvo/${slug}`}</div>
          <div style={{ display: "flex" }}>{year}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
