/// Mandatory SQLite PRAGMAs for high-performance WAL operation.
pub const PRAGMAS: &str = r#"
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
"#;

/// Canonical SQLite DDL v1 for `.cadence` single-file local storage.
pub const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#6366f1',
    track_order INTEGER NOT NULL,
    is_muted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY NOT NULL,
    track_id TEXT NOT NULL,
    t_start INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    z_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    char_count INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS reading_anchors (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    source_scene_id TEXT NOT NULL,
    target_scene_id TEXT NOT NULL,
    anchor_type TEXT NOT NULL DEFAULT 'chronological',
    weight REAL NOT NULL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(source_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY(target_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    UNIQUE(source_scene_id, target_scene_id)
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY NOT NULL,
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    rel_type TEXT NOT NULL,
    revealed_at_scene_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(to_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(revealed_at_scene_id) REFERENCES scenes(id) ON DELETE SET NULL
);

-- Indices for high concurrency and spatial sweep-line lookups
CREATE INDEX IF NOT EXISTS idx_scenes_track_time ON scenes(track_id, t_start, duration);
CREATE INDEX IF NOT EXISTS idx_tracks_project_order ON tracks(project_id, track_order);
CREATE INDEX IF NOT EXISTS idx_entities_project_kind ON entities(project_id, kind);
CREATE INDEX IF NOT EXISTS idx_relations_pair ON relations(from_entity_id, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_anchors_project ON reading_anchors(project_id);
"#;
