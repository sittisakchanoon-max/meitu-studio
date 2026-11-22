import React, { useMemo, useState } from 'react';
import {
  Ban,
  Brush,
  Check,
  Circle,
  Contrast,
  Copy,
  Droplet,
  Eraser,
  Eye,
  Film,
  Flame,
  FlipHorizontal,
  FlipVertical,
  Focus,
  Heart,
  Highlighter,
  Info,
  Moon,
  Palette,
  Pen,
  Plus,
  Rainbow,
  RotateCcw,
  RotateCw,
  Search,
  Sliders,
  Sparkles,
  Star,
  Store,
  Sun,
  Thermometer,
  Trash2,
  Triangle,
  Undo2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  FILTER_CATEGORIES,
  FilterCategory,
  MEITU_FILTERS,
} from '../data/filters';
import {
  AUTO_BEAUTY_PRESETS,
  BLUSH_SWATCHES,
  CONTACTS_SWATCHES,
  CUTOUT_GRADIENTS,
  CUTOUT_STUDIO_SCENES,
  EYEBROW_SWATCHES,
  EYESHADOW_SWATCHES,
  FONT_OPTIONS,
  ID_SOLID_COLORS,
  LIPSTICK_SWATCHES,
  MAKEUP_CATEGORIES,
  MAKEUP_LOOK_PRESETS,
  MakeupCategory,
  STICKER_PACKS,
  TEXT_STYLE_PRESETS,
} from '../data/presets';
import { useT } from '../i18n/translations';
import {
  ActiveBrushConfig,
  AdjustSettings,
  AIStyleId,
  AspectPreset,
  BeautySettings,
  BlushStyle,
  DoodleBrushType,
  EditorState,
  EditorTab,
  EyelinerStyle,
  FrameStyleId,
  HSLChannelKey,
  Language,
  LipFinish,
  LiquifyMode,
  MosaicMode,
  ReshapeSettings,
  StickerLayer,
  TextLayer,
} from '../types/editor';
import { CurveEditor } from './CurveEditor';
import {
  BigEyeIcon,
  FaceSlimIcon,
  LipsIcon,
  NoseIcon,
  SkinSmoothIcon,
  SmileLiftIcon,
  TeethIcon,
  VLineIcon,
} from './MeituIcons';

export type MakeupSubMode =
  | 'looks'
  | 'lips'
  | 'brows'
  | 'eyes'
  | 'contour'
  | 'blush'
  | 'contacts';

interface MeituMobileSheetProps {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
  onCancelTool: () => void;
  onConfirmTool: () => void;
  state: EditorState;
  updateState: (updater: (prev: EditorState) => EditorState, commit?: boolean) => void;
  commitHistory: () => void;
  lang: Language;
  hasFace: boolean;
  isSegmenting: boolean;
  onTriggerCutout: () => void;
  filterThumbs: Record<string, string>;
  makeupThumbs: Record<string, string>;
  autoColor: boolean;
  onToggleAutoColor: () => void;
  brushConfig: ActiveBrushConfig;
  setBrushConfig: React.Dispatch<React.SetStateAction<ActiveBrushConfig>>;
  selectedStickerId: string | null;
  setSelectedStickerId: (id: string | null) => void;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
}

const HSL_COLORS: Array<{ key: HSLChannelKey; color: string; th: string; en: string }> = [
  { key: 'red', color: '#ef4444', th: 'แดง', en: 'Red' },
  { key: 'orange', color: '#f97316', th: 'ส้ม', en: 'Orange' },
  { key: 'yellow', color: '#eab308', th: 'เหลือง', en: 'Yellow' },
  { key: 'green', color: '#22c55e', th: 'เขียว', en: 'Green' },
  { key: 'cyan', color: '#06b6d4', th: 'ฟ้า', en: 'Cyan' },
  { key: 'blue', color: '#3b82f6', th: 'น้ำเงิน', en: 'Blue' },
  { key: 'purple', color: '#a855f7', th: 'ม่วง', en: 'Purple' },
  { key: 'magenta', color: '#ec4899', th: 'ชมพู', en: 'Pink' },
];

type IconComp = React.ComponentType<{ className?: string }>;

const BEAUTY_ITEMS: Array<{
  key: keyof Omit<BeautySettings, 'autoPreset'>;
  Icon: IconComp;
  th: string;
  en: string;
}> = [
  { key: 'smooth', Icon: SkinSmoothIcon, th: 'ผิวเนียน', en: 'Smooth' },
  { key: 'whiten', Icon: Sun, th: 'ผิวขาว', en: 'Whiten' },
  { key: 'faceLight', Icon: Sparkles, th: 'แสงหน้า 3D', en: '3D Light' },
  { key: 'rosy', Icon: Heart, th: 'อมชมพู', en: 'Rosy' },
  { key: 'hdrGlow', Icon: Droplet, th: 'ผิวโกลว์', en: 'Glow' },
  { key: 'evenTone', Icon: Palette, th: 'สีผิวเนียน', en: 'Tone' },
  { key: 'matte', Icon: Circle, th: 'ลดความมัน', en: 'Matte' },
  { key: 'darkCircles', Icon: Moon, th: 'ลดใต้ตา', en: 'Under-Eye' },
  { key: 'nasolabial', Icon: SmileLiftIcon, th: 'ร่องแก้ม', en: 'Lines' },
  { key: 'brightenEyes', Icon: BigEyeIcon, th: 'ตาวิ้งใส', en: 'Eyes' },
  { key: 'teethWhiten', Icon: TeethIcon, th: 'ฟันขาว', en: 'Teeth' },
];

const RESHAPE_ITEMS: Array<{
  key: keyof ReshapeSettings;
  Icon: IconComp;
  th: string;
  en: string;
  min: number;
  max: number;
}> = [
  { key: 'slimFace', Icon: FaceSlimIcon, th: 'หน้าเรียว', en: 'Slim', min: -50, max: 100 },
  { key: 'vLine', Icon: VLineIcon, th: 'คาง V-Line', en: 'V-Line', min: 0, max: 100 },
  { key: 'hairVolume', Icon: Sparkles, th: 'วอลลุ่มผม', en: 'Hair Vol', min: 0, max: 100 },
  { key: 'bigEyes', Icon: BigEyeIcon, th: 'ตาโต', en: 'Big Eyes', min: -40, max: 100 },
  { key: 'slimNose', Icon: NoseIcon, th: 'ปีกจมูก', en: 'Nose', min: -50, max: 100 },
  { key: 'jawline', Icon: VLineIcon, th: 'เก็บกราม', en: 'Jawline', min: -50, max: 100 },
  { key: 'cheekbones', Icon: FaceSlimIcon, th: 'โหนกแก้ม', en: 'Cheeks', min: -50, max: 100 },
  { key: 'forehead', Icon: Circle, th: 'หน้าผาก', en: 'Forehead', min: -60, max: 60 },
  { key: 'eyeTilt', Icon: Eye, th: 'หางตา', en: 'Tilt', min: -100, max: 100 },
  { key: 'eyeDistance', Icon: Focus, th: 'ระยะตา', en: 'Distance', min: -100, max: 100 },
  { key: 'noseBridge', Icon: Triangle, th: 'สันจมูก', en: 'Bridge', min: -100, max: 100 },
  { key: 'noseTip', Icon: NoseIcon, th: 'ปลายจมูก', en: 'Tip', min: -100, max: 100 },
  { key: 'mouthSize', Icon: LipsIcon, th: 'ขนาดปาก', en: 'Mouth', min: -60, max: 80 },
  { key: 'smileLift', Icon: SmileLiftIcon, th: 'มุมปากยิ้ม', en: 'Smile', min: 0, max: 100 },
];

