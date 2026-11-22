export type Language = 'th' | 'en';
export type ThemeMode = 'light' | 'dark';
export type AppMode = 'home' | 'editor' | 'collage' | 'camera';

export type EditorTab =
  | 'beauty'
  | 'reshape'
  | 'makeup'
  | 'filters'
  | 'adjust'
  | 'hsl'
  | 'curves'
  | 'crop'
  | 'blur'
  | 'ai'
  | 'erase'
  | 'mosaic'
  | 'liquify'
  | 'cutout'
  | 'stickers'
  | 'text'
  | 'doodle'
  | 'frame';

export interface BeautySettings {
  autoPreset: string;
  smooth: number;       // 0..100
  whiten: number;       // 0..100
  rosy: number;         // 0..100
  evenTone: number;     // 0..100
  matte: number;        // 0..100
  darkCircles: number;  // 0..100
  nasolabial: number;   // 0..100
  brightenEyes: number; // 0..100
  teethWhiten: number;  // 0..100
  hdrGlow: number;      // 0..100
  faceLight: number;    // 0..100 (3D Studio Relighting)
}

export interface ReshapeSettings {
  slimFace: number;     // -100..100
  vLine: number;        // 0..100
  jawline: number;      // -100..100
  cheekbones: number;   // -100..100
  forehead: number;     // -100..100
  hairVolume: number;   // 0..100 (Meitu signature Crown/Hair Volume!)
  bigEyes: number;      // -100..100
  eyeTilt: number;      // -100..100
  eyeDistance: number;  // -100..100
  slimNose: number;     // -100..100
  noseBridge: number;   // -100..100
  noseTip: number;      // -100..100
  mouthSize: number;    // -100..100
  smileLift: number;    // 0..100
}

export type LipFinish = 'matte' | 'velvet' | 'gloss';
export type BlushStyle = 'apple' | 'drunk' | 'sunkissed' | 'undereye';
export type EyelinerStyle = 'natural' | 'cat' | 'puppy';

export interface MakeupSettings {
  preset: string;
  lipstickColor: string;
  lipstickIntensity: number; // 0..100
  lipstickFinish: LipFinish;
  blushStyle: BlushStyle;
  blushColor: string;
  blushIntensity: number;    // 0..100
  eyeshadowColor: string;
  eyeshadowIntensity: number;// 0..100
  eyelinerStyle: EyelinerStyle;
  eyelinerIntensity: number; // 0..100
  eyebrowColor: string;
  eyebrowIntensity: number;  // 0..100
  contourIntensity: number;  // 0..100
  highlightIntensity: number;// 0..100
  contactsColor: string;
  contactsIntensity: number; // 0..100
}

export interface FilterSettings {
  id: string;
  intensity: number; // 0..100
}

export interface AdjustSettings {
  exposure: number;    // -100..100
  brightness: number;  // -100..100
  contrast: number;    // -100..100
  highlights: number;  // -100..100
  shadows: number;     // -100..100
  whites: number;      // -100..100
  blacks: number;      // -100..100
  saturation: number;  // -100..100
  vibrance: number;    // -100..100
  temperature: number; // -100..100
  tint: number;        // -100..100
  sharpness: number;   // 0..100
  clarity: number;     // -100..100
  vignette: number;    // -100..100
  grain: number;       // 0..100
  fade: number;        // 0..100
}

export type HSLChannelKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface HSLChannel {
  h: number; // -100..100
  s: number; // -100..100
  l: number; // -100..100
}

export type HSLSettings = Record<HSLChannelKey, HSLChannel>;

export interface CurvePoint {
  x: number; // 0..255
  y: number; // 0..255
}

export interface CurveSettings {
  rgb: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
}

export type AspectPreset = 'free' | '1:1' | '3:4' | '4:3' | '4:5' | '9:16' | '16:9' | '2:3';

