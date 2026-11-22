import React, { useEffect, useState } from 'react';
import { BeautyCamera } from './components/BeautyCamera';
import { CollageStudio } from './components/CollageStudio';
import { EditorWorkspace } from './components/EditorWorkspace';
import { HomeScreen } from './components/HomeScreen';
import { AppMode, EditorTab, Language, ThemeMode } from './types/editor';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const RECENT_KEY = 'meitu_studio_recents_v1';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('meitu_lang');
    return saved === 'en' ? 'en' : 'th';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('meitu_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [mode, setMode] = useState<AppMode>('home');
  const [activeImage, setActiveImage] = useState<string>('');
  const [initialTab, setInitialTab] = useState<EditorTab>('beauty');
  const [recentThumbs, setRecentThumbs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    localStorage.setItem('meitu_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('meitu_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleOpenEditor = (imageSrc: string, tab: EditorTab = 'beauty') => {
    setActiveImage(imageSrc);
    setInitialTab(tab);
    setMode('editor');
  };

  const handleSavedThumbnail = (thumbDataUrl: string) => {
    setRecentThumbs((prev) => {
      const next = [thumbDataUrl, ...prev.filter((u) => u !== thumbDataUrl)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // storage full
      }
      return next;
    });
  };

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  if (mode === 'editor' && activeImage) {
    return (
      <EditorWorkspace
        key={activeImage}
        imageSrc={activeImage}
        initialTab={initialTab}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onBackHome={() => setMode('home')}
        onSavedThumbnail={handleSavedThumbnail}
      />
    );
  }

  if (mode === 'collage') {
    return (
      <CollageStudio
        lang={lang}
        theme={theme}
        onBackHome={() => setMode('home')}
        onSendToEditor={(url) => handleOpenEditor(url, 'filters')}
      />
    );
  }

  if (mode === 'camera') {
    return (
      <BeautyCamera
        lang={lang}
        theme={theme}
        onBackHome={() => setMode('home')}
        onCaptureToEditor={(url) => handleOpenEditor(url, 'beauty')}
      />
    );
  }

  return (
    <HomeScreen
      lang={lang}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
      onOpenEditor={handleOpenEditor}
      onOpenCollage={() => setMode('collage')}
      onOpenCamera={() => setMode('camera')}
      recentThumbs={recentThumbs}
      canInstallPWA={Boolean(installPrompt)}
      onInstallPWA={handleInstallPWA}
    />
  );
};

export default App;
