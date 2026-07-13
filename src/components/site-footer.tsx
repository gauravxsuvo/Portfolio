"use client";

import { useState } from "react";
import { unlockAchievement } from "@/lib/achievements";
import { SecretsCounter } from "@/components/secrets-counter";
import { bio } from "@/lib/data";

const SOCIALS = [
  { label: "github", href: bio.github },
  { label: "linkedin", href: bio.linkedin },
  { label: "email", href: `mailto:${bio.email}` },
];

const STATES = [
  { code: "OK", text: "STATUS: ONLINE", className: "text-primary" },
  { code: "BUSY", text: "STATUS: COMPILING...", className: "text-secondary" },
  { code: "AFK", text: "STATUS: STEPPED OUT FOR COFFEE", className: "text-fg/50" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [stateIndex, setStateIndex] = useState(0);
  const state = STATES[stateIndex];

  function handleClick() {
    unlockAchievement("status");
    setStateIndex((i) => (i + 1) % STATES.length);
  }

  return (
    <footer className="relative z-[1] border-t border-border bg-bg">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-2 px-4 py-4 text-xs text-fg/50 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={handleClick}
          aria-label="Cycle system status"
          className={`animate-flicker ${state.className}`}
        >
          [{state.code}]
        </button>
        <span>{state.text}</span>
        <span aria-hidden="true" className="hidden sm:inline">
          {"//"}
        </span>
        <nav aria-label="Social" className="flex flex-wrap gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="link-wipe transition-colors hover:text-primary"
            >
              ./{s.label}
            </a>
          ))}
        </nav>
        <span aria-hidden="true" className="hidden sm:inline">
          {"//"}
        </span>
        <SecretsCounter />
        <span className="sm:ml-auto">© {year} GAURAV RAJ SINGH</span>
      </div>
    </footer>
  );
}
