export type Achievement = {
  id: string;
  label: string;
  hint: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "boot", label: "typed the boot codeword", hint: "type it right, at boot" },
  { id: "konami", label: "found the old cheat code", hint: "10 keys, very old, very classic" },
  { id: "sudo", label: "tried sudo in the shell", hint: "ask the shell for root" },
  { id: "replay", label: "replayed the boot sequence", hint: "the shell can restart the machine" },
  { id: "logo", label: "clicked the logo", hint: "the big ascii letters up top" },
  { id: "status", label: "poked the status badge", hint: "footer, bottom left, [OK]" },
  { id: "root", label: "tried to sudo the nav bar", hint: "click the header prompt a few times" },
  { id: "shortcuts", label: "used a keyboard shortcut", hint: "press g, then a letter" },
  { id: "explorer", label: "unlocked every section", hint: "the shell can unlock <section>" },
];

const ACHIEVEMENTS_KEY = "suvo:achievements";
const SECTIONS_KEY = "suvo:sections-visited";
const ALL_SECTIONS = ["shell", "skills", "projects", "status", "changelog"];

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function getUnlockedAchievements(): Set<string> {
  return readSet(ACHIEVEMENTS_KEY);
}

export function unlockAchievement(id: string): boolean {
  if (typeof window === "undefined") return false;
  const unlocked = readSet(ACHIEVEMENTS_KEY);
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked]));
  window.dispatchEvent(new CustomEvent("suvo:achievement", { detail: id }));
  return true;
}

export function markSectionUnlocked(name: string) {
  if (typeof window === "undefined" || !ALL_SECTIONS.includes(name)) return;
  const visited = readSet(SECTIONS_KEY);
  visited.add(name);
  window.localStorage.setItem(SECTIONS_KEY, JSON.stringify([...visited]));
  if (visited.size >= ALL_SECTIONS.length) unlockAchievement("explorer");
}
