use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;

/// Represents a scene block positioned on a narrative track in 2D space.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    pub track_id: String,
    pub t_start: i64,
    pub duration: i64,
    pub z_index: i64,
    pub title: String,
    pub text: String,
    pub word_count: i64,
    pub char_count: i64,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Scene {
    /// Validates that title is not empty or whitespace only.
    pub fn validate_title(title: &str) -> Result<(), CadenceError> {
        if title.trim().is_empty() {
            return Err(CadenceError::Validation(
                "Scene title cannot be empty".to_string(),
            ));
        }
        Ok(())
    }

    /// Validates spatial invariants: t_start >= 0 and duration > 0.
    pub fn validate_spatial(t_start: i64, duration: i64) -> Result<(), CadenceError> {
        if t_start < 0 {
            return Err(CadenceError::Validation(format!(
                "Scene t_start must be non-negative (>= 0), got {t_start}"
            )));
        }
        if duration <= 0 {
            return Err(CadenceError::Validation(format!(
                "Scene duration must be positive (> 0), got {duration}"
            )));
        }
        Ok(())
    }

    /// Validates all scene invariants simultaneously.
    pub fn validate(title: &str, t_start: i64, duration: i64) -> Result<(), CadenceError> {
        Self::validate_title(title)?;
        Self::validate_spatial(t_start, duration)?;
        Ok(())
    }

    /// Automatically computes (word_count, char_count) from given text.
    pub fn compute_counts(text: &str) -> (i64, i64) {
        let words = text.split_whitespace().count() as i64;
        let chars = text.chars().count() as i64;
        (words, chars)
    }

    /// Creates and persists a new scene with initial version = 1.
    pub fn create(
        conn: &Connection,
        track_id: &str,
        t_start: i64,
        duration: i64,
        z_index: i64,
        title: &str,
        text: &str,
    ) -> Result<Self, CadenceError> {
        Self::validate(title, t_start, duration)?;
        let (word_count, char_count) = Self::compute_counts(text);
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let version = 1;

        conn.execute(
            "INSERT INTO scenes (id, track_id, t_start, duration, z_index, title, text, word_count, char_count, version, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![
                &id,
                track_id,
                t_start,
                duration,
                z_index,
                title,
                text,
                word_count,
                char_count,
                version,
                now,
                now,
            ],
        )?;

        Ok(Self {
            id,
            track_id: track_id.to_string(),
            t_start,
            duration,
            z_index,
            title: title.to_string(),
            text: text.to_string(),
            word_count,
            char_count,
            version,
            created_at: now,
            updated_at: now,
        })
    }

    /// Convenience helper to create a scene with default z_index = 0.
    pub fn create_with_defaults(
        conn: &Connection,
        track_id: &str,
        t_start: i64,
        duration: i64,
        title: &str,
        text: &str,
    ) -> Result<Self, CadenceError> {
        Self::create(conn, track_id, t_start, duration, 0, title, text)
    }

    /// Retrieves a scene by ID.
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Self, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, track_id, t_start, duration, z_index, title, text, word_count, char_count, version, created_at, updated_at \
             FROM scenes WHERE id = ?1",
        )?;
        let mut rows = stmt.query(rusqlite::params![id])?;
        if let Some(row) = rows.next()? {
            Ok(map_scene_row(row)?)
        } else {
            Err(CadenceError::NotFound(format!("Scene '{id}' not found")))
        }
    }

    /// Lists all scenes on a specific track, ordered by t_start ASC, z_index ASC, created_at ASC.
    pub fn list_by_track(conn: &Connection, track_id: &str) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, track_id, t_start, duration, z_index, title, text, word_count, char_count, version, created_at, updated_at \
             FROM scenes WHERE track_id = ?1 ORDER BY t_start ASC, z_index ASC, created_at ASC",
        )?;
        let scene_iter = stmt.query_map(rusqlite::params![track_id], map_scene_row)?;
        let mut scenes = Vec::new();
        for scene in scene_iter {
            scenes.push(scene?);
        }
        Ok(scenes)
    }

    /// Lists all scenes in a project across all tracks, ordered by tracks.track_order ASC, t_start ASC, z_index ASC.
    pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT s.id, s.track_id, s.t_start, s.duration, s.z_index, s.title, s.text, s.word_count, s.char_count, s.version, s.created_at, s.updated_at \
             FROM scenes s \
             INNER JOIN tracks t ON s.track_id = t.id \
             WHERE t.project_id = ?1 \
             ORDER BY t.track_order ASC, s.t_start ASC, s.z_index ASC, s.created_at ASC",
        )?;
        let scene_iter = stmt.query_map(rusqlite::params![project_id], map_scene_row)?;
        let mut scenes = Vec::new();
        for scene in scene_iter {
            scenes.push(scene?);
        }
        Ok(scenes)
    }

    /// Updates title and text under optimistic concurrency control (OCC).
    /// Increments version by 1 and recomputes word/char counts.
    pub fn update_content(
        conn: &Connection,
        id: &str,
        expected_version: i64,
        new_title: &str,
        new_text: &str,
    ) -> Result<Self, CadenceError> {
        Self::validate_title(new_title)?;
        let (word_count, char_count) = Self::compute_counts(new_text);
        let now = chrono::Utc::now().timestamp();

        let rows = conn.execute(
            "UPDATE scenes SET title = ?1, text = ?2, word_count = ?3, char_count = ?4, version = version + 1, updated_at = ?5 \
             WHERE id = ?6 AND version = ?7",
            rusqlite::params![new_title, new_text, word_count, char_count, now, id, expected_version],
        )?;

        if rows == 0 {
            return check_conflict_or_not_found(conn, id, expected_version);
        }

        Self::get_by_id(conn, id)
    }

    /// Moves scene coordinates (track_id, t_start, duration) under optimistic concurrency control (OCC).
    /// Spatial repositioning on the canvas DOES NOT increment the literary draft version.
    /// Validates spatial invariants before updating.
    pub fn move_coordinates(
        conn: &Connection,
        id: &str,
        expected_version: i64,
        new_track_id: &str,
        new_t_start: i64,
        new_duration: i64,
    ) -> Result<Self, CadenceError> {
        Self::validate_spatial(new_t_start, new_duration)?;
        let now = chrono::Utc::now().timestamp();

        let rows = conn.execute(
            "UPDATE scenes SET track_id = ?1, t_start = ?2, duration = ?3, updated_at = ?4 \
             WHERE id = ?5 AND version = ?6",
            rusqlite::params![new_track_id, new_t_start, new_duration, now, id, expected_version],
        )?;

        if rows == 0 {
            return check_conflict_or_not_found(conn, id, expected_version);
        }

        Self::get_by_id(conn, id)
    }

    /// Explicitly creates a new draft revision (bumps version by 1) on demand.
    pub fn bump_version(
        conn: &Connection,
        id: &str,
        expected_version: i64,
    ) -> Result<Self, CadenceError> {
        let now = chrono::Utc::now().timestamp();
        let rows = conn.execute(
            "UPDATE scenes SET version = version + 1, updated_at = ?1 \
             WHERE id = ?2 AND version = ?3",
            rusqlite::params![now, id, expected_version],
        )?;

        if rows == 0 {
            return check_conflict_or_not_found(conn, id, expected_version);
        }

        Self::get_by_id(conn, id)
    }

    /// Deletes a scene by ID.
    pub fn delete(conn: &Connection, id: &str) -> Result<(), CadenceError> {
        let rows = conn.execute("DELETE FROM scenes WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Scene '{id}' not found")));
        }
        Ok(())
    }
}

