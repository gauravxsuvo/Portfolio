export type Achievement = {
  id: string;
  label: string;
  hint: string;
};

export const ACHIEVEMENT_EVENT = "suvo:achievement";

export const ACHIEVEMENTS: Achievement[] = [
  { id: "boot", label: "typed the boot codeword", hint: "type it right, at boot" },
  { id: "konami", label: "found the old cheat code", hint: "10 keys, very old, very classic" },
  { id: "sudo", label: "tried sudo in the shell", hint: "ask the shell for root" },
  { id: "sandwich", label: "invoked xkcd #149", hint: "sudo, politely, for lunch" },
  { id: "replay", label: "replayed the boot sequence", hint: "the shell can restart the machine" },
  { id: "logo", label: "clicked the logo", hint: "the big glowing name up top" },
  { id: "status", label: "poked the status badge", hint: "footer, bottom left, [OK]" },
  { id: "root", label: "tried to sudo the nav bar", hint: "click the header prompt a few times" },
  { id: "shortcuts", label: "used a keyboard shortcut", hint: "press g, then a letter" },
  { id: "explorer", label: "unlocked every section", hint: "the shell can unlock <section>" },
  { id: "theme", label: "changed the phosphor color", hint: "there's a display panel somewhere" },
  { id: "vim", label: "got stuck in vim", hint: "the shell has editors too" },
  { id: "godmode", label: "entered the cheat code of cheat codes", hint: "iddqd" },
  { id: "party", label: "started a party", hint: "the shell knows how to have fun" },
  { id: "hireme", label: "made the ask", hint: "just say it, one word" },
  { id: "polyglot", label: "said hello in another language", hint: "안녕? こんにちは?" },
  { id: "grep", label: "grepped the portfolio", hint: "the shell can search everything" },
  { id: "tab", label: "found tab-completion", hint: "a real shell finishes your sentences" },
  {
    id: "reverse-search",
    label: "reverse-searched your history",
    hint: "the shell remembers. ctrl+something",
  },
  { id: "tree", label: "listed the whole filesystem", hint: "one command, every branch" },
  { id: "coffee", label: "brewed a coffee", hint: "the shell is also a kitchen" },
  { id: "train", label: "caught the train", hint: "fat-finger `ls` badly enough" },
  { id: "curious", label: "read the source", hint: "devtools console has something for you" },
];

const ACHIEVEMENTS_KEY = "suvo:achievements";
const SECTIONS_KEY = "suvo:sections-visited";
const ALL_SECTIONS = ["shell", "skills", "projects", "status", "publications", "changelog"];

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // storage unavailable — achievements just won't persist
  }
}

export function getUnlockedAchievements(): Set<string> {
  return readSet(ACHIEVEMENTS_KEY);
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function unlockAchievement(id: string): boolean {
  if (typeof window === "undefined") return false;
  const unlocked = readSet(ACHIEVEMENTS_KEY);
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  writeSet(ACHIEVEMENTS_KEY, unlocked);
  window.dispatchEvent(
    new CustomEvent<{ id: string; total: number; found: number }>(ACHIEVEMENT_EVENT, {
      detail: { id, total: ACHIEVEMENTS.length, found: unlocked.size },
    })
  );
  return true;
}

export function resetAchievements() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACHIEVEMENTS_KEY);
    window.localStorage.removeItem(SECTIONS_KEY);
  } catch {
    // ignore
  }
}

export function markSectionUnlocked(name: string) {
  if (typeof window === "undefined" || !ALL_SECTIONS.includes(name)) return;
  const visited = readSet(SECTIONS_KEY);
  visited.add(name);
  writeSet(SECTIONS_KEY, visited);
  if (visited.size >= ALL_SECTIONS.length) unlockAchievement("explorer");
}
