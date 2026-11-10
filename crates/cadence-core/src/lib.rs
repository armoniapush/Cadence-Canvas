pub mod domain;
pub mod error;
pub mod export;
pub mod metrics;
pub mod storage;
pub mod sweep;
pub mod world;

pub use domain::{
    compute_topological_ranks, retry_on_conflict, Project, ReadingAnchor, Scene, Track,
    DEFAULT_TRACK_COLOR,
};
pub use error::CadenceError;
pub use export::{
    export_docx, export_docx_to_file, export_markdown, export_markdown_to_file, DocxExportOptions,
    MarkdownExportOptions,
};
pub use metrics::{
    compute_project_cadence, compute_scene_histogram, compute_tonal_histogram, TonalHistogram,
};
pub use storage::Database;
pub use sweep::{
    assemble_project, assemble_scenes, assemble_scenes_with_ranks, AssembledScene, SceneSweepKey,
};
pub use world::{
    audit_temporal_causality, extract_entity_ego_graph, scan_all_candidates, scan_known_mentions,
    scan_untracked_candidates, sync_scene_mentions, AnachronismIssue, CandidateMention, EgoGraph,
    EntityType, GraphEdge, GraphNode, LoreEntity, MentionScanner, MentionSpan,
};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
