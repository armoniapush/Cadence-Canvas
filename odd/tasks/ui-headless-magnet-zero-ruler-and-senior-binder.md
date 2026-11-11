# ODD Specification: Headless Permanent Magnetism, Full Left Drag, Minimalist Clean Ruler & Senior Binder Overhaul

- **Task ID**: `ui-headless-magnet-zero-ruler-and-senior-binder`
- **Features**:
  1. Permanent headless magnetic snapping: remove the toggle button and separator from the bottom dock; keep snapping permanently active under the hood.
  2. Full leftward drag capability: eliminate the artificial 40px barrier (`panX: 40 -> 0`), allow dragging cards flush to the track header boundary (`t: 0`), and enable fluid scene reordering to the left without push-back locks.
  3. Clean timeline ruler: eliminate the cryptic unit numbers ("0u", "60u", "120u", etc.) from the top timeline ruler.
  4. Senior UX/UI overhaul of the left Manuscript Binder:
     - High-craft literary index cards inspired by Scrivener 3 and Linear.
     - Eliminate developer clutter (remove `T: 0u`, replace clumsy badges with typographic hierarchy).
     - Refined hover, selection, and drag states using quiet contrast and thread accent colors.
     - Cohesive segmented controls and elegant bottom add button.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/src/components/ManuscriptBinder.tsx`, `ui/tests/`)

---

## 1. Problem Statement & User Directives

1. **Permanent Headless Magnetism**:
   - User directive: *"la imanación hazla permanente y borra el boton y esa función dejalo headless y permanente."*
   - Remove the `[♾ Imantación]` button and its separator from the bottom floating dock in `DawCanvas.tsx`.
   - Snapping remains permanently enabled (`magnetEnabled = true`).

2. **Full Leftward Card Dragging**:
   - User directive: *"Que pueda arrastrar las terjetas toda la izquierda que quiera."*
   - Root causes:
     - `panX` was hardcoded to `40`, keeping cards 40px away from the track header at `t = 0`.
     - `resolveSceneAntiCollision` rejected placing any scene before the first scene when `firstStart < activeUnits + gapUnits`, forcing it back to `firstEnd + gapUnits`.
   - Solutions:
     - Align default viewport `panX: 0`, allowing `t: 0` to sit flush against the track header (`x = 210px`).
     - Allow leftward reordering: if dragged to the left of the first scene, clamp to `t = 0` and cascade/shift subsequent overlapping scenes.

3. **Elimination of Cryptic Unit Numbers from Ruler**:
   - User directive: *"esos numeros de ahí no se que signifiquen me gustarí que sean eliminados del tiemline"* (referencing Image 2 with `0u 60u 120u 180u...`).
   - Remove unit labels (`${t}u`) from the narrative beats ruler in `renderer.ts`. Ruler retains clean minimal tick marks without cryptic numbers.

4. **Senior Manuscript Binder UI Overhaul**:
   - User directive: *"me gustaríamejorar este binder de la parte izquierda. Quisiera que tenga una mejor interface observala y analiza que es lo que está mal y mejora en conformidad para hacer un diseño senior."*
   - Modernize the binder into a refined literary deck:
     - Clean typographic hierarchy: index `#01`, thread dot indicator, scene title, and excerpt.
     - Remove `T: 0u` noise.
     - Subtle 1px specular borders and soft elevation instead of harsh neon outlines.
     - Polished segmented view switcher and refined "+ Añadir escena" button.

---

## 2. Implementation Slices

- **Slice 1**: Permanent Headless Magnetism in `DawCanvas.tsx` (remove dock button & divider, hardcode active magnetism).
- **Slice 2**: Full Leftward Dragging in `DawCanvas.tsx` & `renderer.ts` (`panX: 0`, fluid left drag, cascade shift on collision).
- **Slice 3**: Clean Minimalist Ruler in `renderer.ts` (remove `0u, 60u...` unit text).
- **Slice 4**: Senior Manuscript Binder Redesign in `ManuscriptBinder.tsx`.
- **Slice 5**: Test Suite Verification & CDP Browser Validation.

---

## 3. Verification & Results

1. **Deterministic Vitest Suite**:
   - Total tests: 47 passing (0 failures).
   - Covered:
     - Permanent headless magnetism (button removed from bottom dock, `magnetEnabled` permanent true).
     - Full leftward drag (panX default 0 flush with track header).
     - Clean timeline ruler (cryptic `0u, 60u...` unit numbers completely eliminated).
     - Senior Manuscript Binder (developer jargon `T: Xu` purged, clean typographic hierarchy, refined `+ Nueva Escena` button).
2. **Production Bundle**:
   - `tsc && vite build`: Succeeded in 917ms with 0 errors or warnings.
3. **Live CDP Interaction & Visual Verification**:
   - Screenshot verified via Chrome DevTools on `http://localhost:1420/`:
     - Cards touch the left track boundary without artificial 40px barrier.
     - Top ruler shows only subtle, clean tick marks.
     - Bottom dock contains only zoom and fit buttons.
     - Manuscript binder presents a high-craft executive literary deck.