/// Helper function to detect whether an OCC update missed due to version conflict or non-existent entity.
fn check_conflict_or_not_found(
    conn: &Connection,
    id: &str,
    expected_version: i64,
) -> Result<Scene, CadenceError> {
    let mut stmt = conn.prepare("SELECT version FROM scenes WHERE id = ?1")?;
    let mut rows = stmt.query(rusqlite::params![id])?;
    if let Some(row) = rows.next()? {
        let actual: i64 = row.get(0)?;
        Err(CadenceError::StaleMutationConflict {
            id: id.to_string(),
            expected: expected_version,
            actual,
        })
    } else {
        Err(CadenceError::NotFound(format!("Scene '{id}' not found")))
    }
}

fn map_scene_row(row: &rusqlite::Row) -> Result<Scene, rusqlite::Error> {
    Ok(Scene {
        id: row.get(0)?,
        track_id: row.get(1)?,
        t_start: row.get(2)?,
        duration: row.get(3)?,
        z_index: row.get(4)?,
        title: row.get(5)?,
        text: row.get(6)?,
        word_count: row.get(7)?,
        char_count: row.get(8)?,
        version: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

/// Helper to retry an operation if it fails with a `StaleMutationConflict`.
pub fn retry_on_conflict<T, F>(mut max_retries: usize, mut operation: F) -> Result<T, CadenceError>
where
    F: FnMut() -> Result<T, CadenceError>,
{
    loop {
        match operation() {
            Err(CadenceError::StaleMutationConflict { .. }) if max_retries > 0 => {
                max_retries -= 1;
            }
            other => return other,
        }
    }
}
