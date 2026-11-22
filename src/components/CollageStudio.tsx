import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ImagePlus,
  Trash2,
  Wand2,
} from 'lucide-react';
import { SAMPLE_PHOTOS } from '../data/presets';
import { useT } from '../i18n/translations';
import { Language, ThemeMode } from '../types/editor';

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
  cells: CollageCellRect[];
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: '2_v', cells: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: '2_h', cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] },
  { id: '3_hero', cells: [{ x: 0, y: 0, w: 0.58, h: 1 }, { x: 0.58, y: 0, w: 0.42, h: 0.5 }, { x: 0.58, y: 0.5, w: 0.42, h: 0.5 }] },
  { id: '3_strip', cells: [{ x: 0, y: 0, w: 1, h: 1 / 3 }, { x: 0, y: 1 / 3, w: 1, h: 1 / 3 }, { x: 0, y: 2 / 3, w: 1, h: 1 / 3 }] },
  { id: '4_grid', cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
  { id: '4_bento', cells: [{ x: 0, y: 0, w: 0.6, h: 0.55 }, { x: 0.6, y: 0, w: 0.4, h: 0.35 }, { x: 0.6, y: 0.35, w: 0.4, h: 0.65 }, { x: 0, y: 0.55, w: 0.6, h: 0.45 }] },
  { id: '4_featured', cells: [{ x: 0, y: 0, w: 1, h: 0.58 }, { x: 0, y: 0.58, w: 1 / 3, h: 0.42 }, { x: 1 / 3, y: 0.58, w: 1 / 3, h: 0.42 }, { x: 2 / 3, y: 0.58, w: 1 / 3, h: 0.42 }] },
  { id: '6_grid', cells: [{ x: 0, y: 0, w: 0.5, h: 1 / 3 }, { x: 0.5, y: 0, w: 0.5, h: 1 / 3 }, { x: 0, y: 1 / 3, w: 0.5, h: 1 / 3 }, { x: 0.5, y: 1 / 3, w: 0.5, h: 1 / 3 }, { x: 0, y: 2 / 3, w: 0.5, h: 1 / 3 }, { x: 0.5, y: 2 / 3, w: 0.5, h: 1 / 3 }] },
  {
    id: '9_grid',
    cells: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
  },
];

const BG_PRESETS = [
  { id: 'white', value: '#FFFFFF' },
  { id: 'pink', value: '#FFE3EC' },
  { id: 'cream', value: '#FFF6EB' },
  { id: 'lavender', value: '#F0E6FF' },
  { id: 'dark', value: '#18181B' },
  { id: 'grad_sakura', value: 'linear-gradient(135deg,#FF9A9E,#FAD0C4)' },
  { id: 'grad_cotton', value: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)' },
];

const ASPECTS: Array<{ id: string; w: number; h: number }> = [
  { id: '1:1', w: 1200, h: 1200 },
  { id: '3:4', w: 1080, h: 1440 },
  { id: '4:5', w: 1080, h: 1350 },
  { id: '9:16', w: 1080, h: 1920 },
  { id: '4:3', w: 1440, h: 1080 },
  { id: '16:9', w: 1600, h: 900 },
];

type CollageTab = 'layout' | 'ratio' | 'border' | 'bg' | 'photos';

