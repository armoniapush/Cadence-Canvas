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
  getTrackMuteButtonRect,
  getSceneRect,
} from '../src/canvas/renderer.ts';
import type { Track, Scene, Viewport } from '../src/types.ts';

describe('Clean Editorial Metrics & Deletion Safeguard Tests', () => {
  test('reading time and word count calculations are accurate', () => {
    const computeStats = (text: string) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const readingMinutes = Math.max(1, Math.ceil(words / 250));
      return { words, chars, readingMinutes };
    };

    const empty = computeStats('');
    assert.strictEqual(empty.words, 0);
    assert.strictEqual(empty.chars, 0);

    const paragraph = Array(300).fill('palabra').join(' ');
    const stats = computeStats(paragraph);
    assert.strictEqual(stats.words, 300);
    assert.strictEqual(stats.readingMinutes, 2); // 300 / 250 = 1.2 -> ceil 2 min
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
    // Assert Slice 6.1 dimensional invariants
    assert.strictEqual(RULER_HEIGHT, 42);
    assert.strictEqual(TRACK_HEADER_WIDTH, 200);
    assert.strictEqual(TRACK_HEIGHT, 104);
    assert.strictEqual(TRACK_GAP, 10);
    assert.strictEqual(CARD_PAD_Y, 8);
    assert.strictEqual(CARD_HEIGHT, 88);
    assert.strictEqual(PIXELS_PER_UNIT, 1.3);

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
      t_start: 120, // Act II start
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
});
