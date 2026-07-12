"use client";

import { useEffect, useRef, useState } from "react";
import { MatrixRain } from "@/components/matrix-rain";
import { unlockAchievement } from "@/lib/achievements";

const SEQUENCE = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export const TRIGGER_MATRIX_EVENT = "suvo:trigger-matrix";

export function KonamiListener() {
  const [active, setActive] = useState(false);
  const progressRef = useRef(0);

  useEffect(() => {
    function onTrigger() {
      unlockAchievement("konami");
      setActive(true);
    }
    window.addEventListener(TRIGGER_MATRIX_EVENT, onTrigger);
    return () => window.removeEventListener(TRIGGER_MATRIX_EVENT, onTrigger);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea)$/i.test(target.tagName)) return;

      const key = e.key.toLowerCase();
      const expected = SEQUENCE[progressRef.current];

      if (key === expected) {
        progressRef.current += 1;
        if (progressRef.current === SEQUENCE.length) {
          progressRef.current = 0;
          unlockAchievement("konami");
          setActive(true);
        }
      } else {
        progressRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!active) return null;
  return <MatrixRain onDismiss={() => setActive(false)} />;
}
