"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * A CRT re-sync sweep on every client-side navigation. Purely decorative and
 * pointer-events:none, so it never sits between the user and the new page.
 */
export function RouteTransition() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [sweepKey, setSweepKey] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    // Don't sweep on the initial load — the boot screen already covers that, and
    // stacking the two just reads as a flash.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSweepKey((k) => k + 1);
  }, [pathname]);

  if (reducedMotion || sweepKey === 0) return null;

  return <div key={sweepKey} aria-hidden="true" className="route-sweep" />;
}
