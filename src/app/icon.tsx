import { ImageResponse } from "next/og";
import { MarkTile, SiteMark } from "@/lib/og-mark";

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
      // No scanlines at favicon sizes: a 3px pitch in a 16px box is noise that
      // eats the chevron's edges rather than texture anyone can resolve.
      <MarkTile px={px}>
        <SiteMark px={px} />
      </MarkTile>
    ),
    { width: px, height: px }
  );
}
