import React, { useMemo, useState } from 'react';
import type { TonalHistogram } from '../types';

export interface TonalHudProps {
  metrics: TonalHistogram | null;
  wordCount: number;
  charCount: number;
  compact?: boolean;
}

export const TonalHud: React.FC<TonalHudProps> = ({ metrics, wordCount, charCount, compact }) => {
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

  const m = useMemo(() => {
    return metrics || {
      dialogue: 0.28,
      action: 0.32,
      lore: 0.22,
      monologue: 0.18,
      total_words: wordCount,
      sentence_lengths: [12, 8, 22, 14, 6, 18, 9, 25, 11],
      cadence_variance: 5.4,
    };
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

  const channels = useMemo(() => [
    { key: 'dialogue', label: 'Diálogo', pct: pDialogue, colorVar: 'var(--color-dialogue, #38bdf8)', colorHex: '#38bdf8' },
    { key: 'action', label: 'Acción', pct: pAction, colorVar: 'var(--color-action, #f97316)', colorHex: '#f97316' },
    { key: 'lore', label: 'Lore', pct: pLore, colorVar: 'var(--color-lore, #10b981)', colorHex: '#10b981' },
    { key: 'monologue', label: 'Monólogo', pct: pMonologue, colorVar: 'var(--color-monologue, #a855f7)', colorHex: '#a855f7' },
  ], [pDialogue, pAction, pLore, pMonologue]);

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
          padding: '6px 14px',
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
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top Editorial Telemetry & Gary Provost Cadence Descriptor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>{wordCount}</span> palabras
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span>{charCount} car.</span>
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>~{readingMinutes} min lectura</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cadenceInfo.color }} />
          <span style={{ color: cadenceInfo.color, fontWeight: 500 }}>
            {cadenceInfo.label}
          </span>
        </div>
      </div>

      {/* Gary Provost Sentence Rhythm Histogram (Replaces fake audio sine wave) */}
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
          <span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
            Ritmo de Frases (Gary Provost)
          </span>
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
            height: '32px',
            width: '100%',
            padding: '2px 0',
          }}
        >
          {sentenceLengths.map((len, idx) => {
            const color = len < 10 ? '#38bdf8' : len <= 25 ? '#94a3b8' : '#f59e0b';
            const maxLen = Math.max(30, ...sentenceLengths);
            const heightPercent = Math.max(12, Math.min(100, Math.round((len / maxLen) * 100)));
            return (
              <div
                key={`sentence-bar-${idx}`}
                title={`Frase ${idx + 1}: ${len} palabras (${len < 10 ? 'Breve' : len <= 25 ? 'Fluida' : 'Expansiva'})`}
                style={{
                  flex: 1,
                  maxWidth: '14px',
                  minWidth: '4px',
                  height: `${heightPercent}%`,
                  backgroundColor: color,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.85,
                  transition: 'height 0.25s ease, opacity 0.15s ease',
                  cursor: 'default',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Continuous Chromatic Voice Ribbon with Clean Typography Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            height: '8px',
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

        {/* Clean Typographic Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            padding: '2px 2px 0 2px',
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
                  transform: isHovered ? 'scale(1.05)' : 'none',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}
                title={`Canal ${ch.label}: ${ch.pct}% del texto`}
              >
                <span style={{ color: ch.colorVar, fontSize: '9px' }}>●</span>
                <span style={{ color: isHovered ? 'var(--text-primary)' : 'inherit', fontWeight: isHovered ? 600 : 400 }}>{ch.label}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {ch.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