export interface CropBox {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

export interface CropSettings {
  aspect: AspectPreset;
  rotation: number;   // 0 | 90 | 180 | 270
  straighten: number; // -45..45
  flipH: boolean;
  flipV: boolean;
  cropBox: CropBox;
}

export type BlurMode = 'none' | 'radial' | 'linear' | 'portrait';

export interface BlurSettings {
  mode: BlurMode;
  strength: number; // 0..100
  centerX: number;  // 0..1
  centerY: number;  // 0..1
  radius: number;   // 0.05..0.6
  angle: number;    // -90..90
}

export type AIStyleId =
  | 'none'
  | 'hdEnhance'
  | 'anime'
  | 'sketch'
  | 'oilPaint'
  | 'popComic'
  | 'retroVHS'
  | 'pastelDream'
  | 'cyberNeon';

export interface AIStyleSettings {
  style: AIStyleId;
  intensity: number; // 0..100
}

export type CutoutBgType = 'transparent' | 'solid' | 'gradient' | 'blur' | 'studio';

export interface CutoutSettings {
  enabled: boolean;
  bgType: CutoutBgType;
  bgColor: string;
  bgGradient: [string, string];
  bgStudio: string;
  blurStrength: number;
  feather: number; // 0..20
}

export type FrameStyleId =
  | 'none'
  | 'white'
  | 'polaroid'
  | 'film'
  | 'magazine'
  | 'pastelPink'
  | 'museum'
  | 'cinema'
  | 'y2k';

export interface FrameSettings {
  style: FrameStyleId;
  thickness: number; // 1..100
  color: string;
  caption: string;
}

export interface StickerLayer {
  id: string;
  kind: 'emoji' | 'badge' | 'svg';
  content: string;
  label?: string;
  color?: string;
  x: number; // 0..1
  y: number; // 0..1
  scale: number; // 0.3..4
  rotation: number; // degrees
  opacity: number; // 0..1
  flipX: boolean;
}

export type TextPresetId =
  | 'clean'
  | 'magazine'
  | 'subtitle'
  | 'neon'
  | 'y2k'
  | 'polaroid'
  | 'cutePill';

export interface TextLayer {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number; // relative % of image min dim (2..16)
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  shadow: boolean;
  preset: TextPresetId;
  x: number; // 0..1
  y: number; // 0..1
  scale: number;
  rotation: number;
  opacity: number;
  align: 'left' | 'center' | 'right';
}

export type DoodleBrushType =
  | 'pen'
  | 'neon'
  | 'highlighter'
  | 'rainbow'
  | 'sparkle'
  | 'heart'
  | 'sakura'
  | 'star'
  | 'bubble'
  | 'pearl';

export interface StrokePoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface DoodleStroke {
  id: string;
  brushType: DoodleBrushType;
  color: string;
  size: number;    // 0.004..0.06 normalized
  opacity: number; // 0.1..1
  points: StrokePoint[];
}

export type MosaicMode = 'pixel' | 'blur' | 'glass' | 'oil' | 'heart' | 'triangle';

export interface MosaicStroke {
  id: string;
  mode: MosaicMode;
  size: number;     // 0.015..0.12 normalized
  strength: number; // 1..100
  points: StrokePoint[];
}

export type LiquifyMode = 'push' | 'shrink' | 'bloat';

export interface LiquifyStroke {
  id: string;
  mode: LiquifyMode;
  radius: number;   // 0.03..0.22 normalized
  strength: number; // 0.1..1
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface BodyStretchSettings {
  enabled: boolean;
  topY: number;    // 0.1..0.8
  bottomY: number; // 0.2..0.95
  amount: number;  // 0..100 (% stretch)
}

export interface HealStroke {
  id: string;
  radius: number; // 0.01..0.08 normalized
  points: StrokePoint[];
}

export interface EditorState {
  beauty: BeautySettings;
  reshape: ReshapeSettings;
  makeup: MakeupSettings;
  filter: FilterSettings;
  adjust: AdjustSettings;
  hsl: HSLSettings;
  curves: CurveSettings;
  crop: CropSettings;
  blur: BlurSettings;
  aiStyle: AIStyleSettings;
  cutout: CutoutSettings;
  frame: FrameSettings;
  stickers: StickerLayer[];
  texts: TextLayer[];
  doodles: DoodleStroke[];
  mosaics: MosaicStroke[];
  liquify: LiquifyStroke[];
  bodyStretch: BodyStretchSettings;
  heals: HealStroke[];
}

export interface FaceLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface DetectedFace {
  landmarks: FaceLandmarkPoint[];
  box: { x: number; y: number; w: number; h: number };
}

export interface SegmentationMask {
  width: number;
  height: number;
  data: Float32Array; // 0..1 foreground confidence per pixel
}

export interface ActiveBrushConfig {
  eraseRadius: number;
  mosaicMode: MosaicMode;
  mosaicSize: number;
  mosaicStrength: number;
  liquifyMode: LiquifyMode;
  liquifyRadius: number;
  liquifyStrength: number;
  doodleType: DoodleBrushType;
  doodleColor: string;
  doodleSize: number;
  doodleOpacity: number;
}

export function createDefaultHSL(): HSLSettings {
  return {
    red: { h: 0, s: 0, l: 0 },
    orange: { h: 0, s: 0, l: 0 },
    yellow: { h: 0, s: 0, l: 0 },
    green: { h: 0, s: 0, l: 0 },
    cyan: { h: 0, s: 0, l: 0 },
    blue: { h: 0, s: 0, l: 0 },
    purple: { h: 0, s: 0, l: 0 },
    magenta: { h: 0, s: 0, l: 0 },
  };
}

export function createDefaultCurves(): CurveSettings {
  const linear = (): CurvePoint[] => [
    { x: 0, y: 0 },
    { x: 255, y: 255 },
  ];
  return { rgb: linear(), r: linear(), g: linear(), b: linear() };
}

export function createDefaultEditorState(): EditorState {
  return {
    beauty: {
      autoPreset: 'none',
      smooth: 0,
      whiten: 0,
      rosy: 0,
      evenTone: 0,
      matte: 0,
      darkCircles: 0,
      nasolabial: 0,
      brightenEyes: 0,
      teethWhiten: 0,
      hdrGlow: 0,
      faceLight: 0,
    },
    reshape: {
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
    },
    makeup: {
      preset: 'none',
      lipstickColor: '#E14A66',
      lipstickIntensity: 0,
      lipstickFinish: 'velvet',
      blushStyle: 'apple',
      blushColor: '#FF7E96',
      blushIntensity: 0,
      eyeshadowColor: '#C57B7B',
      eyeshadowIntensity: 0,
      eyelinerStyle: 'natural',
      eyelinerIntensity: 0,
      eyebrowColor: '#4A362C',
      eyebrowIntensity: 0,
      contourIntensity: 0,
      highlightIntensity: 0,
      contactsColor: '#7A543E',
      contactsIntensity: 0,
    },
    filter: {
      id: 'original',
      intensity: 80,
    },
    adjust: {
      exposure: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      saturation: 0,
      vibrance: 0,
      temperature: 0,
      tint: 0,
      sharpness: 0,
      clarity: 0,
      vignette: 0,
      grain: 0,
      fade: 0,
    },
    hsl: createDefaultHSL(),
    curves: createDefaultCurves(),
    crop: {
      aspect: 'free',
      rotation: 0,
      straighten: 0,
      flipH: false,
      flipV: false,
      cropBox: { x: 0, y: 0, w: 1, h: 1 },
    },
    blur: {
      mode: 'none',
      strength: 45,
      centerX: 0.5,
      centerY: 0.45,
      radius: 0.28,
      angle: 0,
    },
    aiStyle: {
      style: 'none',
      intensity: 80,
    },
    cutout: {
      enabled: false,
      bgType: 'transparent',
      bgColor: '#FFD6E3',
      bgGradient: ['#FF9A9E', '#FAD0C4'],
      bgStudio: 'pastelSky',
      blurStrength: 18,
      feather: 4,
    },
    frame: {
      style: 'none',
      thickness: 32,
      color: '#FFFFFF',
      caption: 'MEITU STUDIO · 2026',
    },
    stickers: [],
    texts: [],
    doodles: [],
    mosaics: [],
    liquify: [],
    bodyStretch: {
      enabled: false,
      topY: 0.52,
      bottomY: 0.9,
      amount: 0,
    },
    heals: [],
  };
}
