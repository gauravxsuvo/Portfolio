"use client";

import { useEffect, useRef, useState } from "react";
import { scrollWindowTo } from "@/lib/scroll";

/**
 * Appears once you're a screen down. Sits bottom-left so it never collides with
 * the DISPLAY trigger (bottom-right), which is why it isn't in the usual corner.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    function read() {
      raf.current = 0;
      setVisible(window.scrollY > window.innerHeight * 0.8);
    }
    function onScroll() {
      if (!raf.current) raf.current = requestAnimationFrame(read);
    }
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => scrollWindowTo(0)}
      aria-label="Scroll back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`floating-bottom fixed left-4 z-[56] border border-border bg-bg/90 px-2.5 py-1.5 text-xs text-fg/60 backdrop-blur-sm transition-all duration-200 hover:border-primary hover:text-primary ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <span aria-hidden="true">^</span> top
    </button>
  );
}
