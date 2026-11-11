import React, { useMemo, useState } from 'react';
import type { TonalHistogram } from '../types';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

export interface TonalHudProps {
  metrics: TonalHistogram | null;
  wordCount: number;
  charCount: number;
  compact?: boolean;
  selectedSentenceIndex?: number | null;
  onSelectSentence?: (sentenceIndex: number) => void;
}

export const TonalHud: React.FC<TonalHudProps> = ({
  metrics,
  wordCount,
  charCount,
  compact,
  selectedSentenceIndex = null,
  onSelectSentence,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [hoveredSentence, setHoveredSentence] = useState<number | null>(null);

  const m = useMemo(() => {
    return (
      metrics || {
        dialogue: 0.28,
        action: 0.32,
        lore: 0.22,
        monologue: 0.18,
        total_words: wordCount,
        sentence_lengths: [12, 8, 22, 14, 6, 18, 9, 25, 11],
        cadence_variance: 5.4,
      }
    );
  }, [metrics, wordCount]);

  // Compute normalized percentages for the voice ribbon
  const { pDialogue, pAction, pLore, pMonologue } = useMemo(() => {
    const rawD = Math.max(0, m.dialogue ?? 0);
    const rawA = Math.max(0, m.action ?? 0);
    const rawL = Math.max(0, m.lore ?? 0);
    const rawM = Math.max(0, m.monologue ?? 0);
    const sum = rawD + rawA + rawL + rawM;
    if (sum <= 0.001) {
      return { pDialogue: 25, pAction: 25, pLore: 25, pMonologue: 25 };
    }
    const d = Math.round((rawD / sum) * 100);
    const a = Math.round((rawA / sum) * 100);
    const l = Math.round((rawL / sum) * 100);
    const mono = Math.max(0, 100 - (d + a + l));
    return { pDialogue: d, pAction: a, pLore: l, pMonologue: mono };
  }, [m]);

  const channels = useMemo(
    () => [
      { key: 'dialogue', label: 'Diálogo', pct: pDialogue, colorVar: 'var(--color-dialogue, #38bdf8)', colorHex: '#38bdf8' },
      { key: 'action', label: 'Acción', pct: pAction, colorVar: 'var(--color-action, #f97316)', colorHex: '#f97316' },
      { key: 'lore', label: 'Lore', pct: pLore, colorVar: 'var(--color-lore, #10b981)', colorHex: '#10b981' },
      { key: 'monologue', label: 'Monólogo', pct: pMonologue, colorVar: 'var(--color-monologue, #a855f7)', colorHex: '#a855f7' },
    ],
    [pDialogue, pAction, pLore, pMonologue]
  );

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 240));

  // Gary Provost Cadence descriptor without math
  const cadenceInfo = useMemo(() => {
    const v = m.cadence_variance ?? 5.0;
    if (v < 3.5) {
      return {
        label: 'Ritmo uniforme · Frases de longitud similar',
        color: '#94a3b8',
      };
    }
    if (v <= 9.0) {
      return {
        label: 'Ritmo armónico · Cadencia viva y musical',
        color: '#38bdf8',
      };
    }
    return {
      label: 'Ritmo sincopado · Rápida alternancia',
      color: '#f59e0b',
    };
  }, [m.cadence_variance]);

  // Real sentence lengths for the Gary Provost sentence rhythm histogram
  const sentenceLengths = useMemo(() => {
    if (m.sentence_lengths && m.sentence_lengths.length > 0) {
      return m.sentence_lengths;
    }
    return [12, 8, 22, 14, 6, 18, 9, 25, 11];
  }, [m.sentence_lengths]);

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '4px 14px',
          height: '26px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-glass-elevated)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border-specular)',
          borderRadius: '9999px',
          fontSize: '11px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{wordCount}</strong> palabras
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span>~{readingMinutes} min</span>
        </div>

        {/* Mini Chromatic Bar */}
        <div
          style={{
            display: 'flex',
            width: '84px',
            height: '6px',
            borderRadius: '9999px',
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
          }}
          title={`Diálogo: ${pDialogue}% | Acción: ${pAction}% | Lore: ${pLore}% | Monólogo: ${pMonologue}%`}
        >
          {channels.map((ch) => (
            <div
              key={ch.key}
              style={{
                width: `${ch.pct}%`,
                backgroundColor: ch.colorVar,
                transition: 'width 0.3s ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
          {channels.map((ch) => (
            <span key={ch.key} style={{ color: ch.colorVar, fontWeight: 600 }}>
              {ch.pct}%
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-rack)',
        border: '1px solid var(--border-specular)',
        borderRadius: '8px',
        padding: isExpanded ? '6px 12px 10px 12px' : '0 10px',
        height: isExpanded ? 'auto' : '26px',
        minHeight: '26px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        gap: isExpanded ? '8px' : '0px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Sleek 26px Top Summary Bar: {wordCount} palabras · ~{readMins} min · {cadenceDescriptor} + [ Analítica ] */}
      <div
        style={{
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '11px',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {wordCount}
          </span>
          <span>palabras</span>
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>~{readingMinutes} min</span>
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: cadenceInfo.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: cadenceInfo.color,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={cadenceInfo.label}
          >
            {cadenceInfo.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'Ocultar analítica editorial' : 'Mostrar histograma de Gary Provost y distribución de voz'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            height: '20px',
            padding: '0 7px',
            borderRadius: '5px',
            fontSize: '10.5px',
            fontWeight: 500,
            backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: isExpanded ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid var(--border-specular)',
            color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={13} strokeWidth={1.5} />
          <span>Analítica</span>
          {isExpanded ? <ChevronUp size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Collapsible Panel for Gary Provost Sentence Rhythm Histogram & Voice Distribution Ribbon */}
      <div
        style={{
          maxHeight: isExpanded ? '360px' : '0px',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          pointerEvents: isExpanded ? 'auto' : 'none',
          transition: 'max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderTop: isExpanded ? '1px solid var(--border-specular)' : 'none',
          paddingTop: isExpanded ? '8px' : '0px',
        }}
      >
        {/* Gary Provost Sentence Rhythm Histogram */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: 'rgba(8, 9, 12, 0.55)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
                Ritmo de Frases (Gary Provost)
              </span>
              <span style={{ color: 'var(--border-subtle)' }}>·</span>
              <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {charCount} car.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#38bdf8' }} /> &lt;10 breve
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#94a3b8' }} /> 10–25 fluida
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> &gt;25 expansiva
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3px',
              height: '34px',
              width: '100%',
              padding: '2px 0',
            }}
          >
            {sentenceLengths.map((len, idx) => {
              const color = len < 10 ? '#38bdf8' : len <= 25 ? '#94a3b8' : '#f59e0b';
              const maxLen = Math.max(30, ...sentenceLengths);
              const heightPercent = Math.max(14, Math.min(100, Math.round((len / maxLen) * 100)));
              const isSelected = selectedSentenceIndex === idx;
              const isHovered = hoveredSentence === idx;
              const zoneLabel = len < 10 ? 'Breve' : len <= 25 ? 'Fluida' : 'Expansiva';

              return (
                <div
                  key={`sentence-bar-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSentence?.(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSentence?.(idx);
                    }
                  }}
                  onMouseEnter={() => setHoveredSentence(idx)}
                  onMouseLeave={() => setHoveredSentence(null)}
                  title={`Frase ${idx + 1}: ${len} palabras (${zoneLabel}) · Clic para saltar y resaltar`}
                  style={{
                    flex: 1,
                    maxWidth: '14px',
                    minWidth: '4px',
                    height: `${heightPercent}%`,
                    backgroundColor: color,
                    borderRadius: '2px 2px 0 0',
                    opacity: isSelected ? 1 : isHovered ? 0.95 : 0.75,
                    outline: isSelected
                      ? '2px solid var(--accent-cyan)'
                      : isHovered
                      ? '1px solid rgba(255, 255, 255, 0.4)'
                      : 'none',
                    outlineOffset: '1px',
                    transform: isSelected || isHovered ? 'scaleY(1.08)' : 'none',
                    transformOrigin: 'bottom',
                    boxShadow: isSelected ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none',
                    transition: 'height 0.25s ease, opacity 0.15s ease, transform 0.15s ease',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Continuous Chromatic Voice Ribbon with Clean Typography Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              height: '7px',
              width: '100%',
              borderRadius: '9999px',
              overflow: 'hidden',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {channels.map((ch) => {
              const isHovered = hoveredChannel === ch.key;
              return (
                <div
                  key={ch.key}
                  onMouseEnter={() => setHoveredChannel(ch.key)}
                  onMouseLeave={() => setHoveredChannel(null)}
                  style={{
                    width: `${ch.pct}%`,
                    backgroundColor: ch.colorVar,
                    opacity: hoveredChannel === null || isHovered ? 1 : 0.45,
                    filter: isHovered ? 'brightness(1.2)' : 'none',
                    cursor: 'pointer',
                    transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, filter 0.2s ease',
                  }}
                  title={`${ch.label}: ${ch.pct}%`}
                />
              );
            })}
          </div>

          {/* Typographic Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10.5px',
              color: 'var(--text-secondary)',
              padding: '0 2px',
            }}
          >
            {channels.map((ch) => {
              const isHovered = hoveredChannel === ch.key;
              return (
                <div
                  key={ch.key}
                  onMouseEnter={() => setHoveredChannel(ch.key)}
                  onMouseLeave={() => setHoveredChannel(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    opacity: hoveredChannel === null || isHovered ? 1 : 0.45,
                    transform: isHovered ? 'scale(1.04)' : 'none',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                  title={`Canal ${ch.label}: ${ch.pct}% del texto`}
                >
                  <span style={{ color: ch.colorVar, fontSize: '8px' }}>●</span>
                  <span style={{ color: isHovered ? 'var(--text-primary)' : 'inherit', fontWeight: isHovered ? 600 : 400 }}>
                    {ch.label}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                    }}
                  >
                    {ch.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
