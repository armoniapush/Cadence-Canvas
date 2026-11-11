# ODD Specification: Canvas Card Hero Chapter Numeral & Header De-clutter

- **Task ID**: `ui-hero-card-numeral-prominence`
- **Features**:
  1. Eliminate the small `#02` badge from the canvas card header row to give the scene title maximum horizontal breathing room.
  2. Elevate the large chapter numeral in the card to be crisp, prominent, and clearly visible:
     - Increase font size to 36px font-weight 800.
     - Elevate opacity/contrast to a rich, luminous tone (`hexToRgba(col, isSel ? 0.45 : 0.28)`), making it a striking editorial landmark.
     - Position cleanly in the card's bottom-right corner without colliding with text.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `ui/tests/`)

---

## 1. Problem Statement & User Directive

- User directive: *"que te parece si eliminas el numero pequeño y haces el grande más visible?"*
- Context:
  - The small `#02` badge in the header row competes with the title and reading telemetry in tight cards.
  - The large numeral (`02`) in the corner was previously rendered at faint opacity (0.08 - 0.16) as a subtle watermark.
- Solution:
  - Remove the small index badge from the header row completely, giving the title full width.
  - Elevate the large numeral into a hero landmark with higher contrast and crisp legibility.

---

## 2. Implementation Slices

- **Slice 1**: Remove the small header badge and update header layout math in `renderer.ts`.
- **Slice 2**: Elevate the large numeral in `renderer.ts` with increased scale (36px, weight 800) and vivid contrast (`0.28` default / `0.45` selected).
- **Slice 3**: Update test assertions and verify test suite (`npm test`).
- **Slice 4**: Live Chrome DevTools validation & screenshot inspection.
