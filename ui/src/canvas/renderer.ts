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

  // Vertical Grid
  const step = vp.zoom > 1.4 ? 25 : vp.zoom > 0.7 ? 50 : vp.zoom > 0.35 ? 100 : 250;
  const stT = Math.max(0, Math.floor(-vp.panX / (PIXELS_PER_UNIT * vp.zoom * step)) * step);
  const endT = Math.ceil((w - TRACK_HEADER_WIDTH - vp.panX) / (PIXELS_PER_UNIT * vp.zoom * step)) * step;
  ctx.lineWidth = 1;
  for (let t = stT; t <= endT; t += step) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (gx < TRACK_HEADER_WIDTH || gx > w) continue;
    ctx.strokeStyle = t % (step * 4) === 0 ? '#1f2538' : '#131622';
    ctx.beginPath(); ctx.moveTo(gx, RULER_HEIGHT); ctx.lineTo(gx, h); ctx.stroke();
  }

  // Act subtle vertical lines across lanes (Act boundaries and Midpoint)
  const act120LaneX = TRACK_HEADER_WIDTH + vp.panX + 120 * PIXELS_PER_UNIT * vp.zoom;
  const act240LaneX = TRACK_HEADER_WIDTH + vp.panX + 240 * PIXELS_PER_UNIT * vp.zoom;
  const act360LaneX = TRACK_HEADER_WIDTH + vp.panX + 360 * PIXELS_PER_UNIT * vp.zoom;

  if (act120LaneX >= TRACK_HEADER_WIDTH && act120LaneX <= w) {
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.18)';
    ctx.beginPath(); ctx.moveTo(act120LaneX, RULER_HEIGHT); ctx.lineTo(act120LaneX, h); ctx.stroke();
    ctx.restore();
  }

  // Golden Midpoint divider across lanes
  if (act240LaneX >= TRACK_HEADER_WIDTH && act240LaneX <= w) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.22)';
    ctx.beginPath(); ctx.moveTo(act240LaneX, RULER_HEIGHT); ctx.lineTo(act240LaneX, h); ctx.stroke();
    ctx.restore();
  }

  if (act360LaneX >= TRACK_HEADER_WIDTH && act360LaneX <= w) {
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.18)';
    ctx.beginPath(); ctx.moveTo(act360LaneX, RULER_HEIGHT); ctx.lineTo(act360LaneX, h); ctx.stroke();
    ctx.restore();
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

  // 5. Narrative Structure 3-Act Ruler & Scrubber
  ctx.save();
  // Ruler Background
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, w, RULER_HEIGHT);
  ctx.fillStyle = '#1e2436';
  ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);

  // Ruler timeline area (clipped to the right of track headers)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, 0, w - TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.clip();

  const act0X = TRACK_HEADER_WIDTH + vp.panX + 0 * PIXELS_PER_UNIT * vp.zoom;
  const act120X = TRACK_HEADER_WIDTH + vp.panX + 120 * PIXELS_PER_UNIT * vp.zoom;
  const act240X = TRACK_HEADER_WIDTH + vp.panX + 240 * PIXELS_PER_UNIT * vp.zoom;
  const act360X = TRACK_HEADER_WIDTH + vp.panX + 360 * PIXELS_PER_UNIT * vp.zoom;
  const actEndX = TRACK_HEADER_WIDTH + vp.panX + 600 * PIXELS_PER_UNIT * vp.zoom;

  // Act I Band (0 .. 120): ACTO I · PLANTEAMIENTO
  if (act120X > TRACK_HEADER_WIDTH && act0X < w) {
    const startX = Math.max(TRACK_HEADER_WIDTH, act0X);
    const endX = Math.min(w, act120X);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.fillRect(startX, 0, endX - startX, RULER_HEIGHT - 1);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.fillRect(startX, 0, endX - startX, 2);

    const labelX = Math.max(act0X + 10, TRACK_HEADER_WIDTH + 10);
    if (labelX + 100 < act120X) {
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText('ACTO I · PLANTEAMIENTO', labelX, 16);
    }
  }

  // Act II-A Band (120 .. 240): ACTO II-A · ASCENSO
  if (act240X > TRACK_HEADER_WIDTH && act120X < w) {
    const startX = Math.max(TRACK_HEADER_WIDTH, act120X);
    const endX = Math.min(w, act240X);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fillRect(startX, 0, endX - startX, RULER_HEIGHT - 1);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(startX, 0, endX - startX, 2);

    const labelX = Math.max(act120X + 10, TRACK_HEADER_WIDTH + 10);
    if (labelX + 90 < act240X - 42) {
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('ACTO II-A · ASCENSO', labelX, 16);
    }
  }

  // Act II-B Band (240 .. 360): ACTO II-B · CRISIS
  if (act360X > TRACK_HEADER_WIDTH && act240X < w) {
    const startX = Math.max(TRACK_HEADER_WIDTH, act240X);
    const endX = Math.min(w, act360X);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fillRect(startX, 0, endX - startX, RULER_HEIGHT - 1);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(startX, 0, endX - startX, 2);

    const labelX = Math.max(act240X + 46, TRACK_HEADER_WIDTH + 10);
    if (labelX + 80 < act360X) {
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('ACTO II-B · CRISIS', labelX, 16);
    }
  }

  // Act III Band (360 .. 600+): ACTO III · CLÍMAX Y RESOLUCIÓN
  if (actEndX > TRACK_HEADER_WIDTH && act360X < w) {
    const startX = Math.max(TRACK_HEADER_WIDTH, act360X);
    const endX = Math.min(w, Math.max(actEndX, w));
    ctx.fillStyle = 'rgba(244, 63, 94, 0.07)';
    ctx.fillRect(startX, 0, endX - startX, RULER_HEIGHT - 1);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.fillRect(startX, 0, endX - startX, 2);

    const labelX = Math.max(act360X + 10, TRACK_HEADER_WIDTH + 10);
    if (labelX + 130 < endX) {
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fb7185';
      ctx.fillText('ACTO III · CLÍMAX Y RESOLUCIÓN', labelX, 16);
    }
  }

  // Act divider lines
  if (act120X >= TRACK_HEADER_WIDTH && act120X <= w) {
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(act120X, 0); ctx.lineTo(act120X, RULER_HEIGHT - 1); ctx.stroke();
  }
  if (act360X >= TRACK_HEADER_WIDTH && act360X <= w) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(act360X, 0); ctx.lineTo(act360X, RULER_HEIGHT - 1); ctx.stroke();
  }

  // Punto Medio (~240): Golden line & badge
  if (act240X >= TRACK_HEADER_WIDTH && act240X <= w) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(act240X, 0);
    ctx.lineTo(act240X, RULER_HEIGHT - 1);
    ctx.stroke();

    const badgeW = 74;
    const badgeH = 15;
    const badgeX = act240X - badgeW / 2;
    if (badgeX >= TRACK_HEADER_WIDTH && badgeX + badgeW <= w) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(badgeX, 4, badgeW, badgeH, 3);
      else ctx.rect(badgeX, 4, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 9px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PUNTO MEDIO', act240X, 4 + badgeH / 2);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  }

  // Bottom Graduation Ticks
  for (let t = stT; t <= endT; t += step) {
    const rx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (rx < TRACK_HEADER_WIDTH || rx > w) continue;
    const isMajor = t % (step * 2) === 0;
    ctx.fillStyle = isMajor ? '#475569' : '#1e293b';
    ctx.fillRect(rx, RULER_HEIGHT - (isMajor ? 8 : 4), 1, isMajor ? 8 : 4);
    if (isMajor && Math.abs(rx - act240X) > 20) {
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${t}`, rx + 3, RULER_HEIGHT - 10);
    }
  }
  ctx.restore();

  // Pinned Top-Left Header: ESTRUCTURA NARRATIVA
  ctx.fillStyle = '#0e111a'; ctx.fillRect(0, 0, TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.fillStyle = '#1e2436'; ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);
  ctx.fillStyle = '#1e2436'; ctx.fillRect(0, RULER_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#cbd5e1';
  ctx.fillText('ESTRUCTURA NARRATIVA', 16, 26);

  // Scrubber (Current Time Marker)
  const sx = TRACK_HEADER_WIDTH + vp.panX + currentTime * PIXELS_PER_UNIT * vp.zoom;
  if (sx >= TRACK_HEADER_WIDTH && sx <= w) {
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(sx - 5, 0); ctx.lineTo(sx + 5, 0); ctx.lineTo(sx + 5, RULER_HEIGHT - 6); ctx.lineTo(sx, RULER_HEIGHT); ctx.lineTo(sx - 5, RULER_HEIGHT - 6); ctx.fill();
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
