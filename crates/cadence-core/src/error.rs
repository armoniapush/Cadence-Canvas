use thiserror::Error;

/// Strongly typed domain and operational errors for Cadence Canvas.
#[derive(Error, Debug)]
pub enum CadenceError {
    #[error("Storage error: {0}")]
    Storage(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Optimistic concurrency conflict on scene '{id}': expected version {expected}, actual {actual}")]
    StaleMutationConflict {
        id: String,
        expected: i64,
        actual: i64,
    },

    #[error("Cyclic reading anchor detected from '{from}' to '{to}'")]
    CyclicAnchor {
        from: String,
        to: String,
    },

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Entity not found: {0}")]
    NotFound(String),
}
