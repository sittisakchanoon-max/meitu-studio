import {
  BlurSettings,
  CutoutSettings,
  DoodleStroke,
  FrameSettings,
  MosaicStroke,
  SegmentationMask,
  StickerLayer,
  TextLayer,
} from '../types/editor';

/**
 * Helper to create a resized, feathered alpha mask canvas from a SegmentationMask
 */
function createMaskCanvas(
  mask: SegmentationMask,
  w: number,
  h: number,
  featherPx: number
): HTMLCanvasElement {
  const raw = document.createElement('canvas');
  raw.width = mask.width;
  raw.height = mask.height;
  const rCtx = raw.getContext('2d')!;
  const img = rCtx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    const a = Math.max(0, Math.min(255, Math.round(mask.data[i] * 255)));
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = a;
  }
  rCtx.putImageData(img, 0, 0);

  const scaled = document.createElement('canvas');
  scaled.width = w;
  scaled.height = h;
  const sCtx = scaled.getContext('2d')!;
  if (featherPx > 0) {
    sCtx.filter = `blur(${featherPx}px)`;
  }
  sCtx.drawImage(raw, 0, 0, w, h);
  return scaled;
}

/**
 * Draws curated studio backdrops for AI Cutout replacement
 */
function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  studioId: string
) {
  if (studioId === 'pastelSky') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#A1C4FD');
    g.addColorStop(0.55, '#FBC2EB');
    g.addColorStop(1, '#FFF1EB');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Soft clouds
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    for (const [cx, cy, rx, ry] of [
      [0.2, 0.25, 0.22, 0.06],
      [0.78, 0.2, 0.25, 0.07],
      [0.5, 0.42, 0.3, 0.05],
    ]) {
      ctx.beginPath();
      ctx.ellipse(cx * w, cy * h, rx * w, ry * h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (studioId === 'pinkBokeh') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#FF9A9E');
    g.addColorStop(0.5, '#FECFEF');
    g.addColorStop(1, '#FAD0C4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Dreamy bokeh lights
    for (let i = 0; i < 24; i++) {
      const bx = ((i * 137.5) % 100) / 100 * w;
      const by = ((i * 73.1 + 19) % 100) / 100 * h;
      const br = (0.025 + (i % 5) * 0.018) * Math.min(w, h);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + (i % 4) * 0.08})`;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (studioId === 'studioSpotlight') {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.38, w * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    g.addColorStop(0, '#F8F9FA');
    g.addColorStop(0.55, '#CED4DA');
    g.addColorStop(1, '#495057');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (studioId === 'goldenSunset') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#667EEA');
    g.addColorStop(0.45, '#F093FB');
    g.addColorStop(0.8, '#F5576C');
    g.addColorStop(1, '#FFD166');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Pop Magazine Grid
    ctx.fillStyle = '#FFF0F5';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 79, 123, 0.16)';
    ctx.lineWidth = Math.max(1, Math.round(w * 0.002));
    const step = Math.max(24, Math.round(w / 14));
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 79, 123, 0.14)';
    ctx.font = `800 ${Math.round(w * 0.16)}px 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MEITU', w * 0.5, h * 0.22);
  }
}

/**
 * Applies AI Cutout & Background Replacement using MediaPipe Selfie Segmentation Mask
 */
export function applyCutoutBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cutout: CutoutSettings,
  mask: SegmentationMask | null
): void {
  if (!cutout.enabled || !mask) return;

  // Save original foreground image
  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = w;
  fgCanvas.height = h;
  const fgCtx = fgCanvas.getContext('2d')!;
  fgCtx.drawImage(ctx.canvas, 0, 0);

  // Extract masked person
  const maskCanvas = createMaskCanvas(mask, w, h, cutout.feather);
  fgCtx.globalCompositeOperation = 'destination-in';
  fgCtx.drawImage(maskCanvas, 0, 0);

  // Prepare background on main canvas
  if (cutout.bgType === 'transparent') {
    ctx.clearRect(0, 0, w, h);
  } else if (cutout.bgType === 'solid') {
    ctx.fillStyle = cutout.bgColor;
    ctx.fillRect(0, 0, w, h);
  } else if (cutout.bgType === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, cutout.bgGradient[0]);
    g.addColorStop(1, cutout.bgGradient[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (cutout.bgType === 'studio') {
    drawStudioBackdrop(ctx, w, h, cutout.bgStudio);
  } else if (cutout.bgType === 'blur') {
    const bgBlur = document.createElement('canvas');
    bgBlur.width = w;
    bgBlur.height = h;
    const bCtx = bgBlur.getContext('2d')!;
    bCtx.filter = `blur(${Math.max(4, Math.round((cutout.blurStrength / 100) * Math.min(w, h) * 0.045))}px)`;
    bCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bgBlur, 0, 0);
  }

  // Composite sharp cutout foreground on top
  ctx.drawImage(fgCanvas, 0, 0);
}

/**
 * Applies Portrait Bokeh (AI depth mask), Radial Bokeh, or Linear Tilt-Shift Blur
 */
export function applyDepthBlur(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  blur: BlurSettings,
  mask: SegmentationMask | null
): void {
  if (blur.mode === 'none' || blur.strength <= 0) return;

  const blurPx = Math.max(2, Math.round((blur.strength / 100) * Math.min(w, h) * 0.036));
  const blurred = document.createElement('canvas');
  blurred.width = w;
  blurred.height = h;
  const bCtx = blurred.getContext('2d')!;
  bCtx.filter = `blur(${blurPx}px)`;
  bCtx.drawImage(ctx.canvas, 0, 0);

  if (blur.mode === 'portrait' && mask) {
    // Keep foreground sharp, blur background
    const fg = document.createElement('canvas');
    fg.width = w;
    fg.height = h;
    const fgCtx = fg.getContext('2d')!;
    fgCtx.drawImage(ctx.canvas, 0, 0);
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(createMaskCanvas(mask, w, h, 3), 0, 0);

    ctx.drawImage(blurred, 0, 0);
    ctx.drawImage(fg, 0, 0);
    return;
  }

  // Mask blurred layer so center focus stays razor-sharp
  const maskC = document.createElement('canvas');
  maskC.width = w;
  maskC.height = h;
  const mCtx = maskC.getContext('2d')!;

  const cx = blur.centerX * w;
  const cy = blur.centerY * h;
  const r = blur.radius * Math.min(w, h);

  if (blur.mode === 'radial' || blur.mode === 'portrait') {
    const grad = mCtx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r * 1.9);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    mCtx.fillStyle = grad;
    mCtx.fillRect(0, 0, w, h);
  } else {
    // Linear Tilt-Shift band
    mCtx.save();
    mCtx.translate(cx, cy);
    mCtx.rotate((blur.angle * Math.PI) / 180);
    const span = Math.max(w, h) * 1.5;
    const grad = mCtx.createLinearGradient(0, -r * 1.6, 0, r * 1.6);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.32, 'rgba(0,0,0,0)');
    grad.addColorStop(0.68, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    mCtx.fillStyle = grad;
    mCtx.fillRect(-span, -span, span * 2, span * 2);
    mCtx.restore();
  }

  bCtx.filter = 'none';
  bCtx.globalCompositeOperation = 'destination-in';
  bCtx.drawImage(maskC, 0, 0);
  ctx.drawImage(blurred, 0, 0);
}

