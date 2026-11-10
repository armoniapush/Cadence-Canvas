import React from 'react';
import type { TonalHistogram } from '../types';

export interface TonalHudProps {
  metrics: TonalHistogram | null;
  wordCount: number;
  charCount: number;
  compact?: boolean;
}

const CHANNELS = [
  { key: 'dialogue' as const, label: 'Diálogo', badge: 'DIA', color: '#38bdf8' },
  { key: 'action' as const, label: 'Acción', badge: 'ACT', color: '#f97316' },
  { key: 'lore' as const, label: 'Lore', badge: 'LOR', color: '#10b981' },
  { key: 'monologue' as const, label: 'Monólogo', badge: 'MON', color: '#8b5cf6' },
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
  const variance = m.cadence_variance ?? 0;
  const pulseDur = Math.max(0.6, Math.min(2.5, 3.2 - Math.min(variance, 20) * 0.12));

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 16px',
          backgroundColor: 'rgba(18, 20, 28, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-specular)',
          borderRadius: '24px',
          fontSize: '11px',
          fontFamily: 'monospace',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {CHANNELS.map(({ key, badge, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ color, fontWeight: 700, fontSize: '9px' }}>{badge}</span>
              <span style={{ color: '#cbd5e1' }}>{Math.round((m[key] ?? 0) * 100)}%</span>
            </div>
          ))}
        </div>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-specular)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 8px #38bdf8',
              animation: `cadencePulse ${pulseDur}s infinite ease-in-out`,
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Var:</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{variance.toFixed(1)}</span>
        </div>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-specular)' }} />
        <div style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: '#38bdf8' }}>{wordCount}</strong>w · {charCount}c
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
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
            HUD Leica / ARRI
          </span>
        </div>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{wordCount}</span>w · {charCount}c
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {CHANNELS.map(({ key, badge, color }) => {
          const pct = Math.round((m[key] ?? 0) * 100);
          return (
            <div key={key} style={{ backgroundColor: 'rgba(9, 10, 15, 0.65)', borderRadius: '4px', padding: '5px 7px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
                <span style={{ color, fontWeight: 600 }}>{badge}</span>
                <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{pct}%</span>
              </div>
              <div style={{ height: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(2, pct))}%`, height: '100%', backgroundColor: color, transition: 'width 0.25s ease-out' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(9, 10, 15, 0.45)', borderRadius: '4px', padding: '5px 8px', border: '1px solid var(--border-specular)', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b', boxShadow: '0 0 6px #f59e0b', animation: `cadencePulse ${pulseDur}s infinite ease-in-out` }} />
          <span style={{ color: 'var(--text-muted)' }}>Varianza de Cadencia:</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>{variance.toFixed(2)} σ²</span>
      </div>
    </div>
  );
};
