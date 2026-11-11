# ODD Specification: React Bits Aurora & Neon Iridescent Glow Buttons System

- **Task ID**: `ui-reactbits-aurora-glow-buttons`
- **Features**:
  1. **React Bits Glow Architecture**:
     - Implement components inspired by [React Bits](https://reactbits.dev/) (`Border Glow`, `Star Border`, `Specular Button`, and `Aurora / Soft Aurora`).
     - Replicate the exact visual aesthetics from the 3 user reference captures:
       * **Reference 1 (DeepThink AI Bar)**: Dark glass surface with a vibrant orange-to-purple specular gradient border glow and interactive menu state.
       * **Reference 2 (Google Ask AI Mode)**: Multi-spectral iridescent running neon border (amber -> emerald -> cyan -> cobalt -> violet) with dark matte core and ambient backlight.
       * **Reference 3 (Apple Intelligence / Aurora Bloom)**: Fluid organic diffuse ambient light blooming from the bottom edge of cards/buttons.
  2. **Core Components**:
     - `GlowButton`: Modular high-performance button supporting:
       * `variant="iridescent"` (Google Ask AI Mode multi-color neon border trace)
       * `variant="deepthink"` (Warm amber/violet specular border with radial hover glow)
       * `variant="aurora"` (Fluid bottom-edge aurora bloom)
       * `variant="specular"` (Clean cursor-following highlight sheen)
     - `BorderGlow`: Wrapper container with cursor-following radial mesh border glow.
  3. **Integration Points in Cadence Canvas**:
     - Header Capsule Switcher (`Secuenciador` vs `Red Orbital`) with iridescent active state.
     - Footer Action Button `+ Nuevo Hilo` in `DawCanvas`.
     - Drawer Action Button `+ Nueva Escena` in `ManuscriptBinder`.
     - Quick action buttons and dock triggers with subtle specular and aurora accents.
- **Author**: Principal UI/UX Designer & Systems Engineer
- **Status**: `completed-verified`
- **Verification**:
  - Unit tests: 52/52 passing (`npm test`).
  - Production build: Clean compilation (`npm run build`).
  - Live Browser inspection: Verified on `http://localhost:1420/`.
- **Target Architecture**: React 19 + pure CSS hardware-accelerated animations (`ui/src/components/GlowButton.tsx`, `ui/src/components/BorderGlow.tsx`, `ui/src/index.css`).
