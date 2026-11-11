# Cadence Canvas Project Rules & Invariants

## UI & Layout Invariants
1. **Sticky Action Footers in Drawers & Sidebars**:
   - Primary action buttons (e.g. `+ Nueva Escena`, `+ Nuevo Hilo`) must **always** be pinned in a sticky footer (`flexShrink: 0`) and never trapped inside an unanchored scrollable container (`overflowY: 'auto'`).
   - The scroll container must have `minHeight: 0` and `flex: 1` so that lists with 7+ items never push the button below the fold or slice it at container boundaries.

2. **Senior Craft & Anti-AI Slop**:
   - Zero emojis across all components. Use Lucide SVG icons exclusively (14-16px, stroke 1.5).
   - Strict 4-tier button hierarchy (Primary, Subtle, Ghost, Destructive hover).
   - React Bits glow button system (`GlowButton`, `BorderGlow`) for key interactive anchors (`iridescent`, `deepthink`, `aurora`, `specular`).
   - Semantic mention pills (@, #, !) with 10% opacity backgrounds and subtle borders.
   - Tabular monospace numbers for all metrics, timers, and telemetry.

3. **State Immutability & Concurrency Safety**:
   - `api.ts` must return cloned array copies (`.map(s => ({ ...s }))`) to avoid mutating shared mock state.
   - Defensive deduplication in React state setters (`prev.some(s => s.id === item.id) ? prev : [...prev, item]`).

4. **Verification Gate**:
   - Every change must pass `npm test` (52/52 passing) and `npm run build` (`tsc && vite build`).
   - Run in-memory DevTools console inspection (`list_console_messages`) to certify zero duplicate key errors or runtime exceptions.
