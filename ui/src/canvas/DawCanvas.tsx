import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Track, Scene, ReadingAnchor } from '../types';
import {
  DawCanvasRenderer,
  computeFitViewport,
  computeMagneticSnap,
  getSceneRect,
  getTrackMuteButtonRect,
  TRACK_HEADER_WIDTH,
  TRACK_HEIGHT,
  TRACK_GAP,
  RULER_HEIGHT,
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
  onCreateScene: (trackId: string, tStart: number) => void;
  onDeleteScene?: (sceneId: string) => void;
  onToggleMuteTrack?: (trackId: string) => void;
  onToggleZen?: () => void;
  onCreateAnchor?: (sourceSceneId: string, targetSceneId: string) => void;
  onDuplicateScene?: (scene: Scene) => void;
  onSplitScene?: (scene: Scene) => void;
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
  onCreateAnchor,
  onDuplicateScene,
  onSplitScene,
}: DawCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ panX: 20, panY: 0, zoom: 1.0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600, dpr: 1 });

  // Magnetic snapping & interactive causal ports
  const [magnetEnabled, setMagnetEnabled] = useState(true);
  const [magnetGuideT, setMagnetGuideT] = useState<number | null>(null);
  const [connectingWire, setConnectingWire] = useState<{
    fromSceneId: string;
    fromPort: 'in' | 'out';
    toX: number;
    toY: number;
  } | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ sceneId: string; port: 'in' | 'out' } | null>(null);

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
    magnetGuideT,
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
    magnetGuideT,
    connectingWire,
    hoveredPort,
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
    // Dismiss context menu if open
    setContextMenu(null);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    // 1. Guard click on pinned track headers
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
      if (e.button === 0 || e.button === 1) {
        panRef.current = { mx, my, px: viewport.panX, py: viewport.panY, verticalOnly: true };
        capturePointerDefensively(e.pointerId);
      }
      return;
    }

    // 2. Port Hit Detection (dragging causal cables)
    if (my > RULER_HEIGHT && e.button === 0) {
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

    // 3. Scene hit detection strictly within visible timeline canvas
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
  }, [scenes, tracks, viewport, onSelectScene, onToggleMuteTrack, capturePointerDefensively]);

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
      const relY = my - RULER_HEIGHT - viewport.panY;
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

      const nextTStart = snap.snappedTStart;
      setMagnetGuideT(snap.isSnapped ? (snap.guideT ?? nextTStart) : null);

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

      const maxScrollY = Math.max(0, tracks.length * (TRACK_HEIGHT + TRACK_GAP) + 120 - (rect.height - RULER_HEIGHT));
      const targetPanY = Math.max(-maxScrollY, Math.min(0, py + (my - startMy)));

      setViewport((prev) => ({
        ...prev,
        panX: targetPanX !== null ? targetPanX : prev.panX,
        panY: targetPanY,
      }));
    } else {
      // Hover detection on ports for cursor feedback
      if (my > RULER_HEIGHT && mx > TRACK_HEADER_WIDTH) {
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
      } else {
        setHoveredPort(null);
      }
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

    // 2. Finalize scene movement
    if (dragRef.current) {
      const currentDrag = dragRef.current;
      if (currentDrag.moved) {
        const finalTrackId = currentDrag.previewTrackId ?? currentDrag.trk0;
        const finalTStart = currentDrag.previewTStart ?? currentDrag.t0;
        if (finalTStart !== currentDrag.t0 || finalTrackId !== currentDrag.trk0) {
          onMoveScene(currentDrag.s, finalTrackId, finalTStart);
        }
      }
      dragRef.current = null;
      setDragState(null);
      setMagnetGuideT(null);
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

    if (my > RULER_HEIGHT) {
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
    }
    setContextMenu(null);
  }, [scenes, tracks, viewport, onSelectScene]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (mx <= TRACK_HEADER_WIDTH || my <= RULER_HEIGHT) return;
    const relY = my - RULER_HEIGHT - viewport.panY;
    const track = tracks[Math.floor(relY / (TRACK_HEIGHT + TRACK_GAP))];
    if (track) {
      const rawT = Math.max(0, Math.round((mx - TRACK_HEADER_WIDTH - viewport.panX) / (PIXELS_PER_UNIT * viewport.zoom)));
      const snap = computeMagneticSnap(rawT, 60, track.id, scenes, '', viewport.zoom, magnetEnabled);
      onCreateScene(track.id, snap.snappedTStart);
    }
  }, [tracks, scenes, viewport, magnetEnabled, onCreateScene]);

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

  const handleFitView = useCallback(() => {
    const fitted = computeFitViewport(scenes, size.width);
    setViewport(fitted);
  }, [scenes, size.width]);

  const totalWords = useMemo(
    () => scenes.reduce((acc, s) => acc + (s.word_count || 0), 0),
    [scenes]
  );

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

      {/* Floating Bottom Dock: Professional Matte Toolbar Dock */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          backgroundColor: 'var(--bg-dock)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
          zIndex: 40,
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Telemetry Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenes.length}</span> escenas
          <span style={{ color: 'var(--border-default)' }}>·</span>
          <span>{totalWords.toLocaleString()} pal.</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-default)' }} />

        {/* Magnet Snapping Toggle */}
        <button
          className={`btn ${magnetEnabled ? 'btn-accent' : 'btn-ghost'}`}
          onClick={() => setMagnetEnabled((prev) => !prev)}
          title="Alternar Imán Magnético (ajuste ordenado a compases y límites de escena; Shift temporal)"
          style={{
            height: '22px',
            padding: '0 8px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>🧲</span>
          <span>{magnetEnabled ? 'Imán Activo' : 'Libre'}</span>
        </button>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-default)' }} />

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            onClick={handleZoomOut}
            title="Reducir zoom (-)"
            style={{ width: '22px', height: '22px', fontSize: '13px' }}
          >
            -
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleResetZoom}
            title="Restablecer zoom al 100%"
            style={{
              padding: '0 6px',
              height: '22px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            {Math.round(viewport.zoom * 100)}%
          </button>

          <button
            className="btn-icon"
            onClick={handleZoomIn}
            title="Aumentar zoom (+)"
            style={{ width: '22px', height: '22px', fontSize: '13px' }}
          >
            +
          </button>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-default)' }} />

        {/* View Fit ("Ajustar" to content) button */}
        <button
          className="btn btn-ghost"
          onClick={handleFitView}
          title="Centrar y encuadrar todas las escenas literarias"
          style={{
            height: '22px',
            padding: '0 8px',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          <span>⛶</span> Ajustar
        </button>

        {/* Zen Mode Button */}
        {onToggleZen && (
          <button
            className="btn btn-ghost"
            onClick={onToggleZen}
            title="Modo Zen inmersivo (F11)"
            style={{
              height: '22px',
              padding: '0 8px',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            <span>🗖</span> Zen
          </button>
        )}
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          scene={contextMenu.scene}
          onClose={() => setContextMenu(null)}
          onOpenEditor={(scene) => onSelectScene(scene)}
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
    </div>
  );
}

export default DawCanvas;
