export function ColorSlider({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
  valueText,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
  valueText?: string;
}) {
  const id = `slider-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <label htmlFor={id} className="text-fg/60">
          {label}
        </label>
        <span className="text-fg/50">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valueText ?? `${value}${unit}`}
        className="color-slider"
      />
    </div>
  );
}
