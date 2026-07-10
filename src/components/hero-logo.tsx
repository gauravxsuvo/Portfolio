"use client";

import { useState } from "react";
import { unlockAchievement } from "@/lib/achievements";
import { bio } from "@/lib/data";

const LOGO = String.raw` ██████╗ ██████╗ ███████╗
██╔════╝ ██╔══██╗██╔════╝
██║  ███╗██████╔╝███████╗
██║   ██║██╔══██╗╚════██║
╚██████╔╝██║  ██║███████║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝`;

export function HeroLogo() {
  const [glitching, setGlitching] = useState(false);
  const [message, setMessage] = useState(false);

  function handleClick() {
    unlockAchievement("logo");
    setGlitching(true);
    setMessage(true);
    setTimeout(() => setGlitching(false), 260);
    setTimeout(() => setMessage(false), 2800);
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${bio.name} logo — click for a surprise`}
        className={`block text-left ${glitching ? "glitch-burst" : ""}`}
      >
        <pre
          aria-hidden="true"
          className="text-primary text-glow text-[8px] sm:text-sm leading-tight overflow-x-auto"
        >
          {LOGO}
        </pre>
      </button>
      {message && (
        <p role="status" className="mt-1 text-xs text-secondary">
          system: nice click. try{" "}
          <span className="text-primary">achievements</span> in the shell
          below.
        </p>
      )}
    </div>
  );
}
