# ODD Specification: Ultra-Senior Craft Elevation & UI Polish (Anti-AI-Slop)

- **Task ID**: `ui-craft-elevation-visual-overhaul`
- **Feature**: Elevación visual artesanal de la Estación Narrativa Cadence Canvas inspirada en referencias de diseño (Mount, Markus AI, Wavely): Glassmorphism profundo, Floating Pill Navigation, Dot-Matrix Canvas, Tarjetas de Escena redondeadas con reflejo especular, Visualizador de Ritmo Tonal Espectral Cromático unificado, y Floating Bottom Dock.
- **Author**: Swarm de Frontend & Diseño de Interacción Gentle-AI
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain` (Slices atómicos <= 350 líneas)
- **Target Architecture**: React 19 (`ui/src/index.css`, `ui/src/App.tsx`, `ui/src/canvas/renderer.ts`, `ui/src/canvas/DawCanvas.tsx`, `ui/src/editor/TonalHud.tsx`, `ui/src/editor/AtomicEditor.tsx`, `ui/src/constellation/RadialConstellation.tsx`)

---

## 1. Directivas de Diseño & Principios de Artesanía

1. **Paleta y Atmósfera (Deep Obsidian & Matte Graphite)**:
   - Fondos: `#0a0b0e` (Canvas base), `#111317` (Superficies de trabajo y carriles narrativos), `#161820` (Paneles elevados y racks), `rgba(17, 19, 23, 0.78)` con `backdrop-filter: blur(12px)` para islas flotantes.
   - Bordes especulares de 1px: `rgba(255, 255, 255, 0.06)` y `rgba(255, 255, 255, 0.12)` en hover/activo.
   - Ausencia total de gradientes genéricos morado-cian "AI-slop"; en su lugar, tonos nítidos con propósito dramático y tipografía sans-serif editorial nítida.

2. **Navegación en Floating Pill Navbar**:
   - Barra superior flotante con bordes redondeados completos (`border-radius: 9999px` o `16px`), flotando en la parte superior del canvas.
   - Conmutador de vista segmentado (`☵ Línea de Tiempo` / `◈ Red de Personajes`) con indicador activo luminoso y transiciones suaves.
   - Indicador de estado de persistencia SQLite WAL con pulso orgánico esmeralda.

3. **Lienzo y Fichas Literarias de Escena**:
   - Fondo con patrón dot-matrix rítmico sutil (inspirado en Wavely).
   - Fichas de escena con radio de curvatura suave de 12px, bisel superior especular de 1px, acento de hilo vertical refinado, y badges de lectura (`[ 450 palabras · ~2 min ]`) estilizados.
   - Cintas causales Bézier de lectura orgánicas con gradiente tonal cromático y atenuación de bordes.

4. **Visualizador de Ritmo Tonal Espectral Cromático**:
   - Reemplazo de las 4 cajas aisladas y apretadas por un visualizador horizontal continuo y orgánico:
     * Onda espectral de cadencia narrativa (muestra la variación de ritmo entre oraciones cortas e introspectivas vs. párrafos de acción densa).
     * Barra cromática horizontal fusionada (Diálogo en cian `#38bdf8`, Acción en ámbar `#f97316`, Lore en esmeralda `#10b981`, Monólogo en amatista `#a855f7`).
     * Métricas de fluidez editorial limpias y legibles.

5. **Floating Bottom Dock & Controles de Zoom**:
   - Dock flotante en la zona inferior con controles de zoom (`-`, `100%`, `+`), recentrado de vista y estado de telemetría de palabras.

6. **Micro-interacciones y React Micro-detalles**:
   - Estados hover con sutil elevación (`translateY(-1px)`).
   - Feedback táctil en clic (`transform: scale(0.97)`).
   - Animación de entrada suave del editor lateral y modales con `cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 2. Catálogo de Slices

| Slice ID | Módulo | Objetivo Causal | Límite LOC | Conventional Commit | Estado |
|---|---|---|---|---|---|
| **Slice 7.1** | `index.css` & `TonalHud` | Nueva paleta Obsidian/Matte, variables CSS, microanimaciones y rediseño del Visualizador Espectral Cromático de Ritmo Tonal. | <= 250 LOC | `feat(ui-craft): chromatic tonal rhythm wave and obsidian palette` | ✅ Completed |
| **Slice 7.2** | `canvas/renderer` & `DawCanvas` | Canvas Dot-Matrix sutil, tarjetas redondeadas (r=12px) con bisel especular, cintas orgánicas Bézier y floating dock de zoom. | <= 350 LOC | `feat(ui-craft): dot-matrix canvas, rounded cards and floating dock` | ✅ Completed |
| **Slice 7.3** | `App.tsx` & `AtomicEditor` | Floating Pill Navbar superior con conmutador segmentado, modales pulidos, panel de edición lateral con microanimaciones fluidas. | <= 350 LOC | `feat(ui-craft): floating pill navbar and micro-interaction polish` | ✅ Completed |
| **Slice 7.4** | `tests` & Verificación | Actualización y ampliación de pruebas automatizadas, compilación Vite limpia y validación de suite backend. | <= 200 LOC | `test(ui-craft): verify visual overhaul and interaction invariants` | ✅ Completed |

---

## 3. Verificación de Suites de Pruebas

- **UI Unit Tests**: `npm test --prefix ui` -> 14/14 tests passing (2 suites, 0 failures).
- **Vite Build**: `npm run build --prefix ui` -> 37 modules compiled cleanly in 866ms.
- **Cargo Tests**: `cargo test --workspace` -> 41/41 unit & integration tests passing cleanly.
