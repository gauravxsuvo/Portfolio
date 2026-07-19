"use client";

import type { ReactNode } from "react";
import type { useRouter } from "next/navigation";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { TopMonitor } from "@/components/top-monitor";
import { SnakeGame } from "@/components/snake-game";
import { TypingTest } from "@/components/typing-test";
import { bio, experience, projects, publications, skillGroups } from "@/lib/data";
import { siteHost } from "@/lib/site";
import { scrollToElement } from "@/lib/scroll";
import { PRESETS, hslToHex, normalizeHex } from "@/lib/color";
import {
  OPEN_THEME_PANEL_EVENT,
  applyThemeColor,
  applyThemeMode,
  getComputedPrimaryHex,
  readStoredThemeColor,
  resolveThemeMode,
  setRetroTemplate,
  setThemeColor,
  setThemeMode,
} from "@/lib/theme";
import {
  DEFAULT_RETRO_TEMPLATE,
  RETRO_TEMPLATES,
  isRetroTemplateId,
} from "@/lib/retro-templates";
import { TRIGGER_MATRIX_EVENT } from "@/components/konami-listener";
import { SHORTCUT_GROUPS } from "@/lib/shortcuts";
import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  markSectionUnlocked,
  resetAchievements,
  unlockAchievement,
} from "@/lib/achievements";

export type Router = ReturnType<typeof useRouter>;

export type CommandContext = {
  /** Everything after the command name, verbatim. */
  arg: string;
  /** The full line as typed. */
  raw: string;
  /** Commands run earlier this session, oldest first. */
  history: string[];
  router: Router;
  /**
   * Text piped in from the previous stage of a pipeline, or null when this
   * command starts the line. A command that reads this is a pipe *sink*: `grep`,
   * `wc` and `cowsay` all behave differently when something is feeding them.
   */
  stdin?: string | null;
};

export type Command = {
  name: string;
  aliases?: string[];
  /** Shown in `help`. Omit to keep a command hidden — that's how the eggs stay eggs. */
  desc?: string;
  usage?: string;
  run: (ctx: CommandContext) => ReactNode | Promise<ReactNode>;
  /**
   * The command's output as plain text, for when it feeds a pipe.
   *
   * `run` returns JSX, which is the right shape for the scrollback and the wrong
   * shape for `| wc -l`. Rather than try to flatten rendered React back into a
   * string, a command that makes sense as a pipe source states its text form
   * here. Commands without one simply can't be piped *from*, and say so — which
   * is the honest answer for `theme` or `party`, whose output is an effect
   * rather than text.
   */
  text?: (ctx: CommandContext) => string;
};

export const ROUTES: Record<string, string> = {
  "~": "/",
  home: "/",
  about: "/about",
  projects: "/projects",
  experience: "/experience",
  publications: "/publications",
  research: "/publications",
  contact: "/contact",
  privacy: "/privacy",
  cookies: "/cookies",
  terms: "/terms",
  security: "/security",
  accessibility: "/accessibility",
  a11y: "/accessibility",
};

const SECTION_IDS: Record<string, string> = {
  shell: "section-shell",
  skills: "section-skills",
  projects: "section-projects",
  status: "section-status",
  neofetch: "section-status",
  publications: "section-publications",
  changelog: "section-changelog",
  log: "section-changelog",
};

/** What `ls` shows: the routes worth visiting, not every alias in ROUTES. */
const LISTED_ROUTES = ["about", "projects", "experience", "publications", "contact"];

const JOKES = [
  "there are 10 kinds of people: those who understand binary, and those who don't.",
  'a SQL query walks into a bar, walks up to two tables and asks, "can I join you?"',
  "!false. it's funny because it's true.",
  "why do programmers prefer dark mode? because light attracts bugs.",
  "i'd tell you a UDP joke, but you might not get it.",
  "there are two hard things in CS: cache invalidation, naming things, and off-by-one errors.",
  "a byte walks into a bar looking miserable. bartender asks: what's wrong? byte says: parity error. bartender: yeah, i thought you looked a bit off.",
  "my code doesn't have bugs. it just develops random unexpected features.",
];

/**
 * Long-form man pages. Only for commands whose one-line `desc` genuinely leaves
 * something out — everything else is generated from the registry by `man` below,
 * so a new command is documented the moment it's added rather than whenever
 * someone remembers to write a page for it. (This table used to be the whole of
 * `man`: 8 entries against ~50 commands, so `man help` said "No manual entry".)
 */
const MAN_PAGES: Record<string, string> = {
  cd: "change directory. accepts any route name, with or without a leading slash. bare route names work on their own too, so `about` and `cd about` do the same thing.",
  theme:
    "control the display. there are four retro palettes — ansi, synthwave, arcade, vaporwave — and naming one selects it. `theme mono` switches to the single-phosphor look, where a preset id or #rrggbb hex sets the colour (and implies mono). `reset` returns to the default palette. with no argument it opens the display panel.",
  lolcat:
    "paint text in a diagonal rainbow, the way the real lolcat does. works best fed by a pipe: `banner | lolcat`, `cowsay moo | lolcat`, `tree | lolcat` if you're feeling brave.",
  typetest:
    "a typing speed test. the clock starts on your first keystroke and stops when the sentence is done; gross wpm is characters over five per minute, and accuracy counts every miss even if you backspace it away. your best run is kept on this device.",
  sudo: "attempt to run a command as root. permission will be denied. every time.",
  cat: "print a file. try `tree` to see what exists.",
  stats:
    "fetch live repo stats from the GitHub API. proxied and cached server-side for an hour, so it costs the site's rate limit rather than yours.",
  unlock:
    "scroll to a homepage section and mark it visited. unlocking all six earns an achievement.",
  man: "print the manual for a command. with no argument, lists every documented topic.",
  top: "a simulated process monitor. refreshes live for a few seconds, then freezes on a snapshot — run it again to refresh. the processes are a wink at what this portfolio is about, not a real task list.",
  history:
    "list commands you've run. history persists across reloads and routes; `history -c` wipes it. ctrl+r searches it backwards.",
  wc: "count lines, words and characters. reads a pipe rather than a file — `tree | wc`, `cat skills.txt | wc`.",
  snake: "the game. click or tab onto the board to give it the keyboard, then arrows or wasd to steer; walls and your own tail are fatal. q hands the keyboard back to the shell. your best score is kept on this device.",
  grep: "search projects, publications, skills and experience. multiple words are ANDed and need not be adjacent, so `multi-agent systems` matches a group containing both words. fed by a pipe it filters those lines instead: `tree | grep projects`.",
  cowsay: "make a cow say something. takes an argument, or whatever is piped into it — `joke | cowsay`.",
};