/**
 * Applies Meitu Artistic Mosaic Strokes (Pixel, Blur, Frosted Glass, Oil, Heart Mosaic, Triangle Mosaic)
 */
export function applyMosaicStrokes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: MosaicStroke[]
): void {
  if (strokes.length === 0) return;

  const baseCopy = document.createElement('canvas');
  baseCopy.width = w;
  baseCopy.height = h;
  baseCopy.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
  const baseData = baseCopy.getContext('2d')!.getImageData(0, 0, w, h).data;
  const minDim = Math.min(w, h);

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    const brushR = Math.max(6, Math.round(stroke.size * minDim));
    const cellSize = Math.max(6, Math.round(minDim * (0.008 + (stroke.strength / 100) * 0.025)));

    // Create masked effect layer
    const eff = document.createElement('canvas');
    eff.width = w;
    eff.height = h;
    const eCtx = eff.getContext('2d')!;

    if (stroke.mode === 'blur' || stroke.mode === 'glass') {
      eCtx.filter = `blur(${Math.max(4, Math.round(cellSize * 0.75))}px)`;
      eCtx.drawImage(baseCopy, 0, 0);
      eCtx.filter = 'none';
      if (stroke.mode === 'glass') {
        eCtx.fillStyle = 'rgba(255,255,255,0.16)';
        eCtx.fillRect(0, 0, w, h);
      }
    } else if (stroke.mode === 'pixel') {
      const sw = Math.max(4, Math.round(w / cellSize));
      const sh = Math.max(4, Math.round(h / cellSize));
      const tiny = document.createElement('canvas');
      tiny.width = sw;
      tiny.height = sh;
      tiny.getContext('2d')!.drawImage(baseCopy, 0, 0, sw, sh);
      eCtx.imageSmoothingEnabled = false;
      eCtx.drawImage(tiny, 0, 0, sw, sh, 0, 0, w, h);
    } else if (stroke.mode === 'oil') {
      eCtx.filter = `blur(${Math.max(2, Math.round(cellSize * 0.35))}px) saturate(1.4) contrast(1.2)`;
      eCtx.drawImage(baseCopy, 0, 0);
    } else {
      // Heart or Triangle artistic mosaic!
      eCtx.fillStyle = '#fff5f8';
      eCtx.fillRect(0, 0, w, h);
      const step = Math.max(10, cellSize);
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const sx = Math.min(w - 1, Math.floor(x + step * 0.5));
          const sy = Math.min(h - 1, Math.floor(y + step * 0.5));
          const idx = (sy * w + sx) * 4;
          eCtx.fillStyle = `rgb(${baseData[idx]}, ${baseData[idx + 1]}, ${baseData[idx + 2]})`;
          if (stroke.mode === 'triangle') {
            eCtx.beginPath();
            eCtx.moveTo(x + step * 0.5, y);
            eCtx.lineTo(x + step, y + step);
            eCtx.lineTo(x, y + step);
            eCtx.closePath();
            eCtx.fill();
          } else {
            // Heart shape tile
            const cx = x + step * 0.5;
            const cy = y + step * 0.42;
            const r = step * 0.42;
            eCtx.beginPath();
            eCtx.moveTo(cx, cy + r * 0.9);
            eCtx.bezierCurveTo(cx - r * 1.2, cy + r * 0.1, cx - r * 0.9, cy - r * 0.85, cx, cy - r * 0.2);
            eCtx.bezierCurveTo(cx + r * 0.9, cy - r * 0.85, cx + r * 1.2, cy + r * 0.1, cx, cy + r * 0.9);
            eCtx.fill();
          }
        }
      }
    }

    // Clip to stroke path
    eCtx.globalCompositeOperation = 'destination-in';
    eCtx.strokeStyle = '#fff';
    eCtx.fillStyle = '#fff';
    eCtx.lineCap = 'round';
    eCtx.lineJoin = 'round';
    eCtx.lineWidth = brushR * 2;
    if (stroke.points.length === 1) {
      eCtx.beginPath();
      eCtx.arc(stroke.points[0].x * w, stroke.points[0].y * h, brushR, 0, Math.PI * 2);
      eCtx.fill();
    } else {
      eCtx.beginPath();
      eCtx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
      for (let i = 1; i < stroke.points.length; i++) {
        eCtx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
      }
      eCtx.stroke();
    }

    ctx.drawImage(eff, 0, 0);
  }
}

