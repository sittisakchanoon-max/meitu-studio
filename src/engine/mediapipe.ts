import {
  FaceLandmarker,
  FilesetResolver,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';
import { DetectedFace, SegmentationMask } from '../types/editor';

// Standard MediaPipe 478-point Face Mesh landmark index groups
export const FACE_REGIONS = {
  faceOval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ],
  leftEye: [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  ],
  rightEye: [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
    398,
  ],
  leftEyeUpper: [33, 246, 161, 160, 159, 158, 157, 173, 133],
  rightEyeUpper: [362, 398, 384, 385, 386, 387, 388, 466, 263],
  leftIrisCenter: 468,
  rightIrisCenter: 473,
  leftIrisRing: [469, 470, 471, 472],
  rightIrisRing: [474, 475, 476, 477],
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightEyebrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  outerLips: [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
    181, 91, 146,
  ],
  innerLips: [
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14,
    87, 178, 88, 95,
  ],
  leftUnderEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 243, 112, 26, 22, 23, 24, 110, 25],
  rightUnderEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 255, 339, 254, 253, 252, 256, 341, 463],
  leftNasolabial: [203, 206, 216, 212, 202, 57, 186, 92, 165, 98],
  rightNasolabial: [423, 426, 436, 432, 422, 287, 410, 322, 391, 327],
  leftCheekCenter: 117,
  rightCheekCenter: 346,
  noseTip: 1,
  noseBridgeTop: 168,
  noseBridgeMid: 6,
  noseLeftWing: 102,
  noseRightWing: 331,
  chinTip: 152,
  foreheadTop: 10,
  leftMouthCorner: 61,
  rightMouthCorner: 291,
  leftJawPoints: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148],
  rightJawPoints: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377],
};

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

let visionPromise: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | null = null;
let faceLandmarkerPromise: Promise<FaceLandmarker | null> | null = null;
let segmenterPromise: Promise<ImageSegmenter | null> | null = null;

async function getVision() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM_CDN).catch(async () => {
      return FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    });
  }
  return visionPromise;
}

async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      try {
        const vision = await getVision();
        try {
          return await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
            runningMode: 'IMAGE',
            numFaces: 2,
          });
        } catch {
          return await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'CPU' },
            runningMode: 'IMAGE',
            numFaces: 2,
          });
        }
      } catch (err) {
        console.warn('MediaPipe FaceLandmarker init failed:', err);
        return null;
      }
    })();
  }
  return faceLandmarkerPromise;
}

async function getImageSegmenter(): Promise<ImageSegmenter | null> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      try {
        const vision = await getVision();
        try {
          return await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate: 'GPU' },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        } catch {
          return await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate: 'CPU' },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        }
      } catch (err) {
        console.warn('MediaPipe ImageSegmenter init failed:', err);
        return null;
      }
    })();
  }
  return segmenterPromise;
}

export async function detectFaceLandmarks(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFace[]> {
  const landmarker = await getFaceLandmarker();
  if (!landmarker) return [];
  try {
    const result = landmarker.detect(source);
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return [];
    return result.faceLandmarks.map((lms) => {
      let minX = 1,
        minY = 1,
        maxX = 0,
        maxY = 0;
      const landmarks = lms.map((p) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        return { x: p.x, y: p.y, z: p.z };
      });
      return {
        landmarks,
        box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      };
    });
  } catch (err) {
    console.warn('Face detection error:', err);
    return [];
  }
}

export async function segmentPersonMask(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<SegmentationMask | null> {
  const segmenter = await getImageSegmenter();
  if (!segmenter) {
    return fallbackForegroundMask(source);
  }
  try {
    const res = segmenter.segment(source);
    const masks = res.confidenceMasks;
    if (!masks || masks.length === 0) {
      res.close?.();
      return fallbackForegroundMask(source);
    }
    const targetMask = masks.length >= 2 ? masks[1] : masks[0];
    const width = targetMask.width;
    const height = targetMask.height;
    const raw = targetMask.getAsFloat32Array();
    const data = new Float32Array(raw.length);

    // Self-calibrate: check corners vs center in case model outputs background confidence
    let cornerSum = 0;
    const cornerCoords = [
      [2, 2],
      [width - 3, 2],
      [2, height - 3],
      [width - 3, height - 3],
    ];
    for (const [cx, cy] of cornerCoords) {
      cornerSum += raw[Math.max(0, cy) * width + Math.max(0, cx)] ?? 0;
    }
    const cornerAvg = cornerSum / 4;
    const centerVal = raw[Math.floor(height * 0.5) * width + Math.floor(width * 0.5)] ?? 0;
    const shouldInvert = masks.length === 1 && cornerAvg > 0.7 && centerVal < 0.45;

    for (let i = 0; i < raw.length; i++) {
      const v = shouldInvert ? 1 - raw[i] : raw[i];
      // Slight contrast curve on mask confidence for crisp hair/shoulder edges
      data[i] = Math.max(0, Math.min(1, (v - 0.12) / 0.76));
    }

    res.close?.();
    return { width, height, data };
  } catch (err) {
    console.warn('Segmentation error, using fallback:', err);
    return fallbackForegroundMask(source);
  }
}

/**
 * Intelligent offline fallback segmentation using border color distance + center prior
 */
function fallbackForegroundMask(
  source: HTMLImageElement | HTMLCanvasElement
): SegmentationMask {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h).data;

  // Estimate background color from top/left/right border pixels
  let bgR = 0,
    bgG = 0,
    bgB = 0,
    count = 0;
  for (let x = 0; x < w; x++) {
    const idx = x * 4;
    bgR += img[idx];
    bgG += img[idx + 1];
    bgB += img[idx + 2];
    count++;
  }
  for (let y = 0; y < h * 0.7; y++) {
    for (const x of [0, w - 1]) {
      const idx = (y * w + x) * 4;
      bgR += img[idx];
      bgG += img[idx + 1];
      bgB += img[idx + 2];
      count++;
    }
  }
  bgR /= count;
  bgG /= count;
  bgB /= count;

  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dr = img[idx] - bgR;
      const dg = img[idx + 1] - bgG;
      const db = img[idx + 2] - bgB;
      const colorDist = Math.sqrt(dr * dr + dg * dg + db * db) / 255;

      const nx = (x / w - 0.5) * 2;
      const ny = (y / h - 0.56) * 2;
      const centerPrior = Math.max(0, 1 - Math.sqrt(nx * nx * 1.1 + ny * ny * 0.65));
      const score = colorDist * 1.45 + centerPrior * 0.65;
      data[y * w + x] = Math.max(0, Math.min(1, (score - 0.48) * 3.2));
    }
  }
  return { width: w, height: h, data };
}
