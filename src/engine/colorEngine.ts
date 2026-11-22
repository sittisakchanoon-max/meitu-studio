import { getFilterById } from '../data/filters';
import {
  AdjustSettings,
  AIStyleSettings,
  CurvePoint,
  CurveSettings,
  FilterSettings,
  HSLChannelKey,
  HSLSettings,
} from '../types/editor';

function clamp(v: number, lo = 0, hi = 255): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Builds a smooth 256-entry LUT from user curve control points using monotone cubic interpolation
 */
export function buildCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  const n = sorted.length;
  const xs = sorted.map((p) => p.x);
  const ys = sorted.map((p) => p.y);
  const dxs: number[] = [];
  const dys: number[] = [];
  const ms: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = Math.max(0.0001, xs[i + 1] - xs[i]);
    const dy = ys[i + 1] - ys[i];
    dxs.push(dx);
    dys.push(dy);
    ms.push(dy / dx);
  }

  const c1s: number[] = [ms[0]];
  for (let i = 0; i < dxs.length - 1; i++) {
    const m = ms[i];
    const mNext = ms[i + 1];
    if (m * mNext <= 0) {
      c1s.push(0);
    } else {
      const dx = dxs[i];
      const dxNext = dxs[i + 1];
      const common = dx + dxNext;
      c1s.push((3 * common) / ((common + dxNext) / m + (common + dx) / mNext));
    }
  }
  c1s.push(ms[ms.length - 1]);

  const c2s: number[] = [];
  const c3s: number[] = [];
  for (let i = 0; i < c1s.length - 1; i++) {
    const c1 = c1s[i];
    const m = ms[i];
    const invDx = 1 / dxs[i];
    const common = c1 + c1s[i + 1] - m - m;
    c2s.push((m - c1 - common) * invDx);
    c3s.push(common * invDx * invDx);
  }

  for (let x = 0; x < 256; x++) {
    if (x <= xs[0]) {
      lut[x] = clamp(Math.round(ys[0]));
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[x] = clamp(Math.round(ys[n - 1]));
      continue;
    }
    let idx = 0;
    while (idx < n - 2 && x > xs[idx + 1]) idx++;
    const diff = x - xs[idx];
    const y = ys[idx] + diff * (c1s[idx] + diff * (c2s[idx] + diff * c3s[idx]));
    lut[x] = clamp(Math.round(y));
  }
  return lut;
}

function isCurveLinear(pts: CurvePoint[]): boolean {
  if (pts.length !== 2) return false;
  return pts[0].x === 0 && pts[0].y === 0 && pts[1].x === 255 && pts[1].y === 255;
}

const HSL_CENTERS: Record<HSLChannelKey, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  cyan: 180,
  blue: 225,
  purple: 275,
  magenta: 320,
};

const HSL_KEYS = Object.keys(HSL_CENTERS) as HSLChannelKey[];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) * 0.5;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Applies unified Tone Adjust + 42 Meitu Filters + 8-Channel HSL + Tone Curves + Sharpness + AI Art Styles
 */
