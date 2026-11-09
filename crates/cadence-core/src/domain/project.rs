use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;

/// Strongly typed entity representing a narrative project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub author: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub meta_json: String,
}

impl Project {
    /// Validates project causal invariants:
    /// - Title cannot be empty or whitespace only.
    pub fn validate(title: &str) -> Result<(), CadenceError> {
        if title.trim().is_empty() {
            return Err(CadenceError::Validation(
                "Project title cannot be empty".to_string(),
            ));
        }
        Ok(())
    }

    /// Creates and persists a new `Project` in SQLite.
    pub fn create(conn: &Connection, title: &str, author: &str) -> Result<Self, CadenceError> {
        Self::validate(title)?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let meta_json = "{}".to_string();

        conn.execute(
            "INSERT INTO projects (id, title, author, created_at, updated_at, meta_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![&id, title, author, now, now, &meta_json],
        )?;

        Ok(Self {
            id,
            title: title.to_string(),
            author: author.to_string(),
            created_at: now,
            updated_at: now,
            meta_json,
        })
    }

    /// Retrieves a `Project` by its unique identifier.
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Self, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, title, author, created_at, updated_at, meta_json FROM projects WHERE id = ?1",
        )?;
        let mut rows = stmt.query(rusqlite::params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Self {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                meta_json: row.get(5)?,
            })
        } else {
            Err(CadenceError::NotFound(format!("Project '{id}' not found")))
        }
    }

    /// Lists all projects ordered by creation time ascending.
    pub fn list(conn: &Connection) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare(
            "SELECT id, title, author, created_at, updated_at, meta_json FROM projects ORDER BY created_at ASC",
        )?;
        let proj_iter = stmt.query_map([], |row| {
            Ok(Self {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                meta_json: row.get(5)?,
            })
        })?;

        let mut projects = Vec::new();
        for proj in proj_iter {
            projects.push(proj?);
        }
        Ok(projects)
    }

    /// Deletes a project by ID (cascades to child tracks, scenes, and lore entities).
    pub fn delete(conn: &Connection, id: &str) -> Result<(), CadenceError> {
        let rows = conn.execute("DELETE FROM projects WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("Project '{id}' not found")));
        }
        Ok(())
    }
}
