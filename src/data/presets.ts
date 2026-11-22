import {
  BeautySettings,
  MakeupSettings,
  ReshapeSettings,
  TextPresetId,
} from '../types/editor';

export interface AutoBeautyPreset {
  id: string;
  nameTh: string;
  nameEn: string;
  badgeColor: string;
  beauty: Partial<BeautySettings>;
  reshape?: Partial<ReshapeSettings>;
}

export const AUTO_BEAUTY_PRESETS: AutoBeautyPreset[] = [
  {
    id: 'none',
    nameTh: 'ปิด',
    nameEn: 'Off',
    badgeColor: '#e4e4e7',
    beauty: {
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
    },
  },
  {
    id: 'natural',
    nameTh: 'ใสธรรมชาติ',
    nameEn: 'Natural',
    badgeColor: '#ffd6e0',
    beauty: {
      smooth: 38,
      whiten: 20,
      rosy: 16,
      evenTone: 25,
      darkCircles: 30,
      brightenEyes: 24,
      teethWhiten: 20,
      hdrGlow: 14,
    },
    reshape: { slimFace: 16, bigEyes: 14, slimNose: 10 },
  },
  {
    id: 'korean',
    nameTh: 'สาวเกาหลีโกลว์',
    nameEn: 'K-Glass Skin',
    badgeColor: '#ffc2d4',
    beauty: {
      smooth: 56,
      whiten: 42,
      rosy: 26,
      evenTone: 40,
      darkCircles: 48,
      nasolabial: 30,
      brightenEyes: 38,
      teethWhiten: 32,
      hdrGlow: 36,
    },
    reshape: { slimFace: 26, vLine: 20, bigEyes: 24, slimNose: 18, smileLift: 15 },
  },
  {
    id: 'sweet',
    nameTh: 'หวานละมุน Meitu',
    nameEn: 'Sweet Meitu',
    badgeColor: '#ff9ebb',
    beauty: {
      smooth: 64,
      whiten: 48,
      rosy: 38,
      evenTone: 45,
      darkCircles: 55,
      nasolabial: 36,
      brightenEyes: 45,
      teethWhiten: 40,
      hdrGlow: 28,
    },
    reshape: { slimFace: 32, vLine: 26, bigEyes: 32, slimNose: 22, smileLift: 24 },
  },
  {
    id: 'pure',
    nameTh: 'คลีนละมุน',
    nameEn: 'Pure Soft',
    badgeColor: '#e9d8fd',
    beauty: {
      smooth: 48,
      whiten: 34,
      rosy: 14,
      evenTone: 35,
      matte: 28,
      darkCircles: 42,
      brightenEyes: 30,
    },
    reshape: { slimFace: 20, bigEyes: 18, slimNose: 14 },
  },
  {
    id: 'glam',
    nameTh: 'สตูดิโอแกลม',
    nameEn: 'Studio Glam',
    badgeColor: '#ffb703',
    beauty: {
      smooth: 60,
      whiten: 28,
      rosy: 24,
      evenTone: 50,
      matte: 35,
      darkCircles: 62,
      nasolabial: 45,
      brightenEyes: 55,
      teethWhiten: 50,
      hdrGlow: 30,
    },
    reshape: { slimFace: 34, vLine: 30, cheekbones: 20, bigEyes: 28, slimNose: 26 },
  },
];

export interface MakeupLookPreset {
  id: string;
  nameTh: string;
  nameEn: string;
  swatch: [string, string];
  settings: Partial<MakeupSettings>;
}

