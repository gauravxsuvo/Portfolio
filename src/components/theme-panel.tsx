"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketButton } from "@/components/ui/bracket-button";
import { ColorSlider } from "@/components/ui/color-slider";
import {
  DEFAULT_PRIMARY_HEX,
  PRESETS,
  contrastGrade,
  ensureReadableAgainstBg,
  hexToHsl,
  hslToHex,
  normalizeHex,
  randomReadableHsl,
  type HSL,
} from "@/lib/color";
import {
  OPEN_THEME_PANEL_EVENT,
  THEME_CHANGE_EVENT,
  getComputedPrimaryHex,
  previewThemeColor,
  readCrtEnabled,
  readStoredThemeColor,
  setCrtEnabled,
  setThemeColor,
  type ThemeChangeDetail,
} from "@/lib/theme";
import { unlockAchievement } from "@/lib/achievements";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Gate so the panel's state can be seeded straight from localStorage in the
 * useState initializers below. Those only run on the client here, which is what
 * lets the panel skip the usual "render defaults, then re-sync from an effect"
 * dance — and the cascading render that comes with it.
 */
export function ThemePanel() {
  const mounted = useMounted();
  if (!mounted) return null;
  return <ThemePanelInner />;
}

function ThemePanelInner() {
  const [open, setOpen] = useState(false);
  // The user's raw intent. This — not the contrast-guarded result — is what the
  // sliders render, so a drag tracks the finger 1:1 instead of being yanked
  // back by the readability floor mid-gesture.
  const [hsl, setHsl] = useState<HSL>(() =>
    hexToHsl(readStoredThemeColor() ?? getComputedPrimaryHex())
  );
  const [hexDraft, setHexDraft] = useState(
    () => readStoredThemeColor() ?? getComputedPrimaryHex() ?? DEFAULT_PRIMARY_HEX
  );
  const [crtOn, setCrtOn] = useState(() => readCrtEnabled());
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // What actually gets painted: the intent, floored to stay readable on black.
  const applied = useMemo(() => ensureReadableAgainstBg(hsl), [hsl]);
  const appliedHex = useMemo(() => hslToHex(applied), [applied]);
  const guarded = applied.l !== hsl.l;
  const { ratio, grade } = useMemo(() => contrastGrade(appliedHex), [appliedHex]);

  useEffect(() => {
    const onExternalChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeChangeDetail>).detail;
      // Skip our own echo. Re-deriving HSL from the hex we just emitted would
      // round-trip through a lossy encoding and reset hue/saturation to 0 at the
      // extremes of the lightness range.
      if (!detail?.hex || detail.source === "panel") return;
      setHsl(hexToHsl(detail.hex));
      setHexDraft(detail.hex);
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
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  /** Drag-time: paint now, defer the disk write, leave slider state untouched. */
  const preview = useCallback((next: HSL) => {
    setHsl(next);
    setHexDraft(hslToHex(ensureReadableAgainstBg(next)));
    previewThemeColor(hslToHex(ensureReadableAgainstBg(next)));
  }, []);

  /** Settle-time: the value the user landed on. Safe to do expensive work here. */
  const commit = useCallback((next: HSL) => {
    const hex = hslToHex(ensureReadableAgainstBg(next));
    setHsl(next);
    setHexDraft(hex);
    setThemeColor(hex, "panel");
    unlockAchievement("theme");
  }, []);

  function handleHexKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.currentTarget.blur();
  }

  function handleHexBlur() {
    const normalized = normalizeHex(hexDraft);
    if (normalized) commit(hexToHsl(normalized));
    else setHexDraft(appliedHex);
  }

  function toggleCrt() {
    const next = !crtOn;
    setCrtOn(next);
    setCrtEnabled(next);
  }

  const hueTrack = `linear-gradient(to right, hsl(0 ${hsl.s}% ${hsl.l}%), hsl(60 ${hsl.s}% ${hsl.l}%), hsl(120 ${hsl.s}% ${hsl.l}%), hsl(180 ${hsl.s}% ${hsl.l}%), hsl(240 ${hsl.s}% ${hsl.l}%), hsl(300 ${hsl.s}% ${hsl.l}%), hsl(360 ${hsl.s}% ${hsl.l}%))`;
  const satTrack = `linear-gradient(to right, hsl(${hsl.h} 0% ${hsl.l}%), hsl(${hsl.h} 100% ${hsl.l}%))`;
  const lightTrack = `linear-gradient(to right, hsl(${hsl.h} ${hsl.s}% 20%), hsl(${hsl.h} ${hsl.s}% 60%), hsl(${hsl.h} ${hsl.s}% 100%))`;

  return (
    <>
      {/* Mobile scrim — the panel is a bottom sheet down there, so it needs to
          read as a layer above the page rather than a floating card. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[54] bg-bg/70 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <BracketButton
        ref={triggerRef}
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="theme-panel"
        aria-label="Terminal display settings"
        // On mobile the panel is a bottom sheet that fills the lower half of the
        // screen, so the floating trigger would sit on top of its own controls.
        // Hide it there while open; on desktop the panel floats above it and
        // there's no collision.
        className={`fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] right-4 z-[56] bg-bg/90 text-xs backdrop-blur-sm ${
          open ? "max-sm:hidden" : ""
        }`}
      >
        DISPLAY
      </BracketButton>

      <div
        id="theme-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Terminal display settings"
        // Without inert, every control in here stays keyboard-reachable while the
        // panel is invisible — opacity-0 does not remove anything from the tab order.
        inert={!open || undefined}
        className={`fixed z-[55] transition-all duration-200 ease-out
          inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]
          sm:inset-x-auto sm:bottom-32 sm:right-4 sm:max-h-[calc(100vh-9rem)] sm:w-80 sm:origin-bottom-right sm:pb-0
          ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100 sm:scale-100"
              : "pointer-events-none translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
          }`}
      >
        <TerminalWindow title="display settings" meta="live" bodyClassName="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-fg/50">presets</p>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((preset) => {
                const active = appliedHex === preset.hex;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => commit(hexToHsl(preset.hex))}
                    aria-label={preset.label}
                    aria-pressed={active}
                    title={preset.label}
                    className={`h-9 w-full border transition-transform duration-100 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-7 ${
                      active ? "border-fg ring-1 ring-fg" : "border-border"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ColorSlider
              label="hue"
              value={hsl.h}
              min={0}
              max={360}
              unit="°"
              track={hueTrack}
              onChange={(h) => preview({ ...hsl, h })}
              onCommit={(h) => commit({ ...hsl, h })}
            />
            <ColorSlider
              label="saturation"
              value={hsl.s}
              min={0}
              max={100}
              unit="%"
              track={satTrack}
              onChange={(s) => preview({ ...hsl, s })}
              onCommit={(s) => commit({ ...hsl, s })}
            />
            <ColorSlider
              label="lightness"
              value={hsl.l}
              min={20}
              max={100}
              unit="%"
              track={lightTrack}
              onChange={(l) => preview({ ...hsl, l })}
              onCommit={(l) => commit({ ...hsl, l })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px]">
            <span className="text-fg/50">contrast on bg</span>
            <span className={grade === "FAIL" ? "text-error" : "text-primary"}>
              {ratio.toFixed(1)}:1 [{grade}]
            </span>
          </div>
          {guarded && (
            <p className="-mt-2 text-[11px] text-secondary">
              lightness floored to {applied.l}% to stay readable.
            </p>
          )}

          <label className="flex items-center gap-2 text-xs text-fg/60">
            hex
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onKeyDown={handleHexKeyDown}
              onBlur={handleHexBlur}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              className="min-w-0 flex-1 border border-border bg-bg px-2 py-1.5 text-fg outline-none focus-visible:border-primary"
            />
          </label>

          <button
            type="button"
            onClick={toggleCrt}
            aria-pressed={crtOn}
            className="flex items-center justify-between border-t border-border pt-3 text-xs text-fg/60 hover:text-primary"
          >
            <span>crt scanlines</span>
            <span className={crtOn ? "text-primary" : "text-fg/40"}>
              [{crtOn ? "ON" : "OFF"}]
            </span>
          </button>

          <div className="flex gap-2">
            <BracketButton
              type="button"
              variant="ghost"
              onClick={() => commit(randomReadableHsl())}
              className="flex-1 justify-center text-xs"
            >
              RANDOM
            </BracketButton>
            <BracketButton
              type="button"
              variant="ghost"
              onClick={() => commit(hexToHsl(DEFAULT_PRIMARY_HEX))}
              className="flex-1 justify-center text-xs"
            >
              RESET
            </BracketButton>
          </div>

          {/* The floating trigger is hidden behind the sheet on mobile, so the
              sheet carries its own dismiss. */}
          <BracketButton
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            className="justify-center text-xs sm:hidden"
          >
            CLOSE
          </BracketButton>
        </TerminalWindow>
      </div>
    </>
  );
}