/**
 * Renders Meitu Signature Magic Brush & Doodle Strokes!
 */
export function applyDoodleStrokes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: DoodleStroke[]
): void {
  if (strokes.length === 0) return;
  const minDim = Math.min(w, h);

  for (const st of strokes) {
    if (st.points.length === 0) continue;
    const size = Math.max(3, st.size * minDim);
    ctx.save();
    ctx.globalAlpha = st.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (st.brushType === 'pen' || st.brushType === 'highlighter' || st.brushType === 'neon') {
      if (st.brushType === 'highlighter') {
        ctx.globalAlpha = st.opacity * 0.42;
      }
      if (st.brushType === 'neon') {
        ctx.shadowColor = st.color;
        ctx.shadowBlur = size * 1.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.72;
      } else {
        ctx.strokeStyle = st.color;
        ctx.lineWidth = size;
      }

      ctx.beginPath();
      ctx.moveTo(st.points[0].x * w, st.points[0].y * h);
      for (let i = 1; i < st.points.length; i++) {
        ctx.lineTo(st.points[i].x * w, st.points[i].y * h);
      }
      if (st.points.length === 1) {
        ctx.lineTo(st.points[0].x * w + 0.5, st.points[0].y * h + 0.5);
      }
      ctx.stroke();

      if (st.brushType === 'neon') {
        // Outer neon halo pass
        ctx.globalAlpha = st.opacity * 0.75;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = size * 1.15;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.42;
        ctx.stroke();
      }
    } else if (st.brushType === 'rainbow') {
      for (let i = 1; i < st.points.length; i++) {
        const hue = (i * 11) % 360;
        ctx.strokeStyle = `hsl(${hue}, 95%, 64%)`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(st.points[i - 1].x * w, st.points[i - 1].y * h);
        ctx.lineTo(st.points[i].x * w, st.points[i].y * h);
        ctx.stroke();
      }
    } else {
      // Stamp-based Meitu Magic Brushes: Sparkle, Heart, Sakura, Star, Bubble, Pearl!
      const spacing = Math.max(size * 1.1, 14);
      let accum = spacing;
      let stampIdx = 0;

      for (let i = 0; i < st.points.length; i++) {
        const px = st.points[i].x * w;
        const py = st.points[i].y * h;
        if (i > 0) {
          accum += Math.hypot(px - st.points[i - 1].x * w, py - st.points[i - 1].y * h);
        }
        if (accum < spacing) continue;
        accum = 0;
        stampIdx++;

        const jitterX = (Math.sin(stampIdx * 12.7) * 0.35) * size;
        const jitterY = (Math.cos(stampIdx * 9.3) * 0.35) * size;
        const sx = px + jitterX;
        const sy = py + jitterY;
        const r = size * (0.65 + (stampIdx % 3) * 0.22);

        if (st.brushType === 'sparkle') {
          ctx.fillStyle = stampIdx % 2 === 0 ? '#FFFFFF' : '#FFF3B0';
          ctx.shadowColor = '#FFD166';
          ctx.shadowBlur = r * 1.2;
          draw4PointStar(ctx, sx, sy, r, r * 0.22);
        } else if (st.brushType === 'heart') {
          ctx.fillStyle = stampIdx % 2 === 0 ? '#FF4F7B' : '#FF9EBB';
          drawHeart(ctx, sx, sy, r);
        } else if (st.brushType === 'sakura') {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate((stampIdx * 37 * Math.PI) / 180);
          ctx.fillStyle = stampIdx % 2 === 0 ? '#FFB7D5' : '#FFD9E8';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (st.brushType === 'star') {
          ctx.fillStyle = stampIdx % 2 === 0 ? '#FFD166' : '#FF8FA3';
          draw5PointStar(ctx, sx, sy, r, r * 0.45);
        } else if (st.brushType === 'bubble') {
          const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.85)');
          g.addColorStop(0.65, 'rgba(180,230,255,0.28)');
          g.addColorStop(1, 'rgba(255,190,235,0.65)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (st.brushType === 'pearl') {
          const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r * 0.72);
          g.addColorStop(0, '#FFFFFF');
          g.addColorStop(0.7, '#F5EDF0');
          g.addColorStop(1, '#D4C2C9');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 0.72, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

function draw4PointStar(ctx: CanvasRenderingContext2D, x: number, y: number, rOut: number, rIn: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? rOut : rIn;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function draw5PointStar(ctx: CanvasRenderingContext2D, x: number, y: number, rOut: number, rIn: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 1.25, y + r * 0.1, x - r * 0.95, y - r * 0.9, x, y - r * 0.2);
  ctx.bezierCurveTo(x + r * 0.95, y - r * 0.9, x + r * 1.25, y + r * 0.1, x, y + r * 0.85);
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders Stickers (Emoji & Y2K Styled Badges)
 */
export function applyStickers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stickers: StickerLayer[]
): void {
  const minDim = Math.min(w, h);
  for (const st of stickers) {
    ctx.save();
    ctx.globalAlpha = st.opacity;
    ctx.translate(st.x * w, st.y * h);
    ctx.rotate((st.rotation * Math.PI) / 180);
    ctx.scale(st.flipX ? -st.scale : st.scale, st.scale);

    if (st.kind === 'emoji') {
      const fontSize = Math.round(minDim * 0.13);
      ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.content, 0, 0);
    } else if (st.kind === 'badge') {
      const fontSize = Math.round(minDim * 0.04);
      ctx.font = `700 ${fontSize}px 'Prompt', 'Inter', sans-serif`;
      const metrics = ctx.measureText(st.content);
      const padX = fontSize * 0.72;
      const padY = fontSize * 0.42;
      const bw = metrics.width + padX * 2;
      const bh = fontSize + padY * 2;

      ctx.fillStyle = st.color ?? '#FF4F7B';
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.content, 0, 1);
    }
    ctx.restore();
  }
}

/**
 * Renders Typography / Text Layers with Thai & English fonts, stroke, glow, and pill backgrounds
 */
export function applyTextLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  texts: TextLayer[]
): void {
  const minDim = Math.min(w, h);
  for (const t of texts) {
    if (!t.text.trim()) continue;
    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.translate(t.x * w, t.y * h);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scale, t.scale);

    const fontPx = Math.max(12, Math.round((t.fontSize / 100) * minDim));
    ctx.font = `700 ${fontPx}px ${t.fontFamily}`;
    ctx.textAlign = t.align;
    ctx.textBaseline = 'middle';

    const lines = t.text.split('\n');
    const lineH = fontPx * 1.28;
    const totalH = lines.length * lineH;
    const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));

    if (t.bgColor && t.bgColor !== 'transparent') {
      const padX = fontPx * 0.55;
      const padY = fontPx * 0.3;
      const bx = t.align === 'left' ? -padX : t.align === 'right' ? -maxW - padX : -maxW / 2 - padX;
      ctx.fillStyle = t.bgColor;
      roundRectPath(ctx, bx, -totalH / 2 - padY, maxW + padX * 2, totalH + padY * 2, fontPx * 0.42);
      ctx.fill();
    }

    if (t.shadow) {
      ctx.shadowColor = t.preset === 'neon' ? t.strokeColor : 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = t.preset === 'neon' ? fontPx * 0.55 : fontPx * 0.25;
      ctx.shadowOffsetY = t.preset === 'neon' ? 0 : fontPx * 0.08;
    }

    lines.forEach((line, idx) => {
      const ly = -totalH / 2 + lineH * (idx + 0.5);
      if (t.strokeWidth > 0) {
        ctx.strokeStyle = t.strokeColor;
        ctx.lineWidth = t.strokeWidth * (fontPx / 24);
        ctx.lineJoin = 'round';
        ctx.strokeText(line, 0, ly);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(line, 0, ly);
    });

    ctx.restore();
  }
}

