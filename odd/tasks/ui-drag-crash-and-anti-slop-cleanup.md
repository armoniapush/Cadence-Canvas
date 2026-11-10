# ODD Specification: Timeline Drag Crash Prevention & Anti-AI-Slop Matte Design System

- **Task ID**: `ui-drag-crash-and-anti-slop-cleanup`
- **Feature**: Timeline Drag Null Dereference Fix, Canvas Boundary & Pointer Capture Guard, Secondary ErrorBoundary, Technical Navigation Clutter Deletion, and Professional Matte Editorial Design System (Linear / Apple Pro grade).
- **Author**: Antigravity Worker
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/src/App.tsx`, `ui/src/index.css`, `ui/src/main.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/src/editor/TonalHud.tsx`, `DESIGN.md`)

---

## 1. Problem Statement & Root Cause Analysis

1. **Timeline Drag Black Screen Crash & Desync**:
   - In `ui/src/canvas/DawCanvas.tsx`, `handlePointerMove` previously accessed `panRef.current!.px` in asynchronous React `setViewport` callbacks, crashing React with an unhandled TypeError when pointerup cleared the ref.
   - Pointer capture was bound to `e.target` instead of `containerRef.current`, causing capture to leak or fail release when releasing outside the canvas or over child elements.
   - Canvas `stateRef.current` was updated only in `useEffect` (post-commit/paint), causing the 60fps RAF loop to render one frame late during active drags.
   - `DawCanvasRenderer.render()` had no exception guard; any unexpected render error fatally halted `requestAnimationFrame`.
   - `panY` had no lower bounds clamp (`Math.min(0, py + delta)` allowed panning to negative infinity, scrolling all tracks offscreen into total void).
   - Drop events for scene dragging relied on asynchronous `dragState` React state instead of synchronous coordinates on `dragRef`, risking dropped scene moves on fast drag releases.

2. **UX Technical Clutter Deletion**:
   - The user explicitly requested removing technical clutter that serves no purpose for narrative writing UX:
     1. The bottom `<footer>` status bar (`project.cadence · 2 hilos narrativos · 3 escenas | Puente IPC activo...`).
     2. The `● WAL Activo` status pill from the top header.
     3. The technical editable `project.cadence` input field and `Reconectar` button in the main header.

3. **Anti-AI-Slop & Professional Matte Design System**:
   - The UI previously relied on ubiquitous "AI slop" clichés: floating pill capsule header (`border-radius: 9999px`), glowing translucent buttons (`.pill-btn`), glowing card selection halos (`shadowBlur` and `rgba(99, 102, 241, 0.35)`), and neon Tailwind sky/indigo palettes.
   - The user requested:
     - Pure, matte, understated color palette (editorial cobalt, forest sage, warm ochre, terracotta, deep amethyst).
     - Rectangular pro-grade buttons (`border-radius: 6px`, solid confident fills).
     - Docked top application bar (grounded chrome with hairline border, no floating pill capsule).
     - Linear/macOS style segmented view switcher.
     - Formal design pattern and documentation in `DESIGN.md`.

---

## 2. Implementation Slices

- **Slice 1**: Robust Timeline Drag & Render Pipeline (`DawCanvas.tsx`, `renderer.ts`)
  - Capture on `containerRef.current`, release with `hasPointerCapture` guard.
  - Safe bounds clamping for `panY`.
  - Synchronous `stateRef.current` assignment during render.
  - `DawCanvasRenderer.render()` error isolation.
  - Scene movement tracking directly on `dragRef.current`.
- **Slice 2**: Inner `ErrorBoundary` for `DawCanvas` in `App.tsx` ensuring canvas isolation without window blanking.
- **Slice 3**: Removal of Navigation Clutter (raw database file input removed from main header, replaced with subtle pro project title).
- **Slice 4**: Pro Matte Design System & Tokens in `index.css`:
  - Solid, clean `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-accent` with 6px border-radius.
  - Grounded application header bar.
  - Professional segmented switch with 6px radius.
  - Pure matte palette without neon glows.
- **Slice 5**: Create `DESIGN.md` establishing the design tokens, rules, and anti-slop guidelines.
- **Slice 6**: Comprehensive test suite verification (`npm test --prefix ui`, `npm run build --prefix ui`, `cargo test --workspace`).
