import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Track, Scene, ReadingAnchor } from '../types';
import {
  DawCanvasRenderer,
  getSceneRect,
  getTrackMuteButtonRect,
  computeFitViewport,
  RULER_HEIGHT,
  TRACK_HEADER_WIDTH,
  TRACK_HEIGHT,
  TRACK_GAP,
  PIXELS_PER_UNIT,
  type Viewport,
  type DragState,
  type CanvasRenderData,
} from './renderer';

export interface DawCanvasProps {
  tracks: Track[];
  scenes: Scene[];
  anchors: ReadingAnchor[];
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene | null) => void;
  onMoveScene: (scene: Scene, newTrackId: string, newTStart: number) => void;
  onCreateScene: (trackId: string, tStart: number) => void;
  onDeleteScene?: (sceneId: string) => void;
  onToggleMuteTrack?: (trackId: string) => void;
  onToggleZen?: () => void;
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
  onToggleMuteTrack,
  onToggleZen,
}: DawCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ panX: 20, panY: 0, zoom: 1.0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600, dpr: 1 });

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

  const dragRef = useRef<{ mx: number; my: number; s: Scene; t0: number; trk0: string; moved: boolean } | null>(null);
  const panRef = useRef<{ mx: number; my: number; px: number; py: number; verticalOnly?: boolean } | null>(null);
  const stateRef = useRef<CanvasRenderData>({
    tracks, scenes, anchors, selectedSceneId, currentTime: 0, dragState, viewport, dpr: 1, width: 800, height: 600,
  });

  stateRef.current = {
    tracks, scenes, anchors, selectedSceneId, currentTime: 0, dragState, viewport,
    dpr: size.dpr, width: size.width, height: size.height,
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
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new DawCanvasRenderer(canvasRef.current, () => stateRef.current);
    renderer.start();
    return () => renderer.stop();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(3.0, Math.max(0.2, viewport.zoom * factor));
    const relX = mx - TRACK_HEADER_WIDTH;
    const tAtCursor = (relX - viewport.panX) / (PIXELS_PER_UNIT * viewport.zoom);
    setViewport((prev) => ({
      ...prev,
      zoom: newZoom,
      panX: relX - tAtCursor * (PIXELS_PER_UNIT * newZoom),
    }));
  }, [viewport]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    // 1. Guard click on pinned track headers (never trigger scenes behind header)
    if (mx <= TRACK_HEADER_WIDTH) {
      if (my > RULER_HEIGHT && onToggleMuteTrack && e.button === 0) {
        for (let i = 0; i < tracks.length; i++) {
          const btn = getTrackMuteButtonRect(i, viewport);
          if (mx >= btn.x - 3 && mx <= btn.x + btn.w + 3 && my >= btn.y - 3 && my <= btn.y + btn.h + 3) {
            onToggleMuteTrack(tracks[i].id);
            return;
          }
        }
      }
      // Pinned track header dragging: vertical scrolling only, never horizontal or scene drag
      if (e.button === 0 || e.button === 1) {
        panRef.current = { mx, my, px: viewport.panX, py: viewport.panY, verticalOnly: true };
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      }
      return;
    }

    // 2. Scene hit detection strictly within visible timeline canvas
    let hitScene: Scene | null = null;
    if (my > RULER_HEIGHT) {
      for (let i = scenes.length - 1; i >= 0; i--) {
        const s = scenes[i], r = getSceneRect(s, tracks, viewport);
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          hitScene = s;
          break;
        }
      }
    }

    if (hitScene && e.button === 0) {
      onSelectScene(hitScene);
      dragRef.current = { mx, my, s: hitScene, t0: hitScene.t_start, trk0: hitScene.track_id, moved: false };
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    } else if (e.button === 0 || e.button === 1) {
      onSelectScene(null);
      panRef.current = { mx, my, px: viewport.panX, py: viewport.panY, verticalOnly: false };
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }
  }, [scenes, tracks, viewport, onSelectScene, onToggleMuteTrack]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (dragRef.current) {
      const currentDrag = dragRef.current;
      const dx = mx - currentDrag.mx, dy = my - currentDrag.my;
      if (Math.hypot(dx, dy) > 3) currentDrag.moved = true;
      const dt = Math.round(dx / (PIXELS_PER_UNIT * viewport.zoom));
      const relY = my - RULER_HEIGHT - viewport.panY;
      const idx = Math.max(0, Math.min(tracks.length - 1, Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))));
      setDragState({
        sceneId: currentDrag.s.id,
        previewTrackId: tracks[idx]?.id || currentDrag.trk0,
        previewTStart: Math.max(0, currentDrag.t0 + dt),
      });
    } else if (panRef.current) {
      const { px, py, mx: startMx, my: startMy, verticalOnly } = panRef.current;
      const isVert = Boolean(verticalOnly);
      const targetPanX = isVert ? null : px + (mx - startMx);
      const targetPanY = Math.min(0, py + (my - startMy));
      setViewport((prev) => ({
        ...prev,
        panX: targetPanX !== null ? targetPanX : prev.panX,
        panY: targetPanY,
      }));
    }
  }, [tracks, viewport]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      const currentDrag = dragRef.current;
      if (currentDrag.moved && dragState) {
        if (dragState.previewTStart !== currentDrag.t0 || dragState.previewTrackId !== currentDrag.trk0) {
          onMoveScene(currentDrag.s, dragState.previewTrackId, dragState.previewTStart);
        }
      }
      dragRef.current = null;
      setDragState(null);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (panRef.current) {
      panRef.current = null;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
  }, [dragState, onMoveScene]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (mx <= TRACK_HEADER_WIDTH || my <= RULER_HEIGHT) return;
    const relY = my - RULER_HEIGHT - viewport.panY;
    const track = tracks[Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))];
    if (track) {
      const t = Math.max(0, Math.round((mx - TRACK_HEADER_WIDTH - viewport.panX) / (PIXELS_PER_UNIT * viewport.zoom)));
      onCreateScene(track.id, t);
    }
  }, [tracks, viewport, onCreateScene]);

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
      panX: 20,
      panY: 0,
    }));
  }, []);

  // True Content Fit View ("Ajustar")
  const handleFitView = useCallback(() => {
    const fitted = computeFitViewport(scenes, size.width);
    setViewport(fitted);
  }, [scenes, size.width]);

  // Summary statistics for floating dock telemetry
  const totalWords = useMemo(() => {
    return scenes.reduce((acc, s) => acc + (s.word_count || 0), 0);
  }, [scenes]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-canvas)',
        cursor: dragState ? 'grabbing' : panRef.current ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: size.width, height: size.height }} />

      {/* Floating Bottom Dock: Zoom Controls, View-Fit & Zen Mode */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          backgroundColor: 'var(--bg-glass-elevated)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border-specular)',
          borderRadius: '9999px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          zIndex: 40,
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Telemetry Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenes.length}</span> escenas
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span>{totalWords.toLocaleString()} pal.</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-specular)' }} />

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="pill-icon-btn"
            onClick={handleZoomOut}
            title="Reducir zoom (-)"
            style={{ fontSize: '14px' }}
          >
            -
          </button>

          <button
            className="pill-btn"
            onClick={handleResetZoom}
            title="Restablecer zoom al 100%"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            {Math.round(viewport.zoom * 100)}%
          </button>

          <button
            className="pill-icon-btn"
            onClick={handleZoomIn}
            title="Aumentar zoom (+)"
            style={{ fontSize: '14px' }}
          >
            +
          </button>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-specular)' }} />

        {/* View Fit ("Ajustar" to content) button */}
        <button
          className="pill-btn"
          onClick={handleFitView}
          title="Centrar y encuadrar todas las escenas literarias"
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          <span>⛶</span> Ajustar
        </button>

        {/* Zen Mode Button */}
        {onToggleZen && (
          <button
            className="pill-btn pill-btn-cyan"
            onClick={onToggleZen}
            title="Modo Zen inmersivo (F11)"
            style={{
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            <span>🗖</span> Zen
          </button>
        )}
      </div>
    </div>
  );
}

export default DawCanvas;
