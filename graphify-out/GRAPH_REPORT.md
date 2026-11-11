# Graph Report - C:\Users\armon\DEV\Cadence-Canvas  (2026-11-11)

## Corpus Check
- 102 files · ~75,525 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 595 nodes · 1062 edges · 63 communities (36 shown, 27 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CLI Entrypoint & Commands|CLI Entrypoint & Commands]]
- [[_COMMUNITY_Rust Error Types & SQLite Rows|Rust Error Types & SQLite Rows]]
- [[_COMMUNITY_Project Model|Project Model]]
- [[_COMMUNITY_Rust Error Types & SQLite Rows|Rust Error Types & SQLite Rows]]
- [[_COMMUNITY_Track Model|Track Model]]
- [[_COMMUNITY_CadenceError Domain|CadenceError Domain]]
- [[_COMMUNITY_Project Model|Project Model]]
- [[_COMMUNITY_Rust Domain Models & Errors|Rust Domain Models & Errors]]
- [[_COMMUNITY_Database Layer|Database Layer]]
- [[_COMMUNITY_Rust Scene & Track Models|Rust Scene & Track Models]]
- [[_COMMUNITY_Rust Entity & Lore Models|Rust Entity & Lore Models]]
- [[_COMMUNITY_Rust Error Types & SQLite Rows|Rust Error Types & SQLite Rows]]
- [[_COMMUNITY_Lore Entity Models|Lore Entity Models]]
- [[_COMMUNITY_Tauri Permissions|Tauri Permissions]]
- [[_COMMUNITY_Tauri Commands & Manuscript Assembly|Tauri Commands & Manuscript Assembly]]
- [[_COMMUNITY_Tauri App Config|Tauri App Config]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Binder, Modals & Context Menu|Binder, Modals & Context Menu]]
- [[_COMMUNITY_Error Boundary & Bootstrap|Error Boundary & Bootstrap]]
- [[_COMMUNITY_Canvas Renderer & Timeline Geometry|Canvas Renderer & Timeline Geometry]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Radical Aesthetic Overhaul Spec|Radical Aesthetic Overhaul Spec]]
- [[_COMMUNITY_Narrative Station Core Spec|Narrative Station Core Spec]]
- [[_COMMUNITY_Narrative Station UI Spec|Narrative Station UI Spec]]
- [[_COMMUNITY_Senior Craft Elevation Spec|Senior Craft Elevation Spec]]
- [[_COMMUNITY_Timeline Drag Crash Spec|Timeline Drag Crash Spec]]
- [[_COMMUNITY_DragEditor Decoupling Spec|Drag/Editor Decoupling Spec]]
- [[_COMMUNITY_UI Ergonomics Spec|UI Ergonomics Spec]]
- [[_COMMUNITY_AHORA Bar Removal Spec|AHORA Bar Removal Spec]]
- [[_COMMUNITY_Binder Footer Cutoff Spec|Binder Footer Cutoff Spec]]
- [[_COMMUNITY_Header Actions Spec|Header Actions Spec]]
- [[_COMMUNITY_Headless Magnetic Engine Spec|Headless Magnetic Engine Spec]]
- [[_COMMUNITY_Headless Magnetism Spec|Headless Magnetism Spec]]
- [[_COMMUNITY_Hero Chapter Numeral Spec|Hero Chapter Numeral Spec]]
- [[_COMMUNITY_LinearRaycast Craft Spec|Linear/Raycast Craft Spec]]
- [[_COMMUNITY_Narrative Timeline Redesign Spec|Narrative Timeline Redesign Spec]]
- [[_COMMUNITY_Phase 1 Core Fixes Spec|Phase 1 Core Fixes Spec]]
- [[_COMMUNITY_Pinterest & Orion Art Direction Spec|Pinterest & Orion Art Direction Spec]]
- [[_COMMUNITY_React Bits Glow Buttons Spec|React Bits Glow Buttons Spec]]
- [[_COMMUNITY_Hardcoded Acts Removal Spec|Hardcoded Acts Removal Spec]]
- [[_COMMUNITY_Unneeded Clutter Removal Spec|Unneeded Clutter Removal Spec]]
- [[_COMMUNITY_Senior Craft Anti-Slop Spec|Senior Craft Anti-Slop Spec]]
- [[_COMMUNITY_Swarm Refinements Spec|Swarm Refinements Spec]]
- [[_COMMUNITY_Stitch Motion Tokens Spec|Stitch Motion Tokens Spec]]
- [[_COMMUNITY_Stylized Binder Spec|Stylized Binder Spec]]
- [[_COMMUNITY_Magnetic Snapping Spec|Magnetic Snapping Spec]]
- [[_COMMUNITY_Font Constants|Font Constants]]
- [[_COMMUNITY_Workspace Shell & Scene Handlers|Workspace Shell & Scene Handlers]]

