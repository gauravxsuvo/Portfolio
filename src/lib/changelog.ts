export type ChangelogEntry = {
  hash: string;
  date: string;
  message: string;
};

// Curated, not auto-generated from git log: merge commits, README-only edits,
// and internal tooling housekeeping are filtered out on purpose — this is a
// visitor-facing "what shipped" list, not a raw commit dump.
export const changelog: ChangelogEntry[] = [
  {
    hash: "0f72c1b",
    date: "2026-07-13",
    message: "Add command palette, live backend, and shell overhaul",
  },
  {
    hash: "ac9aa76",
    date: "2026-07-13",
    message: "Add social/SEO metadata, fix homepage scroll bug and other UX issues",
  },
  {
    hash: "75a2c65",
    date: "2026-07-12",
    message: "Add live theming, publications section, and real content",
  },
  {
    hash: "1d222d7",
    date: "2026-07-11",
    message: "Add boot sequence, interactive shell, and terminal easter eggs",
  },
  { hash: "c6817db", date: "2026-07-10", message: "Build terminal-CLI themed portfolio site" },
  { hash: "1fd5fef", date: "2026-07-10", message: "Initial commit" },
];
