import {
  BodyStretchSettings,
  DetectedFace,
  LiquifyStroke,
  ReshapeSettings,
} from '../types/editor';
import { FACE_REGIONS } from './mediapipe';

interface WarpOp {
  kind: 'push' | 'scale';
  cx: number;
  cy: number;
  radius: number;
  dx?: number;
  dy?: number;
  strength: number; // positive = bloat/enlarge, negative = shrink
}

/**
 * Generates localized smooth mesh warp operations from 478 MediaPipe Face Landmarks
 */
function buildFaceReshapeOps(
  faces: DetectedFace[],
  reshape: ReshapeSettings,
  w: number,
  h: number
): WarpOp[] {
  const ops: WarpOp[] = [];
  if (faces.length === 0) return ops;

  const hasAny = Object.values(reshape).some((v) => Math.abs(v) > 0.5);
  if (!hasAny) return ops;

  for (const face of faces) {
    const lms = face.landmarks;
    if (lms.length < 468) continue;

    const pt = (idx: number) => ({ x: lms[idx].x * w, y: lms[idx].y * h });
    const faceW = face.box.w * w;
    const faceH = face.box.h * h;
    const faceCenter = pt(1); // nose tip / center axis
    const midX = (pt(234).x + pt(454).x) * 0.5;
    const midY = (pt(10).y + pt(152).y) * 0.5;

    // 1. Slim Face (pulls lower cheeks & contour inward toward centerline)
    if (Math.abs(reshape.slimFace) > 0.5) {
      const s = (reshape.slimFace / 100) * 0.14;
      const leftPts = [132, 58, 172, 136];
      const rightPts = [361, 288, 397, 365];
      const rad = faceW * 0.42;
      for (const idx of leftPts) {
        const p = pt(idx);
        ops.push({
          kind: 'push',
          cx: p.x,
          cy: p.y,
          radius: rad,
          dx: (midX - p.x) * s,
          dy: (midY - p.y) * s * 0.15,
          strength: 1,
        });
      }
      for (const idx of rightPts) {
        const p = pt(idx);
        ops.push({
          kind: 'push',
          cx: p.x,
          cy: p.y,
          radius: rad,
          dx: (midX - p.x) * s,
          dy: (midY - p.y) * s * 0.15,
          strength: 1,
        });
      }
    }

    // 2. V-Line Chin (tapers lower jaw & slightly lifts/sharpens chin)
    if (reshape.vLine > 0.5) {
      const s = (reshape.vLine / 100) * 0.16;
      const chin = pt(FACE_REGIONS.chinTip);
      const rad = faceW * 0.34;
      for (const idx of [150, 149, 176]) {
        const p = pt(idx);
        ops.push({
          kind: 'push',
          cx: p.x,
          cy: p.y,
          radius: rad,
          dx: (chin.x - p.x) * s,
          dy: -faceH * s * 0.12,
          strength: 1,
        });
      }
      for (const idx of [379, 378, 400]) {
        const p = pt(idx);
        ops.push({
          kind: 'push',
          cx: p.x,
          cy: p.y,
          radius: rad,
          dx: (chin.x - p.x) * s,
          dy: -faceH * s * 0.12,
          strength: 1,
        });
      }
      ops.push({
        kind: 'push',
        cx: chin.x,
        cy: chin.y,
        radius: faceW * 0.25,
        dx: 0,
        dy: -faceH * (reshape.vLine / 100) * 0.035,
        strength: 1,
      });
    }

    // 3. Jawline refinement
    if (Math.abs(reshape.jawline) > 0.5) {
      const s = (reshape.jawline / 100) * 0.14;
      const rad = faceW * 0.32;
      for (const idx of [172, 136]) {
        const p = pt(idx);
        ops.push({ kind: 'push', cx: p.x, cy: p.y, radius: rad, dx: (midX - p.x) * s, dy: 0, strength: 1 });
      }
      for (const idx of [397, 365]) {
        const p = pt(idx);
        ops.push({ kind: 'push', cx: p.x, cy: p.y, radius: rad, dx: (midX - p.x) * s, dy: 0, strength: 1 });
      }
    }

    // 4. Cheekbones
    if (Math.abs(reshape.cheekbones) > 0.5) {
      const s = (reshape.cheekbones / 100) * 0.13;
      const rad = faceW * 0.34;
      const lC = pt(234);
      const rC = pt(454);
      ops.push({ kind: 'push', cx: lC.x, cy: lC.y, radius: rad, dx: (midX - lC.x) * s, dy: 0, strength: 1 });
      ops.push({ kind: 'push', cx: rC.x, cy: rC.y, radius: rad, dx: (midX - rC.x) * s, dy: 0, strength: 1 });
    }

    // 5. Forehead
    if (Math.abs(reshape.forehead) > 0.5) {
      const fh = pt(FACE_REGIONS.foreheadTop);
      ops.push({
        kind: 'push',
        cx: fh.x,
        cy: fh.y,
        radius: faceW * 0.45,
        dx: 0,
        dy: (reshape.forehead / 100) * faceH * 0.055,
        strength: 1,
      });
    }

    // 5b. Meitu Signature Hair Crown Volume ("ผมพอง / วอลลุ่มผม")
    if (reshape.hairVolume > 0.5) {
      const fh = pt(FACE_REGIONS.foreheadTop);
      const s = reshape.hairVolume / 100;
      const crownY = fh.y - faceH * 0.16;
      const crownRad = faceW * 0.62;
      // Lift crown hair upward & gently puff upper-left / upper-right hair silhouette
      ops.push({
        kind: 'push',
        cx: fh.x,
        cy: crownY,
        radius: crownRad,
        dx: 0,
        dy: -faceH * 0.095 * s,
        strength: 1,
      });
      ops.push({
        kind: 'push',
        cx: fh.x - faceW * 0.34,
        cy: fh.y - faceH * 0.06,
        radius: faceW * 0.48,
        dx: -faceW * 0.055 * s,
        dy: -faceH * 0.045 * s,
        strength: 1,
      });
      ops.push({
        kind: 'push',
        cx: fh.x + faceW * 0.34,
        cy: fh.y - faceH * 0.06,
        radius: faceW * 0.48,
        dx: faceW * 0.055 * s,
        dy: -faceH * 0.045 * s,
        strength: 1,
      });
    }

    // 6. Big Eyes (radial enlargement centered on irises)
    const leftEyeCenter =
      lms.length > 473
        ? pt(FACE_REGIONS.leftIrisCenter)
        : { x: (pt(33).x + pt(133).x) * 0.5, y: (pt(159).y + pt(145).y) * 0.5 };
    const rightEyeCenter =
      lms.length > 473
        ? pt(FACE_REGIONS.rightIrisCenter)
        : { x: (pt(362).x + pt(263).x) * 0.5, y: (pt(386).y + pt(374).y) * 0.5 };

    if (Math.abs(reshape.bigEyes) > 0.5) {
      const eyeR = Math.hypot(pt(133).x - pt(33).x, pt(133).y - pt(33).y) * 1.15;
      const strength = (reshape.bigEyes / 100) * 0.36;
      ops.push({ kind: 'scale', cx: leftEyeCenter.x, cy: leftEyeCenter.y, radius: eyeR, strength });
      ops.push({ kind: 'scale', cx: rightEyeCenter.x, cy: rightEyeCenter.y, radius: eyeR, strength });
    }

    // 7. Eye Tilt (outer eye corner lift/drop)
    if (Math.abs(reshape.eyeTilt) > 0.5) {
      const dy = -(reshape.eyeTilt / 100) * faceH * 0.025;
      const rad = faceW * 0.15;
      const lOut = pt(33);
      const rOut = pt(263);
      ops.push({ kind: 'push', cx: lOut.x, cy: lOut.y, radius: rad, dx: 0, dy, strength: 1 });
      ops.push({ kind: 'push', cx: rOut.x, cy: rOut.y, radius: rad, dx: 0, dy, strength: 1 });
    }

    // 8. Eye Distance
    if (Math.abs(reshape.eyeDistance) > 0.5) {
      const shift = (reshape.eyeDistance / 100) * faceW * 0.032;
      const rad = faceW * 0.22;
      ops.push({ kind: 'push', cx: leftEyeCenter.x, cy: leftEyeCenter.y, radius: rad, dx: -shift, dy: 0, strength: 1 });
      ops.push({ kind: 'push', cx: rightEyeCenter.x, cy: rightEyeCenter.y, radius: rad, dx: shift, dy: 0, strength: 1 });
    }

    // 9. Slim Nose (pulls left/right nose wings inward)
    if (Math.abs(reshape.slimNose) > 0.5) {
      const s = (reshape.slimNose / 100) * 0.28;
      const lWing = pt(FACE_REGIONS.noseLeftWing);
      const rWing = pt(FACE_REGIONS.noseRightWing);
      const noseRad = Math.hypot(rWing.x - lWing.x, rWing.y - lWing.y) * 0.85;
      ops.push({
        kind: 'push',
        cx: lWing.x,
        cy: lWing.y,
        radius: noseRad,
        dx: (faceCenter.x - lWing.x) * s,
        dy: 0,
        strength: 1,
      });
      ops.push({
        kind: 'push',
        cx: rWing.x,
        cy: rWing.y,
        radius: noseRad,
        dx: (faceCenter.x - rWing.x) * s,
        dy: 0,
        strength: 1,
      });
    }

    // 10. Nose Bridge & Nose Tip
    if (Math.abs(reshape.noseBridge) > 0.5) {
      const midN = pt(FACE_REGIONS.noseBridgeMid);
      const rad = faceW * 0.14;
      const s = -(reshape.noseBridge / 100) * 0.18;
      ops.push({ kind: 'scale', cx: midN.x, cy: midN.y, radius: rad, strength: s });
    }
    if (Math.abs(reshape.noseTip) > 0.5) {
      const tip = pt(FACE_REGIONS.noseTip);
      ops.push({
        kind: 'push',
        cx: tip.x,
        cy: tip.y,
        radius: faceW * 0.16,
        dx: 0,
        dy: -(reshape.noseTip / 100) * faceH * 0.025,
        strength: 1,
      });
    }

    // 11. Mouth Size & Smile Lift
    const lMouth = pt(FACE_REGIONS.leftMouthCorner);
    const rMouth = pt(FACE_REGIONS.rightMouthCorner);
    const mouthCenter = { x: (lMouth.x + rMouth.x) * 0.5, y: (lMouth.y + rMouth.y) * 0.5 };
    const mouthW = Math.hypot(rMouth.x - lMouth.x, rMouth.y - lMouth.y);

    if (Math.abs(reshape.mouthSize) > 0.5) {
      ops.push({
        kind: 'scale',
        cx: mouthCenter.x,
        cy: mouthCenter.y,
        radius: mouthW * 0.85,
        strength: (reshape.mouthSize / 100) * 0.25,
      });
    }

    if (reshape.smileLift > 0.5) {
      const lift = (reshape.smileLift / 100) * mouthW * 0.14;
      const rad = mouthW * 0.45;
      ops.push({ kind: 'push', cx: lMouth.x, cy: lMouth.y, radius: rad, dx: -lift * 0.25, dy: -lift, strength: 1 });
      ops.push({ kind: 'push', cx: rMouth.x, cy: rMouth.y, radius: rad, dx: lift * 0.25, dy: -lift, strength: 1 });
    }
  }

  return ops;
}

