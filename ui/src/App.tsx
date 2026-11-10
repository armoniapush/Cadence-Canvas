import { useState, useEffect } from 'react';
import type { Project, Track, Scene, TonalHistogram } from './types';
import {
  openProject,
  listTracks,
  listScenes,
  computeTonalMetrics,
} from './api';

export function App() {
  const [projectPath, setProjectPath] = useState<string>('project.cadence');
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [metrics, setMetrics] = useState<TonalHistogram | null>(null);
  const [status, setStatus] = useState<string>('Inicializando Estación Narrativa...');
  const [error, setError] = useState<string | null>(null);

  const initProject = async (path: string) => {
    try {
      setError(null);
      setStatus(`Conectando con puente IPC en '${path}'...`);
      const proj = await openProject(path);
      setProject(proj);

      const [loadedTracks, loadedScenes] = await Promise.all([
        listTracks(path, proj.id),
        listScenes(path, proj.id),
      ]);
      setTracks(loadedTracks);
      setScenes(loadedScenes);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-station)' }}>
      {/* Tactical Top Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
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
          <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Cadence Canvas <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>// Estación de Montaje Narrativo</span>
          </h1>
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
            Conectar
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main style={{ flex: 1, display: 'flex', padding: '16px', gap: '16px', overflow: 'hidden' }}>
        {/* Left Rack: Telemetry & Invariants */}
        <section
          style={{
            width: '320px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-specular)',
            borderRadius: '6px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            Telemetría Causal IPC
          </div>

          <div style={{ fontSize: '13px', lineHeight: '1.5', color: error ? '#f87171' : 'var(--text-main)' }}>
            {status}
          </div>

          {project && (
            <div
              style={{
                backgroundColor: 'var(--bg-rack)',
                border: '1px solid var(--border-specular)',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div><strong>Proyecto:</strong> {project.title}</div>
              <div style={{ color: 'var(--text-muted)' }}><strong>ID:</strong> {project.id}</div>
              <div style={{ color: 'var(--text-muted)' }}><strong>Autor:</strong> {project.author || 'Anónimo'}</div>
            </div>
          )}

          {metrics && (
            <div
              style={{
                backgroundColor: 'var(--bg-rack)',
                border: '1px solid var(--border-specular)',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '4px' }}>
                HUD Tonal Cuadricanal (Test)
              </div>
              <div>Diálogo: {(metrics.dialogue * 100).toFixed(1)}%</div>
              <div>Acción: {(metrics.action * 100).toFixed(1)}%</div>
              <div>Lore: {(metrics.lore * 100).toFixed(1)}%</div>
              <div>Monólogo: {(metrics.monologue * 100).toFixed(1)}%</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Varianza: {metrics.cadence_variance.toFixed(2)} | Palabras: {metrics.total_words}
              </div>
            </div>
          )}
        </section>

        {/* Center Canvas Stage Preview */}
        <section
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-specular)',
            borderRadius: '6px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid var(--accent-indigo)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            SLICE 4.1 // SHELL V2 & IPC COMMAND BRIDGE
          </div>

          <h2 style={{ margin: '8px 0 4px', fontSize: '20px', fontWeight: 600 }}>
            Estación de Montaje Lista para Montaje de Canvas
          </h2>

          <p style={{ maxWidth: '480px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            Puente Rust Tauri v2 verificado con 13 comandos atómicos. Listo para la implementación de Canvas DAW a 120 FPS en el siguiente Slice 4.2.
          </p>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-rack)', borderRadius: '4px', border: '1px solid var(--border-specular)', fontSize: '13px' }}>
              Carriles Activos: <strong>{tracks.length}</strong>
            </div>
            <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-rack)', borderRadius: '4px', border: '1px solid var(--border-specular)', fontSize: '13px' }}>
              Escenas en Timeline: <strong>{scenes.length}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
