# ODD Specification: Pinterest & Orion High-Craft Art Direction & UI Technique Overhaul

- **Task ID**: `ui-pinterest-orion-workflow-art-direction`
- **Features**:
  1. **Diffuse Ambient Aurora Bloom & Inset Rim Lighting (Pinterest SaaS Card Reveal & Orion)**:
     - Multi-stop radial/diffuse ambient glow (`shadowBlur: 28`, chromatic aura) behind selected & hovered canvas cards.
     - Top-edge 1px glassmorphic rim highlight (`rgba(255, 255, 255, 0.16)`) on scene cards for laser-machined obsidian depth.
     - Rich gradient card fill (`#121520` -> `#0b0d14`).
  2. **High-Contrast Telemetry Capsules (Workflow Plan Technique)**:
     - Sculpted dark capsule pill on the top-right of scene cards for reading telemetry (`10 pal · ~1 min`) with micro-border and high-legibility tabular monospace typography.
  3. **Flowing Iridescent Multi-Color Gradient Ribbons (Orion Sankey Flow Technique)**:
     - Seamless multi-stop linear/cubic gradients connecting narrative scenes between tracks (Source hue -> Electric blend -> Target hue).
     - Silky line thickness with ambient diffuse glow and concentric anchor ports.
  4. **Luminous Playhead & Minimalist Ruler Marker (Workflow Plan "Now" Technique)**:
     - Sleek active playhead marker on the ruler with a hairline laser guide extending vertically down through canvas lanes.
  5. **Executive Dark Obsidian Polish (Top Bar, Floating Dock, Binder, Track Headers)**:
     - Deep matte glass backdrop (`rgba(9, 10, 15, 0.88)`), blur(20px), razor-thin borders, and refined pill switches.
- **Author**: Antigravity Coordinator (Gentle-AI & Impeccable)
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/components/ManuscriptBinder.tsx`, `ui/src/index.css`, `ui/src/App.tsx`, `ui/tests/`)

---

## 1. Problem Statement & User Directive

- User directive: *"Mira el diseño, no la estructura ni el formanto del contenido el tipo de diseño el puro arte y la tecnica de de diseño UI e intenta replicarlo en nuestra app https://pin.it/6W5w7KLWD"*
- Reference Visuals:
  - Pinterest Pin `1119003838692091027`: Obsidian card reveal with rotating diffuse chromatic aura (cyan, electric blue, magenta, amber) and razor rim lighting.
  - Image 1 ("Workflow plan"): High-contrast capsules (`4 days`, `25 days`), vertical hairline playhead with "Now" marker, rounded dark timeline container.
  - Image 2 ("ORION Data visualisation"): Flowing gradient ribbons with multi-color transitions connecting rounded node cards on an obsidian backdrop.
  - Image 3 ("HYPER CHARTS"): Deep black cards with neon ambient underglow and high-contrast metric typography.

---

## 2. Implementation Slices

- **Slice 1**: Elevate `renderer.ts` canvas rendering:
  - Add chromatic aura bloom behind selected/active scene cards.
  - Add top-edge 1px glass rim highlight on cards.
  - Implement sculpted telemetry capsule pill (`10 pal · ~1 min`) on top-right of card.
  - Upgrade connection ribbons into smooth multi-stop iridescent gradients (Orion flow) with glowing ports.
  - Add subtle playhead marker & vertical hairline guide.
- **Slice 2**: Elevate DOM chrome in `index.css`, `App.tsx`, `DawCanvas.tsx`, and `ManuscriptBinder.tsx`:
  - Refined obsidian glassmorphic styling with subtle border highlights.
  - Sleek capsule badges and active pill tabs.
- **Slice 3**: Write deterministic unit and integration tests verifying the new visual tokens and rendering invariants.
- **Slice 4**: Live visual verification with Chrome DevTools on `http://localhost:1420/`.
