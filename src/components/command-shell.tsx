"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PromptInput } from "@/components/ui/prompt-input";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { bio } from "@/lib/data";
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
  contact: "/contact",
};

const SECTION_IDS: Record<string, string> = {
  shell: "section-shell",
  skills: "section-skills",
  projects: "section-projects",
  status: "section-status",
  neofetch: "section-status",
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
  ["sudo <...>", "try it"],
  ["achievements", "show secrets found so far"],
  ["shortcuts", "keyboard nav cheatsheet"],
  ["replay", "replay the boot sequence"],
  ["clear", "clear the screen"],
];

function scrollAndFlourish(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("power-on");
  setTimeout(() => el.classList.remove("power-on"), 750);
  return true;
}

function runCommand(
  lower: string,
  arg: string,
  raw: string,
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
          about projects experience contact{" "}
          <span className="text-fg/40">(cd &lt;name&gt;)</span>
        </p>
      );
    case "neofetch":
      return <NeofetchPanel />;
    case "replay":
      unlockAchievement("replay");
      window.dispatchEvent(new Event("suvo:replay-boot"));
      return <p className="text-fg/60">re-initializing...</p>;
    case "sudo":
      unlockAchievement("sudo");
      return (
        <p className="text-error">
          guest is not in the sudoers file. this incident will be reported.
        </p>
      );
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
            projects, status, changelog)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [history]);

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

    const output = runCommand(lower, rest.join(" "), raw, router);
    setHistory((h) => [...h, { command: raw, output }]);
  }

  return (
    <TerminalWindow
      title="guest@gaurav — shell"
      meta="interactive"
      bodyClassName="flex flex-col gap-3"
    >
      <div
        aria-live="polite"
        className="flex max-h-72 flex-col gap-2 overflow-y-auto text-xs sm:text-sm"
      >
        {history.map((entry, i) => (
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
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit}>
        <PromptInput
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
