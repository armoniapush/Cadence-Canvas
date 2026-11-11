import { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Plus, Minus, Maximize2 } from 'lucide-react';
import { GlowButton } from '../components/GlowButton';
import { BorderGlow } from '../components/BorderGlow';
import type { Track, Scene, ReadingAnchor } from '../types';
import {
  DawCanvasRenderer,
  computeFitViewport,
  computeMagneticSnap,
  resolveSceneAntiCollision,
  getSceneRect,
  CANVAS_TOP_PAD,
  TRACK_HEIGHT,
  TRACK_GAP,
  TRACK_HEADER_WIDTH,
  PIXELS_PER_UNIT,
  PORT_HIT_RADIUS,
  type Viewport,
  type DragState,
  type CanvasRenderData,
} from './renderer';
import { ContextMenu } from '../components/ContextMenu';

interface DawCanvasProps {
  tracks: Track[];
  scenes: Scene[];
  anchors: ReadingAnchor[];
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene | null) => void;
  onMoveScene: (scene: Scene, trackId: string, tStart: number) => void;
  onCreateScene: (trackId: string, tStart: number, promptText?: string) => void;
  onDeleteScene?: (sceneId: string) => void;
  onToggleMuteTrack?: (trackId: string) => void;
  onCreateAnchor?: (sourceSceneId: string, targetSceneId: string) => void;
  onDuplicateScene?: (scene: Scene) => void;
  onSplitScene?: (scene: Scene) => void;
  onUpdateSceneTitle?: (sceneId: string, newTitle: string) => void;
  showDramaticActs?: boolean;
  onCreateTrackClick?: () => void;
}

