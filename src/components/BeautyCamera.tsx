import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  Download,
  FlipHorizontal,
  Grid3x3,
  RefreshCw,
  Sparkles,
  Timer,
  Wand2,
} from 'lucide-react';
import { useT } from '../i18n/translations';
import { Language, ThemeMode } from '../types/editor';
import { MeituBrandPill } from './MeituIcons';

interface BeautyCameraProps {
  lang: Language;
  theme: ThemeMode;
  onBackHome: () => void;
  onCaptureToEditor: (dataUrl: string) => void;
}

const LIVE_FILTERS = [
  { id: 'none', nameTh: 'ต้นฉบับ', nameEn: 'Original', css: '' },
  { id: 'cotton', nameTh: 'ฝ้าย', nameEn: 'Cotton', css: 'brightness(1.08) contrast(0.94) saturate(0.95)' },
  { id: 'ricoh', nameTh: 'แฟลช Ricoh', nameEn: 'Ricoh', css: 'brightness(1.1) contrast(1.12) saturate(0.95)' },
  { id: 'sakura', nameTh: 'ซากุระ', nameEn: 'Sakura', css: 'brightness(1.09) contrast(0.95) saturate(1.12) hue-rotate(-6deg)' },
  { id: 'cream', nameTh: 'ครีมโซล', nameEn: 'K-Cream', css: 'brightness(1.12) contrast(0.92) saturate(0.88) sepia(0.1)' },
  { id: 'peach', nameTh: 'พีชสดใส', nameEn: 'Peach', css: 'brightness(1.08) saturate(1.22) sepia(0.12) hue-rotate(-10deg)' },
  { id: 'mono', nameTh: 'ขาวดำ', nameEn: 'B&W', css: 'grayscale(1) contrast(1.2)' },
];

