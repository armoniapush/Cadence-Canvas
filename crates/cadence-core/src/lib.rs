pub mod error;
pub mod storage;

pub use error::CadenceError;
pub use storage::Database;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
