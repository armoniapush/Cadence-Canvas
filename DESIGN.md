# Cadence Canvas — Design System & Pattern Language

## 1. Vision & Core Philosophy

Cadence Canvas is a high-craft literary digital audio workstation (DAW) for novelists, dramatists, and narrative architects. It rejects the generic aesthetics of "AI slop" — radioactive neon drop shadows, ubiquitous 9999px pill capsules, transparent gradients, and cluttered developer mechanics.

In their place, Cadence Canvas embodies the restraint, precision, and tactile solidity of professional desktop creative software (Linear, Figma, Ableton Live, Logic Pro).

---

## 2. Design Tokens & Material Architecture

### Surfaces (Matte Obsidian & Deep Graphite)
- `--bg-canvas`: `#090b10` — The deepest cosmic workspace canvas.
- `--bg-surface`: `#0e1118` — Primary lanes, timeline stage, and workspace panels.
- `--bg-elevated`: `#141722` — Modal dialogs, editor cards, and toolbars.
- `--bg-header`: `#0d0f16` — Docked pro application header bar.
- `--bg-dock`: `#12151f` — Floating bottom telemetry and zoom dock.

### Precision Hairline Borders
- `--border-subtle`: `rgba(255, 255, 255, 0.04)` — Internal grid lines and subtle separations.
- `--border-default`: `rgba(255, 255, 255, 0.08)` — Standard hairline boundary for containers, cards, and buttons.
- `--border-hover`: `rgba(255, 255, 255, 0.14)` — Interactive focus and hover feedback.
- `--border-active`: `rgba(255, 255, 255, 0.22)` — Selected state highlight.

### Editorial Matte Palette (Pure, Grounded, Non-Radioactive)
Narrative threads and tonal meters use pure, muted, saturated pigments rather than glowing neon washes:
- **Cobalt**: `#4361ee` — Primary brand accent, playhead cursor, primary literary threads.
- **Forest / Sage**: `#1f9a73` — Lore, natural world, environmental narrative lines.
- **Ochre / Amber**: `#d97706` — Subplot tension, midpoint markers, pacing alerts.
- **Terracotta**: `#c2410c` — Kinetic action, conflict, high-cadence beats.
- **Amethyst**: `#7c3aed` — Internal monologues, introspection, psychological arcs.
- **Slate / Nautical**: `#0284c7` — Dialogue, banter, interpersonal scene dynamics.
- **Crimson**: `#be123c` — Climax, fatal causal moments, destructive turns.

---

## 3. Component Architecture & Rules

### Grounded Application Header Bar
- **No floating pill capsule**: The top bar is a grounded, full-width pro chrome bar (`height: 44px`, `border-bottom: 1px solid var(--border-default)`).
- **Brand Mark**: Sleek 24x24px matte typographic monogram `#161924` with crisp 1px hairline border and white lettermark `C`.
- **Project Breadcrumb**: Subtle, read-only path indicator (`/ project.cadence`). Raw database connection mechanics and text inputs are never exposed in the writer's navigation chrome.

### Button & Control System
- **Radius**: Rectangular with subtle `border-radius: 6px`. Pill shapes (`9999px`) are strictly forbidden on standard buttons.
- **Height**: Standard controls are `28px` high with `font-size: 12px` and `font-weight: 500`.
- **Variants**:
  - `.btn-primary`: Solid matte white (`#f1f5f9`), dark text (`#0b0d13`), high-contrast primary CTA.
  - `.btn-accent`: Solid cobalt (`#4361ee`), white text, confident secondary action.
  - `.btn-ghost`: Transparent background, subtle border on hover, secondary utility.
  - `.btn-icon`: Square `26x26px` or `22x22px` tool buttons.

### Segmented View Switchers
- **Container**: Grounded dark slot (`#090b10`), `border-radius: 6px`, `padding: 2px`.
- **Tabs**: `border-radius: 4px`, `font-size: 12px`. Active tab has solid `#1a1e2b` fill, crisp 1px border `rgba(255, 255, 255, 0.08)`, and subtle 1px shadow.

### Floating Bottom Dock
- Anchored at bottom center with `border-radius: 8px` and solid matte fill `#12151f`, hairline border, and zero glowing drop shadows.

---

## 4. Zero-Glow Policy & Anti-Slop Banlist

1. **BAN: Neon drop-shadow halos** (`box-shadow: 0 0 <blur>px rgba(colored)`). Depth is expressed solely through offset and hairline borders (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)`).
2. **BAN: Ubiquitous pill shapes** (`border-radius: 9999px` on headers, buttons, cards, docks). Small rounded rectangles (`6px` to `10px`) create architectural clarity.
3. **BAN: Raw developer technical clutter**. Internal WAL pragmas, SQLite paths, and raw connection buttons belong in debug diagnostics, never in the literary creative UI.
4. **BAN: Canvas selection halos**. Scene selection is rendered with crisp 1.5px solid strokes, never fuzzy radial glows.
