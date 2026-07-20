"use client";

import { useEffect } from "react";
import {
  applyPerfTier,
  hardwareSuggestsLowTier,
  probeScrollPerformance,
  readStoredQuality,
} from "@/lib/perf-tier";

/**
 * Resolves the graphics quality tier and stamps it on <html>. Renders nothing.
 *
 * Order matters: an explicit choice from the display panel wins outright and
 * stops here, because a visitor who picked "full" should not have it taken away
 * by a probe that caught one bad scroll. Only `auto` measures anything.
 *
 * The hardware hint is applied immediately so a very weak device never paints
 * the expensive frame at all; the scroll probe can still promote it back to the
 * full look if it turns out to cope fine. That direction is deliberate — a
 * device wrongly demoted gets its effects back a second later, whereas one
 * wrongly promoted stutters until it's demoted, and the stutter is the thing
 * we're trying to avoid.
 */
export function PerfGuard() {
  useEffect(() => {
    const quality = readStoredQuality();
    if (quality !== "auto") {
      applyPerfTier(quality);
      return;
    }

    if (hardwareSuggestsLowTier()) applyPerfTier("low");
    return probeScrollPerformance(applyPerfTier);
  }, []);

  return null;
}