export const MAKEUP_LOOK_PRESETS: MakeupLookPreset[] = [
  {
    id: 'none',
    nameTh: 'ไม่แต่งหน้า',
    nameEn: 'Bare',
    swatch: ['#f4f4f5', '#e4e4e7'],
    settings: {
      lipstickIntensity: 0,
      blushIntensity: 0,
      eyeshadowIntensity: 0,
      eyelinerIntensity: 0,
      eyebrowIntensity: 0,
      contourIntensity: 0,
      highlightIntensity: 0,
      contactsIntensity: 0,
    },
  },
  {
    id: 'k_peach',
    nameTh: 'พีชเกาหลี',
    nameEn: 'Seoul Peach',
    swatch: ['#ff8b94', '#ffd3b6'],
    settings: {
      lipstickColor: '#E85D75',
      lipstickIntensity: 58,
      lipstickFinish: 'gloss',
      blushStyle: 'apple',
      blushColor: '#FF8FA3',
      blushIntensity: 44,
      eyeshadowColor: '#E5989B',
      eyeshadowIntensity: 38,
      eyelinerStyle: 'puppy',
      eyelinerIntensity: 45,
      eyebrowColor: '#5C4338',
      eyebrowIntensity: 36,
      contourIntensity: 24,
      highlightIntensity: 40,
      contactsColor: '#8B5E3C',
      contactsIntensity: 32,
    },
  },
  {
    id: 'sweet_rose',
    nameTh: 'กุหลาบหวาน',
    nameEn: 'Sweet Rose',
    swatch: ['#d9486b', '#ffadc6'],
    settings: {
      lipstickColor: '#D63E62',
      lipstickIntensity: 68,
      lipstickFinish: 'velvet',
      blushStyle: 'undereye',
      blushColor: '#FF7096',
      blushIntensity: 52,
      eyeshadowColor: '#C97B84',
      eyeshadowIntensity: 48,
      eyelinerStyle: 'natural',
      eyelinerIntensity: 52,
      eyebrowColor: '#4A362C',
      eyebrowIntensity: 42,
      contourIntensity: 30,
      highlightIntensity: 48,
      contactsColor: '#5B4E6D',
      contactsIntensity: 35,
    },
  },
  {
    id: 'milktea_latte',
    nameTh: 'ชานมนู้ดผู้ดี',
    nameEn: 'Milk Tea Nude',
    swatch: ['#c68b77', '#e6beae'],
    settings: {
      lipstickColor: '#C46D5E',
      lipstickIntensity: 62,
      lipstickFinish: 'matte',
      blushStyle: 'sunkissed',
      blushColor: '#E09F87',
      blushIntensity: 42,
      eyeshadowColor: '#A97862',
      eyeshadowIntensity: 46,
      eyelinerStyle: 'natural',
      eyelinerIntensity: 48,
      eyebrowColor: '#4F3A2F',
      eyebrowIntensity: 44,
      contourIntensity: 40,
      highlightIntensity: 36,
      contactsColor: '#7A543E',
      contactsIntensity: 40,
    },
  },
  {
    id: 'tokyo_igari',
    nameTh: 'โตเกียวเมาแดด',
    nameEn: 'Tokyo Igari',
    swatch: ['#ff5c8a', '#ffa6c1'],
    settings: {
      lipstickColor: '#F25C78',
      lipstickIntensity: 56,
      lipstickFinish: 'gloss',
      blushStyle: 'drunk',
      blushColor: '#FF6B8B',
      blushIntensity: 62,
      eyeshadowColor: '#F497B6',
      eyeshadowIntensity: 44,
      eyelinerStyle: 'puppy',
      eyelinerIntensity: 40,
      eyebrowColor: '#6B4F43',
      eyebrowIntensity: 32,
      contourIntensity: 18,
      highlightIntensity: 55,
      contactsColor: '#6D8299',
      contactsIntensity: 42,
    },
  },
  {
    id: 'thai_glam',
    nameTh: 'แกลมสายฝอ/ไทย',
    nameEn: 'Red Carpet Glam',
    swatch: ['#a41623', '#d4a373'],
    settings: {
      lipstickColor: '#B5263B',
      lipstickIntensity: 78,
      lipstickFinish: 'velvet',
      blushStyle: 'sunkissed',
      blushColor: '#E57A7A',
      blushIntensity: 48,
      eyeshadowColor: '#9C5B4E',
      eyeshadowIntensity: 62,
      eyelinerStyle: 'cat',
      eyelinerIntensity: 75,
      eyebrowColor: '#362620',
      eyebrowIntensity: 56,
      contourIntensity: 52,
      highlightIntensity: 62,
      contactsColor: '#567568',
      contactsIntensity: 46,
    },
  },
];

