import { useState, useEffect, useCallback } from 'react';
import { Layers, BookOpen, Download, Settings, X } from 'lucide-react';
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
  createAnchor,
  updateSceneContent,
  exportDocx,
} from './api';
import { DawCanvas } from './canvas/DawCanvas';
import { AtomicEditor } from './editor/AtomicEditor';
import { ManuscriptBinder, type LeftNavTab } from './components/ManuscriptBinder';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsModal, type ProjectSettings } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { Toast } from './components/Toast';

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
            aria-label="Cerrar modal"
            style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} strokeWidth={1.5} />
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
                  aria-label={`Seleccionar color ${hex}`}
                  title={`Seleccionar color ${hex}`}
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
  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState<boolean>(false);
  const [isLeftNavOpen, setIsLeftNavOpen] = useState<boolean>(true);
  const [leftNavTab, setLeftNavTab] = useState<LeftNavTab>('binder');
  const [activeAct, setActiveAct] = useState<string>('acto-2');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    title: 'Estación Narrativa Beta',
    author: 'Autor Gentle-AI',
    targetWords: 80000,
    autosaveMs: 600,
    editorFontSize: 16,
    defaultMagnet: true,
  });

  // Resizable Binders & Panels State
  const [binderWidth, setBinderWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cadence_binder_width');
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 220 && parsed <= 600) return parsed;
        }
      } catch {}
    }
    return 320;
  });

  const [editorWidth, setEditorWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cadence_editor_width');
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 320 && parsed <= 800) return parsed;
        }
      } catch {}
    }
    return 420;
  });

  const [isResizingBinder, setIsResizingBinder] = useState(false);
  const [isResizingEditor, setIsResizingEditor] = useState(false);

  // Resize handler for Left Binder
  const handleBinderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizingBinder(true);
      const startX = e.clientX;
      const startWidth = binderWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = moveEvent.clientX - startX;
        const maxAllowed = Math.max(260, window.innerWidth - (selectedSceneId ? editorWidth : 0) - 500);
        const newWidth = Math.max(220, Math.min(Math.min(550, maxAllowed), startWidth + delta));
        setBinderWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizingBinder(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          setBinderWidth((current) => {
            localStorage.setItem('cadence_binder_width', current.toString());
            return current;
          });
        } catch {}
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [binderWidth, editorWidth, selectedSceneId]
  );

  // Resize handler for Right Editor
  const handleEditorMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizingEditor(true);
      const startX = e.clientX;
      const startWidth = editorWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = startX - moveEvent.clientX; // Dragging left expands editor
        const maxAllowed = Math.max(340, window.innerWidth - (isLeftNavOpen ? binderWidth : 0) - 500);
        const newWidth = Math.max(320, Math.min(Math.min(800, maxAllowed), startWidth + delta));
        setEditorWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizingEditor(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          setEditorWidth((current) => {
            localStorage.setItem('cadence_editor_width', current.toString());
            return current;
          });
        } catch {}
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [editorWidth, binderWidth, isLeftNavOpen]
  );

  const handleResetBinderWidth = useCallback(() => {
    setBinderWidth(320);
    try {
      localStorage.setItem('cadence_binder_width', '320');
    } catch {}
  }, []);

  const handleResetEditorWidth = useCallback(() => {
    setEditorWidth(420);
    try {
      localStorage.setItem('cadence_editor_width', '420');
    } catch {}
  }, []);

  const handleToggleBinder = useCallback(() => {
    setIsLeftNavOpen((prev) => {
      if (!prev) {
        setLeftNavTab('binder');
        return true;
      }
      if (leftNavTab === 'binder') {
        return false;
      }
      setLeftNavTab('binder');
      return true;
    });
  }, [leftNavTab]);

  const handleToggleStructure = useCallback(() => {
    setIsLeftNavOpen((prev) => {
      if (!prev) {
        setLeftNavTab('structure');
        return true;
      }
      if (leftNavTab === 'structure') {
        return false;
      }
      setLeftNavTab('structure');
      return true;
    });
  }, [leftNavTab]);

  const initProject = async (path: string) => {
    try {
      setError(null);
      setStatus(`Conectando con puente IPC en '${path}'...`);
      const proj = await openProject(path);
      setProject(proj);
      setProjectSettings((prev) => ({
        ...prev,
        title: proj.title || prev.title,
        author: proj.author || prev.author,
      }));

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

  // Global F11, ⌘B & ⌘D listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setIsZen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleBinder();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleToggleStructure();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleBinder, handleToggleStructure]);

  const handleSelectScene = useCallback((scene: Scene | null) => {
    setSelectedSceneId(scene ? scene.id : null);
    if (scene && typeof window !== 'undefined' && window.innerWidth < 900) {
      setIsLeftNavOpen(false);
    }
  }, []);

  // Window resize listener: auto-collapse left nav only on very small screens (< 900px)
  useEffect(() => {
    const handleResize = () => {
      if (selectedSceneId && window.innerWidth < 900) {
        setIsLeftNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedSceneId]);

  const handleSelectAct = useCallback(
    (actId: string) => {
      setActiveAct(actId);
      const actScenes =
        actId === 'acto-1'
          ? scenes.filter((s) => s.t_start < 200)
          : actId === 'acto-2'
          ? scenes.filter((s) => s.t_start >= 200 && s.t_start < 400)
          : scenes.filter((s) => s.t_start >= 400);

      if (actScenes.length > 0) {
        if (!selectedSceneId || !actScenes.some((s) => s.id === selectedSceneId)) {
          handleSelectScene(actScenes[0]);
        }
      }
      setStatus(`Navegando a ${actId}: ${actScenes.length} escenas disponibles.`);
    },
    [scenes, selectedSceneId, handleSelectScene, setStatus]
  );

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

        // Ripple-shift any subsequent scenes on the same track to prevent overlap
        const others = scenes
          .filter((s) => s.id !== scene.id && s.track_id === newTrackId)
          .sort((a, b) => a.t_start - b.t_start);

        let nextAvailableT = newTStart + scene.duration + 10;
        const shiftedMap = new Map<string, Scene>();
        shiftedMap.set(updated.id, updated);

        for (const other of others) {
          if (other.t_start < nextAvailableT && other.t_start + other.duration > newTStart) {
            try {
              const shifted = await moveScene(
                projectPath,
                other.id,
                other.version,
                other.track_id,
                nextAvailableT,
                other.duration
              );
              shiftedMap.set(shifted.id, shifted);
              nextAvailableT = shifted.t_start + shifted.duration + 10;
            } catch {
              // ignore ripple error
            }
          } else if (other.t_start >= nextAvailableT) {
            nextAvailableT = Math.max(nextAvailableT, other.t_start + other.duration + 10);
          }
        }

        setScenes((prev) => prev.map((s) => shiftedMap.get(s.id) || (s.id === updated.id ? updated : s)));
        setStatus(`Escena '${updated.title}' reposicionada (v${updated.version}).`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error moviendo escena: ${msg}`);
        setStatus('Conflicto causal de concurrencia al mover escena.');
      }
    },
    [projectPath, scenes]
  );

  const handleCreateScene = useCallback(
    async (trackId: string, tStart: number, promptText?: string) => {
      try {
        let title = `Escena ${scenes.length + 1}`;
        let text = 'Borrador inicial redactado en la estación narrativa.';
        if (promptText && promptText.trim()) {
          const trimmed = promptText.trim();
          const firstSentence = trimmed.split(/[.?!;\n]/)[0].trim();
          if (firstSentence.length <= 40) {
            title = firstSentence;
          } else {
            const words = firstSentence.split(' ');
            let acc = '';
            for (const w of words) {
              if ((acc + ' ' + w).trim().length > 40) break;
              acc = (acc + ' ' + w).trim();
            }
            title = (acc || firstSentence.slice(0, 36)) + '...';
          }
          text = trimmed;
        }
        setStatus(`Creando nueva escena rápida '${title}' en T:${tStart}...`);
        const newScene = await createScene(
          projectPath,
          trackId,
          title,
          tStart,
          120,
          text
        );
        setScenes((prev) => (prev.some((s) => s.id === newScene.id) ? prev : [...prev, newScene]));
        setSelectedSceneId(newScene.id);
        if (typeof window !== 'undefined' && window.innerWidth < 900) {
          setIsLeftNavOpen(false);
        }
        setStatus(`Nueva escena '${newScene.title}' creada en T:${tStart}.`);
        if (promptText) {
          setToastMessage(`Escena creada a partir de tu prompt: "${title}"`);
          setToastType('success');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error creando escena: ${msg}`);
        setToastMessage(`Error creando escena: ${msg}`);
        setToastType('error');
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

  const handleCreateAnchor = useCallback(
    async (sourceSceneId: string, targetSceneId: string) => {
      try {
        const projId = project?.id || 'mock-proj-1';
        setStatus('Creando vínculo causal entre escenas...');
        const newAnchor = await createAnchor(
          projectPath,
          projId,
          sourceSceneId,
          targetSceneId,
          'causal',
          1.0
        );
        setAnchors((prev) => [...prev, newAnchor]);
        setStatus('Vínculo causal registrado en SQLite WAL.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error creando vínculo causal: ${msg}`);
      }
    },
    [projectPath, project]
  );

  const handleDuplicateScene = useCallback(
    async (scene: Scene) => {
      try {
        setStatus(`Duplicando escena '${scene.title}'...`);
        const newTStart = scene.t_start + scene.duration + 10;
        const newScene = await createScene(
          projectPath,
          scene.track_id,
          `${scene.title} (Copia)`,
          newTStart,
          scene.duration,
          scene.text
        );
        setScenes((prev) => [...prev, newScene]);
        setSelectedSceneId(newScene.id);
        if (typeof window !== 'undefined' && window.innerWidth < 900) {
          setIsLeftNavOpen(false);
        }
        setStatus(`Escena '${newScene.title}' duplicada con éxito.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error duplicando escena: ${msg}`);
      }
    },
    [projectPath]
  );

  const handleSplitScene = useCallback(
    async (scene: Scene) => {
      try {
        setStatus(`Dividiendo escena '${scene.title}'...`);
        const halfDuration = Math.max(30, Math.floor(scene.duration / 2));
        const words = (scene.text || '').split(/\s+/).filter(Boolean);
        const midPoint = Math.floor(words.length / 2);
        const text1 = words.slice(0, midPoint).join(' ');
        const text2 = words.slice(midPoint).join(' ');

        // Update current scene
        await updateSceneContent(projectPath, scene.id, scene.version, scene.title, text1 || scene.text);
        await moveScene(projectPath, scene.id, scene.version, scene.track_id, scene.t_start, halfDuration);

        // Create second scene
        const newTStart = scene.t_start + halfDuration + 5;
        const secondScene = await createScene(
          projectPath,
          scene.track_id,
          `${scene.title} (Parte 2)`,
          newTStart,
          halfDuration,
          text2 || 'Continuación de la escena...'
        );

        const updatedScenes = await listScenes(projectPath, project?.id || 'mock-proj-1');
        setScenes(updatedScenes);
        setSelectedSceneId(secondScene.id);
        if (typeof window !== 'undefined' && window.innerWidth < 900) {
          setIsLeftNavOpen(false);
        }
        setStatus(`Escena dividida en dos partes continuas.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error dividiendo escena: ${msg}`);
      }
    },
    [projectPath, project]
  );

  const handleUpdateSceneTitle = useCallback(
    async (sceneId: string, newTitle: string) => {
      const target = scenes.find((s) => s.id === sceneId);
      if (!target) return;
      const cleanTitle = newTitle.trim();
      if (!cleanTitle || cleanTitle === target.title) return;

      try {
        const updated = await updateSceneContent(
          projectPath,
          target.id,
          target.version,
          cleanTitle,
          target.text
        );
        setScenes((prev) =>
          prev.map((s) => (s.id === target.id ? { ...s, title: cleanTitle, version: updated.version } : s))
        );
        setStatus(`Título actualizado a '${cleanTitle}'`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error actualizando título: ${msg}`);
      }
    },
    [projectPath, scenes]
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
        setTracks((prev) => (prev.some((t) => t.id === newTrack.id) ? prev : [...prev, newTrack]));
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
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      {/* S3 / S7 — fixed atmospheric light bed: pure-CSS aurora orbs (no WebGL) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div
          className="absolute -top-[35%] left-[10%] h-[70vh] w-[70vw] rounded-full bg-indigo-600/10 blur-[130px]"
        />
        <div
          className="absolute -right-[15%] top-[20%] h-[60vh] w-[55vw] rounded-full bg-cyan-500/10 blur-[120px]"
        />
      </div>

      {/* 1. TOP GLOBAL HEADER (56px) - Stitch Architecture */}
      <header
        style={{
          height: '56px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'rgba(15, 17, 24, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          boxShadow:
            'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 10px 30px -10px rgba(0, 0, 0, 0.8)',
          zIndex: 100,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Dock Toggle, Brand Logo (24px, 1px border, white 'C'), Title & Project Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Toggle Left Structure Button (⌘D) */}
          <button
            onClick={handleToggleStructure}
            aria-label="Alternar Estructura de Arco"
            title="Alternar panel Estructura de Arco (⌘D)"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                isLeftNavOpen && leftNavTab === 'structure'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
              border:
                isLeftNavOpen && leftNavTab === 'structure'
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
              color:
                isLeftNavOpen && leftNavTab === 'structure' ? '#10b981' : '#787f8d',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>

          {/* Logo icon: Square 24px, dark background #161922, 1px border, white 'C' */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: '#161922',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              flexShrink: 0,
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'var(--font-sans)',
            }}
          >
            C
          </div>

          {/* Brand Title: Cadence Canvas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', userSelect: 'none' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#f1f3fa',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cadence Canvas
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: 'var(--zinc-400)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.4,
              }}
            >
              NOVEL OS
            </span>
          </div>

          {/* Project Pill: 'project.cadence' with folder_open icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#b0b6c3',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              backgroundColor: '#1a1e28',
              padding: '3px 9px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              userSelect: 'none',
            }}
            title={`Proyecto: ${projectPath}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8e95a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              <path d="M2 10h20" />
            </svg>
            <span>{projectPath}</span>
          </div>

          {/* Toggle Manuscript Binder Button (⌘B) - Sci-Fi Action Pill */}
          <button
            onClick={handleToggleBinder}
            title="Alternar Binder de Manuscrito (⌘B)"
            className="action-pill"
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor:
                isLeftNavOpen && leftNavTab === 'binder'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.04)',
              border:
                isLeftNavOpen && leftNavTab === 'binder'
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
              color:
                isLeftNavOpen && leftNavTab === 'binder' ? '#ffffff' : 'var(--zinc-300, #d4d4d8)',
            }}
          >
            <BookOpen size={13} strokeWidth={1.5} color={isLeftNavOpen && leftNavTab === 'binder' ? '#38bdf8' : 'var(--zinc-400, #a1a1aa)'} />
            <span>Manuscrito</span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--zinc-400, #a1a1aa)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              ⌘B
            </span>
          </button>

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

        {/* Center: view selector — native Tailwind pill (no WebGL, no solid cyan fill) */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            type="button"
            className="bg-[#181A22] text-zinc-100 font-medium text-xs border border-white/15 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm hover:border-white/25 transition-all"
            aria-label="Selector de vista del espacio de trabajo"
            aria-current="page"
            title="Timeline"
          >
            <Layers size={13} strokeWidth={1.5} color="#a1a1aa" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Right: Quiet ghost actions (Exportar, Ajustes) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            title="Exportar y compilar manuscrito (.docx, .md, .txt, .json)"
            className="btn-ghost-pill"
          >
            <Download size={14} strokeWidth={1.5} />
            <span>Exportar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Ajustes"
            title="Configuración de la Estación"
            className="btn-ghost-pill"
          >
            <Settings size={14} strokeWidth={1.5} />
            <span>Ajustes</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {/* Workspace Content Area (Unified Left Navigator + Timeline Canvas + Atomic Editor) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '6px',
            padding: '12px 14px 14px 14px',
            overflow: 'hidden',
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {/* 2. UNIFIED LEFT NAVIGATOR (max 320px: [Binder] · [Estructura] · [Metas]) */}
          {isLeftNavOpen && (
            <ManuscriptBinder
              scenes={scenes}
              tracks={tracks}
              selectedSceneId={selectedSceneId}
              onSelectScene={handleSelectScene}
              onClose={() => setIsLeftNavOpen(false)}
              onCreateScene={() => {
                if (tracks.length > 0) {
                  const maxT = scenes.length > 0 ? Math.max(...scenes.map((s) => s.t_start + s.duration)) : 0;
                  handleCreateScene(tracks[0].id, maxT + 20);
                }
              }}
              activeTab={leftNavTab}
              onTabChange={setLeftNavTab}
              activeAct={activeAct}
              onSelectAct={handleSelectAct}
              projectSettings={projectSettings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onShowAnalytics={() => {
                setStatus('Analítica de Ritmo: Gary Provost variance index en 5.4.');
              }}
              width={binderWidth}
            />
          )}

          {/* Left Binder Splitter Handle */}
          {isLeftNavOpen && (
            <div
              onMouseDown={handleBinderMouseDown}
              onDoubleClick={handleResetBinderWidth}
              className="binder-resize-splitter"
              title="Arrastrar para redimensionar el Binder · Doble clic para restablecer (320px)"
              style={{
                width: '8px',
                margin: '0 -1px',
                cursor: 'col-resize',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 26,
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '2px',
                  height: isResizingBinder ? '100%' : '32px',
                  borderRadius: '2px',
                  backgroundColor: isResizingBinder ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.12)',
                  transition: 'background-color 0.15s ease, height 0.15s ease',
                }}
              />
            </div>
          )}

          {/* Center Stage: Timeline DAW Canvas */}
          <section
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 17, 24, 0.8)',
              backdropFilter: 'blur(24px) saturate(1.35)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow:
                'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 10px 30px -10px rgba(0, 0, 0, 0.8)',
              minWidth: 0,
            }}
          >
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
                onCreateAnchor={handleCreateAnchor}
                onDuplicateScene={handleDuplicateScene}
                onSplitScene={handleSplitScene}
                onUpdateSceneTitle={handleUpdateSceneTitle}
                onCreateTrackClick={() => setIsCreateTrackOpen(true)}
              />
            </ErrorBoundary>

            {/* S1 — crystal bevel: inset top highlight above the canvas */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </section>

          {/* Right Editor Splitter Handle */}
          {selectedScene && (
            <div
              onMouseDown={handleEditorMouseDown}
              onDoubleClick={handleResetEditorWidth}
              className="editor-resize-splitter"
              title="Arrastrar para redimensionar el Editor · Doble clic para restablecer (420px)"
              style={{
                width: '8px',
                margin: '0 -1px',
                cursor: 'col-resize',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 26,
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '2px',
                  height: isResizingEditor ? '100%' : '32px',
                  borderRadius: '2px',
                  backgroundColor: isResizingEditor ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.12)',
                  transition: 'background-color 0.15s ease, height 0.15s ease',
                }}
              />
            </div>
          )}

          {/* Right Stage: Atomic Editor (Displayed smoothly with fluid drawer transition) */}
          <aside
            style={{
              width: selectedScene ? `${editorWidth}px` : '0px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
              opacity: selectedScene ? 1 : 0,
              visibility: selectedScene ? 'visible' : 'hidden',
              transform: selectedScene ? 'translateX(0)' : 'translateX(16px)',
              transition: isResizingEditor
                ? 'none'
                : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.22s', // transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {selectedScene && (
              <AtomicEditor
                scene={selectedScene}
                projectPath={projectPath}
                isZen={false}
                onToggleZen={handleToggleZen}
                onSceneUpdated={handleSceneUpdated}
                onDeleteScene={handleDeleteScene}
                onClose={() => setSelectedSceneId(null)}
              />
            )}
          </aside>
        </div>
      </main>

      <CreateTrackModal
        isOpen={isCreateTrackOpen}
        onClose={() => setIsCreateTrackOpen(false)}
        onCreate={handleCreateTrack}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          initialSettings={projectSettings}
          onSave={(updated) => {
            setProjectSettings(updated);
            if (project) {
              setProject({ ...project, title: updated.title, author: updated.author });
            }
            setToastMessage('Configuración del proyecto actualizada');
            setToastType('success');
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          project={project}
          tracks={tracks}
          scenes={scenes}
          onClose={() => setIsExportOpen(false)}
          onExportSuccess={(msg) => {
            setToastMessage(msg);
            setToastType('success');
          }}
          onTauriExport={async () => {
            const outName = `${projectPath.replace(/\.cadence$/, '')}_compilado.docx`;
            await exportDocx(projectPath, project?.id || 'mock-proj-1', outName);
          }}
        />
      )}

      {/* Floating Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default App;
