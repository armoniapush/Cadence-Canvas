# Task: Cadenza UI Elevation — 5 Visual Reference Modules

## Context & Objectives
Based on the direct visual references (Fluxa, Visual Workflow Canvas, Imagion, Create.Video, Knowledge Graph UI for Dark System, Djordje Vanjek Segmented Bars, Minimalist Writing App):
1. Canvas Swimlanes & Nodes: Distinct lane framing, horizontal guide tracks, left color notches, socket ports differentiated by causal type, cards with duration clips.
2. Timeline DAW Sequencer: Add formatted timecodes (`0:00`, `1:00`, `2:00`...) on major ruler ticks.
3. Orbital Constellation: Fix label collision (00:13) by moving orbit labels to a dedicated non-colliding axis with pill badges, dynamic orbital distances based on weight, and dark chip pill backings for entity names.
4. Segmented Rhythm HUD: Interactive tooltips on hover for the continuous segmented bar (% Diálogo, Acción, Lore, Monólogo) with standardized CSS tokens.
5. Zen Mode: Refined centered 70ch reading column with balanced typography and minimalist floating pill.

## 5-Tier Verification Ladder
1. Unit Tests: `npm test --prefix ui` passing.
2. Integration Contracts: `cargo test --workspace` passing.
3. Agentic E2E: Validate in live Chrome DevTools session at `http://localhost:1420/` with screenshots across all 5 modules.
4. Performance: Zero lag, 60 FPS canvas RAF loop.
5. Continuous Clean Build: 0 errors in Vite build.
