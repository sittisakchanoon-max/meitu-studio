import { MEITU_FILTERS } from '../data/filters';
import { MAKEUP_LOOK_PRESETS } from '../data/presets';
import {
  createDefaultCurves,
  createDefaultEditorState,
  createDefaultHSL,
  DetectedFace,
  MakeupSettings,
} from '../types/editor';
import { applyColorAndStyle } from './colorEngine';
import { applyMakeup } from './makeupEngine';

const DEFAULT_ADJUST = createDefaultEditorState().adjust;
const DEFAULT_HSL = createDefaultHSL();
const DEFAULT_CURVES = createDefaultCurves();
const DEFAULT_AI = { style: 'none' as const, intensity: 0 };

/**
 * Generates real LIVE square thumbnails of the user's OWN photo with every Meitu filter applied!
 * Matches the real iOS Meitu filter strip (Screenshot 1).
 */
export function generateFilterThumbnails(
  sourceImage: HTMLImageElement,
  size = 112
): Record<string, string> {
  const map: Record<string, string> = {};
  const natW = sourceImage.naturalWidth || sourceImage.width;
  const natH = sourceImage.naturalHeight || sourceImage.height;
  if (!natW || !natH) return map;

  // Square center crop
  const side = Math.min(natW, natH);
  const sx = (natW - side) / 2;
  const sy = (natH - side) / 2;

  const base = document.createElement('canvas');
  base.width = size;
  base.height = size;
  const bCtx = base.getContext('2d')!;
  bCtx.drawImage(sourceImage, sx, sy, side, side, 0, 0, size, size);

  const work = document.createElement('canvas');
  work.width = size;
  work.height = size;
  const wCtx = work.getContext('2d', { willReadFrequently: true })!;

  for (const f of MEITU_FILTERS) {
    wCtx.clearRect(0, 0, size, size);
    wCtx.drawImage(base, 0, 0);
    if (f.id !== 'original') {
      applyColorAndStyle(
        wCtx,
        size,
        size,
        DEFAULT_ADJUST,
        { id: f.id, intensity: 88 },
        DEFAULT_HSL,
        DEFAULT_CURVES,
        DEFAULT_AI
      );
    }
    map[f.id] = work.toDataURL('image/jpeg', 0.78);
  }
  return map;
}

/**
 * Generates real LIVE face-cropped thumbnails for every Meitu Makeup Look!
 * Matches the real iOS Meitu Makeup strip (Screenshot 2: พลัมเบอร์รี่, สวีทพีช, ปรุงจิต, สาวหวาน, วอนยอง).
 */
export function generateMakeupThumbnails(
  sourceImage: HTMLImageElement,
  faces: DetectedFace[],
  size = 112
): Record<string, string> {
  const map: Record<string, string> = {};
  const natW = sourceImage.naturalWidth || sourceImage.width;
  const natH = sourceImage.naturalHeight || sourceImage.height;
  if (!natW || !natH) return map;

  // Determine tight portrait square crop around face (if detected)
  let cropX = 0;
  let cropY = 0;
  let cropSize = Math.min(natW, natH);
  let croppedFaces: DetectedFace[] = [];

  if (faces.length > 0) {
    const f = faces[0];
    const cx = (f.box.x + f.box.w * 0.5) * natW;
    const cy = (f.box.y + f.box.h * 0.5) * natH;
    cropSize = Math.min(Math.min(natW, natH), Math.max(f.box.w * natW, f.box.h * natH) * 1.9);
    cropX = Math.max(0, Math.min(natW - cropSize, cx - cropSize / 2));
    cropY = Math.max(0, Math.min(natH - cropSize, cy - cropSize / 2));

    // Remap landmarks into cropped square coordinates [0..1]
    croppedFaces = [
      {
        landmarks: f.landmarks.map((p) => ({
          x: (p.x * natW - cropX) / cropSize,
          y: (p.y * natH - cropY) / cropSize,
          z: p.z,
        })),
        box: {
          x: (f.box.x * natW - cropX) / cropSize,
          y: (f.box.y * natH - cropY) / cropSize,
          w: (f.box.w * natW) / cropSize,
          h: (f.box.h * natH) / cropSize,
        },
      },
    ];
  } else {
    cropX = (natW - cropSize) / 2;
    cropY = Math.max(0, (natH - cropSize) * 0.25);
  }

  const base = document.createElement('canvas');
  base.width = size;
  base.height = size;
  base.getContext('2d')!.drawImage(sourceImage, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

  const work = document.createElement('canvas');
  work.width = size;
  work.height = size;
  const wCtx = work.getContext('2d', { willReadFrequently: true })!;
  const defaultMakeup = createDefaultEditorState().makeup;

  for (const look of MAKEUP_LOOK_PRESETS) {
    wCtx.clearRect(0, 0, size, size);
    wCtx.drawImage(base, 0, 0);

    if (look.id !== 'none') {
      const fullMakeup: MakeupSettings = { ...defaultMakeup, ...look.settings, preset: look.id };
      if (croppedFaces.length > 0) {
        applyMakeup(wCtx, size, size, croppedFaces, fullMakeup);
      } else {
        // Subtle tint preview if no face detected
        wCtx.save();
        wCtx.globalCompositeOperation = 'soft-light';
        wCtx.fillStyle = look.swatch[0];
        wCtx.globalAlpha = 0.25;
        wCtx.fillRect(0, 0, size, size);
        wCtx.restore();
      }
    }
    map[look.id] = work.toDataURL('image/jpeg', 0.8);
  }
  return map;
}
