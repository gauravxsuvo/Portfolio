"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BootScreen } from "@/components/boot-screen";

const STORAGE_KEY = "suvo:booted";

export function BootGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    setMounted(true);
    const seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (seen) setActive(false);
  }, []);

  useEffect(() => {
    const onReplay = () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setActive(true);
    };
    window.addEventListener("suvo:replay-boot", onReplay);
    return () => window.removeEventListener("suvo:replay-boot", onReplay);
  }, []);

  const handleComplete = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
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
