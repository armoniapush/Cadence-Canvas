import type { Track, Scene, ReadingAnchor } from '../types';

export const RULER_HEIGHT = 42;
export const TRACK_HEADER_WIDTH = 200;
export const TRACK_HEIGHT = 104;
export const TRACK_GAP = 10;
export const CARD_PAD_Y = 8;
export const CARD_HEIGHT = TRACK_HEIGHT - CARD_PAD_Y * 2; // 88
export const PIXELS_PER_UNIT = 1.3;
export const MUTE_BTN_W = 28;
export const MUTE_BTN_H = 24;
export const CARD_BORDER_RADIUS = 12;
export const PORT_RADIUS = 4;
export const PORT_HOVER_RADIUS = 6;
export const PORT_HIT_RADIUS = 14;

export interface SnapResult {
  snappedTStart: number;
  isSnapped: boolean;
  snapType?: 'grid' | 'head-to-tail' | 'parallel' | 'origin';
  guideT?: number;
}

export function computeMagneticSnap(
  rawTStart: number,
  duration: number,
  targetTrackId: string,
  scenes: Scene[],
  activeSceneId: string,
  zoom: number,
  magnetEnabled: boolean = true,
  snapStep: number = 10,
  snapThresholdPx: number = 14
): SnapResult {
  const clamped = Math.max(0, rawTStart);
  if (!magnetEnabled) {
    return { snappedTStart: clamped, isSnapped: false };
  }

  const thresholdUnits = Math.max(2, snapThresholdPx / (PIXELS_PER_UNIT * zoom));
  const otherScenes = scenes.filter((s) => s.id !== activeSceneId);

  // 1. Origin snap: t = 0
  if (clamped <= thresholdUnits) {
    return { snappedTStart: 0, isSnapped: true, snapType: 'origin', guideT: 0 };
  }

  // 2. Head-to-tail snap on target track (preceding scene's end => rawTStart)
  for (const other of otherScenes) {
    if (other.track_id === targetTrackId) {
      const otherEnd = other.t_start + other.duration;
      if (Math.abs(clamped - otherEnd) <= thresholdUnits) {
        return { snappedTStart: otherEnd, isSnapped: true, snapType: 'head-to-tail', guideT: otherEnd };
      }
      const neededStart = other.t_start - duration;
      if (neededStart >= 0 && Math.abs(clamped - neededStart) <= thresholdUnits) {
        return { snappedTStart: neededStart, isSnapped: true, snapType: 'head-to-tail', guideT: other.t_start };
      }
    }
  }

  // 3. Parallel start alignment with scenes on other tracks
  for (const other of otherScenes) {
    if (other.track_id !== targetTrackId) {
      if (Math.abs(clamped - other.t_start) <= thresholdUnits) {
        return { snappedTStart: other.t_start, isSnapped: true, snapType: 'parallel', guideT: other.t_start };
      }
      const otherEnd = other.t_start + other.duration;
      if (Math.abs(clamped - otherEnd) <= thresholdUnits) {
        return { snappedTStart: otherEnd, isSnapped: true, snapType: 'parallel', guideT: otherEnd };
      }
    }
  }

  // 4. Beat Grid Snap (multiples of snapStep, e.g. 10, 20, 30...)
  const nearestGrid = Math.round(clamped / snapStep) * snapStep;
  if (Math.abs(clamped - nearestGrid) <= thresholdUnits) {
    return { snappedTStart: nearestGrid, isSnapped: true, snapType: 'grid', guideT: nearestGrid };
  }

  return { snappedTStart: clamped, isSnapped: false };
}

export function getScenePortRects(sceneRect: { x: number; y: number; w: number; h: number }) {
  return {
    inPort: {
      x: sceneRect.x,
      y: sceneRect.y + sceneRect.h / 2,
    },
    outPort: {
      x: sceneRect.x + sceneRect.w,
      y: sceneRect.y + sceneRect.h / 2,
    },
  };
}

