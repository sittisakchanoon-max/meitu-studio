import { BeautySettings, DetectedFace, HealStroke } from '../types/editor';
import { FACE_REGIONS } from './mediapipe';

function clamp(v: number, lo = 0, hi = 255): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Computes smooth YCbCr skin-tone probability [0..1]
 */
function skinToneWeight(r: number, g: number, b: number): number {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const dCb = (cb - 105) / 26;
  const dCr = (cr - 150) / 24;
  const distSq = dCb * dCb + dCr * dCr;
  if (distSq > 2.2) return 0;
  return Math.exp(-distSq * 1.45);
}

/**
 * Draws a polygon mask of landmark indices onto a 2D context
 */
function drawLandmarkPoly(
  ctx: CanvasRenderingContext2D,
  lms: Array<{ x: number; y: number }>,
  indices: number[],
  w: number,
  h: number
) {
  if (indices.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(lms[indices[0]].x * w, lms[indices[0]].y * h);
  for (let i = 1; i < indices.length; i++) {
    ctx.lineTo(lms[indices[i]].x * w, lms[indices[i]].y * h);
  }
  ctx.closePath();
}

/**
 * Builds a feathered skin mask (1 = face skin, 0 = eyes/brows/lips/background)
 */
function buildFaceSkinMask(
  faces: DetectedFace[],
  w: number,
  h: number
): Uint8ClampedArray | null {
  if (faces.length === 0) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  for (const face of faces) {
    const lms = face.landmarks;
    if (lms.length < 468) continue;

    // Fill face oval + slight neck extension
    ctx.save();
    ctx.filter = `blur(${Math.max(4, Math.round(face.box.w * w * 0.04))}px)`;
    ctx.fillStyle = '#ffffff';
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.faceOval, w, h);
    ctx.fill();
    ctx.restore();

    // Carve out eyes, eyebrows, and outer lips so they stay sharp & crisp!
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = `blur(${Math.max(2, Math.round(face.box.w * w * 0.015))}px)`;
    ctx.fillStyle = '#ffffff';
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.leftEye, w, h);
    ctx.fill();
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.rightEye, w, h);
    ctx.fill();
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.leftEyebrow, w, h);
    ctx.fill();
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.rightEyebrow, w, h);
    ctx.fill();
    drawLandmarkPoly(ctx, lms, FACE_REGIONS.outerLips, w, h);
    ctx.fill();
    ctx.restore();
  }

  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = data[i * 4 + 3];
  }
  return mask;
}

/**
 * Applies full Meitu Portrait Beauty Retouch suite:
 * Skin Smooth (edge-preserving), Whiten, Rosy, Even Tone, Matte, Dark Circles,
 * Smile Lines (Nasolabial), Eye Brightener, Teeth Whitening, and Glass Skin Glow!
 */
