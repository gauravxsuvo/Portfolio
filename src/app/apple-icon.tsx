import { ImageResponse } from "next/og";
import { OG_BG, OG_GREEN } from "@/lib/og-theme";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            fontSize: 104,
          }}
        >
          {">_"}
        </div>
      </div>
    ),
    { ...size }
  );
}
