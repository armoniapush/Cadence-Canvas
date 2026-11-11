import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface ProjectSettings {
  title: string;
  author: string;
  targetWords: number;
  autosaveMs: number;
  editorFontSize: number;
  defaultMagnet: boolean;
}

export interface SettingsModalProps {
  initialSettings: ProjectSettings;
  onSave: (settings: ProjectSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialSettings,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(initialSettings.title);
  const [author, setAuthor] = useState(initialSettings.author);
  const [targetWords, setTargetWords] = useState(initialSettings.targetWords);
  const [autosaveMs, setAutosaveMs] = useState(initialSettings.autosaveMs);
  const [editorFontSize, setEditorFontSize] = useState(initialSettings.editorFontSize);
  const [defaultMagnet, setDefaultMagnet] = useState(initialSettings.defaultMagnet);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'Proyecto sin título',
      author: author.trim() || 'Autor',
      targetWords: Math.max(1000, targetWords),
      autosaveMs,
      editorFontSize,
      defaultMagnet,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '460px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          padding: '24px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
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
                backgroundColor: 'var(--accent-primary)',
              }}
            />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Configuración de la Estación Narrativa
            </h2>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Cerrar ventana de configuración"
            style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Título del Manuscrito
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la obra..."
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Autor
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nombre del autor..."
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Meta de Palabras
              </label>
              <input
                type="number"
                step="1000"
                min="1000"
                value={targetWords}
                onChange={(e) => setTargetWords(parseInt(e.target.value, 10) || 80000)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Auto-guardado
              </label>
              <select
                value={autosaveMs}
                onChange={(e) => setAutosaveMs(parseInt(e.target.value, 10))}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value={400}>Inmediato (400 ms)</option>
                <option value={600}>Equilibrado (600 ms)</option>
                <option value={1200}>Pausado (1.2 s)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Tamaño de Letra (Editor)
              </label>
              <select
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(parseInt(e.target.value, 10))}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value={14}>Compacto (14 px)</option>
                <option value={16}>Estándar Pro (16 px)</option>
                <option value={18}>Inmersivo (18 px)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
            <input
              type="checkbox"
              id="default-magnet-check"
              checked={defaultMagnet}
              onChange={(e) => setDefaultMagnet(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
            />
            <label htmlFor="default-magnet-check" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Activar imantación magnética por defecto en la línea temporal
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Guardar Ajustes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
