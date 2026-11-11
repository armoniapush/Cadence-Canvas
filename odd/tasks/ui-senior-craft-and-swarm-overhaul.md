# ODD Specification: Senior UI/UX Overhaul & Multi-Agent Swarm Refinements

- **Task ID**: `ui-senior-craft-and-swarm-overhaul`
- **Feature**: Senior UI/UX Transformation: Canvas Text Collision Fix, Unified Left Navigator (Anti-Squeeze), Progressive Disclosure Tonal HUD, Tabular Monospace Typography, and Professional Matte Aesthetic.
- **Author**: Antigravity Coordinator & Specialized Swarm
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/App.tsx`, `ui/src/components/ManuscriptBinder.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/src/editor/TonalHud.tsx`, `ui/src/index.css`, `ui/tests/`)

---

## 1. Problem Statement & Root Cause Analysis

1. **Card Header Title Overlap & Collision Bug (User Image Evidence)**:
   - In `ui/src/canvas/renderer.ts` (L560-578), `trkName` ("Hilo C: Revelación del Oráculo") is drawn without measuring available width against right-aligned telemetry `metaStr` ("0 pal · ~1 min"). When track names or scene indices exceed 14 characters, text collides and renders on top of the reading metrics.
   - Root Cause: No dynamic measurement or truncation (`ctx.measureText` + ellipsis clamp) in the card header row.

2. **The "Three-Panel Squeeze" Spatial Collapse**:
   - Left Dock (260px) and Manuscript Binder (300px) open side-by-side as two independent sidebars on the left, consuming 560px. Combined with the Atomic Editor (420px), chrome consumes 1040px+, reducing the central timeline canvas to <320px.
   - Root Cause: Lack of a unified single left navigation drawer with segmented tabs.

3. **Editor Cockpit Syndrome & Cognitive Distraction**:
   - In `ui/src/editor/TonalHud.tsx` and `AtomicEditor.tsx`, the Gary Provost sentence histogram and voice distribution bars consume ~280px of vertical space, shifting every 200ms directly in the writer's peripheral vision.
   - Root Cause: Lack of progressive disclosure (should be a clean 28px summary bar with expandable analytics drawer).

4. **Broken Monospace Typography & Tabular Alignment**:
   - In `ui/src/index.css` and `renderer.ts`, `--font-mono` is incorrectly mapped to `Plus Jakarta Sans` instead of `'JetBrains Mono'`. Number indicators, timecodes, and version tags jitter without tabular numeral spacing.

---

## 2. Implementation Slices

- **Slice 1**: Canvas Senior Rendering & Dynamic Text Truncation (`renderer.ts`, `DawCanvas.tsx`)
  - Strict bounding box clipping and dynamic ellipsis truncation in `drawSceneCard` header row.
  - Constrain `trkName` to `Math.max(40, scnW - metaStrW - 48)` so text NEVER overlaps telemetry.
  - Activate sleek 24px narrative beat ruler (`RULER_HEIGHT = 24`) displaying Act I, Act II, Clímax.
- **Slice 2**: Unified Left Navigation Drawer (`App.tsx`, `ManuscriptBinder.tsx`)
  - Merge Estructura de Arco and Manuscript Binder into a single pro 320px left sidebar with segmented tabs: `[ ☵ Binder ]` · `[ ☱ Estructura ]` · `[ 📊 Metas ]`.
  - Auto-collapse drawer on viewport < 1440px when Atomic Editor opens.
- **Slice 3**: Progressive Disclosure & Senior Editorial Workspace (`TonalHud.tsx`, `AtomicEditor.tsx`)
  - Compact 28px status summary with toggle button for full Gary Provost histogram and voice ribbon.
  - Soft matte typography (`#e2e8f0` text on `#11141e` canvas, 16px Newsreader serif, 1.75 line-height).
- **Slice 4**: Senior Design Tokens & Monospace Tabular Numerals (`index.css`)
  - Anchor `--font-mono` and `FONT_MONO` to `'JetBrains Mono', monospace`.
  - Add senior text truncation utility rules and consistent matte borders.
