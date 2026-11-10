import type { Track, Scene, ReadingAnchor } from '../types';

export const RULER_HEIGHT = 42;
export const TRACK_HEADER_WIDTH = 200;
export const TRACK_HEIGHT = 104;
export const TRACK_GAP = 10;
export const CARD_PAD_Y = 8;
export const CARD_HEIGHT = TRACK_HEIGHT - CARD_PAD_Y * 2;
export const PIXELS_PER_UNIT = 1.3;
export const MUTE_BTN_W = 28;
export const MUTE_BTN_H = 24;

export function getTrackMuteButtonRect(trackIndex: number, vp: Viewport) {
  const ly = RULER_HEIGHT + vp.panY + trackIndex * (TRACK_HEIGHT + TRACK_GAP);
  return {
    x: TRACK_HEADER_WIDTH - 38,
    y: ly + (TRACK_HEIGHT - MUTE_BTN_H) / 2,
    w: MUTE_BTN_W,
    h: MUTE_BTN_H,
  };
}

export interface Viewport { panX: number; panY: number; zoom: number; }
export interface DragState { sceneId: string; previewTrackId: string; previewTStart: number; }
export interface CanvasRenderData {
  tracks: Track[];
  scenes: Scene[];
  anchors: ReadingAnchor[];
  selectedSceneId: string | null;
  currentTime: number;
  dragState: DragState | null;
  viewport: Viewport;
  dpr: number;
  width: number;
  height: number;
}

export const hexToRgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0'), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function getSceneRect(s: Scene, tracks: Track[], vp: Viewport, drag?: DragState | null) {
  const isD = drag?.sceneId === s.id;
  const trkId = isD ? drag.previewTrackId : s.track_id;
  const tStart = isD ? drag.previewTStart : s.t_start;
  const idx = Math.max(0, tracks.findIndex((t) => t.id === trkId));
  return {
    x: TRACK_HEADER_WIDTH + vp.panX + tStart * PIXELS_PER_UNIT * vp.zoom,
    y: RULER_HEIGHT + vp.panY + idx * (TRACK_HEIGHT + TRACK_GAP) + CARD_PAD_Y,
    w: Math.max(120, s.duration * PIXELS_PER_UNIT * vp.zoom),
    h: CARD_HEIGHT,
    idx,
    isD,
  };
}

