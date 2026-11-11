import { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Columns3, Target, ListOrdered, GitMerge, Plus, X, Search } from 'lucide-react';
import type { Scene, Track } from '../types';
import { computeActMetrics, type ActMetric, type DynamicMetricsResult } from '../actMetrics';
import SpotlightCard from './SpotlightCard';

export { computeActMetrics, type ActMetric, type DynamicMetricsResult };
export type LeftNavTab = 'binder' | 'structure' | 'goals';

export interface ManuscriptBinderProps {
  scenes: Scene[];
  tracks: Track[];
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene) => void;
  onClose: () => void;
  onCreateScene?: () => void;
  activeTab?: LeftNavTab;
  onTabChange?: (tab: LeftNavTab) => void;
  activeAct?: string;
  onSelectAct?: (actId: string) => void;
  projectSettings?: {
    targetWords: number;
    title?: string;
    author?: string;
  };
  onOpenSettings?: () => void;
  onShowAnalytics?: () => void;
  width?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(clean.substring(0, 2), 16) || 99;
  const g = parseInt(clean.substring(2, 4), 16) || 102;
  const b = parseInt(clean.substring(4, 6), 16) || 241;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
void hexToRgba;

export function ManuscriptBinder({
  scenes,
  tracks,
  selectedSceneId,
  onSelectScene,
  onClose,
  onCreateScene,
  activeTab = 'binder',
  onTabChange,
  activeAct = 'acto-2',
  onSelectAct,
  projectSettings,
  onOpenSettings,
  onShowAnalytics,
  width,
}: ManuscriptBinderProps) {
  const [internalTab, setInternalTab] = useState<LeftNavTab>(activeTab);
  const currentTab = onTabChange ? activeTab : internalTab;
  const setTab = (tab: LeftNavTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'chronological' | 'tracks'>('chronological');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trkMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  // Dynamic act and total metrics
  const { totalWords, totalMins, acts } = useMemo(() => computeActMetrics(scenes), [scenes]);

  const targetWords = projectSettings?.targetWords || 80000;
  const goalPct = Math.min(100, Math.round((totalWords / targetWords) * 100));
  const remainingWords = Math.max(0, targetWords - totalWords);

  // Global ⌘K / Ctrl+K listener to focus search input when binder tab is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTab('binder');
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered and chronologically ordered scenes
  const chronologicalScenes = useMemo(() => {
    return [...scenes]
      .filter((s) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.text || '').toLowerCase().includes(q) ||
          `#${s.version}`.includes(q)
        );
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
      aria-label="Navegador Unificado"
      style={{
        width: width ? `${width}px` : '320px', // width: '320px'
        maxWidth: width ? `${width}px` : '320px', // maxWidth: '320px'
        minWidth: '220px',
        backgroundColor: 'rgba(15, 17, 24, 0.8)',
        backdropFilter: 'blur(24px) saturate(1.35)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.35)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 10px 30px -10px rgba(0, 0, 0, 0.8)',
        zIndex: 25,
        flexShrink: 0,
        animation: 'slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. DRAWER HEADER: Title, Close button & Unified Segmented Tabs */}
      <div
        style={{
          padding: '12px 14px 10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'var(--bg-surface, #111215)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a1a1aa',
                flexShrink: 0,
              }}
            >
              {currentTab === 'binder' && <BookOpen size={14} strokeWidth={1.5} />}
              {currentTab === 'structure' && <Columns3 size={14} strokeWidth={1.5} />}
              {currentTab === 'goals' && <Target size={14} strokeWidth={1.5} />}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: '#eceef8',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.01em',
              }}
            >
              {currentTab === 'binder' && 'Binder del Manuscrito'}
              {currentTab === 'structure' && 'Estructura de Arco'}
              {currentTab === 'goals' && 'Palabras Meta & Progreso'}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar organizador lateral"
            title="Cerrar panel lateral (⌘B)"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#787f8d',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#eceef8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.color = '#787f8d';
            }}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Unified Segmented Pills: Binder · Estructura · Metas */}
        <div
          role="tablist"
          aria-label="Pestañas de Navegación"
          className="pill-segment"
          style={{ width: '100%', display: 'flex' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'binder'}
            onClick={() => setTab('binder')}
            className="pill-tab"
            style={{ flex: 1 }}
          >
            <BookOpen size={14} strokeWidth={1.5} />
            <span>Binder</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'structure'}
            onClick={() => setTab('structure')}
            className="pill-tab"
            style={{ flex: 1 }}
          >
            <Columns3 size={14} strokeWidth={1.5} />
            <span>Estructura</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'goals'}
            onClick={() => setTab('goals')}
            className="pill-tab"
            style={{ flex: 1 }}
          >
            <Target size={14} strokeWidth={1.5} />
            <span>Metas</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: BINDER VIEW */}
      {currentTab === 'binder' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Quick Telemetry Bar: Quiet luxury typography */}
          <div style={{ padding: '8px 14px 4px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#8e95a5',
                fontFamily: 'var(--font-sans)',
                fontVariantNumeric: 'tabular-nums',
                padding: '2px 4px',
              }}
            >
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{scenes.length} escenas</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
              <span>{totalWords.toLocaleString()} pal</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                ~{totalMins} min
              </span>
            </div>

            {/* Search Bar with shortcut chip '⌘K' */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  color: '#71717a',
                }}
              >
                <Search size={14} strokeWidth={1.5} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar escena, nodo o tag..."
                className="binder-search"
              />
              <kbd
                style={{
                  position: 'absolute',
                  right: '8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#71717a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                ⌘K
              </kbd>
            </div>

            {/* Segment Switcher: 'Secuencia 1D' vs 'Por Hilos' */}
            <div className="pill-segment" style={{ width: '100%', display: 'flex' }}>
              <button
                type="button"
                aria-selected={viewMode === 'chronological'}
                role="tab"
                onClick={() => setViewMode('chronological')}
                className="pill-tab"
                style={{ flex: 1, padding: '4px 0' }}
              >
                <ListOrdered size={14} strokeWidth={1.5} />
                <span>Secuencia 1D</span>
              </button>
              <button
                type="button"
                aria-selected={viewMode === 'tracks'}
                role="tab"
                onClick={() => setViewMode('tracks')}
                className="pill-tab"
                style={{ flex: 1, padding: '4px 0' }}
              >
                <GitMerge size={14} strokeWidth={1.5} />
                <span>Por Hilos</span>
              </button>
            </div>
          </div>

          {/* Narrative Scene Cards List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 12px 12px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: 0,
            }}
          >
            {viewMode === 'chronological' ? (
              chronologicalScenes.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#64748b',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  No se encontraron escenas con el filtro actual.
                </div>
              ) : (
                chronologicalScenes.map((s, idx) => {
                  const isSel = s.id === selectedSceneId;
                  const trk = trkMap.get(s.track_id);
                  const col = trk?.color_hex || '#38bdf8';
                  const words = s.word_count || 0;
                  const formattedIndex = String(idx + 1).padStart(2, '0');

                  return (
                    <SpotlightCard
                      key={s.id}
                      onClick={() => onSelectScene(s)}
                      spotlightColor="rgba(56, 189, 248, 0.15)"
                      className="group"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        backgroundColor: isSel ? '#15171f' : '#12141d',
                        // S2 — ascending color wash tinted by the narrative thread
                        backgroundImage: `linear-gradient(to top, ${col}1f, ${col}08 45%, rgba(15, 17, 24, 0.9) 100%)`,
                        border: isSel
                          ? '1px solid rgba(56, 189, 248, 0.8)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        // S5 — the selected card lifts and glows
                        transform: isSel ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: isSel
                          ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 0 20px rgba(56, 189, 248, 0.25)'
                          : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition:
                          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.14s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSel) e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSel) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      {/* Order badge: w-5 h-5 rounded-full bg-zinc-800 font-mono text-[10px] */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '9999px',
                          backgroundColor: '#27272a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: isSel ? '#e4e4e7' : '#a1a1aa',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        {formattedIndex}
                      </div>

                      {/* Right Column: Title, excerpt, track meta */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              // S2 — glass title: pure white → zinc-300 gradient
                              backgroundImage: 'linear-gradient(to bottom, #ffffff, #d4d4d8)',
                              WebkitBackgroundClip: 'text',
                              backgroundClip: 'text',
                              color: 'transparent',
                              WebkitTextFillColor: 'transparent',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {s.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              color: '#71717a',
                              flexShrink: 0,
                            }}
                          >
                            {words} pal
                          </span>
                        </div>

                        {s.text && (
                          <div
                            className="line-clamp-2"
                            style={{
                              fontSize: '11px',
                              color: '#71717a',
                              lineHeight: '1.45',
                              marginTop: '3px',
                            }}
                          >
                            {s.text}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '10px',
                              color: '#a1a1aa',
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '9999px',
                                backgroundColor: col,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {trk?.name || 'Trama Principal'}
                            </span>
                          </span>

                          <span
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              color: '#52525b',
                              flexShrink: 0,
                            }}
                          >
                            v{s.version || 1}
                          </span>
                        </div>
                      </div>
                    </SpotlightCard>
                  );
                })
              )
            ) : (
              /* Grouped by Tracks */
              tracks.map((trk) => {
                const trkScenes = scenes.filter((s) => s.track_id === trk.id);
                return (
                  <div
                    key={trk.id}
                    style={{
                      backgroundColor: '#12141d',
                      borderRadius: '8px',
                      padding: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px 6px 4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#a1a1aa',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '9999px',
                            backgroundColor: trk.color_hex,
                          }}
                        />
                        <span style={{ color: '#d4d4d8', fontWeight: 500 }}>{trk.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#52525b' }}>
                        {trkScenes.length} esc.
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {trkScenes.map((s, idx) => {
                        const isSel = s.id === selectedSceneId;
                        return (
                          <SpotlightCard
                            key={s.id}
                            onClick={() => onSelectScene(s)}
                            spotlightColor="rgba(56, 189, 248, 0.15)"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              backgroundColor: isSel ? '#15171f' : 'transparent',
                              // S2 — ascending color wash tinted by the narrative thread
                              backgroundImage: `linear-gradient(to top, ${trk.color_hex || '#38bdf8'}1a, rgba(15, 17, 24, 0.9) 100%)`,
                              border: isSel
                                ? '1px solid rgba(56, 189, 248, 0.8)'
                                : '1px solid transparent',
                              // S5 — selection lifts and glows
                              transform: isSel ? 'translateY(-1px)' : 'translateY(0)',
                              boxShadow: isSel
                                ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 0 20px rgba(56, 189, 248, 0.25)'
                                : 'none',
                              cursor: 'pointer',
                              transition:
                                'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.14s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSel) e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSel) e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)',
                                  color: '#52525b',
                                }}
                              >
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: isSel ? 600 : 500,
                                  // S2 — glass title gradient
                                  backgroundImage: 'linear-gradient(to bottom, #ffffff, #d4d4d8)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  color: 'transparent',
                                  WebkitTextFillColor: 'transparent',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {s.title}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                color: '#52525b',
                                flexShrink: 0,
                              }}
                            >
                              {s.word_count || 0}p
                            </span>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pinned Bottom Footer Action: + Nueva Escena (Always visible, never clipped) */}
          {onCreateScene && (
            <div
              style={{
                padding: '10px 12px 12px 12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: '#0c0d14',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={onCreateScene}
                title="Crear una nueva escena literaria en el manuscrito"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Nueva Escena</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB CONTENT: ESTRUCTURA DE ARCO VIEW */}
      {currentTab === 'structure' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#787f8d',
                fontFamily: 'var(--font-sans)',
              }}
            >
              ESTRUCTURA DE ARCO NARRATIVO
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: '#64748b',
              }}
            >
              3 Actos
            </span>
          </div>

          {/* Act list with dynamic metrics */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {acts.map((act) => {
              const isActive = activeAct === act.id;
              const accentColor =
                act.id === 'acto-1' ? '#10b981' : act.id === 'acto-2' ? '#818cf8' : '#f59e0b';
              const badgeBg =
                act.id === 'acto-1'
                  ? 'rgba(52, 211, 153, 0.12)'
                  : act.id === 'acto-2'
                  ? 'rgba(129, 140, 248, 0.12)'
                  : 'rgba(245, 158, 11, 0.12)';

              return (
                <div
                  key={act.id}
                  onClick={() => onSelectAct && onSelectAct(act.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#1e2029' : '#14151a',
                    border: isActive
                      ? `1px solid ${accentColor}66`
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: isActive ? `0 0 12px ${accentColor}26` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1c1d24';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#14151a';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {act.id === 'acto-1' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {act.id === 'acto-2' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      )}
                      {act.id === 'acto-3' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v4" />
                          <path d="M12 18v4" />
                          <path d="M2 12h4" />
                          <path d="M18 12h4" />
                        </svg>
                      )}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                        {act.name}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: accentColor,
                        backgroundColor: badgeBg,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {act.percentage}%
                    </span>
                  </div>

                  <div style={{ fontSize: '10px', color: '#787f8d', fontFamily: 'var(--font-mono)', paddingLeft: '21px' }}>
                    {act.statusText}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Section: 'CONFIGURACIÓN & ANALÍTICA' */}
          <div style={{ marginTop: '14px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#787f8d',
                fontFamily: 'var(--font-sans)',
                display: 'block',
                padding: '0 2px 8px 2px',
              }}
            >
              CONFIGURACIÓN &amp; ANALÍTICA
            </span>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                onClick={() => onShowAnalytics && onShowAnalytics()}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  color: '#9da5b4',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = '#eceef8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.color = '#9da5b4';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787f8d" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4" />
                  <path d="m19 12 3-3" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
                <span>Analítica de Ritmo</span>
              </div>

              <div
                onClick={() => onOpenSettings && onOpenSettings()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenSettings && onOpenSettings();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  color: '#9da5b4',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = '#eceef8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.color = '#9da5b4';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787f8d" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Configuración Proyecto</span>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: PALABRAS META & PROGRESS VIEW */}
      {currentTab === 'goals' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Main Progress Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-canvas, #090a0d)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#787f8d',
                }}
              >
                PALABRAS META
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: '#34d399',
                }}
              >
                {totalWords.toLocaleString()} / {(targetWords / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Glowing progress bar */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#181b20',
                height: '8px',
                borderRadius: '9999px',
                overflow: 'hidden',
                padding: '1px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: `${goalPct}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  background: 'linear-gradient(90deg, #059669 0%, #34d399 100%)',
                  boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#34d399' }}>{goalPct}% completado</span>
              <span style={{ color: '#787f8d' }}>
                {remainingWords > 0 ? `${remainingWords.toLocaleString()} faltantes` : '¡Meta alcanzada!'}
              </span>
            </div>
          </div>

          {/* Telemetry 2x2 Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#787f8d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Escenas
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
                {scenes.length}
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#787f8d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Lectura Est.
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                ~{totalMins} min
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#787f8d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Promedio / Esc.
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                {scenes.length > 0 ? Math.round(totalWords / scenes.length) : 0} p
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#787f8d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hilos Activos
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                {tracks.filter((t) => !t.is_muted).length}
              </span>
            </div>
          </div>

          {/* Act Distribution Progress */}
          <div
            style={{
              backgroundColor: 'var(--bg-canvas, #090a0d)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#787f8d', letterSpacing: '0.06em' }}>
                DISTRIBUCIÓN POR ACTOS
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                Ideal: 25% · 50% · 25%
              </span>
            </div>

            {/* Tri-segmented proportional bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#181b20',
                borderRadius: '9999px',
                overflow: 'hidden',
                display: 'flex',
                gap: '2px',
              }}
            >
              <div
                style={{
                  width: `${acts[0]?.percentage || 0}%`,
                  backgroundColor: '#10b981',
                  transition: 'width 0.3s ease',
                }}
                title={`Acto I: ${acts[0]?.percentage || 0}%`}
              />
              <div
                style={{
                  width: `${acts[1]?.percentage || 0}%`,
                  backgroundColor: '#818cf8',
                  transition: 'width 0.3s ease',
                }}
                title={`Acto II: ${acts[1]?.percentage || 0}%`}
              />
              <div
                style={{
                  width: `${acts[2]?.percentage || 0}%`,
                  backgroundColor: '#f59e0b',
                  transition: 'width 0.3s ease',
                }}
                title={`Acto III: ${acts[2]?.percentage || 0}%`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#10b981' }}>I: {acts[0]?.percentage || 0}% ({acts[0]?.wordCount || 0}p)</span>
              <span style={{ color: '#818cf8' }}>II: {acts[1]?.percentage || 0}% ({acts[1]?.wordCount || 0}p)</span>
              <span style={{ color: '#f59e0b' }}>III: {acts[2]?.percentage || 0}% ({acts[2]?.wordCount || 0}p)</span>
            </div>
          </div>

          {/* Action button to adjust target words */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              style={{
                marginTop: 'auto',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Configurar palabras meta...</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
