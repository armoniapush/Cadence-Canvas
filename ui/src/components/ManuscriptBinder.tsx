import { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Columns3, Target, ListOrdered, GitMerge, Plus, X } from 'lucide-react';
import { GlowButton } from './GlowButton';
import type { Scene, Track } from '../types';
import { computeActMetrics, type ActMetric, type DynamicMetricsResult } from '../actMetrics';

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
        width: '320px',
        maxWidth: '320px',
        minWidth: '320px',
        backgroundColor: '#0c0e14',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.55)',
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
          backgroundColor: '#0c0e14',
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
                backgroundColor:
                  currentTab === 'binder'
                    ? 'rgba(129, 140, 248, 0.12)'
                    : currentTab === 'structure'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                border:
                  currentTab === 'binder'
                    ? '1px solid rgba(129, 140, 248, 0.28)'
                    : currentTab === 'structure'
                    ? '1px solid rgba(16, 185, 129, 0.28)'
                    : '1px solid rgba(245, 158, 11, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:
                  currentTab === 'binder'
                    ? '#818cf8'
                    : currentTab === 'structure'
                    ? '#10b981'
                    : '#f59e0b',
                transition: 'all 0.15s ease',
              }}
            >
              {currentTab === 'binder' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              )}
              {currentTab === 'structure' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              )}
              {currentTab === 'goals' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              )}
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

        {/* Unified Segmented Tabs: Binder · Estructura · Metas */}
        <div
          role="tablist"
          aria-label="Pestañas de Navegación"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '3px',
            backgroundColor: '#080a0f',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'binder'}
            onClick={() => setTab('binder')}
            style={{
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: currentTab === 'binder' ? 600 : 500,
              backgroundColor: currentTab === 'binder' ? '#1a1e2b' : 'transparent',
              color: currentTab === 'binder' ? '#ffffff' : '#8e95a5',
              border: currentTab === 'binder' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              boxShadow: currentTab === 'binder' ? '0 1px 3px rgba(0, 0, 0, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={13} strokeWidth={1.5} color={currentTab === 'binder' ? '#818cf8' : '#64748b'} />
            <span>Binder</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'structure'}
            onClick={() => setTab('structure')}
            style={{
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: currentTab === 'structure' ? 600 : 500,
              backgroundColor: currentTab === 'structure' ? '#1a1e2b' : 'transparent',
              color: currentTab === 'structure' ? '#ffffff' : '#8e95a5',
              border: currentTab === 'structure' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              boxShadow: currentTab === 'structure' ? '0 1px 3px rgba(0, 0, 0, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Columns3 size={13} strokeWidth={1.5} color={currentTab === 'structure' ? '#10b981' : '#64748b'} />
            <span>Estructura</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'goals'}
            onClick={() => setTab('goals')}
            style={{
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: currentTab === 'goals' ? 600 : 500,
              backgroundColor: currentTab === 'goals' ? '#1a1e2b' : 'transparent',
              color: currentTab === 'goals' ? '#ffffff' : '#8e95a5',
              border: currentTab === 'goals' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              boxShadow: currentTab === 'goals' ? '0 1px 3px rgba(0, 0, 0, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Target size={13} strokeWidth={1.5} color={currentTab === 'goals' ? '#f59e0b' : '#64748b'} />
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#818cf8',
                    boxShadow: '0 0 6px rgba(129, 140, 248, 0.8)',
                  }}
                />
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{scenes.length} escenas</span>
              </span>
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
                  left: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  color: '#787f8d',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar escena, nodo o tag..."
                style={{
                  width: '100%',
                  height: '30px',
                  backgroundColor: '#141722',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  paddingLeft: '28px',
                  paddingRight: '40px',
                  fontSize: '11px',
                  color: '#eceef8',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#818cf8';
                  e.target.style.backgroundColor = '#181b28';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.backgroundColor = '#141722';
                }}
              />
              <kbd
                style={{
                  position: 'absolute',
                  right: '6px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#0c0e14',
                  color: '#787f8d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                ⌘K
              </kbd>
            </div>

            {/* Segment Switcher: 'Secuencia 1D' vs 'Por Hilos' */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3px',
                backgroundColor: '#080a0f',
                padding: '3px',
                borderRadius: '7px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('chronological')}
                style={{
                  padding: '5px 0',
                  fontSize: '11px',
                  fontWeight: viewMode === 'chronological' ? 600 : 500,
                  backgroundColor: viewMode === 'chronological' ? '#1a1e2b' : 'transparent',
                  color: viewMode === 'chronological' ? '#ffffff' : '#787f8d',
                  border: viewMode === 'chronological' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: viewMode === 'chronological' ? '0 1px 3px rgba(0, 0, 0, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ListOrdered size={12} strokeWidth={1.5} color={viewMode === 'chronological' ? '#818cf8' : '#64748b'} />
                <span>Secuencia 1D</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tracks')}
                style={{
                  padding: '5px 0',
                  fontSize: '11px',
                  fontWeight: viewMode === 'tracks' ? 600 : 500,
                  backgroundColor: viewMode === 'tracks' ? '#1a1e2b' : 'transparent',
                  color: viewMode === 'tracks' ? '#ffffff' : '#787f8d',
                  border: viewMode === 'tracks' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: viewMode === 'tracks' ? '0 1px 3px rgba(0, 0, 0, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <GitMerge size={12} strokeWidth={1.5} color={viewMode === 'tracks' ? '#34d399' : '#64748b'} />
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
                  const col = trk?.color_hex || '#818cf8';
                  const words = s.word_count || 0;
                  const formattedIndex = String(idx + 1).padStart(2, '0');

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectScene(s)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '11px 12px',
                        borderRadius: '9px',
                        backgroundColor: isSel ? 'rgba(30, 36, 54, 0.95)' : 'rgba(17, 20, 29, 0.7)',
                        border: isSel
                          ? '1px solid rgba(129, 140, 248, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: isSel
                          ? `0 4px 16px rgba(0, 0, 0, 0.45), inset 3px 0 0 ${col}`
                          : '0 1px 3px rgba(0, 0, 0, 0.18)',
                        cursor: 'pointer',
                        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        if (!isSel) {
                          e.currentTarget.style.backgroundColor = 'rgba(23, 27, 40, 0.95)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        if (!isSel) {
                          e.currentTarget.style.backgroundColor = 'rgba(17, 20, 29, 0.7)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                    >
                      {/* Left Column: Stylized Large Chapter Numeral Block */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '7px',
                          backgroundColor: isSel ? hexToRgba(col, 0.24) : 'rgba(255, 255, 255, 0.04)',
                          border: isSel ? `1px solid ${hexToRgba(col, 0.5)}` : '1px solid rgba(255, 255, 255, 0.06)',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isSel ? '#ffffff' : col,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {formattedIndex}
                        </span>
                      </div>

                      {/* Right Column: Title, Telemetry, Excerpt, Track */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {/* Title & Word count */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: isSel ? '#ffffff' : '#f1f5f9',
                              letterSpacing: '-0.01em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {s.title}
                          </span>
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              color: isSel ? '#c7d2fe' : '#94a3b8',
                              backgroundColor: isSel ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.035)',
                              border: isSel ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.05)',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              flexShrink: 0,
                            }}
                          >
                            {words} pal
                          </span>
                        </div>

                        {/* Excerpt preview text */}
                        {s.text && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: isSel ? '#94a3b8' : '#64748b',
                              lineHeight: '1.35',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {s.text}
                          </div>
                        )}

                        {/* Bottom Meta: Track with luminous dot and version */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              color: isSel ? '#cbd5e1' : '#787f8d',
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: col,
                                boxShadow: `0 0 5px ${col}88`,
                              }}
                            />
                            <span>{trk?.name || 'Trama Principal'}</span>
                          </span>

                          <span
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              color: '#64748b',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              padding: '0 4px',
                              borderRadius: '3px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            v{s.version || 1}
                          </span>
                        </div>
                      </div>
                    </div>
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
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      padding: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
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
                        color: '#b0b6c3',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: trk.color_hex,
                          }}
                        />
                        <span>{trk.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                        {trkScenes.length} esc.
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {trkScenes.map((s, idx) => {
                        const isSel = s.id === selectedSceneId;
                        return (
                          <div
                            key={s.id}
                            onClick={() => onSelectScene(s)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: isSel ? '#1a1e2d' : '#121520',
                              border: isSel ? '1px solid #4361ee' : '1px solid rgba(255, 255, 255, 0.04)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateX(2px)';
                              if (!isSel) e.currentTarget.style.backgroundColor = '#181c2a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateX(0)';
                              if (!isSel) e.currentTarget.style.backgroundColor = '#121520';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-sans)',
                                  letterSpacing: '0.02em',
                                  fontWeight: 600,
                                  color: trk.color_hex,
                                }}
                              >
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: isSel ? 600 : 500,
                                  color: isSel ? '#ffffff' : '#cbd5e1',
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
                                fontFamily: 'var(--font-sans)',
                                fontVariantNumeric: 'tabular-nums',
                                color: '#787f8d',
                                flexShrink: 0,
                              }}
                            >
                              {s.word_count || 0}p
                            </span>
                          </div>
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
                backgroundColor: '#0c0e14',
                flexShrink: 0,
              }}
            >
              <GlowButton
                variant="iridescent"
                glowRadius="8px"
                speed="6s"
                onClick={onCreateScene}
                title="Crear una nueva escena literaria en el manuscrito"
                style={{
                  width: '100%',
                }}
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Nueva Escena</span>
              </GlowButton>
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
                    backgroundColor: isActive ? '#181b26' : '#121520',
                    border: isActive
                      ? `1px solid ${accentColor}66`
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: isActive ? `0 0 12px ${accentColor}26` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#181b24';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#121520';
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
              backgroundColor: '#0c0e11',
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
              backgroundColor: '#0c0e11',
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
