import { useState, useEffect, useCallback } from 'react';
import type { Project, Track, Scene, ReadingAnchor, TonalHistogram } from './types';
import {
  openProject,
  listTracks,
  listScenes,
  listAnchors,
  createScene,
  moveScene,
  computeTonalMetrics,
} from './api';
import { DawCanvas } from './canvas/DawCanvas';

export function App() {
  const [projectPath, setProjectPath] = useState<string>('project.cadence');
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [anchors, setAnchors] = useState<ReadingAnchor[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TonalHistogram | null>(null);
  const [status, setStatus] = useState<string>('Inicializando Estación Narrativa...');
  const [error, setError] = useState<string | null>(null);

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

      const sampleMetrics = await computeTonalMetrics(
        '“Iniciando calibración táctica del motor de montaje,” susurró el autor.'
      );
      setMetrics(sampleMetrics);
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

  const handleSelectScene = useCallback((scene: Scene | null) => {
    setSelectedSceneId(scene ? scene.id : null);
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
          'Borrador táctico inicial redactado en la estación narrativa.'
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

  const selectedScene = scenes.find((s) => s.id === selectedSceneId);
  const selectedTrack = tracks.find((t) => t.id === selectedScene?.track_id);

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
      {/* Tactical Top Bar */}
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
              width: '10px',
              height: '10px',
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
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Cadence Canvas{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              // Estación de Montaje Narrativo
            </span>
          </h1>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontWeight: 600,
            }}
          >
            CANVAS DAW 120 FPS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            }}
          >
            Reconectar
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main style={{ flex: 1, display: 'flex', gap: '12px', padding: '12px', overflow: 'hidden' }}>
        {/* Left Rack: Telemetry, Selection & Invariants */}
        <section
          style={{
            width: '300px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-specular)',
            borderRadius: '6px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
            }}
          >
            Telemetría Causal IPC
          </div>

          <div
            style={{
              fontSize: '12px',
              lineHeight: '1.4',
              color: error ? '#f87171' : 'var(--text-main)',
            }}
          >
            {status}
          </div>

          {project && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-rack)',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-specular)',
              }}
            >
              Proyecto: <strong style={{ color: '#e2e8f0' }}>{project.title}</strong> ({project.author || 'Autor'})
            </div>
          )}

          {/* Selected Scene Inspector */}
          {selectedScene ? (
            <div
              style={{
                backgroundColor: 'var(--bg-rack)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>
                  {selectedScene.title}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'monospace',
                  }}
                >
                  v{selectedScene.version}
                </span>
              </div>

              {selectedTrack && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: selectedTrack.color_hex,
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>Carril:</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{selectedTrack.name}</span>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                <div>
                  Inicio: <strong style={{ color: '#e2e8f0' }}>T:{selectedScene.t_start}</strong>
                </div>
                <div>
                  Duración: <strong style={{ color: '#e2e8f0' }}>{selectedScene.duration}</strong>
                </div>
                <div>
                  Palabras: <strong style={{ color: '#e2e8f0' }}>{selectedScene.word_count}</strong>
                </div>
                <div>
                  Caracteres: <strong style={{ color: '#e2e8f0' }}>{selectedScene.char_count}</strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: '4px',
                  padding: '8px',
                  backgroundColor: '#0c0e16',
                  borderRadius: '4px',
                  border: '1px solid var(--border-specular)',
                  fontSize: '11px',
                  color: '#94a3b8',
                  maxHeight: '70px',
                  overflowY: 'auto',
                  lineHeight: '1.4',
                }}
              >
                {selectedScene.text || 'Sin texto inicial...'}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-rack)',
                borderRadius: '6px',
                border: '1px dashed var(--border-specular)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              Selecciona una escena en el canvas para inspeccionar métricas y enlaces causales.
            </div>
          )}

          {metrics && (
            <div
              style={{
                backgroundColor: 'var(--bg-rack)',
                border: '1px solid var(--border-specular)',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--accent-amber)',
                  marginBottom: '2px',
                }}
              >
                HUD Tonal Cuadricanal
              </div>
              <div>Diálogo: {(metrics.dialogue * 100).toFixed(1)}%</div>
              <div>Acción: {(metrics.action * 100).toFixed(1)}%</div>
              <div>Lore: {(metrics.lore * 100).toFixed(1)}%</div>
              <div>Monólogo: {(metrics.monologue * 100).toFixed(1)}%</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                Varianza: {metrics.cadence_variance.toFixed(2)} | Palabras: {metrics.total_words}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 'auto',
              padding: '10px',
              backgroundColor: 'var(--bg-rack)',
              borderRadius: '4px',
              border: '1px solid var(--border-specular)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Controles DAW</div>
            <div>• Rueda: Zoom centrado en cursor</div>
            <div>• Arrastre espacio: Panning</div>
            <div>• Arrastre tarjeta: Mover escena (OCC)</div>
            <div>• Doble clic: Crear nueva escena</div>
          </div>
        </section>

        {/* Center Stage: Hardware-Accelerated 120 FPS DAW Canvas */}
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
          <DawCanvas
            tracks={tracks}
            scenes={scenes}
            anchors={anchors}
            selectedSceneId={selectedSceneId}
            onSelectScene={handleSelectScene}
            onMoveScene={handleMoveScene}
            onCreateScene={handleCreateScene}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
