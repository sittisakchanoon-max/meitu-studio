import React from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (val: number) => void;
  onCommit?: () => void;
  dark?: boolean;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  defaultValue = 0,
  unit = '',
  onChange,
  onCommit,
  dark = false,
}) => {
  const isModified = Math.abs(value - defaultValue) > 0.01;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onDoubleClick={() => {
            onChange(defaultValue);
            onCommit?.();
          }}
          title="Double-click to reset"
          className={`font-medium transition-colors flex items-center gap-1.5 ${
            dark ? 'text-zinc-200 hover:text-pink-400' : 'text-zinc-700 hover:text-pink-600'
          }`}
        >
          <span>{label}</span>
          {isModified && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block" />}
        </button>
        <div className="flex items-center gap-1.5">
          <span
            className={`tabular-nums px-1.5 py-0.5 rounded text-[11px] font-semibold ${
              isModified
                ? 'bg-pink-500/15 text-pink-500'
                : dark
                  ? 'text-zinc-400 bg-zinc-800'
                  : 'text-zinc-500 bg-zinc-100'
            }`}
          >
            {value > 0 && min < 0 ? `+${Math.round(value)}` : Math.round(value)}
            {unit}
          </span>
          {isModified && (
            <button
              type="button"
              onClick={() => {
                onChange(defaultValue);
                onCommit?.();
              }}
              className="text-[10px] text-zinc-400 hover:text-pink-500 transition-colors"
              title="Reset"
            >
              ↺
            </button>
          )}
        </div>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={() => onCommit?.()}
          onTouchEnd={() => onCommit?.()}
          className="meitu-slider"
          style={{
            background:
              min < 0
                ? `linear-gradient(to right, rgba(255,79,123,0.18) 0%, rgba(255,79,123,0.18) ${Math.min(50, pct)}%, #ff4f7b ${Math.min(50, pct)}%, #ff4f7b ${Math.max(50, pct)}%, rgba(255,79,123,0.18) ${Math.max(50, pct)}%, rgba(255,79,123,0.18) 100%)`
                : `linear-gradient(to right, #ff4f7b 0%, #ff4f7b ${pct}%, rgba(255,79,123,0.18) ${pct}%, rgba(255,79,123,0.18) 100%)`,
          }}
        />
      </div>
    </div>
  );
};
