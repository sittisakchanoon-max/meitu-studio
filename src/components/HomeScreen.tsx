import React, { useRef, useState } from 'react';
import {
  Camera,
  Download,
  ImagePlus,
  LayoutGrid,
  Moon,
  Scissors,
  Sliders,
  Smile,
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
  const pendingTabRef = useRef<EditorTab>('beauty');
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

  const quickCards = [
    {
      id: 'beauty',
      title: t('quickBeauty'),
      desc: t('quickBeautyDesc'),
      icon: Smile,
      grad: 'from-pink-500 via-rose-500 to-pink-400',
      action: () => pickFileForTab('beauty'),
    },
    {
      id: 'photo',
      title: t('quickPhotoEdit'),
      desc: t('quickPhotoEditDesc'),
      icon: Sliders,
      grad: 'from-fuchsia-500 via-pink-500 to-orange-400',
      action: () => pickFileForTab('filters'),
    },
    {
      id: 'cutout',
      title: t('quickCutout'),
      desc: t('quickCutoutDesc'),
      icon: Scissors,
      grad: 'from-violet-500 via-purple-500 to-pink-500',
      action: () => pickFileForTab('cutout'),
    },
    {
      id: 'collage',
      title: t('quickCollage'),
      desc: t('quickCollageDesc'),
      icon: LayoutGrid,
      grad: 'from-amber-400 via-orange-400 to-pink-500',
      action: onOpenCollage,
    },
    {
      id: 'camera',
      title: t('quickCamera'),
      desc: t('quickCameraDesc'),
      icon: Camera,
      grad: 'from-sky-400 via-indigo-500 to-purple-500',
      action: onOpenCamera,
    },
    {
      id: 'ai',
      title: t('quickAIStyle'),
      desc: t('quickAIStyleDesc'),
      icon: Wand2,
      grad: 'from-emerald-400 via-teal-500 to-cyan-500',
      action: () => pickFileForTab('ai'),
    },
  ];

  return (
    <div
      className={`min-h-screen w-full transition-colors ${
        dark
          ? 'bg-zinc-950 text-zinc-100'
          : 'bg-gradient-to-b from-[#FFF2F6] via-[#FFF9FB] to-white text-zinc-800'
      }`}
    >
      {/* Hidden File Input */}
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

      {/* Top Navigation */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-xl border-b ${
          dark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/75 border-pink-100'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="./icon-512.png"
              alt="Meitu Studio"
              className="w-9 h-9 rounded-2xl shadow-md shadow-pink-500/25"
            />
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center gap-1.5">
                <span className="meitu-gradient-text">{t('appName')}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-500/15 text-pink-500">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 hidden sm:block">{t('tagline')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canInstallPWA && (
              <button
                type="button"
                onClick={onInstallPWA}
                className="px-3 py-1.5 rounded-full meitu-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/25"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('installApp')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                dark
                  ? 'border-zinc-700 bg-zinc-900 hover:border-pink-500'
                  : 'border-pink-200 bg-white text-pink-600 hover:bg-pink-50'
              }`}
            >
              {lang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}
            </button>
            <button
              type="button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              className={`p-2 rounded-full border transition-colors ${
                dark
                  ? 'border-zinc-700 bg-zinc-900 text-amber-400'
                  : 'border-pink-200 bg-white text-zinc-600 hover:text-pink-500'
              }`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* Hero Banner + Drag & Drop Uploader */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pendingTabRef.current = 'beauty';
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`relative rounded-[2rem] p-6 sm:p-10 overflow-hidden border transition-all ${
            dragging
              ? 'border-pink-500 ring-4 ring-pink-500/20 scale-[1.01]'
              : dark
                ? 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-pink-950/40 border-zinc-800'
                : 'bg-gradient-to-br from-white via-[#FFF2F6] to-[#FFE1EC] border-pink-200/80 shadow-xl shadow-pink-500/10'
          }`}
        >
          {/* Decorative soft pink orbs */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-rose-300/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 text-pink-500 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% Client-Side AI · Privacy First · Free PWA</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
                {t('heroTitle')}
              </h1>
              <p className={`text-xs sm:text-sm leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t('heroSubtitle')}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => pickFileForTab('beauty')}
                  className="px-6 py-3.5 rounded-2xl meitu-gradient text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-pink-500/35 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <ImagePlus className="w-5 h-5" />
                  {t('uploadPhoto')}
                </button>
                <button
                  type="button"
                  onClick={onOpenCamera}
                  className={`px-5 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 border transition-all ${
                    dark
                      ? 'border-zinc-700 bg-zinc-800/80 hover:border-pink-500'
                      : 'border-pink-200 bg-white/90 text-pink-600 hover:bg-pink-50 shadow-sm'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  {t('quickCamera')}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">{t('dropHint')}</p>
            </div>

            {/* Preview Floating Card Stack */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <div className="w-36 h-48 rounded-3xl overflow-hidden shadow-xl -rotate-6 border-4 border-white/90 hover:rotate-0 transition-transform cursor-pointer"
                onClick={() => onOpenEditor('./samples/portrait-beauty.jpg', 'beauty')}
              >
                <img src="./samples/portrait-beauty.jpg" alt="Portrait demo" className="w-full h-full object-cover" />
              </div>
              <div className="w-36 h-48 rounded-3xl overflow-hidden shadow-xl rotate-6 border-4 border-white/90 hover:rotate-0 transition-transform cursor-pointer -ml-4 mt-6"
                onClick={() => onOpenEditor('./samples/fashion-street.jpg', 'cutout')}
              >
                <img src="./samples/fashion-street.jpg" alt="Fashion demo" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* 6 Meitu Signature Quick Launch Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.action}
                className={`group text-left p-4 sm:p-5 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-xl ${
                  dark
                    ? 'bg-zinc-900 border-zinc-800 hover:border-pink-500/50'
                    : 'bg-white border-pink-100/90 hover:border-pink-300 shadow-sm'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.grad} text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm sm:text-base mb-1">{card.title}</div>
                <div className={`text-[11px] sm:text-xs leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {card.desc}
                </div>
              </button>
            );
          })}
        </section>

        {/* 1-Click Instant Demo Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              {t('trySamples')}
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onOpenEditor(sample.src, sample.recommendedTab)}
                className={`group rounded-3xl overflow-hidden border text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
                  dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100 shadow-sm'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={sample.src}
                    alt={t(sample.labelKey)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                    TRY ✦
                  </span>
                </div>
                <div className="p-3 text-xs font-semibold truncate">{t(sample.labelKey)}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Saved Creations */}
        {recentThumbs.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-bold text-base">{t('recentProjects')}</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {recentThumbs.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenEditor(url, 'filters')}
                  className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-pink-200 shrink-0 hover:scale-105 transition-transform shadow-sm"
                >
                  <img src={url} alt="Recent edit" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-zinc-400">
        Meitu Studio AI · Built with React, TypeScript, HTML5 Canvas & MediaPipe 478-Point Face Mesh
      </footer>
    </div>
  );
};