export const BeautyCamera: React.FC<BeautyCameraProps> = ({
  lang,
  onBackHome,
  onCaptureToEditor,
}) => {
  const t = useT(lang);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [beautyLevel, setBeautyLevel] = useState(48);
  const [filterId, setFilterId] = useState('cotton');
  const [openDrawer, setOpenDrawer] = useState<'none' | 'filters' | 'beauty'>('none');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const activeFilter = LIVE_FILTERS.find((f) => f.id === filterId) ?? LIVE_FILTERS[0];
  const combinedCssFilter = `${activeFilter.css} brightness(${1 + (beautyLevel / 100) * 0.12}) contrast(${1 - (beautyLevel / 100) * 0.05})`.trim();

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const snapNow = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 160);

    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d')!;
    ctx.filter = combinedCssFilter;
    if (mirror) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    if (beautyLevel > 10) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = (beautyLevel / 100) * 0.16;
      ctx.filter = 'blur(12px)';
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    }
    setCapturedUrl(c.toDataURL('image/jpeg', 0.94));
  };

  const triggerCapture = () => {
    if (timerSec === 0) {
      snapNow();
      return;
    }
    setCountdown(timerSec);
    let left = timerSec;
    const iv = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(iv);
        setCountdown(null);
        snapNow();
      } else {
        setCountdown(left);
      }
    }, 1000);
  };

  return (
    <div className="h-[100dvh] w-screen bg-black text-white flex flex-col overflow-hidden select-none relative">
      {/* Floating Meitu Camera Top Controls */}
      <header className="absolute top-0 inset-x-0 z-30 safe-top px-3 pb-2 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent">
        <button
          type="button"
          onClick={onBackHome}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-90"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.8]" />
        </button>

        <MeituBrandPill />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : 0))}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
              timerSec > 0 ? 'bg-[#FF4F7B] text-white' : 'bg-black/40 text-white/90'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            {timerSec > 0 ? `${timerSec}s` : ''}
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              showGrid ? 'bg-white text-black' : 'bg-black/40 text-white/90'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMirror((m) => !m)}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              mirror ? 'bg-white text-black' : 'bg-black/40 text-white/90'
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Edge-to-Edge Live Viewfinder */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="max-w-xs text-center p-6 space-y-4">
            <Camera className="w-12 h-12 text-[#FF4F7B] mx-auto opacity-85" />
            <p className="text-xs text-zinc-300 leading-relaxed">{t('cameraPermissionError')}</p>
            <button
              type="button"
              onClick={onBackHome}
              className="px-5 py-2.5 rounded-full meitu-gradient text-white text-xs font-semibold"
            >
              {t('home')}
            </button>
          </div>
        ) : capturedUrl ? (
          <img src={capturedUrl} alt="Captured" className="w-full h-full object-contain" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                filter: combinedCssFilter,
                transform: mirror ? 'scaleX(-1)' : undefined,
              }}
            />
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/60" />
                ))}
              </div>
            )}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="text-7xl font-black text-white drop-shadow-2xl">{countdown}</span>
              </div>
            )}
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white z-40 pointer-events-none" />}
      </div>

      {/* Collapsible Filter / Beauty Mini-Sheet above Shutter */}
      {!capturedUrl && openDrawer !== 'none' && (
        <div className="bg-black/85 backdrop-blur-md px-4 py-3 border-t border-white/10">
          {openDrawer === 'beauty' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/85 shrink-0">
                {lang === 'th' ? 'บิวตี้ผิวใส' : 'Beauty'}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={beautyLevel}
                onChange={(e) => setBeautyLevel(Number(e.target.value))}
                className="meitu-white-slider"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${beautyLevel}%, rgba(255,255,255,0.22) ${beautyLevel}%, rgba(255,255,255,0.22) 100%)`,
                }}
              />
              <span className="text-xs font-semibold w-8 text-right">{beautyLevel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {LIVE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterId(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap ${
                    filterId === f.id ? 'bg-white text-black font-semibold' : 'bg-[#1C1C1E] text-zinc-300'
                  }`}
                >
                  {lang === 'th' ? f.nameTh : f.nameEn}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Authentic Meitu Camera Bottom Shutter Bar */}
      <div className="bg-black px-6 pt-4 pb-4 safe-bottom border-t border-white/[0.06]">
        {capturedUrl ? (
          <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setCapturedUrl(null)}
              className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center"
              title={t('retake')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onCaptureToEditor(capturedUrl)}
              className="flex-1 py-3.5 rounded-full meitu-gradient text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" /> {t('editCaptured')}
            </button>
            <a
              href={capturedUrl}
              download={`meitu-cam-${Date.now()}.jpg`}
              className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-around max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setOpenDrawer((d) => (d === 'filters' ? 'none' : 'filters'))}
              className={`flex flex-col items-center gap-1 ${
                openDrawer === 'filters' ? 'text-[#FF4F7B]' : 'text-white/90'
              }`}
            >
              <Wand2 className="w-5 h-5 stroke-[1.7]" />
              <span className="text-[11px]">{lang === 'th' ? 'ฟิลเตอร์' : 'Filters'}</span>
            </button>

            {/* Iconic Meitu Double-Ring Pink Shutter */}
            <button
              type="button"
              disabled={error || countdown !== null}
              onClick={triggerCapture}
              className="w-[72px] h-[72px] rounded-full border-[3.5px] border-white p-1.5 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-35"
              aria-label={t('capture')}
            >
              <span className="w-full h-full rounded-full meitu-gradient shadow-[0_0_20px_rgba(255,79,123,0.5)]" />
            </button>

            <button
              type="button"
              onClick={() => setOpenDrawer((d) => (d === 'beauty' ? 'none' : 'beauty'))}
              className={`flex flex-col items-center gap-1 ${
                openDrawer === 'beauty' ? 'text-[#FF4F7B]' : 'text-white/90'
              }`}
            >
              <Sparkles className="w-5 h-5 stroke-[1.7]" />
              <span className="text-[11px]">{lang === 'th' ? 'บิวตี้' : 'Beauty'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
