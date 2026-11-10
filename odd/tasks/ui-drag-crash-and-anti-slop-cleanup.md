# ODD Specification: Timeline Drag Crash Prevention & Anti-AI-Slop UI Refinement

- **Task ID**: `ui-drag-crash-and-anti-slop-cleanup`
- **Feature**: Timeline Drag Null Dereference Fix (Black Screen Prevention), React ErrorBoundary Guard, Clutter Deletion (Status Bar & WAL Pill), and Anti-AI-Slop Matte Design Language
- **Author**: Antigravity Worker
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/DawCanvas.tsx`, `ui/src/App.tsx`, `ui/src/index.css`, `ui/src/main.tsx`, `ui/src/canvas/renderer.ts`)

---

## 1. Problem Statement & Root Cause Analysis

1. **Timeline Drag Black Screen Crash**:
   - In `ui/src/canvas/DawCanvas.tsx`, `handlePointerMove` invoked `setViewport((prev) => ({ panX: isVert ? prev.panX : panRef.current!.px + (mx - panRef.current!.mx), ... }))`.
   - Because React state updater callbacks can execute asynchronously or race with pointerup events, `panRef.current` is set to `null` before the updater runs. The non-null assertion `panRef.current!.px` throws an uncaught `TypeError: Cannot read properties of null (reading 'px')`.
   - In React 19 without an `ErrorBoundary`, an uncaught error in a component lifecycle or state handler unmounts the entire application DOM tree, turning the window black.
   - **Resolution**:
     - Synchronously capture pan coordinates (`px`, `mx`, `py`, `my`, `isVert`) from `panRef.current` into closure-scoped local variables before calling `setViewport`.
     - Guard against null inside or outside `setViewport`.
     - Introduce a top-level `ErrorBoundary` component to prevent blank screen crashes in case of runtime exceptions.

2. **UI Clutter Deletion (UX Streamlining)**:
   - The user flagged two UI elements as unnecessary technical noise:
     1. The bottom `<footer>` status bar (`● project.cadence · 2 hilos narrativos · 3 escenas | Puente IPC activo...`).
     2. The `● WAL Activo` status pill in the top header.
   - **Resolution**: Completely remove the bottom `<footer>` and remove the `WAL Activo` status pill from the header. Ensure the main workspace occupies full vertical height cleanly.

3. **Anti-AI-Slop Aesthetic Overhaul**:
   - The UI exhibited AI-generated cliches: glowing neon box-shadows (`box-shadow: 0 0 16px rgba(99, 102, 241, 0.32)`), radioactive cyan/purple gradients, and glowing status pills.
   - **Resolution**:
     - Purge neon drop-shadow glows from `.pill-btn-primary`, `.pill-btn-cyan`, tonal HUD badges, and the brand mark.
     - Replace the brand logo mark with a pro-tier, matte typographic mark: dark matte slate surface (`#171922`), subtle 1px border (`rgba(255, 255, 255, 0.08)`), crisp typography, zero drop glow.
     - Replace glowing hover states with clean matte highlights (`rgba(255, 255, 255, 0.08)`, subtle border shifts).

---

## 2. Implementation Slices

- **Slice 1**: Timeline Drag Null Safety in `DawCanvas.tsx` & React `ErrorBoundary` in `main.tsx` / `App.tsx`.
- **Slice 2**: Deletion of bottom `<footer>` and header `WAL Activo` pill in `App.tsx`.
- **Slice 3**: Anti-AI-Slop visual refinement in `App.tsx`, `index.css`, `renderer.ts`, and `TonalHud.tsx`.
- **Slice 4**: Regression testing and test suite verification (`npm test --prefix ui`, `npm run build --prefix ui`, `cargo test --workspace`).
