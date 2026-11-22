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
  dark,
  onSavedCallback,
}) => {
  const t = useT(lang);
  const [format, setFormat] = useState<ExportFormat>(
    state.cutout.enabled && state.cutout.bgType === 'transparent' ? 'image/png' : 'image/jpeg'
  );
  const [quality, setQuality] = useState(92);
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
      // Estimate full resolution size
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

  const generateFullBlob = (): Promise<{ blob: Blob; dataUrl: string; ext: string }> => {
    return new Promise((resolve) => {
      const canvas = renderEditedCanvas(sourceImage, state, {
        maxDimension: maxDim,
        faces,
        segmentationMask,
        includeWatermark: watermark,
      });
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      const dataUrl = canvas.toDataURL(format, quality / 100);
      canvas.toBlob(
        (blob) => {
          resolve({ blob: blob ?? new Blob(), dataUrl, ext });
        },
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
    a.download = `meitu-studio-${Date.now()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    // Save tiny thumbnail to recent projects
    if (previewUrl) onSavedCallback?.(previewUrl);
    setRendering(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleShare = async () => {
    const { blob, ext } = await generateFullBlob();
    const file = new File([blob], `meitu-studio.${ext}`, { type: format });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Meitu Studio AI',
        });
      } catch {
        // user cancelled
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${
          dark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-pink-100 text-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-pink-500/15">
          <h3 className="font-bold text-base">{t('exportTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-pink-500/10 text-zinc-400 hover:text-pink-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          <div
            className={`h-48 rounded-2xl overflow-hidden flex items-center justify-center relative ${
              dark ? 'dark-checkerboard-bg' : 'checkerboard-bg'
            }`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Export preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-xs text-zinc-400">Rendering...</div>
            )}
            <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-black/65 text-white text-[11px] font-semibold">
              ~{sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`}
            </span>
          </div>

          {/* Format */}
          <div>
            <div className="text-xs font-semibold mb-1.5">{t('format')}</div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['image/jpeg', 'JPEG'],
                  ['image/png', 'PNG (Alpha)'],
                  ['image/webp', 'WebP'],
                ] as const
              ).map(([fmt, lbl]) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    format === fmt
                      ? 'meitu-gradient text-white shadow-sm'
                      : dark
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-pink-50 text-zinc-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <div className="text-xs font-semibold mb-1.5">{t('resolution')}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  [0, t('resOriginal')],
                  [1080, '1080p'],
                  [2048, '2K'],
                  [3840, '4K'],
                ] as Array<[ResolutionOption, string]>
              ).map(([res, lbl]) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setMaxDim(res)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold truncate ${
                    maxDim === res
                      ? 'meitu-gradient text-white'
                      : dark
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-pink-50 text-zinc-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {format !== 'image/png' && (
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>{t('quality')}</span>
                <span className="text-pink-500">{quality}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="meitu-slider"
              />
            </div>
          )}

          {/* Watermark toggle */}
          <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
            <span>{t('watermark')}</span>
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="accent-pink-500 w-4 h-4"
            />
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={rendering}
              onClick={handleDownload}
              className="flex-1 py-3 rounded-2xl meitu-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 hover:opacity-95 disabled:opacity-60"
            >
              {savedToast ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {savedToast ? t('savedSuccess') : t('downloadNow')}
            </button>
            <button
              type="button"
              disabled={rendering}
              onClick={handleShare}
              className={`px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-1.5 border ${
                dark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700' : 'border-pink-200 bg-pink-50 text-pink-600'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
