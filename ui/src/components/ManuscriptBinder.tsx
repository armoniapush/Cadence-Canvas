import { useState, useMemo } from 'react';
import type { Scene, Track } from '../types';

export interface ManuscriptBinderProps {
  scenes: Scene[];
  tracks: Track[];
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene) => void;
  onClose: () => void;
}

export function ManuscriptBinder({
  scenes,
  tracks,
  selectedSceneId,
  onSelectScene,
  onClose,
}: ManuscriptBinderProps) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'chronological' | 'tracks'>('chronological');

  const trkMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  // Total manuscript metrics
  const totalWords = useMemo(
    () => scenes.reduce((acc, s) => acc + (s.word_count || 0), 0),
    [scenes]
  );
  const totalMins = Math.max(1, Math.ceil(totalWords / 240));

  // Filtered and chronologically ordered scenes
  const chronologicalScenes = useMemo(() => {
    return [...scenes]
      .filter((s) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return s.title.toLowerCase().includes(q) || (s.text || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.t_start !== b.t_start) return a.t_start - b.t_start;
        const trkA = tracks.findIndex((t) => t.id === a.track_id);
        const trkB = tracks.findIndex((t) => t.id === b.track_id);
        return trkA - trkB;
      });
  }, [scenes, query, tracks]);

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#0c0e15',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px 0 0 10px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.4)',
        animation: 'slideInLeft 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px 10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6366f1' }}>☰</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>
              Binder del Manuscrito
            </span>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            title="Cerrar organizador lateral (⌘B)"
            style={{ width: '22px', height: '22px', fontSize: '11px' }}
          >
            ✕
          </button>
        </div>

        {/* Global Telemetry Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#94a3b8',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <span>{scenes.length} escenas</span>
          <span>·</span>
          <span>{totalWords} pal.</span>
          <span>·</span>
          <span>~{totalMins} min</span>
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar escena o texto..."
          style={{
            width: '100%',
            height: '26px',
            backgroundColor: '#141722',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '5px',
            padding: '0 8px',
            fontSize: '11px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />

        {/* Mode Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '2px',
            borderRadius: '5px',
          }}
        >
          <button
            onClick={() => setViewMode('chronological')}
            style={{
              padding: '3px 0',
              fontSize: '10px',
              fontWeight: viewMode === 'chronological' ? 600 : 500,
              backgroundColor: viewMode === 'chronological' ? '#1a1e2b' : 'transparent',
              color: viewMode === 'chronological' ? '#ffffff' : '#64748b',
              border: viewMode === 'chronological' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Secuencia 1D
          </button>
          <button
            onClick={() => setViewMode('tracks')}
            style={{
              padding: '3px 0',
              fontSize: '10px',
              fontWeight: viewMode === 'tracks' ? 600 : 500,
              backgroundColor: viewMode === 'tracks' ? '#1a1e2b' : 'transparent',
              color: viewMode === 'tracks' ? '#ffffff' : '#64748b',
              border: viewMode === 'tracks' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Por Hilos
          </button>
        </div>
      </div>

      {/* List Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {viewMode === 'chronological' ? (
          chronologicalScenes.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
              No se encontraron escenas
            </div>
          ) : (
            chronologicalScenes.map((s, idx) => {
              const isSel = s.id === selectedSceneId;
              const trk = trkMap.get(s.track_id);
              const col = trk?.color_hex || '#6366f1';
              const words = s.word_count || 0;

              return (
                <div
                  key={s.id}
                  onClick={() => onSelectScene(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: isSel ? '#1a1e2d' : 'rgba(255, 255, 255, 0.02)',
                    border: isSel ? '1px solid #4361ee' : '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: isSel ? '0 2px 8px rgba(67, 97, 238, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(3px)';
                    if (!isSel) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    if (!isSel) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                    }
                  }}
                >
                  {/* Index badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'ui-monospace, monospace',
                      color: isSel ? '#93c5fd' : '#64748b',
                      minWidth: '18px',
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Track color bar */}
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      backgroundColor: col,
                      flexShrink: 0,
                    }}
                  />

                  {/* Title & Preview */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: isSel ? 600 : 500,
                        color: isSel ? '#ffffff' : '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      T: {s.t_start}u · {trk?.name || 'Hilo'}
                    </div>
                  </div>

                  {/* Words badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'ui-monospace, monospace',
                      color: isSel ? '#cbd5e1' : '#94a3b8',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      flexShrink: 0,
                    }}
                  >
                    {words}p
                  </span>
                </div>
              );
            })
          )
        ) : (
          /* Grouped by Tracks */
          tracks.map((trk) => {
            const trkScenes = scenes.filter((s) => s.track_id === trk.id);
            return (
              <div key={trk.id} style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#94a3b8',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: trk.color_hex,
                    }}
                  />
                  <span>{trk.name}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>({trkScenes.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '8px' }}>
                  {trkScenes.map((s) => {
                    const isSel = s.id === selectedSceneId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => onSelectScene(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: '4px',
                          backgroundColor: isSel ? '#1a1e2d' : 'transparent',
                          border: isSel ? '1px solid #4361ee' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(3px)';
                          if (!isSel) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          if (!isSel) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            color: isSel ? '#ffffff' : '#cbd5e1',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {s.title}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>{s.word_count || 0}p</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
