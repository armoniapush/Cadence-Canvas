import { useRef, useEffect, useState, useCallback } from 'react';
import type { Track, Scene, ReadingAnchor } from '../types';
import {
  DawCanvasRenderer,
  getSceneRect,
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
  const panRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
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

    let hitScene: Scene | null = null;
    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i], r = getSceneRect(s, tracks, viewport);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hitScene = s; break; }
    }

    if (hitScene && e.button === 0) {
      onSelectScene(hitScene);
      dragRef.current = { mx, my, s: hitScene, t0: hitScene.t_start, trk0: hitScene.track_id, moved: false };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (e.button === 0 || e.button === 1) {
      if (mx > TRACK_HEADER_WIDTH || my > RULER_HEIGHT) onSelectScene(null);
      panRef.current = { mx, my, px: viewport.panX, py: viewport.panY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [scenes, tracks, viewport, onSelectScene]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (dragRef.current) {
      const dx = mx - dragRef.current.mx, dy = my - dragRef.current.my;
      if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
      const dt = Math.round(dx / (PIXELS_PER_UNIT * viewport.zoom));
      const relY = my - RULER_HEIGHT - viewport.panY;
      const idx = Math.max(0, Math.min(tracks.length - 1, Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))));
      setDragState({
        sceneId: dragRef.current.s.id,
        previewTrackId: tracks[idx]?.id || dragRef.current.trk0,
        previewTStart: Math.max(0, dragRef.current.t0 + dt),
      });
    } else if (panRef.current) {
      setViewport((prev) => ({
        ...prev,
        panX: panRef.current!.px + (mx - panRef.current!.mx),
        panY: Math.min(0, panRef.current!.py + (my - panRef.current!.my)),
      }));
    }
  }, [tracks, viewport]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      if (dragRef.current.moved && dragState) {
        if (dragState.previewTStart !== dragRef.current.t0 || dragState.previewTrackId !== dragRef.current.trk0) {
          onMoveScene(dragRef.current.s, dragState.previewTrackId, dragState.previewTStart);
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

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        backgroundColor: '#090a0f', cursor: dragState ? 'grabbing' : panRef.current ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: size.width, height: size.height }} />
    </div>
  );
}

export default DawCanvas;
