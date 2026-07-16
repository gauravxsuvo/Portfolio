/**
 * The one keyboard-shortcut table.
 *
 * Both the `shortcuts` shell command and the ? overlay render from this, so a
 * new binding is documented in both places at once. The bindings themselves live
 * with the components that own them (nav-shortcuts, command-palette, the shell);
 * this is the description of them, and it is only correct if kept in step.
 */

export const OPEN_SHORTCUTS_EVENT = "suvo:open-shortcuts";

export type ShortcutGroup = {
  title: string;
  items: { keys: string; label: string }[];
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "anywhere",
    items: [
      { keys: "ctrl/⌘ + k", label: "command palette" },
      { keys: "/", label: "command palette" },
      { keys: "?", label: "this cheatsheet" },
      { keys: "esc", label: "close whatever's open" },
    ],
  },
  {
    title: "jump to (press g, then the letter)",
    items: [
      { keys: "g h", label: "home" },
      { keys: "g a", label: "about" },
      { keys: "g p", label: "projects" },
      { keys: "g e", label: "experience" },
      { keys: "g r", label: "research / publications" },
      { keys: "g c", label: "contact" },
    ],
  },
  {
    title: "in the shell",
    items: [
      { keys: "↑ ↓", label: "walk history" },
      { keys: "ctrl + r", label: "search history backwards" },
      { keys: "tab", label: "complete" },
      { keys: "→", label: "accept the ghost suggestion" },
      { keys: "ctrl + l", label: "clear the screen" },
      { keys: "ctrl + u", label: "clear the line" },
      { keys: "ctrl + c", label: "abandon the line" },
    ],
  },
];