const ADJUST_ITEMS: Array<{
  key: keyof AdjustSettings;
  Icon: IconComp;
  th: string;
  en: string;
  min: number;
  max: number;
}> = [
  { key: 'brightness', Icon: Sun, th: 'ความสว่าง', en: 'Bright', min: -100, max: 100 },
  { key: 'exposure', Icon: Sparkles, th: 'รับแสง', en: 'Exposure', min: -100, max: 100 },
  { key: 'contrast', Icon: Contrast, th: 'คอนทราสต์', en: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', Icon: Droplet, th: 'ความสดสี', en: 'Saturate', min: -100, max: 100 },
  { key: 'vibrance', Icon: Flame, th: 'อิ่มสี', en: 'Vibrance', min: -100, max: 100 },
  { key: 'temperature', Icon: Thermometer, th: 'อุณหภูมิ', en: 'Warmth', min: -100, max: 100 },
  { key: 'tint', Icon: Palette, th: 'โทนสี', en: 'Tint', min: -100, max: 100 },
  { key: 'highlights', Icon: Sun, th: 'ไฮไลท์', en: 'High', min: -100, max: 100 },
  { key: 'shadows', Icon: Moon, th: 'เงามืด', en: 'Shadow', min: -100, max: 100 },
  { key: 'sharpness', Icon: Triangle, th: 'คมชัด', en: 'Sharp', min: 0, max: 100 },
  { key: 'clarity', Icon: Sliders, th: 'มิติภาพ', en: 'Clarity', min: -100, max: 100 },
  { key: 'fade', Icon: Circle, th: 'ฝ้าละมุน', en: 'Fade', min: 0, max: 100 },
  { key: 'vignette', Icon: Focus, th: 'ขอบมืด', en: 'Vignette', min: -100, max: 100 },
  { key: 'grain', Icon: Film, th: 'เกรนฟิล์ม', en: 'Grain', min: 0, max: 100 },
  { key: 'whites', Icon: Circle, th: 'โทนขาว', en: 'Whites', min: -100, max: 100 },
  { key: 'blacks', Icon: Circle, th: 'โทนดำ', en: 'Blacks', min: -100, max: 100 },
];

export const MeituMobileSheet: React.FC<MeituMobileSheetProps> = ({
  activeTab,
  setActiveTab,
  onCancelTool,
  onConfirmTool,
  state,
  updateState,
  commitHistory,
  lang,
  hasFace,
  isSegmenting,
  onTriggerCutout,
  filterThumbs,
  makeupThumbs,
  autoColor,
  onToggleAutoColor,
  brushConfig,
  setBrushConfig,
  selectedStickerId,
  setSelectedStickerId,
  selectedTextId,
  setSelectedTextId,
}) => {
  const t = useT(lang);

  const [filterCat, setFilterCat] = useState<FilterCategory>('featured');
  const [filterSearchOpen, setFilterSearchOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [slidingVal, setSlidingVal] = useState<number | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('meitu_fav_filters');
      return saved ? JSON.parse(saved) : ['meitu_cotton', 'flash_ricoh', 'sweet_sakura'];
    } catch {
      return ['meitu_cotton', 'flash_ricoh', 'sweet_sakura'];
    }
  });

  const [makeupMode, setMakeupMode] = useState<MakeupSubMode>('looks');
  const [makeupCat, setMakeupCat] = useState<MakeupCategory>('featured');
  const [makeupLookStrength, setMakeupLookStrength] = useState(80);

  const [beautyItem, setBeautyItem] = useState<keyof Omit<BeautySettings, 'autoPreset'>>('smooth');
  const [reshapeItem, setReshapeItem] = useState<keyof ReshapeSettings>('slimFace');
  const [adjustItem, setAdjustItem] = useState<keyof AdjustSettings>('brightness');
  const [hslChannel, setHslChannel] = useState<HSLChannelKey>('red');
  const [hslProp, setHslProp] = useState<'h' | 's' | 'l'>('s');
  const [stickerPackId, setStickerPackId] = useState(STICKER_PACKS[0].id);
  const [eyeSub, setEyeSub] = useState<'shadow' | 'liner'>('shadow');
  const [contourSub, setContourSub] = useState<'contour' | 'highlight'>('contour');

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        localStorage.setItem('meitu_fav_filters', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const visibleFilters = useMemo(() => {
    const list = MEITU_FILTERS.filter((f) => f.id !== 'original');
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      return list.filter(
        (f) => f.nameTh.toLowerCase().includes(q) || f.nameEn.toLowerCase().includes(q)
      );
    }
    if (filterCat === 'favorites') return list.filter((f) => favorites.includes(f.id));
    if (filterCat === 'featured') return list.filter((f) => f.featured);
    return list.filter((f) => f.category === filterCat);
  }, [filterCat, filterQuery, favorites]);

  const visibleLooks = useMemo(() => {
    const looks = MAKEUP_LOOK_PRESETS.filter((l) => l.id !== 'none');
    if (makeupCat === 'featured') return looks.filter((l) => l.featured);
    return looks.filter((l) => l.category === makeupCat);
  }, [makeupCat]);

  const applyScaledLook = (lookId: string, scalePct: number) => {
    const look = MAKEUP_LOOK_PRESETS.find((l) => l.id === lookId);
    if (!look) return;
    const factor = scalePct / 80;
    const scaleVal = (v?: number) => Math.min(100, Math.round((v ?? 0) * factor));
    updateState((prev) => ({
      ...prev,
      makeup: {
        ...prev.makeup,
        ...look.settings,
        preset: lookId,
        lipstickIntensity: scaleVal(look.settings.lipstickIntensity),
        blushIntensity: scaleVal(look.settings.blushIntensity),
        eyeshadowIntensity: scaleVal(look.settings.eyeshadowIntensity),
        eyelinerIntensity: scaleVal(look.settings.eyelinerIntensity),
        eyebrowIntensity: scaleVal(look.settings.eyebrowIntensity),
        contourIntensity: scaleVal(look.settings.contourIntensity),
        highlightIntensity: scaleVal(look.settings.highlightIntensity),
        contactsIntensity: scaleVal(look.settings.contactsIntensity),
      },
    }));
  };

  /**
   * EXACT Meitu iOS White Thin Slider (Matches Screenshots 1 & 2!)
   * Clean thin white track, crisp 20px solid white thumb, floating numeric pill ONLY while dragging!
   */
  const renderWhiteSlider = (
    val: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
    onReset?: () => void,
    leftSlot?: React.ReactNode
  ) => {
    const pct = ((val - min) / (max - min)) * 100;
    const bg =
      min < 0
        ? `linear-gradient(to right, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.22) ${Math.min(50, pct)}%, #ffffff ${Math.min(50, pct)}%, #ffffff ${Math.max(50, pct)}%, rgba(255,255,255,0.22) ${Math.max(50, pct)}%, rgba(255,255,255,0.22) 100%)`
        : `linear-gradient(to right, #ffffff 0%, #ffffff ${pct}%, rgba(255,255,255,0.22) ${pct}%, rgba(255,255,255,0.22) 100%)`;

    return (
      <div className="relative flex items-center gap-3.5 px-4 pt-3 pb-2">
        {slidingVal !== null && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/15 text-white text-[12px] font-semibold tabular-nums pointer-events-none">
            {slidingVal > 0 && min < 0 ? `+${Math.round(slidingVal)}` : Math.round(slidingVal)}
          </div>
        )}
        {leftSlot && <div className="shrink-0">{leftSlot}</div>}
        <div className="flex-1 flex items-center">
          <input
            type="range"
            min={min}
            max={max}
            value={val}
            onPointerDown={() => setSlidingVal(val)}
            onChange={(e) => {
              const nv = parseFloat(e.target.value);
              setSlidingVal(nv);
              onChange(nv);
            }}
            onPointerUp={() => {
              setSlidingVal(null);
              commitHistory();
            }}
            onPointerCancel={() => setSlidingVal(null)}
            className="meitu-white-slider"
            style={{ background: bg }}
          />
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 text-white/85 hover:text-white active:scale-90 transition-transform shrink-0"
            title={t('reset')}
          >
            <Eraser className="w-[18px] h-[18px] stroke-[1.75]" />
          </button>
        )}
      </div>
    );
  };

  /**
   * EXACT Meitu iOS Bottom Confirm Bar (`✕` + subtle `ⓘ` · Sub-Mode Tabs with pink underline · `✓`)
   * Matches Screenshots 1 & 2 pixel-for-pixel!
   */
  const renderBottomConfirmBar = (
    tabs: Array<{ id: string; label: string; active: boolean; onClick: () => void }>
  ) => (
    <div className="relative h-[50px] px-3 flex items-center justify-between safe-bottom bg-black">
      {infoOpen && (
        <div className="absolute bottom-14 left-4 right-4 p-3 rounded-2xl bg-[#1C1C1E]/95 backdrop-blur border border-white/10 text-[11px] text-zinc-300 flex items-center justify-between z-40">
          <span>
            {activeTab === 'filters'
              ? `${lang === 'th' ? 'ฟิลเตอร์ที่เลือก' : 'Filter'}: ${state.filter.id} (${state.filter.intensity}%)`
              : activeTab === 'makeup'
                ? `${lang === 'th' ? 'เมคอัพลุค' : 'Look'}: ${state.makeup.preset} · Lip ${state.makeup.lipstickIntensity}% · Blush ${state.makeup.blushIntensity}%`
                : `Meitu Studio AI · ${t(`tab_${activeTab}` as Parameters<typeof t>[0])}`}
          </span>
          <button type="button" onClick={() => setInfoOpen(false)} className="text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onCancelTool}
          className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white active:scale-90"
          aria-label="Cancel"
        >
          <X className="w-[21px] h-[21px] stroke-[1.8]" />
        </button>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="w-6 h-6 flex items-center justify-center text-white/55 hover:text-white/90 -ml-1 mb-3"
          title="Info"
        >
          <Info className="w-4 h-4 stroke-[1.6]" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-5 overflow-x-auto no-scrollbar px-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={tb.onClick}
            className={`relative py-2 text-[13.5px] whitespace-nowrap transition-colors ${
              tb.active ? 'text-white font-semibold' : 'text-[#8E8E93] font-normal'
            }`}
          >
            {tb.label}
            {tb.active && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2.5px] rounded-full bg-[#FF4F7B]" />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onConfirmTool}
        className="w-10 h-10 flex items-center justify-center text-white hover:text-[#FF4F7B] active:scale-90 shrink-0"
        aria-label="Confirm"
      >
        <Check className="w-[22px] h-[22px] stroke-[2]" />
      </button>
    </div>
  );

  /** Helper for crisp Meitu monochrome vector line-icon tiles (Beauty / Reshape / Adjust) */
  const renderLineIconTile = (
    key: string,
    Icon: IconComp,
    label: string,
    active: boolean,
    modified: boolean,
    onClick: () => void
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="shrink-0 w-[60px] flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center relative transition-colors ${
          active
            ? 'bg-white text-black'
            : 'bg-[#18181A] text-white/90'
        }`}
      >
        <Icon className="w-5 h-5 stroke-[1.6]" />
        {modified && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
              active ? 'bg-[#FF4F7B] ring-2 ring-black' : 'bg-[#FF4F7B]'
            }`}
          />
        )}
      </div>
      <span
        className={`text-[11px] truncate w-full text-center ${
          active ? 'text-white font-medium' : 'text-[#8E8E93]'
        }`}
      >
        {label}
      </span>
    </button>
  );

  // =========================================================================
  // 1. FILTERS / ADJUST / HSL / CURVES GROUP (EXACT SCREENSHOT 1!)
  // =========================================================================
  if (
    activeTab === 'filters' ||
    activeTab === 'adjust' ||
    activeTab === 'hsl' ||
    activeTab === 'curves'
  ) {
    const colorTabs = [
      { id: 'adjust', label: lang === 'th' ? 'ปรับสี' : 'Adjust', active: activeTab === 'adjust', onClick: () => setActiveTab('adjust') },
      { id: 'filters', label: lang === 'th' ? 'ฟิลเตอร์' : 'Filters', active: activeTab === 'filters', onClick: () => setActiveTab('filters') },
      { id: 'hsl', label: 'HSL', active: activeTab === 'hsl', onClick: () => setActiveTab('hsl') },
      { id: 'curves', label: lang === 'th' ? 'กราฟสี' : 'Curves', active: activeTab === 'curves', onClick: () => setActiveTab('curves') },
    ];

    if (activeTab === 'filters') {
      return (
        <div className="bg-black text-white select-none">
          {/* Row 1: ปรับสีอัตโนมัติ Pill Toggle + White Thin Slider + Tilted Eraser */}
          {renderWhiteSlider(
            state.filter.id === 'original' ? 0 : state.filter.intensity,
            0,
            100,
            (v) =>
              updateState((prev) => ({
                ...prev,
                filter: { ...prev.filter, intensity: v },
              })),
            () =>
              updateState((prev) => ({ ...prev, filter: { id: 'original', intensity: 80 } }), true),
            <button
              type="button"
              onClick={onToggleAutoColor}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#1C1C1E] text-[11px] font-medium"
            >
              <span className="text-white/90 whitespace-nowrap">
                {lang === 'th' ? 'ปรับสีอัตโนมัติ' : 'Auto Color'}
              </span>
              <span
                className={`w-7 h-4 rounded-full relative transition-colors ${
                  autoColor ? 'bg-[#FF4F7B]' : 'bg-[#3A3A3C]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    autoColor ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          )}

          {filterSearchOpen && (
            <div className="px-4 pb-2">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาฟิลเตอร์...' : 'Search filter...'}
                className="w-full px-3 py-1.5 rounded-full bg-[#1C1C1E] text-xs text-white outline-none"
              />
            </div>
          )}

          {/* Row 2: ⊘ · 🔍 · รายการโปรด · แบบเด่นๆ · ใหม่ · พื้นฐาน · แสงแฟลช */}
          <div className="flex items-center gap-4 px-4 py-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() =>
                updateState((prev) => ({ ...prev, filter: { id: 'original', intensity: 80 } }), true)
              }
              className={`shrink-0 ${state.filter.id === 'original' ? 'text-white' : 'text-white/75'}`}
            >
              <Ban className="w-[18px] h-[18px] stroke-[1.7]" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterSearchOpen((o) => !o);
                setFilterQuery('');
              }}
              className={`shrink-0 ${filterSearchOpen ? 'text-[#FF4F7B]' : 'text-white/75'}`}
            >
              <Search className="w-[18px] h-[18px] stroke-[1.7]" />
            </button>
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFilterCat(cat.id);
                  setFilterQuery('');
                }}
                className={`text-[12.5px] whitespace-nowrap transition-colors ${
                  filterCat === cat.id && !filterQuery
                    ? 'text-white font-semibold'
                    : 'text-[#8E8E93]'
                }`}
              >
                {lang === 'th' ? cat.nameTh : cat.nameEn}
              </button>
            ))}
          </div>

          {/* Row 3: Live Square Photo Thumbnails (`ทั้งหมด`, `ฝ้าย`, `แฟลช Ricoh`, `แฟลชผิวใส`, ...) */}
          <div className="flex items-start gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterCat('featured')}
              className="shrink-0 w-[62px] flex flex-col items-center gap-1.5"
            >
              <div className="w-[62px] h-[62px] rounded-[12px] bg-[#18181A] flex items-center justify-center text-[#8E8E93]">
                <Store className="w-5 h-5 stroke-[1.6]" />
              </div>
              <span className="text-[11px] text-[#8E8E93] truncate w-full text-center">
                {lang === 'th' ? 'ทั้งหมด' : 'All'}
              </span>
            </button>

            {visibleFilters.map((f) => {
              const active = state.filter.id === f.id;
              const thumb = filterThumbs[f.id];
              const isFav = favorites.includes(f.id);
              return (
                <div key={f.id} className="shrink-0 w-[62px] flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (active) {
                        toggleFavorite(f.id);
                      } else {
                        updateState(
                          (prev) => ({
                            ...prev,
                            filter: {
                              id: f.id,
                              intensity: prev.filter.id === 'original' ? 80 : prev.filter.intensity,
                            },
                          }),
                          true
                        );
                      }
                    }}
                    className={`relative w-[62px] h-[62px] rounded-[12px] overflow-hidden transition-transform active:scale-95 ${
                      active ? 'ring-[1.8px] ring-white' : ''
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={f.nameEn} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: `linear-gradient(135deg, ${f.swatch[0]}, ${f.swatch[1]})`,
                        }}
                      />
                    )}
                    {f.hotBadge && !active && (
                      <span className="absolute top-1 left-1 w-[17px] h-[17px] rounded-full bg-gradient-to-br from-[#FF5588] to-[#FF85A8] text-white flex items-center justify-center shadow-sm">
                        <Heart className="w-2.5 h-2.5 fill-white" />
                      </span>
                    )}
                    {isFav && active && (
                      <span className="absolute top-1 right-1 text-[#FF4F7B]">
                        <Heart className="w-3 h-3 fill-[#FF4F7B]" />
                      </span>
                    )}
                    {active && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white stroke-[2.2]" />
                      </div>
                    )}
                  </button>
                  <span
                    className={`text-[11px] truncate w-full text-center ${
                      active ? 'text-white font-medium' : 'text-[#8E8E93]'
                    }`}
                  >
                    {lang === 'th' ? f.nameTh : f.nameEn}
                  </span>
                </div>
              );
            })}
          </div>

          {renderBottomConfirmBar(colorTabs)}
        </div>
      );
    }

    if (activeTab === 'adjust') {
      const currentMeta = ADJUST_ITEMS.find((i) => i.key === adjustItem) ?? ADJUST_ITEMS[0];
      return (
        <div className="bg-black text-white select-none">
          {renderWhiteSlider(
            state.adjust[currentMeta.key],
            currentMeta.min,
            currentMeta.max,
            (v) =>
              updateState((prev) => ({
                ...prev,
                adjust: { ...prev.adjust, [currentMeta.key]: v },
              })),
            () =>
              updateState(
                (prev) => ({ ...prev, adjust: { ...prev.adjust, [currentMeta.key]: 0 } }),
                true
              )
          )}
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            {ADJUST_ITEMS.map((item) =>
              renderLineIconTile(
                item.key,
                item.Icon,
                lang === 'th' ? item.th : item.en,
                adjustItem === item.key,
                Math.abs(state.adjust[item.key]) > 0.5,
                () => setAdjustItem(item.key)
              )
            )}
          </div>
          {renderBottomConfirmBar(colorTabs)}
        </div>
      );
    }

    if (activeTab === 'hsl') {
      const ch = state.hsl[hslChannel];
      return (
        <div className="bg-black text-white select-none">
          {renderWhiteSlider(
            ch[hslProp],
            -100,
            100,
            (v) =>
              updateState((prev) => ({
                ...prev,
                hsl: { ...prev.hsl, [hslChannel]: { ...prev.hsl[hslChannel], [hslProp]: v } },
              })),
            () =>
              updateState(
                (prev) => ({
                  ...prev,
                  hsl: { ...prev.hsl, [hslChannel]: { h: 0, s: 0, l: 0 } },
                }),
                true
              ),
            <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5">
              {(
                [
                  ['h', 'H'],
                  ['s', 'S'],
                  ['l', 'L'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setHslProp(k)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    hslProp === k ? 'bg-white text-black' : 'text-[#8E8E93]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            {HSL_COLORS.map((c) => {
              const active = hslChannel === c.key;
              const touched =
                state.hsl[c.key].h !== 0 || state.hsl[c.key].s !== 0 || state.hsl[c.key].l !== 0;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setHslChannel(c.key)}
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-7 h-7 rounded-full transition-transform relative ${
                      active ? 'ring-2 ring-white scale-110' : 'opacity-80'
                    }`}
                    style={{ background: c.color }}
                  >
                    {touched && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border border-black" />
                    )}
                  </span>
                  <span className={`text-[10px] ${active ? 'text-white font-medium' : 'text-[#8E8E93]'}`}>
                    {lang === 'th' ? c.th : c.en}
                  </span>
                </button>
              );
            })}
          </div>
          {renderBottomConfirmBar(colorTabs)}
        </div>
      );
    }

    return (
      <div className="bg-black text-white select-none">
        <div className="px-4 py-2 max-h-56 overflow-y-auto">
          <div className="max-w-[210px] mx-auto">
            <CurveEditor
              curves={state.curves}
              onChange={(next) => updateState((prev) => ({ ...prev, curves: next }))}
              onCommit={commitHistory}
              hint={t('curveHint')}
              resetLabel={t('reset')}
              dark
            />
          </div>
        </div>
        {renderBottomConfirmBar(colorTabs)}
      </div>
    );
  }

  // =========================================================================
  // 2. MAKEUP STUDIO (EXACT SCREENSHOT 2!)
  // =========================================================================
  if (activeTab === 'makeup') {
    const m = state.makeup;
    const setM = (patch: Partial<typeof m>, commit = false) =>
      updateState((prev) => ({ ...prev, makeup: { ...prev.makeup, ...patch } }), commit);

    const makeupTabs: Array<{ id: MakeupSubMode; label: string }> = [
      { id: 'looks', label: lang === 'th' ? 'เมคอัพ' : 'Looks' },
      { id: 'lips', label: lang === 'th' ? 'ลิปสติก' : 'Lipstick' },
      { id: 'brows', label: lang === 'th' ? 'คิ้ว' : 'Brows' },
      { id: 'eyes', label: lang === 'th' ? 'ดวงตา' : 'Eyes' },
      { id: 'contour', label: lang === 'th' ? 'คอนทัวร์' : 'Contour' },
      { id: 'blush', label: lang === 'th' ? 'บลัชออน' : 'Blush' },
      { id: 'contacts', label: lang === 'th' ? 'คอนแทค' : 'Lenses' },
    ];

    const bottomTabs = makeupTabs.map((mt) => ({
      id: mt.id,
      label: mt.label,
      active: makeupMode === mt.id,
      onClick: () => setMakeupMode(mt.id),
    }));

    return (
      <div className="bg-black text-white select-none">
        {!hasFace && (
          <div className="px-4 pt-1 text-[11px] text-amber-400 text-center">
            {t('noFaceDetected')}
          </div>
        )}

        {/* Row 1: Single Clean White Slider */}
        {makeupMode === 'looks' &&
          renderWhiteSlider(
            m.preset === 'none' ? 0 : makeupLookStrength,
            0,
            100,
            (v) => {
              setMakeupLookStrength(v);
              if (m.preset !== 'none') applyScaledLook(m.preset, v);
            }
          )}

        {makeupMode === 'lips' &&
          renderWhiteSlider(
            m.lipstickIntensity,
            0,
            100,
            (v) => setM({ lipstickIntensity: v }),
            () => setM({ lipstickIntensity: 0 }, true),
            <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5">
              {(['matte', 'velvet', 'gloss'] as LipFinish[]).map((fin) => (
                <button
                  key={fin}
                  type="button"
                  onClick={() => setM({ lipstickFinish: fin }, true)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    m.lipstickFinish === fin ? 'bg-white text-black' : 'text-[#8E8E93]'
                  }`}
                >
                  {fin === 'matte' ? t('finishMatte') : fin === 'velvet' ? t('finishVelvet') : t('finishGloss')}
                </button>
              ))}
            </div>
          )}

        {makeupMode === 'brows' &&
          renderWhiteSlider(m.eyebrowIntensity, 0, 100, (v) => setM({ eyebrowIntensity: v }), () =>
            setM({ eyebrowIntensity: 0 }, true)
          )}

        {makeupMode === 'eyes' &&
          renderWhiteSlider(
            eyeSub === 'shadow' ? m.eyeshadowIntensity : m.eyelinerIntensity,
            0,
            100,
            (v) =>
              eyeSub === 'shadow' ? setM({ eyeshadowIntensity: v }) : setM({ eyelinerIntensity: v }),
            () =>
              eyeSub === 'shadow'
                ? setM({ eyeshadowIntensity: 0 }, true)
                : setM({ eyelinerIntensity: 0 }, true),
            <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setEyeSub('shadow')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  eyeSub === 'shadow' ? 'bg-white text-black' : 'text-[#8E8E93]'
                }`}
              >
                {t('eyeshadow')}
              </button>
              <button
                type="button"
                onClick={() => setEyeSub('liner')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  eyeSub === 'liner' ? 'bg-white text-black' : 'text-[#8E8E93]'
                }`}
              >
                {t('eyeliner')}
              </button>
            </div>
          )}

        {makeupMode === 'contour' &&
          renderWhiteSlider(
            contourSub === 'contour' ? m.contourIntensity : m.highlightIntensity,
            0,
            100,
            (v) =>
              contourSub === 'contour'
                ? setM({ contourIntensity: v })
                : setM({ highlightIntensity: v }),
            () => setM({ contourIntensity: 0, highlightIntensity: 0 }, true),
            <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setContourSub('contour')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                  contourSub === 'contour' ? 'bg-white text-black' : 'text-[#8E8E93]'
                }`}
              >
                {t('contour')}
              </button>
              <button
                type="button"
                onClick={() => setContourSub('highlight')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                  contourSub === 'highlight' ? 'bg-white text-black' : 'text-[#8E8E93]'
                }`}
              >
                {t('highlight')}
              </button>
            </div>
          )}

        {makeupMode === 'blush' &&
          renderWhiteSlider(
            m.blushIntensity,
            0,
            100,
            (v) => setM({ blushIntensity: v }),
            () => setM({ blushIntensity: 0 }, true),
            <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5">
              {(
                [
                  ['undereye', lang === 'th' ? 'ใต้ตา' : 'Eye'],
                  ['apple', lang === 'th' ? 'แก้ม' : 'Apple'],
                  ['drunk', lang === 'th' ? 'จมูก' : 'Drunk'],
                  ['sunkissed', lang === 'th' ? 'ซันคิส' : 'Sun'],
                ] as Array<[BlushStyle, string]>
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setM({ blushStyle: st }, true)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    m.blushStyle === st ? 'bg-white text-black' : 'text-[#8E8E93]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

        {makeupMode === 'contacts' &&
          renderWhiteSlider(m.contactsIntensity, 0, 100, (v) => setM({ contactsIntensity: v }), () =>
            setM({ contactsIntensity: 0 }, true)
          )}

        {/* Row 2 + Row 3: Exact Screenshot 2 Makeup Looks Strip OR Swatch Circles */}
        {makeupMode === 'looks' ? (
          <>
            <div className="flex items-center gap-5 px-4 py-1.5 overflow-x-auto no-scrollbar">
              <Search className="w-[18px] h-[18px] text-white/75 shrink-0 stroke-[1.7]" />
              {MAKEUP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMakeupCat(cat.id)}
                  className={`text-[12.5px] whitespace-nowrap transition-colors ${
                    makeupCat === cat.id ? 'text-white font-semibold' : 'text-[#8E8E93]'
                  }`}
                >
                  {lang === 'th' ? cat.nameTh : cat.nameEn}
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setMakeupLookStrength(0);
                  applyScaledLook('none', 0);
                  commitHistory();
                }}
                className="shrink-0 w-[62px] flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-[62px] h-[62px] rounded-[12px] bg-[#18181A] flex items-center justify-center ${
                    m.preset === 'none' ? 'ring-[1.8px] ring-white text-white' : 'text-[#6E6E73]'
                  }`}
                >
                  <Ban className="w-5 h-5 stroke-[1.7]" />
                </div>
                <span
                  className={`text-[11px] truncate w-full text-center ${
                    m.preset === 'none' ? 'text-white font-medium' : 'text-[#8E8E93]'
                  }`}
                >
                  {lang === 'th' ? 'ต้นฉบับ' : 'Original'}
                </span>
              </button>

              {visibleLooks.map((look) => {
                const active = m.preset === look.id;
                const thumb = makeupThumbs[look.id];
                return (
                  <button
                    key={look.id}
                    type="button"
                    onClick={() => {
                      const nextStr = makeupLookStrength < 20 ? 80 : makeupLookStrength;
                      setMakeupLookStrength(nextStr);
                      applyScaledLook(look.id, nextStr);
                      commitHistory();
                    }}
                    className="shrink-0 w-[62px] flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`relative w-[62px] h-[62px] rounded-[12px] overflow-hidden active:scale-95 transition-transform ${
                        active ? 'ring-[1.8px] ring-white' : ''
                      }`}
                    >
                      {thumb ? (
                        <img src={thumb} alt={look.nameEn} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${look.swatch[0]}, ${look.swatch[1]})`,
                          }}
                        />
                      )}
                      {look.hotBadge && !active && (
                        <span className="absolute top-1 left-1 w-[17px] h-[17px] rounded-full bg-gradient-to-br from-[#FF5588] to-[#FF85A8] text-white flex items-center justify-center shadow-sm">
                          <Heart className="w-2.5 h-2.5 fill-white" />
                        </span>
                      )}
                      {active && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white stroke-[2.2]" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] truncate w-full text-center flex items-center justify-center gap-0.5 ${
                        active ? 'text-white font-medium' : 'text-[#8E8E93]'
                      }`}
                    >
                      {look.sparkleName && (
                        <Sparkles className="w-2.5 h-2.5 text-sky-300 shrink-0" />
                      )}
                      <span className="truncate">{lang === 'th' ? look.nameTh : look.nameEn}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
            {makeupMode === 'lips' &&
              LIPSTICK_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        lipstickColor: sw.color,
                        lipstickIntensity: m.lipstickIntensity === 0 ? 64 : m.lipstickIntensity,
                      },
                      true
                    )
                  }
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${
                      m.lipstickColor === sw.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ background: sw.color }}
                  />
                  <span className="text-[10px] text-[#8E8E93]">{sw.name}</span>
                </button>
              ))}

            {makeupMode === 'blush' &&
              BLUSH_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        blushColor: sw.color,
                        blushIntensity: m.blushIntensity === 0 ? 52 : m.blushIntensity,
                      },
                      true
                    )
                  }
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 ${
                      m.blushColor === sw.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ background: sw.color }}
                  />
                  <span className="text-[10px] text-[#8E8E93]">{sw.name}</span>
                </button>
              ))}

            {makeupMode === 'brows' &&
              EYEBROW_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        eyebrowColor: sw.color,
                        eyebrowIntensity: m.eyebrowIntensity === 0 ? 45 : m.eyebrowIntensity,
                      },
                      true
                    )
                  }
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 ${
                      m.eyebrowColor === sw.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ background: sw.color }}
                  />
                  <span className="text-[10px] text-[#8E8E93]">{sw.name}</span>
                </button>
              ))}

            {makeupMode === 'eyes' &&
              eyeSub === 'shadow' &&
              EYESHADOW_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        eyeshadowColor: sw.color,
                        eyeshadowIntensity: m.eyeshadowIntensity === 0 ? 48 : m.eyeshadowIntensity,
                      },
                      true
                    )
                  }
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 ${
                      m.eyeshadowColor === sw.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ background: sw.color }}
                  />
                  <span className="text-[10px] text-[#8E8E93]">{sw.name}</span>
                </button>
              ))}

            {makeupMode === 'eyes' &&
              eyeSub === 'liner' &&
              (
                [
                  ['natural', t('linerNatural')],
                  ['cat', t('linerCat')],
                  ['puppy', t('linerPuppy')],
                ] as Array<[EyelinerStyle, string]>
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        eyelinerStyle: st,
                        eyelinerIntensity: m.eyelinerIntensity === 0 ? 55 : m.eyelinerIntensity,
                      },
                      true
                    )
                  }
                  className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 ${
                    m.eyelinerStyle === st ? 'bg-white text-black' : 'bg-[#18181A] text-zinc-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}

            {makeupMode === 'contacts' &&
              CONTACTS_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() =>
                    setM(
                      {
                        contactsColor: sw.color,
                        contactsIntensity: m.contactsIntensity === 0 ? 48 : m.contactsIntensity,
                      },
                      true
                    )
                  }
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 ${
                      m.contactsColor === sw.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{
                      background: `radial-gradient(circle, #111 22%, ${sw.color} 38%, #111 94%)`,
                    }}
                  />
                  <span className="text-[10px] text-[#8E8E93]">{sw.name}</span>
                </button>
              ))}

            {makeupMode === 'contour' && (
              <p className="text-xs text-[#8E8E93]">
                {lang === 'th'
                  ? 'เลื่อนแถบด้านบนเพื่อปรับคอนทัวร์กรอบหน้า เหลาสันจมูก และไฮไลท์ถุงใต้ตา'
                  : 'Slide above to adjust nose/jaw contour and under-eye shimmer'}
              </p>
            )}
          </div>
        )}

        {renderBottomConfirmBar(bottomTabs)}
      </div>
    );
  }

  // =========================================================================
  // 3. BEAUTY / RESHAPE / ERASE / LIQUIFY GROUP
  // =========================================================================
  if (
    activeTab === 'beauty' ||
    activeTab === 'reshape' ||
    activeTab === 'erase' ||
    activeTab === 'liquify'
  ) {
    const retouchTabs = [
      { id: 'beauty', label: lang === 'th' ? 'บิวตี้ผิว' : 'Beauty', active: activeTab === 'beauty', onClick: () => setActiveTab('beauty') },
      { id: 'reshape', label: lang === 'th' ? 'โครงหน้า' : 'Reshape', active: activeTab === 'reshape', onClick: () => setActiveTab('reshape') },
      { id: 'erase', label: lang === 'th' ? 'ยางลบสิว' : 'Eraser', active: activeTab === 'erase', onClick: () => setActiveTab('erase') },
      { id: 'liquify', label: lang === 'th' ? 'ลิควิฟาย' : 'Liquify', active: activeTab === 'liquify', onClick: () => setActiveTab('liquify') },
    ];

    if (activeTab === 'beauty') {
      return (
        <div className="bg-black text-white select-none">
          {renderWhiteSlider(
            state.beauty[beautyItem],
            0,
            100,
            (v) =>
              updateState((prev) => ({
                ...prev,
                beauty: { ...prev.beauty, [beautyItem]: v },
              })),
            () =>
              updateState(
                (prev) => ({ ...prev, beauty: { ...prev.beauty, [beautyItem]: 0 } }),
                true
              )
          )}

          <div className="flex items-center gap-3 px-4 py-1 overflow-x-auto no-scrollbar">
            {AUTO_BEAUTY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  updateState(
                    (prev) => ({
                      ...prev,
                      beauty: { ...prev.beauty, ...p.beauty, autoPreset: p.id },
                      reshape: p.reshape ? { ...prev.reshape, ...p.reshape } : prev.reshape,
                    }),
                    true
                  )
                }
                className={`text-[12px] whitespace-nowrap transition-colors ${
                  state.beauty.autoPreset === p.id ? 'text-white font-semibold' : 'text-[#8E8E93]'
                }`}
              >
                {lang === 'th' ? p.nameTh : p.nameEn}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
            {BEAUTY_ITEMS.map((item) =>
              renderLineIconTile(
                item.key,
                item.Icon,
                lang === 'th' ? item.th : item.en,
                beautyItem === item.key,
                state.beauty[item.key] > 0,
                () => setBeautyItem(item.key)
              )
            )}
          </div>
          {renderBottomConfirmBar(retouchTabs)}
        </div>
      );
    }

    if (activeTab === 'reshape') {
      const meta = RESHAPE_ITEMS.find((i) => i.key === reshapeItem) ?? RESHAPE_ITEMS[0];
      return (
        <div className="bg-black text-white select-none">
          {!hasFace && (
            <div className="px-4 pt-1 text-[11px] text-amber-400 text-center">
              {t('noFaceDetected')}
            </div>
          )}
          {renderWhiteSlider(
            state.reshape[meta.key],
            meta.min,
            meta.max,
            (v) =>
              updateState((prev) => ({
                ...prev,
                reshape: { ...prev.reshape, [meta.key]: v },
              })),
            () =>
              updateState(
                (prev) => ({ ...prev, reshape: { ...prev.reshape, [meta.key]: 0 } }),
                true
              )
          )}
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            {RESHAPE_ITEMS.map((item) =>
              renderLineIconTile(
                item.key,
                item.Icon,
                lang === 'th' ? item.th : item.en,
                reshapeItem === item.key,
                Math.abs(state.reshape[item.key]) > 0.5,
                () => setReshapeItem(item.key)
              )
            )}
          </div>
          {renderBottomConfirmBar(retouchTabs)}
        </div>
      );
    }

    if (activeTab === 'erase') {
      return (
        <div className="bg-black text-white select-none">
          {renderWhiteSlider(
            Math.round(brushConfig.eraseRadius * 1000),
            8,
            70,
            (v) => setBrushConfig((p) => ({ ...p, eraseRadius: v / 1000 })),
            undefined,
            <span className="text-[11px] text-[#8E8E93]">{t('brushSize')}</span>
          )}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#8E8E93] truncate">{t('eraseHint')}</span>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={state.heals.length === 0}
                onClick={() =>
                  updateState((prev) => ({ ...prev, heals: prev.heals.slice(0, -1) }), true)
                }
                className="px-3 py-1.5 rounded-full bg-[#1C1C1E] text-xs flex items-center gap-1 disabled:opacity-40"
              >
                <Undo2 className="w-3.5 h-3.5" /> ({state.heals.length})
              </button>
              <button
                type="button"
                disabled={state.heals.length === 0}
                onClick={() => updateState((prev) => ({ ...prev, heals: [] }), true)}
                className="px-3 py-1.5 rounded-full bg-[#1C1C1E] text-[#FF4F7B] text-xs disabled:opacity-40"
              >
                {t('clear')}
              </button>
            </div>
          </div>
          {renderBottomConfirmBar(retouchTabs)}
        </div>
      );
    }

    // LIQUIFY + MEITU TALL MODE
    const bs = state.bodyStretch;
    return (
      <div className="bg-black text-white select-none">
        {bs.enabled
          ? renderWhiteSlider(
              bs.amount,
              0,
              100,
              (v) =>
                updateState((prev) => ({
                  ...prev,
                  bodyStretch: { ...prev.bodyStretch, amount: v },
                })),
              () =>
                updateState(
                  (prev) => ({ ...prev, bodyStretch: { ...prev.bodyStretch, amount: 0 } }),
                  true
                ),
              <span className="text-[11px] text-[#FF4F7B] font-medium">
                {lang === 'th' ? 'สูงเพรียว' : 'Tall'}
              </span>
            )
          : renderWhiteSlider(
              Math.round(brushConfig.liquifyRadius * 100),
              4,
              22,
              (v) => setBrushConfig((p) => ({ ...p, liquifyRadius: v / 100 })),
              undefined,
              <span className="text-[11px] text-[#8E8E93]">{t('brushSize')}</span>
            )}

        <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              ['push', t('liquifyPush')],
              ['shrink', t('liquifyShrink')],
              ['bloat', t('liquifyBloat')],
            ] as Array<[LiquifyMode, string]>
          ).map(([mode, lbl]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                updateState((p) => ({ ...p, bodyStretch: { ...p.bodyStretch, enabled: false } }));
                setBrushConfig((p) => ({ ...p, liquifyMode: mode }));
              }}
              className={`px-3.5 py-2 rounded-full text-xs font-medium shrink-0 ${
                !bs.enabled && brushConfig.liquifyMode === mode
                  ? 'bg-white text-black'
                  : 'bg-[#1C1C1E] text-zinc-300'
              }`}
            >
              {lbl}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              updateState(
                (p) => ({
                  ...p,
                  bodyStretch: { ...p.bodyStretch, enabled: !p.bodyStretch.enabled },
                }),
                true
              )
            }
            className={`px-3.5 py-2 rounded-full text-xs font-medium shrink-0 ${
              bs.enabled ? 'meitu-gradient text-white' : 'bg-[#1C1C1E] text-zinc-300'
            }`}
          >
            {lang === 'th' ? 'เพิ่มความสูง' : 'Tall Mode'}
          </button>
          {state.liquify.length > 0 && (
            <button
              type="button"
              onClick={() =>
                updateState((prev) => ({ ...prev, liquify: prev.liquify.slice(0, -1) }), true)
              }
              className="px-3 py-2 rounded-full bg-[#1C1C1E] text-xs shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {renderBottomConfirmBar(retouchTabs)}
      </div>
    );
  }

  // =========================================================================
  // 4. CREATIVE TOOLS (Cutout, Bokeh, AI Style, Crop, Mosaic, Stickers, Text, Doodle, Frame)
  // =========================================================================
  const creativeTabs = [
    { id: 'cutout', label: lang === 'th' ? 'ไดคัท' : 'Cutout', active: activeTab === 'cutout', onClick: () => { setActiveTab('cutout'); onTriggerCutout(); } },
    { id: 'blur', label: lang === 'th' ? 'โบเก้' : 'Bokeh', active: activeTab === 'blur', onClick: () => setActiveTab('blur') },
    { id: 'ai', label: lang === 'th' ? 'AI สไตล์' : 'AI Art', active: activeTab === 'ai', onClick: () => setActiveTab('ai') },
    { id: 'crop', label: lang === 'th' ? 'ครอป' : 'Crop', active: activeTab === 'crop', onClick: () => setActiveTab('crop') },
    { id: 'mosaic', label: lang === 'th' ? 'โมเสก' : 'Mosaic', active: activeTab === 'mosaic', onClick: () => setActiveTab('mosaic') },
    { id: 'stickers', label: lang === 'th' ? 'สติกเกอร์' : 'Stickers', active: activeTab === 'stickers', onClick: () => setActiveTab('stickers') },
    { id: 'text', label: lang === 'th' ? 'ข้อความ' : 'Text', active: activeTab === 'text', onClick: () => setActiveTab('text') },
    { id: 'doodle', label: lang === 'th' ? 'ปากกา' : 'Brush', active: activeTab === 'doodle', onClick: () => setActiveTab('doodle') },
    { id: 'frame', label: lang === 'th' ? 'กรอบรูป' : 'Frames', active: activeTab === 'frame', onClick: () => setActiveTab('frame') },
  ];

  if (activeTab === 'cutout') {
    const co = state.cutout;
    return (
      <div className="bg-black text-white select-none">
        {co.enabled &&
          renderWhiteSlider(
            co.bgType === 'blur' ? co.blurStrength : co.feather,
            0,
            co.bgType === 'blur' ? 100 : 16,
            (v) =>
              updateState((prev) => ({
                ...prev,
                cutout:
                  co.bgType === 'blur'
                    ? { ...prev.cutout, blurStrength: v }
                    : { ...prev.cutout, feather: v },
              })),
            undefined,
            <span className="text-[11px] text-[#8E8E93]">
              {co.bgType === 'blur' ? t('blurStrength') : t('edgeFeather')}
            </span>
          )}
        <div className="px-4 py-2 space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                if (!co.enabled) onTriggerCutout();
                updateState((p) => ({ ...p, cutout: { ...p.cutout, enabled: !p.cutout.enabled } }), true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${
                co.enabled ? 'meitu-gradient text-white' : 'bg-[#1C1C1E] text-zinc-300'
              }`}
            >
              {isSegmenting ? t('segmenting') : co.enabled ? 'AI ไดคัท ✓' : t('enableCutout')}
            </button>
            {co.enabled &&
              (
                [
                  ['transparent', 'PNG'],
                  ['solid', lang === 'th' ? 'สีพื้น/ติดบัตร' : 'Solid'],
                  ['gradient', lang === 'th' ? 'ไล่สี' : 'Gradient'],
                  ['studio', lang === 'th' ? 'สตูดิโอ' : 'Studio'],
                  ['blur', lang === 'th' ? 'เบลอหลัง' : 'Blur BG'],
                ] as const
              ).map(([bt, lbl]) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() =>
                    updateState((p) => ({ ...p, cutout: { ...p.cutout, bgType: bt } }), true)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs shrink-0 ${
                    co.bgType === bt ? 'bg-white text-black font-medium' : 'bg-[#1C1C1E] text-[#8E8E93]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
          </div>

          {co.enabled && co.bgType === 'solid' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {ID_SOLID_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() =>
                    updateState((p) => ({ ...p, cutout: { ...p.cutout, bgColor: c.color } }), true)
                  }
                  className={`w-8 h-8 rounded-full shrink-0 border-2 ${
                    co.bgColor === c.color ? 'border-white scale-110' : 'border-white/20'
                  }`}
                  style={{ background: c.color }}
                />
              ))}
            </div>
          )}

          {co.enabled && co.bgType === 'gradient' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {CUTOUT_GRADIENTS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() =>
                    updateState(
                      (p) => ({ ...p, cutout: { ...p.cutout, bgGradient: g.colors } }),
                      true
                    )
                  }
                  className="w-10 h-8 rounded-xl shrink-0 border border-white/25"
                  style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}
                />
              ))}
            </div>
          )}

          {co.enabled && co.bgType === 'studio' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {CUTOUT_STUDIO_SCENES.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    updateState((p) => ({ ...p, cutout: { ...p.cutout, bgStudio: sc.id } }), true)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs shrink-0 ${
                    co.bgStudio === sc.id ? 'bg-white text-black font-medium' : 'bg-[#1C1C1E] text-zinc-300'
                  }`}
                >
                  {lang === 'th' ? sc.nameTh : sc.nameEn}
                </button>
              ))}
            </div>
          )}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'blur') {
    return (
      <div className="bg-black text-white select-none">
        {state.blur.mode !== 'none' &&
          renderWhiteSlider(
            state.blur.strength,
            0,
            100,
            (v) => updateState((p) => ({ ...p, blur: { ...p.blur, strength: v } })),
            () => updateState((p) => ({ ...p, blur: { ...p.blur, mode: 'none' } }), true)
          )}
        <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {(
            [
              ['none', t('blurNone')],
              ['portrait', t('blurPortrait')],
              ['radial', t('blurRadial')],
              ['linear', t('blurLinear')],
            ] as const
          ).map(([mode, lbl]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (mode === 'portrait') onTriggerCutout();
                updateState((p) => ({ ...p, blur: { ...p.blur, mode } }), true);
              }}
              className={`px-3.5 py-2 rounded-full text-xs font-medium shrink-0 ${
                state.blur.mode === mode ? 'bg-white text-black' : 'bg-[#1C1C1E] text-zinc-300'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'ai') {
    const styles: Array<{ id: AIStyleId; th: string; en: string; grad: string }> = [
      { id: 'none', th: 'ต้นฉบับ', en: 'Original', grad: 'linear-gradient(135deg,#2c2c2e,#18181a)' },
      { id: 'hdEnhance', th: 'คมชัด HD', en: 'HD Auto', grad: 'linear-gradient(135deg,#38bdf8,#818cf8)' },
      { id: 'anime', th: 'อนิเมะ 2D', en: 'Anime', grad: 'linear-gradient(135deg,#ff7eb3,#ffd1dc)' },
      { id: 'sketch', th: 'ดินสอสเก็ตช์', en: 'Sketch', grad: 'linear-gradient(135deg,#d6d3d1,#78716c)' },
      { id: 'oilPaint', th: 'สีน้ำมัน', en: 'Oil', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
      { id: 'popComic', th: 'ป๊อปอาร์ต', en: 'Comic', grad: 'linear-gradient(135deg,#f43f5e,#facc15)' },
      { id: 'retroVHS', th: 'VHS 90s', en: 'VHS', grad: 'linear-gradient(135deg,#6366f1,#ec4899)' },
      { id: 'pastelDream', th: 'ดรีมมี่', en: 'Dream', grad: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
      { id: 'cyberNeon', th: 'นีออน', en: 'Neon', grad: 'linear-gradient(135deg,#ff2e93,#00f5d4)' },
    ];
    return (
      <div className="bg-black text-white select-none">
        {state.aiStyle.style !== 'none' &&
          renderWhiteSlider(
            state.aiStyle.intensity,
            0,
            100,
            (v) => updateState((p) => ({ ...p, aiStyle: { ...p.aiStyle, intensity: v } })),
            () => updateState((p) => ({ ...p, aiStyle: { ...p.aiStyle, style: 'none' } }), true)
          )}
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          {styles.map((s) => {
            const active = state.aiStyle.style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  updateState((p) => ({ ...p, aiStyle: { ...p.aiStyle, style: s.id } }), true)
                }
                className="shrink-0 w-[62px] flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-[60px] h-[60px] rounded-[12px] flex items-center justify-center ${
                    active ? 'ring-[1.8px] ring-white' : ''
                  }`}
                  style={{ background: s.grad }}
                >
                  {active && <Check className="w-6 h-6 text-white drop-shadow" />}
                </div>
                <span className={`text-[11px] truncate w-full text-center ${active ? 'text-white font-medium' : 'text-[#8E8E93]'}`}>
                  {lang === 'th' ? s.th : s.en}
                </span>
              </button>
            );
          })}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'crop') {
    const c = state.crop;
    const setAspect = (aspect: AspectPreset) => {
      updateState((prev) => {
        if (aspect === 'free') {
          return { ...prev, crop: { ...prev.crop, aspect, cropBox: { x: 0, y: 0, w: 1, h: 1 } } };
        }
        const [aw, ah] = aspect.split(':').map(Number);
        const ratio = aw / ah;
        let w = 1, h = 1;
        if (ratio > 1) h = Math.min(1, 1 / ratio);
        else w = Math.min(1, ratio);
        return {
          ...prev,
          crop: { ...prev.crop, aspect, cropBox: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } },
        };
      }, true);
    };
    return (
      <div className="bg-black text-white select-none">
        {renderWhiteSlider(
          c.straighten,
          -45,
          45,
          (v) => updateState((p) => ({ ...p, crop: { ...p.crop, straighten: v } })),
          () => updateState((p) => ({ ...p, crop: { ...p.crop, straighten: 0 } }), true),
          <span className="text-[11px] text-[#8E8E93] tabular-nums">{c.straighten}°</span>
        )}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => updateState((p) => ({ ...p, crop: { ...p.crop, rotation: (p.crop.rotation + 270) % 360 } }), true)} className="p-2 rounded-full bg-[#1C1C1E] shrink-0"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" onClick={() => updateState((p) => ({ ...p, crop: { ...p.crop, rotation: (p.crop.rotation + 90) % 360 } }), true)} className="p-2 rounded-full bg-[#1C1C1E] shrink-0"><RotateCw className="w-4 h-4" /></button>
          <button type="button" onClick={() => updateState((p) => ({ ...p, crop: { ...p.crop, flipH: !p.crop.flipH } }), true)} className={`p-2 rounded-full shrink-0 ${c.flipH ? 'bg-white text-black' : 'bg-[#1C1C1E]'}`}><FlipHorizontal className="w-4 h-4" /></button>
          <button type="button" onClick={() => updateState((p) => ({ ...p, crop: { ...p.crop, flipV: !p.crop.flipV } }), true)} className={`p-2 rounded-full shrink-0 ${c.flipV ? 'bg-white text-black' : 'bg-[#1C1C1E]'}`}><FlipVertical className="w-4 h-4" /></button>
          {(['free', '1:1', '3:4', '4:3', '4:5', '9:16', '16:9'] as AspectPreset[]).map((asp) => (
            <button
              key={asp}
              type="button"
              onClick={() => setAspect(asp)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ${
                c.aspect === asp ? 'bg-white text-black' : 'bg-[#1C1C1E] text-zinc-300'
              }`}
            >
              {asp === 'free' ? (lang === 'th' ? 'อิสระ' : 'Free') : asp}
            </button>
          ))}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'mosaic') {
    const modes: Array<{ id: MosaicMode; th: string; en: string }> = [
      { id: 'pixel', th: 'พิกเซล', en: 'Pixel' },
      { id: 'blur', th: 'เบลอ', en: 'Blur' },
      { id: 'glass', th: 'กระจกฝ้า', en: 'Glass' },
      { id: 'oil', th: 'สีน้ำมัน', en: 'Oil' },
      { id: 'heart', th: 'หัวใจ', en: 'Heart' },
      { id: 'triangle', th: 'สามเหลี่ยม', en: 'Poly' },
    ];
    return (
      <div className="bg-black text-white select-none">
        {renderWhiteSlider(
          Math.round(brushConfig.mosaicSize * 1000),
          15,
          110,
          (v) => setBrushConfig((p) => ({ ...p, mosaicSize: v / 1000 })),
          undefined,
          <span className="text-[11px] text-[#8E8E93]">{t('brushSize')}</span>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setBrushConfig((p) => ({ ...p, mosaicMode: m.id }))}
              className={`px-3.5 py-2 rounded-full text-xs font-medium shrink-0 ${
                brushConfig.mosaicMode === m.id ? 'bg-white text-black' : 'bg-[#1C1C1E] text-zinc-300'
              }`}
            >
              {lang === 'th' ? m.th : m.en}
            </button>
          ))}
          {state.mosaics.length > 0 && (
            <button
              type="button"
              onClick={() =>
                updateState((p) => ({ ...p, mosaics: p.mosaics.slice(0, -1) }), true)
              }
              className="px-3 py-2 rounded-full bg-[#1C1C1E] text-xs shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'stickers') {
    const pack = STICKER_PACKS.find((p) => p.id === stickerPackId) ?? STICKER_PACKS[0];
    const sel = state.stickers.find((s) => s.id === selectedStickerId);
    return (
      <div className="bg-black text-white select-none">
        {sel &&
          renderWhiteSlider(
            Math.round(sel.scale * 100),
            35,
            260,
            (v) =>
              updateState((prev) => ({
                ...prev,
                stickers: prev.stickers.map((s) => (s.id === sel.id ? { ...s, scale: v / 100 } : s)),
              })),
            () => {
              updateState(
                (prev) => ({ ...prev, stickers: prev.stickers.filter((s) => s.id !== sel.id) }),
                true
              );
              setSelectedStickerId(null);
            },
            <button
              type="button"
              onClick={() => {
                const copy: StickerLayer = {
                  ...sel,
                  id: `stk_${Date.now()}`,
                  x: Math.min(0.9, sel.x + 0.06),
                  y: Math.min(0.9, sel.y + 0.06),
                };
                updateState((prev) => ({ ...prev, stickers: [...prev.stickers, copy] }), true);
                setSelectedStickerId(copy.id);
              }}
              className="p-1.5 rounded-full bg-[#1C1C1E]"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        <div className="flex items-center gap-4 px-4 py-1 overflow-x-auto no-scrollbar">
          {STICKER_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setStickerPackId(p.id)}
              className={`text-[12.5px] whitespace-nowrap ${
                stickerPackId === p.id ? 'text-white font-semibold' : 'text-[#8E8E93]'
              }`}
            >
              {lang === 'th' ? p.nameTh : p.nameEn}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          {pack.items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const id = `stk_${Date.now()}_${idx}`;
                const layer: StickerLayer = {
                  id,
                  kind: item.kind,
                  content: item.content,
                  color: item.color,
                  x: 0.5,
                  y: 0.5,
                  scale: 1,
                  rotation: 0,
                  opacity: 1,
                  flipX: false,
                };
                updateState((prev) => ({ ...prev, stickers: [...prev.stickers, layer] }), true);
                setSelectedStickerId(id);
              }}
              className="shrink-0 h-12 px-3 rounded-[12px] bg-[#18181A] flex items-center justify-center active:scale-95"
            >
              {item.kind === 'emoji' ? (
                <span className="text-2xl">{item.content}</span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: item.color }}
                >
                  {item.content}
                </span>
              )}
            </button>
          ))}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'text') {
    const sel = state.texts.find((tx) => tx.id === selectedTextId);
    const addText = () => {
      const id = `txt_${Date.now()}`;
      const newLayer: TextLayer = {
        id,
        text: lang === 'th' ? 'Meitu สวยละมุน' : 'Meitu Studio',
        fontFamily: "'Prompt', sans-serif",
        fontSize: 7,
        color: '#FFFFFF',
        strokeColor: '#FF4F7B',
        strokeWidth: 0,
        bgColor: 'rgba(255, 79, 123, 0.85)',
        shadow: true,
        preset: 'cutePill',
        x: 0.5,
        y: 0.78,
        scale: 1,
        rotation: 0,
        opacity: 1,
        align: 'center',
      };
      updateState((prev) => ({ ...prev, texts: [...prev.texts, newLayer] }), true);
      setSelectedTextId(id);
    };

    return (
      <div className="bg-black text-white select-none">
        {sel &&
          renderWhiteSlider(
            sel.fontSize,
            2,
            18,
            (v) =>
              updateState((prev) => ({
                ...prev,
                texts: prev.texts.map((tx) => (tx.id === sel.id ? { ...tx, fontSize: v } : tx)),
              })),
            () => {
              updateState(
                (prev) => ({ ...prev, texts: prev.texts.filter((tx) => tx.id !== sel.id) }),
                true
              );
              setSelectedTextId(null);
            }
          )}
        <div className="px-4 py-2 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addText}
              className="px-3 py-1.5 rounded-full meitu-gradient text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> {lang === 'th' ? 'เพิ่มข้อความ' : 'Add'}
            </button>
            {sel && (
              <input
                type="text"
                value={sel.text}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    texts: prev.texts.map((tx) =>
                      tx.id === sel.id ? { ...tx, text: e.target.value } : tx
                    ),
                  }))
                }
                onBlur={commitHistory}
                className="flex-1 px-3 py-1 rounded-full bg-[#1C1C1E] text-xs text-white outline-none"
              />
            )}
          </div>
          {sel && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {TEXT_STYLE_PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() =>
                    updateState(
                      (prev) => ({
                        ...prev,
                        texts: prev.texts.map((tx) =>
                          tx.id === sel.id
                            ? {
                                ...tx,
                                preset: pr.id,
                                color: pr.color,
                                strokeColor: pr.strokeColor,
                                strokeWidth: pr.strokeWidth,
                                bgColor: pr.bgColor,
                                shadow: pr.shadow,
                                fontFamily: pr.fontFamily,
                              }
                            : tx
                        ),
                      }),
                      true
                    )
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] shrink-0 ${
                    sel.preset === pr.id ? 'bg-white text-black font-medium' : 'bg-[#1C1C1E] text-zinc-300'
                  }`}
                >
                  {lang === 'th' ? pr.nameTh : pr.nameEn}
                </button>
              ))}
              <select
                value={sel.fontFamily}
                onChange={(e) =>
                  updateState(
                    (prev) => ({
                      ...prev,
                      texts: prev.texts.map((tx) =>
                        tx.id === sel.id ? { ...tx, fontFamily: e.target.value } : tx
                      ),
                    }),
                    true
                  )
                }
                className="px-2 py-1 rounded-full bg-[#1C1C1E] text-[11px] text-white"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  if (activeTab === 'doodle') {
    const brushes: Array<{ id: DoodleBrushType; Icon: IconComp; th: string; en: string }> = [
      { id: 'sparkle', Icon: Sparkles, th: 'ประกายวิ้ง', en: 'Sparkle' },
      { id: 'heart', Icon: Heart, th: 'หัวใจ', en: 'Heart' },
      { id: 'sakura', Icon: Wand2, th: 'ซากุระ', en: 'Sakura' },
      { id: 'star', Icon: Star, th: 'ดาว', en: 'Star' },
      { id: 'bubble', Icon: Circle, th: 'ฟองสบู่', en: 'Bubble' },
      { id: 'pearl', Icon: Circle, th: 'ไข่มุก', en: 'Pearl' },
      { id: 'neon', Icon: Zap, th: 'นีออน', en: 'Neon' },
      { id: 'rainbow', Icon: Rainbow, th: 'สายรุ้ง', en: 'Rainbow' },
      { id: 'pen', Icon: Pen, th: 'ปากกา', en: 'Pen' },
      { id: 'highlighter', Icon: Highlighter, th: 'ไฮไลท์', en: 'Marker' },
    ];
    return (
      <div className="bg-black text-white select-none">
        {renderWhiteSlider(
          Math.round(brushConfig.doodleSize * 1000),
          5,
          55,
          (v) => setBrushConfig((p) => ({ ...p, doodleSize: v / 1000 })),
          state.doodles.length > 0
            ? () => updateState((p) => ({ ...p, doodles: p.doodles.slice(0, -1) }), true)
            : undefined,
          <input
            type="color"
            value={brushConfig.doodleColor}
            onChange={(e) => setBrushConfig((p) => ({ ...p, doodleColor: e.target.value }))}
            className="w-6 h-6 rounded-full cursor-pointer border border-white/30 bg-transparent"
          />
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          {brushes.map((b) =>
            renderLineIconTile(
              b.id,
              b.Icon,
              lang === 'th' ? b.th : b.en,
              brushConfig.doodleType === b.id,
              false,
              () => setBrushConfig((p) => ({ ...p, doodleType: b.id }))
            )
          )}
          {state.doodles.length > 0 && (
            <button
              type="button"
              onClick={() => updateState((p) => ({ ...p, doodles: [] }), true)}
              className="shrink-0 w-[60px] flex flex-col items-center gap-1.5 text-[#FF4F7B]"
            >
              <div className="w-11 h-11 rounded-full bg-[#18181A] flex items-center justify-center">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px]">{t('clear')}</span>
            </button>
          )}
        </div>
        {renderBottomConfirmBar(creativeTabs)}
      </div>
    );
  }

  const frames: Array<{ id: FrameStyleId; th: string; en: string }> = [
    { id: 'none', th: 'ไม่มีกรอบ', en: 'None' },
    { id: 'white', th: 'ขาวคลีน', en: 'White' },
    { id: 'polaroid', th: 'โพลารอยด์', en: 'Polaroid' },
    { id: 'film', th: 'ฟิล์ม 35mm', en: '35mm Film' },
    { id: 'magazine', th: 'นิตยสาร', en: 'Vogue' },
    { id: 'pastelPink', th: 'ชมพูพาสเทล', en: 'Pastel' },
    { id: 'museum', th: 'แกลเลอรี', en: 'Gallery' },
    { id: 'cinema', th: 'ขอบหนัง', en: 'Cinema' },
    { id: 'y2k', th: 'Y2K', en: 'Y2K' },
  ];
  return (
    <div className="bg-black text-white select-none">
      {state.frame.style !== 'none' &&
        renderWhiteSlider(
          state.frame.thickness,
          8,
          90,
          (v) => updateState((p) => ({ ...p, frame: { ...p.frame, thickness: v } })),
          () => updateState((p) => ({ ...p, frame: { ...p.frame, style: 'none' } }), true)
        )}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {frames.map((fr) => (
          <button
            key={fr.id}
            type="button"
            onClick={() =>
              updateState((p) => ({ ...p, frame: { ...p.frame, style: fr.id } }), true)
            }
            className={`px-3.5 py-2 rounded-full text-xs font-medium shrink-0 ${
              state.frame.style === fr.id ? 'bg-white text-black' : 'bg-[#1C1C1E] text-zinc-300'
            }`}
          >
            {lang === 'th' ? fr.th : fr.en}
          </button>
        ))}
      </div>
      {renderBottomConfirmBar(creativeTabs)}
    </div>
  );
};