export function renderDawCanvas(ctx: CanvasRenderingContext2D, data: CanvasRenderData): void {
  const { tracks, scenes, anchors, selectedSceneId, currentTime, dragState, viewport: vp, dpr, width: w, height: h } = data;
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Base & Story Lanes
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, w, h - RULER_HEIGHT);
  ctx.clip();

  tracks.forEach((_, i) => {
    const ly = RULER_HEIGHT + vp.panY + i * (TRACK_HEIGHT + TRACK_GAP);
    ctx.fillStyle = i % 2 === 0 ? '#0d1017' : '#10131e';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, w - TRACK_HEADER_WIDTH, TRACK_HEIGHT);
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT - 1, w - TRACK_HEADER_WIDTH, 1);
  });

  // Vertical Grid across lanes (subtle rhythmic guidelines)
  const step = vp.zoom > 1.4 ? 25 : vp.zoom > 0.7 ? 50 : vp.zoom > 0.35 ? 100 : 250;
  const stT = Math.max(0, Math.floor(-vp.panX / (PIXELS_PER_UNIT * vp.zoom * step)) * step);
  const endT = Math.ceil((w - TRACK_HEADER_WIDTH - vp.panX) / (PIXELS_PER_UNIT * vp.zoom * step)) * step;
  ctx.lineWidth = 1;
  for (let t = stT; t <= endT; t += step) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (gx < TRACK_HEADER_WIDTH || gx > w) continue;
    ctx.strokeStyle = t % (step * 4) === 0 ? '#1a1f2e' : '#10141e';
    ctx.beginPath(); ctx.moveTo(gx, RULER_HEIGHT); ctx.lineTo(gx, h); ctx.stroke();
  }

  ctx.restore();

  const trkMap = new Map(tracks.map((t) => [t.id, t]));
  const scnMap = new Map(scenes.map((s) => [s.id, s]));

  // 2. Sankey Causal Ribbons (Curvature k = 0.48)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();
  const ribbons = anchors.length > 0
    ? anchors.map((a) => ({ src: scnMap.get(a.source_scene_id), dst: scnMap.get(a.target_scene_id), wt: a.weight || 1 }))
    : [...scenes].sort((a, b) => a.t_start - b.t_start).slice(0, -1).map((s, i) => ({ src: s, dst: scenes[i + 1], wt: 1 }));

  for (const { src, dst, wt } of ribbons) {
    if (!src || !dst) continue;
    const sR = getSceneRect(src, tracks, vp, dragState), dR = getSceneRect(dst, tracks, vp, dragState);
    const x1 = sR.x + sR.w, y1 = sR.y + sR.h / 2, x2 = dR.x, y2 = dR.y + dR.h / 2;
    const rh = Math.max(14, Math.min(28, 16 * wt)), dx = Math.max(36, x2 - x1);
    const c1x = x1 + dx * 0.48, c2x = x2 - dx * 0.48;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.lineTo(x2, y2 + rh / 2);
    ctx.bezierCurveTo(c2x, y2 + rh / 2, c1x, y1 + rh / 2, x1, y1 + rh / 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, hexToRgba(trkMap.get(src.track_id)?.color_hex || '#6366f1', 0.35));
    g.addColorStop(1, hexToRgba(trkMap.get(dst.track_id)?.color_hex || '#38bdf8', 0.35));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = hexToRgba(trkMap.get(src.track_id)?.color_hex || '#6366f1', 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Fichas Literarias de Novela (Index Cards)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();
  for (const s of scenes) {
    const { x, y, w: scnW, h: scnH, isD } = getSceneRect(s, tracks, vp, dragState);
    if (x + scnW < TRACK_HEADER_WIDTH || x > w || y + scnH < RULER_HEIGHT || y > h) continue;
    const isSel = s.id === selectedSceneId;
    const track = trkMap.get(isD && dragState ? dragState.previewTrackId : s.track_id);
    const col = track?.color_hex || '#6366f1';
    const isMuted = track?.is_muted ?? false;

    ctx.save();
    if (isMuted) {
      ctx.globalAlpha = 0.35;
    }

    // Card background: warm-slate #161822, selected #1e2235, rounded 6px
    ctx.fillStyle = isSel ? '#1e2235' : '#161822';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, 6);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fill();

    // Subtle top highlight
    ctx.fillStyle = isSel ? '#3b4363' : '#232736';
    ctx.fillRect(x + 6, y + 1, scnW - 12, 1);

    // Left border of 4px with track color, clipped to rounded card
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, 6);
    else ctx.rect(x, y, scnW, scnH);
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 4, scnH);
    ctx.restore();

    // Card outer border
    ctx.lineWidth = isSel || isD ? 1.5 : 1;
    ctx.strokeStyle = isD ? '#f59e0b' : isSel ? '#6366f1' : '#282f44';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 0.5, y - 0.5, scnW + 1, scnH + 1, 6);
    else ctx.strokeRect(x, y, scnW, scnH);
    ctx.stroke();

    // Card text and details (clipped)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 8, y + 2, Math.max(10, scnW - 14), scnH - 4);
    ctx.clip();

    // Title (13px bold)
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isSel ? '#ffffff' : '#f8fafc';
    ctx.fillText(s.title, x + 12, y + 22);

    // Narrative excerpt (first words in warm-slate #94a3b8)
    const rawText = (s.text || '').replace(/\s+/g, ' ').trim();
    const excerpt = rawText.length > 0
      ? (rawText.length > 44 ? rawText.slice(0, 44) + '…' : rawText)
      : '(Sin contenido redactado aún)';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(excerpt, x + 12, y + 42);

    // Bottom badge: [ X palabras · ~Y min ] & v{version}
    const words = s.word_count || 0;
    const readingMins = Math.max(1, Math.ceil(words / 250));
    const bY = y + 58;
    const badgeH = 18;

    if (scnW >= 110) {
      const metricStr = scnW >= 170 ? `${words} palabras · ~${readingMins} min` : `${words} pal · ~${readingMins} min`;
      ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
      const textW = ctx.measureText(metricStr).width;
      const badgeW = textW + 12;

      ctx.fillStyle = '#10131d';
      ctx.strokeStyle = '#22293a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 12, bY, badgeW, badgeH, 4);
      else ctx.rect(x + 12, bY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(metricStr, x + 18, bY + 12);
    }

    // Version tag on bottom right
    if (scnW >= 70) {
      ctx.font = '500 10px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      const verText = `v${s.version}`;
      ctx.textAlign = 'right';
      ctx.fillText(verText, x + scnW - 10, bY + 12);
      ctx.textAlign = 'start';
    }

    ctx.restore();
    ctx.restore();
  }
  ctx.restore();

  // 4. Pinned Track Headers (Hilos Narrativos)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, RULER_HEIGHT, TRACK_HEADER_WIDTH, h - RULER_HEIGHT); ctx.clip();
  tracks.forEach((trk, idx) => {
    const ly = RULER_HEIGHT + vp.panY + idx * (TRACK_HEIGHT + TRACK_GAP);
    ctx.fillStyle = '#0f121b'; ctx.fillRect(0, ly, TRACK_HEADER_WIDTH, TRACK_HEIGHT);
    ctx.fillStyle = '#1e2436'; ctx.fillRect(0, ly + TRACK_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);
    ctx.fillRect(TRACK_HEADER_WIDTH - 1, ly, 1, TRACK_HEIGHT);

    // Color marker
    ctx.fillStyle = trk.color_hex;
    ctx.fillRect(10, ly + 16, 4, TRACK_HEIGHT - 32);

    // Track Name
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = trk.is_muted ? '#64748b' : '#f1f5f9';
    const truncatedName = trk.name.length > 17 ? trk.name.slice(0, 16) + '…' : trk.name;
    ctx.fillText(truncatedName, 22, ly + 36);

    // Subtitle: Hilo Narrativo
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Hilo Narrativo', 22, ly + 56);

    // Visibility button [ 👁 ] / [ 👁‍🗨 ]
    const mBtn = getTrackMuteButtonRect(idx, vp);
    const isM = trk.is_muted;
    ctx.fillStyle = isM ? 'rgba(245, 158, 11, 0.2)' : '#161b26';
    ctx.strokeStyle = isM ? '#f59e0b' : '#273142';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(mBtn.x, mBtn.y, mBtn.w, mBtn.h, 4);
    } else {
      ctx.rect(mBtn.x, mBtn.y, mBtn.w, mBtn.h);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = isM ? '#fbbf24' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isM ? '👁‍🗨' : '👁', mBtn.x + mBtn.w / 2, mBtn.y + mBtn.h / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  });
  ctx.restore();

  // 5. Clean Sequence Timeline Ruler & Playhead (Free of hardcoded acts or arbitrary numbers)
  ctx.save();
  // Ruler Background
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(0, 0, w, RULER_HEIGHT);
  ctx.fillStyle = '#1c2232';
  ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);
  // Hairline top border
  ctx.fillStyle = '#141824';
  ctx.fillRect(0, 0, w, 1);

  // Ruler timeline area (clipped to the right of track headers)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, 0, w - TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.clip();

  // Clean rhythmic narrative ticks (No arbitrary numbers or rigid act constraints)
  for (let t = stT; t <= endT; t += step) {
    const rx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (rx < TRACK_HEADER_WIDTH || rx > w) continue;
    const isMajor = t % (step * 4) === 0;
    const isMedium = !isMajor && t % (step * 2) === 0;

    if (isMajor) {
      // Major rhythm tick
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx, RULER_HEIGHT - 12, 1, 12);

      // Subtle indicator node above major ticks
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.beginPath();
      ctx.arc(rx, 15, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (isMedium) {
      // Medium rhythm tick
      ctx.fillStyle = '#334155';
      ctx.fillRect(rx, RULER_HEIGHT - 8, 1, 8);
    } else {
      // Minor rhythm tick
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx, RULER_HEIGHT - 4, 1, 4);
    }
  }
  ctx.restore();

  // Pinned Top-Left Header: SECUENCIA NARRATIVA
  ctx.fillStyle = '#0e121d';
  ctx.fillRect(0, 0, TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.fillStyle = '#1c2232';
  ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);
  ctx.fillStyle = '#1c2232';
  ctx.fillRect(0, RULER_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);

  // Subtle indigo jewel dot + label
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(20, RULER_HEIGHT / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('SECUENCIA NARRATIVA', 30, RULER_HEIGHT / 2 + 4);

  // Playhead / Cursor (Current Time Marker)
  const sx = TRACK_HEADER_WIDTH + vp.panX + currentTime * PIXELS_PER_UNIT * vp.zoom;
  if (sx >= TRACK_HEADER_WIDTH && sx <= w) {
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();

    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(sx - 5, 2, 10, 16, 3);
    else ctx.fillRect(sx - 5, 2, 10, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx - 3, 8);
    ctx.lineTo(sx + 3, 8);
    ctx.lineTo(sx, 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

export class DawCanvasRenderer {
  private rafId: number | null = null;
  private canvas: HTMLCanvasElement;
  private getState: () => CanvasRenderData;

  constructor(canvas: HTMLCanvasElement, getState: () => CanvasRenderData) {
    this.canvas = canvas;
    this.getState = getState;
  }

  public start() {
    const loop = () => { this.render(); this.rafId = requestAnimationFrame(loop); };
    this.rafId = requestAnimationFrame(loop);
  }
  public stop() { if (this.rafId) cancelAnimationFrame(this.rafId); }
  public render() {
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (ctx) renderDawCanvas(ctx, this.getState());
  }
}
