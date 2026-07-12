import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Full-ASCII-printable subset, fetched once at repo-setup time (see commit
// history) rather than over the network on every build — see the "Using
// Node.js runtime with local assets" pattern in the Next.js opengraph-image
// docs. Reused across every generated image/icon in the site.
export async function loadJetBrainsMono() {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-400.woff")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-700.woff")),
  ]);
  return [
    { name: "JetBrains Mono", data: regular, style: "normal" as const, weight: 400 as const },
    { name: "JetBrains Mono", data: bold, style: "normal" as const, weight: 700 as const },
  ];
}
