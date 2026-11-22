import {
  CropSettings,
  DetectedFace,
  EditorState,
  SegmentationMask,
} from '../types/editor';
import { applyBeautyRetouch, applyHealStrokes } from './beautyEngine';
import { applyColorAndStyle } from './colorEngine';
import { applyMakeup } from './makeupEngine';
import {
  applyCutoutBackground,
  applyDepthBlur,
  applyDoodleStrokes,
  applyFrame,
  applyMosaicStrokes,
  applyStickers,
  applyTextLayers,
  applyWatermark,
} from './overlayEngine';
import { applyBodyStretch, applyWarpAndLiquify } from './warpMesh';

export interface RenderOptions {
  maxDimension: number; // e.g., 960 for interactive preview, 0 or 4096 for full export
  faces: DetectedFace[];
  segmentationMask: SegmentationMask | null;
  includeWatermark?: boolean;
  skipOverlaysForOriginal?: boolean;
}

/**
 * Applies rotation (0/90/180/270), flipH/V, straighten (-45..45), and normalized cropBox
 */
export function applyCropAndTransform(
  source: HTMLCanvasElement,
  crop: CropSettings
): HTMLCanvasElement {
  const sw = source.width;
  const sh = source.height;
  const rot90 = ((crop.rotation % 360) + 360) % 360;
  const isSwapped = rot90 === 90 || rot90 === 270;

  // Step 1: Rotate 90s + flip + straighten
  const rotW = isSwapped ? sh : sw;
  const rotH = isSwapped ? sw : sh;
  const transformed = document.createElement('canvas');
  transformed.width = rotW;
  transformed.height = rotH;
  const tCtx = transformed.getContext('2d')!;

  tCtx.save();
  tCtx.translate(rotW / 2, rotH / 2);

  // Auto-scale slightly when straightening so no black corner gaps appear
  const rad = (crop.straighten * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));
  const straightenScale =
    Math.abs(crop.straighten) > 0.1
      ? Math.max(
          (rotW * absCos + rotH * absSin) / rotW,
          (rotW * absSin + rotH * absCos) / rotH
        )
      : 1;

  tCtx.scale(
    (crop.flipH ? -1 : 1) * straightenScale,
    (crop.flipV ? -1 : 1) * straightenScale
  );
  tCtx.rotate(((rot90 + crop.straighten) * Math.PI) / 180);
  tCtx.drawImage(source, -sw / 2, -sh / 2);
  tCtx.restore();

  // Step 2: Crop box
  const cb = crop.cropBox;
  const cx = Math.max(0, Math.min(0.95, cb.x));
  const cy = Math.max(0, Math.min(0.95, cb.y));
  const cw = Math.max(0.05, Math.min(1 - cx, cb.w));
  const ch = Math.max(0.05, Math.min(1 - cy, cb.h));

  if (cx < 0.002 && cy < 0.002 && cw > 0.996 && ch > 0.996) {
    return transformed;
  }

  const outW = Math.max(16, Math.round(rotW * cw));
  const outH = Math.max(16, Math.round(rotH * ch));
  const cropped = document.createElement('canvas');
  cropped.width = outW;
  cropped.height = outH;
  const cCtx = cropped.getContext('2d')!;
  cCtx.drawImage(
    transformed,
    Math.round(rotW * cx),
    Math.round(rotH * cy),
    outW,
    outH,
    0,
    0,
    outW,
    outH
  );
  return cropped;
}

/**
 * Helper to transform the segmentation mask identically to crop/transform for Portrait Bokeh
 */
function transformSegmentationMask(
  mask: SegmentationMask | null,
  baseW: number,
  baseH: number,
  crop: CropSettings
): SegmentationMask | null {
  if (!mask) return null;
  const raw = document.createElement('canvas');
  raw.width = mask.width;
  raw.height = mask.height;
  const rCtx = raw.getContext('2d')!;
  const img = rCtx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(mask.data[i] * 255)));
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  rCtx.putImageData(img, 0, 0);

  const scaled = document.createElement('canvas');
  const sw = Math.min(320, baseW);
  const sh = Math.max(16, Math.round((sw / baseW) * baseH));
  scaled.width = sw;
  scaled.height = sh;
  scaled.getContext('2d')!.drawImage(raw, 0, 0, sw, sh);

  const cropped = applyCropAndTransform(scaled, crop);
  const cData = cropped.getContext('2d')!.getImageData(0, 0, cropped.width, cropped.height).data;
  const out = new Float32Array(cropped.width * cropped.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = cData[i * 4] / 255;
  }
  return { width: cropped.width, height: cropped.height, data: out };
}

/**
 * Master non-destructive Meitu Studio Render Pipeline!
 */
