"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BootScreen } from "@/components/boot-screen";
import { useMounted } from "@/hooks/use-mounted";
import {
  BOOT_COMPLETE_EVENT,
  BOOT_STORAGE_KEY as STORAGE_KEY,
  REPLAY_BOOT_EVENT,
  hasBooted,
} from "@/lib/boot";

export function BootGate({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const [dismissed, setDismissed] = useState(false);
  // Bumped by `replay` to force the localStorage read below to happen again.
  const [replayNonce, setReplayNonce] = useState(0);

  // Derived from storage rather than copied into state by an effect — the effect
  // version re-rendered the entire tree twice on every single page load.
  const seen = useMemo(
    () => (mounted ? hasBooted() : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted, replayNonce]
  );

  const active = !seen && !dismissed;

  useEffect(() => {
    const onReplay = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore — the replay still works for this session
      }
      setDismissed(false);
      setReplayNonce((n) => n + 1);
    };
    window.addEventListener(REPLAY_BOOT_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_BOOT_EVENT, onReplay);
  }, []);

  // Tell out-of-tree overlays the screen is theirs now. Fires for the skipped
  // case too (a returning visitor never sees the boot screen at all), otherwise
  // anything waiting on this would hang forever for most visits.
  useEffect(() => {
    if (!mounted || active) return;
    window.dispatchEvent(new Event(BOOT_COMPLETE_EVENT));
  }, [mounted, active]);

  const handleComplete = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore — boot just replays next visit
    }
    setDismissed(true);
  }, []);

  /**
   * Whether the boot overlay was ever actually *on screen* this mount.
   *
   * Latching on `active` alone is wrong and was the bug: `seen` is
   * `mounted ? hasBooted() : false`, so on the hydration render `mounted` is
   * still false, `seen` is false, and `active` therefore computes `true` for
   * every visitor — including returning ones who will never see the boot
   * screen. The ref latched on that phantom frame and the focus effect then
   * fired for everybody.
   *
   * `mounted && active` is the honest signal: it's the same condition that
   * actually renders the overlay (`gating` below).
   */
  const wasActive = useRef(false);
  useEffect(() => {
    if (mounted && active) wasActive.current = true;
  }, [mounted, active]);

  useEffect(() => {
    if (!mounted || active) return;
    // Only hand focus to <main> when the boot screen just closed — i.e. focus
    // is currently trapped inside an overlay that is about to disappear, and
    // leaving it there would strand it on a detached node.
    //
    // This used to run on every page load, because a returning visitor never
    // has `active === true` at all. The effect for them was to move focus into
    // <main> before they touched anything, which silently ate the entire nav:
    // Tab moves *forward* from wherever focus is, so the header links and the
    // skip link (both earlier in the DOM) became unreachable without
    // shift+Tab, and the skip link — the first thing a keyboard user expects to
    // find — could never be reached at all.
    if (!wasActive.current) return;
    const main = document.querySelector("main");
    if (!main) return;
    // preventScroll: the boot overlay is position:fixed over the full
    // viewport, so nothing the user can see actually moves when it closes —
    // without this, focusing <main> (much taller than the viewport) makes
    // the browser scroll so its top edge aligns with the viewport top,
    // shoving the nav bar off-screen and hiding the hero underneath it.
    main.focus({ preventScroll: true });
  }, [mounted, active]);

  // The power-on flash is cosmetic and belongs on every load, unlike the focus
  // move above — splitting them is what lets the focus move stay rare.
  useEffect(() => {
    if (!mounted || active) return;
    const main = document.querySelector("main");
    if (!main) return;
    main.classList.add("power-on");
    const id = setTimeout(() => main.classList.remove("power-on"), 750);
    return () => clearTimeout(id);
  }, [mounted, active]);

  const gating = mounted && active;

  return (
    <>
      <div
        className="contents"
        inert={gating || undefined}
        aria-hidden={gating ? "true" : undefined}
      >
        {children}
      </div>
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Site boot sequence"
          data-boot-gate="true"
          className="fixed inset-0 z-[45] bg-bg"
        >
          <BootScreen onComplete={handleComplete} />
        </div>
      )}
    </>
  );
}