/**
 * Applies Face Reshape + Interactive Liquify strokes via smooth inverse bilinear mapping
 */
export function applyWarpAndLiquify(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  faces: DetectedFace[],
  reshape: ReshapeSettings,
  liquifyStrokes: LiquifyStroke[]
): void {
  const ops = buildFaceReshapeOps(faces, reshape, w, h);

  const minDim = Math.min(w, h);
  for (const st of liquifyStrokes) {
    const rad = Math.max(8, st.radius * minDim);
    if (st.mode === 'push') {
      ops.push({
        kind: 'push',
        cx: st.fromX * w,
        cy: st.fromY * h,
        radius: rad,
        dx: (st.toX - st.fromX) * w * st.strength,
        dy: (st.toY - st.fromY) * h * st.strength,
        strength: 1,
      });
    } else {
      ops.push({
        kind: 'scale',
        cx: st.toX * w,
        cy: st.toY * h,
        radius: rad,
        strength: (st.mode === 'bloat' ? 0.35 : -0.35) * st.strength,
      });
    }
  }

  if (ops.length === 0) return;

  // Compute dirty bounding box so we only warp affected pixels (super fast!)
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (const op of ops) {
    const pad = op.radius + Math.max(Math.abs(op.dx ?? 0), Math.abs(op.dy ?? 0)) + 2;
    minX = Math.max(0, Math.min(minX, Math.floor(op.cx - pad)));
    minY = Math.max(0, Math.min(minY, Math.floor(op.cy - pad)));
    maxX = Math.min(w - 1, Math.max(maxX, Math.ceil(op.cx + pad)));
    maxY = Math.min(h - 1, Math.max(maxY, Math.ceil(op.cy + pad)));
  }
  if (minX >= maxX || minY >= maxY) return;

  const srcImg = ctx.getImageData(0, 0, w, h);
  const src = srcImg.data;
  const dstImg = new ImageData(new Uint8ClampedArray(src), w, h);
  const dst = dstImg.data;

  // Inverse warp: iterate ops in reverse order to map destination pixel -> source pixel
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let sx = x;
      let sy = y;

      for (let i = ops.length - 1; i >= 0; i--) {
        const op = ops[i];
        const rx = sx - op.cx;
        const ry = sy - op.cy;
        const distSq = rx * rx + ry * ry;
        const rSq = op.radius * op.radius;
        if (distSq >= rSq) continue;

        const t = 1 - distSq / rSq;
        const falloff = t * t; // smooth C1 radial falloff

        if (op.kind === 'push') {
          sx -= (op.dx ?? 0) * falloff;
          sy -= (op.dy ?? 0) * falloff;
        } else {
          // scale: positive strength = enlarge (sample closer to center)
          const factor = 1 - op.strength * falloff;
          sx = op.cx + rx * factor;
          sy = op.cy + ry * factor;
        }
      }

      if (sx === x && sy === y) continue;

      // Bilinear sampling
      const clampedX = Math.max(0, Math.min(w - 1.001, sx));
      const clampedY = Math.max(0, Math.min(h - 1.001, sy));
      const x0 = Math.floor(clampedX);
      const y0 = Math.floor(clampedY);
      const fx = clampedX - x0;
      const fy = clampedY - y0;

      const idx00 = (y0 * w + x0) * 4;
      const idx10 = idx00 + 4;
      const idx01 = idx00 + w * 4;
      const idx11 = idx01 + 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const dIdx = (y * w + x) * 4;
      dst[dIdx] = src[idx00] * w00 + src[idx10] * w10 + src[idx01] * w01 + src[idx11] * w11;
      dst[dIdx + 1] = src[idx00 + 1] * w00 + src[idx10 + 1] * w10 + src[idx01 + 1] * w01 + src[idx11 + 1] * w11;
      dst[dIdx + 2] = src[idx00 + 2] * w00 + src[idx10 + 2] * w10 + src[idx01 + 2] * w01 + src[idx11 + 2] * w11;
      dst[dIdx + 3] = src[idx00 + 3] * w00 + src[idx10 + 3] * w10 + src[idx01 + 3] * w01 + src[idx11 + 3] * w11;
    }
  }

  ctx.putImageData(dstImg, 0, 0);
}

