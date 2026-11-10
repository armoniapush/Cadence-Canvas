use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;
use super::entity::{EntityType, LoreEntity};

/// Node in a 1-hop story ego-graph representing a lore entity and its presence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub entity_type: EntityType,
    pub color_hex: String,
    pub mention_count: i64,
}

/// Edge in a 1-hop ego-graph connecting the center entity to a co-occurring neighbor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source_id: String,
    pub target_id: String,
    pub weight: f64,
    pub relation_type: String,
}

/// 1-hop ego-graph centered on an entity with its direct scene co-occurrences.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EgoGraph {
    pub center: GraphNode,
    pub neighbors: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

/// Extracts the 1-hop ego-graph for a given entity within a project.
///
/// Discovers all entities that co-occur with `entity_id` in at least one scene
/// via `scene_entity_mentions` and computes edge weights based on shared scenes.
pub fn extract_entity_ego_graph(
    conn: &Connection,
    project_id: &str,
    entity_id: &str,
) -> Result<EgoGraph, CadenceError> {
    let center_entity = LoreEntity::get_by_id(conn, entity_id)?;
    if center_entity.project_id != project_id {
        return Err(CadenceError::NotFound(format!(
            "LoreEntity '{entity_id}' not found in project '{project_id}'"
        )));
    }

    let center_mention_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM scene_entity_mentions sem
         JOIN scenes s ON s.id = sem.scene_id
         JOIN tracks t ON t.id = s.track_id
         WHERE sem.entity_id = ?1 AND t.project_id = ?2",
        params![entity_id, project_id],
        |r| r.get(0),
    )?;

    let center_node = GraphNode {
        id: center_entity.id.clone(),
        name: center_entity.name.clone(),
        entity_type: center_entity.entity_type,
        color_hex: center_entity.color_hex.clone(),
        mention_count: center_mention_count,
    };

    let mut stmt = conn.prepare(
        "SELECT sem2.entity_id, COUNT(DISTINCT s.id) as shared_scenes
         FROM scene_entity_mentions sem1
         JOIN scenes s ON s.id = sem1.scene_id
         JOIN tracks t ON t.id = s.track_id
         JOIN scene_entity_mentions sem2 ON sem2.scene_id = s.id
         WHERE sem1.entity_id = ?1
           AND t.project_id = ?2
           AND sem2.entity_id IS NOT NULL
           AND sem2.entity_id != ?1
         GROUP BY sem2.entity_id
         ORDER BY shared_scenes DESC, sem2.entity_id ASC",
    )?;

    let co_occurrences = stmt
        .query_map(params![entity_id, project_id], |row| {
            let neighbor_id: String = row.get(0)?;
            let shared_scenes: i64 = row.get(1)?;
            Ok((neighbor_id, shared_scenes))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut neighbors = Vec::with_capacity(co_occurrences.len());
    let mut edges = Vec::with_capacity(co_occurrences.len());

    for (neighbor_id, shared_scenes) in co_occurrences {
        if let Ok(neighbor_entity) = LoreEntity::get_by_id(conn, &neighbor_id) {
            let neighbor_mention_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM scene_entity_mentions sem
                 JOIN scenes s ON s.id = sem.scene_id
                 JOIN tracks t ON t.id = s.track_id
                 WHERE sem.entity_id = ?1 AND t.project_id = ?2",
                params![&neighbor_id, project_id],
                |r| r.get(0),
            ).unwrap_or(0);

            let relation_type = find_relation_type(conn, entity_id, &neighbor_id)?
                .unwrap_or_else(|| "co_occurrence".to_string());

            neighbors.push(GraphNode {
                id: neighbor_entity.id.clone(),
                name: neighbor_entity.name,
                entity_type: neighbor_entity.entity_type,
                color_hex: neighbor_entity.color_hex,
                mention_count: neighbor_mention_count,
            });

            edges.push(GraphEdge {
                source_id: entity_id.to_string(),
                target_id: neighbor_id,
                weight: shared_scenes as f64,
                relation_type,
            });
        }
    }

    Ok(EgoGraph {
        center: center_node,
        neighbors,
        edges,
    })
}

fn find_relation_type(conn: &Connection, e1: &str, e2: &str) -> Result<Option<String>, CadenceError> {
    let mut stmt = conn.prepare(
        "SELECT rel_type FROM relations
         WHERE is_active = 1
           AND ((from_entity_id = ?1 AND to_entity_id = ?2) OR (from_entity_id = ?2 AND to_entity_id = ?1))
         LIMIT 1",
    )?;
    let mut rows = stmt.query(params![e1, e2])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}