export function applyBeautyRetouch(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  faces: DetectedFace[],
  beauty: BeautySettings
): void {
  const hasAny =
    beauty.smooth > 0 ||
    beauty.whiten > 0 ||
    beauty.rosy > 0 ||
    beauty.evenTone > 0 ||
    beauty.matte > 0 ||
    beauty.darkCircles > 0 ||
    beauty.nasolabial > 0 ||
    beauty.brightenEyes > 0 ||
    beauty.teethWhiten > 0 ||
    beauty.hdrGlow > 0 ||
    beauty.faceLight > 0;
  if (!hasAny) return;

  const smoothAmt = beauty.smooth / 100;
  const whitenAmt = beauty.whiten / 100;
  const rosyAmt = beauty.rosy / 100;
  const evenAmt = beauty.evenTone / 100;
  const matteAmt = beauty.matte / 100;

  // Create blurred reference copy for edge-preserving skin smoothing & even tone
  let blurData: Uint8ClampedArray | null = null;
  if (smoothAmt > 0.01 || evenAmt > 0.01 || matteAmt > 0.01) {
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d')!;
    const blurRadius = Math.max(2, Math.round(Math.min(w, h) * (0.008 + smoothAmt * 0.012)));
    bCtx.filter = `blur(${blurRadius}px)`;
    bCtx.drawImage(ctx.canvas, 0, 0);
    blurData = bCtx.getImageData(0, 0, w, h).data;
  }

  const faceMask = buildFaceSkinMask(faces, w, h);

  // Main pixel pass for skin smooth, whiten, rosy, evenTone, matte
  if (smoothAmt > 0 || whitenAmt > 0 || rosyAmt > 0 || evenAmt > 0 || matteAmt > 0) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      const skinProb = skinToneWeight(r, g, b);
      // Combine detected face mask with skin probability so neck/arms ALSO smooth nicely
      let weight: number;
      if (faceMask) {
        const fm = faceMask[p] / 255;
        // High weight inside face skin oval, moderate weight for neck/arms skin pixels
        weight = Math.max(fm * (0.35 + 0.65 * skinProb), skinProb * 0.62);
      } else {
        weight = skinProb * 0.85;
      }

      if (weight < 0.02) continue;

      // 1. Edge-preserving Skin Smoothing (bilateral-inspired luminance preservation)
      if (blurData && (smoothAmt > 0 || evenAmt > 0)) {
        const br = blurData[i];
        const bg = blurData[i + 1];
        const bb = blurData[i + 2];

        const diff = (Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb)) / 3;
        // Preserve sharp edges (eyelashes, hair strands, glasses) while smoothing pores/blemishes
        const edgePreserve = Math.exp(-(diff * diff) / (2 * 24 * 24));
        const mix = Math.min(0.88, (smoothAmt * 0.78 + evenAmt * 0.25) * weight * edgePreserve);

        // Retain 14% subtle micro-texture so skin looks natural, never plastic!
        const texMix = mix * 0.86;
        r = r + (br - r) * texMix;
        g = g + (bg - g) * texMix;
        b = b + (bb - b) * texMix;
      }

      // 2. Matte / De-shine (softens oily specular highlights on forehead/nose)
      if (matteAmt > 0 && blurData) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 188) {
          const shineFactor = ((lum - 188) / 67) * matteAmt * weight * 0.55;
          r = r + (blurData[i] * 0.92 - r) * shineFactor;
          g = g + (blurData[i + 1] * 0.92 - g) * shineFactor;
          b = b + (blurData[i + 2] * 0.92 - b) * shineFactor;
        }
      }

      // 3. Skin Whiten / Brighten (smooth soft-gamma lift preserving highlights)
      if (whitenAmt > 0) {
        const lift = whitenAmt * weight * 0.34;
        r = r + (255 - r) * lift * 0.92;
        g = g + (255 - g) * lift * 0.96;
        b = b + (255 - b) * lift * 1.02; // slight cool lift removes dullness/yellowness
      }

      // 4. Rosy Healthy Glow (warm pinkish peach undertone)
      if (rosyAmt > 0) {
        const rw = rosyAmt * weight;
        r = r + rw * 16;
        g = g + rw * 2;
        b = b + rw * 6;
      }

      d[i] = clamp(r);
      d[i + 1] = clamp(g);
      d[i + 2] = clamp(b);
    }

    ctx.putImageData(img, 0, 0);
  }

  // Landmark-specific targeted beauty enhancements
  if (faces.length > 0) {
    for (const face of faces) {
      const lms = face.landmarks;
      if (lms.length < 468) continue;
      const faceW = face.box.w * w;

      // 5. Dark Circles Softener (under-eye brightening & smoothing)
      if (beauty.darkCircles > 0) {
        const alpha = (beauty.darkCircles / 100) * 0.36;
        ctx.save();
        ctx.filter = `blur(${Math.max(4, Math.round(faceW * 0.035))}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 224, 208, ${alpha})`;
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.leftUnderEye, w, h);
        ctx.fill();
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.rightUnderEye, w, h);
        ctx.fill();
        ctx.restore();
      }

      // 6. Nasolabial (Smile Lines) Softener
      if (beauty.nasolabial > 0) {
        const alpha = (beauty.nasolabial / 100) * 0.28;
        ctx.save();
        ctx.filter = `blur(${Math.max(4, Math.round(faceW * 0.035))}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 232, 218, ${alpha})`;
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.leftNasolabial, w, h);
        ctx.fill();
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.rightNasolabial, w, h);
        ctx.fill();
        ctx.restore();
      }

      // 7. Brighten Eyes (subtle crisp eye clarity + sclera lift + catchlight sparkle)
      if (beauty.brightenEyes > 0) {
        const amt = beauty.brightenEyes / 100;
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(255, 255, 255, ${amt * 0.42})`;
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.leftEye, w, h);
        ctx.fill();
        drawLandmarkPoly(ctx, lms, FACE_REGIONS.rightEye, w, h);
        ctx.fill();
        ctx.restore();

        // Tiny bright catchlight dot in each iris
        if (lms.length > 473) {
          const lIris = lms[FACE_REGIONS.leftIrisCenter];
          const rIris = lms[FACE_REGIONS.rightIrisCenter];
          const dotR = Math.max(1.2, faceW * 0.011);
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${amt * 0.72})`;
          ctx.beginPath();
          ctx.arc(lIris.x * w - dotR * 1.1, lIris.y * h - dotR * 1.1, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rIris.x * w - dotR * 1.1, rIris.y * h - dotR * 1.1, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 8. Teeth Whitening (brightens & neutralizes yellow inside inner mouth cavity)
      if (beauty.teethWhiten > 0) {
        const amt = beauty.teethWhiten / 100;
        const inner = FACE_REGIONS.innerLips;
        let minX = w,
          minY = h,
          maxX = 0,
          maxY = 0;
        for (const idx of inner) {
          const px = lms[idx].x * w;
          const py = lms[idx].y * h;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
        const bw = Math.ceil(maxX - minX);
        const bh = Math.ceil(maxY - minY);
        if (bw > 4 && bh > 2) {
          const mCanvas = document.createElement('canvas');
          mCanvas.width = w;
          mCanvas.height = h;
          const mCtx = mCanvas.getContext('2d')!;
          mCtx.fillStyle = '#fff';
          drawLandmarkPoly(mCtx, lms, inner, w, h);
          mCtx.fill();
          const mData = mCtx.getImageData(Math.floor(minX), Math.floor(minY), bw, bh).data;
          const tImg = ctx.getImageData(Math.floor(minX), Math.floor(minY), bw, bh);
          const td = tImg.data;
          for (let i = 0; i < td.length; i += 4) {
            const mAlpha = mData[i + 3] / 255;
            if (mAlpha < 0.2) continue;
            const r = td[i],
              g = td[i + 1],
              b = td[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // Only whiten bright pixels (teeth), not dark oral cavity!
            if (lum > 115) {
              const wFactor = Math.min(1, (lum - 115) / 80) * amt * mAlpha;
              const target = Math.min(252, lum + 35 * wFactor);
              td[i] = clamp(r + (target - r) * wFactor * 0.72);
              td[i + 1] = clamp(g + (target - g) * wFactor * 0.78);
              td[i + 2] = clamp(b + (target - b) * wFactor * 0.92);
            }
          }
          ctx.putImageData(tImg, Math.floor(minX), Math.floor(minY));
        }
      }
    }
  }

  // 9. Glass Skin HDR Glow (soft ethereal bloom)
  if (beauty.hdrGlow > 0) {
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = w;
    glowCanvas.height = h;
    const gCtx = glowCanvas.getContext('2d')!;
    gCtx.filter = `blur(${Math.max(8, Math.round(Math.min(w, h) * 0.022))}px) brightness(1.08)`;
    gCtx.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (beauty.hdrGlow / 100) * 0.26;
    ctx.drawImage(glowCanvas, 0, 0);
    ctx.restore();
  }

  // 10. 3D Face Studio Relighting (soft directional beauty key light on face center!)
  if (beauty.faceLight > 0) {
    const amt = (beauty.faceLight / 100) * 0.42;
    const cx = faces.length > 0 ? (faces[0].box.x + faces[0].box.w * 0.5) * w : w * 0.5;
    const cy = faces.length > 0 ? (faces[0].box.y + faces[0].box.h * 0.45) * h : h * 0.42;
    const rad = faces.length > 0 ? Math.max(faces[0].box.w * w, faces[0].box.h * h) * 0.85 : Math.min(w, h) * 0.42;
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const grad = ctx.createRadialGradient(cx, cy, rad * 0.08, cx, cy, rad);
    grad.addColorStop(0, `rgba(255, 250, 246, ${amt * 1.15})`);
    grad.addColorStop(0.55, `rgba(255, 240, 236, ${amt * 0.52})`);
    grad.addColorStop(1, 'rgba(255, 240, 236, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Spot Blemish Removal & Magic Object Eraser:
 * Seamlessly heals painted spots/strokes using multi-ring neighborhood texture diffusion
 */
export function applyHealStrokes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: HealStroke[]
): void {
  if (strokes.length === 0) return;

  const minDim = Math.min(w, h);
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    const rad = Math.max(4, Math.round(stroke.radius * minDim));

    // Build stroke mask + bounding box
    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0;
    for (const p of stroke.points) {
      const px = p.x * w;
      const py = p.y * h;
      if (px - rad < minX) minX = px - rad;
      if (py - rad < minY) minY = py - rad;
      if (px + rad > maxX) maxX = px + rad;
      if (py + rad > maxY) maxY = py + rad;
    }

    const pad = Math.max(10, Math.round(rad * 1.4));
    const x0 = Math.max(0, Math.floor(minX - pad));
    const y0 = Math.max(0, Math.floor(minY - pad));
    const x1 = Math.min(w, Math.ceil(maxX + pad));
    const y1 = Math.min(h, Math.ceil(maxY + pad));
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw < 4 || bh < 4) continue;

    // Mask canvas
    const mCanvas = document.createElement('canvas');
    mCanvas.width = bw;
    mCanvas.height = bh;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.strokeStyle = '#ffffff';
    mCtx.fillStyle = '#ffffff';
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.lineWidth = rad * 2;
    if (stroke.points.length === 1) {
      mCtx.beginPath();
      mCtx.arc(stroke.points[0].x * w - x0, stroke.points[0].y * h - y0, rad, 0, Math.PI * 2);
      mCtx.fill();
    } else {
      mCtx.beginPath();
      mCtx.moveTo(stroke.points[0].x * w - x0, stroke.points[0].y * h - y0);
      for (let i = 1; i < stroke.points.length; i++) {
        mCtx.lineTo(stroke.points[i].x * w - x0, stroke.points[i].y * h - y0);
      }
      mCtx.stroke();
    }

    const maskData = mCtx.getImageData(0, 0, bw, bh).data;
    const patch = ctx.getImageData(x0, y0, bw, bh);
    const pd = patch.data;

    // Build boolean mask of pixels inside heal region
    const inside = new Uint8Array(bw * bh);
    for (let i = 0; i < bw * bh; i++) {
      inside[i] = maskData[i * 4 + 3] > 64 ? 1 : 0;
    }

    // Fast iterative boundary-inward harmonic inpainting (fills cleanly from surrounding skin/bg!)
    const rBuf = new Float32Array(bw * bh);
    const gBuf = new Float32Array(bw * bh);
    const bBuf = new Float32Array(bw * bh);
    for (let i = 0; i < bw * bh; i++) {
      rBuf[i] = pd[i * 4];
      gBuf[i] = pd[i * 4 + 1];
      bBuf[i] = pd[i * 4 + 2];
    }

    // Collect boundary pixels first and initialize inside pixels with nearest border average
    let borderR = 0,
      borderG = 0,
      borderB = 0,
      borderN = 0;
    for (let y = 1; y < bh - 1; y++) {
      for (let x = 1; x < bw - 1; x++) {
        const idx = y * bw + x;
        if (!inside[idx] && (inside[idx - 1] || inside[idx + 1] || inside[idx - bw] || inside[idx + bw])) {
          borderR += rBuf[idx];
          borderG += gBuf[idx];
          borderB += bBuf[idx];
          borderN++;
        }
      }
    }
    if (borderN > 0) {
      borderR /= borderN;
      borderG /= borderN;
      borderB /= borderN;
      for (let i = 0; i < bw * bh; i++) {
        if (inside[i]) {
          rBuf[i] = borderR;
          gBuf[i] = borderG;
          bBuf[i] = borderB;
        }
      }
    }

    // Gauss-Seidel harmonic diffusion passes (converges smoothly across blemishes & objects)
    const iterations = Math.min(48, Math.max(16, Math.round(rad * 1.4)));
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < bh - 1; y++) {
        const row = y * bw;
        for (let x = 1; x < bw - 1; x++) {
          const idx = row + x;
          if (!inside[idx]) continue;
          rBuf[idx] = 0.25 * (rBuf[idx - 1] + rBuf[idx + 1] + rBuf[idx - bw] + rBuf[idx + bw]);
          gBuf[idx] = 0.25 * (gBuf[idx - 1] + gBuf[idx + 1] + gBuf[idx - bw] + gBuf[idx + bw]);
          bBuf[idx] = 0.25 * (bBuf[idx - 1] + bBuf[idx + 1] + bBuf[idx - bw] + bBuf[idx + bw]);
        }
      }
    }

    // Feathered composite back with subtle organic film micro-grain so healed area matches skin texture
    const softCanvas = document.createElement('canvas');
    softCanvas.width = bw;
    softCanvas.height = bh;
    const sCtx = softCanvas.getContext('2d')!;
    sCtx.filter = `blur(${Math.max(2, Math.round(rad * 0.25))}px)`;
    sCtx.drawImage(mCanvas, 0, 0);
    const softMask = sCtx.getImageData(0, 0, bw, bh).data;

    for (let i = 0; i < bw * bh; i++) {
      const a = softMask[i * 4 + 3] / 255;
      if (a <= 0.01) continue;
      // Subtle deterministic micro-grain matching natural photo texture
      const grain = (((i * 2654435761) >>> 24) / 255 - 0.5) * 4.5;
      pd[i * 4] = clamp(pd[i * 4] * (1 - a) + (rBuf[i] + grain) * a);
      pd[i * 4 + 1] = clamp(pd[i * 4 + 1] * (1 - a) + (gBuf[i] + grain) * a);
      pd[i * 4 + 2] = clamp(pd[i * 4 + 2] * (1 - a) + (bBuf[i] + grain) * a);
    }

    ctx.putImageData(patch, x0, y0);
  }
}
