"use client";

import { useId, type CSSProperties } from "react";

export function ColorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
  track,
  valueText,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  /** Fired once the drag/keypress settles — use for anything expensive. */
  onCommit?: (value: number) => void;
  /** CSS background for the track. Falls back to a primary-filled bar. */
  track?: string;
  valueText?: string;
}) {
  const id = useId();
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[11px]">
        <label htmlFor={id} className="uppercase tracking-[0.15em] text-fg/50">
          {label}
        </label>
        <span className="tabular-nums text-fg/70">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => onCommit?.(value)}
        onKeyUp={() => onCommit?.(value)}
        aria-valuetext={valueText ?? `${value}${unit}`}
        className="color-slider"
        style={
          {
            "--slider-fill": `${pct}%`,
            ...(track ? { "--slider-track": track } : {}),
          } as CSSProperties
        }
      />
    </div>
  );
}
