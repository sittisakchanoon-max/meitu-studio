import { DetectedFace, MakeupSettings } from '../types/editor';
import { FACE_REGIONS } from './mediapipe';

function tracePoly(
  ctx: CanvasRenderingContext2D,
  lms: Array<{ x: number; y: number }>,
  indices: number[],
  w: number,
  h: number
) {
  if (indices.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(lms[indices[0]].x * w, lms[indices[0]].y * h);
  for (let i = 1; i < indices.length; i++) {
    ctx.lineTo(lms[indices[i]].x * w, lms[indices[i]].y * h);
  }
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 200;
  const g = parseInt(clean.slice(2, 4), 16) || 80;
  const b = parseInt(clean.slice(4, 6), 16) || 100;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Renders ultra-natural Meitu-grade Makeup anchored to 478 MediaPipe Face Landmarks:
 * Soft airbrushed blush, velvet/glossy ombre lips, aegyo-sal eye shimmer, soft eyeshadow,
 * lashline eyeliner, sculpted brows, natural contact lenses, contour & highlight!
 */
export function applyMakeup(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  faces: DetectedFace[],
  makeup: MakeupSettings
): void {
  if (faces.length === 0) return;

  const hasAny =
    makeup.lipstickIntensity > 0 ||
    makeup.blushIntensity > 0 ||
    makeup.eyeshadowIntensity > 0 ||
    makeup.eyelinerIntensity > 0 ||
    makeup.eyebrowIntensity > 0 ||
    makeup.contourIntensity > 0 ||
    makeup.highlightIntensity > 0 ||
    makeup.contactsIntensity > 0;
  if (!hasAny) return;

  for (const face of faces) {
    const lms = face.landmarks;
    if (lms.length < 468) continue;
    const faceW = face.box.w * w;
    const faceH = face.box.h * h;
    const pt = (idx: number) => ({ x: lms[idx].x * w, y: lms[idx].y * h });

    // 1. CONTOUR (soft nose shadow + V-jaw contour)
    if (makeup.contourIntensity > 0) {
      const amt = (makeup.contourIntensity / 100) * 0.24;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(6, Math.round(faceW * 0.06))}px)`;
      ctx.strokeStyle = `rgba(116, 78, 60, ${amt})`;
      ctx.lineWidth = Math.max(4, faceW * 0.06);
      ctx.lineCap = 'round';

      for (const pts of [
        [234, 132, 172, 150],
        [454, 361, 397, 379],
      ]) {
        ctx.beginPath();
        ctx.moveTo(pt(pts[0]).x, pt(pts[0]).y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pt(pts[i]).x, pt(pts[i]).y);
        ctx.stroke();
      }

      ctx.lineWidth = Math.max(2, faceW * 0.022);
      ctx.strokeStyle = `rgba(122, 84, 68, ${amt * 0.78})`;
      for (const pts of [
        [193, 188, 174, 102],
        [417, 412, 399, 331],
      ]) {
        ctx.beginPath();
        ctx.moveTo(pt(pts[0]).x, pt(pts[0]).y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pt(pts[i]).x, pt(pts[i]).y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. HIGHLIGHT + AEGYO-SAL (nose bridge, nose tip, cheekbones, under-eye pearl shimmer)
    if (makeup.highlightIntensity > 0) {
      const amt = (makeup.highlightIntensity / 100) * 0.34;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${Math.max(4, Math.round(faceW * 0.028))}px)`;

      const nTop = pt(168);
      const nTip = pt(1);
      ctx.strokeStyle = `rgba(255, 248, 244, ${amt})`;
      ctx.lineWidth = Math.max(2, faceW * 0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nTop.x, nTop.y);
      ctx.lineTo(nTip.x, nTip.y);
      ctx.stroke();

      // Nose tip glow dot
      ctx.fillStyle = `rgba(255, 250, 246, ${amt * 1.15})`;
      ctx.beginPath();
      ctx.arc(nTip.x, nTip.y, Math.max(2.5, faceW * 0.024), 0, Math.PI * 2);
      ctx.fill();

      // Subtle Aegyo-sal shimmer below lower eyelids!
      ctx.strokeStyle = `rgba(255, 240, 238, ${amt * 0.72})`;
      ctx.lineWidth = Math.max(1.8, faceH * 0.014);
      for (const lowerPts of [
        [7, 163, 144, 145, 153, 154],
        [382, 381, 380, 374, 373, 390],
      ]) {
        ctx.beginPath();
        lowerPts.forEach((idx, i) => {
          const p = pt(idx);
          const py = p.y + faceH * 0.015;
          if (i === 0) ctx.moveTo(p.x, py);
          else ctx.lineTo(p.x, py);
        });
        ctx.stroke();
      }

      // Upper cheekbones
      for (const idx of [116, 345]) {
        const c = pt(idx);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, faceW * 0.068, faceH * 0.024, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. AIRBRUSHED BLUSH (Meitu soft multi-layer diffusion matching Screenshot 2!)
    if (makeup.blushIntensity > 0) {
      const amt = (makeup.blushIntensity / 100) * 0.44;
      const lCheek = pt(FACE_REGIONS.leftCheekCenter);
      const rCheek = pt(FACE_REGIONS.rightCheekCenter);
      const noseMid = pt(195);

      ctx.save();
      ctx.filter = `blur(${Math.max(10, Math.round(faceW * 0.075))}px)`;

      const drawSoftBlob = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0, hexToRgba(makeup.blushColor, alpha));
        grad.addColorStop(0.55, hexToRgba(makeup.blushColor, alpha * 0.52));
        grad.addColorStop(1, hexToRgba(makeup.blushColor, 0));

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      if (makeup.blushStyle === 'apple') {
        drawSoftBlob(lCheek.x, lCheek.y + faceH * 0.02, faceW * 0.155, faceH * 0.095, amt);
        drawSoftBlob(rCheek.x, rCheek.y + faceH * 0.02, faceW * 0.155, faceH * 0.095, amt);
      } else if (makeup.blushStyle === 'drunk') {
        drawSoftBlob(lCheek.x, lCheek.y - faceH * 0.01, faceW * 0.165, faceH * 0.08, amt);
        drawSoftBlob(rCheek.x, rCheek.y - faceH * 0.01, faceW * 0.165, faceH * 0.08, amt);
        drawSoftBlob(noseMid.x, noseMid.y + faceH * 0.015, faceW * 0.14, faceH * 0.042, amt * 0.72);
      } else if (makeup.blushStyle === 'sunkissed') {
        drawSoftBlob(lCheek.x - faceW * 0.025, lCheek.y + faceH * 0.01, faceW * 0.18, faceH * 0.085, amt * 0.92);
        drawSoftBlob(rCheek.x + faceW * 0.025, rCheek.y + faceH * 0.01, faceW * 0.18, faceH * 0.085, amt * 0.92);
      } else {
        // Under-eye Meitu Douyin blush (like Plum Berry / Wonyoung!)
        const lUnder = pt(118);
        const rUnder = pt(347);
        drawSoftBlob(lUnder.x, lUnder.y + faceH * 0.02, faceW * 0.15, faceH * 0.075, amt * 1.05);
        drawSoftBlob(rUnder.x, rUnder.y + faceH * 0.02, faceW * 0.15, faceH * 0.075, amt * 1.05);
      }
      ctx.restore();
    }

    // 4. NATURAL CONTACT LENSES (centered on iris landmarks 468 & 473, clipped inside eyelids)
    if (makeup.contactsIntensity > 0 && lms.length > 477) {
      const amt = (makeup.contactsIntensity / 100) * 0.62;
      const drawContact = (
        eyePoly: number[],
        centerIdx: number,
        ringIndices: number[]
      ) => {
        const c = pt(centerIdx);
        let radSum = 0;
        for (const rIdx of ringIndices) {
          const rp = pt(rIdx);
          radSum += Math.hypot(rp.x - c.x, rp.y - c.y);
        }
        const irisR = Math.max(2, (radSum / ringIndices.length) * 1.08);

        ctx.save();
        tracePoly(ctx, lms, eyePoly, w, h);
        ctx.clip();

        const grad = ctx.createRadialGradient(c.x, c.y, irisR * 0.25, c.x, c.y, irisR);
        grad.addColorStop(0, 'rgba(15, 12, 12, 0.22)');
        grad.addColorStop(0.32, hexToRgba(makeup.contactsColor, amt));
        grad.addColorStop(0.78, hexToRgba(makeup.contactsColor, amt * 0.88));
        grad.addColorStop(1, `rgba(22, 16, 18, ${amt * 0.65})`);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, irisR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = hexToRgba(makeup.contactsColor, amt * 0.26);
        ctx.beginPath();
        ctx.arc(c.x, c.y, irisR * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Crisp glossy lens catchlight
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255, 255, 255, ${amt * 0.72})`;
        ctx.beginPath();
        ctx.arc(c.x - irisR * 0.3, c.y - irisR * 0.3, Math.max(1, irisR * 0.18), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawContact(FACE_REGIONS.leftEye, FACE_REGIONS.leftIrisCenter, FACE_REGIONS.leftIrisRing);
      drawContact(FACE_REGIONS.rightEye, FACE_REGIONS.rightIrisCenter, FACE_REGIONS.rightIrisRing);
    }

    // 5. EYESHADOW (soft diffused lid wash + subtle outer-corner lower shadow)
    if (makeup.eyeshadowIntensity > 0) {
      const amt = (makeup.eyeshadowIntensity / 100) * 0.48;
      const drawShadow = (upperIdx: number[], eyePoly: number[]) => {
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const oCtx = off.getContext('2d')!;
        oCtx.filter = `blur(${Math.max(4, Math.round(faceW * 0.028))}px)`;
        oCtx.strokeStyle = hexToRgba(makeup.eyeshadowColor, amt);
        oCtx.lineWidth = Math.max(4, faceH * 0.036);
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.beginPath();
        const first = pt(upperIdx[0]);
        oCtx.moveTo(first.x, first.y - faceH * 0.011);
        for (let i = 1; i < upperIdx.length; i++) {
          const p = pt(upperIdx[i]);
          oCtx.lineTo(p.x, p.y - faceH * 0.013);
        }
        oCtx.stroke();

        // Carve out eyeball cleanly
        oCtx.filter = 'none';
        oCtx.globalCompositeOperation = 'destination-out';
        oCtx.fillStyle = '#fff';
        tracePoly(oCtx, lms, eyePoly, w, h);
        oCtx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(off, 0, 0);
        ctx.restore();
      };

      drawShadow(FACE_REGIONS.leftEyeUpper, FACE_REGIONS.leftEye);
      drawShadow(FACE_REGIONS.rightEyeUpper, FACE_REGIONS.rightEye);
    }

    // 6. DELICATE EYELINER & LASH DEFINITION
    if (makeup.eyelinerIntensity > 0) {
      const amt = (makeup.eyelinerIntensity / 100) * 0.78;
      const drawLiner = (upperIdx: number[], isLeft: boolean) => {
        ctx.save();
        ctx.strokeStyle = `rgba(34, 24, 24, ${amt})`;
        ctx.lineWidth = Math.max(1.3, faceW * 0.011);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.filter = `blur(${Math.max(0.6, faceW * 0.0035)}px)`;

        ctx.beginPath();
        const p0 = pt(upperIdx[0]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < upperIdx.length; i++) {
          const p = pt(upperIdx[i]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        const outerPt = isLeft ? pt(33) : pt(263);
        const dirX = isLeft ? -1 : 1;
        const wingLen =
          makeup.eyelinerStyle === 'cat'
            ? faceW * 0.046
            : makeup.eyelinerStyle === 'puppy'
              ? faceW * 0.032
              : faceW * 0.02;
        const wingY =
          makeup.eyelinerStyle === 'cat'
            ? -faceH * 0.018
            : makeup.eyelinerStyle === 'puppy'
              ? faceH * 0.009
              : -faceH * 0.004;

        ctx.beginPath();
        ctx.moveTo(outerPt.x, outerPt.y);
        ctx.quadraticCurveTo(
          outerPt.x + dirX * wingLen * 0.55,
          outerPt.y + wingY * 0.35,
          outerPt.x + dirX * wingLen,
          outerPt.y + wingY
        );
        ctx.stroke();
        ctx.restore();
      };

      drawLiner(FACE_REGIONS.leftEyeUpper, true);
      drawLiner(FACE_REGIONS.rightEyeUpper, false);
    }

    // 7. SOFT POWDERY EYEBROWS
    if (makeup.eyebrowIntensity > 0) {
      const amt = (makeup.eyebrowIntensity / 100) * 0.52;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(1.8, faceW * 0.012)}px)`;
      ctx.fillStyle = hexToRgba(makeup.eyebrowColor, amt);
      tracePoly(ctx, lms, FACE_REGIONS.leftEyebrow, w, h);
      ctx.fill();
      tracePoly(ctx, lms, FACE_REGIONS.rightEyebrow, w, h);
      ctx.fill();
      ctx.restore();
    }

    // 8. MEITU VELVET / OMBRE / GLOSSY LIPSTICK (soft feathered lip border + rich inner center!)
    if (makeup.lipstickIntensity > 0) {
      const amt = (makeup.lipstickIntensity / 100) * 0.78;
      const lipCanvas = document.createElement('canvas');
      lipCanvas.width = w;
      lipCanvas.height = h;
      const lCtx = lipCanvas.getContext('2d')!;

      // Outer lips
      lCtx.fillStyle = makeup.lipstickColor;
      tracePoly(lCtx, lms, FACE_REGIONS.outerLips, w, h);
      lCtx.fill();

      // Punch out inner mouth opening (teeth stay white!)
      lCtx.globalCompositeOperation = 'destination-out';
      lCtx.fillStyle = '#fff';
      tracePoly(lCtx, lms, FACE_REGIONS.innerLips, w, h);
      lCtx.fill();

      // Soft feathered edge (prevents harsh painted look!)
      const softLip = document.createElement('canvas');
      softLip.width = w;
      softLip.height = h;
      const slCtx = softLip.getContext('2d')!;
      slCtx.filter = `blur(${Math.max(2, faceW * 0.012)}px)`;
      slCtx.drawImage(lipCanvas, 0, 0);

      // Blend onto photo preserving natural lip creases & shading
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = amt * (makeup.lipstickFinish === 'matte' ? 0.85 : 0.72);
      ctx.drawImage(softLip, 0, 0);

      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = amt * 0.42;
      ctx.drawImage(softLip, 0, 0);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = amt * (makeup.lipstickFinish === 'velvet' ? 0.28 : 0.2);
      ctx.drawImage(softLip, 0, 0);
      ctx.restore();

      // Ombre inner-lip tint accent (signature Korean/Meitu blurred gradient lip!)
      const mouthCenter = {
        x: (pt(13).x + pt(14).x) * 0.5,
        y: (pt(13).y + pt(14).y) * 0.5,
      };
      const mouthW = Math.hypot(pt(291).x - pt(61).x, pt(291).y - pt(61).y);
      ctx.save();
      tracePoly(ctx, lms, FACE_REGIONS.outerLips, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(2.5, mouthW * 0.08)}px)`;
      ctx.fillStyle = hexToRgba(makeup.lipstickColor, amt * 0.36);
      ctx.beginPath();
      ctx.ellipse(mouthCenter.x, mouthCenter.y, mouthW * 0.34, Math.max(2, mouthW * 0.14), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Glossy specular shine highlight on lower lip
      if (makeup.lipstickFinish === 'gloss') {
        const lowerLipMid = pt(17);
        const innerLow = pt(14);
        const hx = (lowerLipMid.x + innerLow.x) * 0.5;
        const hy = (lowerLipMid.y + innerLow.y) * 0.5;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${Math.max(2, faceW * 0.011)}px)`;
        ctx.fillStyle = `rgba(255, 245, 248, ${amt * 0.65})`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, mouthW * 0.24, Math.max(2, mouthW * 0.065), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
