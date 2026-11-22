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
 * Renders full realistic Meitu Makeup Suite anchored to 478 MediaPipe Face Landmarks:
 * Lipstick (Matte/Velvet/Glossy), Blush (4 styles), Eyeshadow, Eyeliner (3 styles),
 * Eyebrows, Contact Lenses, Contour & Highlight!
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

    // 1. CONTOUR (sculpting cheeks & nose bridge sides)
    if (makeup.contourIntensity > 0) {
      const amt = (makeup.contourIntensity / 100) * 0.28;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(6, Math.round(faceW * 0.055))}px)`;
      ctx.strokeStyle = `rgba(120, 78, 56, ${amt})`;
      ctx.lineWidth = Math.max(4, faceW * 0.065);
      ctx.lineCap = 'round';

      // Left & right jaw / cheek hollows
      for (const pts of [
        [234, 132, 172, 150],
        [454, 361, 397, 379],
      ]) {
        ctx.beginPath();
        ctx.moveTo(pt(pts[0]).x, pt(pts[0]).y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pt(pts[i]).x, pt(pts[i]).y);
        ctx.stroke();
      }

      // Subtle nose side contour lines
      ctx.lineWidth = Math.max(2, faceW * 0.025);
      ctx.strokeStyle = `rgba(128, 86, 64, ${amt * 0.72})`;
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

    // 2. HIGHLIGHT (nose bridge, nose tip, cheekbones, cupid's bow)
    if (makeup.highlightIntensity > 0) {
      const amt = (makeup.highlightIntensity / 100) * 0.34;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${Math.max(4, Math.round(faceW * 0.03))}px)`;

      // Nose bridge shimmer line
      const nTop = pt(168);
      const nTip = pt(1);
      ctx.strokeStyle = `rgba(255, 248, 240, ${amt})`;
      ctx.lineWidth = Math.max(2, faceW * 0.024);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nTop.x, nTop.y);
      ctx.lineTo(nTip.x, nTip.y);
      ctx.stroke();

      // Nose tip glow dot
      ctx.fillStyle = `rgba(255, 250, 245, ${amt * 1.1})`;
      ctx.beginPath();
      ctx.arc(nTip.x, nTip.y, Math.max(2.5, faceW * 0.024), 0, Math.PI * 2);
      ctx.fill();

      // Upper cheekbone shimmer
      for (const idx of [116, 345]) {
        const c = pt(idx);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, faceW * 0.07, faceH * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. BLUSH (Apple, Drunk/Igari, Sun-Kissed, Under-Eye)
    if (makeup.blushIntensity > 0) {
      const amt = (makeup.blushIntensity / 100) * 0.48;
      const lCheek = pt(FACE_REGIONS.leftCheekCenter);
      const rCheek = pt(FACE_REGIONS.rightCheekCenter);
      const noseMid = pt(195);

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(8, Math.round(faceW * 0.065))}px)`;

      const drawSoftBlob = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0, hexToRgba(makeup.blushColor, alpha));
        grad.addColorStop(0.65, hexToRgba(makeup.blushColor, alpha * 0.45));
        grad.addColorStop(1, hexToRgba(makeup.blushColor, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      if (makeup.blushStyle === 'apple') {
        drawSoftBlob(lCheek.x, lCheek.y + faceH * 0.02, faceW * 0.14, faceH * 0.09, amt);
        drawSoftBlob(rCheek.x, rCheek.y + faceH * 0.02, faceW * 0.14, faceH * 0.09, amt);
      } else if (makeup.blushStyle === 'drunk') {
        drawSoftBlob(lCheek.x, lCheek.y - faceH * 0.015, faceW * 0.15, faceH * 0.075, amt);
        drawSoftBlob(rCheek.x, rCheek.y - faceH * 0.015, faceW * 0.15, faceH * 0.075, amt);
        drawSoftBlob(noseMid.x, noseMid.y, faceW * 0.13, faceH * 0.04, amt * 0.72);
      } else if (makeup.blushStyle === 'sunkissed') {
        drawSoftBlob(lCheek.x - faceW * 0.03, lCheek.y + faceH * 0.01, faceW * 0.17, faceH * 0.08, amt * 0.9);
        drawSoftBlob(rCheek.x + faceW * 0.03, rCheek.y + faceH * 0.01, faceW * 0.17, faceH * 0.08, amt * 0.9);
      } else {
        // Under-eye Japanese blush
        const lUnder = pt(118);
        const rUnder = pt(347);
        drawSoftBlob(lUnder.x, lUnder.y, faceW * 0.12, faceH * 0.055, amt * 1.05);
        drawSoftBlob(rUnder.x, rUnder.y, faceW * 0.12, faceH * 0.055, amt * 1.05);
      }
      ctx.restore();
    }

    // 4. CONTACT LENSES (centered on iris landmarks 468 & 473, clipped inside eye opening!)
    if (makeup.contactsIntensity > 0 && lms.length > 477) {
      const amt = (makeup.contactsIntensity / 100) * 0.68;
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
        const irisR = Math.max(2, (radSum / ringIndices.length) * 1.06);

        ctx.save();
        tracePoly(ctx, lms, eyePoly, w, h);
        ctx.clip();

        // Colored iris ring
        const grad = ctx.createRadialGradient(c.x, c.y, irisR * 0.28, c.x, c.y, irisR);
        grad.addColorStop(0, 'rgba(15, 12, 12, 0.25)');
        grad.addColorStop(0.32, hexToRgba(makeup.contactsColor, amt));
        grad.addColorStop(0.82, hexToRgba(makeup.contactsColor, amt * 0.92));
        grad.addColorStop(1, `rgba(20, 15, 18, ${amt * 0.72})`); // limbal ring

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, irisR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Crisp glossy lens catchlight
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255, 255, 255, ${amt * 0.65})`;
        ctx.beginPath();
        ctx.arc(c.x - irisR * 0.32, c.y - irisR * 0.32, Math.max(1, irisR * 0.19), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawContact(FACE_REGIONS.leftEye, FACE_REGIONS.leftIrisCenter, FACE_REGIONS.leftIrisRing);
      drawContact(FACE_REGIONS.rightEye, FACE_REGIONS.rightIrisCenter, FACE_REGIONS.rightIrisRing);
    }

    // 5. EYESHADOW (soft gradient along upper eyelid, clipped OUTSIDE eye eyeball!)
    if (makeup.eyeshadowIntensity > 0) {
      const amt = (makeup.eyeshadowIntensity / 100) * 0.52;
      const drawShadow = (upperIdx: number[], eyePoly: number[]) => {
        // Offscreen mask so shadow never tints the eyeball
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const oCtx = off.getContext('2d')!;
        oCtx.filter = `blur(${Math.max(3, Math.round(faceW * 0.025))}px)`;
        oCtx.strokeStyle = hexToRgba(makeup.eyeshadowColor, amt);
        oCtx.lineWidth = Math.max(4, faceH * 0.036);
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.beginPath();
        const first = pt(upperIdx[0]);
        oCtx.moveTo(first.x, first.y - faceH * 0.012);
        for (let i = 1; i < upperIdx.length; i++) {
          const p = pt(upperIdx[i]);
          oCtx.lineTo(p.x, p.y - faceH * 0.014);
        }
        oCtx.stroke();

        // Erase inside eye
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

    // 6. EYELINER (Natural, Cat Eye wing, Puppy Eye soft wing)
    if (makeup.eyelinerIntensity > 0) {
      const amt = (makeup.eyelinerIntensity / 100) * 0.82;
      const drawLiner = (upperIdx: number[], isLeft: boolean) => {
        ctx.save();
        ctx.strokeStyle = `rgba(28, 22, 24, ${amt})`;
        ctx.lineWidth = Math.max(1.4, faceW * 0.012);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.filter = `blur(${Math.max(0.5, faceW * 0.003)}px)`;

        ctx.beginPath();
        const p0 = pt(upperIdx[0]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < upperIdx.length; i++) {
          const p = pt(upperIdx[i]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Outer wing extension
        const outerPt = isLeft ? pt(33) : pt(263);
        const dirX = isLeft ? -1 : 1;
        const wingLen =
          makeup.eyelinerStyle === 'cat'
            ? faceW * 0.048
            : makeup.eyelinerStyle === 'puppy'
              ? faceW * 0.032
              : faceW * 0.018;
        const wingY =
          makeup.eyelinerStyle === 'cat'
            ? -faceH * 0.02
            : makeup.eyelinerStyle === 'puppy'
              ? faceH * 0.01
              : -faceH * 0.005;

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

    // 7. EYEBROWS
    if (makeup.eyebrowIntensity > 0) {
      const amt = (makeup.eyebrowIntensity / 100) * 0.58;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(1.5, faceW * 0.01)}px)`;
      ctx.fillStyle = hexToRgba(makeup.eyebrowColor, amt);
      tracePoly(ctx, lms, FACE_REGIONS.leftEyebrow, w, h);
      ctx.fill();
      tracePoly(ctx, lms, FACE_REGIONS.rightEyebrow, w, h);
      ctx.fill();
      ctx.restore();
    }

    // 8. LIPSTICK (Outer lip minus inner mouth cavity + Matte / Velvet / Glossy finish!)
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

      // Punch out inner mouth opening (teeth/tongue stay clean!)
      lCtx.globalCompositeOperation = 'destination-out';
      lCtx.fillStyle = '#fff';
      tracePoly(lCtx, lms, FACE_REGIONS.innerLips, w, h);
      lCtx.fill();

      // Soft feathered edge
      const softLip = document.createElement('canvas');
      softLip.width = w;
      softLip.height = h;
      const slCtx = softLip.getContext('2d')!;
      slCtx.filter = `blur(${Math.max(1.5, faceW * 0.009)}px)`;
      slCtx.drawImage(lipCanvas, 0, 0);

      // Blend onto main canvas using multiply + subtle soft-light for realistic lip texture
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = amt * (makeup.lipstickFinish === 'matte' ? 0.92 : 0.78);
      ctx.drawImage(softLip, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = amt * (makeup.lipstickFinish === 'velvet' ? 0.28 : 0.18);
      ctx.drawImage(softLip, 0, 0);
      ctx.restore();

      // Glossy specular shine highlight on lower lip!
      if (makeup.lipstickFinish === 'gloss') {
        const lowerLipMid = pt(17);
        const innerLow = pt(14);
        const hx = (lowerLipMid.x + innerLow.x) * 0.5;
        const hy = (lowerLipMid.y + innerLow.y) * 0.5;
        const mouthW = Math.hypot(pt(291).x - pt(61).x, pt(291).y - pt(61).y);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${Math.max(2, faceW * 0.012)}px)`;
        ctx.fillStyle = `rgba(255, 245, 248, ${amt * 0.62})`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, mouthW * 0.24, Math.max(2, mouthW * 0.065), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
