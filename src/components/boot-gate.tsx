"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BootScreen } from "@/components/boot-screen";
import { useMounted } from "@/hooks/use-mounted";

const STORAGE_KEY = "suvo:booted";

function hasBooted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

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
    window.addEventListener("suvo:replay-boot", onReplay);
    return () => window.removeEventListener("suvo:replay-boot", onReplay);
  }, []);

  const handleComplete = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore — boot just replays next visit
    }
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!mounted || active) return;
    const main = document.querySelector("main");
    if (!main) return;
    // preventScroll: the boot overlay is position:fixed over the full
    // viewport, so nothing the user can see actually moves when it closes —
    // without this, focusing <main> (much taller than the viewport) makes
    // the browser scroll so its top edge aligns with the viewport top,
    // shoving the nav bar off-screen and hiding the hero underneath it.
    main.focus({ preventScroll: true });
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