export function computeFitViewport(
  scenes: Scene[],
  canvasWidth: number,
  minPadding: number = 40
): Viewport {
  if (scenes.length === 0) {
    return { zoom: 1.0, panX: 20, panY: 0 };
  }
  let minT = Infinity;
  let maxT = -Infinity;
  for (const s of scenes) {
    if (s.t_start < minT) minT = s.t_start;
    const end = s.t_start + (s.duration || 60);
    if (end > maxT) maxT = end;
  }
  const totalSpanT = Math.max(60, maxT - minT);
  const availableW = Math.max(160, canvasWidth - TRACK_HEADER_WIDTH - minPadding * 2);
  const rawZoom = availableW / (totalSpanT * PIXELS_PER_UNIT);
  const clampedZoom = Math.max(0.25, Math.min(3.0, Number(rawZoom.toFixed(2))));
  const panX = Math.round(minPadding - minT * PIXELS_PER_UNIT * clampedZoom);
  return { zoom: clampedZoom, panX, panY: 0 };
}

export function getTrackMuteButtonRect(trackIndex: number, vp: Viewport) {
  const ly = RULER_HEIGHT + vp.panY + trackIndex * (TRACK_HEIGHT + TRACK_GAP);
  return {
    x: TRACK_HEADER_WIDTH - 38,
    y: ly + (TRACK_HEIGHT - MUTE_BTN_H) / 2,
    w: MUTE_BTN_W,
    h: MUTE_BTN_H,
  };
}

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface DragState {
  sceneId: string;
  previewTrackId: string;
  previewTStart: number;
}

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
  magnetGuideT?: number | null;
  connectingWire?: { fromSceneId: string; fromPort: 'in' | 'out'; toX: number; toY: number } | null;
  hoveredPort?: { sceneId: string; port: 'in' | 'out' } | null;
}

