import type { Track, Scene, ReadingAnchor } from '../types';

export const RULER_HEIGHT = 34;
export const TRACK_HEADER_WIDTH = 160;
export const TRACK_HEIGHT = 86;
export const TRACK_GAP = 8;
export const CARD_PAD_Y = 8;
export const CARD_HEIGHT = TRACK_HEIGHT - CARD_PAD_Y * 2;
export const PIXELS_PER_UNIT = 1.2;

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
    w: Math.max(76, s.duration * PIXELS_PER_UNIT * vp.zoom),
    h: CARD_HEIGHT,
    idx,
    isD,
  };
}

export function renderDawCanvas(ctx: CanvasRenderingContext2D, data: CanvasRenderData): void {
  const { tracks, scenes, anchors, selectedSceneId, currentTime, dragState, viewport: vp, dpr, width: w, height: h } = data;
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Base & Lanes
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, w, h - RULER_HEIGHT);
  ctx.clip();

  tracks.forEach((_, i) => {
    const ly = RULER_HEIGHT + vp.panY + i * (TRACK_HEIGHT + TRACK_GAP);
    ctx.fillStyle = i % 2 === 0 ? '#0e111a' : '#121520';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, w - TRACK_HEADER_WIDTH, TRACK_HEIGHT);
    ctx.fillStyle = '#1c2130';
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
    ctx.strokeStyle = t % (step * 4) === 0 ? '#22283a' : '#141824';
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
    const rh = Math.max(12, Math.min(26, 16 * wt)), dx = Math.max(36, x2 - x1);
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

  // 3. Tactical Cards
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();
  for (const s of scenes) {
    const { x, y, w: scnW, h: scnH, isD } = getSceneRect(s, tracks, vp, dragState);
    if (x + scnW < TRACK_HEADER_WIDTH || x > w || y + scnH < RULER_HEIGHT || y > h) continue;
    const isSel = s.id === selectedSceneId;
    const col = trkMap.get(isD && dragState ? dragState.previewTrackId : s.track_id)?.color_hex || '#6366f1';

    ctx.fillStyle = isSel ? '#1c2233' : '#141824';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, scnW, scnH, 4) : ctx.rect(x, y, scnW, scnH); ctx.fill();
    ctx.fillStyle = isSel ? '#4b5563' : '#2d3748';
    ctx.fillRect(x + 2, y + 1, scnW - 4, 1);
    ctx.fillStyle = col; ctx.fillRect(x, y, 4, scnH);

    ctx.lineWidth = isSel || isD ? 1.5 : 1;
    ctx.strokeStyle = isD ? '#f59e0b' : isSel ? '#38bdf8' : '#222838';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 0.5, y - 0.5, scnW + 1, scnH + 1, 4) : ctx.strokeRect(x, y, scnW, scnH); ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.rect(x + 8, y + 2, scnW - 12, scnH - 4); ctx.clip();
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#f1f5f9';
    ctx.fillText(s.title, x + 10, y + 22);

    const bY = y + 36;
    ctx.fillStyle = '#0f121a'; ctx.fillRect(x + 10, bY, 46, 16);
    ctx.strokeStyle = '#242a3a'; ctx.strokeRect(x + 10, bY, 46, 16);
    ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${s.word_count || 0}w`, x + 14, bY + 12);
    ctx.fillStyle = '#38bdf8'; ctx.fillText(`v${s.version}`, x + 62, bY + 12);
    ctx.fillStyle = '#64748b'; ctx.fillText(`T:${isD && dragState ? dragState.previewTStart : s.t_start}`, x + 94, bY + 12);
    ctx.restore();
  }
  ctx.restore();

  // Pinned Track Headers & Top Ruler
  ctx.save();
  ctx.beginPath(); ctx.rect(0, RULER_HEIGHT, TRACK_HEADER_WIDTH, h - RULER_HEIGHT); ctx.clip();
  tracks.forEach((trk, idx) => {
    const ly = RULER_HEIGHT + vp.panY + idx * (TRACK_HEIGHT + TRACK_GAP);
    ctx.fillStyle = '#0d1017'; ctx.fillRect(0, ly, TRACK_HEADER_WIDTH, TRACK_HEIGHT);
    ctx.fillStyle = '#1e2436'; ctx.fillRect(TRACK_HEADER_WIDTH - 1, ly, 1, TRACK_HEIGHT);
    ctx.fillStyle = trk.color_hex; ctx.fillRect(10, ly + 16, 4, TRACK_HEIGHT - 32);
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#e2e8f0';
    ctx.fillText(trk.name, 22, ly + 34);
    ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#64748b';
    ctx.fillText(`TRK 0${trk.track_order + 1}`, 22, ly + 54);
  });
  ctx.restore();

  // Ruler & Scrubber
  ctx.save();
  ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, w, RULER_HEIGHT);
  ctx.fillStyle = '#1e2436'; ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);
  for (let t = stT; t <= endT; t += step) {
    const rx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (rx < TRACK_HEADER_WIDTH || rx > w) continue;
    const isM = t % (step * 2) === 0;
    ctx.fillStyle = isM ? '#475569' : '#1e293b';
    ctx.fillRect(rx, RULER_HEIGHT - (isM ? 12 : 6), 1, isM ? 12 : 6);
    if (isM) { ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#64748b'; ctx.fillText(`${t}`, rx + 4, RULER_HEIGHT - 14); }
  }
  ctx.fillStyle = '#0f131d'; ctx.fillRect(0, 0, TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.fillStyle = '#1e2436'; ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('CRONOLOGÍA', 14, 21);

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
  constructor(private canvas: HTMLCanvasElement, private getState: () => CanvasRenderData) {}
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
