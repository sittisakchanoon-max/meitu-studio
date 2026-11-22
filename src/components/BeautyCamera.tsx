import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
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

interface BeautyCameraProps {
  lang: Language;
  theme: ThemeMode;
  onBackHome: () => void;
  onCaptureToEditor: (dataUrl: string) => void;
}

const LIVE_FILTERS = [
  { id: 'none', nameTh: 'ต้นฉบับ', nameEn: 'Natural', css: '' },
  { id: 'sakura', nameTh: 'ซากุระบิวตี้', nameEn: 'Sakura', css: 'brightness(1.09) contrast(0.95) saturate(1.12) hue-rotate(-6deg)' },
  { id: 'cream', nameTh: 'ครีมเกาหลี', nameEn: 'K-Cream', css: 'brightness(1.12) contrast(0.92) saturate(0.88) sepia(0.1)' },
  { id: 'peach', nameTh: 'พีชสดใส', nameEn: 'Peach', css: 'brightness(1.08) saturate(1.22) sepia(0.12) hue-rotate(-10deg)' },
  { id: 'tokyo', nameTh: 'โตเกียวบลู', nameEn: 'Tokyo', css: 'brightness(1.06) contrast(0.96) saturate(0.92) hue-rotate(12deg)' },
  { id: 'ccd', nameTh: 'ฟิล์ม CCD', nameEn: 'CCD 2004', css: 'contrast(1.15) saturate(1.14) sepia(0.08)' },
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
  const [showGrid, setShowGrid] = useState(true);
  const [timerSec, setTimerSec] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [beautyLevel, setBeautyLevel] = useState(45);
  const [filterId, setFilterId] = useState('sakura');
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
    setTimeout(() => setFlash(false), 180);

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

    // Subtle beauty soft glow pass
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
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 z-20">
        <button
          type="button"
          onClick={onBackHome}
          className="p-2 rounded-xl hover:bg-zinc-800 flex items-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-5 h-5 text-pink-500" />
          <span>{t('cameraTitle')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMirror((m) => !m)}
            className={`p-2 rounded-xl ${mirror ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
            title={t('mirror')}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`p-2 rounded-xl ${showGrid ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
            title={t('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : 0))}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${
              timerSec > 0 ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Timer className="w-4 h-4" /> {timerSec === 0 ? 'OFF' : `${timerSec}s`}
          </button>
        </div>
      </header>

      {/* Camera Viewfinder */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="max-w-sm text-center p-6 space-y-4">
            <Camera className="w-12 h-12 text-pink-500 mx-auto opacity-80" />
            <p className="text-sm text-zinc-300 leading-relaxed">{t('cameraPermissionError')}</p>
            <button
              type="button"
              onClick={onBackHome}
              className="px-5 py-2.5 rounded-full meitu-gradient text-white text-xs font-bold"
            >
              {t('home')}
            </button>
          </div>
        ) : capturedUrl ? (
          <img
            src={capturedUrl}
            alt="Captured"
            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <div className="relative h-full w-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-full max-w-full object-contain"
              style={{
                filter: combinedCssFilter,
                transform: mirror ? 'scaleX(-1)' : undefined,
              }}
            />

            {/* Rule of thirds grid */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/50" />
                ))}
              </div>
            )}

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="text-7xl font-black text-white drop-shadow-2xl animate-ping">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        )}

        {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none" />}
      </div>

      {/* Bottom Camera Controls */}
      <div className="bg-zinc-900/95 border-t border-zinc-800 px-4 py-4 space-y-3">
        {capturedUrl ? (
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setCapturedUrl(null)}
              className="px-4 py-3 rounded-2xl bg-zinc-800 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> {t('retake')}
            </button>
            <button
              type="button"
              onClick={() => onCaptureToEditor(capturedUrl)}
              className="flex-1 py-3 rounded-2xl meitu-gradient text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/30"
            >
              <Wand2 className="w-4 h-4" /> {t('editCaptured')}
            </button>
            <a
              href={capturedUrl}
              download={`meitu-cam-${Date.now()}.jpg`}
              className="p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-3">
            {/* Beauty Slider */}
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={beautyLevel}
                onChange={(e) => setBeautyLevel(Number(e.target.value))}
                className="meitu-slider"
              />
              <span className="text-xs font-bold text-pink-400 w-9 text-right">{beautyLevel}%</span>
            </div>

            {/* Live Filters */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {LIVE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterId(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    filterId === f.id ? 'meitu-gradient text-white' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {lang === 'th' ? f.nameTh : f.nameEn}
                </button>
              ))}
            </div>

            {/* Shutter button */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={error || countdown !== null}
                onClick={triggerCapture}
                className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
              >
                <span className="w-full h-full rounded-full meitu-gradient shadow-lg shadow-pink-500/50" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
