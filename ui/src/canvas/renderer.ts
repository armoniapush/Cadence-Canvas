import type { Track, Scene, ReadingAnchor } from '../types';

export const FONT_SANS = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO = FONT_SANS; // Unified with senior sans: quita fuentes de código mono
export const FONT_EDITORIAL = '"Newsreader", Georgia, Cambria, serif';

export const RULER_HEIGHT = 26;
export const TRACK_HEADER_WIDTH = 210;
export const TRACK_HEIGHT = 112;
export const TRACK_GAP = 16;
export const CARD_PAD_Y = 8;
export const CANVAS_TOP_PAD = 48;
export const CARD_HEIGHT = TRACK_HEIGHT - CARD_PAD_Y * 2; // 96
export const PIXELS_PER_UNIT = 1.3;
export const MUTE_BTN_W = 28;
export const MUTE_BTN_H = 24;
export const CARD_BORDER_RADIUS = 16;
export const PORT_RADIUS = 4;
export const PORT_HOVER_RADIUS = 6;
export const PORT_HIT_RADIUS = 14;
export const CARD_MIN_WIDTH = 250;
export const CARD_MIN_GAP_PX = 24;

export function getEffectiveSceneDuration(duration: number, zoom: number): number {
  return Math.max(duration, Math.ceil(CARD_MIN_WIDTH / (PIXELS_PER_UNIT * zoom)));
}

export function getEffectiveGapUnits(zoom: number): number {
  return Math.ceil(CARD_MIN_GAP_PX / (PIXELS_PER_UNIT * zoom));
}

/**
 * Enforces spatial anti-collision on the target track.
 * Cards on the same narrative track are prevented from overlapping ("transponerse").
 */
export function resolveSceneAntiCollision(
  desiredTStart: number,
  duration: number,
  targetTrackId: string,
  scenes: Scene[],
  activeSceneId: string,
  zoom: number
): number {
  const activeUnits = getEffectiveSceneDuration(duration, zoom);
  const gapUnits = getEffectiveGapUnits(zoom);

  // Other scenes on the target track sorted by t_start
  const trackScenes = scenes
    .filter((s) => s.id !== activeSceneId && s.track_id === targetTrackId)
    .sort((a, b) => a.t_start - b.t_start);

  if (trackScenes.length === 0) {
    return Math.max(0, desiredTStart);
  }

  // Find slot between scenes
  const first = trackScenes[0];
  const firstStart = first.t_start;
  const firstEnd = first.t_start + getEffectiveSceneDuration(first.duration, zoom);

  // If desired is to the left of the midpoint of the first scene
  if (desiredTStart + activeUnits / 2 < (firstStart + firstEnd) / 2) {
    if (firstStart >= activeUnits + gapUnits) {
      return Math.max(0, Math.min(desiredTStart, firstStart - activeUnits - gapUnits));
    } else {
      // Allow dragging all the way to the left boundary of the track (t >= 0)
      return Math.max(0, desiredTStart);
    }
  }

  // Check intermediate slots
  for (let i = 0; i < trackScenes.length - 1; i++) {
    const cur = trackScenes[i];
    const next = trackScenes[i + 1];
    const curEnd = cur.t_start + getEffectiveSceneDuration(cur.duration, zoom);
    const nextStart = next.t_start;
    const nextEnd = next.t_start + getEffectiveSceneDuration(next.duration, zoom);

    const midCur = (cur.t_start + curEnd) / 2;
    const midNext = (nextStart + nextEnd) / 2;

    if (desiredTStart >= midCur && desiredTStart < midNext) {
      const minT = curEnd + gapUnits;
      const maxT = nextStart - activeUnits - gapUnits;
      if (minT <= maxT) {
        return Math.max(minT, Math.min(desiredTStart, maxT));
      } else {
        const distToMin = Math.abs(desiredTStart - minT);
        const distToNextEnd = Math.abs(desiredTStart - (nextEnd + gapUnits));
        return distToMin <= distToNextEnd ? minT : nextEnd + gapUnits;
      }
    }
  }

  // After the last scene
  const last = trackScenes[trackScenes.length - 1];
  const lastEnd = last.t_start + getEffectiveSceneDuration(last.duration, zoom);
  return Math.max(lastEnd + gapUnits, desiredTStart);
}

