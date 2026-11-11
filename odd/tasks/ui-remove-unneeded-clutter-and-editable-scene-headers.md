# ODD Specification: Elimination of Unneeded UI Clutter & Direct Inline Scene Title Editing

- **Task ID**: `ui-remove-unneeded-clutter-and-editable-scene-headers`
- **Feature**: Remove `● Sincronizado` header badge, remove floating bottom Stitch prompt bar & dock telemetry collision, and implement direct inline editable scene titles in canvas cards.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/tests/`)

---

## 1. Problem Statement & User Feedback Analysis

1. **Unneeded UI Elements (User Images 0 & 1)**:
   - **Image 0**: `● Sincronizado` green capsule in the main header: non-interactive technical noise.
   - **Image 1**: The floating bottom prompt capsule (`Describe tu siguiente escena...` + `✦ Stitch: Borrador ▾`) colliding into the bottom-right zoom dock (`3 escenas · 30 pal`), creating visual clutter and obscuring canvas tracks.
   - **User Directive**: *"Elimina todas esas cosas. Que no son necesarias"* -> Remove `● Sincronizado`, remove floating Stitch prompt bar, and remove colliding dock telemetry.

2. **Top Part of Scenes Must Be Editable**:
   - **User Directive**: *"además la parte de las escenas enel top deberían ser editable que no sean fijas sino editables."*
   - Currently, the top of the scene card rendered a fixed, non-editable track name and index (`● Track Name · #NN`), which was the source of text collision and offered no direct editing.
   - Users expect to be able to edit scene titles directly in place on the cards (inline editing on the canvas) instead of having static, non-editable text headers.

---

## 2. Implementation Slices (All Completed)

- [x] **Slice 1**: Remove `● Sincronizado` badge from `ui/src/App.tsx`.
- [x] **Slice 2**: Remove the floating Stitch prompt bar from `ui/src/canvas/DawCanvas.tsx` and strip colliding telemetry from the zoom dock.
- [x] **Slice 3**: Senior Inline Scene Editing on Canvas:
  - Added inline editing overlay in `DawCanvas.tsx`: double-clicking a scene card activates an inline `<input>` right on top of the card with autofocus, committing changes on Enter/Blur and reverting on Escape.
  - Added right-click context menu option `[ 🗎 Editar Título en Canvas ]`.
  - Wired `onUpdateSceneTitle: (sceneId: string, newTitle: string) => void` in `DawCanvas.tsx` and `App.tsx` connecting to SQLite WAL backend.
- [x] **Slice 4**: Redesign Scene Card Header in `renderer.ts`:
  - Placed Scene Title as the hero at the top of the card with clear visual hierarchy (`● Title · #01`).
  - Removed redundant fixed track name from the card top.
  - Mathematical collision-free truncation ensures titles of any length never collide with reading telemetry (`0 pal · ~1 min`).
  - While editing inline, title drawing on canvas is suppressed to prevent double-text under the input overlay.
- [x] **Slice 5**: Test suite updates & regression verification (`npm test` passes 43/43 tests, `npm run build` succeeds cleanly).
- [x] **Slice 6**: E2E Chrome CDP validation confirming real-time inline renaming and clutter elimination.