export const LIPSTICK_SWATCHES = [
  { name: 'Rose', color: '#E14A66' },
  { name: 'Peach', color: '#F27D72' },
  { name: 'Ruby', color: '#C41E3A' },
  { name: 'Berry', color: '#A62B5C' },
  { name: 'Milk Tea', color: '#C46D5E' },
  { name: 'Coral', color: '#FF6F61' },
  { name: 'Sakura', color: '#F58CA8' },
  { name: 'Brick', color: '#A44234' },
  { name: 'Plum', color: '#7D284D' },
  { name: 'Nude', color: '#CE8C7B' },
];

export const BLUSH_SWATCHES = [
  { name: 'Pink', color: '#FF7E96' },
  { name: 'Peach', color: '#FF9E80' },
  { name: 'Rose', color: '#E56B8B' },
  { name: 'Apricot', color: '#F4A261' },
  { name: 'Lavender', color: '#D896FF' },
  { name: 'Coral', color: '#FF758F' },
];

export const EYESHADOW_SWATCHES = [
  { name: 'Rose Gold', color: '#C57B7B' },
  { name: 'Cocoa', color: '#8D5B4C' },
  { name: 'Peach', color: '#E89B87' },
  { name: 'Mauve', color: '#9D6B8E' },
  { name: 'Champagne', color: '#D4A87E' },
  { name: 'Smoky', color: '#4E4652' },
];

export const EYEBROW_SWATCHES = [
  { name: 'Espresso', color: '#3B2B23' },
  { name: 'Dark Brown', color: '#543D32' },
  { name: 'Soft Brown', color: '#745646' },
  { name: 'Ash Gray', color: '#5A585B' },
  { name: 'Charcoal', color: '#262426' },
];

export const CONTACTS_SWATCHES = [
  { name: 'Choco', color: '#7A543E' },
  { name: 'Hazel', color: '#A67C46' },
  { name: 'Ash Gray', color: '#6E7F91' },
  { name: 'Ocean Blue', color: '#477FA8' },
  { name: 'Olive', color: '#5C7C62' },
  { name: 'Violet', color: '#7A5FA8' },
];

export interface StickerPack {
  id: string;
  nameTh: string;
  nameEn: string;
  items: Array<{
    kind: 'emoji' | 'badge';
    content: string;
    label?: string;
    color?: string;
  }>;
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'sparkle',
    nameTh: 'ประกายวิ้ง',
    nameEn: 'Sparkles',
    items: [
      { kind: 'emoji', content: '✨' },
      { kind: 'emoji', content: '💖' },
      { kind: 'emoji', content: '🌸' },
      { kind: 'emoji', content: '🦋' },
      { kind: 'emoji', content: '🎀' },
      { kind: 'emoji', content: '💫' },
      { kind: 'emoji', content: '🌷' },
      { kind: 'emoji', content: '☁️' },
      { kind: 'emoji', content: '🌙' },
      { kind: 'emoji', content: '⭐' },
      { kind: 'emoji', content: '🫧' },
      { kind: 'emoji', content: '🤍' },
    ],
  },
  {
    id: 'kawaii',
    nameTh: 'คาวาอี้',
    nameEn: 'Kawaii',
    items: [
      { kind: 'emoji', content: '🧸' },
      { kind: 'emoji', content: '🍓' },
      { kind: 'emoji', content: '🍑' },
      { kind: 'emoji', content: '🍒' },
      { kind: 'emoji', content: '🧁' },
      { kind: 'emoji', content: '🍰' },
      { kind: 'emoji', content: '🐱' },
      { kind: 'emoji', content: '🐰' },
      { kind: 'emoji', content: '👑' },
      { kind: 'emoji', content: '💌' },
      { kind: 'emoji', content: '🌈' },
      { kind: 'emoji', content: '🍭' },
    ],
  },
  {
    id: 'badges',
    nameTh: 'ป้าย Y2K / คาเฟ่',
    nameEn: 'Y2K & Badges',
    items: [
      { kind: 'badge', content: 'MEITU ♡ 2026', color: '#FF4F7B' },
      { kind: 'badge', content: 'DAILY VLOG ✦', color: '#18181B' },
      { kind: 'badge', content: 'PURE BEAUTY', color: '#F472B6' },
      { kind: 'badge', content: 'SEOUL CAFE ☕', color: '#9A6B4C' },
      { kind: 'badge', content: 'GOOD VIBES ✿', color: '#6366F1' },
      { kind: 'badge', content: '100% CUTE ★', color: '#EC4899' },
      { kind: 'badge', content: 'FILM · 400H', color: '#0F766E' },
      { kind: 'badge', content: 'OOTD ✨', color: '#EA580C' },
      { kind: 'badge', content: 'SWEET DAY ♡', color: '#FB7185' },
      { kind: 'badge', content: 'REC ● 00:14', color: '#DC2626' },
    ],
  },
  {
    id: 'glasses',
    nameTh: 'แฟชั่น & แว่น',
    nameEn: 'Fashion',
    items: [
      { kind: 'emoji', content: '🕶️' },
      { kind: 'emoji', content: '👓' },
      { kind: 'emoji', content: '💋' },
      { kind: 'emoji', content: '🌹' },
      { kind: 'emoji', content: '💎' },
      { kind: 'emoji', content: '🎧' },
      { kind: 'emoji', content: '📷' },
      { kind: 'emoji', content: '🎞️' },
      { kind: 'emoji', content: '🪩' },
      { kind: 'emoji', content: '🥂' },
    ],
  },
];

