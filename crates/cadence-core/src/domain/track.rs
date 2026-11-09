use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;

/// Default color hex for newly created tracks.
pub const DEFAULT_TRACK_COLOR: &str = "#6366f1";

/// Represents a storyline or narrative track within a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color_hex: String,
    pub track_order: i64,
    pub is_muted: bool,
    pub created_at: i64,
}

impl Track {
    /// Validates causal invariants for tracks:
    /// - `name` cannot be empty or whitespace only.
    /// - `color_hex` cannot be empty or whitespace only.
    /// - `track_order` must be non-negative (>= 0).
    pub fn validate(name: &str, color_hex: &str, track_order: i64) -> Result<(), CadenceError> {
        if name.trim().is_empty() {
            return Err(CadenceError::Validation(
                "Track name cannot be empty".to_string(),
            ));
        }
        if color_hex.trim().is_empty() {
            return Err(CadenceError::Validation(
                "Track color_hex cannot be empty".to_string(),
            ));
        }
        if track_order < 0 {
            return Err(CadenceError::Validation(format!(
                "Track order must be non-negative, got {track_order}"
            )));
        }
        Ok(())
    }

    /// Creates and persists a new `Track` under `project_id`.
    pub fn create(
        conn: &Connection,
        project_id: &str,
        name: &str,
        color_hex: &str,
        track_order: i64,
    ) -> Result<Self, CadenceError> {
        Self::validate(name, color_hex, track_order)?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let is_muted = false;

        conn.execute(
            "INSERT INTO tracks (id, project_id, name, color_hex, track_order, is_muted, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![&id, project_id, name, color_hex, track_order, 0, now],
        )?;

        Ok(Self {
            id,
            project_id: project_id.to_string(),
            name: name.to_string(),
            color_hex: color_hex.to_string(),
            track_order,
            is_muted,
            created_at: now,
        })
    }

    /// Retrieves a `Track` by ID.
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Self, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, color_hex, track_order, is_muted, created_at FROM tracks WHERE id = ?1",
        )?;
        let mut rows = stmt.query(rusqlite::params![id])?;
        if let Some(row) = rows.next()? {
            let is_muted_int: i64 = row.get(5)?;
            Ok(Self {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                color_hex: row.get(3)?,
                track_order: row.get(4)?,
                is_muted: is_muted_int != 0,
                created_at: row.get(6)?,
            })
        } else {
            Err(CadenceError::NotFound(format!("Track '{id}' not found")))
        }
    }

    /// Lists all tracks belonging to a project, ordered by `track_order ASC, created_at ASC`.
    pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, color_hex, track_order, is_muted, created_at FROM tracks WHERE project_id = ?1 ORDER BY track_order ASC, created_at ASC",
        )?;
        let track_iter = stmt.query_map(rusqlite::params![project_id], |row| {
            let is_muted_int: i64 = row.get(5)?;
            Ok(Self {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                color_hex: row.get(3)?,
                track_order: row.get(4)?,
                is_muted: is_muted_int != 0,
                created_at: row.get(6)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }
        Ok(tracks)
    }

    /// Updates the muted state of a track by ID.
    pub fn set_muted(conn: &Connection, id: &str, is_muted: bool) -> Result<(), CadenceError> {
        let rows = conn.execute(
            "UPDATE tracks SET is_muted = ?1 WHERE id = ?2",
            rusqlite::params![if is_muted { 1 } else { 0 }, id],
        )?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Track '{id}' not found")));
        }
        Ok(())
    }

    /// Updates the display order of a track with invariant enforcement (`new_order >= 0`).
    pub fn update_order(conn: &Connection, id: &str, new_order: i64) -> Result<(), CadenceError> {
        if new_order < 0 {
            return Err(CadenceError::Validation(format!(
                "Track order must be non-negative, got {new_order}"
            )));
        }
        let rows = conn.execute(
            "UPDATE tracks SET track_order = ?1 WHERE id = ?2",
            rusqlite::params![new_order, id],
        )?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Track '{id}' not found")));
        }
        Ok(())
    }

    /// Deletes a track by ID. Returns error if foreign key RESTRICT is triggered by scenes.
    pub fn delete(conn: &Connection, id: &str) -> Result<(), CadenceError> {
        let rows = conn.execute("DELETE FROM tracks WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Track '{id}' not found")));
        }
        Ok(())
    }
}