## God Nodes (most connected - your core abstractions)
1. `compute_tonal_histogram()` - 22 edges
2. `assemble_project()` - 22 edges
3. `isTauri()` - 20 edges
4. `String` - 19 edges
5. `Result` - 19 edges
6. `test_ipc_commands_lifecycle()` - 19 edges
7. `Scene` - 17 edges
8. `compilerOptions` - 16 edges
9. `Result` - 15 edges
10. `CadenceError` - 15 edges

## Surprising Connections (you probably didn't know these)
- `renderDawCanvas (lanes, Bézier wires, scene cards, ruler)` --implements--> `S3 Scene Card Anatomy (no stacked hero numerals)`  [EXTRACTED]
  ui/src/canvas/renderer.ts → odd/tasks/ui-stitch-definitive-standard.md
- `renderDawCanvas (lanes, Bézier wires, scene cards, ruler)` --implements--> `S4 Vector Causal Connectors (Bézier wires from 6px ports)`  [EXTRACTED]
  ui/src/canvas/renderer.ts → odd/tasks/ui-stitch-definitive-standard.md
- `Entity mention quick badges (@Personaje, #Lugar, !Objeto)` --conceptually_related_to--> `S6 Typography and Global Design Tokens`  [INFERRED]
  ui/src/editor/AtomicEditor.tsx → odd/tasks/ui-stitch-definitive-standard.md
- `Decision: canvas geometry stays as drawing primitives` --rationale_for--> `Canvas geometry constants (RULER_HEIGHT, TRACK_HEADER_WIDTH, TRACK_HEIGHT, TRACK_GAP, CANVAS_TOP_PAD, PIXELS_PER_UNIT)`  [EXTRACTED]
  odd/tasks/ui-stitch-definitive-standard.md → ui/src/canvas/renderer.ts
- `export_docx()` --calls--> `export_docx_to_file()`  [INFERRED]
  src-tauri/src/commands.rs → crates/cadence-core/src/export/docx.rs

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

## Hyperedges (group relationships)
- **Canvas frame render pipeline (state snapshot to rAF paint)** — dawcanvas_dawcanvas, dawcanvas_state_ref, renderer_dawcanvasrenderer, renderer_renderdawcanvas, renderer_getscenerect [EXTRACTED 1.00]
- **Scene drag commit flow (hit test, magnet snap, anti-collision, server move)** — dawcanvas_pointer_pipeline, renderer_computemagneticsnap, renderer_resolvesceneanticollision, app_handlemovescene [EXTRACTED 1.00]
- **Stitch/Linear definitive visual contract implementation across UI surfaces** — ui-stitch-definitive-standard_stitch_standard, app_app, dawcanvas_track_header_lanes, renderer_renderdawcanvas, manuscriptbinder_manuscriptbinder [INFERRED 0.85]

## Communities (63 total, 27 thin omitted)

### Community 8 - "CLI Entrypoint & Commands"
Cohesion: 0.12
Nodes (22): Cli, Commands, Commands, ExportCommands, ProjectCommands, TrackCommands, SceneCommands, run() (+14 more)

### Community 10 - "Rust Error Types & SQLite Rows"
Cohesion: 0.16
Nodes (14): ReadingAnchor, String, Connection, Result, Self, CadenceError, Vec, map_anchor_row() (+6 more)

### Community 17 - "Project Model"
Cohesion: 0.36
Nodes (7): Project, String, Result, CadenceError, Connection, Self, Vec

### Community 4 - "Rust Error Types & SQLite Rows"
Cohesion: 0.18
Nodes (15): Scene, String, Result, CadenceError, Connection, Self, Vec, check_conflict_or_not_found() (+7 more)

### Community 14 - "Track Model"
Cohesion: 0.34
Nodes (7): Track, String, Result, CadenceError, Connection, Self, Vec

### Community 16 - "Project Model"
Cohesion: 0.25
Nodes (12): DocxExportOptions, String, Default, Self, export_docx(), Project, AssembledScene, Result (+4 more)

