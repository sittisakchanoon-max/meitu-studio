import React, { useState } from 'react';
import {
  Copy,
  FlipHorizontal,
  FlipVertical,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
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
  MAKEUP_LOOK_PRESETS,
  STICKER_PACKS,
  TEXT_STYLE_PRESETS,
} from '../data/presets';
import { useT } from '../i18n/translations';
import {
  AIStyleId,
  AspectPreset,
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
  StickerLayer,
  TextLayer,
} from '../types/editor';
import { CurveEditor } from './CurveEditor';
import { SliderControl } from './SliderControl';

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

interface ToolPanelsProps {
  activeTab: EditorTab;
  state: EditorState;
  updateState: (updater: (prev: EditorState) => EditorState, commit?: boolean) => void;
  commitHistory: () => void;
  lang: Language;
  dark: boolean;
  hasFace: boolean;
  isSegmenting: boolean;
  onTriggerCutout: () => void;
  brushConfig: ActiveBrushConfig;
  setBrushConfig: React.Dispatch<React.SetStateAction<ActiveBrushConfig>>;
  selectedStickerId: string | null;
  setSelectedStickerId: (id: string | null) => void;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
}

const HSL_SWATCHES: Array<{ key: HSLChannelKey; color: string; labelTh: string; labelEn: string }> = [
  { key: 'red', color: '#ef4444', labelTh: 'แดง', labelEn: 'Red' },
  { key: 'orange', color: '#f97316', labelTh: 'ส้ม', labelEn: 'Orange' },
  { key: 'yellow', color: '#eab308', labelTh: 'เหลือง', labelEn: 'Yellow' },
  { key: 'green', color: '#22c55e', labelTh: 'เขียว', labelEn: 'Green' },
  { key: 'cyan', color: '#06b6d4', labelTh: 'ฟ้าอ่อน', labelEn: 'Cyan' },
  { key: 'blue', color: '#3b82f6', labelTh: 'น้ำเงิน', labelEn: 'Blue' },
  { key: 'purple', color: '#a855f7', labelTh: 'ม่วง', labelEn: 'Purple' },
  { key: 'magenta', color: '#ec4899', labelTh: 'ชมพู', labelEn: 'Magenta' },
];

const DOODLE_COLORS = [
  '#FF4F7B',
  '#FFFFFF',
  '#18181B',
  '#FFD166',
  '#38BDF8',
  '#A855F7',
  '#34D399',
  '#FB7185',
  '#F97316',
];

