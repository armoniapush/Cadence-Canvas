# ODD Specification: Headless Magnetic Engine & Senior Tactile Micro-Interactions

- **Task ID**: `ui-headless-magnet-and-senior-microinteractions`
- **Feature**: Headless Magnetic Snapping (Zero UI Chrome Clutter), Physical Card Pick-up & Drop Elevation, Elastic Snap Settle Micro-Feedback, Hairline Magnetic Alignment Guides, and Addictive Tactile Easing.
- **Author**: Antigravity Worker & Design Craftsman
- **Status**: `in-progress`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/DawCanvas.tsx`, `ui/src/canvas/renderer.ts`, `ui/src/components/ManuscriptBinder.tsx`, `ui/src/components/ContextMenu.tsx`, `ui/src/index.css`)

---

## 1. Problem Statement & Motivation

1. **Eliminate Interface Chrome for Magnet ("Headless")**:
   - The user requested that the magnet be "headless" — completely invisible in the interface chrome.
   - Remove the `[ 🧲 Imán Activo ]` button from the bottom toolbar dock to keep the toolbar minimal, focused, and distraction-free.
   - Remove the intrusive emoji badge (`🧲 140u`) from the canvas ruler.
   - The magnet operates silently, organically, and intrinsically under the hood with intelligent multi-target snapping (head-to-tail, parallel track, grid beats). Holding `Alt` / `Option` provides temporary free placement.
   - When snapping occurs, replace the clumsy badge with an ultra-fine, elegant 1px hairline guide (`rgba(56, 189, 248, 0.35)` with dashed interval `[2, 3]`), vanishing instantly on release.

2. **Addictive, Senior Tactile Micro-Interactions**:
   - **Tactile Card Lift & Drop Physics**:
     * While dragging, the card is visually "lifted" off the stage: rendered with an elevated drop shadow (`box-shadow: 0 12px 28px rgba(0, 0, 0, 0.65)` in canvas context), subtle 1.015 scale, and illuminated specular border.
     * On drop, it smoothly snaps back to ground level with zero jitter.
   - **Organic Bézier Cable Dynamics**:
     * The connection cable features animated flowing dash offset (`ctx.lineDashOffset`) to create a subtle current of causal energy flowing from source to target.
     * The cable tip features a soft glowing halo.
   - **Binder & Menu Micro-Interactions**:
     * Binder items glide smoothly with `cubic-bezier(0.16, 1, 0.3, 1)` and a subtle `translateX(3px)` lift on hover.
     * Context menu items glide smoothly on hover with micro-scale easing.

---

## 2. Invariants & Verification Plan

1. **Invariants**:
   - Zero visible magnet buttons in the UI chrome.
   - 100% headless snapping engine active by default.
   - Zero console errors or frame drops during 60fps RAF loop.
2. **Verification Ladder**:
   - Unit tests in `ui/tests/editor_and_canvas.test.ts` certify headless magnet invariants and elevation math.
   - Full Vite production build with zero TypeScript warnings.
   - Live Chrome DevTools verification on `http://localhost:1420/`.
