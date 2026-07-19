"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * A mock `top`/`htop` for the shell.
 *
 * Pure theatre — there is no real process table in a browser — but it's the kind
 * of theatre this site is made of, and the "processes" are a quiet nod to the
 * real work: the PINN solver, the agent orchestrator, the geo simulation. It
 * refreshes live like the real thing, then freezes after a bounded run so a
 * scrollback full of `top` invocations isn't a scrollback full of live intervals.
 *
 * Accessibility follows the Typewriter pattern: the flickering numbers are
 * decorative and marked aria-hidden, with a single sr-only sentence describing
 * what a sighted user is looking at. Under reduced-motion it renders one static
 * frame and never starts a timer.
 */

type Proc = {
  pid: number;
  cmd: string;
  /** Baseline load; the live value random-walks around it. */
  base: number;
  mem: number;
};

const PROCESSES: Proc[] = [
  { pid: 1, cmd: "pinn_solver", base: 63, mem: 24.1 },
  { pid: 42, cmd: "agent_orchestrator", base: 47, mem: 18.7 },
  { pid: 108, cmd: "geo_sim --districts=759", base: 38, mem: 15.2 },
  { pid: 220, cmd: "next-server", base: 9, mem: 11.4 },
  { pid: 256, cmd: "phosphor_render", base: 14, mem: 4.8 },
  { pid: 512, cmd: "crt_overlay", base: 6, mem: 2.1 },
  { pid: 777, cmd: "gsh [interactive]", base: 3, mem: 1.6 },
  { pid: 1024, cmd: "analytics_ingest", base: 2, mem: 3.3 },
  { pid: 1337, cmd: "konami_listener", base: 1, mem: 0.9 },
  { pid: 2048, cmd: "kernel_task", base: 4, mem: 6.5 },
];

/** How long the monitor stays live before it freezes on its last frame. */
const TICK_MS = 900;
const MAX_TICKS = 14;
const BAR_CELLS = 10;

type Sample = { pid: number; cmd: string; cpu: number; mem: number };

function sample(seed = false): Sample[] {
  return PROCESSES.map((p) => {
    const jitter = seed ? 0 : (Math.random() - 0.5) * 14;
    const cpu = Math.min(99.9, Math.max(0, p.base + jitter));
    return { pid: p.pid, cmd: p.cmd, cpu, mem: p.mem };
  }).sort((a, b) => b.cpu - a.cpu);
}

/** Ten-cell phosphor bar drawn in block glyphs — the only bar a terminal owns. */
function bar(pct: number): string {
  const filled = Math.round((pct / 100) * BAR_CELLS);
  return "█".repeat(filled) + "░".repeat(BAR_CELLS - filled);
}

/** Load colours the way htop does: green calm, amber busy, red pegged. */
function loadClass(pct: number): string {
  if (pct >= 80) return "text-error";
  if (pct >= 50) return "text-secondary";
  return "text-primary";
}

export function TopMonitor() {
  const reducedMotion = useReducedMotion();
  const [rows, setRows] = useState<Sample[]>(() => sample(true));
  /** Set once the run is over. "Live" is derived from it rather than stored, so
   *  the two can't disagree. */
  const [frozen, setFrozen] = useState(false);
  const ticks = useRef(0);
  const live = !reducedMotion && !frozen;

  useEffect(() => {
    if (reducedMotion) return;
    // No synchronous setState here: `live` is derived above rather than pushed
    // into state, and the first sample is already in the useState initializer,
    // so the effect's only job is owning the interval. Seeding a second sample
    // on mount was a cascading render for one frame nobody sees.
    const id = setInterval(() => {
      ticks.current += 1;
      setRows(sample());
      if (ticks.current >= MAX_TICKS) {
        clearInterval(id);
        setFrozen(true);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const totalCpu = rows.reduce((sum, r) => sum + r.cpu, 0);
  const load = (totalCpu / 100).toFixed(2);

  return (
    <div className="text-xs sm:text-sm">
      {/* Decorative animation isn't narrated key-by-key; this is what a screen
          reader hears instead. */}
      <span className="sr-only">
        A simulated process monitor listing portfolio services with mock CPU and memory usage.
      </span>

      <div aria-hidden="true" className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-fg/50">
          <span>
            tasks: <span className="text-fg/80">{rows.length}</span>
          </span>
          <span>
            load avg: <span className="text-fg/80">{load}</span>
          </span>
          <span className={live ? "text-primary" : "text-fg/40"}>
            {live ? "● live" : "○ frozen"}
          </span>
        </div>

        <div className="mt-1 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
          <span className="text-fg/40">PID</span>
          <span className="text-fg/40">COMMAND</span>
          <span className="text-fg/40 text-right">CPU%</span>
          {rows.map((r) => (
            <div key={r.pid} className="contents">
              <span className="text-fg/40">{r.pid}</span>
              <span className="truncate text-fg/80">
                {r.cmd}
                <span className="ml-2 text-fg/30">
                  {r.mem.toFixed(1)}m
                </span>
              </span>
              <span className={`text-right ${loadClass(r.cpu)}`}>
                <span className="mr-2 hidden sm:inline">{bar(r.cpu)}</span>
                {r.cpu.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-1 text-fg/30">
          {live ? "refreshing…" : "(snapshot — run `top` again to refresh)"}
        </p>
      </div>
    </div>
  );
}
