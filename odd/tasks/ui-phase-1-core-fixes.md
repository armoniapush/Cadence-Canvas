# ODD Specification: Phase 1 Core Functional & UX Fixes

- **Task ID**: `ui-phase-1-core-fixes`
- **Feature**: Real Settings Modal, Export Workflow with Visual Toast & Download, Preserved Creative Prompt Input, OCC Self-Conflict Fix, and Double-Click Coordinate Correction.
- **Author**: Antigravity Coordinator & Swarm
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/src/components/`, `ui/tests/`)

---

## 1. Problem Statement & Root Cause Analysis

1. **Dead "Ajustes" Header Button**:
   - In `ui/src/App.tsx`, the "Ajustes" button had zero `onClick` handler. Clicking it produced no response.
   - Root Cause: UI scaffold lacked modal state and implementation for application/project settings.

2. **Silent "Exportar" Action Without Feedback**:
   - In `ui/src/App.tsx`, clicking "Exportar" executed a background call with feedback routed only to `console.debug`. Browser users received no download trigger, format options, or visual confirmation.

3. **User Creative Input Discarded in Prompt Bar**:
   - In `ui/src/canvas/DawCanvas.tsx`, when users typed a narrative idea in the bottom bar and pressed Enter, `promptInput` was immediately cleared without passing its content to `onCreateScene`.
   - Root Cause: `onCreateScene` signature only accepted `(trackId, tStart)`.

4. **OCC Self-Conflict Bug in Atomic Editor**:
   - In `ui/src/editor/AtomicEditor.tsx`, continuous typing while an asynchronous 600ms debounced save was in-flight scheduled another save with stale `expectedVersion`. When the first save incremented the version in the database, the second save was rejected as obsolete, displaying a red concurrency conflict banner against the sole writer.

5. **Double-Click & Wheel Zoom Coordinate Offset Bug**:
   - In `ui/src/canvas/DawCanvas.tsx`, `handleDoubleClick` and `handleWheel` computed time `t` using `(mx - viewport.panX)` instead of `(mx - TRACK_HEADER_WIDTH - viewport.panX)`. Scenes were created 210px to the right of the click location.

---

## 2. Implementation Slices

- **Slice 1**: Real Settings Modal (`ui/src/components/SettingsModal.tsx` & `App.tsx`)
  - Target word count, project title, author, autosave timing, typography scale.
- **Slice 2**: Export Modal & Toast Notification System (`ui/src/components/ExportModal.tsx`, `Toast.tsx` & `App.tsx`)
  - Format selection (Markdown, Docx, Plain text, JSON), scope selection, instant file download trigger, and floating success toast.
- **Slice 3**: Creative Prompt Integration (`DawCanvas.tsx` & `App.tsx`)
  - Update `onCreateScene` to accept `(trackId: string, tStart: number, promptText?: string)`.
  - Pass typed prompt as initial scene content and evocative title.
  - Make `Stitch Agent` capsule interactive with narrative modes.
- **Slice 4**: OCC Auto-Save Race Condition Fix (`AtomicEditor.tsx`)
  - Use `latestVersionRef` and sequential mutex save queue so in-flight saves never trigger false conflict banners.
  - Flush pending saves cleanly on scene change or unmount.
- **Slice 5**: Coordinate Normalization (`DawCanvas.tsx`)
  - Subtract `TRACK_HEADER_WIDTH` in `handleDoubleClick` and `handleWheel`.
