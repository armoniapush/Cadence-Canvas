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

  // 1. Deep Obsidian Base Canvas & Story Lanes
  ctx.fillStyle = '#0a0b0e';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, w, h - RULER_HEIGHT);
  ctx.clip();

  // Render lanes with subtle matte graphite backgrounds
  tracks.forEach((_, i) => {
    const ly = RULER_HEIGHT + vp.panY + i * (TRACK_HEIGHT + TRACK_GAP);
    ctx.fillStyle = i % 2 === 0 ? '#111317' : '#141620';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly, w - TRACK_HEADER_WIDTH, TRACK_HEIGHT);

    // Subtle 1px specular lane separator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(TRACK_HEADER_WIDTH, ly + TRACK_HEIGHT - 1, w - TRACK_HEADER_WIDTH, 1);
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
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.018)';
    ctx.beginPath();
    ctx.moveTo(gx, RULER_HEIGHT);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }

  // Batched dot matrix points across the full visible canvas
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();

  ctx.restore();

  const trkMap = new Map(tracks.map((t) => [t.id, t]));
  const scnMap = new Map(scenes.map((s) => [s.id, s]));

  // 3. Silky-Smooth Organic Bézier Reading Ribbons (Connecting Causal Scenes)
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRACK_HEADER_WIDTH, RULER_HEIGHT, w - TRACK_HEADER_WIDTH, h - RULER_HEIGHT);
  ctx.clip();

  const ribbons = anchors.length > 0
    ? anchors.map((a) => ({ src: scnMap.get(a.source_scene_id), dst: scnMap.get(a.target_scene_id), wt: a.weight || 1 }))
    : [...scenes].sort((a, b) => a.t_start - b.t_start).slice(0, -1).map((s, i) => ({ src: s, dst: scenes[i + 1], wt: 1 }));

  for (const { src, dst, wt } of ribbons) {
    if (!src || !dst) continue;
    const sR = getSceneRect(src, tracks, vp, dragState);
    const dR = getSceneRect(dst, tracks, vp, dragState);
    const x1 = sR.x + sR.w;
    const y1 = sR.y + sR.h / 2;
    const x2 = dR.x;
    const y2 = dR.y + dR.h / 2;

    const isConnectedToSel = selectedSceneId && (src.id === selectedSceneId || dst.id === selectedSceneId);
    const rh = Math.max(14, Math.min(26, 16 * wt));
    const dist = Math.max(42, Math.abs(x2 - x1) * 0.45);
    const c1x = x1 + dist;
    const c2x = x2 - dist;

    // Organic ribbon path
    ctx.beginPath();
    ctx.moveTo(x1, y1 - rh / 2);
    ctx.bezierCurveTo(c1x, y1 - rh / 2, c2x, y2 - rh / 2, x2, y2 - rh / 2);
    ctx.lineTo(x2, y2 + rh / 2);
    ctx.bezierCurveTo(c2x, y2 + rh / 2, c1x, y1 + rh / 2, x1, y1 + rh / 2);
    ctx.closePath();

    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    const colSrc = trkMap.get(src.track_id)?.color_hex || '#6366f1';
    const colDst = trkMap.get(dst.track_id)?.color_hex || '#38bdf8';
    const alphaBase = isConnectedToSel ? 0.45 : 0.24;
    const alphaMid = isConnectedToSel ? 0.32 : 0.16;

    g.addColorStop(0, hexToRgba(colSrc, alphaBase));
    g.addColorStop(0.5, hexToRgba(colSrc, alphaMid));
    g.addColorStop(1, hexToRgba(colDst, alphaBase));
    ctx.fillStyle = g;
    ctx.fill();

    // Crisp edges with clear distinction when selected
    ctx.save();
    if (isConnectedToSel) {
      ctx.strokeStyle = hexToRgba(colSrc, 0.9);
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = hexToRgba(colSrc, 0.4);
      ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 4. Ultra-Senior Literary Story Index Cards (Radius 12px with Specular Sheen)
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

    // Tactile Physical Card Lift during active drag
    ctx.save();
    if (isD) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
    }

    // Card background & base fill: deep graphite with subtle elevation
    ctx.fillStyle = isD ? '#1e2436' : isSel ? '#1a1e2d' : '#13151e';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fill();
    ctx.restore();

    // Subtle vertical surface gradient (matte depth)
    const cardGrad = ctx.createLinearGradient(x, y, x, y + scnH);
    cardGrad.addColorStop(0, isD ? 'rgba(255, 255, 255, 0.12)' : isSel ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.035)');
    cardGrad.addColorStop(1, isD ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, scnW, scnH, CARD_BORDER_RADIUS);
    else ctx.rect(x, y, scnW, scnH);
    ctx.fill();

    // 1px Specular top highlight line
    ctx.fillStyle = isD ? 'rgba(255, 255, 255, 0.35)' : isSel ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(x + CARD_BORDER_RADIUS, y + 1, Math.max(0, scnW - CARD_BORDER_RADIUS * 2), 1);

    // Left track color indicator pill
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 5, y + 10, 4, scnH - 20, 2);
    else ctx.fillRect(x + 5, y + 10, 4, scnH - 20);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();

    // Specular border with tactile lift glow when dragged
    ctx.lineWidth = isD ? 1.75 : isSel ? 1.5 : 1;
    ctx.strokeStyle = isD ? '#60a5fa' : isSel ? '#818cf8' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 0.5, y - 0.5, scnW + 1, scnH + 1, CARD_BORDER_RADIUS);
    else ctx.strokeRect(x, y, scnW, scnH);
    ctx.stroke();

    // Card text and details (clipped safely inside card)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 10, y + 2, Math.max(10, scnW - 16), scnH - 4);
    ctx.clip();

    // Title (13px semi-bold with soft ellipsis if long)
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isSel ? '#ffffff' : '#f8fafc';
    const maxTitleW = Math.max(20, scnW - 32);
    let displayTitle = s.title;
    if (ctx.measureText(displayTitle).width > maxTitleW) {
      while (displayTitle.length > 3 && ctx.measureText(displayTitle + '…').width > maxTitleW) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '…';
    }
    ctx.fillText(displayTitle, x + 16, y + 23);

    // Narrative excerpt (first words in warm editorial slate)
    const rawText = (s.text || '').replace(/\s+/g, ' ').trim();
    const excerpt = rawText.length > 0
      ? (rawText.length > 44 ? rawText.slice(0, 44) + '…' : rawText)
      : '(Sin contenido redactado aún)';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(excerpt, x + 16, y + 43);

    // Bottom badge: [ X palabras · ~Y min ] & v{version}
    const words = s.word_count || 0;
    const readingMins = Math.max(1, Math.ceil(words / 240));
    const bY = y + 58;
    const badgeH = 18;
    let badgeW = 0;

    if (scnW >= 105) {
      const metricStr = scnW >= 170 ? `${words} palabras · ~${readingMins} min` : `${words} pal · ~${readingMins} min`;
      ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
      const textW = ctx.measureText(metricStr).width;
      badgeW = textW + 14;

      // Clean pill badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 16, bY, badgeW, badgeH, 6);
      else ctx.rect(x + 16, bY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(metricStr, x + 23, bY + 12);
    }

    // Version tag on bottom right (drawn only when not colliding with pill badge)
    if (scnW >= badgeW + 55) {
      ctx.font = '500 10px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      const verText = `v${s.version}`;
      ctx.textAlign = 'right';
      ctx.fillText(verText, x + scnW - 12, bY + 12);
      ctx.textAlign = 'start';
    }

    ctx.restore();

    // In-Port (Left Causal Anchor) & Out-Port (Right Causal Output)
    const inPortX = x;
    const inPortY = y + scnH / 2;
    const outPortX = x + scnW;
    const outPortY = y + scnH / 2;

    const isInHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'in';
    const isOutHover = data.hoveredPort?.sceneId === s.id && data.hoveredPort.port === 'out';
    const isConnecting = Boolean(data.connectingWire);

    // In-Port circle (Input / Causa)
    ctx.save();
    ctx.beginPath();
    const inR = isInHover ? PORT_HOVER_RADIUS : isSel || isConnecting ? 5 : PORT_RADIUS;
    ctx.arc(inPortX, inPortY, inR, 0, Math.PI * 2);
    ctx.fillStyle = isInHover ? col : '#13151e';
    ctx.strokeStyle = isInHover ? '#ffffff' : isSel ? col : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Out-Port circle (Output / Efecto)
    ctx.beginPath();
    const outR = isOutHover ? PORT_HOVER_RADIUS : isSel || isConnecting ? 5 : PORT_RADIUS;
    ctx.arc(outPortX, outPortY, outR, 0, Math.PI * 2);
    ctx.fillStyle = isOutHover ? '#38bdf8' : isSel ? col : '#13151e';
    ctx.strokeStyle = isOutHover ? '#ffffff' : isSel ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
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

    // Matte graphite background (#0e1017)
    ctx.fillStyle = '#0e1017';
    ctx.fillRect(0, ly, TRACK_HEADER_WIDTH, TRACK_HEIGHT);

    // Subtle bottom border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, ly + TRACK_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);

    // Right border specular
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(TRACK_HEADER_WIDTH - 1, ly, 1, TRACK_HEIGHT);

    // Color pill marker
    ctx.fillStyle = trk.color_hex;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(10, ly + 20, 4, TRACK_HEIGHT - 40, 2);
    else ctx.fillRect(10, ly + 20, 4, TRACK_HEIGHT - 40);
    ctx.fill();

    // Track Name
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = trk.is_muted ? '#64748b' : '#f1f5f9';
    const truncatedName = trk.name.length > 17 ? trk.name.slice(0, 16) + '…' : trk.name;
    ctx.fillText(truncatedName, 22, ly + 36);

    // Subtitle: Hilo Narrativo
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Hilo Narrativo', 22, ly + 56);

    // Visibility toggle button [ 👁 ] / [ 👁‍🗨 ]
    const mBtn = getTrackMuteButtonRect(idx, vp);
    const isM = trk.is_muted;
    ctx.fillStyle = isM ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = isM ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(mBtn.x, mBtn.y, mBtn.w, mBtn.h, 6);
    else ctx.rect(mBtn.x, mBtn.y, mBtn.w, mBtn.h);
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
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, TRACK_HEADER_WIDTH, RULER_HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(TRACK_HEADER_WIDTH - 1, 0, 1, RULER_HEIGHT);
  ctx.fillRect(0, RULER_HEIGHT - 1, TRACK_HEADER_WIDTH, 1);

  // Matte indigo dot + label
  ctx.fillStyle = '#4361ee';
  ctx.beginPath();
  ctx.arc(20, RULER_HEIGHT / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('SECUENCIA NARRATIVA', 30, RULER_HEIGHT / 2 + 4);
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