export const FONT_OPTIONS = [
  { label: 'Prompt (ไทย/EN)', value: "'Prompt', sans-serif" },
  { label: 'Kanit (ไทยโมเดิร์น)', value: "'Kanit', sans-serif" },
  { label: 'Mitr (ไทยน่ารัก)', value: "'Mitr', sans-serif" },
  { label: 'Sarabun (ไทยคลีน)', value: "'Sarabun', sans-serif" },
  { label: 'Playfair (Magazine)', value: "'Playfair Display', serif" },
  { label: 'Pacifico (Script)', value: "'Pacifico', cursive" },
  { label: 'Inter (Minimal)', value: "'Inter', sans-serif" },
];

export const TEXT_STYLE_PRESETS: Array<{
  id: TextPresetId;
  nameTh: string;
  nameEn: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  shadow: boolean;
  fontFamily: string;
}> = [
  {
    id: 'clean',
    nameTh: 'คลีนมินิมอล',
    nameEn: 'Clean',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 0,
    bgColor: 'transparent',
    shadow: true,
    fontFamily: "'Prompt', sans-serif",
  },
  {
    id: 'cutePill',
    nameTh: 'ป้ายชมพูน่ารัก',
    nameEn: 'Cute Pill',
    color: '#FFFFFF',
    strokeColor: '#FF4F7B',
    strokeWidth: 0,
    bgColor: 'rgba(255, 79, 123, 0.88)',
    shadow: false,
    fontFamily: "'Mitr', sans-serif",
  },
  {
    id: 'magazine',
    nameTh: 'ปกนิตยสาร',
    nameEn: 'Magazine',
    color: '#FFFDF7',
    strokeColor: '#111111',
    strokeWidth: 0,
    bgColor: 'transparent',
    shadow: true,
    fontFamily: "'Playfair Display', serif",
  },
  {
    id: 'neon',
    nameTh: 'นีออนเรืองแสง',
    nameEn: 'Neon Glow',
    color: '#FFF0F7',
    strokeColor: '#FF2E93',
    strokeWidth: 3,
    bgColor: 'transparent',
    shadow: true,
    fontFamily: "'Kanit', sans-serif",
  },
  {
    id: 'y2k',
    nameTh: 'Y2K ขอบหนา',
    nameEn: 'Y2K Bold',
    color: '#FFDF6B',
    strokeColor: '#FF3B7F',
    strokeWidth: 5,
    bgColor: 'transparent',
    shadow: true,
    fontFamily: "'Kanit', sans-serif",
  },
  {
    id: 'subtitle',
    nameTh: 'ซับไตเติ้ลหนัง',
    nameEn: 'Cinema Sub',
    color: '#FFF5CC',
    strokeColor: '#000000',
    strokeWidth: 2,
    bgColor: 'rgba(0,0,0,0.45)',
    shadow: false,
    fontFamily: "'Sarabun', sans-serif",
  },
  {
    id: 'polaroid',
    nameTh: 'ลายมือโพลารอยด์',
    nameEn: 'Handwritten',
    color: '#FF4F7B',
    strokeColor: '#FFFFFF',
    strokeWidth: 4,
    bgColor: 'transparent',
    shadow: false,
    fontFamily: "'Pacifico', cursive",
  },
];

