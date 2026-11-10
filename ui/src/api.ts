import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  Track,
  Scene,
  AssembledScene,
  EgoGraph,
  TonalHistogram,
  AnachronismIssue,
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
  ] as Scene[],
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

export async function getEgoGraph(
  path: string,
  projectId: string,
  entityId: string,
): Promise<EgoGraph> {
  if (isTauri()) {
    return invoke<EgoGraph>('get_ego_graph', { path, projectId, entityId });
  }
  return {
    center: {
      id: entityId,
      name: 'Entidad Central Mock',
      entity_type: 'character',
      color_hex: '#f59e0b',
      mention_count: 5,
    },
    neighbors: [],
    edges: [],
  };
}

export async function computeTonalMetrics(text: string): Promise<TonalHistogram> {
  if (isTauri()) {
    return invoke<TonalHistogram>('compute_tonal_metrics', { text });
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    dialogue: 0.25,
    action: 0.35,
    lore: 0.15,
    monologue: 0.25,
    total_words: words,
    sentence_lengths: [12, 8, 15],
    cadence_variance: 8.5,
  };
}

export async function auditTimeline(
  path: string,
  projectId: string,
): Promise<AnachronismIssue[]> {
  if (isTauri()) {
    return invoke<AnachronismIssue[]>('audit_timeline', { path, projectId });
  }
  return [];
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
