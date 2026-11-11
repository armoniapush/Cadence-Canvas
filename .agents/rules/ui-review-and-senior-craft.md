# Project Rule: UI Review & Senior Craft Invariants

This rule applies to all UI/UX modifications, component additions, and layout changes in Cadence Canvas.

## 1. Pinned Sticky Footers & Viewport Overflow Protection (Mandatory)
- **Zero Scroll-Trapped Action Buttons**: Primary action buttons in drawers, sidebars, or modal lists (e.g. `+ Nueva Escena` in `ManuscriptBinder`, `+ Nuevo Hilo` in `DawCanvas`) must **NEVER** be placed as the trailing child inside an unanchored scrollable container (`overflowY: 'auto'`).
- **Sticky Footer Pattern**:
  ```tsx
  {/* Scrollable Content Container */}
  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '...' }}>
    {items.map(...)}
  </div>

  {/* Pinned Bottom Footer Action */}
  <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', backgroundColor: '#0c0e14', flexShrink: 0 }}>
    <GlowButton ...>Action</GlowButton>
  </div>
  ```
- **Stress-Test Viewport**: When creating or modifying lists, always test with 7+ items in Chrome DevTools MCP to ensure that content growth does not push buttons below the fold or slice them horizontally at container boundaries.

## 2. Linear & Raycast Senior Craft (Anti-AI-Slop Directives)
- **Total Prohibition of Emojis**: Never use emojis for navigation icons, telemetry, status pills, or buttons. Use Lucide Icons exclusively (`stroke-width="1.5"`, `size={14-16}`, muted `text-zinc-400`, hover `text-zinc-100`).
- **4-Tier Button Hierarchy**:
  1. *Primary*: Single focal button (`bg-zinc-100 text-zinc-900 font-medium hover:bg-white`).
  2. *Secondary / Subtle*: Translucent dark elevation (`bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60`).
  3. *Ghost*: Unbordered minimal interactive targets (`bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`).
  4. *Destructive*: Subtle ghost by default, tinting red only on hover (`text-zinc-400 hover:text-red-400 hover:bg-red-500/10`).
- **Subtle Mention Badges**: Píldoras with 10% opacity background and 20% border:
  * Personaje (`@`): `bg-sky-500/10 text-sky-400 border border-sky-500/20`
  * Lugar (`#`): `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
  * Objeto (`!`): `bg-amber-500/10 text-amber-400 border border-amber-500/20`
- **React Bits Glow Components**: Use `GlowButton` and `BorderGlow` with intentional variants:
  * `iridescent`: Google Ask AI Mode rainbow neon spectrum.
  * `deepthink`: Warm amber to violet gradient.
  * `aurora`: Bottom fluid ambient wave (Apple Intelligence style).
  * `specular`: Cursor-reactive radial sheen (`--mouse-x`, `--mouse-y`).

## 3. Immutability & Concurrency in IPC / API Bridges
- **No Shared Mutable References**: Functions in `ui/src/api.ts` (e.g. `listScenes`, `listTracks`, `listAnchors`) must return cloned objects (`.map(s => ({ ...s }))`), never direct references to `mockState`.
- **Defensive Deduplication**: React state updates for newly created entities must guard against key collisions:
  ```ts
  setScenes((prev) => (prev.some((s) => s.id === newScene.id) ? prev : [...prev, newScene]));
  ```
- **Random Entropy in IDs**: Auto-generated mock IDs must include random entropy (`scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}}`).

## 4. Verification Gate
- After any UI mutation:
  1. `npm test` must pass 100% of unit tests.
  2. `npm run build` (`tsc && vite build`) must compile cleanly with 0 errors.
  3. Check runtime console messages via DevTools MCP `list_console_messages` to certify zero duplicate key errors or unhandled rejections.