/**
 * Meitu signature Body Height / Leg Lengthener ("สูงเพรียว"):
 * Vertically stretches the horizontal band [topY..bottomY] smoothly while keeping top & bottom intact.
 */
export function applyBodyStretch(
  sourceCanvas: HTMLCanvasElement,
  stretch: BodyStretchSettings
): HTMLCanvasElement {
  if (!stretch.enabled || stretch.amount <= 0.5) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const topY = Math.max(0.05, Math.min(0.85, stretch.topY));
  const bottomY = Math.max(topY + 0.08, Math.min(0.98, stretch.bottomY));

  const bandH = (bottomY - topY) * h;
  const extraH = Math.round(bandH * (stretch.amount / 100) * 0.35);
  if (extraH <= 0) return sourceCanvas;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h + extraH;
  const ctx = out.getContext('2d')!;

  const sy1 = Math.round(topY * h);
  const sy2 = Math.round(bottomY * h);
  const origBand = sy2 - sy1;
  const newBand = origBand + extraH;

  // Top section (unchanged)
  ctx.drawImage(sourceCanvas, 0, 0, w, sy1, 0, 0, w, sy1);
  // Stretched band (legs/torso)
  ctx.drawImage(sourceCanvas, 0, sy1, w, origBand, 0, sy1, w, newBand);
  // Bottom section (unchanged)
  ctx.drawImage(sourceCanvas, 0, sy2, w, h - sy2, 0, sy1 + newBand, w, h - sy2);

  return out;
}
