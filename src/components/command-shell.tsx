"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PromptInput } from "@/components/ui/prompt-input";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { bio } from "@/lib/data";
import { PRESETS, DEFAULT_PRIMARY_HEX, hslToHex } from "@/lib/color";
import {
  OPEN_THEME_PANEL_EVENT,
  applyThemeColor,
  getComputedPrimaryHex,
  readStoredThemeColor,
  setThemeColor,
} from "@/lib/theme";
import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import { TRIGGER_MATRIX_EVENT } from "@/components/konami-listener";
import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  markSectionUnlocked,
  unlockAchievement,
} from "@/lib/achievements";

type Entry = { command: string; output: ReactNode };

const ROUTES: Record<string, string> = {
  "~": "/",
  home: "/",
  about: "/about",
  projects: "/projects",
  experience: "/experience",
  publications: "/publications",
  research: "/publications",
  contact: "/contact",
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

const HELP_LINES: [string, string][] = [
  ["help", "show this help"],
  ["whoami", "print identity"],
  ["ls", "list routes"],
  ["cd <route>", "navigate to a route (or just type its name)"],
  ["unlock <section>", "jump to & unlock a homepage section"],
  ["neofetch", "show system info"],
  ["theme [preset]", "change phosphor color, or open the display panel"],
  ["date", "print the current date/time"],
  ["echo <text>", "print text back"],
  ["history", "show commands run this session"],
  ["joke", "tell a bad programmer joke"],
  ["cowsay <text>", "make a cow say something"],
  ["sudo <...>", "try it"],
  ["achievements", "show secrets found so far"],
  ["shortcuts", "keyboard nav cheatsheet"],
  ["replay", "replay the boot sequence"],
  ["clear", "clear the screen"],
];

const JOKES = [
  "there are 10 kinds of people: those who understand binary, and those who don't.",
  "a SQL query walks into a bar, walks up to two tables and asks, \"can I join you?\"",
  "!false — it's funny because it's true.",
  "why do programmers prefer dark mode? because light attracts bugs.",
  "i'd tell you a UDP joke, but you might not get it.",
];

const MAN_PAGES: Record<string, string> = {
  cd: "cd <route> — change directory (route). aliases: ~, home, about, projects, experience, publications, contact.",
  ls: "ls — list known routes on this system.",
  theme: "theme [preset|reset] — set the phosphor accent color, or open the display panel with no args.",
  sudo: "sudo — attempt to run a command as root. permission will be denied. every time.",
  grep: "grep <term> — this shell doesn't really grep, but the projects/publications pages do.",
};

function scrollAndFlourish(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
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

function runCommand(
  lower: string,
  arg: string,
  raw: string,
  history: string[],
  router: ReturnType<typeof useRouter>
): ReactNode {
  if (lower in ROUTES) {
    const path = ROUTES[lower];
    router.push(path);
    return (
      <p className="text-fg/60">
        navigating to {path === "/" ? "~" : `~${path}`} ...
      </p>
    );
  }

  switch (lower) {
    case "help":
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {HELP_LINES.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-secondary">{k}</dt>
              <dd className="text-fg/70">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "whoami":
      return (
        <div className="text-fg/70">
          <p>
            {bio.name} — {bio.role}
          </p>
          <p>{bio.location}</p>
          <p>{bio.focus.join(", ")}</p>
        </div>
      );
    case "ls":
      return (
        <p className="text-fg/70">
          about projects experience publications contact{" "}
          <span className="text-fg/40">(cd &lt;name&gt;)</span>
        </p>
      );
    case "pwd":
      return <p className="text-fg/70">{typeof window !== "undefined" ? window.location.pathname : "/"}</p>;
    case "date":
      return <p className="text-fg/70">{new Date().toString()}</p>;
    case "echo":
      return <p className="text-fg/70">{arg || " "}</p>;
    case "history":
      return history.length === 0 ? (
        <p className="text-fg/50">no history yet.</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-fg/70">
          {history.map((cmd, i) => (
            <li key={i}>
              <span className="text-fg/40">{i + 1}</span> {cmd}
            </li>
          ))}
        </ol>
      );
    case "man": {
      const target = arg.trim().toLowerCase();
      const page = MAN_PAGES[target];
      return page ? (
        <p className="text-fg/70">{page}</p>
      ) : (
        <p className="text-error">No manual entry for {target || "?"}</p>
      );
    }
    case "banner":
      return (
        <pre className="text-primary text-glow text-xs sm:text-sm">
{`================================
   ${bio.name.toUpperCase()}
================================`}
        </pre>
      );
    case "joke":
    case "fortune":
      return <p className="text-fg/70">{JOKES[Math.floor(Math.random() * JOKES.length)]}</p>;
    case "coffee":
      return (
        <pre className="text-secondary text-xs sm:text-sm">
{`   ( (
    ) )
  ........
  |      |]
  \\      /
   \`----'
brewing... this may take a while.`}
        </pre>
      );
    case "42":
      return <p className="text-fg/70">the answer to life, the universe, and everything.</p>;
    case "cowsay": {
      const msg = (arg.trim() || "moo?").slice(0, 40);
      const width = msg.length;
      return (
        <pre className="text-fg/70 text-xs sm:text-sm">
{` ${"_".repeat(width + 2)}
< ${msg} >
 ${"-".repeat(width + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`}
        </pre>
      );
    }
    case "flip":
      return <p className="text-error text-sm">(╯°□°）╯︵ ┻━┻</p>;
    case "unflip":
      return <p className="text-primary text-sm">┬─┬ノ( º _ ºノ)</p>;
    case "party": {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        return <p className="text-fg/60">reduced motion is on — imagine confetti.</p>;
      }
      unlockAchievement("party");
      const original = readStoredThemeColor() ?? getComputedPrimaryHex();
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        applyThemeColor(hslToHex({ h: (i * 37) % 360, s: 100, l: 55 }));
      }, 90);
      setTimeout(() => {
        clearInterval(id);
        setThemeColor(original);
      }, 2500);
      return <p className="text-primary">party mode engaged... phosphor will settle back in a sec.</p>;
    }
    case "hireme":
      unlockAchievement("hireme");
      router.push("/contact");
      return <p className="text-primary">smart move. routing to ~/contact...</p>;
    case "idkfa":
      unlockAchievement("godmode");
      return (
        <p className="text-primary">
          IDKFA... this shell doesn&apos;t have weapons, but you get bonus points for the
          reference.
        </p>
      );
    case ":q!":
    case ":wq":
    case ":q":
      return <p className="text-error">there is no escape. (also, this isn&apos;t actually vim)</p>;
    case "annyeong":
    case "안녕":
      unlockAchievement("polyglot");
      return <p className="text-fg/70">안녕하세요! (elementary korean, be gentle)</p>;
    case "konnichiwa":
    case "こんにちは":
      unlockAchievement("polyglot");
      return <p className="text-fg/70">こんにちは！(elementary japanese, still learning)</p>;
    case "uptime":
      return (
        <p className="text-fg/70">
          up {formatUptime(Math.floor((Date.now() - SESSION_START) / 1000))} this session
        </p>
      );
    case "matrix":
      window.dispatchEvent(new Event(TRIGGER_MATRIX_EVENT));
      return <p className="text-primary">initializing digital rain...</p>;
    case "theme": {
      const target = arg.trim().toLowerCase();
      if (!target) {
        window.dispatchEvent(new Event(OPEN_THEME_PANEL_EVENT));
        return <p className="text-fg/60">opening display settings...</p>;
      }
      if (target === "reset") {
        setThemeColor(DEFAULT_PRIMARY_HEX);
        return <p className="text-primary">[ OK ] phosphor reset to default green.</p>;
      }
      const preset = PRESETS.find((p) => p.id === target);
      if (!preset) {
        return (
          <p className="text-error">
            bash: theme: {target}: no such preset (try:{" "}
            {PRESETS.map((p) => p.id).join(", ")}, or reset)
          </p>
        );
      }
      setThemeColor(preset.hex);
      unlockAchievement("theme");
      return <p className="text-primary">[ OK ] phosphor set to {preset.label.toLowerCase()}.</p>;
    }
    case "github":
      window.open("https://github.com/gauravxsuvo", "_blank", "noopener,noreferrer");
      return <p className="text-fg/60">opening github...</p>;
    case "linkedin":
      window.open("https://www.linkedin.com/in/gauravxsuvo", "_blank", "noopener,noreferrer");
      return <p className="text-fg/60">opening linkedin...</p>;
    case "email":
      window.location.href = "mailto:workwithggaurav@gmail.com";
      return <p className="text-fg/60">opening mail client...</p>;
    case "vim":
    case "nano":
    case "vi":
      unlockAchievement("vim");
      return (
        <p className="text-fg/70">
          entering {lower}... just kidding — escaped safely. (real vim users would
          still be stuck on :q!)
        </p>
      );
    case "sl":
      return (
        <pre className="text-secondary text-xs sm:text-sm">
{`    ==__=__=__=__=  o__
 __|  gauravxsuvo  |__|__
(__/\\--------------/\\____\\
   o          o
you meant "ls". this is a train.`}
        </pre>
      );
    case "iddqd":
      unlockAchievement("godmode");
      return <p className="text-primary">IDDQD... nice try, but this isn&apos;t Doom. (achievement unlocked anyway)</p>;
    case "neofetch":
      return <NeofetchPanel />;
    case "replay":
      unlockAchievement("replay");
      window.dispatchEvent(new Event("suvo:replay-boot"));
      return <p className="text-fg/60">re-initializing...</p>;
    case "sudo": {
      const target = arg.trim().toLowerCase();
      unlockAchievement("sudo");
      if (target.startsWith("rm -rf")) {
        return (
          <p className="text-error">
            [ DENIED ] nice try. this incident has been logged, framed, and hung on
            the wall.
          </p>
        );
      }
      return (
        <p className="text-error">
          guest is not in the sudoers file. this incident will be reported.
        </p>
      );
    }
    case "shortcuts":
      return (
        <div className="text-fg/70">
          <p>
            <span className="text-secondary">g h</span> home{"   "}
            <span className="text-secondary">g a</span> about{"   "}
            <span className="text-secondary">g p</span> projects
          </p>
          <p>
            <span className="text-secondary">g e</span> experience{"   "}
            <span className="text-secondary">g c</span> contact
          </p>
          <p className="text-fg/40">(press g, then the letter — not in a text field)</p>
        </div>
      );
    case "achievements":
    case "secrets": {
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
        </div>
      );
    }
    case "unlock": {
      const target = arg.trim().toLowerCase();
      const elId = SECTION_IDS[target];
      if (!elId) {
        return (
          <p className="text-error">
            bash: unlock: {arg || "?"}: no such section (try: shell, skills,
            projects, status, publications, changelog)
          </p>
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
    }
    case "cd": {
      const target = arg.trim().toLowerCase().replace(/^\/+/, "");
      const path = ROUTES[target || "~"];
      if (path) {
        router.push(path);
        return (
          <p className="text-fg/60">
            navigating to {path === "/" ? "~" : `~${path}`} ...
          </p>
        );
      }
      return (
        <p className="text-error">
          bash: cd: {arg || "~"}: no such file or directory
        </p>
      );
    }
    default:
      return <p className="text-error">bash: {raw}: command not found</p>;
  }
}

export function CommandShell() {
  const router = useRouter();
  const [history, setHistory] = useState<Entry[]>([
    {
      command: "",
      output: (
        <p className="text-fg/50">
          type <span className="text-secondary">help</span> to see what this
          does.
        </p>
      ),
    },
  ]);
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on mount — scrolling the shell's own internal history list into
    // view on first paint was dragging the whole page's scroll position down
    // with it (the shell isn't the first section on the page), hiding the
    // hero above it. Only scroll once the user actually runs a command.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [history]);

  useEffect(() => {
    function onPrefill(e: Event) {
      const cmd = (e as CustomEvent<string>).detail;
      if (typeof cmd !== "string") return;
      setValue(cmd);
      inputRef.current?.focus();
    }
    window.addEventListener(SHELL_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(SHELL_PREFILL_EVENT, onPrefill);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    setValue("");

    const [cmd, ...rest] = raw.split(/\s+/);
    const lower = cmd.toLowerCase();

    if (lower === "clear") {
      setHistory([]);
      return;
    }

    const pastCommands = history.map((h) => h.command).filter(Boolean);
    const output = runCommand(lower, rest.join(" "), raw, pastCommands, router);
    setHistory((h) => [...h, { command: raw, output }]);
  }

  return (
    <TerminalWindow
      title="guest@gaurav — shell"
      meta="interactive"
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto text-xs sm:text-sm">
        {history.slice(0, -1).map((entry, i) => (
          <div key={i}>
            {entry.command && (
              <p>
                <span className="text-primary">guest@gauravxsuvo</span>
                <span className="text-fg/50">:~$</span> {entry.command}
              </p>
            )}
            <div className="mt-0.5">{entry.output}</div>
          </div>
        ))}
        {history.length > 0 && (
          <div aria-live="polite">
            {(() => {
              const entry = history[history.length - 1];
              return (
                <>
                  {entry.command && (
                    <p>
                      <span className="text-primary">guest@gauravxsuvo</span>
                      <span className="text-fg/50">:~$</span> {entry.command}
                    </p>
                  )}
                  <div className="mt-0.5">{entry.output}</div>
                </>
              );
            })()}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit}>
        <PromptInput
          ref={inputRef}
          promptLabel="guest@gauravxsuvo"
          path="~$"
          placeholder="type help to get started"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Command shell input"
        />
      </form>
    </TerminalWindow>
  );
}
