pub mod domain;
pub mod error;
pub mod export;
pub mod storage;
pub mod sweep;

pub use domain::{
    compute_topological_ranks, retry_on_conflict, Project, ReadingAnchor, Scene, Track,
    DEFAULT_TRACK_COLOR,
};
pub use error::CadenceError;
pub use export::{export_markdown, export_markdown_to_file, MarkdownExportOptions};
pub use storage::Database;
pub use sweep::{
    assemble_project, assemble_scenes, assemble_scenes_with_ranks, AssembledScene, SceneSweepKey,
};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
