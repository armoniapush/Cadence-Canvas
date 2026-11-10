import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Scene, TonalHistogram } from '../types';
import { updateSceneContent, computeTonalMetrics } from '../api';
import { TonalHud } from './TonalHud';

export interface AtomicEditorProps {
  scene: Scene;
  projectPath: string;
  isZen: boolean;
  onToggleZen: () => void;
  onSceneUpdated: (updated: Scene) => void;
  onClose?: () => void;
  onDeleteScene?: (sceneId: string) => void;
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({
  scene,
  projectPath,
  isZen,
  onToggleZen,
  onSceneUpdated,
  onClose,
  onDeleteScene,
}) => {
  const [draftTitle, setDraftTitle] = useState(scene.title);
  const [draftText, setDraftText] = useState(scene.text);
  const [expectedVersion, setExpectedVersion] = useState(scene.version);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'conflict'>('saved');
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TonalHistogram | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const metricsTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraftTitle(scene.title);
    setDraftText(scene.text);
    setExpectedVersion(scene.version);
    setHasConflict(false);
    setConflictError(null);
    setSaveStatus('saved');
    setConfirmDelete(false);
    computeTonalMetrics(scene.text).then(setMetrics).catch(() => {});
  }, [scene.id]);

  const executeSave = useCallback(
    async (titleToSave: string, textToSave: string, versionToSave: number) => {
      try {
        setSaveStatus('saving');
        const updated = await updateSceneContent(projectPath, scene.id, versionToSave, titleToSave, textToSave);
        setExpectedVersion(updated.version);
        setHasConflict(false);
        setConflictError(null);
        setSaveStatus('saved');
        onSceneUpdated(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isConflict = msg.includes('conflict') || msg.includes('version') || msg.includes('StaleMutationConflict') || msg.includes('75');
        if (isConflict) {
          setHasConflict(true);
          setConflictError(msg);
          setSaveStatus('conflict');
        } else {
          setSaveStatus('dirty');
        }
      }
    },
    [projectPath, scene.id, onSceneUpdated]
  );

  const scheduleSave = useCallback(
    (newTitle: string, newText: string) => {
      setSaveStatus('dirty');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => executeSave(newTitle, newText, expectedVersion), 600);
    },
    [executeSave, expectedVersion]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    setDraftText(nextText);
    scheduleSave(draftTitle, nextText);
    if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
    metricsTimerRef.current = window.setTimeout(() => {
      computeTonalMetrics(nextText).then(setMetrics).catch(() => {});
    }, 200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(e.target.value);
    scheduleSave(e.target.value, draftText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      executeSave(draftTitle, draftText, expectedVersion);
    } else if (e.key === 'F11' || (e.key === 'Escape' && isZen)) {
      e.preventDefault();
      onToggleZen();
    }
  };

  const insertMention = (prefix: '@' | '#' | '!') => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, end = el.selectionEnd;
    const tag = prefix === '@' ? '@Personaje ' : prefix === '#' ? '#Lugar ' : '!Objeto ';
    const next = draftText.slice(0, s) + tag + draftText.slice(end);
    setDraftText(next);
    scheduleSave(draftTitle, next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(s + tag.length, s + tag.length);
    }, 0);
  };

  const handleForceRebase = () => {
    const nextV = scene.version > expectedVersion ? scene.version : expectedVersion + 1;
    setExpectedVersion(nextV);
    executeSave(draftTitle, draftText, nextV);
  };

  const handleDiscardLocal = () => {
    setDraftText(scene.text);
    setDraftTitle(scene.title);
    setExpectedVersion(scene.version);
    setHasConflict(false);
    setConflictError(null);
    setSaveStatus('saved');
    computeTonalMetrics(scene.text).then(setMetrics).catch(() => {});
  };

  const wordCount = draftText.split(/\s+/).filter(Boolean).length;
  const charCount = draftText.length;

  if (isZen) {
    return (
      <div
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 24px',
        }}
      >
        {/* Floating Top Pill HUD in Zen Mode */}
        <div
          style={{
            position: 'fixed',
            top: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 10000,
          }}
        >
          <TonalHud metrics={metrics} wordCount={wordCount} charCount={charCount} compact />
          <button
            className="btn"
            onClick={onToggleZen}
            style={{
              padding: '0 12px',
              height: '30px',
              backgroundColor: 'var(--bg-elevated)',
              fontSize: '11px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            Salir Zen (F11 / Esc)
          </button>
        </div>

        {hasConflict && (
          <div
            style={{
              marginTop: '56px',
              width: '100%',
              maxWidth: '74ch',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#fca5a5' }}>⚠️ Conflicto OCC: Versión remota v{scene.version} supera v{expectedVersion}.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleForceRebase} style={{ padding: '4px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>Rebasar y Forzar</button>
              <button onClick={handleDiscardLocal} style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '11px' }}>Descartar</button>
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '74ch', display: 'flex', flexDirection: 'column', flex: 1, marginTop: hasConflict ? '20px' : '72px' }}>
          <input
            type="text"
            value={draftTitle}
            onChange={handleTitleChange}
            placeholder="Título de la Escena..."
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border-specular)',
              color: 'var(--text-primary)',
              fontSize: '26px',
              fontWeight: 700,
              padding: '8px 0',
              outline: 'none',
              marginBottom: '24px',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={handleTextChange}
            placeholder="Comienza a redactar la escena literaria..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '17px',
              lineHeight: 1.85,
              outline: 'none',
              resize: 'none',
              caretColor: 'var(--text-primary)',
              fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-specular)',
        borderRadius: '14px',
        padding: '14px',
        gap: '12px',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.35)',
        animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Editor Top Bar: Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          value={draftTitle}
          onChange={handleTitleChange}
          style={{
            backgroundColor: 'var(--bg-rack)',
            border: '1px solid var(--border-specular)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            padding: '6px 10px',
            flex: 1,
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Version / Sync Status Badge */}
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '3px 7px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color:
                saveStatus === 'conflict'
                  ? '#ef4444'
                  : saveStatus === 'saving'
                  ? '#f59e0b'
                  : saveStatus === 'dirty'
                  ? 'var(--text-secondary)'
                  : '#10b981',
            }}
          >
            {saveStatus === 'saving'
              ? 'Guardando...'
              : saveStatus === 'dirty'
              ? 'Modificado'
              : saveStatus === 'conflict'
              ? 'Conflicto OCC'
              : `v${expectedVersion}`}
          </span>

          {/* Zen Toggle Button */}
          <button
            className="btn btn-ghost"
            onClick={onToggleZen}
            title="Modo Zen inmersivo (F11)"
            style={{
              padding: '0 8px',
              height: '24px',
              fontSize: '11px',
            }}
          >
            <span>🗖</span> Zen
          </button>

          {/* Deletion Safeguard Button */}
          {onDeleteScene &&
            (confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => {
                    onDeleteScene(scene.id);
                    setConfirmDelete(false);
                  }}
                  title="Confirmar eliminación permanente"
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ¿Borrar?
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  title="Cancelar"
                  style={{
                    padding: '4px 7px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-specular)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Eliminar escena"
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>✕</span> Borrar
              </button>
            ))}

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Cerrar editor lateral"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Conflict Resolution Banner */}
      {hasConflict && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            fontSize: '11px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#fca5a5', lineHeight: 1.3 }}>
            <strong>Conflicto:</strong> Mutación remota ({conflictError || `v${scene.version}`}).
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleForceRebase}
              style={{
                padding: '3px 8px',
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              Rebasar
            </button>
            <button
              onClick={handleDiscardLocal}
              style={{
                padding: '3px 8px',
                backgroundColor: 'transparent',
                color: '#fca5a5',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                fontSize: '10px',
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Unified Horizontal Chromatic Spectral Wave / Rhythm Bar */}
      <TonalHud metrics={metrics} wordCount={wordCount} charCount={charCount} />

      {/* Entity Mention Quick Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Menciones:
        </span>
        <button
          className="pill-btn"
          onClick={() => insertMention('@')}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            color: 'var(--accent-cyan)',
            borderColor: 'rgba(56, 189, 248, 0.25)',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          @ Personaje
        </button>
        <button
          className="pill-btn"
          onClick={() => insertMention('#')}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            color: 'var(--accent-emerald)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          # Lugar
        </button>
        <button
          className="pill-btn"
          onClick={() => insertMention('!')}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            color: 'var(--accent-amber)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          ! Objeto
        </button>
      </div>

      {/* Primary Drafting Textarea */}
      <textarea
        ref={textareaRef}
        value={draftText}
        onChange={handleTextChange}
        placeholder="Redacta el contenido de la escena literaria..."
        style={{
          flex: 1,
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-specular)',
          borderRadius: '10px',
          color: 'var(--text-main)',
          fontSize: '13px',
          lineHeight: 1.7,
          padding: '12px',
          outline: 'none',
          resize: 'none',
          caretColor: 'var(--accent-cyan)',
          fontFamily: 'var(--font-sans)',
        }}
      />
    </div>
  );
};
