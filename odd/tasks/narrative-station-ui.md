# ODD Specification: Narrative Station UI (Superficie Táctica & Shell Tauri v2)

- **Task ID**: `narrative-station-ui`
- **Feature**: Shell Nativo Tauri v2, Puente IPC Rust Directo, Canvas DAW a 120 FPS, Editor Atómico Tiptap con HUD Métrico y Constelación Radial
- **Author**: Swarm de Arquitectura Gentle-AI & Diseñadores Impeccable
- **Status**: `approved-hardened`
- **Delivery Strategy**: `auto-chain` (Slices atómicos <= 400 líneas)
- **Target Architecture**: Tauri v2 (`src-tauri`) + React 19 + Tailwind v4 (`ui/`) + Vite + `cadence-core`

---

## 1. Causal Authority & Architectural Invariants

1. **Invariante de Cero Mock y Puente Directo en Proceso**:
   - La GUI no levanta servidores HTTP ni WebSockets locales.
   - Todas las llamadas de la UI invocan directamente comandos de Tauri (`tauri::command`) que ejecutan funciones de `cadence-core` sobre el archivo `.cadence` abierto en modo WAL.
   - Cada mutación de escena utiliza Concurrencia Optimista (OCC) enviando `expected_version`.

2. **Invariante Gráfica Anti-AI-Slop & DAW Táctico (120 FPS)**:
   - Prohibidos degradados genéricos morado/azul, sombras difusas sin propósito y botones flotantes blandos.
   - Jerarquía cromática 90/10 OKLCH: Fondo ultra-oscuro militar/técnico (`oklch(0.12 0.01 260)`), racks de carriles fresados con micro-borde specular de 1px (`oklch(0.25 0.01 260)`), acentos saturados de alto contraste para carriles narrativos y conectores causales.
   - El Canvas DAW renderiza a 120 FPS en un `<canvas>` nativo desacoplado del DOM para las pistas temporales y cintas de Bézier cúbicas ($k = 0.48$), garantizando cero caídas de frames con miles de bloques.

3. **Invariante de Buffer Draft y Rebase No Destructivo**:
   - Mientras el autor escribe en el Editor Atómico Tiptap, las mutaciones se acumulan en un buffer local en memoria y se envían de forma debounceada (o al desenfocar/atajo `Ctrl+S`).
   - Si se detecta `StaleMutationConflict` (código 75 / versión obsoleta), la UI no borra texto ni abre diálogos modales bloqueantes; resalta el conflicto causal y ofrece rebase no destructivo.

---

## 2. Catálogo de Slices Gentle-AI (Fase 4)

| Slice ID | Módulo | Objetivo Causal | Límite LOC | Conventional Commit | Estado / Receipt |
|---|---|---|---|---|---|
| **Slice 4.1** | `tauri/bridge` | Shell Tauri v2 en `src-tauri`, comandos IPC conectados a `cadence-core`, y scaffolding React 19 + Vite en `ui/`. | <= 400 LOC | `feat(tauri): shell v2 and ipc command bridge for cadence-core` | ✅ Completed |
| **Slice 4.2** | `ui/canvas` | Motor de Canvas DAW (3 capas: rejilla diegética, cintas Sankey Bézier k=0.48 y tarjetas de escena tácticas). | <= 400 LOC | `feat(ui-canvas): 120fps daw narrative canvas with sankey ribbons` | ⏳ Ready |
| **Slice 4.3** | `ui/editor` | Editor Atómico con Tiptap, HUD métrico cuadricanal en tiempo real y Modo Zen con atajo `F11`. | <= 400 LOC | `feat(ui-editor): atomic editor with real-time hud and zen mode` | ⏳ Pending |
| **Slice 4.4** | `ui/constellation`| Constelación radial de entidades con scrubber temporal $T_{story}$ y auditor de anacronismos. | <= 400 LOC | `feat(ui-constellation): radial ego-graph with temporal scrubber` | ⏳ Pending |

### Receipt de Ejecución: Slice 4.1 (`tauri/bridge`)
- **Shell Tauri v2**: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`.
- **Puente IPC Rust (13 comandos)**: `open_project`, `list_tracks`, `create_track`, `list_scenes`, `create_scene`, `update_scene_content`, `move_scene`, `assemble_manuscript`, `get_ego_graph`, `compute_tonal_metrics`, `audit_timeline`, `export_markdown`, `export_docx` con mapeo determinista de errores a `String`.
- **Scaffold Frontend**: React 19 + Vite + TypeScript en `ui/`, cliente typed en `ui/src/api.ts` con fallback para desarrollo en navegador.
- **Verificación**: `npm run build` genera bundle en 897ms; `cargo check` y `cargo test` pasan al 100% (47 tests: 46 previos + 1 de ciclo de vida IPC).

---

## 3. Negative Space & Rejected Hypotheses (L1 Cache)

- **Rechazado: Renderizar miles de nodos temporales en React DOM plano o divs absolutos.** El DOM se degrada a < 15 FPS al hacer pan/zoom con más de 100 elementos con sombras. Se utiliza un `<canvas>` HTML5 acelerado por hardware para el fondo temporal y las cintas Bézier.
- **Rechazado: Servidor proxy intermedio entre frontend y backend.** Tauri v2 provee bindings nativos C/Rust de baja latencia (`invoke`) sin overhead de red.
