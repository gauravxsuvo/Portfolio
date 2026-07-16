import type { MetadataRoute } from "next";
import { bio } from "@/lib/data";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${bio.name} Portfolio`,
    short_name: bio.handle,
    description: `${bio.role}. Terminal-themed portfolio.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