export const hexToRgba = (hex: string, a: number): string => {
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
  const { tracks, scenes, anchors, selectedSceneId, dragState, viewport: vp, dpr, width: w, height: h } = data;
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Deep Atmospheric Slate Canvas & Grounded Modular Swimlanes (Fluxa / Imagion style)
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, w, h - RULER_HEIGHT);
  ctx.clip();

  // Render modular swimlane tracks with authentic depth and clear boundaries
  tracks.forEach((trk, i) => {
    const ly = RULER_HEIGHT + vp.panY + i * (TRACK_HEIGHT + TRACK_GAP);
    const laneW = w - TRACK_HEADER_WIDTH;

    // Track Lane Bed: Solid slate-obsidian with alternating luminance for tangible channel separation
    ctx.fillStyle = i % 2 === 0 ? '#121520' : '#151926';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, laneW, TRACK_HEIGHT);

    // Subtle vertical surface gradient (matte depth)
    const laneGrad = ctx.createLinearGradient(TRACK_HEADER_WIDTH, ly, TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT);
    laneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    laneGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = laneGrad;
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, laneW, TRACK_HEIGHT);

    // Top hairline lane boundary
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, laneW, 1);

    // Bottom hairline lane boundary
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT - 1, laneW, 1);

    // Lane Left Accent Notch (connecting visually with the track header)
    ctx.save();
    ctx.fillStyle = trk.color_hex || '#4361ee';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(TRACK_HEADER_WIDTH + 8, ly + 14, 4, TRACK_HEIGHT - 28, 2);
    else ctx.fillRect(TRACK_HEADER_WIDTH + 8, ly + 14, 4, TRACK_HEIGHT - 28);
    ctx.fill();
    ctx.restore();

    // Subtle horizontal centerline track guide
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT / 2, laneW, 1);
  });

  // 2. High-Performance Batched Wavely-Style Dot-Matrix Grid Background
  const step = vp.zoom > 1.4 ? 25 : vp.zoom > 0.7 ? 50 : vp.zoom > 0.35 ? 100 : 250;
  const stT = Math.max(0, Math.floor(-vp.panX / (PIXELS_PER_UNIT * vp.zoom * step)) * step);
  const endT = Math.ceil((w - TRACK_HEADER_WIDTH - vp.panX) / (PIXELS_PER_UNIT * vp.zoom * step)) * step;

  // Draw subtle rhythmic vertical guidelines
  ctx.lineWidth = 1;
  for (let t = stT; t <= endT; t += step) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (gx < TRACK_HEADER_WIDTH || gx > w) continue;
    const isMajor = t % (step * 4) === 0;
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.025)';
    ctx.beginPath();
    ctx.moveTo(gx, RULER_HEIGHT);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }

  // Batched dot matrix points across the full visible canvas with crisp tactile contrast
  const dotStepY = 26;
  const startY = RULER_HEIGHT + ((((vp.panY % dotStepY) + dotStepY) % dotStepY) || 0);

  // Minor dots batch
  ctx.beginPath();
  for (let t = stT; t <= endT; t += step) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (gx < TRACK_HEADER_WIDTH || gx > w) continue;
    const isMajor = t % (step * 4) === 0;
    if (isMajor) continue;

    for (let gy = startY; gy <= h; gy += dotStepY) {
      ctx.moveTo(gx + 1, gy);
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.fill();

  // Major dots batch
  ctx.beginPath();
  for (let t = stT; t <= endT; t += step) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (gx < TRACK_HEADER_WIDTH || gx > w) continue;
    const isMajor = t % (step * 4) === 0;
    if (!isMajor) continue;

    for (let gy = startY; gy <= h; gy += dotStepY) {
      ctx.moveTo(gx + 1.5, gy);
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fill();

  ctx.restore();

  const trkMap = new Map(tracks.map((t) => [t.id, t]));
  const scnMap = new Map(scenes.map((s) => [s.id, s]));

  // 3. Organic Fluid Bézier Ribbons with Animated Glowing Energy Pulses (Hybrid Stream Design)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  const ribbons = anchors.length > 0
    ? anchors.map((a) => ({ src: scnMap.get(a.source_scene_id), dst: scnMap.get(a.target_scene_id), wt: a.weight || 1 }))
    : [...scenes].sort((a, b) => a.t_start - b.t_start).slice(0, -1).map((s, i) => ({ src: s, dst: scenes[i + 1], wt: 1 }));

  ribbons.forEach(({ src, dst, wt = 1 }, cableIdx) => {
    if (!src || !dst) return;
    const sR = getSceneRect(src, tracks, vp, dragState);
    const dR = getSceneRect(dst, tracks, vp, dragState);
    const x1 = sR.x + sR.w;
    const y1 = sR.y + sR.h / 2;
    const x2 = dR.x;
    const y2 = dR.y + dR.h / 2;

    const isConnectedToSel = selectedSceneId && (src.id === selectedSceneId || dst.id === selectedSceneId);
    const dx = x2 - x1;
    // Buttery smooth sigmoid tangents: control distance scales proportionally to horizontal span
    const dist = dx > 0 ? Math.max(18, Math.min(dx * 0.48, 85)) : Math.max(45, Math.abs(dx) * 0.45);
    const c1x = x1 + dist;
    const c2x = x2 - dist;

    const colSrc = trkMap.get(src.track_id)?.color_hex || '#6366f1';
    const colDst = trkMap.get(dst.track_id)?.color_hex || '#38bdf8';

    const rh = Math.max(10, Math.min(20, 13 * wt));

    // 1. Organic Fluid Ribbon Stream Body (The beloved ribbon shape)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.lineTo(x2, y2 + rh / 2);
    ctx.bezierCurveTo(c2x, y2 + rh / 2, c1x, y1 + rh / 2, x1, y1 + rh / 2);
    ctx.closePath();

    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    const alphaBase = isConnectedToSel ? 0.36 : 0.20;
    const alphaMid = isConnectedToSel ? 0.22 : 0.10;
    g.addColorStop(0, hexToRgba(colSrc, alphaBase));
    g.addColorStop(0.5, hexToRgba(colSrc, alphaMid));
    g.addColorStop(1, hexToRgba(colDst, alphaBase));
    ctx.fillStyle = g;
    ctx.fill();

    // Specular contour boundary edges on top and bottom of the ribbon
    const contourGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    contourGrad.addColorStop(0, hexToRgba(colSrc, isConnectedToSel ? 0.80 : 0.42));
    contourGrad.addColorStop(1, hexToRgba(colDst, isConnectedToSel ? 0.80 : 0.42));
    ctx.strokeStyle = contourGrad;
    ctx.lineWidth = isConnectedToSel ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1 + rh / 2);
    ctx.bezierCurveTo(c1x, y1 + rh / 2, c2x, y2 + rh / 2, x2, y2 + rh / 2);
    ctx.stroke();
    ctx.restore();

    // 2. Central Luminescent Flow Core (New vibrant color gradient)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(c1x, y1, c2x, y2, x2, y2);
    const centerGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    centerGrad.addColorStop(0, hexToRgba(colSrc, isConnectedToSel ? 0.90 : 0.60));
    centerGrad.addColorStop(1, hexToRgba(colDst, isConnectedToSel ? 0.90 : 0.60));
    ctx.strokeStyle = centerGrad;
    ctx.lineWidth = isConnectedToSel ? 2 : 1.35;
    ctx.stroke();
    ctx.restore();

    // 3. Flowing Electric Energy Pulse traveling from Cause to Effect (The new animation)
    const time = performance.now() / 1600;
    const tPulse = (time + cableIdx * 0.42) % 1;
    const u = 1 - tPulse;
    const px = u * u * u * x1 + 3 * u * u * tPulse * c1x + 3 * u * tPulse * tPulse * c2x + tPulse * tPulse * tPulse * x2;
    const py = u * u * u * y1 + 3 * u * u * tPulse * y1 + 3 * u * tPulse * tPulse * y2 + tPulse * tPulse * tPulse * y2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, isConnectedToSel ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = colDst;
    ctx.shadowBlur = isConnectedToSel ? 10 : 6;
    ctx.fill();

    // Pulse core gem
    ctx.beginPath();
    ctx.arc(px, py, isConnectedToSel ? 2 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = colDst;
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  // 4. Ultra-Senior Modular Story Node Cards (Fluxa / AI Creative Canvas / Wavely style)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  scenes.forEach((s, sceneIdx) => {
    const { x, y, w: scnW, h: scnH, isD } = getSceneRect(s, tracks, vp, dragState);
    if (x + scnW < TRACK_HEADER_WIDTH || x > w || y + scnH < RULER_HEIGHT || y > h) return;

    const isSel = s.id === selectedSceneId;
    const track = trkMap.get(isD && dragState ? dragState.previewTrackId : s.track_id);
    const col = track?.color_hex || '#6366f1';
    const isMuted = track?.is_muted ?? false;

    ctx.save();
    if (isMuted) {
      ctx.globalAlpha = 0.35;
    }

    // Physical Card Lift Shadow
    ctx.save();
    ctx.shadowColor = isD ? 'rgba(0, 0, 0, 0.85)' : isSel ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = isD ? 26 : isSel ? 16 : 8;
    ctx.shadowOffsetY = isD ? 12 : isSel ? 6 : 3;

    // Card Background Container: deep charcoal-obsidian
    ctx.fillStyle = isD ? '#1e2436' : isSel ? '#191d2b' : '#141724';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fill();
    ctx.restore();

    // 1. Modular Header Bar (Height 28px) with subtle track tint (Fluxa style)
    const headerH = 28;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, headerH, [CARD_BORDER_RADIUS, CARD_BORDER_RADIUS, 0, 0]);
    else ctx.rect(x, y, scnW, headerH);
    ctx.fillStyle = hexToRgba(col, isSel ? 0.22 : 0.12);
    ctx.fill();

    // Header bottom hairline separator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y + headerH - 1, scnW, 1);
    ctx.restore();

    // Top Specular Highlight Line
    ctx.fillStyle = isD ? 'rgba(255, 255, 255, 0.35)' : isSel ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.09)';
    ctx.fillRect(x + CARD_BORDER_RADIUS, y + 1, Math.max(0, scnW - CARD_BORDER_RADIUS * 2), 1);

    // Card Outer Border
    ctx.lineWidth = isD ? 1.75 : isSel ? 1.5 : 1;
    ctx.strokeStyle = isD ? '#60a5fa' : isSel ? col : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 0.5, y - 0.5, scnW + 1, scnH + 1, CARD_BORDER_RADIUS);
    else ctx.strokeRect(x, y, scnW, scnH);
    ctx.stroke();

    // Inside Header: Index badge (#01, #02) + Scene Title + Version chip
    const numStr = `#0${sceneIdx + 1}`;
    ctx.save();
    ctx.font = '700 9px ui-monospace, monospace';
    const numW = ctx.measureText(numStr).width + 8;
    ctx.fillStyle = '#0f121b';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 10, y + 6, numW, 16, 4);
    else ctx.rect(x + 10, y + 6, numW, 16);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(col, 0.4);
    ctx.stroke();

    ctx.fillStyle = isSel ? '#ffffff' : '#94a3b8';
    ctx.fillText(numStr, x + 14, y + 18);

    // Title (Bold white 12px)
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleStartX = x + 10 + numW + 8;
    const maxTitleW = Math.max(20, scnW - numW - 65);
    let displayTitle = s.title;
    if (ctx.measureText(displayTitle).width > maxTitleW) {
      while (displayTitle.length > 3 && ctx.measureText(displayTitle + '…').width > maxTitleW) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '…';
    }
    ctx.fillText(displayTitle, titleStartX, y + 18);

    // Version Chip on Right of Header
    if (scnW >= 150) {
      const verStr = `v${s.version}`;
      ctx.font = '600 9px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(verStr, x + scnW - 12, y + 18);
      ctx.textAlign = 'start';
    }
    ctx.restore();

    // Card Body: Narrative Excerpt
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 10, y + headerH + 4, Math.max(10, scnW - 20), scnH - headerH - 26);
    ctx.clip();

    const rawText = (s.text || '').replace(/\s+/g, ' ').trim();
    const excerpt = rawText.length > 0
      ? (rawText.length > 46 ? rawText.slice(0, 46) + '…' : rawText)
      : '(Sin contenido redactado aún)';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(excerpt, x + 12, y + headerH + 18);
    ctx.restore();

    // Card Footer: Duration Pill
    const words = s.word_count || 0;
    const readingMins = Math.max(1, Math.ceil(words / 240));
    const bY = y + scnH - 22;

    if (scnW >= 110) {
      const metricStr = `⏱ ${words} pal · ~${readingMins}m`;
      ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
      const textW = ctx.measureText(metricStr).width;
      const bW = textW + 12;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 10, bY, bW, 16, 4);
      else ctx.rect(x + 10, bY, bW, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(metricStr, x + 16, bY + 11);
      ctx.restore();
    }

    // Bottom Duration Clip Accent Line (DAW timeline clip style)
    ctx.save();
    ctx.fillStyle = hexToRgba(col, 0.65);
    ctx.fillRect(x + CARD_BORDER_RADIUS, y + scnH - 3, Math.max(0, scnW - CARD_BORDER_RADIUS * 2), 2);
    ctx.restore();

    // Sockets / Ports (Fluxa & Wavely style)
    const inPortX = x;
    const inPortY = y + scnH / 2;
    const outPortX = x + scnW;
    const outPortY = y + scnH / 2;

    const isInHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'in';
    const isOutHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'out';
    const isConnecting = Boolean(data.connectingWire);

    // In-Port (Left Causal Socket)
    ctx.save();
    ctx.beginPath();
    const inR = isInHover ? PORT_HOVER_RADIUS : isSel || isConnecting ? 5 : PORT_RADIUS;
    ctx.arc(inPortX, inPortY, inR, 0, Math.PI * 2);
    ctx.fillStyle = '#10131d';
    ctx.strokeStyle = isInHover ? '#ffffff' : '#818cf8';
    ctx.lineWidth = isInHover ? 2.5 : 1.75;
    ctx.fill();
    ctx.stroke();

    // Core dot inside In-Port
    ctx.beginPath();
    ctx.arc(inPortX, inPortY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#818cf8';
    ctx.fill();
    ctx.restore();

    // Out-Port (Right Causal Socket)
    ctx.save();
    ctx.beginPath();
    const outR = isOutHover ? PORT_HOVER_RADIUS : isSel || isConnecting ? 5 : PORT_RADIUS;
    ctx.arc(outPortX, outPortY, outR, 0, Math.PI * 2);
    ctx.fillStyle = '#10131d';
    ctx.strokeStyle = isOutHover ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = isOutHover ? 2.5 : 1.75;
    ctx.fill();
    ctx.stroke();

    // Core dot inside Out-Port
    ctx.beginPath();
    ctx.arc(outPortX, outPortY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  });
  ctx.restore();

  // Active interactive connecting Bézier cable
  if (data.connectingWire) {
    const { fromSceneId, fromPort, toX, toY } = data.connectingWire;
    const srcScene = scnMap.get(fromSceneId);
    if (srcScene) {
      const srcRect = getSceneRect(srcScene, tracks, vp, dragState);
      const startX = fromPort === 'out' ? srcRect.x + srcRect.w : srcRect.x;
      const startY = srcRect.y + srcRect.h / 2;
      const dist = Math.max(30, Math.abs(toX - startX) * 0.45);
      const c1x = fromPort === 'out' ? startX + dist : startX - dist;
      const c2x = toX > startX ? toX - dist : toX + dist;

      ctx.save();
      // Flowing electric pulse micro-animation along causal cable
      const dashOffset = -(performance.now() / 35) % 10;
      ctx.lineDashOffset = dashOffset;
      ctx.setLineDash([5, 5]);

      // Subtle ambient glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(c1x, startY, c2x, toY, toX, toY);
      ctx.stroke();

      // Sharp core wire
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.75;
      ctx.stroke();

      // Magnetic cable tip with glowing halo
      ctx.setLineDash([]);
      ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(toX, toY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Headless Magnetic Alignment Laser Guideline (Discreet, zero interface clutter)
  if (data.magnetGuideT !== undefined && data.magnetGuideT !== null) {
    const gx = TRACK_HEADER_WIDTH + vp.panX + data.magnetGuideT * PIXELS_PER_UNIT * vp.zoom;
    if (gx >= TRACK_HEADER_WIDTH && gx <= w) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, RULER_HEIGHT);
      ctx.lineTo(gx, h);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5. Pinned Track Headers (Hilos Narrativos)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  tracks.forEach((trk, idx) => {
    const ly = RULER_HEIGHT + vp.panY + idx * (TRACK_HEIGHT + TRACK_GAP);

    // DAW Channel Strip Background: Deep slate-obsidian (#131622) with subtle top specular
    ctx.fillStyle = '#131622';
    ctx.fillRect(0, ly, TRACK_HEADER_WIDTH, TRACK_HEIGHT);

    // Subtle bevel top highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, ly, TRACK_HEADER_WIDTH, 1);

    // Bottom lane border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, ly + TRACK_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);

    // Right border specular dividing header from timeline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(TRACK_HEADER_WIDTH - 1, ly, 1, TRACK_HEIGHT);

    // Left vertical track accent strip (5px wide)
    ctx.fillStyle = trk.color_hex || '#4361ee';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, ly + 12, 5, TRACK_HEIGHT - 24, 2.5);
    else ctx.fillRect(8, ly + 12, 5, TRACK_HEIGHT - 24);
    ctx.fill();

    // Channel Index Chip (e.g. "CH 01")
    const chStr = `CH 0${idx + 1}`;
    ctx.font = '700 9px ui-monospace, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(chStr, 22, ly + 25);

    // Track Name (Bold 13px)
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = trk.is_muted ? '#64748b' : '#f8fafc';
    const truncatedName = trk.name.length > 15 ? trk.name.slice(0, 14) + '…' : trk.name;
    ctx.fillText(truncatedName, 22, ly + 45);

    // Dynamic Telemetry Pill: Scenes & Total Words
    const trkScenes = scenes.filter((s) => s.track_id === trk.id);
    const trkWords = trkScenes.reduce((sum, s) => sum + (s.word_count || 0), 0);
    const metaStr = `${trkScenes.length} esc · ${trkWords.toLocaleString()} pal`;
    ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
    const metaW = ctx.measureText(metaStr).width + 12;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(22, ly + 56, metaW, 16, 4);
    else ctx.rect(22, ly + 56, metaW, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(metaStr, 28, ly + 68);
    ctx.restore();

    // Hardware-style Visibility/Mute button [ 👁 ]
    const mBtn = getTrackMuteButtonRect(idx, vp);
    const isM = trk.is_muted;
    ctx.fillStyle = isM ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isM ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(mBtn.x, mBtn.y, mBtn.w, mBtn.h, 6);
    else ctx.rect(mBtn.x, mBtn.y, mBtn.w, mBtn.h);
    ctx.fill();
    ctx.stroke();

    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = isM ? '#fbbf24' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isM ? '👁‍🗨' : '👁', mBtn.x + mBtn.w / 2, mBtn.y + mBtn.h / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  });
  ctx.restore();

  // 6. Clean Sequence Timeline Ruler & Playhead
  ctx.save();
  // Ruler Background: matte obsidian
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(0, 0, w, RULER_HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);

  // Ruler timeline area
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, 0, w - TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.clip();

  for (let t = stT; t <= endT; t += step) {
    const rx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
    if (rx < TRACK_HEADER_WIDTH || rx > w) continue;
    const isMajor = t % (step * 4) === 0;
    const isMedium = !isMajor && t % (step * 2) === 0;

    if (isMajor) {
      // Major rhythm tick
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(rx, RULER_HEIGHT - 12, 1, 12);

      // Subtle indicator node above major ticks
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.beginPath();
      ctx.arc(rx, 15, 2, 0, Math.PI * 2);
      ctx.fill();

      // Timecode timestamp (Create.Video style)
      const minutes = Math.floor(t / 60);
      const seconds = Math.floor(t % 60);
      const timecode = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      ctx.font = '500 10px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(timecode, rx + 6, RULER_HEIGHT - 14);
    } else if (isMedium) {
      // Medium rhythm tick
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(rx, RULER_HEIGHT - 8, 1, 8);
    } else {
      // Minor rhythm tick
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(rx, RULER_HEIGHT - 4, 1, 4);
    }
  }
  ctx.restore();

  // Pinned Top-Left Header: SECUENCIA NARRATIVA
  ctx.fillStyle = '#10131d';
  ctx.fillRect(0, 0, TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);
  ctx.fillRect(0, RULER_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);

  // Matte cyan dot + label
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(20, RULER_HEIGHT / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('SECUENCIA NARRATIVA', 32, RULER_HEIGHT / 2 + 4);
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
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  public render() {
    try {
      const ctx = this.canvas.getContext('2d', { alpha: false });
      if (ctx) renderDawCanvas(ctx, this.getState());
    } catch (err) {
      console.error('[DawCanvasRenderer] Frame render error:', err);
    }
  }
}
