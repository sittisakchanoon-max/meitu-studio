import React, { useRef, useState } from 'react';
import {
  Camera,
  Download,
  ImagePlus,
  LayoutGrid,
  Moon,
  Palette,
  Scissors,
  Smartphone,
  Sparkles,
  Sun,
  Wand2,
} from 'lucide-react';
import { SAMPLE_PHOTOS } from '../data/presets';
import { useT } from '../i18n/translations';
import { EditorTab, Language, ThemeMode } from '../types/editor';

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
  const [dragging, setDragging] = useState(false);

  const pickFileForTab = (tab: EditorTab) => {
    pendingTabRef.current = tab;
    fileInputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onOpenEditor(url, pendingTabRef.current);
  };

  const miniTools = [
    {
      id: 'camera',
      label: lang === 'th' ? 'กล้องบิวตี้' : 'Camera',
      icon: Camera,
      color: 'from-pink-500 to-rose-500',
      action: onOpenCamera,
    },
    {
      id: 'collage',
      label: lang === 'th' ? 'คอลลาจ' : 'Collage',
      icon: LayoutGrid,
      color: 'from-amber-400 to-orange-500',
      action: onOpenCollage,
    },
    {
      id: 'cutout',
      label: lang === 'th' ? 'ไดคัท AI' : 'Cutout',
      icon: Scissors,
      color: 'from-violet-500 to-fuchsia-500',
      action: () => pickFileForTab('cutout'),
    },
    {
      id: 'ai',
      label: lang === 'th' ? 'AI สไตล์' : 'AI Art',
      icon: Wand2,
      color: 'from-sky-400 to-indigo-500',
      action: () => pickFileForTab('ai'),
    },
  ];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pendingTabRef.current = 'filters';
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`min-h-[100dvh] w-full flex flex-col transition-colors ${
        dark
          ? 'bg-black text-zinc-100'
          : 'bg-gradient-to-b from-[#FFF1F5] via-[#FFF9FB] to-white text-zinc-800'
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

      {/* Meitu Mobile App Header */}
      <header className="sticky top-0 z-30 safe-top px-4 pb-3 flex items-center justify-between max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white shadow-sm border border-pink-100 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full meitu-gradient flex items-center justify-center text-[11px] font-black text-white">
              m
            </span>
            <span className="font-extrabold text-sm text-zinc-900 tracking-tight">meitu</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF4F7B]/15 text-[#FF4F7B]">
            STUDIO AI
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {canInstallPWA && (
            <button
              type="button"
              onClick={onInstallPWA}
              className="px-2.5 py-1.5 rounded-full meitu-gradient text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {lang === 'th' ? 'ติดตั้ง' : 'Install'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border ${
              dark ? 'border-zinc-800 bg-zinc-900 text-zinc-200' : 'border-pink-200 bg-white text-pink-600'
            }`}
          >
            {lang === 'th' ? 'TH' : 'EN'}
          </button>
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className={`p-2 rounded-full border ${
              dark ? 'border-zinc-800 bg-zinc-900 text-amber-400' : 'border-pink-200 bg-white text-zinc-600'
            }`}
          >
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pb-8 space-y-6">
        {/* Authentic Meitu Two-Big-Card Mobile Hero */}
        <section
          className={`grid grid-cols-2 gap-3 transition-transform ${dragging ? 'scale-[1.02]' : ''}`}
        >
          {/* Card 1: แต่งรูป (Photo Edit & Filters) */}
          <button
            type="button"
            onClick={() => pickFileForTab('filters')}
            className="relative overflow-hidden rounded-[1.75rem] p-5 text-left text-white meitu-gradient shadow-xl shadow-pink-500/25 active:scale-[0.97] transition-transform min-h-[152px] flex flex-col justify-between"
          >
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/15 blur-xl" />
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">
                {lang === 'th' ? 'แต่งรูป' : 'Photo Edit'}
              </div>
              <div className="text-[11px] text-white/85 mt-0.5">
                {lang === 'th' ? 'ฟิลเตอร์ฝ้าย · แฟลช · ปรับสี' : 'Filters · Flash · Tone'}
              </div>
            </div>
          </button>

          {/* Card 2: รีทัช & เมคอัพ (Portrait Beauty & Makeup) */}
          <button
            type="button"
            onClick={() => pickFileForTab('makeup')}
            className="relative overflow-hidden rounded-[1.75rem] p-5 text-left text-white bg-gradient-to-br from-[#FF6B8B] via-[#FF85A1] to-[#FFA8B8] shadow-xl shadow-rose-400/25 active:scale-[0.97] transition-transform min-h-[152px] flex flex-col justify-between"
          >
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/20 blur-xl" />
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">
                {lang === 'th' ? 'เมคอัพ & รีทัช' : 'Makeup AI'}
              </div>
              <div className="text-[11px] text-white/90 mt-0.5">
                {lang === 'th' ? 'พลัมเบอร์รี่ · วอนยอง · หน้าเรียว' : 'Looks · Reshape · Skin'}
              </div>
            </div>
          </button>
        </section>

        {/* 4-Column Quick Meitu Tool Icons */}
        <section
          className={`grid grid-cols-4 gap-2 p-3.5 rounded-3xl border ${
            dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100 shadow-sm'
          }`}
        >
          {miniTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={tool.action}
                className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.color} text-white flex items-center justify-center shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold truncate w-full text-center">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </section>

        {/* 1-Tap Instant Demo Portraits (Test Makeup & Filters Immediately!) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF4F7B]" />
              {t('trySamples')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onOpenEditor(sample.src, sample.recommendedTab)}
                className={`group rounded-3xl overflow-hidden border text-left active:scale-[0.98] transition-transform ${
                  dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100 shadow-sm'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={sample.src}
                    alt={t(sample.labelKey)}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur text-white text-[10px] font-bold">
                    {sample.recommendedTab === 'makeup'
                      ? lang === 'th'
                        ? 'ลองเมคอัพ ✦'
                        : 'Try Makeup ✦'
                      : lang === 'th'
                        ? 'ลองฟิลเตอร์ ✦'
                        : 'Try Filter ✦'}
                  </span>
                </div>
                <div className="p-2.5 text-[11px] font-semibold truncate">{t(sample.labelKey)}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Edits */}
        {recentThumbs.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold">{t('recentProjects')}</h2>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {recentThumbs.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenEditor(url, 'filters')}
                  className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-300/60 shrink-0 shadow-sm"
                >
                  <img src={url} alt="Recent" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Mobile Full-Screen PWA Tip */}
        <section
          className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
            dark
              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
              : 'bg-pink-50/70 border-pink-100 text-zinc-600'
          }`}
        >
          <Smartphone className="w-5 h-5 text-[#FF4F7B] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className={dark ? 'text-white' : 'text-zinc-800'}>
              {lang === 'th' ? 'ทิปใช้บนมือถือให้เต็มจอเหมือนแอพจริง:' : 'Mobile App Mode Tip:'}
            </strong>{' '}
            {lang === 'th'
              ? 'บน iPhone (Safari) กดปุ่ม แชร์ → "เพิ่มไปยังหน้าจอโฮม" · บน Android (Chrome) กดจุด 3 จุด → "ติดตั้งแอพ" เพื่อเปิดใช้งานเต็มจอแบบไม่มีแถบเบราว์เซอร์!'
              : 'On iPhone Safari tap Share → "Add to Home Screen", or on Android Chrome tap Menu → "Install App" for full-screen native experience!'}
          </div>
        </section>
      </main>
    </div>
  );
};
