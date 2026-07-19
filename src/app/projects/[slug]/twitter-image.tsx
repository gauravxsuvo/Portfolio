import { projects } from "@/lib/data";

/**
 * Twitter's card image is the same image as the Open Graph one — same size, same
 * design — so the renderer is re-exported rather than copied into a second file
 * that would drift from it.
 *
 * The route *config*, though, has to be declared literally right here.
 * `generateStaticParams` and `dynamicParams` are read by Next's static analysis
 * of this module, not evaluated at runtime, so a `export { dynamicParams } from
 * "./opengraph-image"` is invisible to it — the build says as much ("can't
 * recognize the exported `dynamicParams` field … it may be re-exported from
 * another file") and then fails outright. Hence the small duplication below: it
 * is the only form the bundler accepts.
 */
export { size, contentType, alt } from "./opengraph-image";
export { default } from "./opengraph-image";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/** Unknown slugs 404 instead of rendering arbitrary text into a branded PNG —
 *  see the note on opengraph-image.tsx, which this route mirrors exactly. */
export const dynamicParams = false;