export function DawCanvas({
  tracks,
  scenes,
  anchors,
  selectedSceneId,
  onSelectScene,
  onMoveScene,
  onCreateScene,
  onDeleteScene,
  onToggleMuteTrack: _onToggleMuteTrack,
  onCreateAnchor,
  onDuplicateScene,
  onSplitScene,
  onUpdateSceneTitle,
  showDramaticActs = false,
  onCreateTrackClick,
}: DawCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DawCanvasRenderer | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ panX: 32, panY: 0, zoom: 1.0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600, dpr: 1 });

  // Headless magnetic snapping (permanent and active by default)
  const magnetEnabled = true;
  const [connectingWire, setConnectingWire] = useState<{
    fromSceneId: string;
    fromPort: 'in' | 'out';
    toX: number;
    toY: number;
  } | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ sceneId: string; port: 'in' | 'out' } | null>(null);

  // Inline Scene Title Editing State
  const [editingTitleState, setEditingTitleState] = useState<{ id: string; title: string } | null>(null);

  // Floating Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    scene: Scene;
  } | null>(null);

  // Keyboard shortcut listener: Delete or Backspace to remove selected scene
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSceneId || !onDeleteScene) return;

      const activeEl = document.activeElement;
      const isEditingText =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isEditingText) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteScene(selectedSceneId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId, onDeleteScene]);

  // Synchronous drag & connection tracking
  const dragRef = useRef<{
    mx: number;
    my: number;
    s: Scene;
    t0: number;
    trk0: string;
    moved: boolean;
    previewTrackId: string;
    previewTStart: number;
  } | null>(null);

  const connectingWireRef = useRef<{
    fromSceneId: string;
    fromPort: 'in' | 'out';
    toX: number;
    toY: number;
  } | null>(null);

  const panRef = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
    verticalOnly?: boolean;
  } | null>(null);

  const stateRef = useRef<CanvasRenderData>({
    tracks,
    scenes,
    anchors,
    selectedSceneId,
    currentTime: 0,
    dragState,
    viewport,
    dpr: 1,
    width: 800,
    height: 600,
    connectingWire,
    hoveredPort,
  });

  // Always keep stateRef strictly synchronous with the latest component render state
  stateRef.current = {
    tracks,
    scenes,
    anchors,
    selectedSceneId,
    currentTime: 0,
    dragState,
    viewport,
    dpr: size.dpr,
    width: size.width,
    height: size.height,
    connectingWire,
    hoveredPort,
    editingSceneId: editingTitleState?.id || null,
    showDramaticActs,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      setSize({ width, height, dpr });
      if (canvasRef.current) {
        canvasRef.current.width = Math.floor(width * dpr);
        canvasRef.current.height = Math.floor(height * dpr);
        // Instant synchronous repaint prevents 1-frame blank canvas flicker during layout transitions
        rendererRef.current?.render();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new DawCanvasRenderer(canvasRef.current, () => stateRef.current);
    rendererRef.current = renderer;
    renderer.start();
    return () => {
      renderer.stop();
      rendererRef.current = null;
    };
  }, []);

  const capturePointerDefensively = useCallback((pointerId: number) => {
    try {
      containerRef.current?.setPointerCapture?.(pointerId);
    } catch {}
  }, []);

  const releasePointerCaptureDefensively = useCallback((pointerId: number) => {
    try {
      if (containerRef.current?.hasPointerCapture?.(pointerId)) {
        containerRef.current.releasePointerCapture(pointerId);
      }
    } catch {}
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.ctrlKey || e.metaKey) {
      const mx = e.clientX - rect.left;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.min(3.0, Math.max(0.2, viewport.zoom * factor));
      const tAtCursor = (mx - TRACK_HEADER_WIDTH - viewport.panX) / (PIXELS_PER_UNIT * viewport.zoom);
      setViewport((prev) => ({
        ...prev,
        zoom: newZoom,
        panX: mx - TRACK_HEADER_WIDTH - tAtCursor * (PIXELS_PER_UNIT * newZoom),
      }));
    } else if (e.shiftKey) {
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaY,
      }));
    } else {
      const totalTracksHeight = tracks.length * (TRACK_HEIGHT + TRACK_GAP) + CANVAS_TOP_PAD;
      const maxScrollY = Math.max(0, totalTracksHeight - (rect.height - 120));
      setViewport((prev) => ({
        ...prev,
        panY: Math.max(-maxScrollY, Math.min(0, prev.panY - e.deltaY)),
      }));
    }
  }, [viewport, tracks.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Dismiss context menu if open
    setContextMenu(null);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    // 1. Port Hit Detection (dragging causal cables)
    if (e.button === 0) {
      for (let i = scenes.length - 1; i >= 0; i--) {
        const s = scenes[i], r = getSceneRect(s, tracks, viewport);
        // In-Port: left edge
        if (Math.hypot(mx - r.x, my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS) {
          connectingWireRef.current = {
            fromSceneId: s.id,
            fromPort: 'in',
            toX: mx,
            toY: my,
          };
          setConnectingWire({ ...connectingWireRef.current });
          capturePointerDefensively(e.pointerId);
          return;
        }
        // Out-Port: right edge
        if (Math.hypot(mx - (r.x + r.w), my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS) {
          connectingWireRef.current = {
            fromSceneId: s.id,
            fromPort: 'out',
            toX: mx,
            toY: my,
          };
          setConnectingWire({ ...connectingWireRef.current });
          capturePointerDefensively(e.pointerId);
          return;
        }
      }
    }

    // 2. Scene hit detection strictly within visible canvas
    let hitScene: Scene | null = null;
    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i], r = getSceneRect(s, tracks, viewport);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        hitScene = s;
        break;
      }
    }

    if (hitScene && e.button === 0) {
      // Do NOT select scene immediately on pointer down; wait for pointer up to distinguish click from drag
      dragRef.current = {
        mx,
        my,
        s: hitScene,
        t0: hitScene.t_start,
        trk0: hitScene.track_id,
        moved: false,
        previewTrackId: hitScene.track_id,
        previewTStart: hitScene.t_start,
      };
      capturePointerDefensively(e.pointerId);
    } else if (e.button === 0 || e.button === 1) {
      onSelectScene(null);
      panRef.current = { mx, my, px: viewport.panX, py: viewport.panY, verticalOnly: false };
      capturePointerDefensively(e.pointerId);
    }
  }, [scenes, tracks, viewport, onSelectScene, capturePointerDefensively]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    // A. Handle interactive causal wire dragging
    if (connectingWireRef.current) {
      connectingWireRef.current.toX = mx;
      connectingWireRef.current.toY = my;
      setConnectingWire({ ...connectingWireRef.current });
      return;
    }

    // B. Handle scene dragging with deterministic Magnetic Snapping
    if (dragRef.current) {
      const currentDrag = dragRef.current;
      const dx = mx - currentDrag.mx, dy = my - currentDrag.my;
      if (Math.hypot(dx, dy) > 3) currentDrag.moved = true;
      const dt = Math.round(dx / (PIXELS_PER_UNIT * viewport.zoom));
      const relY = my - CANVAS_TOP_PAD - viewport.panY;
      const idx = Math.max(0, Math.min(tracks.length - 1, Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))));
      const nextTrackId = tracks[idx]?.id || currentDrag.trk0;

      // Magnetic Snapping Calculation
      const rawTStart = currentDrag.t0 + dt;
      // Allow holding Shift to temporarily invert magnet state
      const effectiveMagnet = e.shiftKey ? !magnetEnabled : magnetEnabled;
      const snap = computeMagneticSnap(
        rawTStart,
        currentDrag.s.duration,
        nextTrackId,
        scenes,
        currentDrag.s.id,
        viewport.zoom,
        effectiveMagnet
      );

      // Anti-Collision Spatial Guard: strictly prevents cards from overlapping/transposing on the same track
      const antiCollisionT = resolveSceneAntiCollision(
        snap.snappedTStart,
        currentDrag.s.duration,
        nextTrackId,
        scenes,
        currentDrag.s.id,
        viewport.zoom
      );

      const nextTStart = antiCollisionT;

      // Auto-pan left if dragged close to the track header boundary
      if (mx < TRACK_HEADER_WIDTH + 40 && viewport.panX < 0) {
        setViewport((prev) => ({
          ...prev,
          panX: Math.min(0, prev.panX + 12),
        }));
      }

      currentDrag.previewTrackId = nextTrackId;
      currentDrag.previewTStart = nextTStart;
      setDragState({
        sceneId: currentDrag.s.id,
        previewTrackId: nextTrackId,
        previewTStart: nextTStart,
      });
    } else if (panRef.current) {
      const { px, py, mx: startMx, my: startMy, verticalOnly } = panRef.current;
      const isVert = Boolean(verticalOnly);
      const targetPanX = isVert ? null : px + (mx - startMx);

      const maxScrollY = Math.max(0, tracks.length * (TRACK_HEIGHT + TRACK_GAP) + 120 - rect.height);
      const targetPanY = Math.max(-maxScrollY, Math.min(0, py + (my - startMy)));

      setViewport((prev) => ({
        ...prev,
        panX: targetPanX !== null ? targetPanX : prev.panX,
        panY: targetPanY,
      }));
    } else {
      // Hover detection on ports for cursor feedback
      let foundHoverPort: { sceneId: string; port: 'in' | 'out' } | null = null;
      for (let i = scenes.length - 1; i >= 0; i--) {
        const s = scenes[i], r = getSceneRect(s, tracks, viewport);
        if (Math.hypot(mx - r.x, my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS) {
          foundHoverPort = { sceneId: s.id, port: 'in' };
          break;
        }
        if (Math.hypot(mx - (r.x + r.w), my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS) {
          foundHoverPort = { sceneId: s.id, port: 'out' };
          break;
        }
      }
      setHoveredPort(foundHoverPort);
    }
  }, [tracks, scenes, viewport, magnetEnabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // 1. Finalize connecting wire
    if (connectingWireRef.current) {
      const wire = connectingWireRef.current;
      connectingWireRef.current = null;
      setConnectingWire(null);

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for (let i = scenes.length - 1; i >= 0; i--) {
          const s = scenes[i], r = getSceneRect(s, tracks, viewport);
          if (s.id !== wire.fromSceneId) {
            const isOverPort =
              Math.hypot(mx - r.x, my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS * 1.5 ||
              Math.hypot(mx - (r.x + r.w), my - (r.y + r.h / 2)) <= PORT_HIT_RADIUS * 1.5;
            const isOverCard = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

            if (isOverPort || isOverCard) {
              if (wire.fromPort === 'out') {
                onCreateAnchor?.(wire.fromSceneId, s.id);
              } else {
                onCreateAnchor?.(s.id, wire.fromSceneId);
              }
              break;
            }
          }
        }
      }
      releasePointerCaptureDefensively(e.pointerId);
      return;
    }

    // 2. Finalize scene movement or click selection
    if (dragRef.current) {
      const currentDrag = dragRef.current;
      if (currentDrag.moved) {
        // Drag operation: commit new position, but do NOT open the editor!
        const finalTrackId = currentDrag.previewTrackId ?? currentDrag.trk0;
        const finalTStart = currentDrag.previewTStart ?? currentDrag.t0;
        if (finalTStart !== currentDrag.t0 || finalTrackId !== currentDrag.trk0) {
          onMoveScene(currentDrag.s, finalTrackId, finalTStart);
        }
      } else {
        // Pure click without dragging: now open the editor for this scene!
        onSelectScene(currentDrag.s);
      }
      dragRef.current = null;
      setDragState(null);
    }

    if (panRef.current) {
      panRef.current = null;
    }
    releasePointerCaptureDefensively(e.pointerId);
  }, [scenes, tracks, viewport, onMoveScene, onCreateAnchor, releasePointerCaptureDefensively]);

  // Context Menu Trigger on Right Click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i], r = getSceneRect(s, tracks, viewport);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        onSelectScene(s);
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          scene: s,
        });
        return;
      }
    }
    setContextMenu(null);
  }, [scenes, tracks, viewport, onSelectScene]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (mx < TRACK_HEADER_WIDTH) return;

    // 1. Double click on existing scene card opens inline title editor!
    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i];
      const r = getSceneRect(s, tracks, viewport);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        onSelectScene(s);
        setEditingTitleState({ id: s.id, title: s.title });
        return;
      }
    }

    // 2. Double click on empty track canvas creates new scene
    const relY = my - CANVAS_TOP_PAD - viewport.panY;
    const track = tracks[Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))] || tracks[0];
    if (track) {
      const rawT = Math.max(0, Math.round((mx - TRACK_HEADER_WIDTH - viewport.panX) / (PIXELS_PER_UNIT * viewport.zoom)));
      const snap = computeMagneticSnap(rawT, 60, track.id, scenes, '', viewport.zoom, magnetEnabled);
      onCreateScene(track.id, snap.snappedTStart);
    }
  }, [tracks, scenes, viewport, magnetEnabled, onCreateScene, onSelectScene]);

  // Zoom dock actions
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(3.0, prev.zoom * 1.2),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.25, prev.zoom / 1.2),
    }));
  }, []);

  const handleResetZoom = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: 1.0,
      panX: 32,
      panY: 0,
    }));
  }, []);

  const handleFitView = useCallback(() => {
    const fitted = computeFitViewport(scenes, size.width, 40);
    setViewport(fitted);
  }, [scenes, size.width]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-canvas)',
        cursor: connectingWire ? 'crosshair' : dragState ? 'grabbing' : panRef.current ? 'grab' : hoveredPort ? 'pointer' : 'default',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: size.width, height: size.height }} />

      {/* Pinned Left Track Headers & Mode Indicator ("Marcando en qué estamos como estaba antes") */}
      <aside
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${TRACK_HEADER_WIDTH}px`,
          height: '100%',
          backgroundColor: 'var(--bg-panel, #111215)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.45)',
          zIndex: 35,
          pointerEvents: 'auto',
          overflow: 'hidden',
          userSelect: 'none',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Top Header: SECUENCIA NARRATIVA */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${CANVAS_TOP_PAD}px`,
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'var(--bg-panel, #111215)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#f8fafc',
                fontFamily: 'var(--font-sans)',
              }}
            >
              SECUENCIA NARRATIVA
            </span>
          </div>
        </div>

        {/* Track Lane Cards Container (synced with vertical panY and aligned to track corridor) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}
        >
          {tracks.map((trk, idx) => {
            const trkScenes = scenes.filter((s) => s.track_id === trk.id);
            const trkWords = trkScenes.reduce((sum, s) => sum + (s.word_count || 0), 0);
            // Lane header sits exactly on the swimlane it governs (same top, same height)
            const laneTopY = CANVAS_TOP_PAD + viewport.panY + idx * (TRACK_HEIGHT + TRACK_GAP);
            const isMuted = trk.is_muted;
            const isTrackPrincipal = idx === 0 || trk.name.toLowerCase().includes('principal');
            const isTrackSubB = idx === 1 || trk.name.toLowerCase().includes('b') || trk.name.toLowerCase().includes('subtrama');

            const rimBorderColor = isMuted
              ? 'rgba(255, 255, 255, 0.06)'
              : isTrackPrincipal
              ? 'rgba(14, 165, 233, 0.7)' /* border-b-sky-500/70 */
              : isTrackSubB
              ? 'rgba(16, 185, 129, 0.7)' /* border-b-emerald-500/70 */
              : `${trk.color_hex || '#38bdf8'}B3`;

            return (
              <div
                key={trk.id}
                style={{
                  position: 'absolute',
                  top: `${laneTopY}px`,
                  left: '10px',
                  width: `${TRACK_HEADER_WIDTH - 20}px`,
                  height: `${TRACK_HEIGHT}px`,
                  backgroundColor: isMuted ? 'rgba(18, 20, 29, 0.55)' : 'var(--bg-surface, #12141d)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                  borderBottom: `2px solid ${rimBorderColor}`, /* Rim light, integrated */
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: dragState ? 'none' : 'top 0.05s ease-out',
                  userSelect: 'none',
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
              >
                {/* Top row: Thread channel index + visibility toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {/* Order badge: w-5 h-5 rounded-full bg-zinc-800 border border-white/10 */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '9999px',
                        backgroundColor: '#27272a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: isMuted ? '#71717a' : '#d4d4d8',
                        flexShrink: 0,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.04em',
                        color: 'var(--zinc-500)',
                      }}
                    >
                      CH {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Hardware Visibility / Eye Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      _onToggleMuteTrack?.(trk.id);
                    }}
                    title={isMuted ? 'Mostrar hilo narrativo' : 'Ocultar hilo narrativo'}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '5px',
                      border: isMuted ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                      backgroundColor: isMuted ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: isMuted ? '#fbbf24' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isMuted ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Middle: Track Name (Clean CSS ellipsis truncation) */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: isMuted ? '#64748b' : '#f4f4f5',
                    fontFamily: 'var(--font-sans)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    maxWidth: '100%',
                  }}
                  title={trk.name}
                >
                  {trk.name}
                </div>

                {/* Bottom: Dynamic Telemetry (Clean CSS ellipsis truncation) */}
                <div
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--zinc-500)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    maxWidth: '100%',
                  }}
                >
                  <span>{trkScenes.length} esc</span>
                  <span style={{ margin: '0 4px', color: 'rgba(255, 255, 255, 0.2)' }}>·</span>
                  <span>{trkWords.toLocaleString()} pal</span>
                </div>
              </div>
            );
          })}

          {/* Reconstructed "+ Nuevo Hilo" Button in Left Track Column Footer with React Bits DeepThink Glow */}
          {(() => {
            const addTrackTopY = CANVAS_TOP_PAD + viewport.panY + tracks.length * (TRACK_HEIGHT + TRACK_GAP);
            return (
              <GlowButton
                variant="deepthink"
                glowRadius="12px"
                speed="6s"
                onClick={onCreateTrackClick}
                title="Crear un nuevo hilo narrativo para subtramas, personajes o tramas paralelas"
                style={{
                  position: 'absolute',
                  top: `${addTrackTopY}px`,
                  left: '10px',
                  width: `${TRACK_HEADER_WIDTH - 20}px`,
                  height: `${TRACK_HEIGHT}px`,
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Plus size={14} strokeWidth={1.5} />
                    <span>Nuevo Hilo</span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--zinc-500)',
                      fontFamily: 'var(--font-sans)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    CH 0{tracks.length + 1} · Añadir trama
                  </span>
                </div>
              </GlowButton>
            );
          })()}
        </div>
      </aside>

      {/* Floating Bottom Right Controls Dock with React Bits Border Glow */}
      <BorderGlow
        variant="cyan-violet"
        borderRadius="9999px"
        glowSize={160}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            backgroundColor: 'rgba(10, 12, 18, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '9999px',
            boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Zoom Controls (Matte segmented group) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            <button
              className="btn-icon"
              onClick={handleZoomOut}
              title="Reducir zoom (-)"
              style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minus size={12} strokeWidth={1.5} />
            </button>

            <button
              className="btn btn-ghost"
              onClick={handleResetZoom}
              title="Restablecer zoom al 100%"
              style={{
                padding: '0 6px',
                height: '22px',
                fontSize: '11px',
                fontFamily: 'var(--font-sans)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500,
              }}
            >
              {Math.round(viewport.zoom * 100)}%
            </button>

            <button
              className="btn-icon"
              onClick={handleZoomIn}
              title="Aumentar zoom (+)"
              style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={12} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* View Fit ("Ajustar" to content) button */}
          <button
            className="btn btn-ghost"
            onClick={handleFitView}
            title="Centrar y encuadrar todas las escenas literarias"
            style={{
              height: '24px',
              padding: '0 8px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Maximize2 size={12} strokeWidth={1.5} />
            <span>Ajustar</span>
          </button>
        </div>
      </BorderGlow>

      {/* Floating Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          scene={contextMenu.scene}
          onClose={() => setContextMenu(null)}
          onOpenEditor={(scene) => onSelectScene(scene)}
          onRename={(scene) => setEditingTitleState({ id: scene.id, title: scene.title })}
          onStartConnect={(scene) => {
            const r = getSceneRect(scene, tracks, viewport);
            connectingWireRef.current = {
              fromSceneId: scene.id,
              fromPort: 'out',
              toX: r.x + r.w + 40,
              toY: r.y + r.h / 2,
            };
            setConnectingWire({ ...connectingWireRef.current });
          }}
          onDuplicate={(scene) => onDuplicateScene?.(scene)}
          onSplit={(scene) => onSplitScene?.(scene)}
          onDelete={(sceneId) => onDeleteScene?.(sceneId)}
        />
      )}

      {/* Inline Scene Card Title Editor Overlay (Direct on Canvas) */}
      {editingTitleState && (() => {
        const targetScene = scenes.find((s) => s.id === editingTitleState.id);
        if (!targetScene) return null;
        const r = getSceneRect(targetScene, tracks, viewport);
        if (r.x + r.w < TRACK_HEADER_WIDTH || r.x > size.width || r.y + r.h < CANVAS_TOP_PAD || r.y > size.height) {
          return null;
        }

        const commitEdit = () => {
          const newTitle = editingTitleState.title.trim();
          if (newTitle && onUpdateSceneTitle) {
            onUpdateSceneTitle(targetScene.id, newTitle);
          }
          setEditingTitleState(null);
        };

        const inputLeft = Math.max(TRACK_HEADER_WIDTH + 8, r.x + 24);
        const inputWidth = Math.min(Math.max(160, r.w - 36), size.width - inputLeft - 16);

        return (
          <input
            autoFocus
            ref={(el) => {
              if (el) {
                el.focus();
                el.select();
              }
            }}
            type="text"
            value={editingTitleState.title}
            onChange={(e) => setEditingTitleState({ ...editingTitleState, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingTitleState(null);
              }
            }}
            onBlur={commitEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            aria-label="Editar título de la escena"
            style={{
              position: 'absolute',
              left: `${inputLeft}px`,
              top: `${r.y + 10}px`,
              width: `${inputWidth}px`,
              height: '24px',
              padding: '2px 8px',
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid #818cf8',
              borderRadius: '6px',
              color: '#ffffff',
              fontFamily: 'var(--font-sans)',
              fontSize: '11.5px',
              fontWeight: 600,
              outline: 'none',
              boxShadow: '0 0 14px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(0, 0, 0, 0.7)',
              zIndex: 60,
            }}
          />
        );
      })()}
    </div>
  );
}

export default DawCanvas;
