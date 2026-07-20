"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  THEME_CHANGE_EVENT,
  THEME_MODE_CHANGE_EVENT,
  type ThemeChangeDetail,
} from "@/lib/theme";

/**
 * The degauss thump, fired whenever the palette changes.
 *
 * A CRT demagnetises its shadow mask on power-up and on demand, and the image
 * shudders and re-converges while it does. Switching palette is the moment this
 * site actually is re-converging its colours, so it gets the matching sound
 * effect — minus the sound.
 *
 * All the work is in the `.degauss` keyframes; this component's only job is
 * deciding when one exists. It renders nothing at rest, so the cost between
 * palette switches is two passive listeners.
 *
 * The colour-change event is included alongside the mode event — picking a
 * phosphor in mono is also a palette change, and the two are fired by different
 * paths in lib/theme.ts — but **only when it is committed**. `previewThemeColor`
 * broadcasts at pointer frequency during a slider drag, so reacting to every
 * one of those would strobe a full-screen flash for the length of the gesture:
 * far past the three-flashes-per-second photosensitivity threshold, and
 * triggered by a control the visitor is deliberately dragging. `committed` is
 * on the event for exactly this distinction.
 */
export function DegaussFlash() {
  const reducedMotion = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (reducedMotion) return;

    function fire() {
      // A new key restarts the animation from frame zero even if one is already
      // running — clicking through four palettes should thump four times, not
      // play the first one to completion while the rest do nothing.
      setBurst((n) => n + 1);
      clearTimeout(timerRef.current);
      // Unmount once the animation has finished. `forwards` would otherwise
      // leave a transparent full-screen element parked over the page for the
      // rest of the session; harmless to look at, but it is a compositing layer
      // that exists for no reason and one more thing between the CRT overlay
      // and the content.
      timerRef.current = setTimeout(() => setBurst(0), 700);
    }

    function onColorChange(e: Event) {
      const detail = (e as CustomEvent<ThemeChangeDetail>).detail;
      // Drag frames are `committed: false` — see the note above.
      if (!detail?.committed) return;
      fire();
    }

    window.addEventListener(THEME_MODE_CHANGE_EVENT, fire);
    window.addEventListener(THEME_CHANGE_EVENT, onColorChange);
    return () => {
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, fire);
      window.removeEventListener(THEME_CHANGE_EVENT, onColorChange);
      clearTimeout(timerRef.current);
    };
  }, [reducedMotion]);

  if (reducedMotion || burst === 0) return null;
  return <div key={burst} aria-hidden="true" className="degauss" />;
}
