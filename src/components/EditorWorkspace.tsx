import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Aperture,
  Brush,
  Columns2,
  Crop,
  Download,
  Eraser,
  Eye,
  Frame,
  Grid,
  Home,
  Moon,
  Palette,
  Redo2,
  RotateCcw,
  Scissors,
  Sliders,
  Smile,
  Sparkles,
  Sticker,
  Sun,
  Type,
  Undo2,
  Wand2,
  Waves,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { detectFaceLandmarks, segmentPersonMask } from '../engine/mediapipe';
import { renderEditedCanvas } from '../engine/renderPipeline';
import { useT } from '../i18n/translations';
import {
  createDefaultEditorState,
  DetectedFace,
  EditorState,
  EditorTab,
  Language,
  SegmentationMask,
  StrokePoint,
  ThemeMode,
} from '../types/editor';
import { ExportModal } from './ExportModal';
import { ActiveBrushConfig, ToolPanels } from './ToolPanels';

interface EditorWorkspaceProps {
  imageSrc: string;
  initialTab?: EditorTab;
  lang: Language;
  setLang: (l: Language) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  onBackHome: () => void;
  onSavedThumbnail: (url: string) => void;
}

const TOOL_TABS: Array<{ id: EditorTab; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'beauty', icon: Sparkles },
  { id: 'reshape', icon: Smile },
  { id: 'makeup', icon: Palette },
  { id: 'filters', icon: Wand2 },
  { id: 'adjust', icon: Sliders },
  { id: 'hsl', icon: Activity },
  { id: 'curves', icon: Activity },
  { id: 'crop', icon: Crop },
  { id: 'blur', icon: Aperture },
  { id: 'ai', icon: Sparkles },
  { id: 'cutout', icon: Scissors },
  { id: 'liquify', icon: Waves },
  { id: 'erase', icon: Eraser },
  { id: 'mosaic', icon: Grid },
  { id: 'stickers', icon: Sticker },
  { id: 'text', icon: Type },
  { id: 'doodle', icon: Brush },
  { id: 'frame', icon: Frame },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  imageSrc,
  initialTab = 'beauty',
  lang,
  setLang,
  theme,
  setTheme,
  onBackHome,
  onSavedThumbnail,
}) => {
  const t = useT(lang);
  const dark = theme === 'dark';

  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [state, setState] = useState<EditorState>(() => createDefaultEditorState());
  const [history, setHistory] = useState<EditorState[]>(() => [createDefaultEditorState()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // AI states
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [faceStatus, setFaceStatus] = useState<'loading' | 'found' | 'none'>('loading');
  const [segMask, setSegMask] = useState<SegmentationMask | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  // View controls
  const [zoom, setZoom] = useState(1);
  const [comparing, setComparing] = useState(false);
  const [splitCompare, setSplitCompare] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [exportOpen, setExportOpen] = useState(false);

  // Active brush & selections
  const [brushConfig, setBrushConfig] = useState<ActiveBrushConfig>({
    eraseRadius: 0.024,
    mosaicMode: 'pixel',
    mosaicSize: 0.045,
    mosaicStrength: 50,
    liquifyMode: 'push',
    liquifyRadius: 0.11,
    liquifyStrength: 0.55,
    doodleType: 'sparkle',
    doodleColor: '#FF4F7B',
    doodleSize: 0.018,
    doodleOpacity: 1,
  });

  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Canvas & interaction refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Live stroke / drag interaction state
  const dragModeRef = useRef<
    | null
    | { kind: 'erase'; points: StrokePoint[] }
    | { kind: 'mosaic'; points: StrokePoint[] }
    | { kind: 'doodle'; points: StrokePoint[] }
    | { kind: 'liquify'; lastX: number; lastY: number }
    | { kind: 'blurFocus' }
    | { kind: 'sticker'; id: string; offsetX: number; offsetY: number }
    | { kind: 'text'; id: string; offsetX: number; offsetY: number }
    | { kind: 'bodyBand'; edge: 'top' | 'bottom' }
    | { kind: 'cropCorner'; corner: 'tl' | 'tr' | 'bl' | 'br' }
  >(null);
  const [livePreviewPath, setLivePreviewPath] = useState<StrokePoint[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // History management
  const pushHistory = useCallback((snapshot: EditorState) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, structuredClone(snapshot)].slice(-35);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const updateState = useCallback(
    (updater: (prev: EditorState) => EditorState, commit = false) => {
      setState((prev) => {
        const next = updater(prev);
        if (commit) {
          setTimeout(() => pushHistory(next), 0);
        }
        return next;
      });
    },
    [pushHistory]
  );

  const commitHistory = useCallback(() => {
    pushHistory(stateRef.current);
  }, [pushHistory]);

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    setState(structuredClone(history[nextIdx]));
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setState(structuredClone(history[nextIdx]));
  };

  const handleResetAll = () => {
    const fresh = createDefaultEditorState();
    setState(fresh);
    pushHistory(fresh);
    setSelectedStickerId(null);
    setSelectedTextId(null);
  };

  // Load source image + run MediaPipe 478-point Face Landmarker automatically!
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (cancelled) return;
      setSourceImage(img);
      setFaceStatus('loading');
      setSegMask(null);

      // Run AI Face Detection
      const detected = await detectFaceLandmarks(img);
      if (!cancelled) {
        setFaces(detected);
        setFaceStatus(detected.length > 0 ? 'found' : 'none');
      }

      // If opened directly into Cutout tab, run AI segmentation right away!
      if (initialTab === 'cutout' && !cancelled) {
        setIsSegmenting(true);
        const mask = await segmentPersonMask(img);
        if (!cancelled) {
          setSegMask(mask);
          setIsSegmenting(false);
          setState((prev) => ({
            ...prev,
            cutout: { ...prev.cutout, enabled: true },
          }));
        }
      }
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc, initialTab]);

  // Lazy trigger AI segmentation when user opens Cutout or Portrait Bokeh
  const triggerSegmentation = useCallback(async () => {
    if (!sourceImage || segMask || isSegmenting) return;
    setIsSegmenting(true);
    const mask = await segmentPersonMask(sourceImage);
    setSegMask(mask);
    setIsSegmenting(false);
  }, [sourceImage, segMask, isSegmenting]);

  // Render main preview canvas (debounced via requestAnimationFrame for buttery slider response!)
  useEffect(() => {
    if (!sourceImage) return;
    const rafId = requestAnimationFrame(() => {
      const rendered = renderEditedCanvas(sourceImage, state, {
        maxDimension: 920,
        faces,
        segmentationMask: segMask,
      });

      const dst = mainCanvasRef.current;
      if (dst) {
        if (dst.width !== rendered.width || dst.height !== rendered.height) {
          dst.width = rendered.width;
          dst.height = rendered.height;
        }
        const ctx = dst.getContext('2d')!;
        ctx.clearRect(0, 0, dst.width, dst.height);
        ctx.drawImage(rendered, 0, 0);
      }

      if (comparing || splitCompare) {
        const orig = renderEditedCanvas(sourceImage, state, {
          maxDimension: 920,
          faces: [],
          segmentationMask: null,
          skipOverlaysForOriginal: true,
        });
        const oDst = origCanvasRef.current;
        if (oDst) {
          if (oDst.width !== orig.width || oDst.height !== orig.height) {
            oDst.width = orig.width;
            oDst.height = orig.height;
          }
          const oCtx = oDst.getContext('2d')!;
          oCtx.clearRect(0, 0, oDst.width, oDst.height);
          oCtx.drawImage(orig, 0, 0);
        }
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [sourceImage, state, faces, segMask, comparing, splitCompare]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Normalized canvas coordinates [0..1]
  const getNormPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const rect = mainCanvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const isInteractiveCanvasTab = useMemo(
    () =>
      activeTab === 'erase' ||
      activeTab === 'mosaic' ||
      activeTab === 'doodle' ||
      activeTab === 'liquify' ||
      (activeTab === 'blur' && (state.blur.mode === 'radial' || state.blur.mode === 'linear')) ||
      activeTab === 'stickers' ||
      activeTab === 'text',
    [activeTab, state.blur.mode]
  );

  // Canvas direct pointer interaction
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current) return;
    const pt = getNormPoint(e);
    setCursorPos(pt);

    if (activeTab === 'erase') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = { kind: 'erase', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'mosaic') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = { kind: 'mosaic', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'doodle') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = { kind: 'doodle', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'liquify') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = { kind: 'liquify', lastX: pt.x, lastY: pt.y };
      if (brushConfig.liquifyMode !== 'push') {
        updateState((prev) => ({
          ...prev,
          liquify: [
            ...prev.liquify,
            {
              id: `liq_${Date.now()}`,
              mode: brushConfig.liquifyMode,
              radius: brushConfig.liquifyRadius,
              strength: brushConfig.liquifyStrength,
              fromX: pt.x,
              fromY: pt.y,
              toX: pt.x,
              toY: pt.y,
            },
          ],
        }));
      }
    } else if (activeTab === 'blur' && (state.blur.mode === 'radial' || state.blur.mode === 'linear')) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = { kind: 'blurFocus' };
      updateState((prev) => ({
        ...prev,
        blur: { ...prev.blur, centerX: pt.x, centerY: pt.y },
      }));
    } else if (activeTab === 'stickers' && state.stickers.length > 0) {
      // Hit-test topmost sticker
      for (let i = state.stickers.length - 1; i >= 0; i--) {
        const s = state.stickers[i];
        if (Math.hypot(s.x - pt.x, s.y - pt.y) < 0.12 * s.scale) {
          e.currentTarget.setPointerCapture(e.pointerId);
          setSelectedStickerId(s.id);
          dragModeRef.current = { kind: 'sticker', id: s.id, offsetX: s.x - pt.x, offsetY: s.y - pt.y };
          return;
        }
      }
    } else if (activeTab === 'text' && state.texts.length > 0) {
      for (let i = state.texts.length - 1; i >= 0; i--) {
        const tx = state.texts[i];
        if (Math.hypot(tx.x - pt.x, tx.y - pt.y) < 0.18) {
          e.currentTarget.setPointerCapture(e.pointerId);
          setSelectedTextId(tx.id);
          dragModeRef.current = { kind: 'text', id: tx.id, offsetX: tx.x - pt.x, offsetY: tx.y - pt.y };
          return;
        }
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormPoint(e);
    setCursorPos(pt);
    const dm = dragModeRef.current;
    if (!dm) return;

    if (dm.kind === 'erase' || dm.kind === 'mosaic' || dm.kind === 'doodle') {
      const last = dm.points[dm.points.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) > 0.004) {
        dm.points.push(pt);
        setLivePreviewPath([...dm.points]);
      }
    } else if (dm.kind === 'liquify') {
      const dist = Math.hypot(pt.x - dm.lastX, pt.y - dm.lastY);
      if (brushConfig.liquifyMode === 'push' && dist > 0.012) {
        const fromX = dm.lastX;
        const fromY = dm.lastY;
        dm.lastX = pt.x;
        dm.lastY = pt.y;
        updateState((prev) => ({
          ...prev,
          liquify: [
            ...prev.liquify,
            {
              id: `liq_${Date.now()}_${Math.random()}`,
              mode: 'push',
              radius: brushConfig.liquifyRadius,
              strength: brushConfig.liquifyStrength,
              fromX,
              fromY,
              toX: pt.x,
              toY: pt.y,
            },
          ],
        }));
      }
    } else if (dm.kind === 'blurFocus') {
      updateState((prev) => ({
        ...prev,
        blur: { ...prev.blur, centerX: pt.x, centerY: pt.y },
      }));
    } else if (dm.kind === 'sticker') {
      updateState((prev) => ({
        ...prev,
        stickers: prev.stickers.map((s) =>
          s.id === dm.id
            ? {
                ...s,
                x: Math.max(0.02, Math.min(0.98, pt.x + dm.offsetX)),
                y: Math.max(0.02, Math.min(0.98, pt.y + dm.offsetY)),
              }
            : s
        ),
      }));
    } else if (dm.kind === 'text') {
      updateState((prev) => ({
        ...prev,
        texts: prev.texts.map((tx) =>
          tx.id === dm.id
            ? {
                ...tx,
                x: Math.max(0.04, Math.min(0.96, pt.x + dm.offsetX)),
                y: Math.max(0.04, Math.min(0.96, pt.y + dm.offsetY)),
              }
            : tx
        ),
      }));
    }
  };

  const handleCanvasPointerUp = () => {
    const dm = dragModeRef.current;
    dragModeRef.current = null;
    setLivePreviewPath([]);
    if (!dm) return;

    if (dm.kind === 'erase' && dm.points.length > 0) {
      updateState(
        (prev) => ({
          ...prev,
          heals: [
            ...prev.heals,
            { id: `heal_${Date.now()}`, radius: brushConfig.eraseRadius, points: dm.points },
          ],
        }),
        true
      );
    } else if (dm.kind === 'mosaic' && dm.points.length > 0) {
      updateState(
        (prev) => ({
          ...prev,
          mosaics: [
            ...prev.mosaics,
            {
              id: `mos_${Date.now()}`,
              mode: brushConfig.mosaicMode,
              size: brushConfig.mosaicSize,
              strength: brushConfig.mosaicStrength,
              points: dm.points,
            },
          ],
        }),
        true
      );
    } else if (dm.kind === 'doodle' && dm.points.length > 0) {
      updateState(
        (prev) => ({
          ...prev,
          doodles: [
            ...prev.doodles,
            {
              id: `doo_${Date.now()}`,
              brushType: brushConfig.doodleType,
              color: brushConfig.doodleColor,
              size: brushConfig.doodleSize,
              opacity: brushConfig.doodleOpacity,
              points: dm.points,
            },
          ],
        }),
        true
      );
    } else {
      commitHistory();
    }
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        dark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FFF7F9] text-zinc-800'
      }`}
    >
      {/* TOP HEADER BAR */}
      <header
        className={`h-14 shrink-0 px-3 sm:px-4 border-b flex items-center justify-between gap-2 z-20 ${
          dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-pink-100 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              dark ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-pink-50 text-zinc-700'
            }`}
          >
            <Home className="w-4 h-4 text-pink-500" />
            <span className="hidden sm:inline">{t('home')}</span>
          </button>

          <div className="h-5 w-px bg-pink-500/20 hidden sm:block" />

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title={t('undo')}
            className="p-2 rounded-xl hover:bg-pink-500/10 disabled:opacity-35 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title={t('redo')}
            className="p-2 rounded-xl hover:bg-pink-500/10 disabled:opacity-35 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            title={t('resetAll')}
            className="p-2 rounded-xl hover:bg-pink-500/10 text-zinc-400 hover:text-pink-500 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* AI Face Status Badge */}
          <span
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              faceStatus === 'found'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : faceStatus === 'loading'
                  ? 'bg-pink-500/15 text-pink-500 animate-pulse'
                  : 'bg-zinc-500/15 text-zinc-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                faceStatus === 'found'
                  ? 'bg-emerald-500'
                  : faceStatus === 'loading'
                    ? 'bg-pink-500'
                    : 'bg-zinc-400'
              }`}
            />
            {faceStatus === 'found'
              ? `${t('faceDetected')} (${faces.length})`
              : faceStatus === 'loading'
                ? t('faceDetecting')
                : lang === 'th'
                  ? 'โหมดแต่งภาพทั่วไป'
                  : 'General Mode'}
          </span>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center gap-1 bg-pink-500/10 rounded-xl px-1.5 py-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              className="p-1 hover:text-pink-500"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="text-[11px] font-bold px-1.5 tabular-nums hover:text-pink-500"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              className="p-1 hover:text-pink-500"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hold Before/After */}
          <button
            type="button"
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border select-none ${
              comparing
                ? 'meitu-gradient text-white border-transparent'
                : dark
                  ? 'border-zinc-700 bg-zinc-800 hover:border-pink-500'
                  : 'border-pink-200 bg-pink-50/80 text-pink-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('compare')}</span>
          </button>

          {/* Split-Screen Compare */}
          <button
            type="button"
            onClick={() => setSplitCompare((v) => !v)}
            title={t('splitView')}
            className={`p-2 rounded-xl border transition-colors ${
              splitCompare
                ? 'meitu-gradient text-white border-transparent'
                : dark
                  ? 'border-zinc-700 bg-zinc-800'
                  : 'border-pink-200 bg-white text-zinc-600'
            }`}
          >
            <Columns2 className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border ${
              dark ? 'border-zinc-700 bg-zinc-800' : 'border-pink-200 bg-white text-pink-600'
            }`}
          >
            {lang.toUpperCase()}
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border ${
              dark ? 'border-zinc-700 bg-zinc-800 text-amber-400' : 'border-pink-200 bg-white text-zinc-600'
            }`}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Save / Export */}
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="px-3.5 sm:px-4 py-2 rounded-xl meitu-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/25 hover:opacity-95"
          >
            <Download className="w-4 h-4" />
            <span>{t('save')}</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE (Canvas + Inspector) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* CENTER CANVAS STAGE */}
        <div
          className={`flex-1 min-h-0 relative flex items-center justify-center overflow-auto p-4 sm:p-6 ${
            dark ? 'bg-zinc-950' : 'bg-[#FDF0F4]'
          }`}
        >
          {!sourceImage ? (
            <div className="text-sm text-pink-500 animate-pulse font-medium">Loading studio...</div>
          ) : (
            <div
              className="relative inline-flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            >
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl ${
                  state.cutout.enabled && state.cutout.bgType === 'transparent'
                    ? dark
                      ? 'dark-checkerboard-bg'
                      : 'checkerboard-bg'
                    : ''
                }`}
              >
                {/* Edited Main Canvas */}
                <canvas
                  ref={mainCanvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={() => setCursorPos(null)}
                  className={`max-h-[48vh] lg:max-h-[72vh] max-w-[92vw] lg:max-w-[64vw] w-auto h-auto block touch-none select-none ${
                    isInteractiveCanvasTab ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                />

                {/* Hold-to-Compare Original Overlay */}
                <canvas
                  ref={origCanvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity ${
                    comparing ? 'opacity-100' : splitCompare ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={
                    splitCompare && !comparing
                      ? { clipPath: `inset(0 ${100 - splitPos}% 0 0)` }
                      : undefined
                  }
                />

                {/* Split-Screen Draggable Handle */}
                {splitCompare && !comparing && (
                  <>
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
                      style={{ left: `${splitPos}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitPos}
                      onChange={(e) => setSplitPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      aria-label="Split compare slider"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold pointer-events-none">
                      BEFORE
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-pink-500/85 text-white text-[10px] font-bold pointer-events-none">
                      AFTER
                    </span>
                  </>
                )}

                {comparing && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 text-white text-[11px] font-bold pointer-events-none">
                    ORIGINAL
                  </span>
                )}

                {/* Live Stroke Preview SVG overlay (Magic Eraser / Mosaic / Doodle) */}
                {livePreviewPath.length > 0 && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polyline
                      fill="none"
                      stroke={activeTab === 'erase' ? 'rgba(255,79,123,0.65)' : 'rgba(255,255,255,0.85)'}
                      strokeWidth={
                        activeTab === 'erase'
                          ? brushConfig.eraseRadius * 160
                          : activeTab === 'mosaic'
                            ? brushConfig.mosaicSize * 160
                            : brushConfig.doodleSize * 140
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={livePreviewPath.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                    />
                  </svg>
                )}

                {/* Brush Ring Cursor Indicator */}
                {cursorPos &&
                  (activeTab === 'erase' ||
                    activeTab === 'mosaic' ||
                    activeTab === 'liquify' ||
                    activeTab === 'doodle') && (
                    <div
                      className="absolute rounded-full border-2 border-pink-400 bg-pink-500/15 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-sm"
                      style={{
                        left: `${cursorPos.x * 100}%`,
                        top: `${cursorPos.y * 100}%`,
                        width: `${
                          (activeTab === 'erase'
                            ? brushConfig.eraseRadius * 2
                            : activeTab === 'mosaic'
                              ? brushConfig.mosaicSize * 2
                              : activeTab === 'liquify'
                                ? brushConfig.liquifyRadius * 2
                                : brushConfig.doodleSize * 2) * 100
                        }%`,
                        aspectRatio: '1/1',
                      }}
                    />
                  )}

                {/* Bokeh Focus Point Ring */}
                {activeTab === 'blur' &&
                  (state.blur.mode === 'radial' || state.blur.mode === 'linear') && (
                    <div
                      className="absolute rounded-full border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(255,79,123,0.9)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${state.blur.centerX * 100}%`,
                        top: `${state.blur.centerY * 100}%`,
                        width: `${state.blur.radius * 180}%`,
                        aspectRatio: '1/1',
                      }}
                    />
                  )}

                {/* Body Tall / Leg Lengthener Band Guide Overlay */}
                {activeTab === 'liquify' && state.bodyStretch.enabled && (
                  <div
                    className="absolute inset-x-0 bg-pink-500/15 border-y-2 border-pink-500 pointer-events-none"
                    style={{
                      top: `${state.bodyStretch.topY * 100}%`,
                      height: `${(state.bodyStretch.bottomY - state.bodyStretch.topY) * 100}%`,
                    }}
                  >
                    <div className="flex justify-between px-2 py-0.5 text-[10px] font-bold text-white bg-pink-500/80">
                      <span>TALL STRETCH ZONE</span>
                      <span>+{state.bodyStretch.amount}%</span>
                    </div>
                  </div>
                )}

                {/* Selected Sticker / Text Visual Drag Reticle */}
                {activeTab === 'stickers' &&
                  selectedStickerId &&
                  (() => {
                    const sel = state.stickers.find((s) => s.id === selectedStickerId);
                    if (!sel) return null;
                    return (
                      <div
                        className="absolute border-2 border-dashed border-pink-500 rounded-xl pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
                        style={{
                          left: `${sel.x * 100}%`,
                          top: `${sel.y * 100}%`,
                          width: `${Math.min(60, 18 * sel.scale)}%`,
                          height: `${Math.min(60, 14 * sel.scale)}%`,
                        }}
                      />
                    );
                  })()}
                {activeTab === 'text' &&
                  selectedTextId &&
                  (() => {
                    const sel = state.texts.find((tx) => tx.id === selectedTextId);
                    if (!sel) return null;
                    return (
                      <div
                        className="absolute border-2 border-dashed border-pink-500 rounded-xl pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
                        style={{
                          left: `${sel.x * 100}%`,
                          top: `${sel.y * 100}%`,
                          width: '38%',
                          height: '12%',
                        }}
                      />
                    );
                  })()}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT STUDIO INSPECTOR PANEL (Desktop) / COMPACT BOTTOM PANEL (Mobile) */}
        <aside
          className={`w-full lg:w-80 xl:w-88 shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col max-h-[36vh] lg:max-h-none ${
            dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100'
          }`}
        >
          <div className="px-4 py-2.5 border-b border-pink-500/10 flex items-center justify-between shrink-0">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-pink-500">
              {t(`tab_${activeTab}` as Parameters<typeof t>[0])}
            </h2>
            {activeTab === 'liquify' && state.bodyStretch.enabled && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    updateState((prev) => ({
                      ...prev,
                      bodyStretch: {
                        ...prev.bodyStretch,
                        topY: Math.max(0.2, prev.bodyStretch.topY - 0.05),
                      },
                    }))
                  }
                  className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-500 font-bold"
                >
                  Band ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateState((prev) => ({
                      ...prev,
                      bodyStretch: {
                        ...prev.bodyStretch,
                        topY: Math.min(0.75, prev.bodyStretch.topY + 0.05),
                      },
                    }))
                  }
                  className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-500 font-bold"
                >
                  Band ↓
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <ToolPanels
              activeTab={activeTab}
              state={state}
              updateState={updateState}
              commitHistory={commitHistory}
              lang={lang}
              dark={dark}
              hasFace={faces.length > 0}
              isSegmenting={isSegmenting}
              onTriggerCutout={triggerSegmentation}
              brushConfig={brushConfig}
              setBrushConfig={setBrushConfig}
              selectedStickerId={selectedStickerId}
              setSelectedStickerId={setSelectedStickerId}
              selectedTextId={selectedTextId}
              setSelectedTextId={setSelectedTextId}
            />
          </div>
        </aside>
      </div>

      {/* BOTTOM MEITU 18-TOOL DOCK */}
      <nav
        className={`h-16 shrink-0 border-t flex items-center gap-1 px-2 sm:px-4 overflow-x-auto no-scrollbar z-20 ${
          dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-pink-100'
        }`}
      >
        {TOOL_TABS.map(({ id, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                if (id === 'cutout') triggerSegmentation();
              }}
              className={`shrink-0 px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 min-w-[66px] transition-all ${
                active
                  ? 'meitu-gradient text-white shadow-md shadow-pink-500/25 -translate-y-0.5'
                  : dark
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    : 'text-zinc-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold whitespace-nowrap">
                {t(`tab_${id}` as Parameters<typeof t>[0])}
              </span>
            </button>
          );
        })}
      </nav>

      {/* EXPORT STUDIO MODAL */}
      {sourceImage && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          sourceImage={sourceImage}
          state={state}
          faces={faces}
          segmentationMask={segMask}
          lang={lang}
          dark={dark}
          onSavedCallback={onSavedThumbnail}
        />
      )}
    </div>
  );
};
