use std::path::Path;
use rusqlite::Connection;
use crate::error::CadenceError;
use super::schema::{PRAGMAS, SCHEMA_V1};

/// Single-file SQLite `.cadence` database handle with WAL mode and strict invariants.
#[derive(Debug)]
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Opens or creates a `.cadence` SQLite database file at `path`,
    /// enforces mandatory PRAGMAs (WAL, busy_timeout 5000, synchronous NORMAL, foreign_keys ON),
    /// and idempotently ensures DDL v1 schema existence.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, CadenceError> {
        let path_ref = path.as_ref();
        if let Some(parent) = path_ref.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)?;
            }
        }

        let conn = Connection::open(path_ref)?;
        Self::initialize_connection(conn)
    }

    /// Opens an in-memory SQLite database initialized with schema v1 (useful for fast unit tests).
    pub fn open_in_memory() -> Result<Self, CadenceError> {
        let conn = Connection::open_in_memory()?;
        Self::initialize_connection(conn)
    }

    fn initialize_connection(conn: Connection) -> Result<Self, CadenceError> {
        conn.busy_timeout(std::time::Duration::from_millis(5000))?;
        conn.execute_batch(PRAGMAS)?;
        conn.execute_batch(SCHEMA_V1)?;

        Ok(Self { conn })
    }

    /// Access the underlying rusqlite `Connection`.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// Mutably access the underlying rusqlite `Connection`.
    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// Consume this wrapper and return the raw rusqlite `Connection`.
    pub fn into_inner(self) -> Connection {
        self.conn
    }

    /// Runs SQLite `PRAGMA integrity_check;` and returns the status string (e.g., "ok").
    pub fn integrity_check(&self) -> Result<String, CadenceError> {
        let result: String = self.conn.query_row("PRAGMA integrity_check;", [], |row| row.get(0))?;
        Ok(result)
    }
}