function Err({ children }: { children: ReactNode }) {
  return <p className="text-error">{children}</p>;
}
function Dim({ children }: { children: ReactNode }) {
  return <p className="text-fg/60">{children}</p>;
}
function Out({ children }: { children: ReactNode }) {
  return <div className="text-fg/75">{children}</div>;
}

function scrollAndFlourish(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return false;
  scrollToElement(el, { block: "start" });
  el.classList.add("power-on");
  setTimeout(() => el.classList.remove("power-on"), 750);
  return true;
}

function formatUptime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

const SESSION_START = Date.now();

function randomJoke(): string {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

function uptimeLine(): string {
  return `up ${formatUptime(Math.floor((Date.now() - SESSION_START) / 1000))} this session`;
}

const BANNER_ART = `================================
   ${bio.name.toUpperCase()}
================================`;

const UNAME = "SuvoOS 3.1 (portfolio-edition) x86_64 GNU/React";

function navigate(router: Router, path: string): ReactNode {
  router.push(path);
  return <Dim>navigating to {path === "/" ? "~" : `~${path}`} ...</Dim>;
}

/* ------------------------------------------------------------------ search */

type Hit = { kind: string; title: string; detail: string; href?: string };

function search(term: string): Hit[] {
  // Word-AND rather than a single contiguous substring: a query like "multi-agent
  // systems" should hit the "AI Systems" skill group (which contains both words,
  // just not adjacent), not report zero results because nothing happens to
  // contain that exact three-word phrase.
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const hits: Hit[] = [];
  if (words.length === 0) return hits;
  const matchesAll = (haystack: string) => words.every((w) => haystack.includes(w));

  for (const p of projects) {
    const haystack = `${p.name} ${p.tagline} ${p.description} ${p.stack.join(" ")}`.toLowerCase();
    if (matchesAll(haystack)) {
      hits.push({
        kind: "project",
        title: p.name,
        detail: p.tagline,
        href: `/projects/${p.slug}`,
      });
    }
  }
  for (const p of publications) {
    const haystack = `${p.title} ${p.abstract} ${(p.tags ?? []).join(" ")} ${p.venue}`.toLowerCase();
    if (matchesAll(haystack)) {
      hits.push({
        kind: "publication",
        title: p.title,
        detail: `${p.venue} · ${p.year}`,
        href: "/publications",
      });
    }
  }
  for (const g of skillGroups) {
    const haystack = `${g.category} ${g.items.join(" ")}`.toLowerCase();
    if (matchesAll(haystack)) {
      const matchedItems = g.items.filter((i) =>
        words.some((w) => i.toLowerCase().includes(w))
      );
      hits.push({
        kind: "skill",
        title: g.category,
        detail: matchedItems.length ? matchedItems.join(", ") : g.items.join(", "),
        href: "/about",
      });
    }
  }
  for (const e of experience) {
    const haystack = `${e.role} ${e.org} ${e.summary} ${e.highlights.join(" ")}`.toLowerCase();
    if (matchesAll(haystack)) {
      hits.push({
        kind: "experience",
        title: `${e.role}, ${e.org}`,
        detail: e.period,
        href: "/experience",
      });
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ cowsay */

const COW_WIDTH = 40;

/**
 * Greedy word wrap. Words longer than the column (a URL, say) are hard-split
 * rather than allowed to blow the bubble open.
 */
function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
      continue;
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

/**
 * The cow, with a bubble that actually fits its text.
 *
 * The single-line form used to hard-truncate at 40 characters, which was
 * invisible while `cowsay` only ever took a short argument — and then `joke |
 * cowsay` made it the default path, so the flagship pipe demo printed jokes cut
 * off mid-word ("...looking miserabl >"). Real cowsay wraps and switches to the
 * multi-line bubble, so this does too: `< >` for one line, `/ \` `| |` `\ /`
 * for several, every line padded to a common width so the right-hand border
 * lines up.
 */
function cowsay(message: string): string {
  const lines = wrapWords(message, COW_WIDTH);
  const width = Math.max(...lines.map((l) => l.length));
  const top = ` ${"_".repeat(width + 2)}`;
  const bottom = ` ${"-".repeat(width + 2)}`;

  const body =
    lines.length === 1
      ? `< ${lines[0].padEnd(width)} >`
      : lines
          .map((line, i) => {
            const [open, close] =
              i === 0 ? ["/", "\\"] : i === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
            return `${open} ${line.padEnd(width)} ${close}`;
          })
          .join("\n");

  return `${top}
${body}
${bottom}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`;
}

/* ------------------------------------------------------------------ lolcat */

/**
 * Per-character rainbow, diagonal across lines like the real thing. Static
 * color, no animation — it's a paint job, not a strobe — so it needs no
 * reduced-motion handling. Spaces keep their default color: styling them is
 * invisible and would triple the span count for nothing.
 */
function Lolcat({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap text-xs sm:text-sm">
      {text.split("\n").map((line, y) => (
        <span key={y}>
          {[...line].map((ch, x) =>
            ch === " " ? (
              " "
            ) : (
              <span key={x} style={{ color: `hsl(${(x * 9 + y * 24) % 360} 95% 62%)` }}>
                {ch}
              </span>
            )
          )}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

/** `wc`'s three numbers, shared by its rendered and piped forms. */
function countText(input: string): { lines: number; words: number; chars: number } {
  return {
    lines: input === "" ? 0 : input.split("\n").length,
    words: input.split(/\s+/).filter(Boolean).length,
    chars: input.length,
  };
}

/** Line filter for `grep` when it's reading a pipe rather than the site data. */
function grepLines(input: string, term: string): string[] {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return input
    .split("\n")
    .filter((line) => words.every((w) => line.toLowerCase().includes(w)));
}

/* -------------------------------------------------------------------- files */

/**
 * Each file carries both forms of itself: `render` for the scrollback, `text`
 * for `cat x | wc -l`. They live in one entry rather than two parallel tables
 * precisely so a file can't be edited in one and forgotten in the other — the
 * same reasoning as the bio object and the storage inventory.
 */
type ShellFile = { render: () => ReactNode; text: () => string };

const FILES: Record<string, ShellFile> = {
  "about.txt": {
    render: () => <Out>{bio.summary}</Out>,
    text: () => bio.summary,
  },
  "contact.txt": {
    render: () => (
      <Out>
        <p>email: {bio.email}</p>
        <p>github: {bio.github}</p>
        <p>linkedin: {bio.linkedin}</p>
        <p>orcid: {bio.orcid}</p>
      </Out>
    ),
    text: () =>
      [
        `email: ${bio.email}`,
        `github: ${bio.github}`,
        `linkedin: ${bio.linkedin}`,
        `orcid: ${bio.orcid}`,
      ].join("\n"),
  },
  "skills.txt": {
    render: () => (
      <Out>
        {skillGroups.map((g) => (
          <p key={g.category}>
            <span className="text-secondary">{g.category}:</span> {g.items.join(", ")}
          </p>
        ))}
      </Out>
    ),
    text: () => skillGroups.map((g) => `${g.category}: ${g.items.join(", ")}`).join("\n"),
  },
  "education.txt": {
    render: () => <Out>education lives on ~/about. try `cd about`.</Out>,
    text: () => "education lives on ~/about. try `cd about`.",
  },
  ".secret": {
    render: () => (
      <Out>
        <p className="text-secondary">you weren&apos;t supposed to find this.</p>
        <p>ok fine: the boot codeword is `suvo init`, and `iddqd` still works.</p>
      </Out>
    ),
    text: () =>
      "you weren't supposed to find this.\nok fine: the boot codeword is `suvo init`, and `iddqd` still works.",
  },
};

/** Shared by `cat`'s two forms so they resolve the same name the same way. */
function resolveFile(arg: string): ShellFile | undefined {
  const name = arg.trim().toLowerCase();
  if (!name) return undefined;
  return FILES[name] ?? FILES[name.replace(/^.*\//, "")];
}

const TREE = String.raw`~/
├── about/
│   ├── about.txt
│   ├── skills.txt
│   └── education.txt
├── projects/
${projects.map((p, i, a) => `│   ${i === a.length - 1 ? "└──" : "├──"} ${p.slug}/`).join("\n")}
├── experience/
├── publications/
├── contact/
│   └── contact.txt
├── privacy/
├── cookies/
├── terms/
├── security/
├── accessibility/
└── .secret`;

/* ----------------------------------------------------------------- registry */

export const COMMANDS: Command[] = [
  {
    name: "help",
    desc: "show this help",
    run: () => (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {COMMANDS.filter((c) => c.desc).map((c) => (
          <div key={c.name} className="contents">
            <dt className="whitespace-nowrap text-secondary">{c.usage ?? c.name}</dt>
            <dd className="text-fg/70">{c.desc}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="whitespace-nowrap text-secondary">a | b</dt>
          <dd className="text-fg/70">
            pipe one into the next — try{" "}
            <span className="text-secondary">joke | cowsay</span> or{" "}
            <span className="text-secondary">tree | wc</span>
          </dd>
        </div>
        <div className="contents">
          <dt className="text-fg/40">…</dt>
          <dd className="text-fg/40">
            and a few that aren&apos;t listed. try <span className="text-secondary">achievements</span>.
          </dd>
        </div>
      </dl>
    ),
  },
  {
    name: "whoami",
    desc: "print identity",
    run: () => (
      <Out>
        <p>
          {bio.name}, {bio.role}
        </p>
        <p>{bio.location}</p>
        <p>{bio.focus.join(", ")}</p>
      </Out>
    ),
    text: () => [`${bio.name}, ${bio.role}`, bio.location, bio.focus.join(", ")].join("\n"),
  },
  {
    name: "ls",
    desc: "list routes",
    run: () => (
      <p className="text-fg/70">
        {LISTED_ROUTES.join(" ")} <span className="text-fg/40">(cd &lt;name&gt;)</span>
      </p>
    ),
    // One per line when piped, the way real `ls` switches to a single column the
    // moment its output isn't a terminal — which is what makes `ls | wc -l`
    // answer "how many routes" rather than "1".
    text: () => LISTED_ROUTES.join("\n"),
  },
  {
    name: "cd",
    usage: "cd <route>",
    desc: "navigate to a route (or just type its name)",
    run: ({ arg, router }) => {
      const target = arg.trim().toLowerCase().replace(/^\/+/, "");
      const path = ROUTES[target || "~"];
      if (path) return navigate(router, path);
      return <Err>bash: cd: {arg || "~"}: no such file or directory</Err>;
    },
  },
  {
    name: "tree",
    desc: "print the site as a directory tree",
    run: () => {
      unlockAchievement("tree");
      return <pre className="text-xs text-fg/70 sm:text-sm">{TREE}</pre>;
    },
    text: () => TREE,
  },
  {
    name: "cat",
    usage: "cat <file>",
    desc: "print a file (see `tree`)",
    run: ({ arg }) => {
      if (!arg.trim()) return <Err>cat: missing operand. try `tree` to see what exists.</Err>;
      const file = resolveFile(arg);
      if (!file) return <Err>cat: {arg}: No such file or directory</Err>;
      return file.render();
    },
    text: ({ arg }) => resolveFile(arg)?.text() ?? "",
  },
  {
    name: "grep",
    usage: "grep <term>",
    desc: "search projects, papers, skills & experience",
    run: ({ arg, router, stdin }) => {
      const term = arg.trim();
      if (!term) return <Err>usage: grep &lt;term&gt;</Err>;
      unlockAchievement("grep");

      // Fed by a pipe, grep filters those lines instead of searching the site —
      // the same command doing the same job on whatever it was handed, which is
      // the whole point of a pipeline. `tree | grep projects` reads exactly the
      // way it does in a real shell.
      if (typeof stdin === "string") {
        const matched = grepLines(stdin, term);
        if (matched.length === 0) return <Dim>no matching lines.</Dim>;
        return (
          <pre className="whitespace-pre-wrap text-xs text-fg/75 sm:text-sm">
            {matched.join("\n")}
          </pre>
        );
      }

      const hits = search(term);
      if (hits.length === 0) {
        return <Dim>no matches for &quot;{term}&quot;.</Dim>;
      }
      return (
        <div>
          <p className="text-secondary">
            {hits.length} match{hits.length === 1 ? "" : "es"} for &quot;{term}&quot;
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {hits.map((hit, i) => (
              <li key={i} className="text-fg/75">
                <span className="text-fg/40">{hit.kind}/</span>
                {hit.href ? (
                  <button
                    type="button"
                    onClick={() => router.push(hit.href!)}
                    className="text-primary underline decoration-border underline-offset-2 hover:text-glow"
                  >
                    {hit.title}
                  </button>
                ) : (
                  <span className="text-primary">{hit.title}</span>
                )}
                <span className="block pl-4 text-xs text-fg/50">{hit.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    },
  },
  {
    name: "stats",
    aliases: ["gh"],
    desc: "live repo stats from the GitHub API",
    run: async () => {
      try {
        const res = await fetch("/api/github", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          ok: boolean;
          repos: { name: string; stars: number; language: string | null; pushedAt: string | null }[];
          note?: string;
        };
        if (!data.repos?.length) {
          return <Dim>{data.note ?? "no repo data available right now."}</Dim>;
        }
        return (
          <div>
            <dl className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-0.5 text-xs sm:text-sm">
              {data.repos.map((r) => (
                <div key={r.name} className="contents">
                  <dt className="text-primary">{r.name}</dt>
                  <dd className="tabular-nums text-secondary">★ {r.stars}</dd>
                  <dd className="truncate text-fg/50">
                    {r.language ?? "n/a"}
                    {r.pushedAt
                      ? ` · pushed ${new Date(r.pushedAt).toLocaleDateString()}`
                      : ""}
                  </dd>
                </div>
              ))}
            </dl>
            {data.note && <p className="mt-1 text-xs text-fg/40">{data.note}</p>}
          </div>
        );
      } catch {
        return <Err>stats: could not reach the GitHub API. try again in a bit.</Err>;
      }
    },
  },
  {
    name: "neofetch",
    desc: "show system info",
    run: () => <NeofetchPanel />,
  },
  {
    name: "top",
    aliases: ["htop", "ps"],
    desc: "live process monitor",
    run: () => <TopMonitor />,
  },
  {
    name: "snake",
    aliases: ["play"],
    desc: "play snake, right here in the scrollback",
    run: () => <SnakeGame />,
  },
  {
    name: "typetest",
    aliases: ["wpm", "typing"],
    desc: "how fast can you type?",
    run: () => <TypingTest />,
  },
  {
    name: "lolcat",
    usage: "<cmd> | lolcat",
    desc: "rainbow whatever flows through it",
    run: ({ arg, stdin }) => {
      const input = typeof stdin === "string" ? stdin : arg.trim();
      if (!input) {
        return (
          <Err>
            lolcat: nothing to color. try `banner | lolcat` or `cowsay moo | lolcat`.
          </Err>
        );
      }
      unlockAchievement("lolcat");
      return <Lolcat text={input} />;
    },
    // Identity as a pipe stage, so `joke | lolcat | cowsay` still flows — the
    // color is a rendering concern and text has none.
    text: ({ arg, stdin }) => (typeof stdin === "string" ? stdin : arg.trim()),
  },
  {
    name: "theme",
    usage: "theme [preset]",
    desc: "change phosphor color, or open the display panel",
    run: ({ arg }) => {
      const target = arg.trim().toLowerCase();
      if (!target) {
        window.dispatchEvent(new Event(OPEN_THEME_PANEL_EVENT));
        return <Dim>opening display settings...</Dim>;
      }
      // A palette name picks that palette and implies retro.
      if (isRetroTemplateId(target)) {
        setRetroTemplate(target);
        unlockAchievement("theme");
        return <p className="text-primary">[ OK ] retro palette set to {target}.</p>;
      }
      if (target === "retro") {
        setThemeMode("retro");
        unlockAchievement("theme");
        return (
          <p className="text-primary">
            [ OK ] retro mode. pick a palette with{" "}
            <span className="text-secondary">
              theme {RETRO_TEMPLATES.map((t) => t.id).join("|")}
            </span>
            .
          </p>
        );
      }
      if (target === "mono") {
        setThemeMode("mono");
        unlockAchievement("theme");
        return <p className="text-primary">[ OK ] mono mode (single phosphor).</p>;
      }
      if (target === "reset") {
        // Site default is retro on the default palette — not green mono.
        setRetroTemplate(DEFAULT_RETRO_TEMPLATE);
        return (
          <p className="text-primary">
            [ OK ] display reset to default ({DEFAULT_RETRO_TEMPLATE}).
          </p>
        );
      }
      // A specific color is a mono-mode idea: picking one flips the mode too,
      // matching what the display panel does.
      const hex = normalizeHex(target);
      if (hex) {
        setThemeMode("mono");
        setThemeColor(hex, "shell");
        unlockAchievement("theme");
        return <p className="text-primary">[ OK ] phosphor set to {hex}.</p>;
      }
      const preset = PRESETS.find((p) => p.id === target);
      if (!preset) {
        return (
          <Err>
            bash: theme: {target}: no such palette or preset
            <span className="block text-fg/40">
              retro palettes: {RETRO_TEMPLATES.map((t) => t.id).join(", ")}
            </span>
            <span className="block text-fg/40">
              mono phosphors: {PRESETS.map((p) => p.id).join(", ")}, or a #hex
            </span>
            <span className="block text-fg/40">also: retro, mono, reset</span>
          </Err>
        );
      }
      setThemeMode("mono");
      setThemeColor(preset.hex, "shell");
      unlockAchievement("theme");
      return <p className="text-primary">[ OK ] phosphor set to {preset.label.toLowerCase()}.</p>;
    },
  },
  {
    name: "unlock",
    usage: "unlock <section>",
    desc: "jump to & unlock a homepage section",
    run: ({ arg }) => {
      const target = arg.trim().toLowerCase();
      const elId = SECTION_IDS[target];
      if (!elId) {
        return (
          <Err>
            bash: unlock: {arg || "?"}: no such section (try: shell, skills, projects, status,
            publications, changelog)
          </Err>
        );
      }
      const ok = scrollAndFlourish(elId);
      if (ok) {
        markSectionUnlocked(
          target === "neofetch" ? "status" : target === "log" ? "changelog" : target
        );
      }
      return (
        <p className="text-primary">
          {ok ? "unlocked. scrolling there now..." : "section not on this page."}
        </p>
      );
    },
  },
  {
    name: "achievements",
    aliases: ["secrets"],
    desc: "show secrets found so far",
    run: () => {
      const unlocked = getUnlockedAchievements();
      return (
        <div>
          <p className="text-secondary">
            [{unlocked.size}/{ACHIEVEMENTS.length}] secrets found
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {ACHIEVEMENTS.map((a) => {
              const found = unlocked.has(a.id);
              return (
                <li key={a.id} className={found ? "text-primary" : "text-fg/40"}>
                  [{found ? "x" : " "}] {found ? a.label : a.hint}
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-xs text-fg/30">(`achievements reset` wipes the board)</p>
        </div>
      );
    },
  },
  {
    name: "shortcuts",
    aliases: ["keys"],
    desc: "keyboard cheatsheet",
    // Prints inline rather than opening the ? overlay: you asked a shell a
    // question, so it answers in the scrollback. The table is shared with the
    // overlay, so the two can't drift apart.
    run: () => {
      return (
        <Out>
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="mt-1 first:mt-0">
              <p className="text-fg/40">{group.title}</p>
              {group.items.map((item) => (
                <p key={item.keys}>
                  <span className="text-secondary">{item.keys}</span>{" "}
                  <span className="text-fg/70">{item.label}</span>
                </p>
              ))}
            </div>
          ))}
          <p className="mt-1 text-fg/40">(press ? any time for this as an overlay)</p>
        </Out>
      );
    },
  },
  {
    name: "history",
    usage: "history [-c]",
    desc: "show past commands (-c clears)",
    run: ({ history }) =>
      history.length === 0 ? (
        <p className="text-fg/50">no history yet.</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-fg/70">
          {history.map((cmd, i) => (
            <li key={i}>
              <span className="text-fg/40">{String(i + 1).padStart(3, " ")}</span> {cmd}
            </li>
          ))}
        </ol>
      ),
  },
  {
    name: "date",
    desc: "print the current date/time",
    run: () => <Out>{new Date().toString()}</Out>,
    text: () => new Date().toString(),
  },
  {
    name: "wc",
    usage: "<cmd> | wc",
    desc: "count lines, words and chars from a pipe",
    run: ({ stdin }) => {
      if (typeof stdin !== "string") {
        return <Err>wc: no input. try `tree | wc` or `cat skills.txt | wc`.</Err>;
      }
      const { lines, words, chars } = countText(stdin);
      return (
        <Out>
          <span className="tabular-nums text-secondary">
            {lines} {words} {chars}
          </span>{" "}
          <span className="text-fg/40">(lines words chars)</span>
        </Out>
      );
    },
    text: ({ stdin }) => {
      if (typeof stdin !== "string") return "";
      const { lines, words, chars } = countText(stdin);
      return `${lines} ${words} ${chars}`;
    },
  },
  {
    name: "echo",
    usage: "echo <text>",
    desc: "print text back",
    // With something piped in and no argument, echo re-emits stdin — which is
    // what makes it usable as a `| echo` tail to see what a stage produced.
    run: ({ arg, stdin }) => <Out>{arg || stdin || " "}</Out>,
    text: ({ arg, stdin }) => arg || stdin || "",
  },
  {
    name: "joke",
    aliases: ["fortune"],
    desc: "tell a bad programmer joke",
    run: () => <Out>{randomJoke()}</Out>,
    text: () => randomJoke(),
  },
  {
    name: "cowsay",
    usage: "cowsay <text>",
    desc: "make a cow say something",
    run: ({ arg, stdin }) => {
      // An argument wins over stdin so `joke | cowsay hello` still says hello;
      // the piped form (`joke | cowsay`) is the one worth having. Newlines
      // collapse to spaces because the bubble is measured in columns.
      const piped = stdin?.replace(/\s+/g, " ").trim();
      const msg = arg.trim() || piped || "moo?";
      return <pre className="text-xs text-fg/70 sm:text-sm">{cowsay(msg)}</pre>;
    },
    text: ({ arg, stdin }) => {
      const piped = stdin?.replace(/\s+/g, " ").trim();
      return cowsay(arg.trim() || piped || "moo?");
    },
  },
  {
    name: "sudo",
    usage: "sudo <...>",
    desc: "try it",
    run: ({ arg }) => {
      const target = arg.trim().toLowerCase();
      unlockAchievement("sudo");
      if (target === "make me a sandwich") {
        unlockAchievement("sandwich");
        return <p className="text-primary">okay. 🥪 (xkcd 149. you had to.)</p>;
      }
      if (target.startsWith("rm -rf")) {
        return (
          <Err>
            [ DENIED ] nice try. this incident has been logged, framed, and hung on the wall.
          </Err>
        );
      }
      return <Err>guest is not in the sudoers file. this incident will be reported.</Err>;
    },
  },
  { name: "replay", desc: "replay the boot sequence", run: () => {
      unlockAchievement("replay");
      window.dispatchEvent(new Event("suvo:replay-boot"));
      return <Dim>re-initializing...</Dim>;
    },
  },
  { name: "clear", aliases: ["cls"], desc: "clear the screen", run: () => null },

  /* ------------------------------------------------------- hidden / eggs */

  {
    name: "make",
    run: ({ arg }) =>
      arg.trim().toLowerCase() === "me a sandwich" ? (
        <Err>what? make it yourself.</Err>
      ) : (
        <Err>make: *** No targets specified and no makefile found. Stop.</Err>
      ),
  },
  {
    name: "pwd",
    run: () => <Out>{window.location.pathname}</Out>,
    text: () => window.location.pathname,
  },
  { name: "uname", run: () => <Out>{UNAME}</Out>, text: () => UNAME },
  {
    name: "man",
    usage: "man <command>",
    desc: "read the manual for a command",
    run: ({ arg }) => {
      const target = arg.trim().toLowerCase();

      if (!target) {
        return (
          <Out>
            <p>what manual page do you want?</p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-fg/50">
              {MAN_TOPICS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          </Out>
        );
      }

      const command = resolveCommand(target);
      if (!command) return <Err>No manual entry for {target}</Err>;

      // The hand-written page when there is one, else the registry's own
      // description — every command has at least a name and a synopsis.
      const body = MAN_PAGES[command.name] ?? command.desc;
      const aliases = command.aliases ?? [];

      return (
        <Out>
          <p className="text-secondary">
            {command.name.toUpperCase()}(1){" "}
            <span className="text-fg/40">· SuvoOS shell manual</span>
          </p>
          <p className="mt-1.5 text-secondary">SYNOPSIS</p>
          <p className="pl-4">{command.usage ?? command.name}</p>
          {body && (
            <>
              <p className="mt-1.5 text-secondary">DESCRIPTION</p>
              <p className="pl-4">{body}</p>
            </>
          )}
          {aliases.length > 0 && (
            <>
              <p className="mt-1.5 text-secondary">ALIASES</p>
              <p className="pl-4">{aliases.join(", ")}</p>
            </>
          )}
          {!body && (
            <p className="mt-1.5 text-fg/40">
              (this one is undocumented on purpose. run it and find out.)
            </p>
          )}
        </Out>
      );
    },
  },
  {
    name: "ping",
    run: ({ arg }) => {
      const host = arg.trim() || siteHost;
      const ms = () => (Math.random() * 18 + 4).toFixed(1);
      return (
        <Out>
          <p>PING {host}: 56 data bytes</p>
          <p>64 bytes from {host}: icmp_seq=0 ttl=64 time={ms()} ms</p>
          <p>64 bytes from {host}: icmp_seq=1 ttl=64 time={ms()} ms</p>
          <p>64 bytes from {host}: icmp_seq=2 ttl=64 time={ms()} ms</p>
          <p className="text-fg/40">--- 3 packets transmitted, 3 received, 0% packet loss</p>
        </Out>
      );
    },
  },
  {
    name: "curl",
    run: ({ arg }) => {
      const url = arg.trim();
      if (!url) return <Err>curl: try &apos;curl --help&apos; for more information</Err>;
      return (
        <Out>
          <p className="text-fg/40">HTTP/2 200</p>
          <p className="text-fg/40">content-type: text/plain</p>
          <p className="mt-1">this shell doesn&apos;t have a network stack. but nice instinct.</p>
          <p className="text-fg/50">
            (the site <em>does</em> have a real API though. try{" "}
            <span className="text-secondary">stats</span>)
          </p>
        </Out>
      );
    },
  },
  {
    name: "banner",
    run: () => <pre className="text-xs text-primary text-glow sm:text-sm">{BANNER_ART}</pre>,
    text: () => BANNER_ART,
  },
  {
    name: "coffee",
    aliases: ["brew"],
    run: () => {
      unlockAchievement("coffee");
      return (
        <pre className="text-xs text-secondary sm:text-sm">
{`   ( (
    ) )
  ........
  |      |]
  \\      /
   \`----'
brewing... this may take a while.`}
        </pre>
      );
    },
  },
  { name: "42", run: () => <Out>the answer to life, the universe, and everything.</Out> },
  { name: "flip", run: () => <p className="text-sm text-error">(╯°□°）╯︵ ┻━┻</p> },
  { name: "unflip", run: () => <p className="text-sm text-primary">┬─┬ノ( º _ ºノ)</p> },
  {
    name: "party",
    run: () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return <Dim>reduced motion is on. imagine confetti.</Dim>;
      }
      unlockAchievement("party");
      startParty();
      return <p className="text-primary">party mode engaged... phosphor will settle back in a sec.</p>;
    },
  },
  {
    name: "hireme",
    run: ({ router }) => {
      unlockAchievement("hireme");
      router.push("/contact");
      return <p className="text-primary">smart move. routing to ~/contact...</p>;
    },
  },
  { name: "idkfa", run: () => { unlockAchievement("godmode"); return <p className="text-primary">IDKFA... this shell doesn&apos;t have weapons, but you get bonus points for the reference.</p>; } },
  { name: "iddqd", run: () => { unlockAchievement("godmode"); return <p className="text-primary">IDDQD... nice try, but this isn&apos;t Doom. (achievement unlocked anyway)</p>; } },
  {
    name: "vim",
    aliases: ["vi", "nano", "emacs"],
    run: ({ raw }) => {
      unlockAchievement("vim");
      const editor = raw.split(/\s+/)[0].toLowerCase();
      return (
        <Out>
          entering {editor}... just kidding, escaped safely. (real vim users would still be
          stuck on :q!)
        </Out>
      );
    },
  },
  { name: ":q", aliases: [":q!", ":wq", ":x"], run: () => <Err>there is no escape. (also, this isn&apos;t actually vim)</Err> },
  {
    name: "sl",
    run: () => {
      unlockAchievement("train");
      return (
        <pre className="text-xs text-secondary sm:text-sm">
{`    ==__=__=__=__=  o__
 __|  gauravxsuvo  |__|__
(__/\\--------------/\\____\\
   o          o
you meant "ls". this is a train.`}
        </pre>
      );
    },
  },
  { name: "matrix", run: () => { window.dispatchEvent(new Event(TRIGGER_MATRIX_EVENT)); return <p className="text-primary">initializing digital rain...</p>; } },
  { name: "uptime", run: () => <Out>{uptimeLine()}</Out>, text: () => uptimeLine() },
  { name: "annyeong", aliases: ["안녕"], run: () => { unlockAchievement("polyglot"); return <Out>안녕하세요! (elementary korean, be gentle)</Out>; } },
  { name: "konnichiwa", aliases: ["こんにちは"], run: () => { unlockAchievement("polyglot"); return <Out>こんにちは！(elementary japanese, still learning)</Out>; } },
  { name: "github", run: () => { window.open(bio.github, "_blank", "noopener,noreferrer"); return <Dim>opening github...</Dim>; } },
  { name: "linkedin", run: () => { window.open(bio.linkedin, "_blank", "noopener,noreferrer"); return <Dim>opening linkedin...</Dim>; } },
  { name: "email", aliases: ["mail"], run: () => { window.location.href = `mailto:${bio.email}`; return <Dim>opening mail client...</Dim>; } },
  { name: "exit", aliases: ["logout", "quit"], run: () => <Out>there is no exit. you live here now. (try `cd ~`)</Out> },
];

/**
 * The colour cycle runs outside React, so it has to be re-entrant safe: a second
 * `party` while one is already running would otherwise capture the *cycling*
 * colour as the one to restore, and leave the site stuck on whatever hue it
 * happened to catch.
 */
let partyTimer: ReturnType<typeof setInterval> | undefined;
let partyStop: ReturnType<typeof setTimeout> | undefined;
let partyOriginal: string | null = null;

function startParty() {
  if (partyOriginal === null) {
    partyOriginal = readStoredThemeColor() ?? getComputedPrimaryHex();
  }
  clearInterval(partyTimer);
  clearTimeout(partyStop);

  let i = 0;
  partyTimer = setInterval(() => {
    i += 1;
    applyThemeColor(hslToHex({ h: (i * 37) % 360, s: 100, l: 55 }));
  }, 90);

  partyStop = setTimeout(() => {
    clearInterval(partyTimer);
    // In retro mode the cycle painted inline overrides on top of the stylesheet
    // palette; restoring means clearing them, not re-committing a hex — that
    // would silently flip the visitor to mono.
    if (resolveThemeMode() === "retro") applyThemeMode("retro");
    else if (partyOriginal) setThemeColor(partyOriginal, "shell");
    partyOriginal = null;
  }, 2500);
}

/* ---------------------------------------------------------------- resolution */

const BY_NAME = new Map<string, Command>();
for (const cmd of COMMANDS) {
  BY_NAME.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) BY_NAME.set(alias, cmd);
}

export function resolveCommand(name: string): Command | undefined {
  return BY_NAME.get(name);
}

/**
 * Topics `man` will list with no argument: the documented commands only. The
 * hidden eggs still have a page if you already know to ask for one, but printing
 * their names in a directory would give the game away.
 */
const MAN_TOPICS: string[] = COMMANDS.filter((c) => c.desc)
  .map((c) => c.name)
  .sort();

/** Commands that can feed a pipe. Derived, so it can't fall behind the registry. */
const PIPEABLE: string[] = COMMANDS.filter((c) => c.text)
  .map((c) => c.name)
  .sort();

/** Every name a user could type — commands, aliases and bare route names. */
export const COMPLETIONS: string[] = [
  ...new Set([...BY_NAME.keys(), ...Object.keys(ROUTES)]),
]
  .filter((n) => /^[a-z0-9:._-]+$/i.test(n))
  .sort();

/**
 * Argument completions, so `cd pro<tab>` and `cat sk<tab>` work too.
 *
 * Resolves through aliases first — keyed on the raw token, `secrets <tab>` and
 * `gh <tab>` offered nothing while their canonical names worked fine.
 */
export function completionsFor(command: string): string[] {
  switch (resolveCommand(command)?.name ?? command) {
    case "cd":
      return Object.keys(ROUTES);
    case "cat":
      return Object.keys(FILES);
    case "theme":
      return [
        ...RETRO_TEMPLATES.map((t) => t.id),
        "retro",
        "mono",
        ...PRESETS.map((p) => p.id),
        "reset",
      ];
    case "unlock":
      return Object.keys(SECTION_IDS);
    case "man":
      return MAN_TOPICS;
    case "achievements":
      return ["reset"];
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ pipes */

/**
 * Split a line on `|` into its stages.
 *
 * No quoting or escaping: this shell has no strings, so there is nothing a `|`
 * could be legitimately hiding inside. Empty stages (`ls ||  grep`, or a
 * trailing pipe) are dropped rather than treated as an error — the user is
 * mid-typing far more often than they mean it.
 */
function splitPipeline(line: string): string[] {
  return line
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function hasPipe(line: string): boolean {
  return line.includes("|") && splitPipeline(line).length > 1;
}

/**
 * Run a piped line, e.g. `tree | grep projects | wc`.
 *
 * Every stage but the last must produce text, so each is resolved through the
 * command's `text` form; the final stage runs normally and renders into the
 * scrollback. A stage that can't produce text fails the pipeline with the same
 * shape of message a real shell would give, rather than silently emitting
 * nothing — `theme | wc` is a mistake worth naming.
 *
 * Deliberately synchronous-only for the intermediate stages: the two async
 * commands (`stats`) return JSX from a network call and have no text form, so
 * they're pipe sinks at most. Keeping the chain sync avoids an await per stage
 * for a feature whose whole point is that it feels instant.
 */
export function runPipeline(
  ctx: Omit<CommandContext, "stdin"> & { line: string }
): ReactNode | Promise<ReactNode> {
  const stages = splitPipeline(ctx.line);

  let stdin: string | null = null;
  for (let i = 0; i < stages.length - 1; i++) {
    const stage = stages[i];
    const [head, ...rest] = stage.split(/\s+/);
    const name = head.toLowerCase();
    const command = resolveCommand(name);

    if (!command) {
      return <Err>bash: {head}: command not found</Err>;
    }
    if (!command.text) {
      return (
        <Err>
          bash: {command.name}: cannot be piped from
          <span className="block text-fg/40">
            (it produces an effect, not text — try{" "}
            <span className="text-secondary">{PIPEABLE.slice(0, 4).join(", ")}</span> …)
          </span>
        </Err>
      );
    }

    stdin = command.text({
      arg: rest.join(" "),
      raw: stage,
      history: ctx.history,
      router: ctx.router,
      stdin,
    });
  }

  const last = stages[stages.length - 1];
  const [head, ...rest] = last.split(/\s+/);
  return runShellCommand({
    name: head.toLowerCase(),
    arg: rest.join(" "),
    raw: last,
    history: ctx.history,
    router: ctx.router,
    stdin,
  });
}

export function runShellCommand(ctx: CommandContext & { name: string }): ReactNode | Promise<ReactNode> {
  const { name, arg, raw, router } = ctx;

  // Bare route names ("about", "projects") navigate, matching the old behaviour.
  if (name in ROUTES && !resolveCommand(name)) {
    return navigate(router, ROUTES[name]);
  }

  const command = resolveCommand(name);

  // Keyed off the resolved command, not the typed name: `achievements reset`
  // wiped the board but its documented alias `secrets reset` fell through to the
  // plain listing and silently did nothing.
  if (command?.name === "achievements" && arg.trim().toLowerCase() === "reset") {
    resetAchievements();
    return <Dim>achievement board wiped. go find them again.</Dim>;
  }

  if (!command) {
    const near = COMPLETIONS.find((c) => c.startsWith(name.slice(0, 2)) && c !== name);
    return (
      <Err>
        bash: {raw.split(/\s+/)[0]}: command not found
        {near && (
          <span className="block text-fg/40">
            did you mean <span className="text-secondary">{near}</span>?
          </span>
        )}
      </Err>
    );
  }
  return command.run(ctx);
}
