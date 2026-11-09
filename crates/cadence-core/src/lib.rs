pub mod domain;
pub mod error;
pub mod storage;

pub use domain::{Project, Track, DEFAULT_TRACK_COLOR};
pub use error::CadenceError;
pub use storage::Database;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

