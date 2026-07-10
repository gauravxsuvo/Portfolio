export type ChangelogEntry = {
  hash: string;
  date: string;
  message: string;
};

export const changelog: ChangelogEntry[] = [
  { hash: "4b53cc9", date: "2026-07-10", message: "Keep local-only notes out of version control" },
  { hash: "c6817db", date: "2026-07-10", message: "Build terminal-CLI themed portfolio site" },
  { hash: "1fd5fef", date: "2026-07-10", message: "Initial commit" },
];
