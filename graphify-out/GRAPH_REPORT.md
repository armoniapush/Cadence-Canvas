# Graph Report - .  (2026-11-10)

## Corpus Check
- Large corpus: 160 files · ~1,002,784 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 554 nodes · 1046 edges · 62 communities (35 shown, 27 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Manuscript Binder & Navigation|Manuscript Binder & Navigation]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Manuscript Binder & Navigation|Manuscript Binder & Navigation]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Rust Core & Tauri IPC Bridge|Rust Core & Tauri IPC Bridge]]
- [[_COMMUNITY_compilerOptions Domain|compilerOptions Domain]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_Rust Core & Tauri IPC Bridge|Rust Core & Tauri IPC Bridge]]
- [[_COMMUNITY_ErrorBoundary Domain|ErrorBoundary Domain]]
- [[_COMMUNITY_default.json Domain|default.json Domain]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_FONT_MONO Domain|FONT_MONO Domain]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Rust Core & Tauri IPC Bridge|Rust Core & Tauri IPC Bridge]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Atomic Editor & Prose Cadence|Atomic Editor & Prose Cadence]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Manuscript Binder & Navigation|Manuscript Binder & Navigation]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Manuscript Binder & Navigation|Manuscript Binder & Navigation]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_React Bits & Glow Design System|React Bits & Glow Design System]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Engineering Tasks & Specifications|Engineering Tasks & Specifications]]
- [[_COMMUNITY_Manuscript Binder & Navigation|Manuscript Binder & Navigation]]
- [[_COMMUNITY_DAW Canvas & Narrative Timeline|DAW Canvas & Narrative Timeline]]

## God Nodes (most connected - your core abstractions)
1. `compute_tonal_histogram()` - 22 edges
2. `assemble_project()` - 22 edges
3. `isTauri()` - 20 edges
4. `Scene` - 20 edges
5. `String` - 19 edges
6. `Result` - 19 edges
7. `test_ipc_commands_lifecycle()` - 19 edges
8. `Scene` - 17 edges
9. `compilerOptions` - 16 edges
10. `Result` - 15 edges