export const ToolPanels: React.FC<ToolPanelsProps> = ({
  activeTab,
  state,
  updateState,
  commitHistory,
  lang,
  dark,
  hasFace,
  isSegmenting,
  onTriggerCutout,
  brushConfig,
  setBrushConfig,
  selectedStickerId,
  setSelectedStickerId,
  selectedTextId,
  setSelectedTextId,
}) => {
  const t = useT(lang);
  const [filterCat, setFilterCat] = useState<FilterCategory>('all');
  const [makeupPart, setMakeupPart] = useState<
    'looks' | 'lips' | 'blush' | 'eyes' | 'brows' | 'contacts' | 'contour'
  >('looks');
  const [hslChannel, setHslChannel] = useState<HSLChannelKey>('red');
  const [stickerPackId, setStickerPackId] = useState(STICKER_PACKS[0].id);

  const cardBg = dark
    ? 'bg-zinc-800/70 border-zinc-700/80'
    : 'bg-white border-pink-100';
  const pillIdle = dark
    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
    : 'bg-pink-50/70 text-zinc-700 hover:bg-pink-100/80';
  const pillActive = 'meitu-gradient text-white shadow-sm';

  // 1. PORTRAIT BEAUTY
  if (activeTab === 'beauty') {
    const b = state.beauty;
    const setB = (patch: Partial<typeof b>, commit = false) =>
      updateState((prev) => ({ ...prev, beauty: { ...prev.beauty, ...patch } }), commit);

    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-pink-500">
            <Sparkles className="w-3.5 h-3.5" />
            {t('autoBeauty')}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
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
                className={`px-2 py-2 rounded-xl text-[11px] font-semibold border transition-all flex flex-col items-center gap-1 ${
                  b.autoPreset === p.id
                    ? 'border-pink-500 bg-pink-500/15 text-pink-500 shadow-sm'
                    : `${cardBg} ${dark ? 'text-zinc-300' : 'text-zinc-700'}`
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full border border-white/60 shadow-inner"
                  style={{ background: p.badgeColor }}
                />
                <span className="truncate w-full text-center">
                  {lang === 'th' ? p.nameTh : p.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <SliderControl label={t('smooth')} value={b.smooth} onChange={(v) => setB({ smooth: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('whiten')} value={b.whiten} onChange={(v) => setB({ whiten: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('rosy')} value={b.rosy} onChange={(v) => setB({ rosy: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('evenTone')} value={b.evenTone} onChange={(v) => setB({ evenTone: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('hdrGlow')} value={b.hdrGlow} onChange={(v) => setB({ hdrGlow: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('matte')} value={b.matte} onChange={(v) => setB({ matte: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('darkCircles')} value={b.darkCircles} onChange={(v) => setB({ darkCircles: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('nasolabial')} value={b.nasolabial} onChange={(v) => setB({ nasolabial: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('brightenEyes')} value={b.brightenEyes} onChange={(v) => setB({ brightenEyes: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('teethWhiten')} value={b.teethWhiten} onChange={(v) => setB({ teethWhiten: v })} onCommit={commitHistory} dark={dark} />
        </div>
      </div>
    );
  }

  // 2. FACE RESHAPE (478-point AI mesh warp)
  if (activeTab === 'reshape') {
    const r = state.reshape;
    const setR = (patch: Partial<typeof r>) =>
      updateState((prev) => ({ ...prev, reshape: { ...prev.reshape, ...patch } }));

    return (
      <div className="space-y-3">
        {!hasFace && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs">
            {t('noFaceDetected')}
          </div>
        )}
        <div className="space-y-3">
          <SliderControl label={t('slimFace')} value={r.slimFace} min={-50} max={100} onChange={(v) => setR({ slimFace: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('vLine')} value={r.vLine} min={0} max={100} onChange={(v) => setR({ vLine: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('jawline')} value={r.jawline} min={-50} max={100} onChange={(v) => setR({ jawline: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('cheekbones')} value={r.cheekbones} min={-50} max={100} onChange={(v) => setR({ cheekbones: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('forehead')} value={r.forehead} min={-60} max={60} onChange={(v) => setR({ forehead: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('bigEyes')} value={r.bigEyes} min={-40} max={100} onChange={(v) => setR({ bigEyes: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('eyeTilt')} value={r.eyeTilt} min={-100} max={100} onChange={(v) => setR({ eyeTilt: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('eyeDistance')} value={r.eyeDistance} min={-100} max={100} onChange={(v) => setR({ eyeDistance: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('slimNose')} value={r.slimNose} min={-50} max={100} onChange={(v) => setR({ slimNose: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('noseBridge')} value={r.noseBridge} min={-100} max={100} onChange={(v) => setR({ noseBridge: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('noseTip')} value={r.noseTip} min={-100} max={100} onChange={(v) => setR({ noseTip: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('mouthSize')} value={r.mouthSize} min={-60} max={80} onChange={(v) => setR({ mouthSize: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('smileLift')} value={r.smileLift} min={0} max={100} onChange={(v) => setR({ smileLift: v })} onCommit={commitHistory} dark={dark} />
        </div>
      </div>
    );
  }

  // 3. MAKEUP STUDIO
  if (activeTab === 'makeup') {
    const m = state.makeup;
    const setM = (patch: Partial<typeof m>, commit = false) =>
      updateState((prev) => ({ ...prev, makeup: { ...prev.makeup, ...patch } }), commit);

    const subTabs: Array<{ id: typeof makeupPart; label: string }> = [
      { id: 'looks', label: t('makeupLooks') },
      { id: 'lips', label: t('lipstick') },
      { id: 'blush', label: t('blush') },
      { id: 'eyes', label: t('eyeshadow') },
      { id: 'brows', label: t('eyebrows') },
      { id: 'contacts', label: t('contacts') },
      { id: 'contour', label: t('contour') },
    ];

    return (
      <div className="space-y-3">
        {!hasFace && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs">
            {t('noFaceDetected')}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {subTabs.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setMakeupPart(st.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                makeupPart === st.id ? pillActive : pillIdle
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {makeupPart === 'looks' && (
          <div className="grid grid-cols-2 gap-2">
            {MAKEUP_LOOK_PRESETS.map((look) => (
              <button
                key={look.id}
                type="button"
                onClick={() => setM({ ...look.settings, preset: look.id }, true)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  m.preset === look.id
                    ? 'border-pink-500 bg-pink-500/15 ring-1 ring-pink-500/30'
                    : cardBg
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full shrink-0 shadow-sm border border-white/50"
                  style={{
                    background: `linear-gradient(135deg, ${look.swatch[0]}, ${look.swatch[1]})`,
                  }}
                />
                <span className="text-xs font-semibold truncate">
                  {lang === 'th' ? look.nameTh : look.nameEn}
                </span>
              </button>
            ))}
          </div>
        )}

        {makeupPart === 'lips' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {LIPSTICK_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  title={s.name}
                  onClick={() =>
                    setM({
                      lipstickColor: s.color,
                      lipstickIntensity: m.lipstickIntensity === 0 ? 60 : m.lipstickIntensity,
                    }, true)
                  }
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    m.lipstickColor === s.color ? 'border-pink-500 scale-110 ring-2 ring-pink-300' : 'border-white/70'
                  }`}
                  style={{ background: s.color }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['matte', 'velvet', 'gloss'] as LipFinish[]).map((fin) => (
                <button
                  key={fin}
                  type="button"
                  onClick={() => setM({ lipstickFinish: fin }, true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    m.lipstickFinish === fin ? pillActive : pillIdle
                  }`}
                >
                  {fin === 'matte' ? t('finishMatte') : fin === 'velvet' ? t('finishVelvet') : t('finishGloss')}
                </button>
              ))}
            </div>
            <SliderControl
              label={t('lipstick')}
              value={m.lipstickIntensity}
              onChange={(v) => setM({ lipstickIntensity: v })}
              onCommit={commitHistory}
              dark={dark}
            />
          </div>
        )}

        {makeupPart === 'blush' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {BLUSH_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  title={s.name}
                  onClick={() =>
                    setM({
                      blushColor: s.color,
                      blushIntensity: m.blushIntensity === 0 ? 48 : m.blushIntensity,
                    }, true)
                  }
                  className={`w-7 h-7 rounded-full border-2 ${
                    m.blushColor === s.color ? 'border-pink-500 scale-110' : 'border-white/70'
                  }`}
                  style={{ background: s.color }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['apple', t('blushApple')],
                  ['drunk', t('blushDrunk')],
                  ['sunkissed', t('blushSunkissed')],
                  ['undereye', t('blushUndereye')],
                ] as Array<[BlushStyle, string]>
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setM({ blushStyle: st }, true)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold ${
                    m.blushStyle === st ? pillActive : pillIdle
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <SliderControl label={t('blush')} value={m.blushIntensity} onChange={(v) => setM({ blushIntensity: v })} onCommit={commitHistory} dark={dark} />
          </div>
        )}

        {makeupPart === 'eyes' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {EYESHADOW_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  title={s.name}
                  onClick={() =>
                    setM({
                      eyeshadowColor: s.color,
                      eyeshadowIntensity: m.eyeshadowIntensity === 0 ? 45 : m.eyeshadowIntensity,
                    }, true)
                  }
                  className={`w-7 h-7 rounded-full border-2 ${
                    m.eyeshadowColor === s.color ? 'border-pink-500 scale-110' : 'border-white/70'
                  }`}
                  style={{ background: s.color }}
                />
              ))}
            </div>
            <SliderControl label={t('eyeshadow')} value={m.eyeshadowIntensity} onChange={(v) => setM({ eyeshadowIntensity: v })} onCommit={commitHistory} dark={dark} />
            <div className="flex gap-1.5 pt-1">
              {(
                [
                  ['natural', t('linerNatural')],
                  ['cat', t('linerCat')],
                  ['puppy', t('linerPuppy')],
                ] as Array<[EyelinerStyle, string]>
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setM({ eyelinerStyle: st }, true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    m.eyelinerStyle === st ? pillActive : pillIdle
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <SliderControl label={t('eyeliner')} value={m.eyelinerIntensity} onChange={(v) => setM({ eyelinerIntensity: v })} onCommit={commitHistory} dark={dark} />
          </div>
        )}

        {makeupPart === 'brows' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {EYEBROW_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  title={s.name}
                  onClick={() =>
                    setM({
                      eyebrowColor: s.color,
                      eyebrowIntensity: m.eyebrowIntensity === 0 ? 42 : m.eyebrowIntensity,
                    }, true)
                  }
                  className={`w-7 h-7 rounded-full border-2 ${
                    m.eyebrowColor === s.color ? 'border-pink-500 scale-110' : 'border-white/70'
                  }`}
                  style={{ background: s.color }}
                />
              ))}
            </div>
            <SliderControl label={t('eyebrows')} value={m.eyebrowIntensity} onChange={(v) => setM({ eyebrowIntensity: v })} onCommit={commitHistory} dark={dark} />
          </div>
        )}

        {makeupPart === 'contacts' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {CONTACTS_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  title={s.name}
                  onClick={() =>
                    setM({
                      contactsColor: s.color,
                      contactsIntensity: m.contactsIntensity === 0 ? 50 : m.contactsIntensity,
                    }, true)
                  }
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    m.contactsColor === s.color ? 'border-pink-500 scale-110' : 'border-white/70'
                  }`}
                  style={{ background: `radial-gradient(circle, #18181b 22%, ${s.color} 35%, #111 95%)` }}
                />
              ))}
            </div>
            <SliderControl label={t('contacts')} value={m.contactsIntensity} onChange={(v) => setM({ contactsIntensity: v })} onCommit={commitHistory} dark={dark} />
          </div>
        )}

        {makeupPart === 'contour' && (
          <div className="space-y-3">
            <SliderControl label={t('contour')} value={m.contourIntensity} onChange={(v) => setM({ contourIntensity: v })} onCommit={commitHistory} dark={dark} />
            <SliderControl label={t('highlight')} value={m.highlightIntensity} onChange={(v) => setM({ highlightIntensity: v })} onCommit={commitHistory} dark={dark} />
          </div>
        )}
      </div>
    );
  }

  // 4. 42+ MEITU FILTERS
  if (activeTab === 'filters') {
    const filtered =
      filterCat === 'all'
        ? MEITU_FILTERS
        : MEITU_FILTERS.filter((f) => f.id === 'original' || f.category === filterCat);

    return (
      <div className="space-y-3">
        {state.filter.id !== 'original' && (
          <SliderControl
            label={t('filterIntensity')}
            value={state.filter.intensity}
            onChange={(v) =>
              updateState((prev) => ({ ...prev, filter: { ...prev.filter, intensity: v } }))
            }
            onCommit={commitHistory}
            dark={dark}
          />
        )}

        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                filterCat === cat ? pillActive : pillIdle
              }`}
            >
              {t(`cat_${cat}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {filtered.map((f) => {
            const active = state.filter.id === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  updateState(
                    (prev) => ({
                      ...prev,
                      filter: {
                        id: f.id,
                        intensity: prev.filter.id === 'original' ? 80 : prev.filter.intensity,
                      },
                    }),
                    true
                  )
                }
                className={`rounded-xl overflow-hidden border transition-all text-center ${
                  active
                    ? 'border-pink-500 ring-2 ring-pink-500/35 scale-[1.02]'
                    : dark
                      ? 'border-zinc-700 hover:border-zinc-500'
                      : 'border-pink-100 hover:border-pink-300'
                }`}
              >
                <div
                  className="h-11 w-full relative"
                  style={{
                    background: `linear-gradient(135deg, ${f.swatch[0]}, ${f.swatch[1]})`,
                  }}
                >
                  {active && (
                    <span className="absolute top-1 right-1 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div
                  className={`py-1.5 px-1 text-[11px] font-medium truncate ${
                    dark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-700'
                  }`}
                >
                  {lang === 'th' ? f.nameTh : f.nameEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. ADJUST / TONE
  if (activeTab === 'adjust') {
    const a = state.adjust;
    const setA = (patch: Partial<typeof a>) =>
      updateState((prev) => ({ ...prev, adjust: { ...prev.adjust, ...patch } }));

    return (
      <div className="space-y-3">
        <SliderControl label={t('exposure')} value={a.exposure} min={-100} max={100} onChange={(v) => setA({ exposure: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('brightness')} value={a.brightness} min={-100} max={100} onChange={(v) => setA({ brightness: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('contrast')} value={a.contrast} min={-100} max={100} onChange={(v) => setA({ contrast: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('highlights')} value={a.highlights} min={-100} max={100} onChange={(v) => setA({ highlights: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('shadows')} value={a.shadows} min={-100} max={100} onChange={(v) => setA({ shadows: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('whites')} value={a.whites} min={-100} max={100} onChange={(v) => setA({ whites: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('blacks')} value={a.blacks} min={-100} max={100} onChange={(v) => setA({ blacks: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('saturation')} value={a.saturation} min={-100} max={100} onChange={(v) => setA({ saturation: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('vibrance')} value={a.vibrance} min={-100} max={100} onChange={(v) => setA({ vibrance: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('temperature')} value={a.temperature} min={-100} max={100} onChange={(v) => setA({ temperature: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('tint')} value={a.tint} min={-100} max={100} onChange={(v) => setA({ tint: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('sharpness')} value={a.sharpness} min={0} max={100} onChange={(v) => setA({ sharpness: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('clarity')} value={a.clarity} min={-100} max={100} onChange={(v) => setA({ clarity: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('vignette')} value={a.vignette} min={-100} max={100} onChange={(v) => setA({ vignette: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('grain')} value={a.grain} min={0} max={100} onChange={(v) => setA({ grain: v })} onCommit={commitHistory} dark={dark} />
        <SliderControl label={t('fade')} value={a.fade} min={0} max={100} onChange={(v) => setA({ fade: v })} onCommit={commitHistory} dark={dark} />
      </div>
    );
  }

  // 6. 8-CHANNEL HSL MIXER
  if (activeTab === 'hsl') {
    const ch = state.hsl[hslChannel];
    const setCh = (patch: Partial<typeof ch>) =>
      updateState((prev) => ({
        ...prev,
        hsl: { ...prev.hsl, [hslChannel]: { ...prev.hsl[hslChannel], ...patch } },
      }));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {HSL_SWATCHES.map((sw) => {
            const active = hslChannel === sw.key;
            const c = state.hsl[sw.key];
            const touched = c.h !== 0 || c.s !== 0 || c.l !== 0;
            return (
              <button
                key={sw.key}
                type="button"
                onClick={() => setHslChannel(sw.key)}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  active ? 'border-pink-500 bg-pink-500/15' : cardBg
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full shadow-sm relative"
                  style={{ background: sw.color }}
                >
                  {touched && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white ring-2 ring-pink-500" />
                  )}
                </span>
                <span className="text-[11px] font-medium">
                  {lang === 'th' ? sw.labelTh : sw.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <SliderControl label={t('hue')} value={ch.h} min={-100} max={100} onChange={(v) => setCh({ h: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('saturation')} value={ch.s} min={-100} max={100} onChange={(v) => setCh({ s: v })} onCommit={commitHistory} dark={dark} />
          <SliderControl label={t('lightness')} value={ch.l} min={-100} max={100} onChange={(v) => setCh({ l: v })} onCommit={commitHistory} dark={dark} />
        </div>
      </div>
    );
  }

  // 7. TONE CURVES
  if (activeTab === 'curves') {
    return (
      <CurveEditor
        curves={state.curves}
        onChange={(next) => updateState((prev) => ({ ...prev, curves: next }))}
        onCommit={commitHistory}
        hint={t('curveHint')}
        resetLabel={t('reset')}
        dark={dark}
      />
    );
  }

  // 8. CROP & ROTATE
  if (activeTab === 'crop') {
    const c = state.crop;
    const setAspect = (aspect: AspectPreset) => {
      updateState((prev) => {
        if (aspect === 'free') {
          return { ...prev, crop: { ...prev.crop, aspect, cropBox: { x: 0, y: 0, w: 1, h: 1 } } };
        }
        const [aw, ah] = aspect.split(':').map(Number);
        const ratio = aw / ah;
        let w = 1,
          h = 1;
        if (ratio > 1) {
          h = Math.min(1, 1 / ratio);
        } else {
          w = Math.min(1, ratio);
        }
        return {
          ...prev,
          crop: {
            ...prev.crop,
            aspect,
            cropBox: { x: (1 - w) / 2, y: (1 - h) / 2, w, h },
          },
        };
      }, true);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              updateState(
                (prev) => ({ ...prev, crop: { ...prev.crop, rotation: (prev.crop.rotation + 270) % 360 } }),
                true
              )
            }
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${cardBg}`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-pink-500" /> {t('rotateLeft')}
          </button>
          <button
            type="button"
            onClick={() =>
              updateState(
                (prev) => ({ ...prev, crop: { ...prev.crop, rotation: (prev.crop.rotation + 90) % 360 } }),
                true
              )
            }
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${cardBg}`}
          >
            <RotateCw className="w-3.5 h-3.5 text-pink-500" /> {t('rotateRight')}
          </button>
          <button
            type="button"
            onClick={() =>
              updateState(
                (prev) => ({ ...prev, crop: { ...prev.crop, flipH: !prev.crop.flipH } }),
                true
              )
            }
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${
              c.flipH ? 'border-pink-500 bg-pink-500/15 text-pink-500' : cardBg
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" /> {t('flipH')}
          </button>
          <button
            type="button"
            onClick={() =>
              updateState(
                (prev) => ({ ...prev, crop: { ...prev.crop, flipV: !prev.crop.flipV } }),
                true
              )
            }
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${
              c.flipV ? 'border-pink-500 bg-pink-500/15 text-pink-500' : cardBg
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" /> {t('flipV')}
          </button>
        </div>

        <SliderControl
          label={t('straighten')}
          value={c.straighten}
          min={-45}
          max={45}
          unit="°"
          onChange={(v) =>
            updateState((prev) => ({ ...prev, crop: { ...prev.crop, straighten: v } }))
          }
          onCommit={commitHistory}
          dark={dark}
        />

        <div>
          <div className="text-xs font-semibold mb-2">{t('aspectRatio')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['free', '1:1', '3:4', '4:3', '4:5', '9:16', '16:9', '2:3'] as AspectPreset[]).map(
              (asp) => (
                <button
                  key={asp}
                  type="button"
                  onClick={() => setAspect(asp)}
                  className={`py-1.5 rounded-lg text-xs font-semibold ${
                    c.aspect === asp ? pillActive : pillIdle
                  }`}
                >
                  {asp === 'free' ? (lang === 'th' ? 'อิสระ' : 'Free') : asp}
                </button>
              )
            )}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <SliderControl
            label={lang === 'th' ? 'ซูมครอปภาพ' : 'Crop Zoom'}
            value={Math.round((1 / Math.max(0.25, Math.max(c.cropBox.w, c.cropBox.h))) * 100)}
            min={100}
            max={300}
            defaultValue={100}
            unit="%"
            onChange={(v) => {
              const scale = 100 / v;
              updateState((prev) => {
                const prevBox = prev.crop.cropBox;
                const ratio = prevBox.w / Math.max(0.05, prevBox.h);
                let nw = scale;
                let nh = scale;
                if (ratio > 1) nh = nw / ratio;
                else nw = nh * ratio;
                nw = Math.max(0.2, Math.min(1, nw));
                nh = Math.max(0.2, Math.min(1, nh));
                const cx = prevBox.x + prevBox.w / 2;
                const cy = prevBox.y + prevBox.h / 2;
                return {
                  ...prev,
                  crop: {
                    ...prev.crop,
                    cropBox: {
                      x: Math.max(0, Math.min(1 - nw, cx - nw / 2)),
                      y: Math.max(0, Math.min(1 - nh, cy - nh / 2)),
                      w: nw,
                      h: nh,
                    },
                  },
                };
              });
            }}
            onCommit={commitHistory}
            dark={dark}
          />
          <button
            type="button"
            onClick={() =>
              updateState(
                (prev) => ({
                  ...prev,
                  crop: {
                    aspect: 'free',
                    rotation: 0,
                    straighten: 0,
                    flipH: false,
                    flipV: false,
                    cropBox: { x: 0, y: 0, w: 1, h: 1 },
                  },
                }),
                true
              )
            }
            className="w-full py-2 rounded-xl text-xs font-semibold text-pink-500 border border-pink-500/30 bg-pink-500/10"
          >
            {t('reset')}
          </button>
        </div>
      </div>
    );
  }

  // 9. DEPTH BLUR / BOKEH
  if (activeTab === 'blur') {
    const bl = state.blur;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
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
                updateState((prev) => ({ ...prev, blur: { ...prev.blur, mode } }), true);
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                bl.mode === mode ? 'border-pink-500 meitu-gradient text-white shadow-sm' : cardBg
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {bl.mode !== 'none' && (
          <div className="space-y-3">
            <SliderControl
              label={t('blurStrength')}
              value={bl.strength}
              onChange={(v) =>
                updateState((prev) => ({ ...prev, blur: { ...prev.blur, strength: v } }))
              }
              onCommit={commitHistory}
              dark={dark}
            />
            {bl.mode !== 'portrait' && (
              <>
                <SliderControl
                  label={t('blurFocusSize')}
                  value={Math.round(bl.radius * 100)}
                  min={8}
                  max={60}
                  defaultValue={28}
                  onChange={(v) =>
                    updateState((prev) => ({ ...prev, blur: { ...prev.blur, radius: v / 100 } }))
                  }
                  onCommit={commitHistory}
                  dark={dark}
                />
                {bl.mode === 'linear' && (
                  <SliderControl
                    label={t('straighten')}
                    value={bl.angle}
                    min={-90}
                    max={90}
                    unit="°"
                    onChange={(v) =>
                      updateState((prev) => ({ ...prev, blur: { ...prev.blur, angle: v } }))
                    }
                    onCommit={commitHistory}
                    dark={dark}
                  />
                )}
                <p className="text-[11px] text-zinc-400">{t('blurHint')}</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 10. AI ART STYLES & HD ENHANCE
  if (activeTab === 'ai') {
    const styles: Array<{ id: AIStyleId; nameTh: string; nameEn: string; grad: string }> = [
      { id: 'none', nameTh: 'ปกติ', nameEn: 'Normal', grad: 'linear-gradient(135deg,#e4e4e7,#d4d4d8)' },
      { id: 'hdEnhance', nameTh: 'คมชัด HD อัตโนมัติ', nameEn: 'Auto HD Clarity', grad: 'linear-gradient(135deg,#38bdf8,#818cf8)' },
      { id: 'anime', nameTh: 'อนิเมะ 2D', nameEn: 'Anime Cel', grad: 'linear-gradient(135deg,#ff7eb3,#ffd1dc)' },
      { id: 'sketch', nameTh: 'ภาพวาดดินสอ', nameEn: 'Pencil Sketch', grad: 'linear-gradient(135deg,#d6d3d1,#78716c)' },
      { id: 'oilPaint', nameTh: 'สีน้ำมันคลาสสิก', nameEn: 'Oil Painting', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
      { id: 'popComic', nameTh: 'การ์ตูนป๊อปอาร์ต', nameEn: 'Pop Comic', grad: 'linear-gradient(135deg,#f43f5e,#facc15)' },
      { id: 'retroVHS', nameTh: 'วิดีโอ VHS 90s', nameEn: 'Retro VHS', grad: 'linear-gradient(135deg,#6366f1,#ec4899)' },
      { id: 'pastelDream', nameTh: 'ดรีมมี่ฟุ้งฝัน', nameEn: 'Pastel Dream', grad: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
      { id: 'cyberNeon', nameTh: 'ไซเบอร์นีออน', nameEn: 'Cyber Neon', grad: 'linear-gradient(135deg,#ff2e93,#00f5d4)' },
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {styles.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                updateState((prev) => ({ ...prev, aiStyle: { ...prev.aiStyle, style: s.id } }), true)
              }
              className={`rounded-xl overflow-hidden border transition-all ${
                state.aiStyle.style === s.id
                  ? 'border-pink-500 ring-2 ring-pink-500/35'
                  : dark
                    ? 'border-zinc-700'
                    : 'border-pink-100'
              }`}
            >
              <div className="h-10" style={{ background: s.grad }} />
              <div className={`py-1.5 px-1 text-[11px] font-semibold truncate ${dark ? 'bg-zinc-900' : 'bg-white'}`}>
                {lang === 'th' ? s.nameTh : s.nameEn}
              </div>
            </button>
          ))}
        </div>

        {state.aiStyle.style !== 'none' && (
          <SliderControl
            label={t('aiIntensity')}
            value={state.aiStyle.intensity}
            onChange={(v) =>
              updateState((prev) => ({ ...prev, aiStyle: { ...prev.aiStyle, intensity: v } }))
            }
            onCommit={commitHistory}
            dark={dark}
          />
        )}
      </div>
    );
  }

  // 11. MAGIC ERASER / BLEMISH REMOVAL
  if (activeTab === 'erase') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{t('eraseHint')}</p>
        <SliderControl
          label={t('brushSize')}
          value={Math.round(brushConfig.eraseRadius * 1000)}
          min={8}
          max={70}
          defaultValue={24}
          onChange={(v) => setBrushConfig((prev) => ({ ...prev, eraseRadius: v / 1000 }))}
          dark={dark}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={state.heals.length === 0}
            onClick={() =>
              updateState((prev) => ({ ...prev, heals: prev.heals.slice(0, -1) }), true)
            }
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border disabled:opacity-40 ${cardBg}`}
          >
            <Undo2 className="w-3.5 h-3.5" /> {t('undoStroke')} ({state.heals.length})
          </button>
          <button
            type="button"
            disabled={state.heals.length === 0}
            onClick={() => updateState((prev) => ({ ...prev, heals: [] }), true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-500/30 bg-red-500/10 disabled:opacity-40"
          >
            {t('clear')}
          </button>
        </div>
      </div>
    );
  }

  // 12. MOSAIC
  if (activeTab === 'mosaic') {
    const modes: Array<{ id: MosaicMode; th: string; en: string }> = [
      { id: 'pixel', th: 'พิกเซล', en: 'Pixel' },
      { id: 'blur', th: 'เบลอเนียน', en: 'Soft Blur' },
      { id: 'glass', th: 'กระจกฝ้า', en: 'Frosted' },
      { id: 'oil', th: 'สีน้ำมัน', en: 'Oil' },
      { id: 'heart', th: 'หัวใจน่ารัก', en: 'Hearts ♥' },
      { id: 'triangle', th: 'สามเหลี่ยม', en: 'Low Poly' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('mosaicHint')}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setBrushConfig((p) => ({ ...p, mosaicMode: m.id }))}
              className={`py-2 px-2 rounded-xl text-xs font-semibold ${
                brushConfig.mosaicMode === m.id ? pillActive : pillIdle
              }`}
            >
              {lang === 'th' ? m.th : m.en}
            </button>
          ))}
        </div>
        <SliderControl
          label={t('brushSize')}
          value={Math.round(brushConfig.mosaicSize * 1000)}
          min={15}
          max={110}
          defaultValue={45}
          onChange={(v) => setBrushConfig((p) => ({ ...p, mosaicSize: v / 1000 }))}
          dark={dark}
        />
        <SliderControl
          label={t('brushStrength')}
          value={brushConfig.mosaicStrength}
          min={10}
          max={100}
          defaultValue={50}
          onChange={(v) => setBrushConfig((p) => ({ ...p, mosaicStrength: v }))}
          dark={dark}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={state.mosaics.length === 0}
            onClick={() =>
              updateState((prev) => ({ ...prev, mosaics: prev.mosaics.slice(0, -1) }), true)
            }
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border disabled:opacity-40 ${cardBg}`}
          >
            <Undo2 className="w-3.5 h-3.5" /> {t('undoStroke')} ({state.mosaics.length})
          </button>
          <button
            type="button"
            disabled={state.mosaics.length === 0}
            onClick={() => updateState((prev) => ({ ...prev, mosaics: [] }), true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-500/30 bg-red-500/10 disabled:opacity-40"
          >
            {t('clear')}
          </button>
        </div>
      </div>
    );
  }

  // 13. LIQUIFY + MEITU BODY TALL / LEG LENGTHENER
  if (activeTab === 'liquify') {
    const bs = state.bodyStretch;
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('liquifyHint')}</p>
        <div className="grid grid-cols-3 gap-1.5">
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
              onClick={() => setBrushConfig((p) => ({ ...p, liquifyMode: mode }))}
              className={`py-2 px-2 rounded-xl text-xs font-semibold ${
                brushConfig.liquifyMode === mode ? pillActive : pillIdle
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <SliderControl
          label={t('brushSize')}
          value={Math.round(brushConfig.liquifyRadius * 100)}
          min={4}
          max={22}
          defaultValue={11}
          onChange={(v) => setBrushConfig((p) => ({ ...p, liquifyRadius: v / 100 }))}
          dark={dark}
        />
        <SliderControl
          label={t('brushStrength')}
          value={Math.round(brushConfig.liquifyStrength * 100)}
          min={15}
          max={100}
          defaultValue={55}
          onChange={(v) => setBrushConfig((p) => ({ ...p, liquifyStrength: v / 100 }))}
          dark={dark}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={state.liquify.length === 0}
            onClick={() =>
              updateState((prev) => ({ ...prev, liquify: prev.liquify.slice(0, -1) }), true)
            }
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border disabled:opacity-40 ${cardBg}`}
          >
            <Undo2 className="w-3.5 h-3.5" /> {t('undoStroke')} ({state.liquify.length})
          </button>
          <button
            type="button"
            disabled={state.liquify.length === 0}
            onClick={() => updateState((prev) => ({ ...prev, liquify: [] }), true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-500/30 bg-red-500/10 disabled:opacity-40"
          >
            {t('clear')}
          </button>
        </div>

        {/* Meitu Signature Height / Leg Lengthener */}
        <div className={`p-3 rounded-2xl border space-y-3 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-500">{t('bodyTallMode')}</span>
            <button
              type="button"
              onClick={() =>
                updateState(
                  (prev) => ({
                    ...prev,
                    bodyStretch: { ...prev.bodyStretch, enabled: !prev.bodyStretch.enabled },
                  }),
                  true
                )
              }
              className={`w-10 h-5 rounded-full transition-colors relative ${
                bs.enabled ? 'bg-pink-500' : 'bg-zinc-400/50'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  bs.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {bs.enabled && (
            <>
              <p className="text-[11px] text-zinc-400">{t('bodyTallHint')}</p>
              <SliderControl
                label={t('bodyStretchAmount')}
                value={bs.amount}
                min={0}
                max={100}
                onChange={(v) =>
                  updateState((prev) => ({
                    ...prev,
                    bodyStretch: { ...prev.bodyStretch, amount: v },
                  }))
                }
                onCommit={commitHistory}
                dark={dark}
              />
              <SliderControl
                label={lang === 'th' ? 'ขอบบนแถบยืด' : 'Zone Top'}
                value={Math.round(bs.topY * 100)}
                min={10}
                max={Math.max(15, Math.round(bs.bottomY * 100) - 10)}
                defaultValue={52}
                unit="%"
                onChange={(v) =>
                  updateState((prev) => ({
                    ...prev,
                    bodyStretch: { ...prev.bodyStretch, topY: v / 100 },
                  }))
                }
                onCommit={commitHistory}
                dark={dark}
              />
              <SliderControl
                label={lang === 'th' ? 'ขอบล่างแถบยืด' : 'Zone Bottom'}
                value={Math.round(bs.bottomY * 100)}
                min={Math.min(85, Math.round(bs.topY * 100) + 10)}
                max={96}
                defaultValue={90}
                unit="%"
                onChange={(v) =>
                  updateState((prev) => ({
                    ...prev,
                    bodyStretch: { ...prev.bodyStretch, bottomY: v / 100 },
                  }))
                }
                onCommit={commitHistory}
                dark={dark}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // 14. AI BACKGROUND CUTOUT
  if (activeTab === 'cutout') {
    const co = state.cutout;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            if (!co.enabled) onTriggerCutout();
            updateState(
              (prev) => ({ ...prev, cutout: { ...prev.cutout, enabled: !prev.cutout.enabled } }),
              true
            );
          }}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            co.enabled ? 'meitu-gradient text-white shadow-md' : `border ${cardBg}`
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {isSegmenting ? t('segmenting') : t('enableCutout')}
          {co.enabled && !isSegmenting && ' ✓'}
        </button>

        {co.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['transparent', t('bgTransparent')],
                  ['solid', t('bgSolid')],
                  ['gradient', t('bgGradient')],
                  ['studio', t('bgStudio')],
                  ['blur', t('bgBlurOriginal')],
                ] as const
              ).map(([bt, lbl]) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() =>
                    updateState(
                      (prev) => ({ ...prev, cutout: { ...prev.cutout, bgType: bt } }),
                      true
                    )
                  }
                  className={`py-2 px-2 rounded-xl text-[11px] font-semibold ${
                    co.bgType === bt ? pillActive : pillIdle
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {co.bgType === 'solid' && (
              <div className="flex flex-wrap gap-2">
                {ID_SOLID_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    title={c.name}
                    onClick={() =>
                      updateState(
                        (prev) => ({ ...prev, cutout: { ...prev.cutout, bgColor: c.color } }),
                        true
                      )
                    }
                    className={`w-8 h-8 rounded-full border-2 shadow-sm ${
                      co.bgColor === c.color ? 'border-pink-500 scale-110' : 'border-zinc-300'
                    }`}
                    style={{ background: c.color }}
                  />
                ))}
              </div>
            )}

            {co.bgType === 'gradient' && (
              <div className="grid grid-cols-4 gap-2">
                {CUTOUT_GRADIENTS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() =>
                      updateState(
                        (prev) => ({
                          ...prev,
                          cutout: { ...prev.cutout, bgGradient: g.colors },
                        }),
                        true
                      )
                    }
                    className="h-10 rounded-xl border border-white/50 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
                    }}
                    title={g.name}
                  />
                ))}
              </div>
            )}

            {co.bgType === 'studio' && (
              <div className="grid grid-cols-2 gap-1.5">
                {CUTOUT_STUDIO_SCENES.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() =>
                      updateState(
                        (prev) => ({ ...prev, cutout: { ...prev.cutout, bgStudio: sc.id } }),
                        true
                      )
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-semibold ${
                      co.bgStudio === sc.id ? pillActive : pillIdle
                    }`}
                  >
                    {lang === 'th' ? sc.nameTh : sc.nameEn}
                  </button>
                ))}
              </div>
            )}

            {co.bgType === 'blur' && (
              <SliderControl
                label={t('blurStrength')}
                value={co.blurStrength}
                onChange={(v) =>
                  updateState((prev) => ({ ...prev, cutout: { ...prev.cutout, blurStrength: v } }))
                }
                onCommit={commitHistory}
                dark={dark}
              />
            )}

            <SliderControl
              label={t('edgeFeather')}
              value={co.feather}
              min={0}
              max={16}
              defaultValue={4}
              onChange={(v) =>
                updateState((prev) => ({ ...prev, cutout: { ...prev.cutout, feather: v } }))
              }
              onCommit={commitHistory}
              dark={dark}
            />
          </div>
        )}
      </div>
    );
  }

  // 15. STICKERS
  if (activeTab === 'stickers') {
    const activePack = STICKER_PACKS.find((p) => p.id === stickerPackId) ?? STICKER_PACKS[0];
    const selected = state.stickers.find((s) => s.id === selectedStickerId);

    const addSticker = (item: StickerPackItem) => {
      const id = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
    };

    const updateSelected = (patch: Partial<StickerLayer>, commit = false) => {
      if (!selected) return;
      updateState(
        (prev) => ({
          ...prev,
          stickers: prev.stickers.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)),
        }),
        commit
      );
    };

    return (
      <div className="space-y-3">
        <p className="text-[11px] text-zinc-400">{t('addStickerHint')}</p>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {STICKER_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setStickerPackId(p.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                stickerPackId === p.id ? pillActive : pillIdle
              }`}
            >
              {lang === 'th' ? p.nameTh : p.nameEn}
            </button>
          ))}
        </div>

        <div className={activePack.id === 'badges' ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-4 gap-1.5'}>
          {activePack.items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => addSticker(item)}
              className={`p-2 rounded-xl border flex items-center justify-center hover:scale-105 transition-transform ${cardBg}`}
            >
              {item.kind === 'emoji' ? (
                <span className="text-2xl">{item.content}</span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white truncate"
                  style={{ background: item.color }}
                >
                  {item.content}
                </span>
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div className={`p-3 rounded-2xl border space-y-2.5 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-500">
                {selected.content}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateSelected({ flipX: !selected.flipX }, true)}
                  className="p-1.5 rounded-lg bg-zinc-500/10 hover:bg-pink-500/20"
                  title={t('flipH')}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const copy: StickerLayer = {
                      ...selected,
                      id: `stk_${Date.now()}`,
                      x: Math.min(0.9, selected.x + 0.06),
                      y: Math.min(0.9, selected.y + 0.06),
                    };
                    updateState((prev) => ({ ...prev, stickers: [...prev.stickers, copy] }), true);
                    setSelectedStickerId(copy.id);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-500/10 hover:bg-pink-500/20"
                  title={t('duplicate')}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateState(
                      (prev) => ({
                        ...prev,
                        stickers: prev.stickers.filter((s) => s.id !== selected.id),
                      }),
                      true
                    );
                    setSelectedStickerId(null);
                  }}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <SliderControl
              label="Scale"
              value={Math.round(selected.scale * 100)}
              min={30}
              max={300}
              defaultValue={100}
              unit="%"
              onChange={(v) => updateSelected({ scale: v / 100 })}
              onCommit={commitHistory}
              dark={dark}
            />
            <SliderControl
              label="Rotate"
              value={selected.rotation}
              min={-180}
              max={180}
              defaultValue={0}
              unit="°"
              onChange={(v) => updateSelected({ rotation: v })}
              onCommit={commitHistory}
              dark={dark}
            />
            <SliderControl
              label="Opacity"
              value={Math.round(selected.opacity * 100)}
              min={15}
              max={100}
              defaultValue={100}
              unit="%"
              onChange={(v) => updateSelected({ opacity: v / 100 })}
              onCommit={commitHistory}
              dark={dark}
            />
          </div>
        )}
      </div>
    );
  }

  // 16. TEXT STUDIO
  if (activeTab === 'text') {
    const selected = state.texts.find((tx) => tx.id === selectedTextId);

    const addText = () => {
      const id = `txt_${Date.now()}`;
      const newLayer: TextLayer = {
        id,
        text: lang === 'th' ? 'Meitu สวยละมุน ✨' : 'Meitu Studio ✨',
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

    const updateSelected = (patch: Partial<TextLayer>, commit = false) => {
      if (!selected) return;
      updateState(
        (prev) => ({
          ...prev,
          texts: prev.texts.map((tx) => (tx.id === selected.id ? { ...tx, ...patch } : tx)),
        }),
        commit
      );
    };

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={addText}
          className="w-full py-2.5 rounded-xl meitu-gradient text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('addTextBtn')}
        </button>

        {state.texts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {state.texts.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelectedTextId(tx.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium max-w-[140px] truncate ${
                  tx.id === selectedTextId ? pillActive : pillIdle
                }`}
              >
                {tx.text || '...'}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-3">
            <textarea
              rows={2}
              value={selected.text}
              onChange={(e) => updateSelected({ text: e.target.value })}
              onBlur={commitHistory}
              placeholder={t('textPlaceholder')}
              className={`w-full rounded-xl p-2.5 text-sm border outline-none focus:border-pink-500 ${
                dark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-pink-200 text-zinc-800'
              }`}
            />

            {/* Style Presets */}
            <div className="flex flex-wrap gap-1.5">
              {TEXT_STYLE_PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() =>
                    updateSelected(
                      {
                        preset: pr.id,
                        color: pr.color,
                        strokeColor: pr.strokeColor,
                        strokeWidth: pr.strokeWidth,
                        bgColor: pr.bgColor,
                        shadow: pr.shadow,
                        fontFamily: pr.fontFamily,
                      },
                      true
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    selected.preset === pr.id ? pillActive : pillIdle
                  }`}
                >
                  {lang === 'th' ? pr.nameTh : pr.nameEn}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-semibold block mb-1">{t('fontFamily')}</label>
              <select
                value={selected.fontFamily}
                onChange={(e) => updateSelected({ fontFamily: e.target.value }, true)}
                className={`w-full rounded-xl px-2.5 py-2 text-xs border ${
                  dark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-pink-200'
                }`}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] flex flex-col gap-1">
                <span>{t('textColor')}</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer"
                />
              </label>
              <label className="text-[11px] flex flex-col gap-1">
                <span>{t('textStroke')}</span>
                <input
                  type="color"
                  value={selected.strokeColor}
                  onChange={(e) =>
                    updateSelected({
                      strokeColor: e.target.value,
                      strokeWidth: selected.strokeWidth === 0 ? 3 : selected.strokeWidth,
                    })
                  }
                  className="w-full h-7 rounded cursor-pointer"
                />
              </label>
              <div className="text-[11px] flex flex-col gap-1">
                <span>{t('textBg')}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateSelected(
                      {
                        bgColor:
                          selected.bgColor === 'transparent'
                            ? 'rgba(255, 79, 123, 0.85)'
                            : 'transparent',
                      },
                      true
                    )
                  }
                  className={`h-7 rounded text-[10px] font-semibold ${
                    selected.bgColor !== 'transparent' ? pillActive : pillIdle
                  }`}
                >
                  {selected.bgColor !== 'transparent' ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <SliderControl
              label={t('textSize')}
              value={selected.fontSize}
              min={2}
              max={18}
              defaultValue={7}
              onChange={(v) => updateSelected({ fontSize: v })}
              onCommit={commitHistory}
              dark={dark}
            />
            <SliderControl
              label="Rotate"
              value={selected.rotation}
              min={-180}
              max={180}
              defaultValue={0}
              unit="°"
              onChange={(v) => updateSelected({ rotation: v })}
              onCommit={commitHistory}
              dark={dark}
            />

            <button
              type="button"
              onClick={() => {
                updateState(
                  (prev) => ({ ...prev, texts: prev.texts.filter((tx) => tx.id !== selected.id) }),
                  true
                );
                setSelectedTextId(null);
              }}
              className="w-full py-1.5 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/25 flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 17. MAGIC BRUSH / DOODLE
  if (activeTab === 'doodle') {
    const brushes: Array<{ id: DoodleBrushType; label: string }> = [
      { id: 'sparkle', label: '✨ Sparkle' },
      { id: 'heart', label: '💕 Heart' },
      { id: 'sakura', label: '🌸 Sakura' },
      { id: 'star', label: '⭐ Star' },
      { id: 'bubble', label: '🫧 Bubble' },
      { id: 'pearl', label: '🤍 Pearl' },
      { id: 'neon', label: '⚡ Neon' },
      { id: 'rainbow', label: '🌈 Rainbow' },
      { id: 'pen', label: '🖊️ Pen' },
      { id: 'highlighter', label: '🖍️ Marker' },
    ];

    return (
      <div className="space-y-3">
        <p className="text-[11px] text-zinc-400">{t('doodleHint')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {brushes.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrushConfig((p) => ({ ...p, doodleType: b.id }))}
              className={`py-1.5 px-2 rounded-xl text-xs font-semibold ${
                brushConfig.doodleType === b.id ? pillActive : pillIdle
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {DOODLE_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setBrushConfig((p) => ({ ...p, doodleColor: col }))}
              className={`w-6 h-6 rounded-full border-2 ${
                brushConfig.doodleColor === col ? 'border-pink-500 scale-110' : 'border-zinc-300'
              }`}
              style={{ background: col }}
            />
          ))}
          <input
            type="color"
            value={brushConfig.doodleColor}
            onChange={(e) => setBrushConfig((p) => ({ ...p, doodleColor: e.target.value }))}
            className="w-6 h-6 rounded-full cursor-pointer border-0"
          />
        </div>

        <SliderControl
          label={t('brushSize')}
          value={Math.round(brushConfig.doodleSize * 1000)}
          min={5}
          max={55}
          defaultValue={18}
          onChange={(v) => setBrushConfig((p) => ({ ...p, doodleSize: v / 1000 }))}
          dark={dark}
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={state.doodles.length === 0}
            onClick={() =>
              updateState((prev) => ({ ...prev, doodles: prev.doodles.slice(0, -1) }), true)
            }
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border disabled:opacity-40 ${cardBg}`}
          >
            <Undo2 className="w-3.5 h-3.5" /> {t('undoStroke')} ({state.doodles.length})
          </button>
          <button
            type="button"
            disabled={state.doodles.length === 0}
            onClick={() => updateState((prev) => ({ ...prev, doodles: [] }), true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-500/30 bg-red-500/10 disabled:opacity-40"
          >
            {t('clear')}
          </button>
        </div>
      </div>
    );
  }

  // 18. FRAMES & BORDERS
  const frames: Array<{ id: FrameStyleId; th: string; en: string }> = [
    { id: 'none', th: 'ไม่มีกรอบ', en: 'None' },
    { id: 'white', th: 'ขาวมินิมอล', en: 'Minimal White' },
    { id: 'polaroid', th: 'โพลารอยด์', en: 'Polaroid' },
    { id: 'film', th: 'ฟิล์ม 35mm', en: '35mm Film' },
    { id: 'magazine', th: 'ปกนิตยสาร', en: 'Vogue Cover' },
    { id: 'pastelPink', th: 'ชมพูพาสเทล', en: 'Pastel Pink' },
    { id: 'museum', th: 'กรอบแกลเลอรี', en: 'Museum Mat' },
    { id: 'cinema', th: 'ขอบหนัง 2.39', en: 'Cinema Bar' },
    { id: 'y2k', th: 'ไล่สี Y2K', en: 'Y2K Gradient' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5">
        {frames.map((fr) => (
          <button
            key={fr.id}
            type="button"
            onClick={() =>
              updateState((prev) => ({ ...prev, frame: { ...prev.frame, style: fr.id } }), true)
            }
            className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold ${
              state.frame.style === fr.id ? pillActive : pillIdle
            }`}
          >
            {lang === 'th' ? fr.th : fr.en}
          </button>
        ))}
      </div>

      {state.frame.style !== 'none' && (
        <div className="space-y-3">
          <SliderControl
            label={t('frameThickness')}
            value={state.frame.thickness}
            min={8}
            max={90}
            defaultValue={32}
            onChange={(v) =>
              updateState((prev) => ({ ...prev, frame: { ...prev.frame, thickness: v } }))
            }
            onCommit={commitHistory}
            dark={dark}
          />
          {(state.frame.style === 'polaroid' ||
            state.frame.style === 'magazine' ||
            state.frame.style === 'cinema') && (
            <div>
              <label className="text-[11px] font-semibold block mb-1">{t('frameCaption')}</label>
              <input
                type="text"
                value={state.frame.caption}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    frame: { ...prev.frame, caption: e.target.value },
                  }))
                }
                onBlur={commitHistory}
                className={`w-full rounded-xl px-2.5 py-2 text-xs border outline-none focus:border-pink-500 ${
                  dark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-pink-200'
                }`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StickerPackItem {
  kind: 'emoji' | 'badge';
  content: string;
  color?: string;
}
