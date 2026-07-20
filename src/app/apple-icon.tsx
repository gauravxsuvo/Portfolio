import { ImageResponse } from "next/og";
import { MarkTile, SiteMark } from "@/lib/og-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      // At 180px there is room for the tube: a phosphor glow behind the mark
      // and a resolvable scanline pitch, so the home-screen icon reads as a
      // small CRT rather than as a flat glyph on black.
      <MarkTile px={size.width} scanlines>
        <SiteMark px={size.width} />
      </MarkTile>
    ),
    { ...size }
  );
}