### Community 5 - "Rust Domain Models & Errors"
Cohesion: 0.13
Nodes (28): TonalHistogram, Vec, Self, Default, SentenceState, is_verbum_dicendi(), is_action_verb(), is_monologue_marker() (+20 more)

### Community 15 - "Database Layer"
Cohesion: 0.29
Nodes (7): Database, Connection, P, Result, Self, CadenceError, String

### Community 7 - "Rust Scene & Track Models"
Cohesion: 0.13
Nodes (22): SceneSweepKey, String, Scene, Track, Self, AssembledScene, assemble_scenes_with_ranks(), Vec (+14 more)

### Community 9 - "Rust Entity & Lore Models"
Cohesion: 0.12
Nodes (22): GraphNode, String, EntityType, GraphEdge, EgoGraph, Vec, extract_entity_ego_graph(), Connection (+14 more)

### Community 6 - "Rust Error Types & SQLite Rows"
Cohesion: 0.16
Nodes (15): EntityType, Option, Self, Display, Formatter, Result, FromStr, Err (+7 more)

### Community 11 - "Lore Entity Models"
Cohesion: 0.21
Nodes (15): MentionSpan, Option, String, CandidateMention, EntityType, MentionScanner, LoreEntity, Vec (+7 more)

### Community 20 - "Tauri Permissions"
Cohesion: 0.33
Nodes (5): $schema, identifier, description, windows, permissions

### Community 3 - "Tauri Commands & Manuscript Assembly"
Cohesion: 0.18
Nodes (32): open_project(), String, Result, Project, list_tracks(), Vec, Track, create_track() (+24 more)

### Community 18 - "Tauri App Config"
Cohesion: 0.22
Nodes (8): $schema, productName, version, identifier, build, frontendDist, app, windows

### Community 12 - "Frontend Dependencies"
Cohesion: 0.09
Nodes (21): name, private, version, type, scripts, dev, build, preview (+13 more)

### Community 0 - "Binder, Modals & Context Menu"
Cohesion: 0.07
Nodes (53): ActMetric, DynamicMetricsResult, computeActMetrics(), isTauri(), mockState, openProject(), listTracks(), createTrack() (+45 more)

### Community 19 - "Error Boundary & Bootstrap"
Cohesion: 0.29
Nodes (3): Props, State, ErrorBoundary

### Community 1 - "Canvas Renderer & Timeline Geometry"
Cohesion: 0.06
Nodes (32): ReadingAnchor, DawCanvasProps, DawCanvas(), getEffectiveSceneDuration(), getEffectiveGapUnits(), resolveSceneAntiCollision(), NARRATIVE_LANDMARKS, NARRATIVE_LANDMARKS_SHORT (+24 more)

### Community 13 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, target, useDefineForClassFields, lib, module, skipLibCheck, moduleResolution, allowImportingTsExtensions (+9 more)

### Community 2 - "Workspace Shell & Scene Handlers"
Cohesion: 0.08
Nodes (44): UI Definitive Standard (Google Stitch / Linear / Figma), S1 Navbar Segmented Pill Control (amended by L2 to static view label), S2 Continuous Narrative Swimlanes, S3 Scene Card Anatomy (no stacked hero numerals), S4 Vector Causal Connectors (Bézier wires from 6px ports), S5 Manuscript Binder Side Panel, S6 Typography and Global Design Tokens, Decision: canvas geometry stays as drawing primitives (+36 more)

## Knowledge Gaps
- **157 isolated node(s):** `Commands`, `Commands`, `ExportCommands`, `ProjectCommands`, `TrackCommands` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `assemble_project()` connect `Rust Scene & Track Models` to `CLI Entrypoint & Commands`, `Rust Error Types & SQLite Rows`, `Tauri Commands & Manuscript Assembly`, `Rust Domain Models & Errors`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `compute_project_cadence()` connect `Rust Domain Models & Errors` to `Rust Scene & Track Models`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `compute_tonal_histogram()` connect `Rust Domain Models & Errors` to `Tauri Commands & Manuscript Assembly`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `compute_tonal_histogram()` (e.g. with `compute_tonal_metrics()` and `test_cadence_variance_calculation()`) actually correct?**
  _`compute_tonal_histogram()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `assemble_project()` (e.g. with `compute_project_cadence()` and `assemble_manuscript()`) actually correct?**
  _`assemble_project()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Commands`, `Commands`, `ExportCommands` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CLI Entrypoint & Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._