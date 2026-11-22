import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Aperture,
  Brush,
  ChevronLeft,
  ChevronRight,
  Crop,
  Download,
  Eraser,
  Frame,
  Grid,
  Palette,
  Redo2,
  RotateCcw,
  Scissors,
  Sliders,
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
import {
  FaceSlimIcon,
  MeituBrandPill,
  MeituCompareIcon,
  MeituSwatchIcon,
  MeituTouchIcon,
  SkinSmoothIcon,
} from './MeituIcons';
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
  { id: 'beauty', icon: SkinSmoothIcon, th: 'บิวตี้', en: 'Beauty' },
  { id: 'makeup', icon: Palette, th: 'เมคอัพ', en: 'Makeup' },
  { id: 'reshape', icon: FaceSlimIcon, th: 'โครงหน้า', en: 'Reshape' },
  { id: 'filters', icon: Wand2, th: 'ฟิลเตอร์', en: 'Filters' },
  { id: 'adjust', icon: Sliders, th: 'ปรับสี', en: 'Adjust' },
  { id: 'erase', icon: Eraser, th: 'ยางลบ', en: 'Eraser' },
  { id: 'cutout', icon: Scissors, th: 'ไดคัท', en: 'Cutout' },
  { id: 'blur', icon: Aperture, th: 'โบเก้', en: 'Bokeh' },
  { id: 'ai', icon: Sparkles, th: 'AI สไตล์', en: 'AI Art' },
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
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);

  const [state, setState] = useState<EditorState>(() => createDefaultEditorState());
  const [history, setHistory] = useState<EditorState[]>(() => [createDefaultEditorState()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const toolSnapshotRef = useRef<EditorState>(createDefaultEditorState());

  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [faceStatus, setFaceStatus] = useState<'loading' | 'found' | 'none'>('loading');
  const [segMask, setSegMask] = useState<SegmentationMask | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [filterThumbs, setFilterThumbs] = useState<Record<string, string>>({});
  const [makeupThumbs, setMakeupThumbs] = useState<Record<string, string>>({});
  const [autoColor, setAutoColor] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [faceFocused, setFaceFocused] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [splitCompare, setSplitCompare] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [exportOpen, setExportOpen] = useState(false);

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

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

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

  const handleResetAll = () => {
    const fresh = createDefaultEditorState();
    setState(fresh);
    pushHistory(fresh);
    setAutoColor(false);
    setQuickDrawerOpen(false);
  };

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
      const targetZoom = Math.min(2.6, Math.max(1.6, 0.55 / Math.max(box.w, box.h)));
      setZoom(targetZoom);
      setPan({ x: (0.5 - cx) * 100, y: (0.48 - cy) * 100 });
      setFaceFocused(true);
    },
    [faces]
  );

  // Auto-zoom onto detected face when entering Makeup / Reshape (exact Screenshot 2 behavior!)
  useEffect(() => {
    if (sheetOpen && (activeTab === 'makeup' || activeTab === 'reshape') && faces.length > 0) {
      focusOnFace(true);
    } else if (!sheetOpen || activeTab === 'filters' || activeTab === 'frame' || activeTab === 'crop') {
      focusOnFace(false);
    }
  }, [activeTab, sheetOpen, faces, focusOnFace]);

  // Load photo + live thumbnails + MediaPipe 478-point Face Landmarker
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (cancelled) return;
      setSourceImage(img);
      setFaceStatus('loading');
      setSegMask(null);

      setTimeout(() => {
        if (!cancelled) setFilterThumbs(generateFilterThumbnails(img, 112));
      }, 20);

      const detected = await detectFaceLandmarks(img);
      if (!cancelled) {
        setFaces(detected);
        setFaceStatus(detected.length > 0 ? 'found' : 'none');
        setTimeout(() => {
          if (!cancelled) setMakeupThumbs(generateMakeupThumbnails(img, detected, 112));
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

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

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

    if (!isBrushOrOverlayTab) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        lastTapRef.current = 0;
        if (zoom > 1.15) {
          focusOnFace(false);
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

    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const nextZoom = Math.max(1, Math.min(3.5, pinchStartRef.current.zoom * (dist / Math.max(10, pinchStartRef.current.dist))));
      setZoom(nextZoom);
      if (nextZoom <= 1.05) setPan({ x: 0, y: 0 });
      return;
    }

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
      {/* AUTHENTIC MEITU TOP BAR:
          - Inside Tool Sheet (Level 2): ULTRA-MINIMAL centered white `meitu` pill ONLY (exact Screenshots 1 & 2!)
          - Main Editor Dock (Level 1): `<` Back · Undo / Redo · Pink `บันทึก` Save button! */}
      {sheetOpen ? (
        <header className="shrink-0 safe-top pb-1.5 flex items-center justify-center bg-black z-30">
          <MeituBrandPill
            statusDot={faceStatus}
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          />
        </header>
      ) : (
        <header className="shrink-0 px-3 pb-2 safe-top flex items-center justify-between bg-black z-30">
          <button
            type="button"
            onClick={onBackHome}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-90"
            aria-label={t('home')}
          >
            <ChevronLeft className="w-6 h-6 stroke-[1.8]" />
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 disabled:opacity-25 active:scale-90"
              title={t('undo')}
            >
              <Undo2 className="w-[18px] h-[18px] stroke-[1.7]" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 disabled:opacity-25 active:scale-90"
              title={t('redo')}
            >
              <Redo2 className="w-[18px] h-[18px] stroke-[1.7]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="px-4 py-1.5 rounded-full meitu-gradient text-white text-[13px] font-semibold active:scale-95 transition-transform"
          >
            {lang === 'th' ? 'บันทึก' : 'Save'}
          </button>
        </header>
      )}

      {/* FULL-BLEED EDGE-TO-EDGE PHOTO STAGE */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-black">
        {!sourceImage ? (
          <div className="text-xs text-[#FF4F7B] animate-pulse">meitu AI...</div>
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
                className="max-h-[68dvh] max-w-[100vw] w-auto h-auto block touch-none"
              />

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

            {comparing && (
              <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-medium pointer-events-none z-20">
                {lang === 'th' ? 'ต้นฉบับ' : 'BEFORE'}
              </span>
            )}

            {/* EXACT SCREENSHOTS 1 & 2 RIGHT-EDGE FLOATING `<` QUICK TAB */}
            <div className="absolute top-3 right-0 z-30 flex items-start">
              {quickDrawerOpen && (
                <div className="mr-1 py-1.5 px-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex flex-col gap-1 shadow-xl">
                  <button
                    type="button"
                    disabled={historyIndex <= 0}
                    onClick={handleUndo}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-[11px] flex items-center gap-2 disabled:opacity-30"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> {t('undo')}
                  </button>
                  <button
                    type="button"
                    disabled={historyIndex >= history.length - 1}
                    onClick={handleRedo}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-[11px] flex items-center gap-2 disabled:opacity-30"
                  >
                    <Redo2 className="w-3.5 h-3.5" /> {t('redo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitCompare((v) => !v);
                      setQuickDrawerOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-[11px] flex items-center gap-2"
                  >
                    <MeituCompareIcon className="w-3.5 h-3.5" /> {t('splitView')}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-[11px] flex items-center gap-2 text-rose-400"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> {t('resetAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(true);
                      setQuickDrawerOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl meitu-gradient text-white text-[11px] font-semibold flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> {t('save')}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setQuickDrawerOpen((o) => !o)}
                className="w-6 h-12 rounded-l-xl bg-black/45 backdrop-blur-md text-white/90 flex items-center justify-center active:scale-95"
                aria-label="Quick Menu"
              >
                {quickDrawerOpen ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* EXACT SCREENSHOTS 1 & 2 BARE FLOATING BOTTOM-RIGHT ICONS ON PHOTO */}
            <div className="absolute bottom-3 right-3.5 flex items-center gap-4 z-20">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'filters' && sheetOpen) {
                    handleToggleAutoColor();
                  } else if (zoom > 1.15) {
                    focusOnFace(false);
                  } else if (faces.length > 0) {
                    focusOnFace(true);
                  } else {
                    setZoom(1.85);
                  }
                }}
                className={`p-1 drop-shadow-[0_1px_5px_rgba(0,0,0,0.75)] active:scale-90 transition-transform ${
                  faceFocused || (activeTab === 'filters' && autoColor)
                    ? 'text-[#FF4F7B]'
                    : 'text-white'
                }`}
                title={
                  activeTab === 'filters'
                    ? lang === 'th'
                      ? 'ปรับสีอัตโนมัติ'
                      : 'Auto Color'
                    : lang === 'th'
                      ? 'ซูมใบหน้า / เต็มภาพ'
                      : 'Zoom Face'
                }
              >
                {activeTab === 'filters' && sheetOpen ? (
                  <MeituSwatchIcon className="w-[23px] h-[23px]" />
                ) : (
                  <MeituTouchIcon className="w-[23px] h-[23px]" />
                )}
              </button>

              <button
                type="button"
                onPointerDown={() => setComparing(true)}
                onPointerUp={() => setComparing(false)}
                onPointerLeave={() => setComparing(false)}
                onDoubleClick={() => setSplitCompare((v) => !v)}
                className={`p-1 drop-shadow-[0_1px_5px_rgba(0,0,0,0.75)] active:scale-90 transition-transform ${
                  comparing || splitCompare ? 'text-[#FF4F7B]' : 'text-white'
                }`}
                title={t('compare')}
              >
                <MeituCompareIcon className="w-[23px] h-[23px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL AREA */}
      <div className="shrink-0 bg-black z-30">
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
          /* LEVEL 1: AUTHENTIC MEITU BARE MONOCHROME WHITE ICON DOCK */
          <nav className="flex items-center gap-1 px-2 pt-3 pb-2 safe-bottom overflow-x-auto no-scrollbar bg-black border-t border-white/[0.06]">
            {MAIN_DOCK_TOOLS.map(({ id, icon: Icon, th, en }) => (
              <button
                key={id}
                type="button"
                onClick={() => openTool(id)}
                className="shrink-0 w-[64px] py-1 flex flex-col items-center justify-center gap-1.5 text-white/90 hover:text-white active:scale-90 transition-transform"
              >
                <Icon className="w-[22px] h-[22px] stroke-[1.6]" />
                <span className="text-[11px] font-normal text-white/80 whitespace-nowrap">
                  {lang === 'th' ? th : en}
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>

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
