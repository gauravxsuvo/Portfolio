/**
 * Graphics quality tier.
 *
 * The site's effects are cheap enough that this should almost never fire — the
 * expensive thing was one oversized blur (see "Phosphor mist" in globals.css),
 * and fixing it doubled the frame rate on every device rather than only on slow
 * ones. This is the safety net for hardware that still can't keep up, not the
 * primary strategy: if you find yourself widening what "low" turns off, the
 * real fix is almost certainly to make the effect cheaper for everyone.
 *
 * `low` is applied as `html[data-perf="low"]`, and everything it changes is
 * pure CSS in globals.css. No component branches on it, so nothing unmounts,
 * nothing reflows, and turning it on or off mid-session is just a repaint.
 */

export const QUALITY_STORAGE_KEY = "suvo:quality";
export const PERF_TIER_CHANGE_EVENT = "suvo:perf-tier-change";

/**
 * What the visitor asked for. `auto` (the default) means "measure it"; the
 * other two are an explicit override that skips detection entirely — a manual
 * choice must not be second-guessed by a probe that happens to catch a bad
 * couple of frames.
 */
export type Quality = "auto" | "high" | "low";

/** What was actually resolved and painted. `auto` is never a tier. */
export type PerfTier = "high" | "low";

export const DEFAULT_QUALITY: Quality = "auto";

function isQuality(value: unknown): value is Quality {
  return value === "auto" || value === "high" || value === "low";
}

export function readStoredQuality(): Quality {
  if (typeof window === "undefined") return DEFAULT_QUALITY;
  try {
    const raw = window.localStorage.getItem(QUALITY_STORAGE_KEY);
    return isQuality(raw) ? raw : DEFAULT_QUALITY;
  } catch {
    return DEFAULT_QUALITY;
  }
}

export function applyPerfTier(tier: PerfTier): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Only the low tier is stamped. Absence is the default, so a failed script,
  // a fresh clone or a disabled-JS visitor all land on the full-quality path
  // rather than on a silently degraded one.
  if (tier === "low") root.dataset.perf = "low";
  else delete root.dataset.perf;
}

export function currentPerfTier(): PerfTier {
  if (typeof document === "undefined") return "high";
  return document.documentElement.dataset.perf === "low" ? "low" : "high";
}

function broadcast(quality: Quality, tier: PerfTier): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ quality: Quality; tier: PerfTier }>(PERF_TIER_CHANGE_EVENT, {
      detail: { quality, tier },
    })
  );
}

/**
 * Commit an explicit choice. `auto` re-arms detection on the next load rather
 * than re-probing immediately — a probe needs a scroll to measure anything, and
 * running one the instant the panel closes would sample the panel's own
 * closing animation.
 */
export function setQuality(quality: Quality): void {
  const tier: PerfTier = quality === "low" ? "low" : quality === "high" ? "high" : currentPerfTier();
  applyPerfTier(tier);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, quality);
  } catch {
    // storage unavailable — the choice just won't persist across reloads
  }
  broadcast(quality, tier);
}

/**
 * Static hardware hints. Deliberately a narrow net: these APIs are coarse,
 * `deviceMemory` is Chromium-only, and plenty of capable phones report 4 cores.
 * Only a device that is small on *both* axes (or has very little memory
 * outright) is pre-judged; everything else has to earn the low tier by
 * actually dropping frames in the probe below.
 */
export function hardwareSuggestsLowTier(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 0;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  if (memory > 0 && memory <= 2) return true;
  if (cores > 0 && cores <= 4 && memory > 0 && memory <= 4) return true;
  return false;
}

/** Frame time above which a frame counts as slow (~31fps). */
const SLOW_FRAME_MS = 32;
/** Frames discarded at the start of a burst, before anything is counted. */
const WARMUP_FRAMES = 6;
/** Frames measured per burst, after the warm-up. */
const SAMPLE_SIZE = 30;
/** Share of a burst's frames that must be slow for that burst to be "bad". */
const SLOW_SHARE = 0.6;
/** Consecutive bad bursts required to demote. */
const BAD_BURSTS_TO_DEMOTE = 2;
/** Bursts examined before giving up and leaving the device on the full tier. */
const MAX_BURSTS = 4;
/** Quiet time after load before the probe arms at all. */
const ARM_DELAY_MS = 2500;

/**
 * Measures frame pacing during sustained scrolling, then detaches for good.
 *
 * Scroll specifically, because that is the only moment the compositor is under
 * real load — an idle page hits its rAF deadline on any hardware, so a probe
 * run at load would clear a device that is about to stutter.
 *
 * Three guards against false positives, all of which were needed: an
 * unthrottled desktop measured as "low" without them, because the first scroll
 * of a session is the worst-paced one on any machine.
 *
 *   1. It arms late. Fonts swapping, below-fold content rastering for the
 *      first time and hydration all land in the first couple of seconds.
 *   2. It discards each burst's warm-up frames, where the compositor is
 *      spinning up layers it has not touched yet.
 *   3. It demotes only on consecutive bad bursts. One stuttery burst on a
 *      fast machine means a background tab did something, not that the
 *      hardware is weak — so a single good burst resets the count.
 *
 * Biased toward leaving the full experience in place: demotion needs to be
 * earned twice, and after MAX_BURSTS the probe gives up rather than keep
 * sampling forever. Returns a teardown.
 */
export function probeScrollPerformance(onVerdict: (tier: PerfTier) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let frames: number[] = [];
  let seen = 0;
  let last = 0;
  let raf = 0;
  let bursts = 0;
  let badRun = 0;
  let done = false;
  let armed = false;

  const armTimer = window.setTimeout(() => {
    armed = true;
  }, ARM_DELAY_MS);

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(armTimer);
    window.removeEventListener("scroll", onScroll);
  }

  function frame(now: number) {
    if (last) {
      const dt = now - last;
      // Drop absurd gaps: a backgrounded tab or a GC pause is not the
      // steady-state frame cost we are trying to measure.
      if (dt < 250) {
        seen += 1;
        if (seen > WARMUP_FRAMES) frames.push(dt);
      }
    }
    last = now;

    if (frames.length >= SAMPLE_SIZE) {
      const slow = frames.filter((f) => f > SLOW_FRAME_MS).length;
      const bad = slow / frames.length >= SLOW_SHARE;
      badRun = bad ? badRun + 1 : 0;
      bursts += 1;
      raf = 0;

      if (badRun >= BAD_BURSTS_TO_DEMOTE) {
        done = true;
        stop();
        onVerdict("low");
        return;
      }
      if (!bad) {
        // Scrolling fine. This is what gives back the full look to a device
        // the hardware hint demoted on spec alone — those APIs are coarse, and
        // a phone that actually holds its frame rate has earned the tube.
        // Probing continues: a later pair of bad bursts can still demote.
        onVerdict("high");
      }
      if (bursts >= MAX_BURSTS) {
        done = true;
        stop();
        return;
      }
      return; // wait for the next scroll burst
    }
    raf = requestAnimationFrame(frame);
  }

  function onScroll() {
    if (done || raf || !armed) return;
    last = 0;
    seen = 0;
    frames = [];
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    done = true;
    stop();
  };
}
