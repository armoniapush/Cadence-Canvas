use std::collections::{HashMap, HashSet, VecDeque};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::error::CadenceError;

/// Represents a directed reading anchor (precedence edge) between two scenes in a DAG.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReadingAnchor {
    pub id: String,
    pub project_id: String,
    pub source_scene_id: String,
    pub target_scene_id: String,
    pub anchor_type: String, // ej. "chronological", "causal", "flashback"
    pub weight: f64,
    pub created_at: i64,
}

impl ReadingAnchor {
    /// Creates and persists a new reading anchor validating non-self-reference and cycle freeness.
    pub fn create(
        conn: &Connection,
        project_id: &str,
        source_scene_id: &str,
        target_scene_id: &str,
        anchor_type: &str,
        weight: f64,
    ) -> Result<Self, CadenceError> {
        if source_scene_id == target_scene_id {
            return Err(CadenceError::Validation(
                "Reading anchor source and target cannot be the same scene".to_string(),
            ));
        }
        if anchor_type.trim().is_empty() {
            return Err(CadenceError::Validation(
                "Anchor type cannot be empty".to_string(),
            ));
        }
        if !weight.is_finite() || weight < 0.0 {
            return Err(CadenceError::Validation(format!(
                "Anchor weight must be non-negative and finite, got {weight}"
            )));
        }

        let existing = Self::list_by_project(conn, project_id)?;
        if is_reachable(&existing, target_scene_id, source_scene_id) {
            return Err(CadenceError::CyclicAnchor {
                from: source_scene_id.to_string(),
                to: target_scene_id.to_string(),
            });
        }

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO reading_anchors (id, project_id, source_scene_id, target_scene_id, anchor_type, weight, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![&id, project_id, source_scene_id, target_scene_id, anchor_type, weight, now],
        )?;

        Ok(Self {
            id,
            project_id: project_id.to_string(),
            source_scene_id: source_scene_id.to_string(),
            target_scene_id: target_scene_id.to_string(),
            anchor_type: anchor_type.to_string(),
            weight,
            created_at: now,
        })
    }

    /// Retrieves an anchor by ID.
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Self, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, source_scene_id, target_scene_id, anchor_type, weight, created_at \
             FROM reading_anchors WHERE id = ?1",
        )?;
        let mut rows = stmt.query(rusqlite::params![id])?;
        if let Some(row) = rows.next()? {
            map_anchor_row(row).map_err(CadenceError::Storage)
        } else {
            Err(CadenceError::NotFound(format!("Reading anchor '{id}' not found")))
        }
    }

    /// Lists all reading anchors belonging to a project, ordered by creation time.
    pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, source_scene_id, target_scene_id, anchor_type, weight, created_at \
             FROM reading_anchors WHERE project_id = ?1 ORDER BY created_at ASC",
        )?;
        let iter = stmt.query_map(rusqlite::params![project_id], map_anchor_row)?;
        let mut anchors = Vec::new();
        for a in iter {
            anchors.push(a?);
        }
        Ok(anchors)
    }

    /// Deletes a reading anchor by ID.
    pub fn delete(conn: &Connection, id: &str) -> Result<(), CadenceError> {
        let rows = conn.execute("DELETE FROM reading_anchors WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Reading anchor '{id}' not found")));
        }
        Ok(())
    }
}

fn map_anchor_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReadingAnchor> {
    Ok(ReadingAnchor {
        id: row.get(0)?,
        project_id: row.get(1)?,
        source_scene_id: row.get(2)?,
        target_scene_id: row.get(3)?,
        anchor_type: row.get(4)?,
        weight: row.get(5)?,
        created_at: row.get(6)?,
    })
}

/// Checks whether `target` is reachable from `start` in the directed graph of existing anchors.
fn is_reachable(anchors: &[ReadingAnchor], start: &str, target: &str) -> bool {
    if start == target {
        return true;
    }
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
    for a in anchors {
        adj.entry(a.source_scene_id.as_str())
            .or_default()
            .push(a.target_scene_id.as_str());
    }
    let mut visited: HashSet<&str> = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(start);
    visited.insert(start);

    while let Some(node) = queue.pop_front() {
        if let Some(neighbors) = adj.get(node) {
            for &next in neighbors {
                if next == target {
                    return true;
                }
                if visited.insert(next) {
                    queue.push_back(next);
                }
            }
        }
    }
    false
}

/// Computes deterministic topological stratum ranks (0..N) for all scenes in the anchor graph.
/// Roots (in-degree 0) receive rank 0. Successors receive max(rank(parent) + 1).
pub fn compute_topological_ranks(anchors: &[ReadingAnchor]) -> HashMap<String, i64> {
    if anchors.is_empty() {
        return HashMap::new();
    }

    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
    let mut in_degree: HashMap<&str, usize> = HashMap::new();

    for a in anchors {
        adj.entry(a.source_scene_id.as_str())
            .or_default()
            .push(a.target_scene_id.as_str());
        *in_degree.entry(a.target_scene_id.as_str()).or_default() += 1;
        in_degree.entry(a.source_scene_id.as_str()).or_default();
    }

    let mut zero_in_nodes: Vec<&str> = in_degree
        .iter()
        .filter_map(|(&node, &deg)| if deg == 0 { Some(node) } else { None })
        .collect();
    zero_in_nodes.sort_unstable();

    let mut queue: VecDeque<&str> = zero_in_nodes.into();
    let mut ranks: HashMap<String, i64> = HashMap::new();

    for &node in &queue {
        ranks.insert(node.to_string(), 0);
    }

    while let Some(u) = queue.pop_front() {
        let current_rank = ranks[u];
        if let Some(neighbors) = adj.get(u) {
            let mut sorted_neighbors = neighbors.clone();
            sorted_neighbors.sort_unstable();

            for v in sorted_neighbors {
                let next_rank = current_rank + 1;
                ranks
                    .entry(v.to_string())
                    .and_modify(|r| *r = (*r).max(next_rank))
                    .or_insert(next_rank);

                if let Some(deg) = in_degree.get_mut(v) {
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(v);
                    }
                }
            }
        }
    }

    ranks
}
