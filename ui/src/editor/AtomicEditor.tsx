import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Scene, TonalHistogram } from '../types';
import { updateSceneContent, computeTonalMetrics, bumpSceneVersion } from '../api';
import { TonalHud } from './TonalHud';
import { User, MapPin, Box, Maximize2, Trash2, X, GitCommit, AlertTriangle } from 'lucide-react';

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
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);

  // Zen Mode Typing Fade-out Controls
  const [isTyping, setIsTyping] = useState(false);
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  const typingTimerRef = useRef<number | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const metricsTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const versionRef = useRef<number>(scene.version);
  const inFlightSaveRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<{ title: string; text: string } | null>(null);

  useEffect(() => {
    // Clear any timers from previous scene to prevent cross-scene save leaks
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (metricsTimerRef.current) {
      clearTimeout(metricsTimerRef.current);
      metricsTimerRef.current = null;
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    inFlightSaveRef.current = false;

    setDraftTitle(scene.title);
    setDraftText(scene.text);
    versionRef.current = scene.version;
    setExpectedVersion(scene.version);
    setHasConflict(false);
    setConflictError(null);
    setSaveStatus('saved');
    setConfirmDelete(false);
    setSelectedSentenceIndex(null);
    setIsTyping(false);
    computeTonalMetrics(scene.text).then(setMetrics).catch(() => {});

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [scene.id]);

  const executeSave = useCallback(
    async (titleToSave: string, textToSave: string) => {
      if (inFlightSaveRef.current) {
        // Enqueue latest text to be saved as soon as in-flight promise completes
        pendingSaveRef.current = { title: titleToSave, text: textToSave };
        return;
      }
      try {
        inFlightSaveRef.current = true;
        setSaveStatus('saving');
        const ver = versionRef.current;
        const updated = await updateSceneContent(projectPath, scene.id, ver, titleToSave, textToSave);
        versionRef.current = updated.version;
        setExpectedVersion(updated.version);
        setHasConflict(false);
        setConflictError(null);
        setSaveStatus('saved');
        onSceneUpdated(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isConflict =
          msg.includes('conflict') ||
          msg.includes('version') ||
          msg.includes('StaleMutationConflict') ||
          msg.includes('75');
        if (isConflict) {
          setHasConflict(true);
          setConflictError(msg);
          setSaveStatus('conflict');
        } else {
          setSaveStatus('dirty');
        }
      } finally {
        inFlightSaveRef.current = false;
        if (pendingSaveRef.current) {
          const next = pendingSaveRef.current;
          pendingSaveRef.current = null;
          executeSave(next.title, next.text);
        }
      }
    },
    [projectPath, scene.id, onSceneUpdated]
  );

  const scheduleSave = useCallback(
    (newTitle: string, newText: string) => {
      setSaveStatus('dirty');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => executeSave(newTitle, newText), 600);
    },
    [executeSave]
  );

  const resetTypingState = useCallback(() => {
    setIsTyping(true);
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 1800);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  }, [isTyping]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    setDraftText(nextText);
    resetTypingState();
    setSelectedSentenceIndex(null);
    scheduleSave(draftTitle, nextText);
    if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
    metricsTimerRef.current = window.setTimeout(() => {
      computeTonalMetrics(nextText).then(setMetrics).catch(() => {});
    }, 200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(e.target.value);
    resetTypingState();
    scheduleSave(e.target.value, draftText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      executeSave(draftTitle, draftText);
    } else if (e.key === 'F11' || (e.key === 'Escape' && isZen)) {
      e.preventDefault();
      onToggleZen();
    }
  };

  // Jump and highlight clicked Gary Provost sentence bar
  const jumpToSentence = useCallback(
    (sentenceIndex: number) => {
      setSelectedSentenceIndex(sentenceIndex);
      const el = textareaRef.current;
      if (!el) return;

      const regex = /[^.!?]+[.!?]*/g;
      let match: RegExpExecArray | null;
      let cur = 0;
      let targetRange: { start: number; end: number } | null = null;

      while ((match = regex.exec(draftText)) !== null) {
        if (match[0].trim().length > 0) {
          if (cur === sentenceIndex) {
            const raw = match[0];
            const leadingWs = raw.match(/^\s*/)?.[0].length ?? 0;
            const trailingWs = raw.match(/\s*$/)?.[0].length ?? 0;
            const start = match.index + leadingWs;
            const end = match.index + raw.length - trailingWs;
            targetRange = { start, end };
            break;
          }
          cur++;
        }
      }

      if (targetRange) {
        el.focus();
        el.setSelectionRange(targetRange.start, targetRange.end);

        const textBefore = draftText.slice(0, targetRange.start);
        const lineCountBefore = textBefore.split('\n').length;
        const totalLines = draftText.split('\n').length;
        if (totalLines > 0 && el.scrollHeight > el.clientHeight) {
          const approxLineH = 16 * 1.75;
          const targetScrollTop = Math.max(0, (lineCountBefore - 2) * approxLineH);
          el.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
      }
    },
    [draftText]
  );

  const insertMention = (prefix: '@' | '#' | '!') => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart,
      end = el.selectionEnd;
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
    versionRef.current = nextV;
    setExpectedVersion(nextV);
    executeSave(draftTitle, draftText);
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
        onMouseMove={handleMouseMove}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#11141e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 24px',
          transition: 'background-color 0.25s ease',
        }}
      >
        {/* Floating Top Pill HUD in Zen Mode - Fades out smoothly during active typing */}
        <div
          onMouseEnter={() => setIsHoveringToolbar(true)}
          onMouseLeave={() => setIsHoveringToolbar(false)}
          style={{
            position: 'fixed',
            top: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 10000,
            opacity: isTyping && !isHoveringToolbar ? 0 : 1,
            transform: isTyping && !isHoveringToolbar ? 'translateY(-10px)' : 'translateY(0)',
            pointerEvents: isTyping && !isHoveringToolbar ? 'none' : 'auto',
            transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <TonalHud
            metrics={metrics}
            wordCount={wordCount}
            charCount={charCount}
            compact
            selectedSentenceIndex={selectedSentenceIndex}
            onSelectSentence={jumpToSentence}
          />
          <button
            className="btn"
            onClick={onToggleZen}
            style={{
              padding: '0 12px',
              height: '26px',
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
            <span style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} strokeWidth={1.5} color="#f87171" />
              <span>Conflicto OCC: Versión remota v{scene.version} supera v{expectedVersion}.</span>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleForceRebase}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Rebasar y Forzar
              </button>
              <button
                onClick={handleDiscardLocal}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'transparent',
                  color: '#fca5a5',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            width: '100%',
            maxWidth: '74ch',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginTop: hasConflict ? '20px' : '72px',
          }}
        >
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
              letterSpacing: '-0.025em',
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
              color: '#e2e8f0',
              fontSize: '16px',
              lineHeight: 1.75,
              letterSpacing: '0.006em',
              outline: 'none',
              resize: 'none',
              caretColor: 'var(--accent-cyan)',
              fontFamily: 'var(--font-editorial)',
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
          className="title-input-ghost"
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--zinc-100, #f4f4f5)',
            backgroundColor: 'transparent',
            border: '1px solid transparent',
            borderRadius: '4px',
            padding: '2px 6px',
            flex: 1,
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.backgroundColor = 'rgba(39, 39, 42, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(63, 63, 70, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(39, 39, 42, 0.5)';
            e.currentTarget.style.borderColor = 'rgba(63, 63, 70, 0.7)';
            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(63, 63, 70, 0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Version / Sync Status Badge */}
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
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

          {/* Manual Version Revision Bump (Author-controlled draft progression) */}
          <button
            type="button"
            className="btn btn-secondary"
            title={`Promover manualmente a la siguiente revisión editorial (v${expectedVersion + 1})`}
            onClick={async () => {
              try {
                const bumped = await bumpSceneVersion(projectPath, scene.id, expectedVersion);
                setExpectedVersion(bumped.version);
                onSceneUpdated(bumped);
              } catch (err) {
                console.error('[AtomicEditor] Error bumping version:', err);
              }
            }}
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              padding: '2px 8px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <GitCommit size={13} strokeWidth={1.5} />
            <span>v{expectedVersion + 1}</span>
          </button>

          {/* Zen Toggle Button (Ghost Tier) */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onToggleZen}
            title="Modo Zen inmersivo (F11)"
            style={{
              padding: '0 8px',
              height: '24px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Maximize2 size={13} strokeWidth={1.5} />
            <span>Zen</span>
          </button>

          {/* Deletion Safeguard Button (Destructive Tier: Ghost default, red on hover) */}
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
                    padding: '3px 8px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #ef4444',
                  }}
                >
                  ¿Borrar?
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  title="Cancelar"
                  style={{
                    padding: '3px 7px',
                    backgroundColor: 'transparent',
                    color: 'var(--zinc-400, #a1a1aa)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-destructive"
                onClick={() => setConfirmDelete(true)}
                title="Eliminar escena"
                style={{
                  padding: '3px 8px',
                  height: '24px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                <span>Borrar</span>
              </button>
            ))}

          {/* Vertical Divider before Close Button */}
          {onClose && (
            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(63, 63, 70, 0.5)', margin: '0 2px' }} />
          )}

          {/* Close Panel Button (Ghost Tier) */}
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              aria-label="Cerrar editor lateral"
              title="Cerrar editor lateral"
              style={{
                width: '26px',
                height: '26px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={15} strokeWidth={1.5} />
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

      {/* Sleek Progressive Disclosure Tonal HUD */}
      <TonalHud
        metrics={metrics}
        wordCount={wordCount}
        charCount={charCount}
        selectedSentenceIndex={selectedSentenceIndex}
        onSelectSentence={jumpToSentence}
      />

      {/* Entity Mention Quick Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
        <span style={{ color: 'var(--zinc-500, #71717a)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Menciones:
        </span>
        <button
          type="button"
          className="badge-mention-character"
          onClick={() => insertMention('@')}
          title="Mencionar Personaje"
        >
          <User size={12} strokeWidth={1.5} />
          <span>Personaje</span>
        </button>
        <button
          type="button"
          className="badge-mention-location"
          onClick={() => insertMention('#')}
          title="Mencionar Lugar"
        >
          <MapPin size={12} strokeWidth={1.5} />
          <span>Lugar</span>
        </button>
        <button
          type="button"
          className="badge-mention-object"
          onClick={() => insertMention('!')}
          title="Mencionar Objeto"
        >
          <Box size={12} strokeWidth={1.5} />
          <span>Objeto</span>
        </button>
      </div>

      {/* Primary Drafting Textarea: Comfortable, distraction-free matte typography */}
      <textarea
        ref={textareaRef}
        value={draftText}
        onChange={handleTextChange}
        placeholder="Redacta el contenido de la escena literaria..."
        style={{
          flex: 1,
          backgroundColor: '#11141e',
          border: '1px solid var(--border-specular)',
          borderRadius: '10px',
          color: '#e2e8f0',
          fontSize: '16px',
          lineHeight: 1.75,
          letterSpacing: '0.004em',
          padding: '16px',
          outline: 'none',
          resize: 'none',
          caretColor: 'var(--accent-cyan)',
          fontFamily: 'var(--font-editorial)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      />
    </div>
  );
};
