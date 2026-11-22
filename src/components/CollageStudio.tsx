import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { SAMPLE_PHOTOS } from '../data/presets';
import { useT } from '../i18n/translations';
import { Language, ThemeMode } from '../types/editor';
import { SliderControl } from './SliderControl';

interface CollageStudioProps {
  lang: Language;
  theme: ThemeMode;
  onBackHome: () => void;
  onSendToEditor: (dataUrl: string) => void;
}

interface CollageCellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CollageLayout {
  id: string;
  name: string;
  minPhotos: number;
  cells: CollageCellRect[];
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  {
    id: '2_v',
    name: '2 Vertical',
    minPhotos: 2,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: '2_h',
    name: '2 Horizontal',
    minPhotos: 2,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: '3_hero',
    name: '3 Magazine',
    minPhotos: 3,
    cells: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 0.5 },
      { x: 0.58, y: 0.5, w: 0.42, h: 0.5 },
    ],
  },
  {
    id: '3_strip',
    name: '3 Film Strip',
    minPhotos: 3,
    cells: [
      { x: 0, y: 0, w: 1, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1, h: 1 / 3 },
    ],
  },
  {
    id: '4_grid',
    name: '4 Classic Grid',
    minPhotos: 4,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: '4_featured',
    name: '4 Hero Top',
    minPhotos: 4,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.58, w: 1 / 3, h: 0.42 },
      { x: 1 / 3, y: 0.58, w: 1 / 3, h: 0.42 },
      { x: 2 / 3, y: 0.58, w: 1 / 3, h: 0.42 },
    ],
  },
  {
    id: '4_bento',
    name: '4 Meitu Bento',
    minPhotos: 4,
    cells: [
      { x: 0, y: 0, w: 0.6, h: 0.55 },
      { x: 0.6, y: 0, w: 0.4, h: 0.35 },
      { x: 0.6, y: 0.35, w: 0.4, h: 0.65 },
      { x: 0, y: 0.55, w: 0.6, h: 0.45 },
    ],
  },
  {
    id: '6_grid',
    name: '6 Grid',
    minPhotos: 6,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 0, w: 0.5, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 1 / 3, w: 0.5, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 2 / 3, w: 0.5, h: 1 / 3 },
    ],
  },
  {
    id: '9_grid',
    name: '9 Square Grid',
    minPhotos: 9,
    cells: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
  },
];

const BG_PRESETS = [
  { id: 'white', label: 'White', value: '#FFFFFF' },
  { id: 'pink', label: 'Meitu Pink', value: '#FFE3EC' },
  { id: 'cream', label: 'Cream', value: '#FFF6EB' },
  { id: 'lavender', label: 'Lavender', value: '#F0E6FF' },
  { id: 'dark', label: 'Studio Black', value: '#18181B' },
  { id: 'grad_sakura', label: 'Sakura Grad', value: 'linear-gradient(135deg,#FF9A9E,#FAD0C4)' },
  { id: 'grad_cotton', label: 'Cotton Grad', value: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)' },
];

const ASPECTS: Array<{ id: string; w: number; h: number }> = [
  { id: '1:1', w: 1200, h: 1200 },
  { id: '3:4', w: 1080, h: 1440 },
  { id: '4:5', w: 1080, h: 1350 },
  { id: '9:16', w: 1080, h: 1920 },
  { id: '4:3', w: 1440, h: 1080 },
  { id: '16:9', w: 1600, h: 900 },
];

