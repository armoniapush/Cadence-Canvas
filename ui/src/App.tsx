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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ width: '360px', backgroundColor: '#11141f', border: '1px solid #242b3d', borderRadius: '8px', padding: '18px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)', display: 'flex', flexDirection: 'column', gap: '14px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Crear Nueva Subtrama</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Nombre del carril</label>
            <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. POV Antagonista, Subtrama de Misterio..." style={{ padding: '8px 10px', backgroundColor: '#0a0d14', border: '1px solid #242b3d', borderRadius: '4px', color: '#f1f5f9', fontSize: '13px', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Color distintivo</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {PRESET_COLORS.map((hex) => (
                <button key={hex} type="button" onClick={() => setColor(hex)} style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: hex, border: color === hex ? '2px solid #ffffff' : '2px solid transparent', boxShadow: color === hex ? `0 0 8px ${hex}` : 'none', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '5px 12px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #242b3d', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={!name.trim()} style={{ padding: '5px 14px', backgroundColor: name.trim() ? '#6366f1' : '#2e354b', color: name.trim() ? '#ffffff' : '#64748b', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}>Crear Subtrama</button>
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
  const [status, setStatus] = useState<string>('Inicializando Estación Narrativa...');
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
    setIsZen((prev) => !prev);
  }, []);

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
        setStatus(`Creando subtrama '${name}'...`);
        const newTrack = await createTrack(
          projectPath,
          projId,
          name,
          color,
          tracks.length
        );
        setTracks((prev) => [...prev, newTrack]);
        setStatus(`Subtrama '${newTrack.name}' creada en SQLite WAL.`);
        setIsCreateTrackOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error creando subtrama: ${msg}`);
        setStatus('Error al crear carril de subtrama.');
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
          `Carril '${track.name}' ${nextMuted ? 'silenciado (excluido de export)' : 'activado'}.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error al cambiar estado de silencio: ${msg}`);
        setStatus('Error al actualizar silencio de pista.');
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
        backgroundColor: 'var(--bg-station)',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-specular)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: error ? '#ef4444' : '#10b981',
              boxShadow: error ? '0 0 8px #ef4444' : '0 0 8px #10b981',
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Cadence Canvas
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px', fontSize: '12px' }}>
              — Estación Narrativa
            </span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsCreateTrackOpen(true)}
            style={{
              padding: '4px 12px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            + Nueva Subtrama
          </button>

          <button
            onClick={() => setShowConstellation((prev) => !prev)}
            style={{
              padding: '4px 12px',
              backgroundColor: showConstellation
                ? 'rgba(56, 189, 248, 0.25)'
                : 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-cyan)',
              border: showConstellation
                ? '1px solid var(--accent-cyan)'
                : '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {showConstellation ? '☵ Vista Canvas DAW' : '◈ Constelación Causal / Vista Radar'}
          </button>

          {selectedScene && (
            <button
              onClick={handleToggleZen}
              style={{
                padding: '4px 10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⛶ Modo Zen (F11)
            </button>
          )}

          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Archivo:</span>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-rack)',
              border: '1px solid var(--border-specular)',
              borderRadius: '4px',
              color: 'var(--text-main)',
              fontSize: '12px',
              width: '180px',
            }}
          />
          <button
            onClick={() => initProject(projectPath)}
            style={{
              padding: '4px 12px',
              backgroundColor: 'var(--border-specular)',
              color: 'var(--text-main)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reconectar
          </button>
        </div>
      </header>

      {/* Main Workspace Body (DAW Canvas spans full width when editor closed) */}
      <main style={{ flex: 1, display: 'flex', gap: '12px', padding: '12px', overflow: 'hidden' }}>
        {/* Center Stage: Hardware-Accelerated DAW Canvas or Radial Constellation Radar */}
        <section
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-specular)',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
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
            />
          )}
        </section>

        {/* Right Stage: Atomic Editor (Displayed only when a scene is selected) */}
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

      {/* Bottom Status Bar: Compact Telemetry & WAL Heartbeat */}
      <footer
        style={{
          height: '26px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: error ? '#ef4444' : '#10b981',
                boxShadow: error ? '0 0 6px #ef4444' : '0 0 6px #10b981',
              }}
            />
            <span style={{ color: error ? '#f87171' : '#cbd5e1', fontWeight: 500 }}>
              {projectPath} (SQLite WAL)
            </span>
          </div>
          <span style={{ color: 'var(--border-specular)' }}>|</span>
          <span>
            {tracks.length} pistas · {scenes.length} escenas
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              color: error ? '#fca5a5' : '#94a3b8',
              maxWidth: '600px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {error ? `⚠️ ${error}` : status}
          </span>
        </div>
      </footer>

      <CreateTrackModal
        isOpen={isCreateTrackOpen}
        onClose={() => setIsCreateTrackOpen(false)}
        onCreate={handleCreateTrack}
      />
    </div>
  );
}

export default App;