export function renderEditedCanvas(
  sourceImage: HTMLImageElement,
  state: EditorState,
  options: RenderOptions
): HTMLCanvasElement {
  // Determine working resolution
  const natW = sourceImage.naturalWidth || sourceImage.width;
  const natH = sourceImage.naturalHeight || sourceImage.height;
  let workW = natW;
  let workH = natH;

  if (options.maxDimension > 0 && Math.max(natW, natH) > options.maxDimension) {
    const scale = options.maxDimension / Math.max(natW, natH);
    workW = Math.max(16, Math.round(natW * scale));
    workH = Math.max(16, Math.round(natH * scale));
  }

  // Stage 0: Draw source image
  let canvas = document.createElement('canvas');
  canvas.width = workW;
  canvas.height = workH;
  let ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sourceImage, 0, 0, workW, workH);

  // Fast path: Original image only (still respecting crop/transform for clean Split Compare)
  if (options.skipOverlaysForOriginal) {
    canvas = applyCropAndTransform(canvas, state.crop);
    return canvas;
  }

  // Stage 1: Face Reshape (478-point mesh warp in original image coords)
  applyWarpAndLiquify(ctx, workW, workH, options.faces, state.reshape, []);

  // Stage 2: Portrait Beauty Retouch (478-point skin mask, eyes, teeth, glow)
  applyBeautyRetouch(ctx, workW, workH, options.faces, state.beauty);

  // Stage 3: Makeup Studio (478-point lips, blush, eyeshadow, liner, brows, contacts, contour)
  applyMakeup(ctx, workW, workH, options.faces, state.makeup);

  // Stage 4: AI Cutout & Background Replacement (exact alignment with segmentation mask)
  if (state.cutout.enabled && options.segmentationMask) {
    applyCutoutBackground(ctx, workW, workH, state.cutout, options.segmentationMask);
  }

  // Stage 5: Crop, Rotate, Straighten, Flip
  canvas = applyCropAndTransform(canvas, state.crop);

  // Stage 6: Body Height / Leg Lengthener (Meitu "Tall" mode)
  canvas = applyBodyStretch(canvas, state.bodyStretch);

  let w = canvas.width;
  let h = canvas.height;
  ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Stage 7: Interactive Liquify & Spot Heal / Magic Object Eraser (post-crop exact cursor coords)
  if (state.liquify.length > 0) {
    applyWarpAndLiquify(ctx, w, h, [], {
      slimFace: 0,
      vLine: 0,
      jawline: 0,
      cheekbones: 0,
      forehead: 0,
      hairVolume: 0,
      bigEyes: 0,
      eyeTilt: 0,
      eyeDistance: 0,
      slimNose: 0,
      noseBridge: 0,
      noseTip: 0,
      mouthSize: 0,
      smileLift: 0,
    }, state.liquify);
  }
  if (state.heals.length > 0) {
    applyHealStrokes(ctx, w, h, state.heals);
  }

  // Stage 8: Portrait Bokeh / Radial / Tilt-Shift Depth Blur
  if (state.blur.mode !== 'none' && state.blur.strength > 0) {
    const transformedMask =
      state.blur.mode === 'portrait'
        ? transformSegmentationMask(options.segmentationMask, workW, workH, state.crop)
        : null;
    applyDepthBlur(ctx, w, h, state.blur, transformedMask);
  }

  // Stage 9: Tone Adjust + 42 Filters + 8-Channel HSL + Tone Curves + Sharpness + AI Art Styles
  applyColorAndStyle(
    ctx,
    w,
    h,
    state.adjust,
    state.filter,
    state.hsl,
    state.curves,
    state.aiStyle
  );

  // Stage 10: Mosaic Strokes & Magic Brush Doodles
  if (state.mosaics.length > 0) {
    applyMosaicStrokes(ctx, w, h, state.mosaics);
  }
  if (state.doodles.length > 0) {
    applyDoodleStrokes(ctx, w, h, state.doodles);
  }

  // Stage 11: Stickers & Typography Layers
  if (state.stickers.length > 0) {
    applyStickers(ctx, w, h, state.stickers);
  }
  if (state.texts.length > 0) {
    applyTextLayers(ctx, w, h, state.texts);
  }

  // Stage 12: Frames & Borders
  if (state.frame.style !== 'none') {
    canvas = applyFrame(canvas, state.frame);
    w = canvas.width;
    h = canvas.height;
    ctx = canvas.getContext('2d')!;
  }

  // Stage 13: Optional Meitu Studio AI Watermark
  if (options.includeWatermark) {
    applyWatermark(ctx, w, h);
  }

  return canvas;
}
