import { useState, useEffect, useCallback } from 'react';
import type { Project, Track, Scene, ReadingAnchor } from './types';
import {
  openProject,
  listTracks,
  createTrack,
  setTrackMuted,
  listScenes,
  listAnchors,
  createScene,
  moveScene,
  deleteScene,
} from './api';
import { DawCanvas } from './canvas/DawCanvas';
import { AtomicEditor } from './editor/AtomicEditor';
import { RadialConstellation } from './constellation/RadialConstellation';
import { ErrorBoundary } from './components/ErrorBoundary';

const PRESET_COLORS = ['#4361ee', '#1f9a73', '#d97706', '#0284c7', '#be123c', '#7c3aed', '#c2410c'];

function CreateTrackModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (n: string, c: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    setName('');
    setColor('#6366f1');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: color,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Crear Nuevo Hilo Narrativo
            </h2>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ width: '22px', height: '22px', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Nombre del hilo narrativo
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. POV Antagonista, Subtrama de Misterio..."
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Color distintivo
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: hex,
                    border: color === hex ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: color === hex ? '0 1px 3px rgba(0, 0, 0, 0.4)' : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.15s ease',
                    transform: color === hex ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!name.trim()}
              style={{
                opacity: name.trim() ? 1 : 0.45,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Crear Hilo Narrativo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function App() {
  const [projectPath] = useState<string>('project.cadence');
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [anchors, setAnchors] = useState<ReadingAnchor[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const setStatus = useCallback((msg: string) => {
    console.debug('[Cadence]', msg);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [isZen, setIsZen] = useState<boolean>(false);
  const [showConstellation, setShowConstellation] = useState<boolean>(false);
  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState<boolean>(false);

  const initProject = async (path: string) => {
    try {
      setError(null);
      setStatus(`Conectando con puente IPC en '${path}'...`);
      const proj = await openProject(path);
      setProject(proj);

      const [loadedTracks, loadedScenes, loadedAnchors] = await Promise.all([
        listTracks(path, proj.id),
        listScenes(path, proj.id),
        listAnchors(path, proj.id),
      ]);
      setTracks(loadedTracks);
      setScenes(loadedScenes);
      setAnchors(loadedAnchors);
      setStatus(`Puente IPC activo. Conectado a proyecto '${proj.title}'.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('Error en puente IPC.');
    }
  };

  useEffect(() => {
    initProject(projectPath);
  }, []);

  // Global F11 listener for Zen mode toggle
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setIsZen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSelectScene = useCallback((scene: Scene | null) => {
    setSelectedSceneId(scene ? scene.id : null);
  }, []);

  const handleToggleZen = useCallback(() => {
    if (!selectedSceneId && scenes.length > 0) {
      setSelectedSceneId(scenes[0].id);
      setIsZen(true);
      setStatus(`Modo Zen inmersivo activado para '${scenes[0].title}'. Presiona Esc o F11 para salir.`);
      return;
    }
    if (!selectedSceneId && scenes.length === 0) {
      setStatus('Crea al menos una escena literaria para entrar en Modo Zen.');
      return;
    }
    setIsZen((prev) => !prev);
  }, [selectedSceneId, scenes]);

  const handleSceneUpdated = useCallback((updated: Scene) => {
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setStatus(`Escena '${updated.title}' guardada en WAL (v${updated.version}, ${updated.word_count} pal).`);
  }, []);

  const handleMoveScene = useCallback(
    async (scene: Scene, newTrackId: string, newTStart: number) => {
      try {
        setStatus(`Moviendo escena '${scene.title}' a T:${newTStart}...`);
        const updated = await moveScene(
          projectPath,
          scene.id,
          scene.version,
          newTrackId,
          newTStart,
          scene.duration
        );
        setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setStatus(`Escena '${updated.title}' reposicionada (v${updated.version}).`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error moviendo escena: ${msg}`);
        setStatus('Conflicto causal de concurrencia al mover escena.');
      }
    },
    [projectPath]
  );

  const handleCreateScene = useCallback(
    async (trackId: string, tStart: number) => {
      try {
        const title = `Escena ${scenes.length + 1}`;
        setStatus(`Creando nueva escena rápida '${title}' en T:${tStart}...`);
        const newScene = await createScene(
          projectPath,
          trackId,
          title,
          tStart,
          120,
          'Borrador inicial redactado en la estación narrativa.'
        );
        setScenes((prev) => [...prev, newScene]);
        setSelectedSceneId(newScene.id);
        setStatus(`Nueva escena '${newScene.title}' creada en T:${tStart}.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error creando escena: ${msg}`);
      }
    },
    [projectPath, scenes.length]
  );

  const handleDeleteScene = useCallback(
    async (sceneId: string) => {
      try {
        setStatus(`Eliminando escena '${sceneId}'...`);
        await deleteScene(projectPath, sceneId);
        setScenes((prev) => prev.filter((s) => s.id !== sceneId));
        setAnchors((prev) =>
          prev.filter((a) => a.source_scene_id !== sceneId && a.target_scene_id !== sceneId)
        );
        if (selectedSceneId === sceneId) {
          setSelectedSceneId(null);
        }
        setStatus('Escena eliminada de SQLite WAL.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error eliminando escena: ${msg}`);
        setStatus('Error al eliminar escena.');
      }
    },
    [projectPath, selectedSceneId]
  );

  const handleCreateTrack = useCallback(
    async (name: string, color: string) => {
      try {
        const projId = project?.id || 'mock-proj-1';
        setStatus(`Creando hilo narrativo '${name}'...`);
        const newTrack = await createTrack(
          projectPath,
          projId,
          name,
          color,
          tracks.length
        );
        setTracks((prev) => [...prev, newTrack]);
        setStatus(`Hilo narrativo '${newTrack.name}' creado en SQLite WAL.`);
        setIsCreateTrackOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error creando hilo narrativo: ${msg}`);
        setStatus('Error al crear carril de hilo narrativo.');
      }
    },
    [projectPath, project, tracks.length]
  );

  const handleToggleMuteTrack = useCallback(
    async (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const nextMuted = !track.is_muted;
      try {
        await setTrackMuted(projectPath, trackId, nextMuted);
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, is_muted: nextMuted } : t))
        );
        setStatus(
          `Hilo narrativo '${track.name}' ${nextMuted ? 'ocultado (excluido de vista)' : 'visible'}.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error al cambiar visibilidad: ${msg}`);
        setStatus('Error al actualizar visibilidad de hilo.');
      }
    },
    [projectPath, tracks]
  );

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) || null;

  // Zen Mode View
  if (isZen && selectedScene) {
    return (
      <AtomicEditor
        scene={selectedScene}
        projectPath={projectPath}
        isZen={true}
        onToggleZen={handleToggleZen}
        onSceneUpdated={handleSceneUpdated}
        onDeleteScene={handleDeleteScene}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* Grounded Professional Header Bar (Zero AI Slop) */}
      <header
        style={{
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-default)',
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Left: Brand Monogram, Title & Project Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '5px',
              backgroundColor: '#161924',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              color: '#f8fafc',
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}
          >
            C
          </div>

          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Cadence Canvas
          </span>

          <span style={{ fontSize: '12px', color: 'var(--border-hover)', userSelect: 'none' }}>/</span>

          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}
            title={`Proyecto: ${projectPath}`}
          >
            {projectPath}
          </span>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '11px',
                color: '#fca5a5',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Center: Segmented View Switcher (Linear / Apple Pro style) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#090b10',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setShowConstellation(false)}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: !showConstellation ? 600 : 500,
              color: !showConstellation ? '#ffffff' : 'var(--text-secondary)',
              backgroundColor: !showConstellation ? '#1a1e2b' : 'transparent',
              border: !showConstellation ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
              boxShadow: !showConstellation ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>☵</span> Línea de Tiempo
          </button>

          <button
            onClick={() => setShowConstellation(true)}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: showConstellation ? 600 : 500,
              color: showConstellation ? '#ffffff' : 'var(--text-secondary)',
              backgroundColor: showConstellation ? '#1a1e2b' : 'transparent',
              border: showConstellation ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
              boxShadow: showConstellation ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>◈</span> Red de Personajes & Lugares
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-accent"
            onClick={() => setIsCreateTrackOpen(true)}
            style={{
              padding: '0 12px',
              height: '28px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <span>+</span> Nuevo Hilo Narrativo
          </button>

          {selectedScene && (
            <button
              className="btn btn-ghost"
              onClick={handleToggleZen}
              title="Modo Zen inmersivo (F11)"
              style={{
                padding: '0 10px',
                height: '28px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <span>🗖</span> Zen
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: '12px',
          padding: '12px 16px 14px 16px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Center Stage: Timeline Canvas or Radial Constellation */}
        <section
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          {showConstellation ? (
            <RadialConstellation
              projectPath={projectPath}
              projectId={project?.id || 'mock-proj-1'}
              scenes={scenes}
              selectedSceneId={selectedSceneId}
              onSelectScene={(sceneId) => setSelectedSceneId(sceneId)}
              onClose={() => setShowConstellation(false)}
            />
          ) : (
            <ErrorBoundary>
              <DawCanvas
                tracks={tracks}
                scenes={scenes}
                anchors={anchors}
                selectedSceneId={selectedSceneId}
                onSelectScene={handleSelectScene}
                onMoveScene={handleMoveScene}
                onCreateScene={handleCreateScene}
                onDeleteScene={handleDeleteScene}
                onToggleMuteTrack={handleToggleMuteTrack}
                onToggleZen={handleToggleZen}
              />
            </ErrorBoundary>
          )}
        </section>

        {/* Right Stage: Atomic Editor (Displayed smoothly when a scene is selected) */}
        {selectedScene && (
          <aside
            style={{
              width: '420px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <AtomicEditor
              scene={selectedScene}
              projectPath={projectPath}
              isZen={false}
              onToggleZen={handleToggleZen}
              onSceneUpdated={handleSceneUpdated}
              onDeleteScene={handleDeleteScene}
              onClose={() => setSelectedSceneId(null)}
            />
          </aside>
        )}
      </main>

      <CreateTrackModal
        isOpen={isCreateTrackOpen}
        onClose={() => setIsCreateTrackOpen(false)}
        onCreate={handleCreateTrack}
      />
    </div>
  );
}

export default App;