export const NARRATIVE_LANDMARKS: Record<number, string> = {
  0: 'Acto I: Incidente Incitador',
  100: 'Punto de Giro I',
  200: 'Acto II: Confrontación',
  300: 'Punto de Inflexión / Clímax',
  400: 'Acto III: Resolución',
  500: 'Desenlace',
};

export const NARRATIVE_LANDMARKS_SHORT: Record<number, string> = {
  0: 'Acto I',
  100: 'Giro I',
  200: 'Acto II',
  300: 'Clímax',
  400: 'Acto III',
  500: 'Fin',
};

export interface DramaticActZone {
  t: number;
  label: string;
  color: string;
}

export const DRAMATIC_ACT_ZONES: DramaticActZone[] = [
  { t: 0, label: 'Acto I', color: '#818cf8' },
  { t: 100, label: 'Giro I', color: '#38bdf8' },
  { t: 200, label: 'Acto II', color: '#a78bfa' },
  { t: 300, label: 'Clímax', color: '#f43f5e' },
  { t: 400, label: 'Acto III', color: '#34d399' },
  { t: 500, label: 'Desenlace', color: '#94a3b8' },
];

export interface CardHeaderLayout {
  showMeta: boolean;
  metaStr: string;
  metaStrW: number;
  showIndex: boolean;
  numStr: string;
  displayTitle: string;
  titleW: number;
  availTitleW: number;
  displayTrkName: string;
  trkNameW: number;
  availTrackNameW: number;
}

/**
 * Computes scene card header layout, preventing text collision between
 * scene title, index, and reading telemetry under tight spatial widths.
 */
