# ODD Specification: Decouple Drag-and-Drop from Editor Opening, Eliminate Laser Guideline & Smooth Transitions

- **Task ID**: `ui-drag-selection-and-guidelines-polish`
- **Feature**:
  1. Eliminate vertical striped laser guide (`magnetGuideT` / `setLineDash([2, 3])`).
  2. Decouple scene dragging from editor opening: dragging a card only repositions it; clicking without dragging opens the editor.
  3. Eliminate layout flicker and jerkiness on scene selection: synchronous canvas repaint on resize, smooth CSS transitions for editor drawer, and remove jarring auto-collapse of the left binder.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/tests/`)

---

## 1. Problem Statement & User Feedback Analysis

1. **Unwanted Striped Vertical Laser Guideline**:
   - User directive: *"primero quisiera elmiinar la guia que sea la barra de rallas vertical que zsale de l lado izquierdo del la caja como guian en el canvas."*
   - Root cause: `renderer.ts:814-828` drew a vertical dashed line with `setLineDash([2, 3])` along the left edge of cards during snapping/dragging, which created visual clutter.

2. **Drag vs. Click Invariant**:
   - User directive: *"Cuando arrastro un capitulo no debería aparecer el capitulo como tal sino cuando le doy click solamente si le doy click y arrastro no."*
   - Root cause: `DawCanvas.tsx:289` called `onSelectScene(hitScene)` on `pointerdown`. This prematurely opened the editor panel even when the user only intended to drag/reposition the card.
   - Solution: On `pointerdown`, do not select the scene for editing. On `pointerup`, if `dragRef.current.moved === false` (clean click), call `onSelectScene(hitScene)`. If `dragRef.current.moved === true` (drag operation), call `onMoveScene(...)` and do not open the editor.

3. **Smooth Transitions & Flicker Elimination**:
   - User directive: *"quisiera que las aminmaciones sea más fluidas y no tan bruscas, parece como si parpaddeara o glitcheara al cambiar o presionar cada tarjeta de capitulo."*
   - Root causes:
     - `ResizeObserver` mutated `canvas.width/height` without an immediate synchronous paint, leaving the canvas blank for 1 frame (16-32ms flash).
     - Clicking a card fired `if (window.innerWidth < 1440) setIsLeftNavOpen(false)` which jerkily collapsed the left sidebar while simultaneously opening the right editor.
     - The right editor `<aside>` appeared instantly without smooth cubic-bezier drawer transition.

---

## 2. Implementation Slices

- **Slice 1**: Remove vertical dashed laser guideline from `renderer.ts`.
- **Slice 2**: Decouple drag from click selection in `DawCanvas.tsx` (`handlePointerDown` vs `handlePointerUp`).
- **Slice 3**: Immediate synchronous canvas repaint in `DawCanvas.tsx` `ResizeObserver` to prevent blank frame blinking.
- **Slice 4**: Smooth editor panel transition and remove jarring auto-collapse of left nav in `App.tsx`.
- **Slice 5**: Test suite updates & regression verification (`npm test`).

---

## 3. Verification & Results

1. **Deterministic Test Suite**:
   - Total tests: 46 passing (0 failures).
   - Covered:
     - Drag vs. Click selection decoupling.
     - Laser guideline elimination (`setLineDash([2, 3])` completely purged).
     - ResizeObserver synchronous repaint ensuring 0 blank-frame flickers.
     - Smooth cubic-bezier drawer transition on the editor panel.
     - Responsive auto-collapse bounds (< 900px) preventing aggressive drawer closing on standard laptops.
2. **Production Bundle**:
   - `tsc && vite build`: Succeeded in <1s with 0 TypeScript diagnostics or warnings.
3. **Live CDP Interaction & Visual Verification**:
   - Verified via Chrome DevTools on `http://localhost:1420/`:
     - Canvas cards display cleanly with zero text overlap or collisions.
     - Opening the editor drawer animates smoothly without collapsing the left manuscript binder.
     - Closing the editor returns the canvas cleanly.
     - No dashed laser guidelines appear on the canvas.
