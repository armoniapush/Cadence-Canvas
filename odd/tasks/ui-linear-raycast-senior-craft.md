# ODD Specification: Linear/Raycast Senior Craft & Anti-Slop System Overhaul

- **Task ID**: `ui-linear-raycast-senior-craft`
- **Features**:
  1. **Zero-Emoji Policy & Lucide SVG Standard**:
     - Eradicate every emoji (`📊`, `👁`, `👁‍🗨`, `🗖`, `⛶`, `☵`, `◈`, etc.) across all components.
     - Replace with 14-16px Lucide/Phosphor style SVG icons with `stroke-width="1.5"` and `currentColor`.
  2. **4-Tier Button Hierarchy**:
     - `Primary`: Solid zinc-100 / zinc-900 font-medium hover:bg-white (strictly 1 primary per view).
     - `Secondary / Subtle`: `bg-zinc-800/60`, `border border-zinc-700/50`, `text-zinc-300`, `hover:bg-zinc-700/60`.
     - `Ghost`: Transparent background & border (`bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`) for Zen, Ajustes, Exportar, etc.
     - `Destructive`: Ghost with muted text, turns red strictly on hover (`text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20`).
  3. **Refined Mentions & Semantic Entity Badges (@Personaje, #Lugar, !Objeto)**:
     - 10% opacity tints with matching 20% borders:
       * Personaje: `bg-sky-500/10 text-sky-400 border border-sky-500/20` with 12px `User` icon.
       * Lugar: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` with 12px `MapPin` icon.
       * Objeto: `bg-amber-500/10 text-amber-400 border border-amber-500/20` with 12px `Box` icon.
     - Eliminate crude `@`, `#`, `!` prefixes.
  4. **Borderless Inline Editable Scene Title**:
     - Natural typography (`text-base font-semibold text-zinc-100`), seamlessly disguised as static text until hovered/focused (`hover:bg-zinc-800/30 rounded px-1.5 py-0.5`).
  5. **Extended Ghost Buttons ("Nuevo Hilo" / "Nueva Escena")**:
     - Remove thick dashed borders.
     - Use `border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg py-2.5 transition-all text-xs font-medium`.
  6. **Zinc Neutral Palette & Micro-Typography**:
     - Neutral dark zinc scale (`#09090b` zinc-950 canvas, `#18181b` zinc-900 surface, `#27272a` zinc-800 elevated, `#3f3f46` zinc-700 dividers).
     - Consistent `rounded-md` (6px) and `rounded-lg` (8px).
     - Enforce `tabular-nums` for all metrics.
- **Author**: Antigravity Coordinator (Gentle-AI & Impeccable)
- **Status**: `completed-verified`
- **Verification**:
  - Unit Tests: 51/51 tests passing (`npm test`).
  - TypeScript & Vite Build: Clean compilation (`npm run build`).
  - CDP Live Browser Inspection: Verified on `http://localhost:1420/`.
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/App.tsx`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/src/editor/TonalHud.tsx`, `ui/src/components/ManuscriptBinder.tsx`, `ui/src/index.css`)

---

## 1. Problem Statement & User Directive

- User Directive: Act as Principal UI/UX Designer specialized in Linear, Raycast, and Figma high-density dark mode. Eradicate all "AI slop" emojis, crude pill buttons, dashed borders, and red blocks. Implement strict 4-tier button hierarchy, clean Lucide SVGs, subtle semantic entity badges, and borderless editable titles.