export function applyColorAndStyle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adjust: AdjustSettings,
  filter: FilterSettings,
  hsl: HSLSettings,
  curves: CurveSettings,
  aiStyle: AIStyleSettings
): void {
  const recipe = getFilterById(filter.id);
  const fAmt = filter.id === 'original' ? 0 : filter.intensity / 100;

  const hasAdjust = Object.values(adjust).some((v) => Math.abs(v) > 0.01);
  const hasHsl = HSL_KEYS.some(
    (k) => Math.abs(hsl[k].h) > 0.5 || Math.abs(hsl[k].s) > 0.5 || Math.abs(hsl[k].l) > 0.5
  );
  const hasCurveRgb = !isCurveLinear(curves.rgb);
  const hasCurveR = !isCurveLinear(curves.r);
  const hasCurveG = !isCurveLinear(curves.g);
  const hasCurveB = !isCurveLinear(curves.b);
  const hasCurves = hasCurveRgb || hasCurveR || hasCurveG || hasCurveB;

  if (hasAdjust || fAmt > 0 || hasHsl || hasCurves) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    const lutRgb = hasCurveRgb ? buildCurveLUT(curves.rgb) : null;
    const lutR = hasCurveR ? buildCurveLUT(curves.r) : null;
    const lutG = hasCurveG ? buildCurveLUT(curves.g) : null;
    const lutB = hasCurveB ? buildCurveLUT(curves.b) : null;

    // Combined scalar parameters
    const exposureMult = Math.pow(2, (adjust.exposure / 100) * 1.35 + (recipe.exposure ?? 0) * fAmt * 1.4);
    const brightnessAdd = (adjust.brightness / 100) * 68;
    const contrastVal = adjust.contrast / 100 + (recipe.contrast ?? 0) * fAmt;
    const contrastFactor = contrastVal >= 0 ? 1 + contrastVal * 1.15 : 1 + contrastVal * 0.72;
    const satVal = 1 + adjust.saturation / 100 + (recipe.saturation ?? 0) * fAmt;
    const vibranceVal = adjust.vibrance / 100;
    const tempVal = (adjust.temperature / 100) * 32 + (recipe.warmth ?? 0) * fAmt * 42;
    const tintVal = (adjust.tint / 100) * 28 + (recipe.tint ?? 0) * fAmt * 38;
    const highlightsVal = (adjust.highlights / 100) * 58;
    const shadowsVal = (adjust.shadows / 100) * 64;
    const whitesVal = (adjust.whites / 100) * 44;
    const blacksVal = (adjust.blacks / 100) * 44;
    const fadeVal = Math.min(0.45, (adjust.fade / 100) * 0.32 + (recipe.fade ?? 0) * fAmt);
    const vignetteVal = adjust.vignette / 100 + (recipe.vignette ?? 0) * fAmt;
    const grainVal = (adjust.grain / 100) * 34 + (recipe.grain ?? 0) * fAmt * 38;
    const grayAmt = (recipe.grayscale ?? 0) * fAmt;
    const sepiaAmt = (recipe.sepia ?? 0) * fAmt;
    const sTint = recipe.shadowTint;
    const hTint = recipe.highlightTint;

    const invW = 1 / w;
    const invH = 1 / h;

    for (let y = 0; y < h; y++) {
      const ny = y * invH - 0.5;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (d[idx + 3] === 0) continue;

        let r = d[idx];
        let g = d[idx + 1];
        let b = d[idx + 2];

        // 1. Exposure + Brightness
        r = r * exposureMult + brightnessAdd;
        g = g * exposureMult + brightnessAdd;
        b = b * exposureMult + brightnessAdd;

        // 2. White Balance (Temperature + Tint)
        if (tempVal !== 0 || tintVal !== 0) {
          r += tempVal + tintVal * 0.45;
          g -= tintVal * 0.55;
          b -= tempVal - tintVal * 0.45;
        }

        // 3. Shadows / Highlights / Whites / Blacks tonal recovery
        if (highlightsVal !== 0 || shadowsVal !== 0 || whitesVal !== 0 || blacksVal !== 0) {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const lClamped = Math.max(0, Math.min(1, lum));
          const shW = (1 - lClamped) * (1 - lClamped);
          const hiW = lClamped * lClamped;
          const whW = hiW * lClamped;
          const blW = shW * (1 - lClamped);
          const delta = shadowsVal * shW + highlightsVal * hiW + whitesVal * whW + blacksVal * blW;
          r += delta;
          g += delta;
          b += delta;
        }

        // 4. Contrast
        if (contrastFactor !== 1) {
          r = (r - 128) * contrastFactor + 128;
          g = (g - 128) * contrastFactor + 128;
          b = (b - 128) * contrastFactor + 128;
        }

        // 5. Split-toning (Filter shadow & highlight tints)
        if (fAmt > 0 && (sTint || hTint)) {
          const lum = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
          if (sTint) {
            const sw = (1 - lum) * fAmt;
            r += sTint[0] * sw;
            g += sTint[1] * sw;
            b += sTint[2] * sw;
          }
          if (hTint) {
            const hw = lum * fAmt;
            r += hTint[0] * hw;
            g += hTint[1] * hw;
            b += hTint[2] * hw;
          }
        }

        // 6. Saturation & Vibrance
        if (satVal !== 1 || vibranceVal !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          let localSat = satVal;
          if (vibranceVal !== 0) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const curSat = maxC > 1 ? (maxC - minC) / maxC : 0;
            localSat += vibranceVal * (1 - curSat);
          }
          r = gray + (r - gray) * localSat;
          g = gray + (g - gray) * localSat;
          b = gray + (b - gray) * localSat;
        }

        // 7. Sepia & Grayscale (B&W / Vintage filters)
        if (sepiaAmt > 0) {
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          r = r * (1 - sepiaAmt) + sr * sepiaAmt;
          g = g * (1 - sepiaAmt) + sg * sepiaAmt;
          b = b * (1 - sepiaAmt) + sb * sepiaAmt;
        }
        if (grayAmt > 0) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = r * (1 - grayAmt) + lum * grayAmt;
          g = g * (1 - grayAmt) + lum * grayAmt;
          b = b * (1 - grayAmt) + lum * grayAmt;
        }

        // 8. 8-Channel HSL Color Mixer
        if (hasHsl) {
          r = clamp(r);
          g = clamp(g);
          b = clamp(b);
          const [ch, cs, cl] = rgbToHsl(r, g, b);
          if (cs > 0.03) {
            let dh = 0,
              ds = 0,
              dl = 0;
            for (const key of HSL_KEYS) {
              const adj = hsl[key];
              if (adj.h === 0 && adj.s === 0 && adj.l === 0) continue;
              let dist = Math.abs(ch - HSL_CENTERS[key]);
              if (dist > 180) dist = 360 - dist;
              if (dist < 42) {
                const wt = 1 - dist / 42;
                const smoothW = wt * wt * (3 - 2 * wt);
                dh += (adj.h / 100) * 35 * smoothW;
                ds += (adj.s / 100) * 0.65 * smoothW;
                dl += (adj.l / 100) * 0.32 * smoothW;
              }
            }
            if (dh !== 0 || ds !== 0 || dl !== 0) {
              const [nr, ng, nb] = hslToRgb(
                ch + dh,
                Math.max(0, Math.min(1, cs + ds * cs)),
                Math.max(0, Math.min(1, cl + dl))
              );
              r = nr;
              g = ng;
              b = nb;
            }
          }
        }

        // 9. Fade (Matte lifted blacks)
        if (fadeVal > 0) {
          const lift = fadeVal * 62;
          r = lift + r * (1 - fadeVal * 0.24);
          g = lift + g * (1 - fadeVal * 0.24);
          b = lift + b * (1 - fadeVal * 0.24);
        }

        // 10. Tone Curves LUT
        r = clamp(r);
        g = clamp(g);
        b = clamp(b);
        if (hasCurves) {
          const ri = Math.round(r);
          const gi = Math.round(g);
          const bi = Math.round(b);
          r = lutR ? lutR[ri] : ri;
          g = lutG ? lutG[gi] : gi;
          b = lutB ? lutB[bi] : bi;
          if (lutRgb) {
            r = lutRgb[r];
            g = lutRgb[g];
            b = lutRgb[b];
          }
        }

        // 11. Vignette
        if (vignetteVal !== 0) {
          const nx = x * invW - 0.5;
          const dist = Math.sqrt(nx * nx + ny * ny) * 1.45;
          const vig = Math.max(0, dist - 0.35);
          const factor = vig * vig * vignetteVal;
          if (vignetteVal > 0) {
            const mult = Math.max(0.12, 1 - factor * 1.1);
            r *= mult;
            g *= mult;
            b *= mult;
          } else {
            const lift = Math.min(1, -factor * 0.9);
            r += (255 - r) * lift;
            g += (255 - g) * lift;
            b += (255 - b) * lift;
          }
        }

        // 12. Deterministic Organic Film Grain
        if (grainVal > 0) {
          const hash = (((x * 374761393 + y * 668265263) ^ ((x + y) * 1274126177)) >>> 24) / 255;
          const noise = (hash - 0.5) * grainVal;
          r += noise;
          g += noise;
          b += noise;
        }

        d[idx] = clamp(r);
        d[idx + 1] = clamp(g);
        d[idx + 2] = clamp(b);
      }
    }

    ctx.putImageData(img, 0, 0);

    // Filter dreamy skin glow (for Meitu Sakura / Fairy / Korean Cream filters)
    if (fAmt > 0 && (recipe.skinGlow ?? 0) > 0) {
      const glowC = document.createElement('canvas');
      glowC.width = w;
      glowC.height = h;
      const gCtx = glowC.getContext('2d')!;
      gCtx.filter = `blur(${Math.max(6, Math.round(Math.min(w, h) * 0.018))}px)`;
      gCtx.drawImage(ctx.canvas, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = (recipe.skinGlow ?? 0) * fAmt * 0.55;
      ctx.drawImage(glowC, 0, 0);
      ctx.restore();
    }
  }

  // Sharpness + Clarity (fast unsharp mask)
  if (adjust.sharpness > 0 || Math.abs(adjust.clarity) > 1) {
    applyUnsharpMask(ctx, w, h, adjust.sharpness / 100, adjust.clarity / 100);
  }

  // AI Art Styles & HD Auto Enhance
  if (aiStyle.style !== 'none' && aiStyle.intensity > 0) {
    applyAIArtStyle(ctx, w, h, aiStyle.style, aiStyle.intensity / 100);
  }
}

function applyUnsharpMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sharpness: number,
  clarity: number
) {
  const blurC = document.createElement('canvas');
  blurC.width = w;
  blurC.height = h;
  const bCtx = blurC.getContext('2d')!;
  const rad = Math.abs(clarity) > sharpness ? 6 : 1.5;
  bCtx.filter = `blur(${rad}px)`;
  bCtx.drawImage(ctx.canvas, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const blr = bCtx.getImageData(0, 0, w, h).data;
  const d = src.data;
  const amount = sharpness * 1.15 + clarity * 0.72;

  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + (d[i] - blr[i]) * amount);
    d[i + 1] = clamp(d[i + 1] + (d[i + 1] - blr[i + 1]) * amount);
    d[i + 2] = clamp(d[i + 2] + (d[i + 2] - blr[i + 2]) * amount);
  }
  ctx.putImageData(src, 0, 0);
}

/**
 * Client-side AI Art & Enhancement Styles (HD Enhance, Anime, Sketch, Oil Paint, Pop Comic, Retro VHS, Pastel Dream, Cyber Neon)
 */
function applyAIArtStyle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: AIStyleSettings['style'],
  amt: number
) {
  if (style === 'hdEnhance') {
    // Auto white-balance + local micro-contrast + clarity boost
    applyUnsharpMask(ctx, w, h, 0.75 * amt, 0.45 * amt);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // Compute 2nd & 98th percentile luminance for clean auto-levels
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    const total = w * h;
    let lo = 0,
      hi = 255,
      acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= total * 0.015) {
        lo = i;
        break;
      }
    }
    acc = 0;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= total * 0.015) {
        hi = i;
        break;
      }
    }
    const scale = hi > lo + 20 ? 255 / (hi - lo) : 1;
    for (let i = 0; i < d.length; i += 4) {
      const nr = clamp((d[i] - lo) * scale);
      const ng = clamp((d[i + 1] - lo) * scale);
      const nb = clamp((d[i + 2] - lo) * scale);
      d[i] = d[i] * (1 - amt * 0.55) + nr * amt * 0.55;
      d[i + 1] = d[i + 1] * (1 - amt * 0.55) + ng * amt * 0.55;
      d[i + 2] = d[i + 2] * (1 - amt * 0.55) + nb * amt * 0.55;
    }
    ctx.putImageData(img, 0, 0);
    return;
  }

  const orig = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(orig.data);
  const out = orig.data;

  if (style === 'anime' || style === 'popComic') {
    // Smooth quantized cel-shading + crisp Sobel ink contours
    const smoothC = document.createElement('canvas');
    smoothC.width = w;
    smoothC.height = h;
    const sCtx = smoothC.getContext('2d')!;
    sCtx.filter = `blur(${style === 'anime' ? 2.5 : 2}px) saturate(${style === 'anime' ? 1.38 : 1.55})`;
    sCtx.drawImage(ctx.canvas, 0, 0);
    const sm = sCtx.getImageData(0, 0, w, h).data;

    const levels = style === 'anime' ? 7 : 5;
    const step = 255 / levels;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        // Fast Sobel edge gradient on luminance
        const lum = (px: number) => 0.299 * src[px] + 0.587 * src[px + 1] + 0.114 * src[px + 2];
        const tl = lum(((y - 1) * w + (x - 1)) * 4);
        const tc = lum(((y - 1) * w + x) * 4);
        const tr = lum(((y - 1) * w + (x + 1)) * 4);
        const ml = lum((y * w + (x - 1)) * 4);
        const mr = lum((y * w + (x + 1)) * 4);
        const bl = lum(((y + 1) * w + (x - 1)) * 4);
        const bc = lum(((y + 1) * w + x) * 4);
        const br = lum(((y + 1) * w + (x + 1)) * 4);

        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const edge = Math.min(1, Math.hypot(gx, gy) / (style === 'anime' ? 160 : 120));
        const ink = edge > 0.38 ? 1 - (edge - 0.38) * 1.45 : 1;

        let qr = Math.round(sm[i] / step) * step;
        let qg = Math.round(sm[i + 1] / step) * step;
        let qb = Math.round(sm[i + 2] / step) * step;

        if (style === 'anime') {
          // Soft pastel sakura anime lift
          qr = qr * 0.94 + 18;
          qg = qg * 0.92 + 12;
          qb = qb * 0.95 + 16;
        }

        const fr = clamp(qr * Math.max(0.12, ink));
        const fg = clamp(qg * Math.max(0.12, ink));
        const fb = clamp(qb * Math.max(0.12, ink));

        out[i] = src[i] * (1 - amt) + fr * amt;
        out[i + 1] = src[i + 1] * (1 - amt) + fg * amt;
        out[i + 2] = src[i + 2] * (1 - amt) + fb * amt;
      }
    }
    ctx.putImageData(orig, 0, 0);
    return;
  }

  if (style === 'sketch') {
    // Color-dodge inverted Gaussian pencil sketch!
    const blurC = document.createElement('canvas');
    blurC.width = w;
    blurC.height = h;
    const bCtx = blurC.getContext('2d')!;
    bCtx.filter = 'grayscale(1) invert(1) blur(5px)';
    bCtx.drawImage(ctx.canvas, 0, 0);
    const invBlur = bCtx.getImageData(0, 0, w, h).data;

    for (let i = 0; i < out.length; i += 4) {
      const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const dodge = invBlur[i] >= 254 ? 255 : Math.min(255, (gray * 255) / (255 - invBlur[i]));
      // Slight warm paper cream tint
      const pr = clamp(dodge * 0.99);
      const pg = clamp(dodge * 0.97);
      const pb = clamp(dodge * 0.93);
      out[i] = src[i] * (1 - amt) + pr * amt;
      out[i + 1] = src[i + 1] * (1 - amt) + pg * amt;
      out[i + 2] = src[i + 2] * (1 - amt) + pb * amt;
    }
    ctx.putImageData(orig, 0, 0);
    return;
  }

  if (style === 'oilPaint') {
    // Rich painterly canvas texture with color clustering
    const smoothC = document.createElement('canvas');
    smoothC.width = w;
    smoothC.height = h;
    const sCtx = smoothC.getContext('2d')!;
    sCtx.filter = 'blur(3.5px) saturate(1.45) contrast(1.18)';
    sCtx.drawImage(ctx.canvas, 0, 0);
    const sm = sCtx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const brushTex = (Math.sin(x * 0.35 + y * 0.22) * Math.cos(y * 0.45 - x * 0.15)) * 11;
        const qr = clamp(Math.round(sm[i] / 24) * 24 + brushTex);
        const qg = clamp(Math.round(sm[i + 1] / 24) * 24 + brushTex);
        const qb = clamp(Math.round(sm[i + 2] / 24) * 24 + brushTex);
        out[i] = src[i] * (1 - amt) + qr * amt;
        out[i + 1] = src[i + 1] * (1 - amt) + qg * amt;
        out[i + 2] = src[i + 2] * (1 - amt) + qb * amt;
      }
    }
    ctx.putImageData(orig, 0, 0);
    return;
  }

  if (style === 'retroVHS') {
    // Chromatic RGB channel shift + VHS scanlines + warm nostalgic glow
    const shift = Math.max(2, Math.round(w * 0.008 * amt));
    for (let y = 0; y < h; y++) {
      const scanline = y % 3 === 0 ? 0.86 : 1.02;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const rx = Math.min(w - 1, x + shift);
        const bx = Math.max(0, x - shift);
        const r = src[(y * w + rx) * 4] * scanline + 8;
        const g = src[i + 1] * scanline;
        const b = src[(y * w + bx) * 4 + 2] * scanline + 12;
        out[i] = clamp(src[i] * (1 - amt) + r * amt);
        out[i + 1] = clamp(src[i + 1] * (1 - amt) + g * amt);
        out[i + 2] = clamp(src[i + 2] * (1 - amt) + b * amt);
      }
    }
    ctx.putImageData(orig, 0, 0);
    return;
  }

  if (style === 'pastelDream') {
    // Soft Meitu dreamy halo + pink-lavender atmospheric wash
    const blurC = document.createElement('canvas');
    blurC.width = w;
    blurC.height = h;
    const bCtx = blurC.getContext('2d')!;
    bCtx.filter = `blur(${Math.max(10, Math.round(Math.min(w, h) * 0.025))}px) brightness(1.15) saturate(1.25)`;
    bCtx.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.45 * amt;
    ctx.drawImage(blurC, 0, 0);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `rgba(255, 182, 212, ${0.28 * amt})`);
    grad.addColorStop(1, `rgba(186, 212, 255, ${0.28 * amt})`);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  if (style === 'cyberNeon') {
    // High-contrast magenta & electric cyan duotone glow
    for (let i = 0; i < out.length; i += 4) {
      const lum = (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) / 255;
      const nr = clamp(32 + lum * 235 + (lum > 0.5 ? 35 : -10));
      const ng = clamp(18 + (1 - Math.abs(lum - 0.5) * 2) * 185);
      const nb = clamp(85 + (1 - lum * 0.3) * 170);
      out[i] = clamp(src[i] * (1 - amt * 0.78) + nr * amt * 0.78);
      out[i + 1] = clamp(src[i + 1] * (1 - amt * 0.78) + ng * amt * 0.78);
      out[i + 2] = clamp(src[i + 2] * (1 - amt * 0.78) + nb * amt * 0.78);
    }
    ctx.putImageData(orig, 0, 0);
  }
}
