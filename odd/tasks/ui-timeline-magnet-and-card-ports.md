# ODD Specification: Timeline Magnetic Snapping Engine, Precision Card Ports & Contextual Actions

- **Task ID**: `ui-timeline-magnet-and-card-ports`
- **Feature**: Timeline Magnetic Snapping (Magnet) for disciplined non-free placement, Precision In/Out Causal Ports on Scene Cards, Interactive Bézier Cable Wiring, and Floating Contextual Action Menu.
- **Author**: Antigravity Creative Swarm & Worker
- **Status**: `in-progress`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/src/components/ContextMenu.tsx`, `ui/src/App.tsx`, `ui/src/types.ts`, `ui/src/index.css`)

---

## 1. Problem Statement & Motivation

1. **Unbounded Free-Floating Placement ("Demasiado Libre")**:
   - Currently, dragging a scene card calculates `dt = Math.round(dx / (PIXELS_PER_UNIT * zoom))`, allowing cards to land on arbitrary integers (`t = 13, 27, 41...`).
   - Writers experience friction trying to align parallel scenes across tracks, place scenes head-to-tail without gaps, or snap to regular narrative beats.
   - Solution: Introduce a deterministic **Magnetic Snapping Engine** (`computeMagneticSnap`) with configurable beat steps (10 units), head-to-tail attraction, parallel scene alignment, and visual snap guidelines.

2. **Absence of In-Situ Causal Connection on Canvas Cards**:
   - The user requested tactile node-based interaction inspired by *Markus AI* and *Wavely*.
   - Scene cards need visible, elegant In/Out ports:
     - In-Port (left edge, center): Causal input (`t_in`).
     - Out-Port (right edge, center): Causal output (`t_out`).
   - Dragging from an Out-Port draws an interactive Bézier cable; dropping it onto another card's In-Port creates a `ReadingAnchor`.

3. **In-Situ Contextual Actions (Zero Round-Trip Friction)**:
   - Right-clicking a card opens a floating dark matte contextual menu (`ContextMenu.tsx`):
     - *Abrir Editor Atómico* (`↵`)
     - *Conectar Causalmente* (`⌘L`)
     - *Duplicar Escena* (`⌘D`)
     - *Dividir Escena* (`⌥⇧S`)
     - *Eliminar Escena* (`⌫`)

---

## 2. Mathematical Snapping Engine Specification

```typescript
export interface SnapResult {
  snappedTStart: number;
  isSnapped: boolean;
  snapType?: 'grid' | 'head-to-tail' | 'parallel' | 'origin';
  guideT?: number; // Time unit where the vertical magnetic line should be rendered
}

export function computeMagneticSnap(
  rawTStart: number,
  duration: number,
  targetTrackId: string,
  scenes: Scene[],
  activeSceneId: string,
  zoom: number,
  magnetEnabled: boolean,
  snapStep: number = 10,
  snapThresholdPx: number = 14
): SnapResult;
```

- **Invariants**:
  1. If `!magnetEnabled`, returns `rawTStart` (pure free placement, with minimum clamp `t >= 0`).
  2. Magnet threshold in time units: `thresholdUnits = snapThresholdPx / (PIXELS_PER_UNIT * zoom)`.
  3. Priority 1: Scene edge attraction (head-to-tail on same track, then parallel start on other tracks, then `t = 0`).
  4. Priority 2: Grid beat snapping (`Math.round(rawTStart / snapStep) * snapStep`) if within threshold.

---

## 3. Verification Plan

1. Unit tests in `ui/tests/editor_and_canvas.test.ts`:
   - `computeMagneticSnap` snaps to origin `t=0`.
   - `computeMagneticSnap` snaps head-to-tail to preceding scene with 0 gap.
   - `computeMagneticSnap` snaps parallel to scenes on adjacent tracks.
   - `computeMagneticSnap` snaps to grid beat multiples when no scene edges are near.
   - `computeMagneticSnap` returns unmodified coordinate when `magnetEnabled = false`.
2. Interactive end-to-end verification via Chrome DevTools on `http://localhost:1420/`:
   - Dragging scene snaps crisply with vertical guide line.
   - Toggle button `[ 🧲 Imán: Activo / Inactivo ]` works.
   - Port hovering and Bézier cable drawing works.
   - Right-click contextual menu opens and executes duplicate/split/delete.
