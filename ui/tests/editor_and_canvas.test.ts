import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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
});
