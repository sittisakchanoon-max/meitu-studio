import React, { useMemo, useRef, useState } from 'react';
import { buildCurveLUT } from '../engine/colorEngine';
import { CurvePoint, CurveSettings } from '../types/editor';

interface CurveEditorProps {
  curves: CurveSettings;
  onChange: (next: CurveSettings) => void;
  onCommit: () => void;
  hint: string;
  resetLabel: string;
  dark?: boolean;
}

type ChannelKey = 'rgb' | 'r' | 'g' | 'b';

const CHANNELS: Array<{ key: ChannelKey; label: string; stroke: string; badge: string }> = [
  { key: 'rgb', label: 'RGB', stroke: '#ff4f7b', badge: 'bg-zinc-800 text-white' },
  { key: 'r', label: 'Red', stroke: '#ef4444', badge: 'bg-red-500 text-white' },
  { key: 'g', label: 'Green', stroke: '#22c55e', badge: 'bg-emerald-500 text-white' },
  { key: 'b', label: 'Blue', stroke: '#3b82f6', badge: 'bg-blue-500 text-white' },
];

export const CurveEditor: React.FC<CurveEditorProps> = ({
  curves,
  onChange,
  onCommit,
  hint,
  resetLabel,
  dark = false,
}) => {
  const [channel, setChannel] = useState<ChannelKey>('rgb');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const points = curves[channel];
  const activeMeta = CHANNELS.find((c) => c.key === channel)!;

  const pathD = useMemo(() => {
    const lut = buildCurveLUT(points);
    const cmds: string[] = [];
    for (let x = 0; x <= 255; x += 3) {
      const y = 255 - lut[x];
      cmds.push(`${x === 0 ? 'M' : 'L'}${x},${y}`);
    }
    cmds.push(`L255,${255 - lut[255]}`);
    return cmds.join(' ');
  }, [points]);

  const getSvgCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, ((e.clientX - rect.left) / rect.width) * 255));
    const y = Math.max(0, Math.min(255, 255 - ((e.clientY - rect.top) / rect.height) * 255));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const updateChannel = (nextPts: CurvePoint[]) => {
    onChange({ ...curves, [channel]: nextPts });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const { x, y } = getSvgCoords(e);
    // Check if near an existing point
    let hitIdx = -1;
    let bestDist = 20;
    points.forEach((p, idx) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        hitIdx = idx;
      }
    });

    if (hitIdx >= 0) {
      setDragIdx(hitIdx);
    } else if (points.length < 8) {
      const next = [...points, { x, y }].sort((a, b) => a.x - b.x);
      const newIdx = next.findIndex((p) => p.x === x && p.y === y);
      updateChannel(next);
      setDragIdx(newIdx);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIdx === null) return;
    const { x, y } = getSvgCoords(e);
    const next = points.map((p, idx) => {
      if (idx !== dragIdx) return p;
      // Endpoints stay clamped near edges, interior points constrained between neighbors
      const minX = idx === 0 ? 0 : points[idx - 1].x + 6;
      const maxX = idx === points.length - 1 ? 255 : points[idx + 1].x - 6;
      const nx = idx === 0 ? 0 : idx === points.length - 1 ? 255 : Math.max(minX, Math.min(maxX, x));
      return { x: nx, y };
    });
    updateChannel(next);
  };

  const handlePointerUp = () => {
    if (dragIdx !== null) {
      setDragIdx(null);
      onCommit();
    }
  };

  const removePoint = (idx: number) => {
    if (idx === 0 || idx === points.length - 1) return;
    const next = points.filter((_, i) => i !== idx);
    updateChannel(next);
    onCommit();
  };

  const applyCurvePreset = (pts: CurvePoint[]) => {
    updateChannel(pts);
    onCommit();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannel(c.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                channel === c.key
                  ? c.badge + ' shadow-sm scale-105'
                  : dark
                    ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            applyCurvePreset([
              { x: 0, y: 0 },
              { x: 255, y: 255 },
            ])
          }
          className="text-xs text-pink-500 hover:text-pink-600 font-medium"
        >
          {resetLabel}
        </button>
      </div>

      {/* Curve Presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          {
            label: 'S-Contrast',
            pts: [
              { x: 0, y: 0 },
              { x: 64, y: 48 },
              { x: 192, y: 210 },
              { x: 255, y: 255 },
            ],
          },
          {
            label: 'Soft Matte',
            pts: [
              { x: 0, y: 28 },
              { x: 90, y: 98 },
              { x: 255, y: 244 },
            ],
          },
          {
            label: 'Bright Airy',
            pts: [
              { x: 0, y: 12 },
              { x: 128, y: 154 },
              { x: 255, y: 255 },
            ],
          },
          {
            label: 'Deep Mood',
            pts: [
              { x: 0, y: 0 },
              { x: 128, y: 102 },
              { x: 255, y: 245 },
            ],
          },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyCurvePreset(preset.pts)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
              dark
                ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-pink-500'
                : 'border-pink-100 bg-pink-50/70 text-pink-700 hover:bg-pink-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Interactive SVG Curve Graph */}
      <div
        className={`relative rounded-xl overflow-hidden border touch-none ${
          dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-pink-100 shadow-inner'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 255 255"
          className="w-full aspect-square cursor-crosshair block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Grid lines */}
          {[64, 128, 192].map((g) => (
            <React.Fragment key={g}>
              <line
                x1={g}
                y1={0}
                x2={g}
                y2={255}
                stroke={dark ? '#27272a' : '#fce7f3'}
                strokeWidth={1}
              />
              <line
                x1={0}
                y1={g}
                x2={255}
                y2={g}
                stroke={dark ? '#27272a' : '#fce7f3'}
                strokeWidth={1}
              />
            </React.Fragment>
          ))}
          {/* Diagonal baseline */}
          <line
            x1={0}
            y1={255}
            x2={255}
            y2={0}
            stroke={dark ? '#3f3f46' : '#f4d0dc'}
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          {/* Spline path */}
          <path
            d={pathD}
            fill="none"
            stroke={activeMeta.stroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Control points */}
          {points.map((p, idx) => (
            <circle
              key={`${idx}-${p.x}`}
              cx={p.x}
              cy={255 - p.y}
              r={dragIdx === idx ? 8 : 6.5}
              fill="#ffffff"
              stroke={activeMeta.stroke}
              strokeWidth={3}
              className="cursor-grab active:cursor-grabbing"
              onDoubleClick={(e) => {
                e.stopPropagation();
                removePoint(idx);
              }}
            />
          ))}
        </svg>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">{hint}</p>
    </div>
  );
};