export const CollageStudio: React.FC<CollageStudioProps> = ({
  lang,
  theme,
  onBackHome,
  onSendToEditor,
}) => {
  const t = useT(lang);
  const dark = theme === 'dark';

  const [photoSrcs, setPhotoSrcs] = useState<string[]>(() => SAMPLE_PHOTOS.map((s) => s.src));
  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [layoutId, setLayoutId] = useState('4_bento');
  const [aspectId, setAspectId] = useState('3:4');
  const [spacing, setSpacing] = useState(14);
  const [margin, setMargin] = useState(20);
  const [radius, setRadius] = useState(20);
  const [bgId, setBgId] = useState('pink');
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeLayout = COLLAGE_LAYOUTS.find((l) => l.id === layoutId) ?? COLLAGE_LAYOUTS[4];
  const activeAspect = ASPECTS.find((a) => a.id === aspectId) ?? ASPECTS[1];

  // Load images whenever photoSrcs changes
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      photoSrcs.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = src;
          })
      )
    ).then((imgs) => {
      if (!cancelled) setLoadedImgs(imgs);
    });
    return () => {
      cancelled = true;
    };
  }, [photoSrcs]);

  // Render collage canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = activeAspect.w;
    const H = activeAspect.h;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Draw background
    const bg = BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0];
    if (bg.value.startsWith('linear-gradient')) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (bgId === 'grad_sakura') {
        grad.addColorStop(0, '#FF9A9E');
        grad.addColorStop(1, '#FAD0C4');
      } else {
        grad.addColorStop(0, '#FBC2EB');
        grad.addColorStop(1, '#A6C1EE');
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg.value;
    }
    ctx.fillRect(0, 0, W, H);

    const innerW = W - margin * 2;
    const innerH = H - margin * 2;
    const halfGap = spacing / 2;

    activeLayout.cells.forEach((cell, idx) => {
      const x = margin + cell.x * innerW + (cell.x > 0.001 ? halfGap : 0);
      const y = margin + cell.y * innerH + (cell.y > 0.001 ? halfGap : 0);
      const cw =
        cell.w * innerW -
        (cell.x > 0.001 ? halfGap : 0) -
        (cell.x + cell.w < 0.999 ? halfGap : 0);
      const ch =
        cell.h * innerH -
        (cell.y > 0.001 ? halfGap : 0) -
        (cell.y + cell.h < 0.999 ? halfGap : 0);

      ctx.save();
      const r = Math.min(radius, cw / 2, ch / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + cw, y, x + cw, y + ch, r);
      ctx.arcTo(x + cw, y + ch, x, y + ch, r);
      ctx.arcTo(x, y + ch, x, y, r);
      ctx.arcTo(x, y, x + cw, y, r);
      ctx.closePath();
      ctx.clip();

      const img = loadedImgs[idx % Math.max(1, loadedImgs.length)];
      if (img && img.naturalWidth > 0) {
        // Object-fit: cover
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const cellRatio = cw / ch;
        let sx = 0,
          sy = 0,
          sw = img.naturalWidth,
          sh = img.naturalHeight;
        if (imgRatio > cellRatio) {
          sw = img.naturalHeight * cellRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / cellRatio;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cw, ch);
      } else {
        ctx.fillStyle = 'rgba(255,79,123,0.12)';
        ctx.fillRect(x, y, cw, ch);
      }

      if (swapFrom === idx) {
        ctx.strokeStyle = '#FF4F7B';
        ctx.lineWidth = 10;
        ctx.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
      }

      ctx.restore();
    });
  }, [loadedImgs, activeLayout, activeAspect, spacing, margin, radius, bgId, swapFrom]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files)
      .slice(0, 9)
      .map((f) => URL.createObjectURL(f));
    setPhotoSrcs((prev) => [...urls, ...prev].slice(0, 9));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const hitIdx = activeLayout.cells.findIndex(
      (c) => nx >= c.x && nx <= c.x + c.w && ny >= c.y && ny <= c.y + c.h
    );
    if (hitIdx < 0) return;

    if (swapFrom === null) {
      setSwapFrom(hitIdx);
    } else if (swapFrom === hitIdx) {
      setSwapFrom(null);
    } else {
      setPhotoSrcs((prev) => {
        const next = [...prev];
        const a = swapFrom % next.length;
        const b = hitIdx % next.length;
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
      setSwapFrom(null);
    }
  };

  const handleExport = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/jpeg', 0.94);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meitu-collage-${Date.now()}.jpg`;
    a.click();
  };

  const handleEditInStudio = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    onSendToEditor(url);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        dark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FFF7F9] text-zinc-800'
      }`}
    >
      <header
        className={`h-14 shrink-0 px-4 border-b flex items-center justify-between ${
          dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackHome}
            className="p-2 rounded-xl hover:bg-pink-500/10"
          >
            <ArrowLeft className="w-5 h-5 text-pink-500" />
          </button>
          <h1 className="font-bold text-sm sm:text-base">{t('collageTitle')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEditInStudio}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              dark ? 'border-zinc-700 bg-zinc-800' : 'border-pink-200 bg-pink-50 text-pink-600'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('editCaptured')}</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-xl meitu-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-4 h-4" /> {t('save')}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Preview Stage */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 overflow-auto">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="max-h-[54vh] lg:max-h-[78vh] max-w-[92vw] lg:max-w-[60vw] w-auto h-auto rounded-2xl shadow-2xl cursor-pointer"
          />
          <p className="mt-2.5 text-[11px] text-zinc-400">{t('swapHint')}</p>
        </div>

        {/* Right Controls */}
        <aside
          className={`w-full lg:w-84 shrink-0 border-t lg:border-t-0 lg:border-l p-4 overflow-y-auto space-y-5 max-h-[38vh] lg:max-h-none ${
            dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100'
          }`}
        >
          {/* Add Photos */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl meitu-gradient text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ImagePlus className="w-4 h-4" /> {t('addPhotos')}
              </button>
              <button
                type="button"
                onClick={() => setPhotoSrcs(SAMPLE_PHOTOS.map((s) => s.src))}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1 ${
                  dark ? 'border-zinc-700 bg-zinc-800' : 'border-pink-200 bg-pink-50 text-pink-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Demo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {photoSrcs.map((src, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-pink-200">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {photoSrcs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPhotoSrcs((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/65 text-white rounded-full p-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Layouts */}
          <div>
            <div className="text-xs font-bold mb-2">{t('layout')}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {COLLAGE_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayoutId(l.id)}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                    layoutId === l.id
                      ? 'meitu-gradient text-white shadow-sm'
                      : dark
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-pink-50 text-zinc-700'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <div className="text-xs font-bold mb-2">{t('aspectRatio')}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectId(a.id)}
                  className={`py-1.5 rounded-lg text-xs font-semibold ${
                    aspectId === a.id
                      ? 'meitu-gradient text-white'
                      : dark
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-pink-50 text-zinc-700'
                  }`}
                >
                  {a.id}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing / Margin / Corners */}
          <div className="space-y-3">
            <SliderControl label={t('spacing')} value={spacing} min={0} max={50} defaultValue={14} onChange={setSpacing} dark={dark} />
            <SliderControl label={t('margin')} value={margin} min={0} max={80} defaultValue={20} onChange={setMargin} dark={dark} />
            <SliderControl label={t('cornerRadius')} value={radius} min={0} max={80} defaultValue={20} onChange={setRadius} dark={dark} />
          </div>

          {/* Background */}
          <div>
            <div className="text-xs font-bold mb-2">{t('background')}</div>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.label}
                  onClick={() => setBgId(b.id)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    bgId === b.id ? 'border-pink-500 scale-110' : 'border-zinc-300'
                  }`}
                  style={{ background: b.value }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
