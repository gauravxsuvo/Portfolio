import { ImageResponse } from "next/og";
import { OG_BG, OG_GREEN } from "@/lib/og-theme";

const SIZES = [16, 32, 48] as const;

export function generateImageMetadata() {
  return SIZES.map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType: "image/png" as const,
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const px = Number(await id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: OG_BG,
        }}
      >
        <div
          style={{
            display: "flex",
            color: OG_GREEN,
            fontWeight: 700,
            fontSize: Math.round(px * 0.58),
          }}
        >
          {">_"}
        </div>
      </div>
    ),
    { width: px, height: px }
  );
}
