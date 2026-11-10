import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  Track,
  Scene,
  ReadingAnchor,
  AssembledScene,
  EgoGraph,
  TonalHistogram,
  AnachronismIssue,
  LoreEntity,
} from './types';

const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Fallback in-memory state for pure browser development preview
const mockState = {
  project: {
    id: 'mock-proj-1',
    title: 'Estación Narrativa Beta',
    author: 'Autor Gentle-AI',
    created_at: Date.now(),
    updated_at: Date.now(),
    meta_json: '{}',
  } as Project,
  tracks: [
    {
      id: 'mock-track-1',
      project_id: 'mock-proj-1',
      name: 'Trama Principal',
      color_hex: '#6366f1',
      track_order: 0,
      is_muted: false,
      created_at: Date.now(),
    },
    {
      id: 'mock-track-2',
      project_id: 'mock-proj-1',
      name: 'Subtrama Causal B',
      color_hex: '#10b981',
      track_order: 1,
      is_muted: false,
      created_at: Date.now(),
    },
  ] as Track[],
  scenes: [
    {
      id: 'mock-scene-1',
      track_id: 'mock-track-1',
      t_start: 0,
      duration: 120,
      z_index: 0,
      title: 'Apertura Táctica',
      text: 'El protagonista activa la consola de montaje de Cadence Canvas.',
      word_count: 10,
      char_count: 65,
      version: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'mock-scene-2',
      track_id: 'mock-track-2',
      t_start: 140,
      duration: 150,
      z_index: 0,
      title: 'Infiltración en el Búnker',
      text: 'El equipo secundario intercepta la señal de transmisión enemiga.',
      word_count: 10,
      char_count: 63,
      version: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'mock-scene-3',
      track_id: 'mock-track-1',
      t_start: 310,
      duration: 130,
      z_index: 0,
      title: 'Convergencia Causal',
      text: 'Ambos hilos se unen en el núcleo de la estación narrativa.',
      word_count: 10,
      char_count: 57,
      version: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ] as Scene[],
  anchors: [
    {
      id: 'mock-anchor-1',
      project_id: 'mock-proj-1',
      source_scene_id: 'mock-scene-1',
      target_scene_id: 'mock-scene-2',
      anchor_type: 'causal',
      weight: 1.0,
      created_at: Date.now(),
    },
    {
      id: 'mock-anchor-2',
      project_id: 'mock-proj-1',
      source_scene_id: 'mock-scene-2',
      target_scene_id: 'mock-scene-3',
      anchor_type: 'chronological',
      weight: 1.0,
      created_at: Date.now(),
    },
  ] as ReadingAnchor[],
  entities: [
    {
      id: 'entity-valeria',
      project_id: 'mock-proj-1',
      entity_type: 'character',
      name: 'Valeria',
      aliases: ['Val'],
      color_hex: '#818cf8',
      meta_json: JSON.stringify({ born_at: 0, died_at: 280 }),
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'entity-kael',
      project_id: 'mock-proj-1',
      entity_type: 'character',
      name: 'Kael',
      aliases: ['Comandante'],
      color_hex: '#60a5fa',
      meta_json: JSON.stringify({ born_at: 80 }),
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'entity-bunker',
      project_id: 'mock-proj-1',
      entity_type: 'location',
      name: 'Búnker Cero',
      aliases: ['Búnker'],
      color_hex: '#2dd4bf',
      meta_json: JSON.stringify({ born_at: 0 }),
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'entity-estacion',
      project_id: 'mock-proj-1',
      entity_type: 'location',
      name: 'Estación Órbita',
      aliases: ['Órbita'],
      color_hex: '#38bdf8',
      meta_json: JSON.stringify({ born_at: 130 }),
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'entity-consola',
      project_id: 'mock-proj-1',
      entity_type: 'item',
      name: 'Consola Cuántica',
      aliases: ['Consola'],
      color_hex: '#fbbf24',
      meta_json: JSON.stringify({ born_at: 40, died_at: 260 }),
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ] as LoreEntity[],
  anachronisms: [
    {
      scene_id: 'mock-scene-3',
      scene_title: 'Convergencia Causal',
      scene_time: 310,
      entity_id: 'entity-valeria',
      entity_name: 'Valeria',
      issue_type: 'post_mortem_mention',
      message: "Entity 'Valeria' is mentioned in scene 'Convergencia Causal' at time 310, after demise/death at 280",
    },
    {
      scene_id: 'mock-scene-1',
      scene_title: 'Apertura Táctica',
      scene_time: 0,
      entity_id: 'entity-estacion',
      entity_name: 'Estación Órbita',
      issue_type: 'pre_birth_mention',
      message: "Entity 'Estación Órbita' is mentioned in scene 'Apertura Táctica' at time 0, before birth/origin at 130",
    },
  ] as AnachronismIssue[],
};

export async function openProject(path: string): Promise<Project> {
  if (isTauri()) {
    return invoke<Project>('open_project', { path });
  }
  return { ...mockState.project, title: `Mock Project (${path || 'local'})` };
}

export async function listTracks(path: string, projectId: string): Promise<Track[]> {
  if (isTauri()) {
    return invoke<Track[]>('list_tracks', { path, projectId });
  }
  return mockState.tracks.filter((t) => t.project_id === projectId || true);
}

export async function createTrack(
  path: string,
  projectId: string,
  name: string,
  color: string,
  order: number,
): Promise<Track> {
  if (isTauri()) {
    return invoke<Track>('create_track', { path, projectId, name, color, order });
  }
  const newTrack: Track = {
    id: `track-${Date.now()}`,
    project_id: projectId,
    name,
    color_hex: color,
    track_order: order,
    is_muted: false,
    created_at: Date.now(),
  };
  mockState.tracks.push(newTrack);
  return newTrack;
}

export async function listScenes(path: string, projectId: string): Promise<Scene[]> {
  if (isTauri()) {
    return invoke<Scene[]>('list_scenes', { path, projectId });
  }
  return mockState.scenes;
}

export async function createScene(
  path: string,
  trackId: string,
  title: string,
  tStart: number,
  duration: number,
  text: string,
): Promise<Scene> {
  if (isTauri()) {
    return invoke<Scene>('create_scene', {
      path,
      trackId,
      title,
      tStart,
      duration,
      text,
    });
  }
  const newScene: Scene = {
    id: `scene-${Date.now()}`,
    track_id: trackId,
    t_start: tStart,
    duration,
    z_index: 0,
    title,
    text,
    word_count: text.split(/\s+/).filter(Boolean).length,
    char_count: text.length,
    version: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  mockState.scenes.push(newScene);
  return newScene;
}

export async function updateSceneContent(
  path: string,
  id: string,
  version: number,
  title: string,
  text: string,
): Promise<Scene> {
  if (isTauri()) {
    return invoke<Scene>('update_scene_content', {
      path,
      id,
      version,
      title,
      text,
    });
  }
  const target = mockState.scenes.find((s) => s.id === id);
  if (!target) throw new Error(`Scene '${id}' not found in mock store`);
  if (target.version !== version) {
    throw new Error(
      `Optimistic concurrency conflict on scene '${id}': expected version ${version}, actual ${target.version}`
    );
  }
  target.title = title;
  target.text = text;
  target.version += 1;
  target.word_count = text.split(/\s+/).filter(Boolean).length;
  target.char_count = text.length;
  target.updated_at = Date.now();
  return { ...target };
}

export async function moveScene(
  path: string,
  id: string,
  version: number,
  trackId: string,
  tStart: number,
  duration: number,
): Promise<Scene> {
  if (isTauri()) {
    return invoke<Scene>('move_scene', {
      path,
      id,
      version,
      trackId,
      tStart,
      duration,
    });
  }
  const target = mockState.scenes.find((s) => s.id === id);
  if (!target) throw new Error(`Scene '${id}' not found in mock store`);
  target.track_id = trackId;
  target.t_start = tStart;
  target.duration = duration;
  target.version += 1;
  target.updated_at = Date.now();
  return { ...target };
}

export async function listAnchors(path: string, projectId: string): Promise<ReadingAnchor[]> {
  if (isTauri()) {
    return invoke<ReadingAnchor[]>('list_anchors', { path, projectId });
  }
  return mockState.anchors.filter((a) => a.project_id === projectId || true);
}

export async function createAnchor(
  path: string,
  projectId: string,
  sourceSceneId: string,
  targetSceneId: string,
  anchorType: string,
  weight: number,
): Promise<ReadingAnchor> {
  if (isTauri()) {
    return invoke<ReadingAnchor>('create_anchor', {
      path,
      projectId,
      sourceSceneId,
      targetSceneId,
      anchorType,
      weight,
    });
  }
  const newAnchor: ReadingAnchor = {
    id: `anchor-${Date.now()}`,
    project_id: projectId,
    source_scene_id: sourceSceneId,
    target_scene_id: targetSceneId,
    anchor_type: anchorType,
    weight,
    created_at: Date.now(),
  };
  mockState.anchors.push(newAnchor);
  return newAnchor;
}

export async function assembleManuscript(
  path: string,
  projectId: string,
): Promise<AssembledScene[]> {
  if (isTauri()) {
    return invoke<AssembledScene[]>('assemble_manuscript', { path, projectId });
  }
  return mockState.scenes.map((scene, i) => ({
    scene,
    track: mockState.tracks[0],
    sequence_index: i,
  }));
}

export async function listEntities(path: string, projectId: string): Promise<LoreEntity[]> {
  if (isTauri()) {
    return invoke<LoreEntity[]>('list_entities', { path, projectId });
  }
  return mockState.entities.filter((e) => e.project_id === projectId || true);
}

export async function getEgoGraph(
  path: string,
  projectId: string,
  entityId: string,
): Promise<EgoGraph> {
  if (isTauri()) {
    return invoke<EgoGraph>('get_ego_graph', { path, projectId, entityId });
  }
  const allEntities = mockState.entities;
  const centerEntity = allEntities.find((e) => e.id === entityId) || allEntities[0];
  let centerMeta: { born_at?: number; died_at?: number } = {};
  try {
    centerMeta = JSON.parse(centerEntity.meta_json);
  } catch {}

  const neighbors = allEntities
    .filter((e) => e.id !== centerEntity.id)
    .map((e) => {
      let meta: { born_at?: number; died_at?: number } = {};
      try {
        meta = JSON.parse(e.meta_json);
      } catch {}
      return {
        id: e.id,
        name: e.name,
        entity_type: e.entity_type,
        color_hex: e.color_hex,
        mention_count: 3,
        born_at: meta.born_at ?? null,
        died_at: meta.died_at ?? null,
      };
    });

  const edges = neighbors.map((n, i) => ({
    source_id: centerEntity.id,
    target_id: n.id,
    weight: Math.max(1, 4 - i * 0.8),
    relation_type: 'co_occurrence',
  }));

  return {
    center: {
      id: centerEntity.id,
      name: centerEntity.name,
      entity_type: centerEntity.entity_type,
      color_hex: centerEntity.color_hex,
      mention_count: 8,
      born_at: centerMeta.born_at ?? null,
      died_at: centerMeta.died_at ?? null,
    },
    neighbors,
    edges,
  };
}

export async function computeTonalMetrics(text: string): Promise<TonalHistogram> {
  if (isTauri()) {
    return invoke<TonalHistogram>('compute_tonal_metrics', { text });
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const dialogueMatches = text.match(/[“"«»—].*?[”"«»—]/g) || [];
  const dialogueChars = dialogueMatches.reduce((acc, m) => acc + m.length, 0);
  const dialogueRatio = chars > 0 ? Math.min(0.9, dialogueChars / chars) : 0.25;
  const actionRatio = Math.max(0.05, 0.45 - dialogueRatio * 0.4);
  const loreRatio = text.includes('#') || text.includes('!') ? 0.25 : 0.15;
  const monologueRatio = Math.max(0.05, 1 - (dialogueRatio + actionRatio + loreRatio));
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceLengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const avg =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 10;
  const variance =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((acc, len) => acc + Math.pow(len - avg, 2), 0) /
        sentenceLengths.length
      : 7.5;

  return {
    dialogue: Number(dialogueRatio.toFixed(2)),
    action: Number(actionRatio.toFixed(2)),
    lore: Number(loreRatio.toFixed(2)),
    monologue: Number(monologueRatio.toFixed(2)),
    total_words: words,
    sentence_lengths: sentenceLengths,
    cadence_variance: Number(variance.toFixed(2)),
  };
}

export async function auditTimeline(
  path: string,
  projectId: string,
): Promise<AnachronismIssue[]> {
  if (isTauri()) {
    return invoke<AnachronismIssue[]>('audit_timeline', { path, projectId });
  }
  return mockState.anachronisms;
}

export async function exportMarkdown(
  path: string,
  projectId: string,
  outputPath: string,
): Promise<string> {
  if (isTauri()) {
    return invoke<string>('export_markdown', { path, projectId, outputPath });
  }
  return outputPath;
}

export async function exportDocx(
  path: string,
  projectId: string,
  outputPath: string,
): Promise<string> {
  if (isTauri()) {
    return invoke<string>('export_docx', { path, projectId, outputPath });
  }
  return outputPath;
}
