# ODD Specification: Elimination of Intrusive "AHORA" Canvas Bar & Senior Editor Close Button Elevation

- **Task ID**: `ui-fix-ahora-bar-and-editor-close-button`
- **Features**:
  1. **Eliminate Intrusive "AHORA" Bar & Vertical Guideline**:
     - Remove the green "AHORA" capsule marker and vertical laser line from `renderer.ts`.
     - Remove the artificial `currentTime` binding in `DawCanvas.tsx` that caused the line to jump and slice through cards upon selection.
     - Restore a pristine, uncluttered narrative canvas with zero vertical slicing across cards or connection ports.
  2. **Elevate Chapter Editor Close Button ("X") & Eliminate Action Confusion**:
     - Replace the raw text `✕` close button in `AtomicEditor.tsx` with a first-class 28×28px executive close button featuring an SVG icon, subtle glass background, 1px border, and smooth hover state.
     - Add a subtle vertical specular divider separating the panel close button from the editor actions.
     - Replace the ambiguous `✕ Borrar` text with a clean Trash Can SVG icon (`Eliminar`) to prevent dangerous accidental clicks when the user intends to close the editor.
- **Author**: Antigravity Coordinator (Gentle-AI & Impeccable)
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/tests/`)

---

## 1. Problem Statement & User Directive

- User directive: *"CORRIGE EL comportamiento del ux con respecto a esa barra que dice ahora. Así como corrige la X de close de donde está el capitulo para escribir."*
- Video Evidence:
  - The green `AHORA` badge and vertical line sliced directly through scenes, connection ports, and canvas lanes whenever a card was selected.
  - In the chapter editor (`AtomicEditor.tsx`), the close button was a tiny unstyled `✕` character placed immediately adjacent to a red `✕ Borrar` button, creating severe UX danger and layout awkwardness.

---

## 2. Implementation Slices

- **Slice 1**: Remove the `AHORA` badge and vertical laser guide from `renderer.ts` and clean up `DawCanvas.tsx`.
- **Slice 2**: Elevate the editor close button and replace `✕ Borrar` with a clean trash can icon in `AtomicEditor.tsx`.
- **Slice 3**: Update test assertions in `ui/tests/phase1_core_fixes.test.ts` and run test suite (`npm test`).
- **Slice 4**: Live visual verification with Chrome DevTools on `http://localhost:1420/`.