export function computeCardHeaderLayout(
  scnW: number,
  titleOrTrkName: string,
  sceneIdx: number,
  words: number,
  measureText: (text: string, font: string) => number
): CardHeaderLayout {
  const numStr = `#${String(sceneIdx + 1).padStart(2, '0')}`;
  const readingMins = Math.max(1, Math.ceil(words / 240));
  const readingTimeStr = readingMins === 1 ? '~1 min' : `~${readingMins} min`;
  const metaStr = `${words} pal · ${readingTimeStr}`;

  const fontMeta = '500 10.5px ' + FONT_SANS;
  const fontTitle = '600 11.5px ' + FONT_SANS;

  let metaStrW = scnW >= 140 ? measureText(metaStr, fontMeta) : 0;
  let availTitleW = Math.max(30, scnW - 44 - (metaStrW > 0 ? metaStrW + 16 : 0));

  let showMeta = metaStrW > 0;
  if (availTitleW < 50 && metaStrW > 0) {
    showMeta = false;
    metaStrW = 0;
    availTitleW = Math.max(30, scnW - 44);
  }

  const indexStr = `·  ${numStr}`;
  const indexW = measureText(indexStr, fontMeta);
  let showIndex = availTitleW >= 50;
  if (showIndex && availTitleW - indexW - 6 < 30) {
    showIndex = false;
  }

  const maxTitleW = showIndex ? Math.max(20, availTitleW - indexW - 6) : availTitleW;

  let displayTitle = titleOrTrkName;
  if (measureText(displayTitle, fontTitle) > maxTitleW) {
    while (displayTitle.length > 1 && measureText(displayTitle + '…', fontTitle) > maxTitleW) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '…';
  }
  const titleW = measureText(displayTitle, fontTitle);

  return {
    showMeta,
    metaStr,
    metaStrW,
    showIndex,
    numStr,
    displayTitle,
    titleW,
    availTitleW,
    displayTrkName: displayTitle,
    trkNameW: titleW,
    availTrackNameW: availTitleW,
  };
}

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
  const ly = CANVAS_TOP_PAD + vp.panY + trackIndex * (TRACK_HEIGHT + TRACK_GAP);
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
  editingSceneId?: string | null;
  showDramaticActs?: boolean;
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
    y: vp.panY + CANVAS_TOP_PAD + idx * (TRACK_HEIGHT + TRACK_GAP) + CARD_PAD_Y,
    w: Math.max(CARD_MIN_WIDTH, s.duration * PIXELS_PER_UNIT * vp.zoom),
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

  // 1. Base Canvas Void Background (Deep Pitch Obsidian)
  ctx.fillStyle = '#040508';
  ctx.fillRect(0, 0, w, h);

  // 2. Google Stitch Multi-Stop Atmospheric Nebula Glows (Senior Ambient Bloom)
  // Primary soft luminous indigo-violet aura centered on the canvas
  const auraX = w * 0.46;
  const auraY = h * 0.38;
  const auraR = Math.max(w, h) * 0.72;
  const auraGrad = ctx.createRadialGradient(auraX, auraY, 30, auraX, auraY, auraR);
  auraGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
  auraGrad.addColorStop(0.35, 'rgba(139, 92, 246, 0.04)');
  auraGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.015)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.fillRect(0, 0, w, h);

  // Secondary subtle cyan ambient highlight (bottom-right depth)
  const cyanX = w * 0.75;
  const cyanY = h * 0.65;
  const cyanR = Math.max(w, h) * 0.45;
  const cyanGrad = ctx.createRadialGradient(cyanX, cyanY, 20, cyanX, cyanY, cyanR);
  cyanGrad.addColorStop(0, 'rgba(6, 182, 212, 0.045)');
  cyanGrad.addColorStop(0.55, 'rgba(6, 182, 212, 0.01)');
  cyanGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = cyanGrad;
  ctx.fillRect(0, 0, w, h);

  // 3. Subtle Infinite Dot Grid (Stitch / Material 3 node grid)
  const dotStep = 24;
  const startDotX = Math.max(TRACK_HEADER_WIDTH, (((vp.panX % dotStep) + dotStep) % dotStep) + TRACK_HEADER_WIDTH);
  const startDotY = (((vp.panY % dotStep) + dotStep) % dotStep) || 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  ctx.beginPath();
  for (let gx = startDotX; gx <= w; gx += dotStep) {
    for (let gy = startDotY; gy <= h; gy += dotStep) {
      ctx.moveTo(gx + 0.85, gy);
      ctx.arc(gx, gy, 0.85, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.fill();
  ctx.restore();

  // 3.5. Subtle Track Lane Corridors (Horizontally aligned with Left Track Headers)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  tracks.forEach((trk, idx) => {
    const ly = CANVAS_TOP_PAD + vp.panY + idx * (TRACK_HEIGHT + TRACK_GAP);
    if (ly + TRACK_HEIGHT < 0 || ly > h) return;

    // Subtle track corridor ambient tint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, w - TRACK_HEADER_WIDTH, TRACK_HEIGHT);

    // Track lane boundary separator lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.032)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TRACK_HEADER_WIDTH, ly + 0.5);
    ctx.lineTo(w, ly + 0.5);
    ctx.moveTo(TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT - 0.5);
    ctx.lineTo(w, ly + TRACK_HEIGHT - 0.5);
    ctx.stroke();

    // Subtle track color entrance indicator
    ctx.fillStyle = hexToRgba(trk.color_hex || '#6366f1', 0.25);
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + 1, 3, TRACK_HEIGHT - 2);
  });
  ctx.restore();

  const trkMap = new Map(tracks.map((t) => [t.id, t]));
  const scnMap = new Map(scenes.map((s) => [s.id, s]));

  // 4. Organic Fluid Bézier Ribbons with Animated Glowing Energy Pulses (Beloved Ribbon Shape)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  const cables = anchors.length > 0
    ? anchors.map((a) => ({ src: scnMap.get(a.source_scene_id), dst: scnMap.get(a.target_scene_id), wt: a.weight || 1 }))
    : [...scenes].sort((a, b) => a.t_start - b.t_start).slice(0, -1).map((s, i) => ({ src: s, dst: scenes[i + 1], wt: 1 }));

  cables.forEach(({ src, dst, wt = 1 }, cableIdx) => {
    if (!src || !dst) return;
    const sR = getSceneRect(src, tracks, vp, dragState);
    const dR = getSceneRect(dst, tracks, vp, dragState);
    // Out-socket of source
    const x1 = sR.x + sR.w;
    const y1 = sR.y + sR.h / 2;
    // In-socket of destination
    const x2 = dR.x;
    const y2 = dR.y + dR.h / 2;

    const isConnectedToSel = selectedSceneId && (src.id === selectedSceneId || dst.id === selectedSceneId);
    const dx = x2 - x1;
    const dy = y2 - y1;
    // Smooth sigmoid control point distance: curves gracefully across tracks
    const dist = dx > 0
      ? Math.max(25, Math.min(dx * 0.48, 100)) + Math.abs(dy) * 0.15
      : Math.max(50, Math.abs(dx) * 0.45) + Math.abs(dy) * 0.2;
    const c1x = x1 + dist;
    const c2x = x2 - dist;

    const colSrc = trkMap.get(src.track_id)?.color_hex || '#6366f1';
    const colDst = trkMap.get(dst.track_id)?.color_hex || '#38bdf8';

    const rh = Math.max(10, Math.min(18, 13 * wt));

    // 1. Organic Fluid Ribbon Stream Body (Translucent filled band)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.lineTo(x2, y2 + rh / 2);
    ctx.bezierCurveTo(c2x, y2 + rh / 2, c1x, y1 + rh / 2, x1, y1 + rh / 2);
    ctx.closePath();

    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    const alphaBase = isConnectedToSel ? 0.40 : 0.24;
    const alphaMid = isConnectedToSel ? 0.22 : 0.12;
    g.addColorStop(0, hexToRgba(colSrc, alphaBase));
    g.addColorStop(0.35, hexToRgba('#38bdf8', alphaMid)); // Radiant cyan bridge
    g.addColorStop(0.70, hexToRgba('#a855f7', alphaMid)); // Electric violet bridge
    g.addColorStop(1, hexToRgba(colDst, alphaBase));
    ctx.fillStyle = g;
    ctx.fill();

    // Specular contour boundary edges on top and bottom of the ribbon
    const contourGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    contourGrad.addColorStop(0, hexToRgba(colSrc, isConnectedToSel ? 0.90 : 0.55));
    contourGrad.addColorStop(0.5, isConnectedToSel ? 'rgba(56, 189, 248, 0.75)' : 'rgba(56, 189, 248, 0.45)');
    contourGrad.addColorStop(1, hexToRgba(colDst, isConnectedToSel ? 0.90 : 0.55));
    ctx.strokeStyle = contourGrad;
    ctx.lineWidth = isConnectedToSel ? 1.6 : 1.15;

    // Top edge curve
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.stroke();

    // Bottom edge curve
    ctx.beginPath();
    ctx.moveTo(x1, y1 + rh / 2);
    ctx.bezierCurveTo(c1x, y1 + rh / 2, c2x, y2 + rh / 2, x2, y2 + rh / 2);
    ctx.stroke();
    ctx.restore();

    // 2. Central Luminescent Flow Core Wire with chromatic aura
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(c1x, y1, c2x, y2, x2, y2);
    const centerGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    centerGrad.addColorStop(0, hexToRgba(colSrc, isConnectedToSel ? 0.95 : 0.75));
    centerGrad.addColorStop(0.5, isConnectedToSel ? '#38bdf8' : 'rgba(56, 189, 248, 0.85)');
    centerGrad.addColorStop(1, hexToRgba(colDst, isConnectedToSel ? 0.95 : 0.75));
    ctx.strokeStyle = centerGrad;
    ctx.lineWidth = isConnectedToSel ? 2.2 : 1.4;
    ctx.shadowColor = isConnectedToSel ? '#38bdf8' : colDst;
    ctx.shadowBlur = isConnectedToSel ? 10 : 5;
    ctx.stroke();
    ctx.restore();

    // 3. Flowing Electric Energy Pulse traveling from Cause to Effect
    const time = performance.now() / 1600;
    const tPulse = (time + cableIdx * 0.42) % 1;
    const u = 1 - tPulse;
    const px = u * u * u * x1 + 3 * u * u * tPulse * c1x + 3 * u * tPulse * tPulse * c2x + tPulse * tPulse * tPulse * x2;
    const py = u * u * u * y1 + 3 * u * u * tPulse * y1 + 3 * u * tPulse * tPulse * y2 + tPulse * tPulse * tPulse * y2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, isConnectedToSel ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = isConnectedToSel ? 12 : 8;
    ctx.fill();

    // Pulse core gem
    ctx.beginPath();
    ctx.arc(px, py, isConnectedToSel ? 2.2 : 1.6, 0, Math.PI * 2);
    ctx.fillStyle = colDst;
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  // 5. Modular Scene Cards (Google Stitch Node Canvas Style)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  scenes.forEach((s, sceneIdx) => {
    const { x, y, w: scnW, h: scnH, isD } = getSceneRect(s, tracks, vp, dragState);
    if (x + scnW < 0 || x > w || y + scnH < RULER_HEIGHT || y > h) return;

    const isSel = s.id === selectedSceneId;
    const track = trkMap.get(isD && dragState ? dragState.previewTrackId : s.track_id);
    const col = track?.color_hex || '#6366f1';
    const isMuted = track?.is_muted ?? false;

    ctx.save();
    if (isMuted) {
      ctx.globalAlpha = 0.35;
    }

    // Diffuse Ambient Chromatic Aurora Bloom (Pinterest SaaS Card Reveal & Orion)
    if (isSel || isD) {
      const cx = x + scnW / 2;
      const cy = y + scnH / 2;
      ctx.save();
      const auraGrad = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(scnW, scnH) * 0.25,
        cx,
        cy,
        Math.max(scnW, scnH) * 0.95
      );
      auraGrad.addColorStop(0, hexToRgba(col, isD ? 0.36 : 0.26));
      auraGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.12)'); // Radiant cyan
      auraGrad.addColorStop(0.75, 'rgba(168, 85, 247, 0.08)'); // Electric violet
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 24, y - 24, scnW + 48, scnH + 48, CARD_BORDER_RADIUS + 14);
      else ctx.rect(x - 24, y - 24, scnW + 48, scnH + 48);
      ctx.fill();
      ctx.restore();
    }

    // Physical Card Lift Shadow
    ctx.save();
    if (isSel || isD) {
      ctx.shadowColor = hexToRgba(col, 0.45);
      ctx.shadowBlur = isD ? 28 : 20;
      ctx.shadowOffsetY = isD ? 8 : 4;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
    }

    // Card Container (Frosted Obsidian Glass - Ultra Minimalist Senior Surface)
    const cardGrad = ctx.createLinearGradient(x, y, x, y + scnH);
    if (isD) {
      cardGrad.addColorStop(0, '#1c2236');
      cardGrad.addColorStop(0.4, '#131828');
      cardGrad.addColorStop(1, '#0c0f18');
    } else if (isSel) {
      cardGrad.addColorStop(0, '#161d30');
      cardGrad.addColorStop(0.4, '#111524');
      cardGrad.addColorStop(1, '#090c14');
    } else {
      cardGrad.addColorStop(0, '#111420');
      cardGrad.addColorStop(0.5, '#0d0f17');
      cardGrad.addColorStop(1, '#08090f');
    }
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fill();
    ctx.restore();

    // Razor-sharp 1px Top Edge Inset Specular Highlight (Apple / Vercel / Pinterest technique)
    const rimGrad = ctx.createLinearGradient(x, y, x + scnW, y);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    rimGrad.addColorStop(0.2, isSel ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.12)');
    rimGrad.addColorStop(0.8, isSel ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.12)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(x + CARD_BORDER_RADIUS, y + 1, Math.max(0, scnW - CARD_BORDER_RADIUS * 2), 1);

    // Card Outer Border (Crisp 1px hair-line catching the track color)
    ctx.lineWidth = isD ? 2 : isSel ? 1.5 : 1;
    if (isSel) {
      const borderGrad = ctx.createLinearGradient(x, y, x + scnW, y + scnH);
      borderGrad.addColorStop(0, col);
      borderGrad.addColorStop(0.5, '#38bdf8');
      borderGrad.addColorStop(1, col);
      ctx.strokeStyle = borderGrad;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    }
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 0.5, y - 0.5, scnW + 1, scnH + 1, CARD_BORDER_RADIUS);
    else ctx.strokeRect(x, y, scnW, scnH);
    ctx.stroke();

    // 1. Senior Minimalist Header Row (Anti-collision: Scene Title, index, telemetry)
    // Left: Luminous Thread Pip + Editable Scene Title + Scene Index
    const words = s.word_count || 0;

    const headerLayout = computeCardHeaderLayout(
      scnW,
      s.title,
      sceneIdx,
      words,
      (text, font) => {
        ctx.font = font;
        return ctx.measureText(text).width;
      }
    );

    // 0. Hero Architectural Chapter Numeral: Prominent, high-visibility landmark
    const sceneNum = String(sceneIdx + 1).padStart(2, '0');
    ctx.save();
    ctx.font = '800 36px ' + FONT_SANS;
    ctx.fillStyle = hexToRgba(col, isSel ? 0.48 : 0.32);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(sceneNum, x + scnW - 14, y + scnH - 14);
    ctx.restore();

    ctx.save();
    // Luminous thread accent pip (clean 3px dot with soft aura)
    ctx.beginPath();
    ctx.arc(x + 18, y + 20, 3, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Scene Title (Clean 11.5px bold with collision-free truncation)
    // Only render canvas title text if not currently active in inline edit overlay
    if (data.editingSceneId !== s.id) {
      ctx.font = '600 11.5px ' + FONT_SANS;
      ctx.fillStyle = isSel ? '#ffffff' : '#e2e8f0';
      ctx.fillText(headerLayout.displayTitle, x + 27, y + 23);
    }

    // Right-aligned High-Contrast Telemetry Capsule (Workflow Plan Pill Technique)
    if (headerLayout.showMeta) {
      const metaFont = '600 10px ' + FONT_SANS;
      ctx.font = metaFont;
      const textW = ctx.measureText(headerLayout.metaStr).width;
      const pillPadX = 8;
      const pillH = 18;
      const pillW = textW + pillPadX * 2;
      const pillX = x + scnW - 14 - pillW;
      const pillY = y + 11;

      // Pill capsule surface
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 9999);
      else ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fillStyle = isSel ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
      ctx.strokeStyle = isSel ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tabular text inside capsule
      ctx.fillStyle = isSel ? '#e2e8f0' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(headerLayout.metaStr, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
      ctx.restore();
    }
    ctx.restore();

    // 2. Card Body: Excerpt prose text (Clean 11.5px subtle prose in slate)
    ctx.font = '400 11.5px ' + FONT_SANS;
    ctx.fillStyle = '#94a3b8';
    const rawText = (s.text || '').replace(/\s+/g, ' ').trim();
    let excerpt = rawText.length > 0 ? rawText : '(Sin contenido redactado)';
    const maxExcerptW = Math.max(20, scnW - 32);
    if (ctx.measureText(excerpt).width > maxExcerptW) {
      while (excerpt.length > 2 && ctx.measureText(excerpt + '…').width > maxExcerptW) {
        excerpt = excerpt.slice(0, -1);
      }
      excerpt += '…';
    }
    ctx.fillText(excerpt, x + 16, y + 47);

    // 3. Subtle Track lane indicator badge at bottom of card
    const trkName = track?.name || 'Hilo';
    ctx.font = '500 10px ' + FONT_SANS;
    ctx.fillStyle = '#475569';
    let displayTrkBadge = trkName;
    if (ctx.measureText(displayTrkBadge).width > maxExcerptW) {
      while (displayTrkBadge.length > 2 && ctx.measureText(displayTrkBadge + '…').width > maxExcerptW) {
        displayTrkBadge = displayTrkBadge.slice(0, -1);
      }
      displayTrkBadge += '…';
    }
    ctx.fillText(displayTrkBadge, x + 16, y + 67);

    // Concentric Physical In/Out Sockets
    const inPortX = x;
    const inPortY = y + scnH / 2;
    const outPortX = x + scnW;
    const outPortY = y + scnH / 2;

    const isInHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'in';
    const isOutHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'out';
    const isConnecting = Boolean(data.connectingWire);

    // In-Port (Left Concentric Physical Socket)
    ctx.save();
    const inR = isInHover ? PORT_HOVER_RADIUS + 2 : isSel || isConnecting ? 6.5 : 5.5;
    ctx.beginPath();
    ctx.arc(inPortX, inPortY, inR, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = isInHover ? '#ffffff' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(inPortX, inPortY, inR - 1.8, 0, Math.PI * 2);
    ctx.strokeStyle = isInHover ? '#a5b4fc' : '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(inPortX, inPortY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isInHover ? '#ffffff' : '#a5b4fc';
    ctx.fill();
    ctx.restore();

    // Out-Port (Right Concentric Physical Socket)
    ctx.save();
    const outR = isOutHover ? PORT_HOVER_RADIUS + 2 : isSel || isConnecting ? 6.5 : 5.5;
    ctx.beginPath();
    ctx.arc(outPortX, outPortY, outR, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = isOutHover ? '#ffffff' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(outPortX, outPortY, outR - 1.8, 0, Math.PI * 2);
    ctx.strokeStyle = isOutHover ? '#a5b4fc' : '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(outPortX, outPortY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isOutHover ? '#ffffff' : '#a5b4fc';
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
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(c1x, startY, c2x, toY, toX, toY);
      ctx.stroke();

      // Sharp core wire
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
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

  // 6. Narrative Beats Ruler (Sticky 26px Top Ruler with Dramatic Act Zones & Beat Ticks)
  if (RULER_HEIGHT > 0) {
    ctx.save();

    // Pinned background across canvas width
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, RULER_HEIGHT);

    // Subtle 1px specular bottom border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);

    // Timeline area clip (x >= TRACK_HEADER_WIDTH)
    ctx.save();
    ctx.beginPath();
    ctx.rect(TRACK_HEADER_WIDTH, 0, w - TRACK_HEADER_WIDTH, RULER_HEIGHT);
    ctx.clip();

    // Subtle beat tick marks every 60 units
    const tickStep = 60;
    const startTick = Math.max(0, Math.floor((-vp.panX) / (PIXELS_PER_UNIT * vp.zoom * tickStep))) * tickStep;
    const endTick = Math.ceil((w - TRACK_HEADER_WIDTH - vp.panX) / (PIXELS_PER_UNIT * vp.zoom * tickStep)) * tickStep;

    for (let t = startTick; t <= endTick; t += tickStep) {
      const rx = TRACK_HEADER_WIDTH + vp.panX + t * PIXELS_PER_UNIT * vp.zoom;
      if (rx < TRACK_HEADER_WIDTH || rx > w) continue;

      // Bottom-aligned tick mark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(rx, RULER_HEIGHT - 6, 1, 6);
    }

    // Optional Dramatic Act Zones (only rendered if explicitly enabled; hidden by default for custom author structure)
    if (data.showDramaticActs) {
      for (const zone of DRAMATIC_ACT_ZONES) {
        const zx = TRACK_HEADER_WIDTH + vp.panX + zone.t * PIXELS_PER_UNIT * vp.zoom;
        if (zx < TRACK_HEADER_WIDTH - 15 || zx > w + 60) continue;

        // Vertical act boundary line
        ctx.fillStyle = hexToRgba(zone.color, 0.35);
        ctx.fillRect(zx, 0, 1, RULER_HEIGHT);

        // Subtle luminous pip
        ctx.beginPath();
        ctx.arc(zx + 6, 8.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = zone.color;
        ctx.shadowColor = zone.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Clean, understated dramatic zone label
        ctx.font = '600 9.5px ' + FONT_SANS;
        ctx.fillStyle = zone.color;
        ctx.textAlign = 'left';
        ctx.fillText(zone.label.toUpperCase(), zx + 12, 11.5);
      }
    }

    ctx.restore();

    // Specular Divider Line between Left Track Column and Canvas Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);

    ctx.restore();
  }

  // Specular Divider Line between Left Track Column and Canvas
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, h);

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