export const CollageStudio: React.FC<CollageStudioProps> = ({
  lang,
  onBackHome,
  onSendToEditor,
}) => {
  const t = useT(lang);
  const [tab, setTab] = useState<CollageTab>('layout');
  const [photoSrcs, setPhotoSrcs] = useState<string[]>(() => SAMPLE_PHOTOS.map((s) => s.src));
  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [layoutId, setLayoutId] = useState('4_bento');
  const [aspectId, setAspectId] = useState('3:4');
  const [spacing, setSpacing] = useState(14);
  const [margin, setMargin] = useState(20);
  const [radius, setRadius] = useState(20);
  const [bgId, setBgId] = useState('white');
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeLayout = COLLAGE_LAYOUTS.find((l) => l.id === layoutId) ?? COLLAGE_LAYOUTS[4];
  const activeAspect = ASPECTS.find((a) => a.id === aspectId) ?? ASPECTS[1];

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = activeAspect.w;
    const H = activeAspect.h;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

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
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const cellRatio = cw / ch;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (imgRatio > cellRatio) {
          sw = img.naturalHeight * cellRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / cellRatio;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cw, ch);
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
    const urls = Array.from(files).slice(0, 9).map((f) => URL.createObjectURL(f));
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
    if (swapFrom === null) setSwapFrom(hitIdx);
    else if (swapFrom === hitIdx) setSwapFrom(null);
    else {
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
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/jpeg', 0.94);
    a.download = `meitu-collage-${Date.now()}.jpg`;
    a.click();
  };

  const bottomTabs: Array<{ id: CollageTab; label: string }> = [
    { id: 'layout', label: lang === 'th' ? 'เลย์เอาต์' : 'Layout' },
    { id: 'ratio', label: lang === 'th' ? 'สัดส่วน' : 'Ratio' },
    { id: 'border', label: lang === 'th' ? 'ขอบ & มุม' : 'Border' },
    { id: 'bg', label: lang === 'th' ? 'พื้นหลัง' : 'Backdrop' },
    { id: 'photos', label: lang === 'th' ? 'รูปภาพ' : 'Photos' },
  ];

  return (
    <div className="h-[100dvh] w-screen bg-black text-white flex flex-col overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleAddFiles(e.target.files)}
      />

      {/* Sleek Meitu Top Bar */}
      <header className="shrink-0 px-3 pb-2 safe-top flex items-center justify-between bg-black z-20">
        <button
          type="button"
          onClick={onBackHome}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-90"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.8]" />
        </button>

        <span className="text-[14px] font-semibold">
          {lang === 'th' ? 'ภาพปะติด' : 'Collage'}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canvasRef.current && onSendToEditor(canvasRef.current.toDataURL('image/png'))}
            className="p-2 rounded-full bg-[#1C1C1E] text-white/90"
            title={t('editCaptured')}
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-1.5 rounded-full meitu-gradient text-white text-[13px] font-semibold"
          >
            {lang === 'th' ? 'บันทึก' : 'Save'}
          </button>
        </div>
      </header>

      {/* Huge Centered Collage Stage */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="max-h-[62dvh] max-w-[94vw] w-auto h-auto rounded-xl shadow-2xl cursor-pointer"
        />
        <p className="mt-2 text-[10.5px] text-[#8E8E93]">{t('swapHint')}</p>
      </div>

      {/* Authentic Meitu OLED Black Bottom Sheet */}
      <div className="shrink-0 bg-black border-t border-white/[0.06]">
        <div className="px-4 py-3 min-h-[96px] flex items-center">
          {/* WIREFRAME MINI LAYOUT SVGs */}
          {tab === 'layout' && (
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full">
              {COLLAGE_LAYOUTS.map((l) => {
                const active = layoutId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayoutId(l.id)}
                    className={`shrink-0 w-12 h-14 p-1.5 rounded-[10px] transition-all active:scale-95 ${
                      active ? 'bg-white' : 'bg-[#18181A]'
                    }`}
                  >
                    <svg viewBox="0 0 100 120" className="w-full h-full">
                      {l.cells.map((c, idx) => (
                        <rect
                          key={idx}
                          x={c.x * 100 + 3}
                          y={c.y * 120 + 3}
                          width={Math.max(4, c.w * 100 - 6)}
                          height={Math.max(4, c.h * 120 - 6)}
                          rx="6"
                          fill={active ? '#FF4F7B' : '#52525B'}
                        />
                      ))}
                    </svg>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'ratio' && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar w-full">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectId(a.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 ${
                    aspectId === a.id ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93]'
                  }`}
                >
                  {a.id}
                </button>
              ))}
            </div>
          )}

          {tab === 'border' && (
            <div className="w-full space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#8E8E93] w-14">{t('spacing')}</span>
                <input type="range" min={0} max={50} value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="meitu-white-slider" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#8E8E93] w-14">{t('margin')}</span>
                <input type="range" min={0} max={80} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="meitu-white-slider" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#8E8E93] w-14">{t('cornerRadius')}</span>
                <input type="range" min={0} max={80} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="meitu-white-slider" />
              </div>
            </div>
          )}

          {tab === 'bg' && (
            <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar w-full">
              {BG_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBgId(b.id)}
                  className={`w-9 h-9 rounded-full shrink-0 border-2 ${
                    bgId === b.id ? 'border-[#FF4F7B] scale-110' : 'border-white/25'
                  }`}
                  style={{ background: b.value }}
                />
              ))}
            </div>
          )}

          {tab === 'photos' && (
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-xl bg-[#1C1C1E] border border-dashed border-white/25 flex flex-col items-center justify-center gap-1 shrink-0 text-[#FF4F7B]"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{lang === 'th' ? 'เพิ่มรูป' : 'Add'}</span>
              </button>
              {photoSrcs.map((src, i) => (
                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {photoSrcs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPhotoSrcs((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meitu Bottom Tab Bar with `#FF4F7B` underline */}
        <div className="h-[50px] px-4 flex items-center justify-around safe-bottom border-t border-white/[0.06]">
          {bottomTabs.map((bt) => (
            <button
              key={bt.id}
              type="button"
              onClick={() => setTab(bt.id)}
              className={`relative py-2 text-[13px] ${
                tab === bt.id ? 'text-white font-semibold' : 'text-[#8E8E93]'
              }`}
            >
              {bt.label}
              {tab === bt.id && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2.5px] rounded-full bg-[#FF4F7B]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
