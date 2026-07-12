"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketButton } from "@/components/ui/bracket-button";
import { ColorSlider } from "@/components/ui/color-slider";
import {
  DEFAULT_PRIMARY_HEX,
  PRESETS,
  ensureReadableAgainstBg,
  hexToHsl,
  hslToHex,
  normalizeHex,
  type HSL,
} from "@/lib/color";
import {
  OPEN_THEME_PANEL_EVENT,
  THEME_CHANGE_EVENT,
  getComputedPrimaryHex,
  readCrtEnabled,
  readStoredThemeColor,
  setCrtEnabled,
  setThemeColor,
} from "@/lib/theme";
import { unlockAchievement } from "@/lib/achievements";

export function ThemePanel() {
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState<HSL>({ h: 100, s: 100, l: 50 });
  const [hexDraft, setHexDraft] = useState(DEFAULT_PRIMARY_HEX);
  const [crtOn, setCrtOn] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initial = readStoredThemeColor() ?? getComputedPrimaryHex();
    setHsl(hexToHsl(initial));
    setHexDraft(initial);
    setCrtOn(readCrtEnabled());
  }, []);

  useEffect(() => {
    const onExternalChange = (e: Event) => {
      const hex = (e as CustomEvent<string>).detail;
      if (!hex) return;
      setHsl(hexToHsl(hex));
      setHexDraft(hex);
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener(THEME_CHANGE_EVENT, onExternalChange);
    window.addEventListener(OPEN_THEME_PANEL_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onExternalChange);
      window.removeEventListener(OPEN_THEME_PANEL_EVENT, onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  function commit(next: HSL) {
    const guarded = ensureReadableAgainstBg(next);
    setHsl(guarded);
    const hex = hslToHex(guarded);
    setHexDraft(hex);
    setThemeColor(hex);
    unlockAchievement("theme");
  }

  function handleHexKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const normalized = normalizeHex(hexDraft);
    if (normalized) commit(hexToHsl(normalized));
    else setHexDraft(hslToHex(hsl));
  }

  function handleHexBlur() {
    const normalized = normalizeHex(hexDraft);
    if (normalized) commit(hexToHsl(normalized));
    else setHexDraft(hslToHex(hsl));
  }

  function toggleCrt() {
    const next = !crtOn;
    setCrtOn(next);
    setCrtEnabled(next);
  }

  function reset() {
    commit(hexToHsl(DEFAULT_PRIMARY_HEX));
  }

  return (
    <>
      <BracketButton
        ref={triggerRef}
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="theme-panel"
        aria-label="Terminal display settings"
        className="fixed bottom-20 right-4 z-[55] bg-bg/90 text-xs backdrop-blur-sm"
      >
        DISPLAY
      </BracketButton>

      <div
        id="theme-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Terminal display settings"
        className={`fixed bottom-32 right-4 z-[55] max-h-[calc(100vh-9rem)] w-[min(20rem,calc(100vw-2rem))] origin-bottom-right overflow-y-auto transition-all duration-200 ${
          open
            ? "pointer-events-auto opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-95"
        }`}
      >
        <TerminalWindow title="display settings" meta="live" bodyClassName="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs text-fg/50">presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => commit(hexToHsl(preset.hex))}
                  aria-label={preset.label}
                  title={preset.label}
                  className="h-6 w-6 border border-border transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ColorSlider
              label="hue"
              value={hsl.h}
              min={0}
              max={360}
              unit="°"
              onChange={(h) => commit({ ...hsl, h })}
            />
            <ColorSlider
              label="saturation"
              value={hsl.s}
              min={0}
              max={100}
              unit="%"
              onChange={(s) => commit({ ...hsl, s })}
            />
            <ColorSlider
              label="lightness"
              value={hsl.l}
              min={20}
              max={100}
              unit="%"
              onChange={(l) => commit({ ...hsl, l })}
            />
          </div>

          <label className="flex items-center gap-2 border-t border-border pt-3 text-xs text-fg/60">
            hex
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onKeyDown={handleHexKeyDown}
              onBlur={handleHexBlur}
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 border border-border bg-bg px-2 py-1 text-fg outline-none focus-visible:border-primary"
            />
          </label>

          <button
            type="button"
            onClick={toggleCrt}
            className="flex items-center justify-between border-t border-border pt-3 text-xs text-fg/60 hover:text-primary"
          >
            <span>crt scanlines</span>
            <span className={crtOn ? "text-primary" : "text-fg/40"}>
              [{crtOn ? "ON" : "OFF"}]
            </span>
          </button>

          <BracketButton type="button" variant="ghost" onClick={reset} className="text-xs">
            RESET
          </BracketButton>
        </TerminalWindow>
      </div>
    </>
  );
}
