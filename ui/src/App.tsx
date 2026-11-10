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

const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#a855f7', '#38bdf8'];

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
          backgroundColor: 'var(--bg-glass-elevated)',
          border: '1px solid var(--border-specular)',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
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
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Crear Nuevo Hilo Narrativo
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
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
                padding: '10px 12px',
                backgroundColor: '#0a0d14',
                border: '1px solid var(--border-specular)',
                borderRadius: '8px',
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
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: hex,
                    border: color === hex ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: color === hex ? '0 2px 4px rgba(0, 0, 0, 0.4)' : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.15s ease',
                    transform: color === hex ? 'scale(1.12)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-specular)',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '6px 16px',
                backgroundColor: name.trim() ? '#4f46e5' : 'rgba(255, 255, 255, 0.05)',
                color: name.trim() ? '#ffffff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                boxShadow: name.trim() ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
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
  const [projectPath, setProjectPath] = useState<string>('project.cadence');
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
      {/* Floating Pill Navbar (Mount / Markus AI Inspired) */}
      <div style={{ padding: '12px 18px 0 18px', zIndex: 100 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 18px',
            backgroundColor: 'var(--bg-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-specular)',
            borderRadius: '9999px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Left: Brand Monogram & Application Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                backgroundColor: '#171922',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '13px',
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                userSelect: 'none',
              }}
            >
              C
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                Cadence Canvas
              </span>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '2px 8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderRadius: '9999px',
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
          </div>

          {/* Center: Segmented View Switcher Pill (Mount / Markus AI) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <button
              onClick={() => setShowConstellation(false)}
              style={{
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: !showConstellation ? 600 : 500,
                color: !showConstellation ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: !showConstellation ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: !showConstellation ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                boxShadow: !showConstellation ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
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
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: showConstellation ? 600 : 500,
                color: showConstellation ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: showConstellation ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: showConstellation ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                boxShadow: showConstellation ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>◈</span> Red de Personajes & Lugares
            </button>
          </div>

          {/* Right: Actions, File Reconnection & Zen Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="pill-btn pill-btn-primary"
              onClick={() => setIsCreateTrackOpen(true)}
              style={{
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span>+</span> Nuevo Hilo Narrativo
            </button>

            {selectedScene && (
              <button
                className="pill-btn pill-btn-cyan"
                onClick={handleToggleZen}
                title="Modo Zen inmersivo (F11)"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span>🗖</span> Zen
              </button>
            )}

            {/* Compact project file pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 4px 2px 10px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-specular)',
                borderRadius: '9999px',
              }}
            >
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                title="Ruta de base de datos SQLite WAL"
                style={{
                  padding: '3px 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  width: '130px',
                  outline: 'none',
                }}
              />
              <button
                className="pill-btn"
                onClick={() => initProject(projectPath)}
                title="Reconectar base de datos SQLite"
                style={{
                  padding: '3px 9px',
                  fontSize: '10px',
                  fontWeight: 500,
                }}
              >
                Reconectar
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Workspace Body */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: '12px',
          padding: '12px 18px 16px 18px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Center Stage: Timeline Canvas or Radial Constellation */}
        <section
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-specular)',
            borderRadius: '14px',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
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
