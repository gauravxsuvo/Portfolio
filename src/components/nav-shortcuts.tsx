"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { unlockAchievement } from "@/lib/achievements";
import { isModalCapturingKeys, isTypingTarget } from "@/lib/keyboard";

const MAP: Record<string, string> = {
  h: "/",
  a: "/about",
  p: "/projects",
  e: "/experience",
  c: "/contact",
  r: "/publications",
};

export function NavShortcuts() {
  const router = useRouter();
  const armedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // The boot overlay has its own prompt; typing "g" there is text, not a jump.
      if (isModalCapturingKeys()) return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (armedRef.current) {
        armedRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const path = MAP[key];
        if (path) {
          unlockAchievement("shortcuts");
          router.push(path);
        }
        return;
      }

      if (key === "g") {
        armedRef.current = true;
        timeoutRef.current = setTimeout(() => {
          armedRef.current = false;
        }, 900);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  return null;
}
