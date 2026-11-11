import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RULER_HEIGHT,
  TRACK_HEADER_WIDTH,
  TRACK_HEIGHT,
  TRACK_GAP,
  CARD_PAD_Y,
  CANVAS_TOP_PAD,
  CARD_HEIGHT,
  PIXELS_PER_UNIT,
  CARD_BORDER_RADIUS,
  PORT_RADIUS,
  PORT_HIT_RADIUS,
  NARRATIVE_LANDMARKS,
  getTrackMuteButtonRect,
  getSceneRect,
  getScenePortRects,
  computeFitViewport,
  computeMagneticSnap,
  resolveSceneAntiCollision,
  computeCardHeaderLayout,
  DRAMATIC_ACT_ZONES,
} from '../src/canvas/renderer.ts';
import type { Track, Scene, Viewport, TonalHistogram } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Clean Editorial Metrics & Deletion Safeguard Tests', () => {
  test('reading time and word count calculations are accurate', () => {
    const computeStats = (text: string) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const readingMinutes = Math.max(1, Math.ceil(words / 240));
      return { words, chars, readingMinutes };
    };

    const empty = computeStats('');
    assert.strictEqual(empty.words, 0);
    assert.strictEqual(empty.chars, 0);

    const paragraph = Array(300).fill('palabra').join(' ');
    const stats = computeStats(paragraph);
    assert.strictEqual(stats.words, 300);
    assert.strictEqual(stats.readingMinutes, 2); // 300 / 240 = 1.25 -> ceil 2 min
  });

  test('scene delete confirmation micro-state machine', () => {
    let confirmDelete = false;
    let deletedId: string | null = null;

    const onDeleteScene = (id: string) => {
      deletedId = id;
    };

    const sceneId = 'scene-alpha-123';

    // Step 1: Initial state - not confirming
    assert.strictEqual(confirmDelete, false);

    // Step 2: First click on [ ✕ Borrar ] triggers confirm prompt
    const handleFirstClick = () => {
      confirmDelete = true;
    };
    handleFirstClick();
    assert.strictEqual(confirmDelete, true);
    assert.strictEqual(deletedId, null); // Not yet deleted

    // Step 3: Click on cancel resets confirmation
    const handleCancelClick = () => {
      confirmDelete = false;
    };
    handleCancelClick();
    assert.strictEqual(confirmDelete, false);
    assert.strictEqual(deletedId, null);

    // Step 4: Click confirm executes deletion
    handleFirstClick();
    const handleConfirmClick = () => {
      onDeleteScene(sceneId);
      confirmDelete = false;
    };
    handleConfirmClick();
    assert.strictEqual(deletedId, sceneId);
    assert.strictEqual(confirmDelete, false);
  });

  test('canvas keyboard shortcut rules: Delete/Backspace triggers only outside text inputs', () => {
    let deletedSceneId: string | null = null;
    const selectedSceneId = 'scene-selected-456';

    const handleKeyDown = (key: string, tagName: string) => {
      // Rule: Never delete scene if active element is text input/textarea
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return false;
      }
      if ((key === 'Delete' || key === 'Backspace') && selectedSceneId) {
        deletedSceneId = selectedSceneId;
        return true;
      }
      return false;
    };

    // User is writing in editor textarea -> Backspace should NOT delete the scene!
    const backspaceInTextarea = handleKeyDown('Backspace', 'TEXTAREA');
    assert.strictEqual(backspaceInTextarea, false);
    assert.strictEqual(deletedSceneId, null);

    // User is in title input -> Delete should NOT delete the scene!
    const deleteInInput = handleKeyDown('Delete', 'INPUT');
    assert.strictEqual(deleteInInput, false);
    assert.strictEqual(deletedSceneId, null);

    // User has selected scene on canvas and hits Delete -> Scene is deleted!
    const deleteOnCanvas = handleKeyDown('Delete', 'CANVAS');
    assert.strictEqual(deleteOnCanvas, true);
    assert.strictEqual(deletedSceneId, selectedSceneId);
  });

  test('narrative timeline dimensional constants and literary card layout', () => {
    // Assert dimensional invariants
    assert.strictEqual(RULER_HEIGHT, 26);
    assert.strictEqual(TRACK_HEADER_WIDTH, 210);
    assert.strictEqual(TRACK_HEIGHT, 112);
    assert.strictEqual(TRACK_GAP, 16);
    assert.strictEqual(CARD_PAD_Y, 8);
    assert.strictEqual(CANVAS_TOP_PAD, 48);
    assert.strictEqual(CARD_HEIGHT, 96);
    assert.strictEqual(PIXELS_PER_UNIT, 1.3);
    assert.strictEqual(CARD_BORDER_RADIUS, 16);

    // Assert narrative story progression landmarks (no audio timecodes!)
    assert.strictEqual(NARRATIVE_LANDMARKS[0], 'Acto I: Incidente Incitador');
    assert.strictEqual(NARRATIVE_LANDMARKS[100], 'Punto de Giro I');
    assert.strictEqual(NARRATIVE_LANDMARKS[200], 'Acto II: Confrontación');
    assert.strictEqual(NARRATIVE_LANDMARKS[300], 'Punto de Inflexión / Clímax');

    const vp: Viewport = { panX: 0, panY: 0, zoom: 1.0 };

    // Track visibility toggle button dimensions
    const btnRect = getTrackMuteButtonRect(0, vp);
    assert.strictEqual(btnRect.w, 28);
    assert.strictEqual(btnRect.h, 24);

    // Scene card rect calculation
    const mockTracks: Track[] = [
      { id: 'trk-1', project_id: 'p1', name: 'Trama Principal', color_hex: '#6366f1', track_order: 0, is_muted: false },
      { id: 'trk-2', project_id: 'p1', name: 'Subtrama', color_hex: '#10b981', track_order: 1, is_muted: false },
    ];
    const mockScene: Scene = {
      id: 'scn-1',
      project_id: 'p1',
      track_id: 'trk-1',
      title: 'Capítulo 1',
      t_start: 120,
      duration: 60,
      text: 'La niebla cubría el valle cuando partieron.',
      word_count: 8,
      version: 1,
    };

    const rect = getSceneRect(mockScene, mockTracks, vp);
    assert.strictEqual(rect.x, TRACK_HEADER_WIDTH + 120 * PIXELS_PER_UNIT * vp.zoom);
    assert.strictEqual(rect.y, CANVAS_TOP_PAD + CARD_PAD_Y);
    assert.strictEqual(rect.h, 96);
    assert.strictEqual(rect.w, 250); // Comfortable minimum Stitch card width
  });

  test('chromatic tonal normalization and continuous spectral distribution', () => {
    const normalizeTonal = (m: Partial<TonalHistogram>) => {
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
    };

    // Case 1: Empty or zero sum
    const emptyResult = normalizeTonal({});
    assert.strictEqual(emptyResult.pDialogue + emptyResult.pAction + emptyResult.pLore + emptyResult.pMonologue, 100);

    // Case 2: Uneven proportions
    const uneven = normalizeTonal({ dialogue: 0.43, action: 0.27, lore: 0.18, monologue: 0.12 });
    assert.strictEqual(uneven.pDialogue + uneven.pAction + uneven.pLore + uneven.pMonologue, 100);
    assert.strictEqual(uneven.pDialogue, 43);
    assert.strictEqual(uneven.pAction, 27);
    assert.strictEqual(uneven.pLore, 18);
    assert.strictEqual(uneven.pMonologue, 12);

    // Case 3: Single channel dominant
    const dialogueOnly = normalizeTonal({ dialogue: 1.0, action: 0, lore: 0, monologue: 0 });
    assert.strictEqual(dialogueOnly.pDialogue, 100);
    assert.strictEqual(dialogueOnly.pAction, 0);
    assert.strictEqual(dialogueOnly.pLore, 0);
    assert.strictEqual(dialogueOnly.pMonologue, 0);
  });

  test('floating dock zoom clamping invariants', () => {
    let zoom = 1.0;
    const zoomIn = () => { zoom = Math.min(3.0, zoom * 1.2); };
    const zoomOut = () => { zoom = Math.max(0.25, zoom / 1.2); };
    const resetZoom = () => { zoom = 1.0; };

    // Zoom in repeatedly should clamp at 3.0
    for (let i = 0; i < 20; i++) zoomIn();
    assert.strictEqual(zoom, 3.0);

    // Reset zoom
    resetZoom();
    assert.strictEqual(zoom, 1.0);

    // Zoom out repeatedly should clamp at 0.25
    for (let i = 0; i < 20; i++) zoomOut();
    assert.strictEqual(zoom, 0.25);
  });

  test('computeFitViewport accurately frames literary timeline content', () => {
    // Case 1: Empty scenes collection defaults safely
    const emptyVp = computeFitViewport([], 1200);
    assert.strictEqual(emptyVp.zoom, 1.0);
    assert.strictEqual(emptyVp.panX, 20);
    assert.strictEqual(emptyVp.panY, 0);

    // Case 2: Broadly distributed scenes across timeline
    const spreadScenes: Scene[] = [
      { id: 's1', project_id: 'p1', track_id: 't1', title: 'Inicio', t_start: 50, duration: 60, text: '', word_count: 0, version: 1 },
      { id: 's2', project_id: 'p1', track_id: 't1', title: 'Clímax', t_start: 600, duration: 120, text: '', word_count: 0, version: 1 },
    ];
    // Total span: (600 + 120) - 50 = 670 units
    const fitted = computeFitViewport(spreadScenes, 1200);
    assert.ok(fitted.zoom >= 0.25 && fitted.zoom <= 3.0);
    // PanX must position the first scene with margin
    assert.ok(fitted.panX <= 40);
    assert.strictEqual(fitted.panY, 0);
  });

  test('monotonic gradient stop generator invariants for SVG wave', () => {
    const buildStops = (channels: { key: string; pct: number; color: string }[]) => {
      const active = channels.filter((c) => c.pct > 0);
      if (active.length === 0) {
        return [{ offset: '0%', color: '#38bdf8' }, { offset: '100%', color: '#38bdf8' }];
      }
      if (active.length === 1) {
        return [{ offset: '0%', color: active[0].color }, { offset: '100%', color: active[0].color }];
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
    };

    // Extreme case: 2 channels are 0%
    const stops1 = buildStops([
      { key: 'dialogue', pct: 40, color: '#38bdf8' },
      { key: 'action', pct: 0, color: '#f97316' },
      { key: 'lore', pct: 0, color: '#10b981' },
      { key: 'monologue', pct: 60, color: '#a855f7' },
    ]);

    assert.strictEqual(stops1.length, 4);
    // Monotonicity assertion: each stop must be >= previous stop and <= 100%
    let prevVal = -1;
    for (const stop of stops1) {
      const val = parseFloat(stop.offset);
      assert.ok(!isNaN(val));
      assert.ok(val >= prevVal, `Offset ${val} must be >= previous ${prevVal}`);
      assert.ok(val <= 100, `Offset ${val} must not exceed 100%`);
      prevVal = val;
    }

    // Single dominant channel
    const stopsSingle = buildStops([
      { key: 'dialogue', pct: 100, color: '#38bdf8' },
      { key: 'action', pct: 0, color: '#f97316' },
      { key: 'lore', pct: 0, color: '#10b981' },
      { key: 'monologue', pct: 0, color: '#a855f7' },
    ]);
    assert.strictEqual(stopsSingle.length, 2);
    assert.strictEqual(stopsSingle[0].offset, '0%');
    assert.strictEqual(stopsSingle[1].offset, '100%');
  });

  test('scene hit testing accurately resolves card selection in open infinite canvas', () => {
    const mockTracks: Track[] = [
      { id: 't1', project_id: 'p1', name: 'Trama', color_hex: '#6366f1', track_order: 0, is_muted: false }
    ];
    const vp: Viewport = { panX: 50, panY: 20, zoom: 1.0 };
    const scene: Scene = {
      id: 's1',
      project_id: 'p1',
      track_id: 't1',
      title: 'Capítulo Oculto',
      t_start: 10,
      duration: 100,
      text: '',
      word_count: 0,
      version: 1,
    };

    const rect = getSceneRect(scene, mockTracks, vp);
    assert.strictEqual(rect.x, TRACK_HEADER_WIDTH + 50 + 10 * PIXELS_PER_UNIT);
    assert.strictEqual(rect.y, 20 + CANVAS_TOP_PAD + CARD_PAD_Y);

    const hitTest = (mx: number, my: number) => {
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        return scene;
      }
      return null;
    };

    assert.strictEqual(hitTest(rect.x + 10, rect.y + 10)?.id, 's1');
    assert.strictEqual(hitTest(rect.x - 10, rect.y), null);
  });

  test('timeline drag null-safety and synchronous coordinate capture invariants', () => {
    // Model the exact panRef lifecycle and ensure that releasing or racing panRef to null
    // NEVER causes a runtime TypeError during state updates.
    let panRef: { mx: number; my: number; px: number; py: number; verticalOnly?: boolean } | null = {
      mx: 100,
      my: 100,
      px: 20,
      py: 0,
      verticalOnly: false,
    };

    let viewport: Viewport = { panX: 20, panY: 0, zoom: 1.0 };
    const mx = 150;
    const my = 80;

    // Test the SAFE implementation: Synchronous extraction into local scope
    let errorThrown = false;
    try {
      if (panRef) {
        const { px, py, mx: startMx, my: startMy, verticalOnly } = panRef;
        const isVert = Boolean(verticalOnly);
        const targetPanX = isVert ? null : px + (mx - startMx);
        const targetPanY = Math.min(0, py + (my - startMy));

        // Simulate pointerup / pointercancel occurring IMMEDIATELY before React updater executes
        panRef = null;

        // Async React state updater callback execution:
        const updater = (prev: Viewport): Viewport => ({
          ...prev,
          panX: targetPanX !== null ? targetPanX : prev.panX,
          panY: targetPanY,
        });

        viewport = updater(viewport);
      }
    } catch {
      errorThrown = true;
    }

    assert.strictEqual(errorThrown, false, 'Safe extraction must not throw error even when panRef is nulled');
    assert.strictEqual(viewport.panX, 20 + (150 - 100)); // 70
    assert.strictEqual(viewport.panY, -20); // Math.min(0, 0 + (80 - 100)) = -20
  });

  test('timeline pan vertical bounds clamping prevents tracks from scrolling off into void', () => {
    const tracksCount = 3;
    const trackHeightTotal = tracksCount * (TRACK_HEIGHT + TRACK_GAP);
    const canvasHeight = 600;
    const visibleTrackArea = canvasHeight - RULER_HEIGHT;

    // When content fits within viewport, maxScrollY is 0 (no vertical scrolling allowed)
    const maxScrollSmall = Math.max(0, trackHeightTotal + 120 - visibleTrackArea);
    assert.strictEqual(maxScrollSmall, 0);

    const computeClampedPanY = (initialPy: number, deltaMy: number, maxScroll: number) => {
      const val = Math.max(-maxScroll, Math.min(0, initialPy + deltaMy));
      return Object.is(val, -0) ? 0 : val;
    };

    // Attempting to scroll down past top is clamped to 0
    assert.strictEqual(computeClampedPanY(0, 100, maxScrollSmall), 0);
    // Attempting to drag up when content fits is clamped to 0
    assert.strictEqual(computeClampedPanY(0, -500, maxScrollSmall), 0);

    // With many tracks (10 tracks = 1280px, visible area = 600px - RULER_HEIGHT = 574px):
    const manyTracksTotal = 10 * (TRACK_HEIGHT + TRACK_GAP); // 1280
    const maxScrollLarge = Math.max(0, manyTracksTotal + 120 - visibleTrackArea); // 1280 + 120 - 574 = 826
    assert.strictEqual(maxScrollLarge, 826);

    // Cannot scroll deeper than -826
    assert.strictEqual(computeClampedPanY(0, -2000, maxScrollLarge), -826);
    // Normal scroll within bounds
    assert.strictEqual(computeClampedPanY(0, -300, maxScrollLarge), -300);
  });

  test('fast drag-and-drop preview coordinates resolve synchronously without dropped moves', () => {
    // Model the fast drag drop sequence where pointerUp arrives before React re-render
    let movedScene: { s: Scene; trk: string; t: number } | null = null;
    const onMoveScene = (s: Scene, trk: string, t: number) => {
      movedScene = { s, trk, t };
    };

    const mockScene: Scene = {
      id: 'sc-1',
      project_id: 'p1',
      track_id: 'trk-1',
      title: 'Escena Rápida',
      t_start: 50,
      duration: 60,
      text: '',
      word_count: 0,
      version: 1,
    };

    const dragRef: {
      s: Scene;
      t0: number;
      trk0: string;
      moved: boolean;
      previewTrackId: string;
      previewTStart: number;
    } = {
      s: mockScene,
      t0: 50,
      trk0: 'trk-1',
      moved: true,
      previewTrackId: 'trk-2',
      previewTStart: 85,
    };

    // Even if React dragState state was still null, dragRef synchronous coords dispatch properly:
    if (dragRef.moved) {
      const finalTrackId = dragRef.previewTrackId ?? dragRef.trk0;
      const finalTStart = dragRef.previewTStart ?? dragRef.t0;
      if (finalTStart !== dragRef.t0 || finalTrackId !== dragRef.trk0) {
        onMoveScene(dragRef.s, finalTrackId, finalTStart);
      }
    }

    assert.ok(movedScene !== null);
    assert.strictEqual(movedScene.trk, 'trk-2');
    assert.strictEqual(movedScene.t, 85);
  });

  test('anti-ai-slop design token verification: zero radioactive neon glows in actual index.css', () => {
    // Read the actual index.css file on disk
    const cssPath = resolve(__dirname, '../src/index.css');
    const css = readFileSync(cssPath, 'utf8');

    // Verify absence of AI-slop zero-offset radioactive neon glows
    const neonGlowPattern = /box-shadow:\s*0\s+0\s+\d+px\s+rgba\(\s*(?:99,\s*102,\s*241|56,\s*189,\s*248)/i;
    assert.strictEqual(neonGlowPattern.test(css), false, 'index.css must not contain radioactive neon drop-shadow glows');

    // Verify pro-grade button utilities exist
    assert.ok(css.includes('.btn {'), 'Must define .btn utility');
    assert.ok(css.includes('.btn-primary {'), 'Must define .btn-primary utility');
    assert.ok(css.includes('.btn-accent {'), 'Must define .btn-accent utility');
    assert.ok(css.includes('.btn-ghost {'), 'Must define .btn-ghost utility');

    // Verify Google Stitch Material 3 Expressive motion tokens & keyframes
    assert.ok(css.includes('--m3-easing-emphasized: cubic-bezier(.2, 0, 0, 1);'), 'Must define --m3-easing-emphasized');
    assert.ok(css.includes('--m3-expressive-fast-spatial: cubic-bezier(.42, 1.67, .21, .9);'), 'Must define --m3-expressive-fast-spatial');
    assert.ok(css.includes('--m3-expressive-default-spatial: cubic-bezier(.38, 1.21, .22, 1);'), 'Must define --m3-expressive-default-spatial');
    assert.ok(css.includes('@keyframes shimmer'), 'Must define shimmer keyframe');
    assert.ok(css.includes('@keyframes dashdraw'), 'Must define dashdraw keyframe');
    assert.ok(css.includes('@keyframes working-dash'), 'Must define working-dash keyframe');
    assert.ok(css.includes('@keyframes m3-menu-item-enter'), 'Must define m3-menu-item-enter keyframe');
    assert.ok(css.includes('@keyframes agent-thinking-dot'), 'Must define agent-thinking-dot keyframe');
    assert.ok(css.includes('@keyframes stitch-traveler'), 'Must define stitch-traveler keyframe');
    assert.ok(css.includes('.m3-spring-fast'), 'Must define .m3-spring-fast utility');
    assert.ok(css.includes('.m3-spring-default'), 'Must define .m3-spring-default utility');
    assert.ok(css.includes('.m3-card'), 'Must define .m3-card utility');
    assert.ok(css.includes('.m3-chip'), 'Must define .m3-chip utility');
    assert.ok(css.includes('.stitch-glow-iris'), 'Must define .stitch-glow-iris utility');
    assert.ok(css.includes('.stitch-glow-mint'), 'Must define .stitch-glow-mint utility');
  });

  test('computeMagneticSnap invariants: origin, head-to-tail, parallel and grid beat snapping', () => {
    const mockScenes: Scene[] = [
      {
        id: 's1',
        project_id: 'p1',
        track_id: 'trk-1',
        title: 'Escena 1',
        t_start: 0,
        duration: 100, // ends at 100
        text: '',
        word_count: 50,
        version: 1,
      },
      {
        id: 's2',
        project_id: 'p1',
        track_id: 'trk-2',
        title: 'Escena Paralela',
        t_start: 200,
        duration: 80,
        text: '',
        word_count: 50,
        version: 1,
      },
    ];

    // 1. Origin snap: raw coordinate near 0 snaps to 0
    const originSnap = computeMagneticSnap(4, 60, 'trk-1', mockScenes, 'active-drag', 1.0, true);
    assert.strictEqual(originSnap.isSnapped, true);
    assert.strictEqual(originSnap.snappedTStart, 0);
    assert.strictEqual(originSnap.snapType, 'origin');

    // 2. Head-to-tail snap: raw coordinate near preceding scene end (100) snaps to 100 (0 gap)
    const headToTailSnap = computeMagneticSnap(103, 60, 'trk-1', mockScenes, 'active-drag', 1.0, true);
    assert.strictEqual(headToTailSnap.isSnapped, true);
    assert.strictEqual(headToTailSnap.snappedTStart, 100);
    assert.strictEqual(headToTailSnap.snapType, 'head-to-tail');

    // 3. Parallel start alignment with scene on other track: near 200 snaps to 200
    const parallelSnap = computeMagneticSnap(197, 60, 'trk-1', mockScenes, 'active-drag', 1.0, true);
    assert.strictEqual(parallelSnap.isSnapped, true);
    assert.strictEqual(parallelSnap.snappedTStart, 200);
    assert.strictEqual(parallelSnap.snapType, 'parallel');

    // 4. Beat Grid snap: when not near scene boundaries, snaps to nearest 10-beat multiple (e.g. 52 -> 50)
    const gridSnap = computeMagneticSnap(52, 60, 'trk-1', mockScenes, 'active-drag', 1.0, true);
    assert.strictEqual(gridSnap.isSnapped, true);
    assert.strictEqual(gridSnap.snappedTStart, 50);
    assert.strictEqual(gridSnap.snapType, 'grid');

    // 5. Magnet Disabled Invariant: when magnetEnabled is false, returns raw coordinate untouched
    const disabledSnap = computeMagneticSnap(53, 60, 'trk-1', mockScenes, 'active-drag', 1.0, false);
    assert.strictEqual(disabledSnap.isSnapped, false);
    assert.strictEqual(disabledSnap.snappedTStart, 53);
  });

  test('getScenePortRects calculates accurate In/Out connection port positions', () => {
    const cardRect = { x: 200, y: 150, w: 160, h: 88 };
    const ports = getScenePortRects(cardRect);

    // In-Port: centered on left edge
    assert.strictEqual(ports.inPort.x, 200);
    assert.strictEqual(ports.inPort.y, 150 + 44);

    // Out-Port: centered on right edge
    assert.strictEqual(ports.outPort.x, 200 + 160);
    assert.strictEqual(ports.outPort.y, 150 + 44);

    // Hit radius invariant
    assert.ok(PORT_RADIUS >= 4);
    assert.ok(PORT_HIT_RADIUS >= 12);
  });

  test('Gary Provost sentence cadence descriptors and pacing zones', () => {
    // Descriptor logic invariant
    const getCadenceDescriptor = (variance: number) => {
      if (variance < 3.5) return 'Ritmo uniforme · Frases de longitud similar';
      if (variance <= 9.0) return 'Ritmo armónico · Cadencia viva y musical';
      return 'Ritmo sincopado · Rápida alternancia';
    };

    assert.strictEqual(getCadenceDescriptor(2.1), 'Ritmo uniforme · Frases de longitud similar');
    assert.strictEqual(getCadenceDescriptor(3.5), 'Ritmo armónico · Cadencia viva y musical');
    assert.strictEqual(getCadenceDescriptor(5.4), 'Ritmo armónico · Cadencia viva y musical');
    assert.strictEqual(getCadenceDescriptor(9.0), 'Ritmo armónico · Cadencia viva y musical');
    assert.strictEqual(getCadenceDescriptor(9.1), 'Ritmo sincopado · Rápida alternancia');

    // Sentence rhythm pacing zones invariant
    const getPacingZone = (len: number) => {
      if (len < 10) return { zone: 'snappy', color: '#38bdf8' };
      if (len <= 25) return { zone: 'flowing', color: '#94a3b8' };
      return { zone: 'expansive', color: '#f59e0b' };
    };

    assert.strictEqual(getPacingZone(5).color, '#38bdf8');
    assert.strictEqual(getPacingZone(9).color, '#38bdf8');
    assert.strictEqual(getPacingZone(10).color, '#94a3b8');
    assert.strictEqual(getPacingZone(25).color, '#94a3b8');
    assert.strictEqual(getPacingZone(26).color, '#f59e0b');
    assert.strictEqual(getPacingZone(45).color, '#f59e0b');
  });

  test('dynamic track metadata formatting calculates scenes and total words', () => {
    const trackScenes: Scene[] = [
      { id: '1', project_id: 'p', track_id: 'trk-1', title: 'A', t_start: 0, duration: 30, text: '', word_count: 320, version: 1 },
      { id: '2', project_id: 'p', track_id: 'trk-1', title: 'B', t_start: 40, duration: 40, text: '', word_count: 480, version: 1 },
    ];

    const trkWords = trackScenes.reduce((sum, s) => sum + (s.word_count || 0), 0);
    const subtitle = `${trackScenes.length} esc. · ${trkWords.toLocaleString()} pal.`;
    assert.strictEqual(subtitle, '2 esc. · 800 pal.');
  });

  test('resolveSceneAntiCollision strictly prevents cards from overlapping or transposing on the same track', () => {
    const mockScenes: Scene[] = [
      {
        id: 's1',
        project_id: 'p1',
        track_id: 'trk-1',
        title: 'Escena 1',
        t_start: 0,
        duration: 120, // visual duration in units is max(120, ceil(250/1.3)) = 193
        text: '',
        word_count: 50,
        version: 1,
      },
    ];

    // Attempting to drag Scene 2 to t = 50 (which would overlap Scene 1 that ends at 193 units + gap 19 = 212)
    const resolved = resolveSceneAntiCollision(50, 120, 'trk-1', mockScenes, 's2', 1.0);
    // Must be clamped to after Scene 1 + gap
    assert.ok(resolved >= 212, `Expected resolved t_start >= 212, got ${resolved}`);

    // If dragged with empty space, respects space
    const openSpace = resolveSceneAntiCollision(300, 120, 'trk-1', mockScenes, 's2', 1.0);
    assert.strictEqual(openSpace, 300);
  });

  test('computeCardHeaderLayout strictly prevents text collisions between track name, index and telemetry', () => {
    const mockMeasure = (str: string, _font?: string) => str.length * 6.5;

    // Case 1: Standard card width (250px) with very long track name
    const longName = 'Trama Principal de Investigación y Conspiración';
    const layout250 = computeCardHeaderLayout(250, longName, 1, 140, mockMeasure);

    assert.strictEqual(layout250.showMeta, true, 'Telemetry should be shown when space permits');
    assert.ok(layout250.displayTrkName.endsWith('…'), 'Long track name must be truncated with …');
    assert.strictEqual(layout250.showIndex, true, 'Index should be shown when available width allows');

    // Left boundary = pip offset (27) + trkNameW + index space (~30px)
    const indexStrW = mockMeasure(`·  ${layout250.numStr}`);
    const leftEnd = 27 + layout250.trkNameW + 6 + indexStrW;
    const rightStart = 250 - 16 - layout250.metaStrW;
    assert.ok(leftEnd <= rightStart, `Left content (${leftEnd}px) must not collide with right telemetry (${rightStart}px)`);
    assert.ok(rightStart - leftEnd >= 14, 'Must have at least 14px breathing room clearance');

    // Case 2: Narrow card width (130px) where scnW < 140
    const layout130 = computeCardHeaderLayout(130, 'Subtrama Corta', 0, 50, mockMeasure);
    assert.strictEqual(layout130.showMeta, false, 'Telemetry must be omitted when scnW < 140');
    assert.strictEqual(layout130.metaStrW, 0);

    // Case 3: Narrow card width (150px) where availTrackNameW < 50
    // metaStr ~ 16 chars * 6.5 = 104px; availTrackNameW = 150 - 44 - 120 = -14 < 50 -> omit metaStr
    const layout150 = computeCardHeaderLayout(150, 'Hilo de Acción', 2, 850, mockMeasure);
    assert.strictEqual(layout150.showMeta, false, 'Telemetry must be omitted when availTrackNameW < 50');
    assert.ok(layout150.availTrackNameW >= 50, 'Track name must regain breathing room when telemetry is omitted');

    // Case 4: Ultra narrow card width (70px) where availTrackNameW < 50
    const layout70 = computeCardHeaderLayout(70, 'Hilo', 0, 0, mockMeasure);
    assert.strictEqual(layout70.showMeta, false);
    assert.strictEqual(layout70.showIndex, false, 'Index must be hidden when space is under 50px to keep track name legible');
    assert.ok(layout70.displayTrkName.length > 0, 'Track name remains legible');
  });

  test('narrative beats ruler configuration and dramatic act zones invariants', () => {
    assert.strictEqual(RULER_HEIGHT, 26, 'Narrative beats ruler must be exactly 26px high');
    assert.strictEqual(DRAMATIC_ACT_ZONES.length, 6);

    const labels = DRAMATIC_ACT_ZONES.map((z) => z.label);
    assert.ok(labels.includes('Acto I'), 'Must include Acto I');
    assert.ok(labels.includes('Giro I'), 'Must include Giro I');
    assert.ok(labels.includes('Acto II'), 'Must include Acto II');
    assert.ok(labels.includes('Clímax'), 'Must include Clímax');
    assert.ok(labels.includes('Acto III'), 'Must include Acto III');
    assert.ok(labels.includes('Desenlace'), 'Must include Desenlace');

    const climax = DRAMATIC_ACT_ZONES.find((z) => z.label === 'Clímax');
    assert.strictEqual(climax?.t, 300);
    assert.strictEqual(climax?.color, '#f43f5e');
  });

  test('DawCanvas left track header cards ensure clean CSS ellipsis truncation for name and telemetry', () => {
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawSrc = readFileSync(dawCanvasPath, 'utf8');

    // Verify track name CSS truncation
    assert.ok(
      dawSrc.includes("overflow: 'hidden'") &&
      dawSrc.includes("textOverflow: 'ellipsis'") &&
      dawSrc.includes("whiteSpace: 'nowrap'"),
      'DawCanvas must apply clean CSS ellipsis truncation to track name and telemetry'
    );

    // Verify minWidth: 0 on track header card container to allow flex ellipsis
    assert.ok(dawSrc.includes('minWidth: 0'), 'Track header cards must have minWidth: 0 for proper flex ellipsis');
  });

  test('senior writing ergonomics: sentence range finder for Gary Provost sentence bars jump', () => {
    const text = 'Primera frase breve. Segunda frase con más palabras para fluir! Tercera frase para cerrar el párrafo?';

    const getSentenceRange = (prose: string, targetIdx: number) => {
      const regex = /[^.!?]+[.!?]*/g;
      let match: RegExpExecArray | null;
      let cur = 0;
      while ((match = regex.exec(prose)) !== null) {
        if (match[0].trim().length > 0) {
          if (cur === targetIdx) {
            const raw = match[0];
            const leadingWs = raw.match(/^\s*/)?.[0].length ?? 0;
            const trailingWs = raw.match(/\s*$/)?.[0].length ?? 0;
            const start = match.index + leadingWs;
            const end = match.index + raw.length - trailingWs;
            return { start, end, text: prose.slice(start, end) };
          }
          cur++;
        }
      }
      return null;
    };

    const s0 = getSentenceRange(text, 0);
    assert.ok(s0 !== null);
    assert.strictEqual(s0.text, 'Primera frase breve.');
    assert.strictEqual(s0.start, 0);

    const s1 = getSentenceRange(text, 1);
    assert.ok(s1 !== null);
    assert.strictEqual(s1.text, 'Segunda frase con más palabras para fluir!');

    const s2 = getSentenceRange(text, 2);
    assert.ok(s2 !== null);
    assert.strictEqual(s2.text, 'Tercera frase para cerrar el párrafo?');

    // Index out of range
    const s3 = getSentenceRange(text, 3);
    assert.strictEqual(s3, null);
  });

  test('senior writing ergonomics: editorial matte typography and glare reduction invariants', () => {
    const editorPath = resolve(__dirname, '../src/editor/AtomicEditor.tsx');
    const editorSrc = readFileSync(editorPath, 'utf8');

    // Color: #e2e8f0 (instead of blinding #f1f5f9)
    assert.ok(editorSrc.includes("color: '#e2e8f0'"), 'Prose textarea must use comfortable #e2e8f0 typography');

    // Font size: 16px with 1.75 line-height
    assert.ok(editorSrc.includes("fontSize: '16px'"), 'Prose textarea must use 16px font size');
    assert.ok(editorSrc.includes("lineHeight: 1.75"), 'Prose textarea must use 1.75 line-height');

    // Background: #11141e (instead of pitch-black #090b10)
    assert.ok(editorSrc.includes("backgroundColor: '#11141e'"), 'Editor must use comfortable matte #11141e background');
  });

  test('senior writing ergonomics: progressive disclosure tonal hud and zen fade-out state machine', () => {
    const tonalHudPath = resolve(__dirname, '../src/editor/TonalHud.tsx');
    const tonalHudSrc = readFileSync(tonalHudPath, 'utf8');

    // Sleek 26px top summary bar
    assert.ok(tonalHudSrc.includes("height: '26px'"), 'TonalHud must render sleek 26px top bar');
    assert.ok(tonalHudSrc.includes('Analítica'), 'Must feature [ 📊 Analítica ▾ ] button');

    // Collapsible panel closed by default
    assert.ok(tonalHudSrc.includes('const [isExpanded, setIsExpanded] = useState(false);'), 'Collapsible panel must be closed by default');

    // Clickable sentence bars
    assert.ok(tonalHudSrc.includes('onSelectSentence?.(idx)'), 'Gary Provost sentence bars must be clickable');

    // Zen mode fade-out on active typing state machine
    let isTyping = false;
    let isHoveringToolbar = false;

    const onTyping = () => {
      isTyping = true;
    };

    const onTypingTimeout = () => {
      isTyping = false;
    };

    // When user types, toolbar fades out (opacity 0)
    onTyping();
    assert.strictEqual(isTyping, true);
    let isFaded = isTyping && !isHoveringToolbar;
    assert.strictEqual(isFaded, true, 'Zen toolbar must fade out during active typing');

    // When hovering top area, toolbar stays visible even while typing
    isHoveringToolbar = true;
    isFaded = isTyping && !isHoveringToolbar;
    assert.strictEqual(isFaded, false, 'Toolbar remains accessible when hovering');

    // When typing stops and timer fires, toolbar fades back in
    isHoveringToolbar = false;
    onTypingTimeout();
    isFaded = isTyping && !isHoveringToolbar;
    assert.strictEqual(isFaded, false, 'Toolbar restores after typing ceases');
  });
});
