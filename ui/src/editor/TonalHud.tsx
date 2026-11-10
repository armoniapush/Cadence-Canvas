import React, { useMemo } from 'react';
import type { TonalHistogram } from '../types';

export interface TonalHudProps {
  metrics: TonalHistogram | null;
  wordCount: number;
  charCount: number;
  compact?: boolean;
}

const CHANNELS = [
  { key: 'dialogue' as const, label: 'Diálogo', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  { key: 'action' as const, label: 'Acción', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
  { key: 'lore' as const, label: 'Lore', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { key: 'monologue' as const, label: 'Monólogo', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
];

export const TonalHud: React.FC<TonalHudProps> = ({ metrics, wordCount, charCount, compact }) => {
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

  // Compute normalized percentages
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

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 240));

  // Dynamic monotonic gradient stops strictly bounded [0%, 100%]
  const gradientStops = useMemo(() => {
    const rawChannels = [
      { key: 'dialogue', pct: pDialogue, color: '#38bdf8' },
      { key: 'action', pct: pAction, color: '#f97316' },
      { key: 'lore', pct: pLore, color: '#10b981' },
      { key: 'monologue', pct: pMonologue, color: '#a855f7' },
    ];
    const active = rawChannels.filter((c) => c.pct > 0);
    if (active.length === 0) {
      return [
        { offset: '0%', color: '#38bdf8' },
        { offset: '100%', color: '#38bdf8' },
      ];
    }
    if (active.length === 1) {
      return [
        { offset: '0%', color: active[0].color },
        { offset: '100%', color: active[0].color },
      ];
    }
    const stops: { offset: string; color: string }[] = [];
    let accum = 0;
    active.forEach((ch) => {
      const startPct = accum;
      const endPct = Math.min(100, accum + ch.pct);
      accum = endPct;
      stops.push({ offset: `${startPct.toFixed(1)}%`, color: ch.color });
      stops.push({ offset: `${endPct.toFixed(1)}%`, color: ch.color });
    });
    return stops;
  }, [pDialogue, pAction, pLore, pMonologue]);

  // Cadence descriptor based on variance
  const cadenceInfo = useMemo(() => {
    const v = m.cadence_variance ?? 5.0;
    if (v < 3.5) return { label: 'Homogénea / Métrica fija', color: '#94a3b8' };
    if (v <= 9.0) return { label: 'Fluida / Variación armónica', color: '#10b981' };
    return { label: 'Sincopada / Alta alternancia', color: '#f59e0b' };
  }, [m.cadence_variance]);

  // Dynamic rhythmic wave SVG path generator (inspired by Mount cardiac & respiratory wave)
  const waveSvg = useMemo(() => {
    const lengths = m.sentence_lengths && m.sentence_lengths.length > 0
      ? m.sentence_lengths
      : [12, 16, 8, 24, 10, 18, 7, 21, 14];

    const w = 360;
    const h = 32;
    const midY = h / 2;
    const pointsCount = Math.max(8, lengths.length);
    const stepX = w / (pointsCount - 1);

    const pts: [number, number][] = [];
    for (let i = 0; i < pointsCount; i++) {
      const x = i * stepX;
      const len = lengths[i % lengths.length] || 12;
      // Amplitude scales with variance & sentence length difference
      const normalizedLen = Math.min(30, Math.max(4, len));
      const delta = (normalizedLen - 14) * 0.9;
      // Alternate peaks for organic cardiac/respiratory pulse
      const phase = i % 2 === 0 ? 1 : -1;
      const y = Math.min(h - 3, Math.max(3, midY + phase * delta));
      pts.push([x, y]);
    }

    // Build smooth cubic Bezier path
    let path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }

    return { path, w, h };
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
            height: '5px',
            borderRadius: '9999px',
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
          }}
          title={`Diálogo: ${pDialogue}% | Acción: ${pAction}% | Lore: ${pLore}% | Monólogo: ${pMonologue}%`}
        >
          <div style={{ width: `${pDialogue}%`, backgroundColor: '#38bdf8', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${pAction}%`, backgroundColor: '#f97316', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${pLore}%`, backgroundColor: '#10b981', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${pMonologue}%`, backgroundColor: '#a855f7', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>{pDialogue}%</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>{pAction}%</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>{pLore}%</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>{pMonologue}%</span>
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
      {/* Top Editorial Telemetry */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>{wordCount}</span> palabras
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span>{charCount} car.</span>
          <span style={{ color: 'var(--border-hover)' }}>·</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>~{readingMinutes} min lectura</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cadenceInfo.color }} />
          <span style={{ color: cadenceInfo.color, fontWeight: 500 }}>
            {cadenceInfo.label} (σ {m.cadence_variance?.toFixed(1) ?? '5.0'})
          </span>
        </div>
      </div>

      {/* Rhythmic Respiration / Cardiac Waveform (Mount style) */}
      <div
        style={{
          position: 'relative',
          height: '32px',
          width: '100%',
          backgroundColor: 'rgba(8, 9, 12, 0.55)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${waveSvg.w} ${waveSvg.h}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="spectralWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, idx) => (
                <stop
                  key={`wave-stop-${idx}`}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity="0.85"
                />
              ))}
            </linearGradient>
            <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Center baseline reference */}
          <line
            x1="0"
            y1={waveSvg.h / 2}
            x2={waveSvg.w}
            y2={waveSvg.h / 2}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />

          {/* Background subtle glow wave */}
          <path
            d={waveSvg.path}
            fill="none"
            stroke="url(#spectralWaveGradient)"
            strokeWidth="3.5"
            strokeOpacity="0.25"
            strokeLinecap="round"
          />

          {/* Sharp foreground rhythm wave */}
          <path
            d={waveSvg.path}
            fill="none"
            stroke="url(#spectralWaveGradient)"
            strokeWidth="1.6"
            strokeLinecap="round"
            filter="url(#waveGlow)"
          />
        </svg>

        {/* Overlay Label for Waveform */}
        <span
          style={{
            position: 'absolute',
            right: '8px',
            bottom: '3px',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(255, 255, 255, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            pointerEvents: 'none',
          }}
        >
          Onda Espectral de Respiración
        </span>
      </div>

      {/* Unified Horizontal Chromatic Spectral Wave / Rhythm Bar */}
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
          <div
            style={{
              width: `${pDialogue}%`,
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.35)',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Diálogo: ${pDialogue}%`}
          />
          <div
            style={{
              width: `${pAction}%`,
              backgroundColor: '#f97316',
              boxShadow: '0 0 10px rgba(249, 115, 22, 0.35)',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Acción: ${pAction}%`}
          />
          <div
            style={{
              width: `${pLore}%`,
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.35)',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Lore: ${pLore}%`}
          />
          <div
            style={{
              width: `${pMonologue}%`,
              backgroundColor: '#a855f7',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.35)',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Monólogo: ${pMonologue}%`}
          />
        </div>

        {/* Micro-Pill Spectral Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '2px' }}>
          {CHANNELS.map(({ key, label, color }) => {
            const pct =
              key === 'dialogue'
                ? pDialogue
                : key === 'action'
                ? pAction
                : key === 'lore'
                ? pLore
                : pMonologue;

            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(8, 9, 12, 0.45)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                </div>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
