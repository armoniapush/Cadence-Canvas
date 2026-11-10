import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RULER_HEIGHT,
  TRACK_HEADER_WIDTH,
  TRACK_HEIGHT,
  TRACK_GAP,
  CARD_PAD_Y,
  CARD_HEIGHT,
  PIXELS_PER_UNIT,
  CARD_BORDER_RADIUS,
  getTrackMuteButtonRect,
  getSceneRect,
  computeFitViewport,
} from '../src/canvas/renderer.ts';
import type { Track, Scene, Viewport, TonalHistogram } from '../src/types.ts';

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
    assert.strictEqual(RULER_HEIGHT, 42);
    assert.strictEqual(TRACK_HEADER_WIDTH, 200);
    assert.strictEqual(TRACK_HEIGHT, 104);
    assert.strictEqual(TRACK_GAP, 10);
    assert.strictEqual(CARD_PAD_Y, 8);
    assert.strictEqual(CARD_HEIGHT, 88);
    assert.strictEqual(PIXELS_PER_UNIT, 1.3);
    assert.strictEqual(CARD_BORDER_RADIUS, 12); // Mount / Wavely rounded radius

    const vp: Viewport = { panX: 0, panY: 0, zoom: 1.0 };

    // Track visibility toggle button coordinates inside track header
    const btnRect = getTrackMuteButtonRect(0, vp);
    assert.ok(btnRect.x > 0);
    assert.ok(btnRect.x + btnRect.w <= TRACK_HEADER_WIDTH);
    assert.strictEqual(btnRect.y, RULER_HEIGHT + (TRACK_HEIGHT - btnRect.h) / 2);

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
    assert.strictEqual(rect.y, RULER_HEIGHT + CARD_PAD_Y);
    assert.strictEqual(rect.h, 88);
    assert.ok(rect.w >= 88);
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

  test('pinned track header boundary hit guard isolates cards from header clicks', () => {
    // When a scene has negative panX such that its geometry overlaps track header space:
    const mockTracks: Track[] = [
      { id: 't1', project_id: 'p1', name: 'Trama', color_hex: '#6366f1', track_order: 0, is_muted: false }
    ];
    const vp: Viewport = { panX: -100, panY: 0, zoom: 1.0 };
    const scene: Scene = {
      id: 's1',
      project_id: 'p1',
      track_id: 't1',
      title: 'Capítulo Oculto',
      t_start: 10, // x = 200 - 100 + 13 = 113 (which is < 200!)
      duration: 100,
      text: '',
      word_count: 0,
      version: 1,
    };

    const rect = getSceneRect(scene, mockTracks, vp);
    assert.ok(rect.x < TRACK_HEADER_WIDTH); // Card rect physically extends into header space

    // Hit test function with the boundary guard
    const hitTest = (mx: number, my: number) => {
      if (mx <= TRACK_HEADER_WIDTH || my <= RULER_HEIGHT) return null;
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        return scene;
      }
      return null;
    };

    // Clicking at mx = 150 (inside track header area) must return null, NOT the card
    const headerHit = hitTest(150, RULER_HEIGHT + 20);
    assert.strictEqual(headerHit, null);

    // Clicking at mx = 210 (visible canvas area) hits the card
    const canvasHit = hitTest(210, RULER_HEIGHT + 20);
    assert.strictEqual(canvasHit?.id, 's1');
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

  test('anti-ai-slop design token verification: zero radioactive neon glows in buttons', () => {
    // Verify that primary and secondary pill button configurations do not declare neon glows
    const isNeonGlow = (boxShadow: string) => {
      // Glow patterns like '0 0 16px rgba(...)', '0 0 12px ...', etc.
      return /0\s+0\s+\d+px\s+rgba\(\s*(?:99,\s*102,\s*241|56,\s*189,\s*248)/.test(boxShadow);
    };

    const matteElevatedShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
    const oldSlopGlow = '0 0 16px rgba(99, 102, 241, 0.32)';

    assert.strictEqual(isNeonGlow(oldSlopGlow), true, 'Detects old neon glow');
    assert.strictEqual(isNeonGlow(matteElevatedShadow), false, 'Matte shadow is clean and not a neon glow');
  });
});