## Surprising Connections (you probably didn't know these)
- `export_docx()` --calls--> `export_docx_to_file()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/export/docx.rs
- `export_markdown()` --calls--> `export_markdown_to_file()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/export/markdown.rs
- `compute_tonal_metrics()` --calls--> `compute_tonal_histogram()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/metrics/tonal.rs
- `assemble_manuscript()` --calls--> `assemble_project()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/sweep/mod.rs
- `export_docx()` --calls--> `assemble_project()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/sweep/mod.rs

## Import Cycles
- 1-file cycle: `crates/cadence-core/src/domain/anchor.rs -> crates/cadence-core/src/domain/anchor.rs`
- 1-file cycle: `crates/cadence-core/src/domain/project.rs -> crates/cadence-core/src/domain/project.rs`
- 1-file cycle: `crates/cadence-core/src/domain/scene.rs -> crates/cadence-core/src/domain/scene.rs`
- 1-file cycle: `crates/cadence-core/src/domain/track.rs -> crates/cadence-core/src/domain/track.rs`
- 1-file cycle: `crates/cadence-core/src/export/docx.rs -> crates/cadence-core/src/export/docx.rs`
- 1-file cycle: `crates/cadence-core/src/export/markdown.rs -> crates/cadence-core/src/export/markdown.rs`
- 1-file cycle: `crates/cadence-core/src/metrics/tonal.rs -> crates/cadence-core/src/metrics/tonal.rs`
- 1-file cycle: `crates/cadence-core/src/storage/db.rs -> crates/cadence-core/src/storage/db.rs`
- 1-file cycle: `crates/cadence-core/src/sweep/mod.rs -> crates/cadence-core/src/sweep/mod.rs`
- 1-file cycle: `crates/cadence-core/src/world/ego_graph.rs -> crates/cadence-core/src/world/ego_graph.rs`
- 1-file cycle: `crates/cadence-core/src/world/entity.rs -> crates/cadence-core/src/world/entity.rs`
- 1-file cycle: `crates/cadence-core/src/world/mentions.rs -> crates/cadence-core/src/world/mentions.rs`
- 1-file cycle: `crates/cadence-core/src/world/validator.rs -> crates/cadence-core/src/world/validator.rs`

## Communities (62 total, 27 thin omitted)

### Community 0 - "Manuscript Binder & Navigation"
Cohesion: 0.07
Nodes (58): DawCanvasProps, CanvasRenderData, ContextMenuProps, ExportModal(), ExportModalProps, GlowButton(), GlowButtonProps, GlowButtonVariant (+50 more)

### Community 1 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.08
Nodes (31): DawCanvas(), CardHeaderLayout, computeCardHeaderLayout(), computeFitViewport(), computeMagneticSnap(), DawCanvasRenderer, DragState, DRAMATIC_ACT_ZONES (+23 more)

### Community 2 - "Manuscript Binder & Navigation"
Cohesion: 0.18
Nodes (32): AnachronismIssue, EgoGraph, ReadingAnchor, assemble_manuscript(), audit_timeline(), bump_scene_version(), compute_tonal_metrics(), create_anchor() (+24 more)

### Community 3 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.18
Nodes (15): CadenceError, Connection, Error, Result, Row, Self, String, Vec (+7 more)

### Community 4 - "Atomic Editor & Prose Cadence"
Cohesion: 0.13
Nodes (28): CadenceError, Connection, Default, LoreEntity, Result, Self, String, Vec (+20 more)

### Community 5 - "Atomic Editor & Prose Cadence"
Cohesion: 0.16
Nodes (15): CadenceError, Connection, Error, Option, Result, Row, Self, String (+7 more)

### Community 6 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.13
Nodes (22): CadenceError, Connection, HashMap, Result, Scene, Self, String, Track (+14 more)

### Community 7 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.12
Nodes (22): Commands, CadenceError, Result, main(), AssembledScene, CadenceError, Default, P (+14 more)

### Community 8 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.12
Nodes (22): CadenceError, Connection, EntityType, Option, Result, String, Vec, CadenceError (+14 more)

### Community 9 - "Atomic Editor & Prose Cadence"
Cohesion: 0.16
Nodes (14): CadenceError, Connection, HashMap, Result, Row, Self, String, Vec (+6 more)

### Community 10 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.21
Nodes (15): CadenceError, Connection, EntityType, LoreEntity, Option, Result, String, Vec (+7 more)

### Community 11 - "Rust Core & Tauri IPC Bridge"
Cohesion: 0.09
Nodes (21): dependencies, lucide-react, react, react-dom, @tauri-apps/api, devDependencies, @types/node, @types/react (+13 more)

### Community 12 - "compilerOptions Domain"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 13 - "DAW Canvas & Narrative Timeline"
Cohesion: 0.34
Nodes (7): CadenceError, Connection, Result, Self, String, Vec, Track

### Community 14 - "Atomic Editor & Prose Cadence"
Cohesion: 0.29
Nodes (7): CadenceError, Connection, P, Result, Self, String, Database

### Community 15 - "Atomic Editor & Prose Cadence"
Cohesion: 0.25
Nodes (12): AssembledScene, CadenceError, Default, P, Project, Result, Self, String (+4 more)

### Community 16 - "Atomic Editor & Prose Cadence"
Cohesion: 0.36
Nodes (7): CadenceError, Connection, Result, Self, String, Vec, Project

### Community 17 - "Rust Core & Tauri IPC Bridge"
Cohesion: 0.22
Nodes (8): app, windows, build, frontendDist, identifier, productName, $schema, version

### Community 18 - "ErrorBoundary Domain"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 19 - "default.json Domain"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

## Knowledge Gaps
- **145 isolated node(s):** `Commands`, `Commands`, `ExportCommands`, `ProjectCommands`, `TrackCommands` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `assemble_project()` connect `DAW Canvas & Narrative Timeline` to `Atomic Editor & Prose Cadence`, `Manuscript Binder & Navigation`, `Atomic Editor & Prose Cadence`, `DAW Canvas & Narrative Timeline`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `compute_project_cadence()` connect `Atomic Editor & Prose Cadence` to `DAW Canvas & Narrative Timeline`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `compute_tonal_histogram()` connect `Atomic Editor & Prose Cadence` to `Manuscript Binder & Navigation`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `compute_tonal_histogram()` (e.g. with `compute_tonal_metrics()` and `test_cadence_variance_calculation()`) actually correct?**
  _`compute_tonal_histogram()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `assemble_project()` (e.g. with `compute_project_cadence()` and `assemble_manuscript()`) actually correct?**
  _`assemble_project()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Commands`, `Commands`, `ExportCommands` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Manuscript Binder & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.06701754385964913 - nodes in this community are weakly interconnected._