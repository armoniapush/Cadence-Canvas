# Task: UI Senior Craft & Complete Anti-Slop Elevation

## Context & Objectives
Based on visual review of Cadence Canvas and reference designs (Mount, Markus AI, Wavely, Investigations radar), eliminate lingering AI slop cliches (raw math `(σ 0.0)`, fake audio sine wave, generic gradient squircle logo, triplicate Zen buttons, WAL database leaks) and elevate the user experience to senior creative desktop grade.

## 5-Tier Verification Ladder
1. Unit Tests: Ensure all existing and updated component tests pass (`npm test --prefix ui`).
2. Integration Contracts: Rust domain and Tauri IPC tests green (`cargo test --workspace`).
3. Agentic Verification: Validate with Chrome DevTools at `http://localhost:1420/`, inspecting live DOM, taking screenshots, and verifying 0ms black flicker on view toggles.
4. Performance Budget: 60fps canvas rendering, <1ms sentence cadence computation, zero memory leaks.
5. Continuous Clean Build: Clean Vite bundle with zero TypeScript warnings or errors.

## Execution Steps
1. `App.tsx`:
   - Refactor view switching to keep `<DawCanvas>` and `<RadialConstellation>` mounted simultaneously with `visibility`/`opacity`, eliminating 0x0 canvas recreation black flashes.
   - Move `[ ☰ Manuscrito ]` to the left header.
   - Remove duplicate Zen button from header.
   - Replace generic gradient squircle logo with precision typographic Cadence emblem.
2. `TonalHud.tsx` & `AtomicEditor.tsx`:
   - Replace fake audio sine wave and `(σ 0.0)` with Mount-style Sentence Rhythm Histogram (Gary Provost sentence pacing).
   - Replace bulky pill boxes with a continuous matte Chromatic Voice Ribbon and high-craft typography.
   - Clean editorial stats line.
3. `ContextMenu.tsx`:
   - Refine styling to match Markus AI: 12px border radius, `#13161c` matte surface, monochrome icons, clean shortcut badges.
4. `renderer.ts` & `DawCanvas.tsx`:
   - Replace static track header subtitle with dynamic `{scenes} esc. · {words} pal.`
   - Remove duplicate Zen button from canvas dock.
5. Verification & Test Suite.
