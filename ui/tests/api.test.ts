import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  openProject,
  listTracks,
  createTrack,
  setTrackMuted,
  listScenes,
  createScene,
  updateSceneContent,
  moveScene,
  bumpSceneVersion,
  deleteScene,
  listAnchors,
  createAnchor,
  computeTonalMetrics,
} from '../src/api.ts';

describe('Cadence Canvas UI API & Lifecycle Tests', () => {
  const projectPath = 'test-project.cadence';

  test('openProject returns valid mock project', async () => {
    const project = await openProject(projectPath);
    assert.ok(project);
    assert.strictEqual(project.id, 'mock-proj-1');
    assert.strictEqual(project.title, `Mock Project (${projectPath})`);
  });

  test('listTracks returns initial tracks', async () => {
    const tracks = await listTracks(projectPath, 'mock-proj-1');
    assert.ok(Array.isArray(tracks));
    assert.ok(tracks.length >= 2);
    assert.strictEqual(tracks[0].name, 'Trama Principal');
  });

  test('track lifecycle: createTrack and setTrackMuted', async () => {
    const initialTracks = await listTracks(projectPath, 'mock-proj-1');
    const initialCount = initialTracks.length;

    // 1. Create a new subplot track
    const newTrack = await createTrack(
      projectPath,
      'mock-proj-1',
      'POV Antagonista',
      '#f43f5e',
      initialCount
    );
    assert.ok(newTrack.id);
    assert.strictEqual(newTrack.name, 'POV Antagonista');
    assert.strictEqual(newTrack.color_hex, '#f43f5e');
    assert.strictEqual(newTrack.track_order, initialCount);
    assert.strictEqual(newTrack.is_muted, false);

    const tracksAfterCreate = await listTracks(projectPath, 'mock-proj-1');
    assert.strictEqual(tracksAfterCreate.length, initialCount + 1);

    // 2. Mute the track
    await setTrackMuted(projectPath, newTrack.id, true);
    const tracksAfterMute = await listTracks(projectPath, 'mock-proj-1');
    const mutedTrack = tracksAfterMute.find((t) => t.id === newTrack.id);
    assert.ok(mutedTrack);
    assert.strictEqual(mutedTrack.is_muted, true);

    // 3. Unmute the track
    await setTrackMuted(projectPath, newTrack.id, false);
    const tracksAfterUnmute = await listTracks(projectPath, 'mock-proj-1');
    const unmutedTrack = tracksAfterUnmute.find((t) => t.id === newTrack.id);
    assert.ok(unmutedTrack);
    assert.strictEqual(unmutedTrack.is_muted, false);
  });

  test('scene lifecycle: create -> edit -> move -> delete', async () => {
    // 1. Initial scene count
    const initialScenes = await listScenes(projectPath, 'mock-proj-1');
    const initialCount = initialScenes.length;

    // 2. Create new scene
    const created = await createScene(
      projectPath,
      'mock-track-1',
      'Test Integration Scene',
      500,
      120,
      'Contenido inicial de prueba con varias palabras para validar recuento.'
    );
    assert.ok(created.id);
    assert.strictEqual(created.title, 'Test Integration Scene');
    assert.strictEqual(created.t_start, 500);
    assert.strictEqual(created.version, 1);
    assert.strictEqual(created.word_count, 10);

    // Verify it is in list
    const afterCreate = await listScenes(projectPath, 'mock-proj-1');
    assert.strictEqual(afterCreate.length, initialCount + 1);
    assert.ok(afterCreate.some((s) => s.id === created.id));

    // 3. Edit scene content with version 1
    const edited = await updateSceneContent(
      projectPath,
      created.id,
      1,
      'Test Scene Edited',
      'Nuevo texto de prueba.'
    );
    assert.strictEqual(edited.title, 'Test Scene Edited');
    assert.strictEqual(edited.version, 2);
    assert.strictEqual(edited.word_count, 4);

    // 4. Concurrency conflict on stale version
    await assert.rejects(
      async () => {
        await updateSceneContent(
          projectPath,
          created.id,
          1, // Outdated version
          'Should fail',
          'Conflict text'
        );
      },
      /Optimistic concurrency conflict/
    );

    // 5. Move scene
    const moved = await moveScene(
      projectPath,
      created.id,
      2,
      'mock-track-2',
      600,
      150
    );
    assert.strictEqual(moved.track_id, 'mock-track-2');
    assert.strictEqual(moved.t_start, 600);
    assert.strictEqual(moved.duration, 150);
    assert.strictEqual(moved.version, 2); // Spatial moving does NOT increment draft version!

    // 5b. Explicitly bump draft version when requested by user
    const bumped = await bumpSceneVersion(projectPath, created.id, moved.version);
    assert.strictEqual(bumped.version, 3);

    // 6. Connect an anchor to this scene
    const anchor = await createAnchor(
      projectPath,
      'mock-proj-1',
      initialScenes[0].id,
      created.id,
      'causal',
      1.0
    );
    const anchorsBeforeDelete = await listAnchors(projectPath, 'mock-proj-1');
    assert.ok(anchorsBeforeDelete.some((a) => a.id === anchor.id));

    // 7. Delete the scene
    await deleteScene(projectPath, created.id);

    // 8. Verify scene is removed from list
    const afterDelete = await listScenes(projectPath, 'mock-proj-1');
    assert.strictEqual(afterDelete.length, initialCount);
    assert.ok(!afterDelete.some((s) => s.id === created.id));

    // 9. Verify cascade: anchor referencing deleted scene was also purged
    const anchorsAfterDelete = await listAnchors(projectPath, 'mock-proj-1');
    assert.ok(!anchorsAfterDelete.some((a) => a.target_scene_id === created.id));
  });

  test('computeTonalMetrics returns clean normalized metrics', async () => {
    const text = '“¿Quién está ahí?”, preguntó el vigilante. Salió corriendo rápidamente hacia el búnker.';
    const metrics = await computeTonalMetrics(text);
    assert.ok(metrics.total_words > 0);
    assert.ok(typeof metrics.dialogue === 'number');
    assert.ok(typeof metrics.action === 'number');
    assert.ok(typeof metrics.lore === 'number');
    assert.ok(typeof metrics.monologue === 'number');
    assert.ok(metrics.dialogue > 0);
  });
});
