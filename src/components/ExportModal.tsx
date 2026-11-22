import React, { useEffect, useState } from 'react';
import { Check, Download, Share2, X } from 'lucide-react';
import { renderEditedCanvas } from '../engine/renderPipeline';
import { useT } from '../i18n/translations';
import {
  DetectedFace,
  EditorState,
  Language,
  SegmentationMask,
} from '../types/editor';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sourceImage: HTMLImageElement;
  state: EditorState;
  faces: DetectedFace[];
  segmentationMask: SegmentationMask | null;
  lang: Language;
  dark: boolean;
  onSavedCallback?: (dataUrl: string) => void;
}

type ExportFormat = 'image/jpeg' | 'image/png' | 'image/webp';
type ResolutionOption = 0 | 1080 | 2048 | 3840;

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  sourceImage,
  state,
  faces,
  segmentationMask,
  lang,
  onSavedCallback,
}) => {
  const t = useT(lang);
  const [format, setFormat] = useState<ExportFormat>(
    state.cutout.enabled && state.cutout.bgType === 'transparent' ? 'image/png' : 'image/jpeg'
  );
  const [quality, setQuality] = useState(94);
  const [maxDim, setMaxDim] = useState<ResolutionOption>(0);
  const [watermark, setWatermark] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [sizeKB, setSizeKB] = useState<number>(0);
  const [rendering, setRendering] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRendering(true);
    const timer = setTimeout(() => {
      const canvas = renderEditedCanvas(sourceImage, state, {
        maxDimension: 640,
        faces,
        segmentationMask,
        includeWatermark: watermark,
      });
      const url = canvas.toDataURL(format, quality / 100);
      setPreviewUrl(url);
      const natMax = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
      const targetMax = maxDim === 0 ? natMax : Math.min(natMax, maxDim);
      const areaScale = Math.pow(targetMax / Math.max(canvas.width, canvas.height), 2);
      const rawBytes = Math.round(((url.length - 22) * 3) / 4);
      setSizeKB(Math.max(12, Math.round((rawBytes * Math.max(1, areaScale * 0.72)) / 1024)));
      setRendering(false);
    }, 30);
    return () => clearTimeout(timer);
  }, [open, format, quality, maxDim, watermark, sourceImage, state, faces, segmentationMask]);

  if (!open) return null;

  const generateFullBlob = (): Promise<{ blob: Blob; ext: string }> => {
    return new Promise((resolve) => {
      const canvas = renderEditedCanvas(sourceImage, state, {
        maxDimension: maxDim,
        faces,
        segmentationMask,
        includeWatermark: watermark,
      });
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      canvas.toBlob(
        (blob) => resolve({ blob: blob ?? new Blob(), ext }),
        format,
        quality / 100
      );
    });
  };

  const handleDownload = async () => {
    setRendering(true);
    const { blob, ext } = await generateFullBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meitu-${Date.now()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    if (previewUrl) onSavedCallback?.(previewUrl);
    setRendering(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2600);
  };

  const handleShare = async () => {
    const { blob, ext } = await generateFullBlob();
    const file = new File([blob], `meitu.${ext}`, { type: format });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Meitu' });
      } catch {
        // cancelled
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-[28px] bg-[#121214] text-white border-t border-white/10 safe-bottom overflow-hidden shadow-2xl"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="font-bold text-[15px]">{t('exportTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Preview Row */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#1C1C1E]">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 dark-checkerboard-bg flex items-center justify-center">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-white">
                {format === 'image/png' ? 'PNG (Transparent)' : format === 'image/webp' ? 'WebP' : 'JPEG High Quality'}
              </div>
              <div className="text-[11px] text-[#8E8E93]">
                {maxDim === 0 ? t('resOriginal') : `${maxDim}px HD`} · ~
                {sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`}
              </div>
              <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="accent-[#FF4F7B] w-3.5 h-3.5"
                />
                <span>{t('watermark')}</span>
              </label>
            </div>
          </div>

          {/* Format Segmented Pills */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['image/jpeg', 'JPEG'],
                ['image/png', 'PNG'],
                ['image/webp', 'WebP'],
              ] as const
            ).map(([fmt, lbl]) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-2 rounded-full text-xs font-semibold transition-colors ${
                  format === fmt ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Resolution Segmented Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                [0, lang === 'th' ? 'ต้นฉบับ' : 'Full'],
                [1080, '1080p'],
                [2048, '2K'],
                [3840, '4K'],
              ] as Array<[ResolutionOption, string]>
            ).map(([res, lbl]) => (
              <button
                key={res}
                type="button"
                onClick={() => setMaxDim(res)}
                className={`py-2 rounded-full text-[11px] font-semibold ${
                  maxDim === res ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Quality Thin White Slider */}
          {format !== 'image/png' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8E8E93] shrink-0">{t('quality')}</span>
              <input
                type="range"
                min={55}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="meitu-white-slider"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${((quality - 55) / 45) * 100}%, rgba(255,255,255,0.2) ${((quality - 55) / 45) * 100}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
              <span className="text-xs font-semibold w-9 text-right tabular-nums">{quality}%</span>
            </div>
          )}

          {/* Save & Share CTAs */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              disabled={rendering}
              onClick={handleDownload}
              className="flex-1 py-3.5 rounded-full meitu-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(255,59,107,0.4)] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {savedToast ? <Check className="w-4.5 h-4.5" /> : <Download className="w-4.5 h-4.5" />}
              {savedToast ? t('savedSuccess') : lang === 'th' ? 'บันทึกลงอัลบั้ม' : 'Save Photo'}
            </button>
            <button
              type="button"
              disabled={rendering}
              onClick={handleShare}
              className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white active:scale-95"
              aria-label={t('shareNow')}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
