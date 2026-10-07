import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '%',
  accent = 'accent-cyan-400',
  onChange,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400 tracking-wide">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-200">
          {value}
          <span className="text-zinc-500">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1 rounded-full bg-white/[0.06] appearance-none cursor-pointer ${accent}`}
      />
    </div>
  );
};
