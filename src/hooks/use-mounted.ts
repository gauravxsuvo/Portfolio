"use client";

import { useSyncExternalStore } from "react";

// Reports false during SSR and the client's first (hydration-matching)
// render, then true afterward — without a setState-in-effect, unlike the
// useState+useEffect version of this pattern.
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