/**
 * Wraps the edited canvas with iconic Meitu Frames (Polaroid, 35mm Film, Magazine, Pastel Pink, Museum, Cinema, Y2K)
 */
export function applyFrame(
  source: HTMLCanvasElement,
  frame: FrameSettings
): HTMLCanvasElement {
  if (frame.style === 'none') return source;

  const w = source.width;
  const h = source.height;
  const minDim = Math.min(w, h);
  const pad = Math.max(12, Math.round((frame.thickness / 100) * minDim * 0.14));

  let top = pad,
    right = pad,
    bottom = pad,
    left = pad;

  if (frame.style === 'polaroid') {
    bottom = Math.round(pad * 3.1);
  } else if (frame.style === 'film') {
    left = Math.round(pad * 1.45);
    right = Math.round(pad * 1.45);
    top = Math.round(pad * 0.65);
    bottom = Math.round(pad * 0.65);
  } else if (frame.style === 'cinema') {
    left = 0;
    right = 0;
    top = Math.round(h * 0.1);
    bottom = Math.round(h * 0.1);
  } else if (frame.style === 'magazine') {
    top = Math.round(pad * 0.4);
    right = Math.round(pad * 0.4);
    bottom = Math.round(pad * 0.4);
    left = Math.round(pad * 0.4);
  } else if (frame.style === 'museum') {
    top = right = bottom = left = Math.round(pad * 1.6);
  }

  const out = document.createElement('canvas');
  out.width = w + left + right;
  out.height = h + top + bottom;
  const ctx = out.getContext('2d')!;

  // Background fill
  if (frame.style === 'film' || frame.style === 'cinema') {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, out.width, out.height);
  } else if (frame.style === 'pastelPink') {
    const g = ctx.createLinearGradient(0, 0, out.width, out.height);
    g.addColorStop(0, '#FFD6E3');
    g.addColorStop(1, '#FFF0F5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.width, out.height);
  } else if (frame.style === 'y2k') {
    const g = ctx.createLinearGradient(0, 0, out.width, out.height);
    g.addColorStop(0, '#FF4F7B');
    g.addColorStop(0.5, '#A855F7');
    g.addColorStop(1, '#38BDF8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.width, out.height);
  } else {
    ctx.fillStyle = frame.style === 'white' || frame.style === 'polaroid' || frame.style === 'museum' ? frame.color : '#FFFFFF';
    ctx.fillRect(0, 0, out.width, out.height);
  }

  // Draw inner photo
  ctx.drawImage(source, left, top);

  // Frame-specific accents
  if (frame.style === 'polaroid') {
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, w, h);
    if (frame.caption) {
      const fSize = Math.max(14, Math.round(bottom * 0.28));
      ctx.fillStyle = '#4B444A';
      ctx.font = `500 ${fSize}px 'Pacifico', 'Prompt', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(frame.caption, out.width / 2, top + h + bottom * 0.52);
    }
  } else if (frame.style === 'film') {
    // 35mm sprocket holes!
    const holeW = Math.max(6, Math.round(left * 0.44));
    const holeH = Math.round(holeW * 1.35);
    const step = Math.round(holeH * 1.9);
    ctx.fillStyle = '#F3F4F6';
    for (let y = top; y < out.height - holeH; y += step) {
      roundRectPath(ctx, (left - holeW) / 2, y, holeW, holeH, 3);
      ctx.fill();
      roundRectPath(ctx, out.width - (right + holeW) / 2, y, holeW, holeH, 3);
      ctx.fill();
    }
    ctx.fillStyle = '#F59E0B';
    ctx.font = `700 ${Math.max(10, Math.round(left * 0.22))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('KODAK 400 · 24A', out.width / 2, out.height - bottom * 0.25);
  } else if (frame.style === 'magazine') {
    const titleSize = Math.round(w * 0.14);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 14;
    ctx.font = `700 ${titleSize}px 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MEITU VOGUE', out.width / 2, top + titleSize * 1.05);
    ctx.shadowBlur = 0;
    if (frame.caption) {
      const subSize = Math.max(12, Math.round(w * 0.032));
      ctx.font = `600 ${subSize}px 'Prompt', sans-serif`;
      ctx.fillText(frame.caption, out.width / 2, out.height - bottom - subSize * 1.2);
    }
  } else if (frame.style === 'museum') {
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = Math.max(2, Math.round(minDim * 0.004));
    ctx.strokeRect(left - 6, top - 6, w + 12, h + 12);
  } else if (frame.style === 'cinema' && frame.caption) {
    const subSize = Math.max(13, Math.round(bottom * 0.3));
    ctx.fillStyle = '#FFE8A3';
    ctx.font = `500 ${subSize}px 'Sarabun', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.caption, out.width / 2, top + h + bottom * 0.5);
  }

  return out;
}

export function applyWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const minDim = Math.min(w, h);
  const fSize = Math.max(14, Math.round(minDim * 0.028));
  ctx.save();
  ctx.font = `700 ${fSize}px 'Prompt', 'Inter', sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('✦ Meitu Studio AI', w - fSize * 0.85, h - fSize * 0.65);
  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
