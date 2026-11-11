import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Project, Track, Scene } from '../types';

export interface ExportModalProps {
  project: Project | null;
  tracks: Track[];
  scenes: Scene[];
  onClose: () => void;
  onExportSuccess: (msg: string) => void;
  onTauriExport?: () => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  tracks,
  scenes,
  onClose,
  onExportSuccess,
  onTauriExport,
}) => {
  const [format, setFormat] = useState<'md' | 'docx' | 'txt' | 'json'>('md');
  const [scopeTrackId, setScopeTrackId] = useState<string>('all');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);

    try {
      const sortedScenes = [...scenes].sort((a, b) => a.t_start - b.t_start);
      const filteredScenes =
        scopeTrackId === 'all'
          ? sortedScenes
          : sortedScenes.filter((s) => s.track_id === scopeTrackId);

      const title = project?.title || 'Manuscrito Cadence';
      const author = project?.author || 'Autor';
      const timestamp = new Date().toLocaleDateString('es-ES');

      let fileContent = '';
      let mimeType = 'text/plain';
      let extension = format;

      if (format === 'md') {
        mimeType = 'text/markdown;charset=utf-8';
        let md = `# ${title}\n**Autor:** ${author}\n*Generado con Cadence Canvas · ${timestamp}*\n\n---\n\n`;
        filteredScenes.forEach((s, idx) => {
          const track = tracks.find((t) => t.id === s.track_id);
          md += `## Escena ${idx + 1}: ${s.title}\n`;
          if (includeMetadata) {
            md += `> **Hilo:** ${track?.name || 'General'} | **T:** ${s.t_start}s | **Palabras:** ${s.word_count}\n\n`;
          }
          md += `${s.text || '*(Escena sin contenido redactado)*'}\n\n`;
        });
        fileContent = md;
      } else if (format === 'txt') {
        mimeType = 'text/plain;charset=utf-8';
        let txt = `${title.toUpperCase()}\nAutor: ${author}\nFecha: ${timestamp}\n\n${'='.repeat(40)}\n\n`;
        filteredScenes.forEach((s, idx) => {
          txt += `[${idx + 1}] ${s.title.toUpperCase()}\n`;
          txt += `${s.text || ''}\n\n${'-'.repeat(30)}\n\n`;
        });
        fileContent = txt;
      } else if (format === 'json') {
        mimeType = 'application/json;charset=utf-8';
        fileContent = JSON.stringify(
          {
            project,
            exportedAt: new Date().toISOString(),
            trackCount: tracks.length,
            sceneCount: filteredScenes.length,
            scenes: filteredScenes,
          },
          null,
          2
        );
      } else if (format === 'docx') {
        // If in Tauri desktop and callback provided, run backend docx generator
        if (onTauriExport) {
          await onTauriExport();
          onExportSuccess(`Manuscrito exportado exitosamente a formato Word (.docx)`);
          onClose();
          return;
        }
        // Fallback browser pseudo-docx / RTF
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileContent = `# ${title}\nAutor: ${author}\n\n` + filteredScenes.map((s) => `### ${s.title}\n\n${s.text}`).join('\n\n');
        extension = 'docx';
      }

      // Browser download trigger
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      a.href = url;
      a.download = `${safeTitle}_compilado.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExportSuccess(`Manuscrito exportado exitosamente (${filteredScenes.length} escenas en .${extension})`);
      onClose();
    } catch (err) {
      console.error('Error al exportar manuscrito:', err);
    } finally {
      setIsExporting(false);
    }
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
          width: '440px',
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
                backgroundColor: '#10b981',
              }}
            />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Exportar y Compilar Manuscrito
            </h2>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Cerrar modal de exportación"
            style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Formato de Salida
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { id: 'md', label: 'Markdown (.md)', desc: 'Ideal para Obsidian/Ulysses' },
                { id: 'docx', label: 'Word (.docx)', desc: 'Manuscrito editorial formal' },
                { id: 'txt', label: 'Texto Plano (.txt)', desc: 'Sin formato / Lectura pura' },
                { id: 'json', label: 'Datos JSON (.json)', desc: 'Backup estructurado' },
              ].map((fmt) => (
                <div
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: format === fmt.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                    backgroundColor: format === fmt.id ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-canvas)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: format === fmt.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {fmt.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {fmt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Alcance de la Compilación
            </label>
            <select
              value={scopeTrackId}
              onChange={(e) => setScopeTrackId(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="all">Todo el manuscrito (secuencia temporal global)</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  Solo hilo: {t.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="include-metadata-check"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
            />
            <label htmlFor="include-metadata-check" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Incluir encabezados con hilo, minutaje y métricas en cada escena
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isExporting}
            >
              {isExporting ? 'Compilando...' : 'Exportar y Descargar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
