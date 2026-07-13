"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query. Returns false during SSR and the hydration render
 * (the server can't know), then the real value.
 *
 * Prefer this over `useState` + an effect: a state mirror only ever gets *set*
 * when the effect body runs, so a query that starts false and later reads true
 * leaves the state stuck — which is exactly how the cursor layer ended up
 * running for users who had asked for reduced motion.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
