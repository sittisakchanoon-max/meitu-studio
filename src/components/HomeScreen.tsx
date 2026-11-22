import React, { useRef, useState } from 'react';
import {
  Camera,
  Download,
  Eraser,
  Home,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  Moon,
  Palette,
  Scissors,
  Sparkles,
  Sun,
  Wand2,
  Waves,
  X,
} from 'lucide-react';
import { SAMPLE_PHOTOS } from '../data/presets';
import { useT } from '../i18n/translations';
import { EditorTab, Language, ThemeMode } from '../types/editor';
import { FaceSlimIcon } from './MeituIcons';

interface HomeScreenProps {
  lang: Language;
  setLang: (l: Language) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  onOpenEditor: (imageSrc: string, initialTab?: EditorTab) => void;
  onOpenCollage: () => void;
  onOpenCamera: () => void;
  recentThumbs: string[];
  canInstallPWA: boolean;
  onInstallPWA: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  lang,
  setLang,
  theme,
  setTheme,
  onOpenEditor,
  onOpenCollage,
  onOpenCamera,
  recentThumbs,
  canInstallPWA,
  onInstallPWA,
}) => {
  const t = useT(lang);
  const dark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingTabRef = useRef<EditorTab>('filters');
  const [recentsOpen, setRecentsOpen] = useState(false);

  const pickFileForTab = (tab: EditorTab) => {
    pendingTabRef.current = tab;
    fileInputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onOpenEditor(url, pendingTabRef.current);
  };

  const quickCircleTools = [
    { id: 'makeup', label: lang === 'th' ? 'เมคอัพ' : 'Makeup', icon: Palette, tint: 'bg-[#FFF0F5] text-[#FF4F7B]', tab: 'makeup' as EditorTab },
    { id: 'filters', label: lang === 'th' ? 'ฟิลเตอร์' : 'Filters', icon: Wand2, tint: 'bg-[#FFF5EC] text-[#FF7A45]', tab: 'filters' as EditorTab },
    { id: 'erase', label: lang === 'th' ? 'ลบวัตถุ' : 'Eraser', icon: Eraser, tint: 'bg-[#F0F7FF] text-[#3B82F6]', tab: 'erase' as EditorTab },
    { id: 'tall', label: lang === 'th' ? 'สูงเพรียว' : 'Tall AI', icon: Waves, tint: 'bg-[#F5F0FF] text-[#8B5CF6]', tab: 'liquify' as EditorTab },
    { id: 'ai', label: lang === 'th' ? 'AI สไตล์' : 'AI Art', icon: Sparkles, tint: 'bg-[#ECFDF5] text-[#10B981]', tab: 'ai' as EditorTab },
  ];

  const sampleTags = [
    lang === 'th' ? 'เมคอัพ พลัมเบอร์รี่' : 'Plum Berry Makeup',
    lang === 'th' ? 'ฟิลเตอร์ แฟลช Ricoh' : 'Ricoh Flash Filter',
    lang === 'th' ? 'ฟิลเตอร์ ฝ้าย' : 'Cotton Mist Filter',
    lang === 'th' ? 'โทนสี HSL พาสเทล' : 'Pastel HSL Tone',
  ];

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pendingTabRef.current = 'filters';
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`min-h-[100dvh] w-full flex flex-col pb-24 transition-colors ${
        dark
          ? 'bg-black text-white'
          : 'bg-[#F6F7FA] text-[#1D1D1F]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Soft top signature Meitu blush glow */}
      {!dark && (
        <div
          className="fixed inset-x-0 top-0 h-56 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 80% at 50% -15%, rgba(255, 79, 123, 0.16), rgba(255, 190, 210, 0.08) 55%, transparent 100%)',
          }}
        />
      )}

      {/* Authentic Clean Meitu Mobile Top Bar */}
      <header className="relative z-20 safe-top px-4 pb-3 flex items-center justify-between max-w-lg w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-[#FF2E63] to-[#FF6690] flex items-center justify-center shadow-[0_3px_10px_rgba(255,46,99,0.35)]">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-white" fill="none">
              <path
                d="M2.5 11.2V5.4C2.5 4.9 3.1 4.6 3.5 4.9L5.8 6.8L8 4.8L10.2 6.8L12.5 4.9C12.9 4.6 13.5 4.9 13.5 5.4V11.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[20px] font-extrabold tracking-tight">meitu</span>
        </div>

        <div className="flex items-center gap-2">
          {canInstallPWA && (
            <button
              type="button"
              onClick={onInstallPWA}
              className="px-2.5 py-1 rounded-full meitu-gradient text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3 h-3" />
              {lang === 'th' ? 'ติดตั้ง' : 'App'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              dark ? 'bg-[#1C1C1E] text-zinc-200' : 'bg-white text-zinc-700 shadow-xs'
            }`}
          >
            {lang === 'th' ? 'TH' : 'EN'}
          </button>
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              dark ? 'bg-[#1C1C1E] text-amber-400' : 'bg-white text-zinc-600 shadow-xs'
            }`}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-lg w-full mx-auto px-4 space-y-5">
        {/* ROW 1: Meitu's Iconic Two Large Rounded Hero Tiles */}
        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => pickFileForTab('filters')}
            className="relative overflow-hidden rounded-[22px] p-4 text-left text-white bg-gradient-to-br from-[#FF3B6B] via-[#FF5783] to-[#FF7B9C] shadow-[0_10px_24px_rgba(255,59,107,0.28)] active:scale-[0.97] transition-transform h-[132px] flex flex-col justify-between"
          >
            <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/15 blur-lg" />
            <div className="w-10 h-10 rounded-[14px] bg-white/22 backdrop-blur-sm flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-white stroke-[2]" />
            </div>
            <div>
              <div className="text-[17px] font-bold leading-tight">
                {lang === 'th' ? 'แต่งรูป' : 'Photo Edit'}
              </div>
              <div className="text-[11px] text-white/85 mt-0.5">
                {lang === 'th' ? 'ฟิลเตอร์ · ปรับสี · กรอบ' : 'Filters · Tone · Frames'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pickFileForTab('makeup')}
            className="relative overflow-hidden rounded-[22px] p-4 text-left text-white bg-gradient-to-br from-[#FF6D8C] via-[#FF8AA0] to-[#FFB1B8] shadow-[0_10px_24px_rgba(255,109,140,0.24)] active:scale-[0.97] transition-transform h-[132px] flex flex-col justify-between"
          >
            <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/15 blur-lg" />
            <div className="w-10 h-10 rounded-[14px] bg-white/22 backdrop-blur-sm flex items-center justify-center">
              <FaceSlimIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[17px] font-bold leading-tight">
                {lang === 'th' ? 'ตกแต่งใบหน้า' : 'Beautify'}
              </div>
              <div className="text-[11px] text-white/90 mt-0.5">
                {lang === 'th' ? 'เมคอัพ · หน้าเรียว · ผิวใส' : 'Makeup · Reshape · Skin'}
              </div>
            </div>
          </button>
        </section>

        {/* ROW 2: 3 Clean Meitu Feature Pill Cards (กล้อง · ภาพปะติด · ไดคัท AI) */}
        <section className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onOpenCamera}
            className={`rounded-[18px] py-3.5 px-2 flex flex-col items-center gap-2 active:scale-95 transition-transform ${
              dark ? 'bg-[#18181A]' : 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
            }`}
          >
            <Camera className="w-6 h-6 text-[#FF4F7B] stroke-[1.8]" />
            <span className="text-[12px] font-semibold">
              {lang === 'th' ? 'กล้อง' : 'Camera'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenCollage}
            className={`rounded-[18px] py-3.5 px-2 flex flex-col items-center gap-2 active:scale-95 transition-transform ${
              dark ? 'bg-[#18181A]' : 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
            }`}
          >
            <LayoutGrid className="w-6 h-6 text-[#FF8547] stroke-[1.8]" />
            <span className="text-[12px] font-semibold">
              {lang === 'th' ? 'ภาพปะติด' : 'Collage'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => pickFileForTab('cutout')}
            className={`rounded-[18px] py-3.5 px-2 flex flex-col items-center gap-2 active:scale-95 transition-transform ${
              dark ? 'bg-[#18181A]' : 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
            }`}
          >
            <Scissors className="w-6 h-6 text-[#9353FF] stroke-[1.8]" />
            <span className="text-[12px] font-semibold">
              {lang === 'th' ? 'ไดคัท AI' : 'Cutout'}
            </span>
          </button>
        </section>

        {/* ROW 3: 5 Circular Quick Tools Strip */}
        <section
          className={`rounded-[20px] py-3.5 px-2 grid grid-cols-5 gap-1 ${
            dark ? 'bg-[#18181A]' : 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
          }`}
        >
          {quickCircleTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => pickFileForTab(tool.tab)}
                className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    dark ? 'bg-[#262629] text-white' : tool.tint
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-medium truncate w-full text-center">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </section>

        {/* ROW 4: Meitu Featured Inspiration / Instant Try Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[15px] font-bold">
              {lang === 'th' ? 'เทมเพลต & ลองแต่งทันที' : 'Trending Looks & Demo'}
            </h2>
            <span className="text-[11px] text-[#8E8E93]">
              {lang === 'th' ? 'แตะเพื่อลอง' : 'Tap to try'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_PHOTOS.map((sample, idx) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onOpenEditor(sample.src, sample.recommendedTab)}
                className="relative rounded-[18px] overflow-hidden aspect-[3/4] text-left active:scale-[0.98] transition-transform shadow-sm group"
              >
                <img
                  src={sample.src}
                  alt={t(sample.labelKey)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-white truncate">
                    {sampleTags[idx]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FF4F7B] text-white text-[10px] font-bold shrink-0">
                    {lang === 'th' ? 'ใช้' : 'Try'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* AUTHENTIC MEITU FIXED BOTTOM NAVIGATION BAR */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-30 border-t safe-bottom ${
          dark
            ? 'bg-black/95 border-white/10'
            : 'bg-white/95 border-black/[0.06] backdrop-blur-xl'
        }`}
      >
        <div className="max-w-lg mx-auto h-14 px-6 flex items-center justify-between relative">
          <button
            type="button"
            onClick={() => setRecentsOpen(false)}
            className="flex flex-col items-center gap-0.5 text-[#FF4F7B]"
          >
            <Home className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] font-semibold">{lang === 'th' ? 'หน้าหลัก' : 'Home'}</span>
          </button>

          <button
            type="button"
            onClick={() => pickFileForTab('filters')}
            className={`flex flex-col items-center gap-0.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}
          >
            <ImagePlus className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-medium">{lang === 'th' ? 'แต่งรูป' : 'Edit'}</span>
          </button>

          {/* Iconic Center Raised Meitu Camera Button */}
          <button
            type="button"
            onClick={onOpenCamera}
            className="-mt-5 w-13 h-13 rounded-full meitu-gradient text-white flex items-center justify-center shadow-[0_6px_18px_rgba(255,59,107,0.45)] border-4 border-white dark:border-black active:scale-90 transition-transform"
            aria-label={t('quickCamera')}
          >
            <Camera className="w-6 h-6 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onOpenCollage}
            className={`flex flex-col items-center gap-0.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}
          >
            <LayoutGrid className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-medium">{lang === 'th' ? 'คอลลาจ' : 'Collage'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRecentsOpen(true)}
            className={`flex flex-col items-center gap-0.5 ${
              recentsOpen ? 'text-[#FF4F7B]' : dark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <ImageIcon className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-medium">{lang === 'th' ? 'ผลงาน' : 'Mine'}</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Recent Creations Sheet */}
      {recentsOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-end justify-center">
          <div
            className={`w-full max-w-lg rounded-t-[28px] p-5 safe-bottom max-h-[65dvh] flex flex-col ${
              dark ? 'bg-[#141416] text-white' : 'bg-white text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">{t('recentProjects')}</h3>
              <button
                type="button"
                onClick={() => setRecentsOpen(false)}
                className="p-1.5 rounded-full bg-zinc-500/15"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {recentThumbs.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8E8E93]">{t('noRecents')}</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto">
                {recentThumbs.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setRecentsOpen(false);
                      onOpenEditor(url, 'filters');
                    }}
                    className="aspect-square rounded-2xl overflow-hidden"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