export const ID_SOLID_COLORS = [
  { name: 'ID Blue', color: '#2B7DE9' },
  { name: 'Sky Blue', color: '#7CC6FE' },
  { name: 'ID White', color: '#FFFFFF' },
  { name: 'ID Red', color: '#D9383A' },
  { name: 'Meitu Pink', color: '#FFD6E3' },
  { name: 'Cream', color: '#FFF4E6' },
  { name: 'Mint', color: '#CCF2E3' },
  { name: 'Lavender', color: '#E4D4FA' },
  { name: 'Studio Gray', color: '#D4D8DD' },
  { name: 'Charcoal', color: '#1F2024' },
];

export const CUTOUT_GRADIENTS: Array<{ name: string; colors: [string, string] }> = [
  { name: 'Sakura', colors: ['#FF9A9E', '#FAD0C4'] },
  { name: 'Cotton', colors: ['#FBC2EB', '#A6C1EE'] },
  { name: 'Peach', colors: ['#FFECD2', '#FCB69F'] },
  { name: 'Sky', colors: ['#A1C4FD', '#C2E9FB'] },
  { name: 'Sunset', colors: ['#F093FB', '#F5576C'] },
  { name: 'Mint', colors: ['#84FAB0', '#8FD3F4'] },
  { name: 'Dream', colors: ['#667EEA', '#764BA2'] },
  { name: 'Studio', colors: ['#ECE9E6', '#FFFFFF'] },
];

export const CUTOUT_STUDIO_SCENES = [
  { id: 'pastelSky', nameTh: 'ท้องฟ้าพาสเทล', nameEn: 'Pastel Sky' },
  { id: 'pinkBokeh', nameTh: 'โบเก้ชมพูวิ้ง', nameEn: 'Pink Bokeh' },
  { id: 'studioSpotlight', nameTh: 'สตูดิโอแฟชั่น', nameEn: 'Studio Light' },
  { id: 'goldenSunset', nameTh: 'แสงเย็นโรแมนติก', nameEn: 'Golden Sunset' },
  { id: 'magazineGrid', nameTh: 'ปกนิตยสารป๊อป', nameEn: 'Pop Magazine' },
];

export interface SamplePhoto {
  id: string;
  src: string;
  labelKey: 'samplePortrait' | 'sampleFashion' | 'sampleCafe' | 'sampleBeach';
  recommendedTab: 'beauty' | 'cutout' | 'filters' | 'hsl';
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'portrait',
    src: './samples/portrait-beauty.jpg',
    labelKey: 'samplePortrait',
    recommendedTab: 'beauty',
  },
  {
    id: 'fashion',
    src: './samples/fashion-street.jpg',
    labelKey: 'sampleFashion',
    recommendedTab: 'cutout',
  },
  {
    id: 'cafe',
    src: './samples/aesthetic-cafe.jpg',
    labelKey: 'sampleCafe',
    recommendedTab: 'filters',
  },
  {
    id: 'beach',
    src: './samples/sunset-beach.jpg',
    labelKey: 'sampleBeach',
    recommendedTab: 'hsl',
  },
];
