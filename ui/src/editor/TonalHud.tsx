import React from 'react';
import type { TonalHistogram } from '../types';

export interface TonalHudProps {
  metrics: TonalHistogram | null;
  wordCount: number;
  charCount: number;
  compact?: boolean;
}

const CHANNELS = [
  { key: 'dialogue' as const, label: 'Diálogo', color: '#38bdf8' },
  { key: 'action' as const, label: 'Acción', color: '#f97316' },
  { key: 'lore' as const, label: 'Lore', color: '#10b981' },
  { key: 'monologue' as const, label: 'Monólogo', color: '#8b5cf6' },
];

export const TonalHud: React.FC<TonalHudProps> = ({ metrics, wordCount, charCount, compact }) => {
  const m = metrics || {
    dialogue: 0.25,
    action: 0.35,
    lore: 0.15,
    monologue: 0.25,
    total_words: wordCount,
    sentence_lengths: [],
    cadence_variance: 5.0,
  };

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px',
          backgroundColor: 'rgba(18, 20, 28, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-specular)',
          borderRadius: '20px',
          fontSize: '11px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: '#e2e8f0' }}>{wordCount}</strong> palabras · {charCount} car. · ~{readingMinutes} min
        </div>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-specular)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {CHANNELS.map(({ key, label, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
              <span style={{ color, fontWeight: 600 }}>{label}</span>
              <span style={{ color: '#94a3b8' }}>{Math.round((m[key] ?? 0) * 100)}%</span>
            </div>
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
        borderRadius: '6px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{wordCount}</span> palabras
          <span>·</span>
          <span>{charCount} caracteres</span>
          <span>·</span>
          <span style={{ color: '#38bdf8' }}>~{readingMinutes} min lectura</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {CHANNELS.map(({ key, label, color }) => {
          const pct = Math.round((m[key] ?? 0) * 100);
          return (
            <div
              key={key}
              style={{
                backgroundColor: 'rgba(9, 10, 15, 0.45)',
                borderRadius: '4px',
                padding: '4px 6px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
                <span style={{ color, fontWeight: 500 }}>{label}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{pct}%</span>
              </div>
              <div style={{ height: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width 0.25s ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
