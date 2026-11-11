# ODD Specification: Elimination of Hardcoded Timeline Acts & Clean Modular Ruler

- **Task ID**: `ui-remove-hardcoded-timeline-acts`
- **Feature**: Remove hardcoded dramatic act zones (`ACTO I`, `GIRO I`, `ACTO II`, `CLÍMAX`, `ACTO III`, `DESENLACE`) and tick collisions from the timeline ruler, giving authors a clean slate to build their own narrative structure.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `ui/src/canvas/DawCanvas.tsx`, `ui/tests/`)

---

## 1. Problem Statement & User Feedback Analysis

- **User Image**: Close-up of the timeline ruler displaying:
  `● ACTO I` (0u, 60u), `● GIRO I` (120u, 180u), `● ACTO II` (240u), `● CLÍMAX` (300u, 360u), `● ACTO III` (420u, 480u), `● DESENLACE` (540u, 600u) colliding with unit marks.
- **User Directive**:
  > *"igual con esto me gustaría que no estuviera ahí. Por ahora. Me gustaría que yo mismo podiera crear mi propia estructura."*
- **Root Cause**:
  `renderer.ts:871-894` unconditionally drew `DRAMATIC_ACT_ZONES` on the timeline ruler, imposing an arbitrary Hollywood 3-act structure with hardcoded positions (t: 0, 120, 180, 300, 420, 540) that collided with the time tick labels (`120u`, `240u`, `300u`) and restricted the author's creative freedom.

---

## 2. Implementation Slices (All Completed)

- [x] **Slice 1**: Made dramatic act rendering on the timeline ruler optional via `showDramaticActs?: boolean` in `CanvasRenderData`, defaulting to `false` so the hardcoded acts are completely removed from the timeline canvas.
- [x] **Slice 2**: Transformed the Timeline Ruler in `renderer.ts` into a clean, professional metric graduation ruler:
  - Clean tick marks and tabular graduation numbers (`0u`, `60u`, `120u`, `180u`, `240u`...) vertically centered with 0 text collisions.
  - Eliminated hardcoded colored divider lines and act pips slicing through the canvas.
- [x] **Slice 3**: Updated `DawCanvas.tsx` with `showDramaticActs = false` default.
- [x] **Slice 4**: Updated test suites in `ui/tests/phase1_core_fixes.test.ts` (44/44 tests pass).
- [x] **Slice 5**: Live Chrome DevTools verification (`verified_clean_ruler.png`).
