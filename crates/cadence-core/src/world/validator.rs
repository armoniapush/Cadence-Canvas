use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;

/// An identified chronological discrepancy or causality violation in narrative events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnachronismIssue {
    pub scene_id: String,
    pub scene_title: String,
    pub scene_time: i64,
    pub entity_id: String,
    pub entity_name: String,
    pub issue_type: String,
    pub message: String,
}

/// Audits temporal causality across scenes and entities within a project.
///
/// Inspects `meta_json` on entities for optional `born_at` and `died_at` chronological boundaries.
/// Dispatches `AnachronismIssue` when scenes reference entities outside their lifespan.
pub fn audit_temporal_causality(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<AnachronismIssue>, CadenceError> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT
            s.id,
            s.title,
            s.t_start,
            e.id,
            e.name,
            e.meta_json
         FROM scene_entity_mentions sem
         JOIN scenes s ON s.id = sem.scene_id
         JOIN tracks t ON t.id = s.track_id
         JOIN entities e ON e.id = sem.entity_id
         WHERE t.project_id = ?1
         ORDER BY s.t_start ASC, s.id ASC, e.name ASC",
    )?;

    let rows = stmt.query_map(params![project_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
        ))
    })?;

    let mut issues = Vec::new();

    for row in rows {
        let (scene_id, scene_title, scene_time, entity_id, entity_name, meta_json) = row?;
        if let Ok(meta_val) = serde_json::from_str::<serde_json::Value>(&meta_json) {
            if let Some(born_at) = meta_val.get("born_at").and_then(|v| v.as_i64()) {
                if scene_time < born_at {
                    issues.push(AnachronismIssue {
                        scene_id: scene_id.clone(),
                        scene_title: scene_title.clone(),
                        scene_time,
                        entity_id: entity_id.clone(),
                        entity_name: entity_name.clone(),
                        issue_type: "pre_birth_mention".to_string(),
                        message: format!(
                            "Entity '{}' is mentioned in scene '{}' at time {}, before birth/origin at {}",
                            entity_name, scene_title, scene_time, born_at
                        ),
                    });
                }
            }

            if let Some(died_at) = meta_val.get("died_at").and_then(|v| v.as_i64()) {
                if scene_time > died_at {
                    issues.push(AnachronismIssue {
                        scene_id,
                        scene_title: scene_title.clone(),
                        scene_time,
                        entity_id,
                        entity_name: entity_name.clone(),
                        issue_type: "post_mortem_mention".to_string(),
                        message: format!(
                            "Entity '{}' is mentioned in scene '{}' at time {}, after demise/death at {}",
                            entity_name, scene_title, scene_time, died_at
                        ),
                    });
                }
            }
        }
    }

    Ok(issues)
}
