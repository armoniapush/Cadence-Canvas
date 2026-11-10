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
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({
  scene,
  projectPath,
  isZen,
  onToggleZen,
  onSceneUpdated,
  onClose,
}) => {
  const [draftTitle, setDraftTitle] = useState(scene.title);
  const [draftText, setDraftText] = useState(scene.text);
  const [expectedVersion, setExpectedVersion] = useState(scene.version);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'conflict'>('saved');
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TonalHistogram | null>(null);

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
    setTimeout(() => { el.focus(); el.setSelectionRange(s + tag.length, s + tag.length); }, 0);
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
      <div onKeyDown={handleKeyDown} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#090a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
        <div style={{ position: 'fixed', top: '16px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10000 }}>
          <TonalHud metrics={metrics} wordCount={wordCount} charCount={charCount} compact />
          <button onClick={onToggleZen} style={{ padding: '6px 14px', backgroundColor: 'rgba(24, 27, 38, 0.85)', border: '1px solid var(--border-specular)', borderRadius: '20px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
            Salir Zen (F11 / Esc)
          </button>
        </div>
        {hasConflict && (
          <div style={{ marginTop: '50px', width: '100%', maxWidth: '72ch', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fca5a5' }}>⚠️ Conflicto OCC: Versión remota v{scene.version} supera v{expectedVersion}.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleForceRebase} style={{ padding: '3px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px' }}>Rebasar y Forzar</button>
              <button onClick={handleDiscardLocal} style={{ padding: '3px 8px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '11px' }}>Descartar</button>
            </div>
          </div>
        )}
        <div style={{ width: '100%', maxWidth: '72ch', display: 'flex', flexDirection: 'column', flex: 1, marginTop: hasConflict ? '16px' : '64px' }}>
          <input type="text" value={draftTitle} onChange={handleTitleChange} placeholder="Título de la Escena..." style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#f1f5f9', fontSize: '24px', fontWeight: 700, padding: '8px 0', outline: 'none', marginBottom: '20px' }} />
          <textarea ref={textareaRef} value={draftText} onChange={handleTextChange} placeholder="Comienza a redactar la escena..." style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '16px', lineHeight: 1.8, outline: 'none', resize: 'none', caretColor: '#38bdf8' }} />
        </div>
      </div>
    );
  }

  return (
    <div onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-specular)', borderRadius: '6px', padding: '12px', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input type="text" value={draftTitle} onChange={handleTitleChange} style={{ backgroundColor: 'var(--bg-rack)', border: '1px solid var(--border-specular)', borderRadius: '4px', color: '#f1f5f9', fontSize: '13px', fontWeight: 600, padding: '4px 8px', flex: 1, marginRight: '8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: saveStatus === 'conflict' ? '#ef4444' : saveStatus === 'saving' ? '#f59e0b' : saveStatus === 'dirty' ? '#94a3b8' : '#10b981' }}>
            {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'dirty' ? 'Modificado' : saveStatus === 'conflict' ? 'Conflicto OCC' : `v${expectedVersion}`}
          </span>
          <button onClick={onToggleZen} title="Modo Zen (F11)" style={{ padding: '4px 8px', backgroundColor: 'var(--bg-rack)', border: '1px solid var(--border-specular)', borderRadius: '4px', color: 'var(--accent-cyan)', fontSize: '11px' }}>⛶ Zen</button>
          {onClose && <button onClick={onClose} style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '14px' }}>✕</button>}
        </div>
      </div>

      {hasConflict && (
        <div style={{ padding: '8px 10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fca5a5', lineHeight: 1.3 }}><strong>Conflicto:</strong> Mutación remota ({conflictError || 'v' + scene.version}).</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleForceRebase} style={{ padding: '2px 6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '10px' }}>Rebasar</button>
            <button onClick={handleDiscardLocal} style={{ padding: '2px 6px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '3px', fontSize: '10px' }}>Descartar</button>
          </div>
        </div>
      )}

      <TonalHud metrics={metrics} wordCount={wordCount} charCount={charCount} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Menciones:</span>
        <button onClick={() => insertMention('@')} style={{ padding: '2px 6px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '3px', fontSize: '10px' }}>@ Personaje</button>
        <button onClick={() => insertMention('#')} style={{ padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '3px', fontSize: '10px' }}># Lugar</button>
        <button onClick={() => insertMention('!')} style={{ padding: '2px 6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '3px', fontSize: '10px' }}>! Objeto</button>
      </div>

      <textarea
        ref={textareaRef}
        value={draftText}
        onChange={handleTextChange}
        placeholder="Redacta el contenido de la escena..."
        style={{ flex: 1, backgroundColor: '#0c0e16', border: '1px solid var(--border-specular)', borderRadius: '4px', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, padding: '10px', outline: 'none', resize: 'none', caretColor: '#38bdf8' }}
      />
    </div>
  );
};
