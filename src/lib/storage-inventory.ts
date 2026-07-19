/**
 * The single source of truth for everything this site stores on a visitor's
 * device.
 *
 * /privacy and /cookies both render from this list. That's the whole point: two
 * pages hand-maintaining the same inventory is the same bug as the email
 * address that was copy-pasted into four files and drifted in one — except here
 * the drifted copy is a false statement in a legal document rather than a dead
 * mailto link.
 *
 * **If you add a localStorage key or a cookie anywhere in this codebase, add it
 * here in the same change.** Both policy pages update themselves from it.
 */

export type StorageKind = "local-storage" | "cookie";

export type StorageEntry = {
  key: string;
  kind: StorageKind;
  /** What it's for, in plain language — this text is shown to visitors. */
  purpose: string;
  /**
   * Consent categories, in the sense the ePrivacy Directive uses them:
   *  - "necessary" needs no consent (the site cannot work without it, or it
   *    exists solely to record a choice the visitor made).
   *  - "analytics" needs prior opt-in, and must not be written before it.
   */
  category: "necessary" | "analytics";
  /** Roughly how long it survives, in visitor-facing words. */
  retention: string;
};

export const STORAGE_INVENTORY: StorageEntry[] = [
  {
    key: "suvo:analytics-consent",
    kind: "local-storage",
    purpose:
      "your answer to the analytics prompt. The only thing written before you choose anything — without it the prompt couldn't remember your answer and would nag you on every visit",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:visitor-id",
    kind: "local-storage",
    purpose:
      "a random ID identifying this browser, so a return visit isn't counted as a new person. Not linked to your name, email, or anything you do elsewhere",
    category: "analytics",
    retention: "until you clear site data or decline",
  },
  {
    key: "suvo:session",
    kind: "local-storage",
    purpose: "a random ID grouping one visit together",
    category: "analytics",
    retention: "30 minutes idle",
  },
  {
    key: "suvo:theme-primary",
    kind: "local-storage",
    purpose: "the phosphor color you picked in display settings",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:theme-mode",
    kind: "local-storage",
    purpose: "which display mode you chose: retro (colorful) or mono (one phosphor color)",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:retro-template",
    kind: "local-storage",
    purpose: "which of the four retro palettes you picked in display settings",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:crt-enabled",
    kind: "local-storage",
    purpose: "whether the scanline overlay is on",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:booted",
    kind: "local-storage",
    purpose: "whether you've seen the boot sequence, so it doesn't replay every visit",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:achievements",
    kind: "local-storage",
    purpose: "which of the site's hidden easter eggs you've found",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:sections-visited",
    kind: "local-storage",
    purpose: "which homepage sections you've scrolled to, for one achievement",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:shell-history",
    kind: "local-storage",
    purpose: "commands you've typed into the shell, so ↑ and ctrl+r work",
    category: "necessary",
    retention: "until you clear site data, or `history -c`",
  },
  {
    key: "suvo:snake-best",
    kind: "local-storage",
    purpose:
      "your best score in the shell's hidden game, so it survives a reload. A single number — nothing about how or when you played",
    category: "necessary",
    retention: "until you clear site data",
  },
  {
    key: "suvo:typetest-best",
    kind: "local-storage",
    purpose:
      "your best speed in the shell's typing test, so it survives a reload. A single number — nothing about what or when you typed",
    category: "necessary",
    retention: "until you clear site data",
  },
  // No cookie entry, and that is not an omission: this site sets no cookies at
  // all, for anyone. The admin login used to set one; it now holds its token in
  // memory only (see analytics/auth.ts), so it dies with the tab and never
  // touches storage. cookieEntries below is therefore empty, and /cookies
  // renders "none" from it rather than from a hardcoded claim — if a cookie is
  // ever added here, that page stops saying "none" on its own.
];

export const localStorageEntries = STORAGE_INVENTORY.filter((e) => e.kind === "local-storage");
export const cookieEntries = STORAGE_INVENTORY.filter((e) => e.kind === "cookie");
export const analyticsEntries = STORAGE_INVENTORY.filter((e) => e.category === "analytics");
export const necessaryEntries = STORAGE_INVENTORY.filter((e) => e.category === "necessary");
