"use client";

import { useRouter } from "next/navigation";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { SHELL_PREFILL_EVENT } from "@/lib/shell-events";
import { useAchievementCount } from "@/hooks/use-achievement-count";

/**
 * Gives the achievement system somewhere to live. Without a persistent counter
 * the only way to learn secrets exist at all is to guess the `achievements`
 * command, which nobody does.
 */
export function SecretsCounter() {
  const router = useRouter();
  const found = useAchievementCount();

  const total = ACHIEVEMENTS.length;
  const complete = found >= total;

  function reveal() {
    router.push("/");
    // The shell only exists on the homepage; give the route a beat to land
    // before asking it to prefill.
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(SHELL_PREFILL_EVENT, { detail: "achievements" })
      );
      document.getElementById("section-shell")?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  }

  return (
    <button
      type="button"
      onClick={reveal}
      title="show the secrets board"
      className={`transition-colors hover:text-primary ${
        complete ? "text-secondary text-glow-amber" : "text-fg/50"
      }`}
    >
      [{found}/{total}] secrets{complete ? ", all found" : ""}
    </button>
  );
}
