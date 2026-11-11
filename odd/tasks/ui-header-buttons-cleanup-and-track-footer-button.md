# ODD Specification: Header Actions Elevation, Elimination of Avatar Pill, and Reconstructed Track Lane Add Button

- **Task ID**: `ui-header-buttons-cleanup-and-track-footer-button`
- **Feature**: Reconstruct "+ Nuevo Hilo" as a senior dashed card at the bottom of the left track column, eliminate non-functional 'A' avatar badge, and elevate top right toolbar buttons (Exportar, Ajustes) into a cohesive matte group.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/tests/`)

---

## 1. Problem Statement & User Feedback Analysis

1. **Top Header Clutter & Misplaced Action**:
   - `+ Nuevo Hilo` was sitting in the global top header styled with an aggressive green button (`#059669`).
   - Adding a track belongs contextually to the track lane sequencer, not the global window titlebar.
   - User directive: *"el boton de la 'nuevo hilo' debe reconstruirse o crearse más bonito y estar abajo en el sector de abajo ahí como sale en la capture."*

2. **Non-Functional Avatar 'A'**:
   - A circular purple/blue badge displaying the letter 'A' sat on the top-right edge with no click handler or functional utility.
   - User directive: *"y la A no hace nada si no es necesaria elmininala"*.

3. **Top Action Buttons Elevation**:
   - Top actions (`Exportar`, `Ajustes`) need visual cohesion, balanced geometry, and refined matte styling.
   - User directive: *"Quiero una mejoría para esos botones"*.

---

## 2. Implementation Slices (All Completed)

- [x] **Slice 1**: Cleaned up top-right header in `App.tsx`:
  - Completely eliminated the non-functional `A` avatar circle.
  - Removed `+ Nuevo Hilo` from top header.
  - Refined `Exportar` and `Ajustes` into a cohesive, balanced matte button pair with matching heights (30px), typography (11.5px), icons (13px), and hover feedback.
- [x] **Slice 2**: Reconstructed `+ Nuevo Hilo` in `DawCanvas.tsx`:
  - Connected `onCreateTrackClick={() => setIsCreateTrackOpen(true)}` from `App.tsx`.
  - In the left track column (`<aside ...>`), rendered a dedicated dashed slot button positioned directly below the last track header card (matching user capture `uploaded_media_1_1794356872538.png`).
  - Styled with subtle frosted glass, dashed border (`1px dashed rgba(255, 255, 255, 0.12)`), channel indicator (`CH 0N · Añadir trama`), and smooth indigo hover glow.
- [x] **Slice 3**: Updated tests in `ui/tests/phase1_core_fixes.test.ts` (45/45 passing tests).
- [x] **Slice 4**: Live Chrome DevTools validation (`verified_tracks_footer_button.png`).
