import type { Track, Scene, ReadingAnchor } from '../types';

export const FONT_SANS = '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
export const PORT_RADIUS = 2.5;
export const PORT_HOVER_RADIUS = 3.5;
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

/**
 * Wraps a scene excerpt into at most `maxLines` lines that fit `maxWidth`,
 * appending an ellipsis when the text is truncated (line-clamp-2 equivalent).
 */
export function wrapSceneExcerpt(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return ['(Sin contenido redactado)'];

  const words = clean.split(' ');
  const lines: string[] = [];
  let line = '';
  let consumed = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
      consumed = i + 1;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
      consumed = i + 1;
    }
  }

  if (lines.length < maxLines && line) {
    lines.push(line);
    consumed = words.length;
  }

  if (consumed < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && measure(last + '…') > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = last + '…';
  }

  return lines.slice(0, maxLines);
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

  // 1. Base Canvas Void Background — never a flat #000, always a tinted obsidian
  ctx.fillStyle = '#0a0b12';
  ctx.fillRect(0, 0, w, h);

  // 2. Google Stitch Aurora Orbs — two fixed ambient light sources
  // Orb 1 (indigo): top / center-left, roughly top-[-10%] left-[20%]
  const orbAX = w * 0.32;
  const orbAY = -h * 0.05;
  const orbAR = Math.max(320, Math.min(w * 0.52, 620));
  const orbAGrad = ctx.createRadialGradient(orbAX, orbAY, 0, orbAX, orbAY, orbAR);
  orbAGrad.addColorStop(0, 'rgba(79, 70, 229, 0.20)');
  orbAGrad.addColorStop(0.45, 'rgba(99, 102, 241, 0.09)');
  orbAGrad.addColorStop(0.75, 'rgba(99, 102, 241, 0.025)');
  orbAGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = orbAGrad;
  ctx.fillRect(0, 0, w, h);

  // Orb 2 (cyan): right side, roughly top-[30%] right-[10%]
  const orbBX = w * 0.92;
  const orbBY = h * 0.42;
  const orbBR = Math.max(300, Math.min(w * 0.46, 540));
  const orbBGrad = ctx.createRadialGradient(orbBX, orbBY, 0, orbBX, orbBY, orbBR);
  orbBGrad.addColorStop(0, 'rgba(6, 182, 212, 0.16)');
  orbBGrad.addColorStop(0.45, 'rgba(6, 182, 212, 0.07)');
  orbBGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.02)');
  orbBGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = orbBGrad;
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
  // Radial mask: dots dissolve softly toward the edges (Stitch atmospheric falloff)
  const gridMaskCx = (TRACK_HEADER_WIDTH + w) / 2;
  const gridMaskCy = (RULER_HEIGHT + h) / 2;
  const gridMaskR = Math.hypot(w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT) * 0.5;
  const gridMask = ctx.createRadialGradient(
    gridMaskCx,
    gridMaskCy,
    gridMaskR * 0.3,
    gridMaskCx,
    gridMaskCy,
    gridMaskR * 0.95
  );
  gridMask.addColorStop(0, 'rgba(255, 255, 255, 0.085)');
  gridMask.addColorStop(0.55, 'rgba(255, 255, 255, 0.045)');
  gridMask.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gridMask;
  ctx.fill();
  ctx.restore();

  // 3.5. Continuous Swimlanes: one uninterrupted row per narrative track,
  // separated only by a hairline (border-b border-white/[0.04]).
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  const LANE_HEIGHT = TRACK_HEIGHT + TRACK_GAP;

  tracks.forEach((trk, idx) => {
    const ly = CANVAS_TOP_PAD + vp.panY + idx * LANE_HEIGHT;
    if (ly + LANE_HEIGHT < RULER_HEIGHT || ly > h) return;

    // Lane band: rows touch, so the lane reads as one continuous track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, w - TRACK_HEADER_WIDTH, LANE_HEIGHT);

    // Hairline lane separator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + LANE_HEIGHT - 1, w - TRACK_HEADER_WIDTH, 1);

    // Track accent tick at the lane entrance
    ctx.fillStyle = hexToRgba(trk.color_hex || '#38bdf8', 0.3);
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + 1, 2, LANE_HEIGHT - 2);
  });
  ctx.restore();

  const trkMap = new Map(tracks.map((t) => [t.id, t]));
  const scnMap = new Map(scenes.map((s) => [s.id, s]));

  // 4. Causal Vector Wires: a single 1.5px Bézier from out-port to in-port,
  // with a directional arrow into the destination node.
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  const cables = anchors.length > 0
    ? anchors.map((a) => ({ src: scnMap.get(a.source_scene_id), dst: scnMap.get(a.target_scene_id), wt: a.weight || 1 }))
    : [...scenes].sort((a, b) => a.t_start - b.t_start).slice(0, -1).map((s, i) => ({ src: s, dst: scenes[i + 1], wt: 1 }));

  const ARROW_TIP_GAP = 5; // clears the 8px destination port
  const ARROW_LENGTH = 6;

  cables.forEach(({ src, dst }) => {
    if (!src || !dst) return;
    const sR = getSceneRect(src, tracks, vp, dragState);
    const dR = getSceneRect(dst, tracks, vp, dragState);

    // Out-port of the source → in-port of the destination
    const x1 = sR.x + sR.w;
    const y1 = sR.y + sR.h / 2;
    const x2 = dR.x;
    const y2 = dR.y + dR.h / 2;

    const isConnectedToSel = Boolean(selectedSceneId && (src.id === selectedSceneId || dst.id === selectedSceneId));

    const dx = x2 - x1;
    // Sigmoid control distance: graceful curve even when the destination sits behind
    const dist = dx > 0
      ? Math.max(28, Math.min(dx * 0.5, 96))
      : Math.max(56, Math.abs(dx) * 0.5);
    const c1x = x1 + dist;
    const c2x = x2 - dist;

    const tipX = x2 - ARROW_TIP_GAP;
    const baseX = tipX - ARROW_LENGTH;

    // Fiber-optic vector wire: cyan (#38bdf8) → indigo (#818cf8) with a luminous halo
    const cableGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    cableGrad.addColorStop(0, 'rgba(56, 189, 248, 1)');
    cableGrad.addColorStop(0.55, 'rgba(96, 165, 250, 0.95)');
    cableGrad.addColorStop(1, 'rgba(129, 140, 248, 1)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(c1x, y1, c2x, y2, baseX + 1, y2);
    ctx.strokeStyle = cableGrad;
    ctx.lineWidth = isConnectedToSel ? 2.5 : 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.globalAlpha = isConnectedToSel ? 1 : 0.5;
    // style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' }}
    ctx.shadowColor = isConnectedToSel ? 'rgba(56, 189, 248, 0.75)' : 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();

    // Directional arrow into the destination port
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, y2);
    ctx.lineTo(baseX, y2 - 3.2);
    ctx.lineTo(baseX, y2 + 3.2);
    ctx.closePath();
    ctx.fillStyle = isConnectedToSel ? 'rgba(129, 140, 248, 0.95)' : 'rgba(129, 140, 248, 0.6)';
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
    const col = track?.color_hex || '#38bdf8';
    const isMuted = track?.is_muted ?? false;

    ctx.save();
    if (isMuted) {
      ctx.globalAlpha = 0.35;
    }

    const cardLight = isMuted ? '#3f3f46' : col;

    // S2 — ascending ambient color wash: bg-[#10121A]/95 with a restrained thread tint
    const washGrad = ctx.createLinearGradient(0, y + scnH, 0, y);
    washGrad.addColorStop(0, hexToRgba(cardLight, isMuted ? 0.04 : 0.10));
    washGrad.addColorStop(0.45, hexToRgba(cardLight, isMuted ? 0.015 : 0.025));
    washGrad.addColorStop(1, 'rgba(16, 18, 26, 0.95)');

    // S5 — selection: the active card lifts off the surface and gains a cyan aura
    ctx.save();
    ctx.shadowColor = isSel ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = isSel ? 20 : 30;
    ctx.shadowOffsetY = isSel ? 6 : 10;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fillStyle = washGrad;
    ctx.fill();
    ctx.restore();

    // S1 — crystal bevel: 1px inset highlight along the top edge only
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 1, y + 1, scnW - 2, 1);
    ctx.restore();

    // border-white/[0.08], sharpening to border-sky-400/80 when selected
    ctx.lineWidth = 1;
    ctx.strokeStyle = isSel ? 'rgba(56, 189, 248, 0.8)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, scnW - 1, scnH - 1, CARD_BORDER_RADIUS - 1);
    else ctx.strokeRect(x, y, scnW, scnH);
    ctx.stroke();

    // S4 — only a subtle bottom accent: border-b border-b-sky-500/40, no thick neon edge
    ctx.save();
    ctx.shadowColor = hexToRgba(cardLight, isMuted ? 0 : 0.18);
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = hexToRgba(cardLight, isMuted ? 0.05 : 0.4);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + scnH - 1.5, scnW - 1, 1.5, 1);
    else ctx.rect(x, y + scnH - 1.5, scnW, 1.5);
    ctx.fill();
    ctx.restore();

    const padX = 14;
    const badgeRadius = 10; // w-5 h-5
    const badgeCx = x + padX + badgeRadius;
    const badgeCy = y + padX + badgeRadius;

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

    // Order badge: w-5 h-5 rounded-full bg-zinc-800 border border-white/10
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#27272a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '500 10px ' + FONT_MONO;
    ctx.fillStyle = '#d4d4d8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(sceneIdx + 1).padStart(2, '0'), badgeCx, badgeCy + 0.5);

    // Header metrics (right): text-[10px] font-mono text-zinc-500
    const metaFont = '500 10px ' + FONT_MONO;
    const titleX = badgeCx + badgeRadius + 8;
    ctx.font = metaFont;
    const metaStr = headerLayout.showMeta ? headerLayout.metaStr : '';
    const metaW = metaStr ? ctx.measureText(metaStr).width : 0;
    if (metaStr) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#71717a';
      ctx.fillText(metaStr, x + scnW - padX, y + 28);
    }

    // Scene title: text-xs font-semibold tracking-tight truncate
    if (data.editingSceneId !== s.id) {
      const titleFont = '600 12px ' + FONT_SANS;
      const availTitleW = Math.max(20, x + scnW - padX - (metaW > 0 ? metaW + 10 : 0) - titleX);
      let displayTitle = s.title;
      ctx.font = titleFont;
      if (ctx.measureText(displayTitle).width > availTitleW) {
        while (displayTitle.length > 1 && ctx.measureText(displayTitle + '…').width > availTitleW) {
          displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += '…';
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      // S2 — title reads as glass: pure white down to zinc-300
      const titleGrad = ctx.createLinearGradient(0, y + 15, 0, y + 30);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(1, '#d4d4d8');
      ctx.fillStyle = isSel ? '#ffffff' : titleGrad;
      ctx.fillText(displayTitle, titleX, y + 28);
    }

    // Body: text-[11px] text-zinc-400 leading-relaxed line-clamp-2
    ctx.font = '400 11px ' + FONT_SANS;
    ctx.fillStyle = '#a1a1aa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const bodyMaxW = Math.max(20, scnW - padX * 2);
    const excerptLines = wrapSceneExcerpt(
      (text) => {
        ctx.font = '400 11px ' + FONT_SANS;
        return ctx.measureText(text).width;
      },
      s.text || '',
      bodyMaxW,
      2
    );
    excerptLines.forEach((line, lineIdx) => {
      ctx.fillText(line, x + padX, y + 52 + lineIdx * 14.5);
    });

    // Footer: thread identity + scene time, quiet tabular metadata
    const footerY = y + scnH - 14;
    ctx.font = '500 9.5px ' + FONT_SANS;
    let displayTrk = track?.name || 'Hilo';
    const footerRight = `T ${Math.round(s.t_start)}`;
    ctx.font = '500 9.5px ' + FONT_MONO;
    const footerRightW = ctx.measureText(footerRight).width;
    ctx.font = '500 9.5px ' + FONT_SANS;
    const footerLeftMax = Math.max(20, bodyMaxW - footerRightW - 12);
    if (ctx.measureText(displayTrk).width > footerLeftMax) {
      while (displayTrk.length > 1 && ctx.measureText(displayTrk + '…').width > footerLeftMax) {
        displayTrk = displayTrk.slice(0, -1);
      }
      displayTrk += '…';
    }
    ctx.fillStyle = isMuted ? '#3f3f46' : hexToRgba(col, 0.75);
    ctx.fillText(displayTrk, x + padX, footerY);

    ctx.font = '500 9.5px ' + FONT_MONO;
    ctx.fillStyle = '#52525b';
    ctx.textAlign = 'right';
    ctx.fillText(footerRight, x + scnW - padX, footerY);

    // Discrete 6px connection ports on the lateral edges
    const inPortX = x;
    const inPortY = y + scnH / 2;
    const outPortX = x + scnW;
    const outPortY = y + scnH / 2;

    const isInHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'in';
    const isOutHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'out';

    const drawPort = (px: number, py: number, hovered: boolean) => {
      const r = hovered ? PORT_HOVER_RADIUS : PORT_RADIUS;

      // Anchored to the card edge: a 1px dark cut-out, a faint ring and a small glow
      ctx.beginPath();
      ctx.arc(px, py, r + 1.25, 0, Math.PI * 2);
      ctx.strokeStyle = hovered ? 'rgba(125, 211, 252, 0.7)' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = hovered ? '#7dd3fc' : '#38bdf8';
      // shadow-[0_0_6px_rgba(56,189,248,0.8)]
      ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
      ctx.shadowBlur = hovered ? 6 : 4;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    };

    ctx.save();
    drawPort(inPortX, inPortY, isInHover);
    drawPort(outPortX, outPortY, isOutHover);
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
      // Solid in-progress wire (no dashes, no glow)
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(c1x, startY, c2x, toY, toX, toY);
      ctx.stroke();

      // Cable tip marker
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(toX, toY, 2.5, 0, Math.PI * 2);
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
