"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { isModalCapturingKeys, isTypingTarget } from "@/lib/keyboard";
import { OPEN_SHORTCUTS_EVENT, SHORTCUT_GROUPS } from "@/lib/shortcuts";

/**
 * The ? cheatsheet.
 *
 * The site leans hard on keyboard affordances — a palette, a g-prefix jump, a
 * shell with readline bindings — and until now the only way to learn any of them
 * was to already know to type `shortcuts` into the shell. "?" is the convention
 * for this (GitHub, Gmail, Linear) and costs a keystroke to discover.
 */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      // The guard only applies while closed — once open this overlay is itself
      // the capturing modal, and it still has to answer its own close key.
      if (!open && isModalCapturingKeys()) return;
      e.preventDefault();
      // Close through close() rather than a bare toggle, so focus goes back to
      // wherever it came from instead of falling to <body> when the button
      // unmounts under it.
      if (open) {
        close();
        return;
      }
      restoreFocusRef.current = document.activeElement as HTMLElement;
      setOpen(true);
    }
    function onOpenRequest() {
      restoreFocusRef.current = document.activeElement as HTMLElement;
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpenRequest);
    };
  }, [open, close]);

  // Focus moves into the dialog so Escape and the tab loop below have something
  // to work against, and so a screen reader lands on the sheet rather than
  // announcing nothing.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      // Tells the other global listeners to stand down while this is up —
      // without it, ctrl+k opened the palette *underneath* this overlay and
      // focused its invisible input.
      data-modal-keys="shortcuts"
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-bg/85 px-4 py-[10vh] backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="palette-in w-full max-w-lg"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
          }
          // Only one focusable in here, so the trap is just "Tab goes nowhere".
          if (e.key === "Tab") e.preventDefault();
        }}
      >
        <TerminalWindow title="man shortcuts" meta="press ? to close">
          <div className="flex flex-col gap-4">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 text-[11px] uppercase tracking-[0.15em] text-fg/40">
                  {group.title}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {group.items.map((item) => (
                    <div key={item.keys} className="contents">
                      <dt>
                        <kbd className="whitespace-nowrap border border-border px-1.5 py-0.5 text-xs text-secondary">
                          {item.keys}
                        </kbd>
                      </dt>
                      <dd className="self-center text-fg/70">{item.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="mt-1 border border-border px-3 py-1.5 text-xs text-fg/60 transition-colors hover:border-primary hover:text-primary"
            >
              [ CLOSE ]
            </button>
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
