import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Aperture,
  Brush,
  ChevronLeft,
  Columns2,
  Crop,
  Eraser,
  Frame,
  Grid,
  Hand,
  Palette,
  Redo2,
  Scissors,
  Sliders,
  Smile,
  Sparkles,
  Sticker,
  Type,
  Undo2,
  Wand2,
  Waves,
} from 'lucide-react';
import { detectFaceLandmarks, segmentPersonMask } from '../engine/mediapipe';
import { renderEditedCanvas } from '../engine/renderPipeline';
import {
  generateFilterThumbnails,
  generateMakeupThumbnails,
} from '../engine/thumbnailGen';
import { useT } from '../i18n/translations';
import {
  ActiveBrushConfig,
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
import { MeituMobileSheet } from './MeituMobileSheet';

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

const MAIN_DOCK_TOOLS: Array<{
  id: EditorTab;
  icon: React.ComponentType<{ className?: string }>;
  th: string;
  en: string;
}> = [
  { id: 'beauty', icon: Sparkles, th: 'บิวตี้ผิว', en: 'Beauty' },
  { id: 'makeup', icon: Palette, th: 'เมคอัพ', en: 'Makeup' },
  { id: 'reshape', icon: Smile, th: 'โครงหน้า', en: 'Reshape' },
  { id: 'filters', icon: Wand2, th: 'ฟิลเตอร์', en: 'Filters' },
  { id: 'adjust', icon: Sliders, th: 'ปรับสี', en: 'Adjust' },
  { id: 'ai', icon: Sparkles, th: 'AI สไตล์', en: 'AI Art' },
  { id: 'cutout', icon: Scissors, th: 'ไดคัท', en: 'Cutout' },
  { id: 'blur', icon: Aperture, th: 'โบเก้', en: 'Bokeh' },
  { id: 'erase', icon: Eraser, th: 'ยางลบ', en: 'Eraser' },
  { id: 'liquify', icon: Waves, th: 'ลิควิฟาย', en: 'Liquify' },
  { id: 'mosaic', icon: Grid, th: 'โมเสก', en: 'Mosaic' },
  { id: 'crop', icon: Crop, th: 'ครอป', en: 'Crop' },
  { id: 'stickers', icon: Sticker, th: 'สติกเกอร์', en: 'Stickers' },
  { id: 'text', icon: Type, th: 'ข้อความ', en: 'Text' },
  { id: 'doodle', icon: Brush, th: 'ปากกา', en: 'Brush' },
  { id: 'frame', icon: Frame, th: 'กรอบรูป', en: 'Frame' },
  { id: 'hsl', icon: Activity, th: 'HSL', en: 'HSL' },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  imageSrc,
  initialTab = 'filters',
  lang,
  setLang,
  onBackHome,
  onSavedThumbnail,
}) => {
  const t = useT(lang);

  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [state, setState] = useState<EditorState>(() => createDefaultEditorState());
  const [history, setHistory] = useState<EditorState[]>(() => [createDefaultEditorState()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const toolSnapshotRef = useRef<EditorState>(createDefaultEditorState());

  // AI & Live Thumbnails
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [faceStatus, setFaceStatus] = useState<'loading' | 'found' | 'none'>('loading');
  const [segMask, setSegMask] = useState<SegmentationMask | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [filterThumbs, setFilterThumbs] = useState<Record<string, string>>({});
  const [makeupThumbs, setMakeupThumbs] = useState<Record<string, string>>({});
  const [autoColor, setAutoColor] = useState(false);

  // Mobile Viewport Pinch-to-Zoom, Pan & Auto Face Zoom!
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // in % offsets
  const [faceFocused, setFaceFocused] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [splitCompare, setSplitCompare] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [exportOpen, setExportOpen] = useState(false);

  // Brush & overlay selection state
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

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Touch pinch-zoom tracking
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Drawing / dragging ref
  const dragModeRef = useRef<
    | null
    | { kind: 'erase'; points: StrokePoint[] }
    | { kind: 'mosaic'; points: StrokePoint[] }
    | { kind: 'doodle'; points: StrokePoint[] }
    | { kind: 'liquify'; lastX: number; lastY: number }
    | { kind: 'blurFocus' }
    | { kind: 'sticker'; id: string; offsetX: number; offsetY: number }
    | { kind: 'text'; id: string; offsetX: number; offsetY: number }
  >(null);
  const [livePreviewPath, setLivePreviewPath] = useState<StrokePoint[]>([]);

  // History helpers
  const pushHistory = useCallback(
    (snapshot: EditorState) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const next = [...sliced, structuredClone(snapshot)].slice(-35);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex]
  );

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

  // Open a tool sub-sheet (takes snapshot so ✕ can revert cleanly!)
  const openTool = (tab: EditorTab) => {
    toolSnapshotRef.current = structuredClone(stateRef.current);
    setActiveTab(tab);
    setSheetOpen(true);
    if (tab === 'cutout') triggerSegmentation();
  };

  const handleCancelTool = () => {
    setState(structuredClone(toolSnapshotRef.current));
    setSheetOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFaceFocused(false);
  };

  const handleConfirmTool = () => {
    commitHistory();
    setSheetOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFaceFocused(false);
  };

  // Toggle "ปรับสีอัตโนมัติ" (Screenshot 1 exact feature!)
  const handleToggleAutoColor = () => {
    setAutoColor((wasOn) => {
      const next = !wasOn;
      updateState(
        (prev) => ({
          ...prev,
          adjust: {
            ...prev.adjust,
            exposure: next ? prev.adjust.exposure + 7 : Math.max(-100, prev.adjust.exposure - 7),
            contrast: next ? prev.adjust.contrast + 9 : Math.max(-100, prev.adjust.contrast - 9),
            vibrance: next ? prev.adjust.vibrance + 14 : Math.max(-100, prev.adjust.vibrance - 14),
            clarity: next ? prev.adjust.clarity + 8 : Math.max(-100, prev.adjust.clarity - 8),
          },
        }),
        true
      );
      return next;
    });
  };

  // Focus smoothly onto detected face (just like Screenshot 2!)
  const focusOnFace = useCallback(
    (enable: boolean) => {
      if (!enable || faces.length === 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setFaceFocused(false);
        return;
      }
      const box = faces[0].box;
      const cx = box.x + box.w * 0.5;
      const cy = box.y + box.h * 0.5;
      const targetZoom = Math.min(2.6, Math.max(1.55, 0.56 / Math.max(box.w, box.h)));
      setZoom(targetZoom);
      setPan({
        x: (0.5 - cx) * 100,
        y: (0.48 - cy) * 100,
      });
      setFaceFocused(true);
    },
    [faces]
  );

  // Auto-zoom to face when entering Makeup or Reshape (matches Screenshot 2!)
  useEffect(() => {
    if (sheetOpen && (activeTab === 'makeup' || activeTab === 'reshape') && faces.length > 0) {
      focusOnFace(true);
    } else if (!sheetOpen || activeTab === 'filters' || activeTab === 'frame' || activeTab === 'crop') {
      focusOnFace(false);
    }
  }, [activeTab, sheetOpen, faces, focusOnFace]);

  // Load source image + generate live Filter Thumbnails + run MediaPipe 478-point Face Mesh + Makeup Thumbnails!
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (cancelled) return;
      setSourceImage(img);
      setFaceStatus('loading');
      setSegMask(null);

      // Generate live filter thumbnails immediately so Filter cards show user's real photo!
      setTimeout(() => {
        if (!cancelled) {
          setFilterThumbs(generateFilterThumbnails(img, 112));
        }
      }, 20);

      // Run MediaPipe 478-point Face Landmarker
      const detected = await detectFaceLandmarks(img);
      if (!cancelled) {
        setFaces(detected);
        setFaceStatus(detected.length > 0 ? 'found' : 'none');
        // Generate live face-cropped Makeup Look thumbnails (Plum Berry, Sweet Peach, Wonyoung, etc.)!
        setTimeout(() => {
          if (!cancelled) {
            setMakeupThumbs(generateMakeupThumbnails(img, detected, 112));
          }
        }, 30);
      }

      if (initialTab === 'cutout' && !cancelled) {
        setIsSegmenting(true);
        const mask = await segmentPersonMask(img);
        if (!cancelled) {
          setSegMask(mask);
          setIsSegmenting(false);
          setState((prev) => ({ ...prev, cutout: { ...prev.cutout, enabled: true } }));
        }
      }
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc, initialTab]);

  const triggerSegmentation = useCallback(async () => {
    if (!sourceImage || segMask || isSegmenting) return;
    setIsSegmenting(true);
    const mask = await segmentPersonMask(sourceImage);
    setSegMask(mask);
    setIsSegmenting(false);
  }, [sourceImage, segMask, isSegmenting]);

  // Render preview canvas cleanly
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

  const isBrushOrOverlayTab = useMemo(
    () =>
      sheetOpen &&
      (activeTab === 'erase' ||
        activeTab === 'mosaic' ||
        activeTab === 'doodle' ||
        activeTab === 'liquify' ||
        (activeTab === 'blur' && (state.blur.mode === 'radial' || state.blur.mode === 'linear')) ||
        activeTab === 'stickers' ||
        activeTab === 'text'),
    [sheetOpen, activeTab, state.blur.mode]
  );

  const getNormPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const rect = mainCanvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  // Unified mobile touch gestures (Pinch-Zoom + Pan + Double-Tap + Brush Tools!)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch zoom!
    if (activePointersRef.current.size === 2) {
      dragModeRef.current = null;
      panStartRef.current = null;
      const pts = Array.from(activePointersRef.current.values());
      pinchStartRef.current = {
        dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
        zoom,
      };
      return;
    }

    // Double-tap to zoom (when not brushing)
    if (!isBrushOrOverlayTab) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        lastTapRef.current = 0;
        if (zoom > 1.15) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setFaceFocused(false);
        } else if (faces.length > 0) {
          focusOnFace(true);
        } else {
          setZoom(2);
        }
        return;
      }
      lastTapRef.current = now;

      if (zoom > 1.05) {
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
      return;
    }

    const pt = getNormPoint(e);
    if (activeTab === 'erase') {
      dragModeRef.current = { kind: 'erase', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'mosaic') {
      dragModeRef.current = { kind: 'mosaic', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'doodle') {
      dragModeRef.current = { kind: 'doodle', points: [pt] };
      setLivePreviewPath([pt]);
    } else if (activeTab === 'liquify' && !state.bodyStretch.enabled) {
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
      dragModeRef.current = { kind: 'blurFocus' };
      updateState((prev) => ({ ...prev, blur: { ...prev.blur, centerX: pt.x, centerY: pt.y } }));
    } else if (activeTab === 'stickers' && state.stickers.length > 0) {
      for (let i = state.stickers.length - 1; i >= 0; i--) {
        const s = state.stickers[i];
        if (Math.hypot(s.x - pt.x, s.y - pt.y) < 0.15 * s.scale) {
          setSelectedStickerId(s.id);
          dragModeRef.current = { kind: 'sticker', id: s.id, offsetX: s.x - pt.x, offsetY: s.y - pt.y };
          return;
        }
      }
    } else if (activeTab === 'text' && state.texts.length > 0) {
      for (let i = state.texts.length - 1; i >= 0; i--) {
        const tx = state.texts[i];
        if (Math.hypot(tx.x - pt.x, tx.y - pt.y) < 0.2) {
          setSelectedTextId(tx.id);
          dragModeRef.current = { kind: 'text', id: tx.id, offsetX: tx.x - pt.x, offsetY: tx.y - pt.y };
          return;
        }
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const nextZoom = Math.max(1, Math.min(3.5, pinchStartRef.current.zoom * (dist / Math.max(10, pinchStartRef.current.dist))));
      setZoom(nextZoom);
      if (nextZoom <= 1.05) setPan({ x: 0, y: 0 });
      return;
    }

    // 1-finger pan when zoomed
    if (panStartRef.current && mainCanvasRef.current) {
      const rect = mainCanvasRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - panStartRef.current.x) / (rect.width / zoom)) * 100;
      const dyPct = ((e.clientY - panStartRef.current.y) / (rect.height / zoom)) * 100;
      setPan({
        x: Math.max(-45, Math.min(45, panStartRef.current.panX + dxPct)),
        y: Math.max(-45, Math.min(45, panStartRef.current.panY + dyPct)),
      });
      return;
    }

    const dm = dragModeRef.current;
    if (!dm || !mainCanvasRef.current) return;
    const pt = getNormPoint(e);

    if (dm.kind === 'erase' || dm.kind === 'mosaic' || dm.kind === 'doodle') {
      const last = dm.points[dm.points.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) > 0.005) {
        dm.points.push(pt);
        setLivePreviewPath([...dm.points]);
      }
    } else if (dm.kind === 'liquify') {
      if (brushConfig.liquifyMode === 'push' && Math.hypot(pt.x - dm.lastX, pt.y - dm.lastY) > 0.012) {
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
      updateState((prev) => ({ ...prev, blur: { ...prev.blur, centerX: pt.x, centerY: pt.y } }));
    } else if (dm.kind === 'sticker') {
      updateState((prev) => ({
        ...prev,
        stickers: prev.stickers.map((s) =>
          s.id === dm.id
            ? { ...s, x: Math.max(0.02, Math.min(0.98, pt.x + dm.offsetX)), y: Math.max(0.02, Math.min(0.98, pt.y + dm.offsetY)) }
            : s
        ),
      }));
    } else if (dm.kind === 'text') {
      updateState((prev) => ({
        ...prev,
        texts: prev.texts.map((tx) =>
          tx.id === dm.id
            ? { ...tx, x: Math.max(0.04, Math.min(0.96, pt.x + dm.offsetX)), y: Math.max(0.04, Math.min(0.96, pt.y + dm.offsetY)) }
            : tx
        ),
      }));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchStartRef.current = null;
    panStartRef.current = null;

    const dm = dragModeRef.current;
    dragModeRef.current = null;
    setLivePreviewPath([]);
    if (!dm) return;

    if (dm.kind === 'erase' && dm.points.length > 0) {
      updateState(
        (prev) => ({
          ...prev,
          heals: [...prev.heals, { id: `heal_${Date.now()}`, radius: brushConfig.eraseRadius, points: dm.points }],
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
    <div className="h-[100dvh] w-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* SLEEK MEITU MOBILE TOP BAR (Matches Screenshots 1 & 2!) */}
      <header className="shrink-0 px-3 pb-2 safe-top flex items-center justify-between z-30 bg-black/90">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBackHome}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 active:scale-90"
            aria-label={t('home')}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 disabled:opacity-25 hover:bg-white/10"
            title={t('undo')}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 disabled:opacity-25 hover:bg-white/10"
            title={t('redo')}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Iconic Centered White Meitu Pill Badge! (Tap to switch TH/EN) */}
        <button
          type="button"
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="px-2.5 py-0.5 rounded-full bg-white text-black flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
          title="Switch TH / EN"
        >
          <span className="w-4 h-4 rounded-full meitu-gradient flex items-center justify-center text-[9px] font-black text-white">
            m
          </span>
          <span className="text-xs font-extrabold tracking-tight">meitu</span>
          {faceStatus === 'found' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('faceDetected')} />
          )}
          {faceStatus === 'loading' && (
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
          )}
        </button>

        {/* Vibrant Meitu Pink Save Pill */}
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="px-4 py-1.5 rounded-full meitu-gradient text-white text-xs font-bold shadow-md shadow-pink-500/30 active:scale-95 transition-transform"
        >
          {lang === 'th' ? 'บันทึก' : 'Save'}
        </button>
      </header>

      {/* FULL-BLEED EDGE-TO-EDGE PHOTO STAGE (OLED Black!) */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-black">
        {!sourceImage ? (
          <div className="text-xs text-pink-400 animate-pulse">Loading Meitu AI...</div>
        ) : (
          <div
            className="relative flex items-center justify-center w-full h-full overflow-hidden"
            onWheel={(e) => {
              if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
                setZoom((z) => Math.max(1, Math.min(3.5, z - e.deltaY * 0.002)));
              }
            }}
          >
            <div
              className={`relative transition-transform duration-200 ease-out ${
                state.cutout.enabled && state.cutout.bgType === 'transparent'
                  ? 'dark-checkerboard-bg'
                  : ''
              }`}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`,
              }}
            >
              <canvas
                ref={mainCanvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className="max-h-[64dvh] max-w-[100vw] w-auto h-auto block touch-none"
              />

              {/* Original Canvas for Hold Compare & Split Compare */}
              <canvas
                ref={origCanvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  comparing || splitCompare ? 'opacity-100' : 'opacity-0'
                }`}
                style={
                  splitCompare && !comparing
                    ? { clipPath: `inset(0 ${100 - splitPos}% 0 0)` }
                    : undefined
                }
              />

              {/* Split-Screen Handle */}
              {splitCompare && !comparing && (
                <>
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                    style={{ left: `${splitPos}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={splitPos}
                    onChange={(e) => setSplitPos(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  />
                </>
              )}

              {/* Live Brush Stroke Preview */}
              {livePreviewPath.length > 0 && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <polyline
                    fill="none"
                    stroke={activeTab === 'erase' ? 'rgba(255,79,123,0.7)' : 'rgba(255,255,255,0.85)'}
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

              {/* Bokeh Focus Ring */}
              {sheetOpen &&
                activeTab === 'blur' &&
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

              {/* Body Tall Stretch Zone Guide */}
              {sheetOpen && activeTab === 'liquify' && state.bodyStretch.enabled && (
                <div
                  className="absolute inset-x-0 bg-[#FF4F7B]/15 border-y-2 border-[#FF4F7B] pointer-events-none"
                  style={{
                    top: `${state.bodyStretch.topY * 100}%`,
                    height: `${(state.bodyStretch.bottomY - state.bodyStretch.topY) * 100}%`,
                  }}
                >
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#FF4F7B] text-white">
                    TALL +{state.bodyStretch.amount}%
                  </span>
                </div>
              )}
            </div>

            {/* Comparing Badge */}
            {comparing && (
              <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur text-white text-[11px] font-semibold pointer-events-none z-20">
                {lang === 'th' ? 'ก่อนแต่ง' : 'BEFORE'}
              </span>
            )}

            {/* FLOATING BOTTOM-RIGHT MEITU ACTION ICONS (Exact match to Screenshots 1 & 2!) */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2.5 z-20">
              {/* Face Zoom / Full-View Toggle (like Screenshot 2's hand/zoom icon!) */}
              <button
                type="button"
                onClick={() => {
                  if (zoom > 1.15) {
                    focusOnFace(false);
                  } else if (faces.length > 0) {
                    focusOnFace(true);
                  } else {
                    setZoom(1.85);
                  }
                }}
                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border transition-all active:scale-90 ${
                  faceFocused || zoom > 1.15
                    ? 'bg-white text-black border-white'
                    : 'bg-black/45 text-white border-white/25'
                }`}
                title={lang === 'th' ? 'ซูมใบหน้า / เต็มภาพ' : 'Zoom Face / Fit'}
              >
                <Hand className="w-4 h-4" />
              </button>

              {/* Hold-to-Compare OR Double-tap Split Compare (Exact Meitu `[|]` Icon!) */}
              <button
                type="button"
                onPointerDown={() => setComparing(true)}
                onPointerUp={() => setComparing(false)}
                onPointerLeave={() => setComparing(false)}
                onDoubleClick={() => setSplitCompare((v) => !v)}
                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border transition-all active:scale-90 ${
                  comparing || splitCompare
                    ? 'bg-[#FF4F7B] text-white border-[#FF4F7B]'
                    : 'bg-black/45 text-white border-white/25'
                }`}
                title={t('compare')}
              >
                <Columns2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL AREA: Either Authentic Meitu Sub-Sheet (Level 2) OR Main Tool Dock (Level 1) */}
      <div className="shrink-0 bg-black border-t border-white/[0.06] z-30">
        {sheetOpen ? (
          <MeituMobileSheet
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'cutout') triggerSegmentation();
            }}
            onCancelTool={handleCancelTool}
            onConfirmTool={handleConfirmTool}
            state={state}
            updateState={updateState}
            commitHistory={commitHistory}
            lang={lang}
            hasFace={faces.length > 0}
            isSegmenting={isSegmenting}
            onTriggerCutout={triggerSegmentation}
            filterThumbs={filterThumbs}
            makeupThumbs={makeupThumbs}
            autoColor={autoColor}
            onToggleAutoColor={handleToggleAutoColor}
            brushConfig={brushConfig}
            setBrushConfig={setBrushConfig}
            selectedStickerId={selectedStickerId}
            setSelectedStickerId={setSelectedStickerId}
            selectedTextId={selectedTextId}
            setSelectedTextId={setSelectedTextId}
          />
        ) : (
          /* LEVEL 1: MAIN MEITU HORIZONTAL ICON BAR */
          <nav className="flex items-center gap-1 px-2 pt-2.5 pb-2 safe-bottom overflow-x-auto no-scrollbar bg-black">
            {MAIN_DOCK_TOOLS.map(({ id, icon: Icon, th, en }) => (
              <button
                key={id}
                type="button"
                onClick={() => openTool(id)}
                className="shrink-0 w-16 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-zinc-300 hover:text-white active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {lang === 'th' ? th : en}
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>

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
          dark
          onSavedCallback={onSavedThumbnail}
        />
      )}
    </div>
  );
};
