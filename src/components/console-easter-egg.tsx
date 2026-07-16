"use client";

import { useEffect } from "react";
import { bio } from "@/lib/data";
import { unlockAchievement } from "@/lib/achievements";
import { isAppleDevice } from "@/lib/platform";

const GREEN = "color:#33ff00;font-family:monospace";
const AMBER = "color:#ffb000;font-family:monospace";

declare global {
  interface Window {
    hire?: () => string;
  }
}

export function ConsoleEasterEgg() {
  useEffect(() => {
    console.log(
      `%cguest@${bio.handle}:~$ %cwhoami`,
      GREEN,
      AMBER
    );
    console.log(
      [
        `%c${bio.name}, ${bio.role}`,
        "",
        "you opened devtools. respect.",
        "",
        `  press ${isAppleDevice() ? "⌘" : "ctrl"}+K   command palette`,
        "  press /       same thing, fewer fingers",
        "  press ?       every keyboard shortcut",
        "  type  help    in the shell on the homepage",
        "  ↑ ↑ ↓ ↓ ← → ← → B A   you know what this does",
        "",
        `  hire()        ← run this`,
      ].join("\n"),
      GREEN
    );

    // Defining a global is the whole joke — it only pays off if someone actually
    // types it, and that person has earned an achievement.
    window.hire = () => {
      unlockAchievement("curious");
      window.open(`mailto:${bio.email}`, "_blank");
      return `opening mail to ${bio.email}. say something interesting.`;
    };

    return () => {
      delete window.hire;
    };
  }, []);

  return null;
}
