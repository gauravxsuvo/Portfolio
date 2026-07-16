"use client";

import { useSyncExternalStore } from "react";
import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/analytics/consent";
import { BOOT_COMPLETE_EVENT, hasBooted } from "@/lib/boot";

/**
 * Consent and boot state as external stores.
 *
 * Both really are external stores — the source of truth is localStorage plus a
 * window event, not React state — so useSyncExternalStore is the honest
 * modelling of them, and it matches the existing useMounted() hook here rather
 * than inventing a second pattern for the same problem.
 *
 * The useState + useEffect version of this reads correctly but is subtly worse:
 * it renders once with a wrong value, then immediately re-renders, and React 19
 * lints it (`react-hooks/set-state-in-effect`) for exactly that reason. The
 * server snapshot below is what keeps hydration matching without that extra pass.
 */

function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  // A change in another tab should apply here too — otherwise declining in one
  // tab leaves a second, already-open tab happily tracking on a stale "granted".
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// getSnapshot must be referentially stable across calls for the same state.
// These return primitives, so Object.is comparison does the right thing and
// there's no cache to maintain.
const consentSnapshot = (): Consent => readConsent();
const consentServerSnapshot = (): Consent => "unset";

export function useConsent(): Consent {
  return useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot);
}

function subscribeBoot(onChange: () => void) {
  window.addEventListener(BOOT_COMPLETE_EVENT, onChange);
  return () => window.removeEventListener(BOOT_COMPLETE_EVENT, onChange);
}

const bootSnapshot = () => hasBooted();
const bootServerSnapshot = () => false;

export function useBooted(): boolean {
  return useSyncExternalStore(subscribeBoot, bootSnapshot, bootServerSnapshot);
}
