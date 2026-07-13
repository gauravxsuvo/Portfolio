"use client";

import { useSyncExternalStore } from "react";
import { ACHIEVEMENT_EVENT, getUnlockedAchievements } from "@/lib/achievements";

// localStorage is an external store, so subscribe to it properly rather than
// mirroring it into state from an effect. The snapshot is a number, so React's
// identity check is stable and this can't loop.
function subscribe(callback: () => void) {
  window.addEventListener(ACHIEVEMENT_EVENT, callback);
  // Fires when another tab unlocks something.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ACHIEVEMENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return getUnlockedAchievements().size;
}

function getServerSnapshot() {
  return 0;
}

export function useAchievementCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
