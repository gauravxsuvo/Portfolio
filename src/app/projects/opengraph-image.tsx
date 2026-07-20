import { pageCardAlt, renderPageCard, size, contentType } from "@/lib/og-page";

// Copy, colour and alt text all come from this path's entry in
// lib/page-cards.ts — see lib/og-page.tsx.
const PATH = "/projects";

export { size, contentType };
export const alt = pageCardAlt(PATH);
export default renderPageCard(PATH);
