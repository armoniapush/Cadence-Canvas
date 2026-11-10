use std::collections::HashMap;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::domain::{compute_topological_ranks, Project, ReadingAnchor, Scene, Track};
use crate::error::CadenceError;

/// Strict 6-tuple total ordering key for the 2D Sweep-Line assembly engine:
/// K(S) = (t_start ↑, track_order ↑, anchor_topo ↑, z_index ↑, created_at ↑, scene_id ↑)
///
/// Implements total ordering (`Ord`, `PartialOrd`, `Eq`, `PartialEq`) via
/// top-to-bottom lexicographical field comparison.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct SceneSweepKey {
    pub t_start: i64,
    pub track_order: i64,
    pub anchor_topo: i64, // 0 by default when unanchored
    pub z_index: i64,
    pub created_at: i64,
    pub scene_id: String,
}

impl SceneSweepKey {
    /// Builds a key from a `Scene` and its corresponding `Track`.
    pub fn from_scene_and_track(scene: &Scene, track: &Track, anchor_topo: i64) -> Self {
        Self {
            t_start: scene.t_start,
            track_order: track.track_order,
            anchor_topo,
            z_index: scene.z_index,
            created_at: scene.created_at,
            scene_id: scene.id.clone(),
        }
    }
}

/// Represents an assembled narrative unit placed in final sequence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AssembledScene {
    pub scene: Scene,
    pub track: Track,
    pub sequence_index: usize,
}

/// Assembles an in-memory collection of scenes and tracks deterministically with topological anchor ranks.
///
/// Filters out any scenes that belong to muted tracks (`track.is_muted == true`).
/// Resolves `anchor_topo` from `ranks` (defaults to 0 if unanchored).
/// Orders the remaining scenes strictly according to `SceneSweepKey`.
/// Assigns consecutive `sequence_index: 0..N`.
pub fn assemble_scenes_with_ranks(
    scenes: Vec<Scene>,
    tracks: &[Track],
    ranks: &HashMap<String, i64>,
) -> Vec<AssembledScene> {
    let track_map: HashMap<String, &Track> = tracks
        .iter()
        .map(|t| (t.id.clone(), t))
        .collect();

    let mut candidates: Vec<(SceneSweepKey, Scene, Track)> = Vec::with_capacity(scenes.len());
    for scene in scenes {
        if let Some(track) = track_map.get(&scene.track_id) {
            if track.is_muted {
                continue;
            }
            let anchor_topo = ranks.get(&scene.id).copied().unwrap_or(0);
            let key = SceneSweepKey::from_scene_and_track(&scene, track, anchor_topo);
            candidates.push((key, scene, (*track).clone()));
        }
    }

    candidates.sort_by(|a, b| a.0.cmp(&b.0));

    candidates
        .into_iter()
        .enumerate()
        .map(|(sequence_index, (_key, scene, track))| AssembledScene {
            scene,
            track,
            sequence_index,
        })
        .collect()
}

/// Assembles an in-memory collection of scenes and tracks deterministically (unanchored / default topo 0).
pub fn assemble_scenes(scenes: Vec<Scene>, tracks: &[Track]) -> Vec<AssembledScene> {
    assemble_scenes_with_ranks(scenes, tracks, &HashMap::new())
}

/// Assembles all active scenes of a project from a SQLite database connection.
///
/// Invariant:
/// - Verifies project existence (returns `CadenceError::NotFound` if invalid).
/// - Retrieves all tracks, scenes, and reading anchors for `project_id`.
/// - Mechanically excludes scenes residing on muted tracks.
/// - Computes deterministic topological ranks for reading anchors.
/// - Performs deterministic 2D sweep-line assembly with total tie-breaking.
pub fn assemble_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<AssembledScene>, CadenceError> {
    Project::get_by_id(conn, project_id)?;
    let tracks = Track::list_by_project(conn, project_id)?;
    let scenes = Scene::list_by_project(conn, project_id)?;
    let anchors = ReadingAnchor::list_by_project(conn, project_id)?;
    let ranks = compute_topological_ranks(&anchors);
    Ok(assemble_scenes_with_ranks(scenes, &tracks, &ranks))
}
