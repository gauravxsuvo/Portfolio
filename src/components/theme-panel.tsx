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
  THEME_MODE_CHANGE_EVENT,
  previewThemeColor,
  readCrtEnabled,
  readStoredThemeColor,
  resolveRetroTemplate,
  resolveThemeMode,
  setCrtEnabled,
  setRetroTemplate,
  setThemeColor,
  setThemeMode,
  type RetroTemplateId,
  type ThemeChangeDetail,
  type ThemeMode,
} from "@/lib/theme";
import { DEFAULT_RETRO_TEMPLATE, RETRO_TEMPLATES } from "@/lib/retro-templates";
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
  // Seeded from the stored *mono* colour, falling back to the default phosphor —
  // not from the computed primary. These controls belong to mono mode, and in
  // retro the computed primary is a near-white, so reading it parked the
  // sliders on "white at 98% lightness": a starting point that describes the
  // palette they don't control and that nobody would choose to drag from.
  const [hsl, setHsl] = useState<HSL>(() =>
    hexToHsl(readStoredThemeColor() ?? DEFAULT_PRIMARY_HEX)
  );
  const [hexDraft, setHexDraft] = useState(
    () => readStoredThemeColor() ?? DEFAULT_PRIMARY_HEX
  );
  const [crtOn, setCrtOn] = useState(() => readCrtEnabled());
  const [mode, setMode] = useState<ThemeMode>(() => resolveThemeMode());
  const [template, setTemplate] = useState<RetroTemplateId>(() => resolveRetroTemplate());
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
    // The shell can flip modes too (`theme retro`), so track it like any other
    // external change rather than assuming this panel is the only writer.
    const onModeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: ThemeMode; template: RetroTemplateId }>)
        .detail;
      if (detail?.mode) setMode(detail.mode);
      if (detail?.template) setTemplate(detail.template);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onExternalChange);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, onModeChange);
    window.addEventListener(OPEN_THEME_PANEL_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onExternalChange);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, onModeChange);
      window.removeEventListener(OPEN_THEME_PANEL_EVENT, onOpenRequest);
    };
  }, []);

  /**
   * Publish the open state so the floating controls can step aside on mobile
   * (see .floating-bottom in globals.css). An attribute on <html> rather than
   * prop-drilling, because back-to-top is a sibling in the layout that has no
   * relationship to this component and shouldn't grow one.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.panel = "open";
    else delete root.dataset.panel;
    return () => {
      delete root.dataset.panel;
    };
  }, [open]);

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

  /**
   * Picking a color is a mono-mode act: retro's palette is fixed, so the first
   * touch of a preset, slider or hex field flips the site to mono and stays
   * there. Persisting the flip immediately (not just painting it) is what keeps
   * a reload honest about what the visitor last saw.
   */
  const ensureMono = useCallback(() => {
    if (mode === "mono") return;
    setMode("mono");
    setThemeMode("mono");
  }, [mode]);

  /** Drag-time: paint now, defer the disk write, leave slider state untouched. */
  const preview = useCallback(
    (next: HSL) => {
      ensureMono();
      setHsl(next);
      setHexDraft(hslToHex(ensureReadableAgainstBg(next)));
      previewThemeColor(hslToHex(ensureReadableAgainstBg(next)));
    },
    [ensureMono]
  );

  /** Settle-time: the value the user landed on. Safe to do expensive work here. */
  const commit = useCallback(
    (next: HSL) => {
      ensureMono();
      const hex = hslToHex(ensureReadableAgainstBg(next));
      setHsl(next);
      setHexDraft(hex);
      setThemeColor(hex, "panel");
      unlockAchievement("theme");
    },
    [ensureMono]
  );

  /** Picking a palette implies retro — see setRetroTemplate for why. */
  function chooseTemplate(next: RetroTemplateId) {
    if (next === template && mode === "retro") return;
    setTemplate(next);
    setMode("retro");
    setRetroTemplate(next);
    unlockAchievement("theme");
  }

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
        // Hiding this on mobile while the sheet is up is handled by the
        // data-panel rule in globals.css, which covers every .floating-bottom
        // control rather than just this one.
        className="floating-bottom fixed right-4 z-[56] bg-bg/90 text-xs backdrop-blur-sm"
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
        // floating-panel supplies the desktop bottom offset and max-height off
        // the same --floating-base the trigger uses, so the two can't collide.
        className={`floating-panel fixed z-[55] transition-all duration-200 ease-out
          inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]
          sm:inset-x-auto sm:right-4 sm:w-[min(20rem,calc(100vw-2rem))] sm:origin-bottom-right sm:pb-0
          ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100 sm:scale-100"
              : "pointer-events-none translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
          }`}
      >
        <TerminalWindow title="display settings" meta="live" bodyClassName="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-fg/50">
              retro palettes
            </p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Retro palette">
              {RETRO_TEMPLATES.map((t) => {
                const active = mode === "retro" && template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTemplate(t.id)}
                    aria-pressed={active}
                    className={`flex flex-col gap-1 border px-2 py-1.5 text-left text-[11px] transition-colors ${
                      active
                        ? "border-primary text-primary"
                        : "border-border text-fg/60 hover:border-primary hover:text-primary"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {active && <span aria-hidden="true">&gt;</span>}
                      {t.label}
                    </span>
                    <span className="text-fg/40">{t.blurb}</span>
                    {/* The palette itself is the real label — names like
                        "vaporwave" mean nothing until you see the colours. */}
                    <span aria-hidden="true" className="mt-0.5 flex h-2">
                      {t.swatch.map((hex) => (
                        <span key={hex} className="flex-1" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-fg/50">
              mono phosphor{" "}
              <span className="normal-case tracking-normal text-fg/30">
                {mode === "mono" ? "(active)" : "(switches mode)"}
              </span>
            </p>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((preset) => {
                // Guarded on the mode: in retro the sliders still hold whatever
                // colour was last picked, so an unguarded hex comparison lit up
                // a phosphor swatch that wasn't driving anything on screen.
                const active = mode === "mono" && appliedHex === preset.hex;
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
              onClick={() => {
                // Back to the site default: retro mode on the default palette,
                // sliders parked on green. Not commit() — that would flip to
                // mono, which is the opposite of what "reset" means now.
                setHsl(hexToHsl(DEFAULT_PRIMARY_HEX));
                setHexDraft(DEFAULT_PRIMARY_HEX);
                chooseTemplate(DEFAULT_RETRO_TEMPLATE);
              }}
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
