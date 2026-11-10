export interface Project {
  id: string;
  title: string;
  author: string;
  created_at: number;
  updated_at: number;
  meta_json: string;
}

export interface Track {
  id: string;
  project_id: string;
  name: string;
  color_hex: string;
  track_order: number;
  is_muted: boolean;
  created_at: number;
}

export interface Scene {
  id: string;
  track_id: string;
  t_start: number;
  duration: number;
  z_index: number;
  title: string;
  text: string;
  word_count: number;
  char_count: number;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface ReadingAnchor {
  id: string;
  project_id: string;
  source_scene_id: string;
  target_scene_id: string;
  anchor_type: string;
  weight: number;
  created_at: number;
}

export interface AssembledScene {
  scene: Scene;
  track: Track;
  sequence_index: number;
}

export interface GraphNode {
  id: string;
  name: string;
  entity_type: string;
  color_hex: string;
  mention_count: number;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  weight: number;
  relation_type: string;
}

export interface EgoGraph {
  center: GraphNode;
  neighbors: GraphNode[];
  edges: GraphEdge[];
}

export interface TonalHistogram {
  dialogue: number;
  action: number;
  lore: number;
  monologue: number;
  total_words: number;
  sentence_lengths: number[];
  cadence_variance: number;
}

export interface AnachronismIssue {
  scene_id: string;
  scene_title: string;
  scene_time: number;
  entity_id: string;
  entity_name: string;
  issue_type: string;
  message: string;
}
