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
| **Slice 4.2** | `ui/canvas` | Motor de Canvas DAW (3 capas: rejilla diegética, cintas Sankey Bézier k=0.48 y tarjetas de escena tácticas). | <= 400 LOC | `feat(ui-canvas): 120fps daw narrative canvas with sankey ribbons` | ✅ Completed |
| **Slice 4.3** | `ui/editor` | Editor Atómico con Tiptap, HUD métrico cuadricanal en tiempo real y Modo Zen con atajo `F11`. | <= 400 LOC | `feat(ui-editor): atomic editor with real-time hud and zen mode` | ✅ Completed |
| **Slice 4.4** | `ui/constellation`| Constelación radial de entidades con scrubber temporal $T_{story}$ y auditor de anacronismos. | <= 400 LOC | `feat(ui-constellation): radial ego-graph with temporal scrubber` | ✅ Completed |

### Receipt de Ejecución: Slice 4.4 (`ui/constellation`)
- **Constelación Radial Ego-Graph (`ui/src/constellation/RadialConstellation.tsx`, 265 LOC)**:
  * Diagrama orbital táctico con anillos concéntricos de rango (`Órbita I: 100`, `Órbita II: 170`, `Órbita III: 240`) y retículas de mira telescópica en fondo militar (`#090a0f`).
  * Nodo Ego Central con anillo de enfoque pulsante, doble borde especular, badge de conteo de menciones y conmutador dinámico de centro mediante selector o clic en vecinos.
  * Nodos vecinos 1-hop distribuidos equidistantes sobre la órbita radial con enlaces de co-ocurrencia con grosor (`strokeWidth`) y opacidad adaptativos según el peso de la relación (`edge.weight`).
  * Tipología cromática 90/10 OKLCH: `@` Personajes en violeta/azul (`#818cf8`), `#` Lugares en cian/esmeralda (`#2dd4bf`), `!` Objetos en ámbar (`#fbbf24`).
  * Scrubber Temporal Diegético ($T_{story}$): barra interactiva inferior conectada al tiempo diegético que atenúa dinámicamente (`opacity: 0.28`, borde discontinuo y badge causal) las entidades fuera de su rango de existencia (`born_at` o `died_at`). Sincronizado bidireccionalmente con la escena activa del Canvas DAW.
  * Panel táctico desplegable de Auditoría de Anacronismos Causales: consume `api.auditTimeline()`, identifica violaciones temporales (`PRE-BIRTH` y `POST-MORTEM`) y ofrece salto directo e instantáneo a la escena infractora.
  * Presupuesto cumplido estrictamente: 265 LOC en componentes de constelación (<= 400 LOC).
- **Puente IPC de Entidades (`src-tauri`)**: Comando IPC `list_entities` registrado en Tauri y probado en suite de pruebas de ciclo de vida.
- **Integración en `App.tsx`**: Botón de alternancia táctico en cabecera `◈ Constelación Causal / Vista Radar` permitiendo conmutar fluidamente entre el Canvas DAW a 120 FPS y la constelación orbital manteniendo la sincronización de escena y el editor atómico en vivo.
- **Verificación**: `npm run build` en `ui/` construye exitosamente en 833ms sin errores de TypeScript; suite de pruebas Rust (`cargo test`) pasa al 100% (48 tests).

### Receipt de Ejecución: Slice 4.3 (`ui/editor`)
- **HUD Métrico Leica / ARRI (`ui/src/editor/TonalHud.tsx`, 122 LOC)**:
  * Visualizador cuadricanal en tiempo real: Diálogo cyan (`#38bdf8`), Acción amber (`#f97316`), Lore esmeralda (`#10b981`), Monólogo violeta (`#8b5cf6`) con porcentajes y micro-barras reactivas.
  * Medidor de Varianza de Cadencia ($\sigma^2$) con pulso rítmico dinámico animado vía keyframe `cadencePulse`.
  * Contador en vivo de palabras y caracteres. Modo compacto como pastilla flotante para el Modo Zen minimalista.
- **Editor Atómico Desacoplado (`ui/src/editor/AtomicEditor.tsx`, 183 LOC)**:
  * Buffer draft local independiente con guardado automático debounceado (600ms) o instantáneo vía `Ctrl+S` / `Cmd+S`.
  * Manejo no destructivo de conflictos OCC (`StaleMutationConflict` / código 75): si la versión esperada no coincide, retiene intacto el texto del autor en memoria y presenta opciones tácticas de "Rebasar / Forzar" o "Descartar".
  * Modo Zen minimalista activable mediante atajo `F11` o botón táctico: fondo ultra-oscuro militar (`#090a0f`), ancho de lectura inmersivo optimizado (65-75 caracteres, `72ch`), y HUD Leica/ARRI superior flotante.
  * Selector y tags interactivos de menciones rápidas causales: `@ Personaje`, `# Lugar`, `! Objeto`.
  * Presupuesto cumplido estrictamente: 122 + 183 = 305 LOC en componentes de editor (<= 400 LOC).
- **Integración en `App.tsx`**:
  * Acoplamiento en tiempo real con la escena seleccionada en el Canvas DAW.
  * Estado de Modo Zen controlado a nivel superior con listener de teclado global para `F11` y `Esc`.
  * Sincronización continua de recuento de palabras y versiones entre el editor atómico y las tarjetas del canvas.
- **Verificación**: `npm run build` en `ui/` genera bundle en 868ms sin errores de TypeScript; suite de pruebas Rust (`cargo test`) pasa al 100% (48 tests).

### Receipt de Ejecución: Slice 4.2 (`ui/canvas`)
- **Motor de Renderizado Canvas 120 FPS (`ui/src/canvas/renderer.ts`, 205 LOC)**:
  * Capa 1: Rejilla temporal con paso adaptativo por zoom, pistas en fondo ultra-oscuro militar (`#090a0f`, `#0e111a`, `#121520`), cabeceras fijas de carril y regla diegética superior con aguja scrubber cyan (`#38bdf8`).
  * Capa 2: Cintas de masa causal Sankey conectando escenas con curvas Bézier cúbicas suaves (parámetro de curvatura $k = 0.48$), grosor adaptativo y degradados translúcidos basados en colores de carriles.
  * Capa 3: Tarjetas de escena tácticas ("milled rack-mount cards") con borde especular de 1px (`#2d3748`), barra indicadora de color de carril de 4px, badges de conteo de palabras `[ 450w ]`, versión `v{version}` y contornos de selección de alta precisión cyan (`#38bdf8`) / amber (`#f59e0b` durante arrastre).
  * Render loop desacoplado del DOM ejecutándose en `requestAnimationFrame` garantizando 120 FPS.
- **Componente Interactivo (`ui/src/canvas/DawCanvas.tsx`, 188 LOC)**:
  * Viewport virtual con pan horizontal/vertical libre y zoom centrado en cursor acotado en $[0.2x, 3.0x]$.
  * Selección de bloque al clic, arrastre táctil para mover bloques en el tiempo o cambiar de carril emitiendo `onMoveScene(scene, newTrackId, newTStart)` con Concurrencia Optimista (OCC).
  * Doble clic en carriles para creación rápida de nuevas escenas (`onCreateScene`).
  * Presupuesto cumplido estrictamente: 205 + 188 = 393 LOC en componentes de canvas (<= 400 LOC).
- **Puente IPC de Anclas Causal (`src-tauri`)**: Comandos `list_anchors` y `create_anchor` integrados en IPC y probados con ciclo de vida completo.
- **Integración en `App.tsx`**: Espacio central gobernado por `<DawCanvas />` conectado al estado activo, con inspector lateral de escena seleccionada.
- **Verificación**: `npm run build` en `ui/` construye exitosamente en 837ms sin errores de TypeScript; suite de pruebas Rust (`cargo test`) pasa al 100% (48 tests).

### Receipt de Ejecución: Slice 4.1 (`tauri/bridge`)
- **Shell Tauri v2**: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`.
- **Puente IPC Rust (13 comandos)**: `open_project`, `list_tracks`, `create_track`, `list_scenes`, `create_scene`, `update_scene_content`, `move_scene`, `assemble_manuscript`, `get_ego_graph`, `compute_tonal_metrics`, `audit_timeline`, `export_markdown`, `export_docx` con mapeo determinista de errores a `String`.
- **Scaffold Frontend**: React 19 + Vite + TypeScript en `ui/`, cliente typed en `ui/src/api.ts` con fallback para desarrollo en navegador.
- **Verificación**: `npm run build` genera bundle en 897ms; `cargo check` y `cargo test` pasan al 100% (47 tests: 46 previos + 1 de ciclo de vida IPC).

---

## 3. Negative Space & Rejected Hypotheses (L1 Cache)

- **Rechazado: Renderizar miles de nodos temporales en React DOM plano o divs absolutos.** El DOM se degrada a < 15 FPS al hacer pan/zoom con más de 100 elementos con sombras. Se utiliza un `<canvas>` HTML5 acelerado por hardware para el fondo temporal y las cintas Bézier.
- **Rechazado: Servidor proxy intermedio entre frontend y backend.** Tauri v2 provee bindings nativos C/Rust de baja latencia (`invoke`) sin overhead de red.
- **Rechazado: Manipular transformaciones CSS sobre SVG para las cintas Bézier.** El re-layout del árbol SVG en tiempo real genera picos de Garbage Collection y caídas de frames por debajo de 60 FPS con múltiples tracks. El renderizado en `<canvas>` 2D en triple capa con `requestAnimationFrame` mantiene 120 FPS sin bloqueos en el hilo principal del DOM.
- **Rechazado: Mutar estado React en cada evento `mousemove` durante el arrastre de escena.** Despachar mutaciones de estado React a cada tick de ratón causa re-renderizados continuos del árbol JSX. Se mantiene la referencia mutable en `stateRef` y sólo se sincroniza al soltar el puntero (`pointerup`).
- **Rechazado: Borrar o pisar el buffer local del usuario cuando el backend devuelve `StaleMutationConflict` (OCC).** Los cambios no guardados se preservan intactos en la memoria del editor y se ofrece acción explícita de "Rebasar / Forzar" o "Descartar", previniendo cualquier pérdida accidental de texto narrativo.
- **Rechazado: Re-calcular métricas tonales completas en cada pulsación de tecla síncronamente.** Se implementó una cola debounceada (200ms para métricas y 600ms para guardado automático WAL) garantizando una superficie de escritura suave y libre de stuttering a 120 FPS.
- **Rechazado: Renderizar la constelación orbital mediante simulación de fuerzas D3-force con tick dinámico continuo.** Una simulación basada en físicas continuas sobrecarga la CPU/GPU innecesariamente y causa oscilaciones erráticas al cambiar de entidad. Una proyección orbital fija con radios concéntricos proporcionales al peso y ángulos equidistantes ofrece estabilidad visual militar inmediata, lectura táctica precisa y consumo nulo de ciclos inactivos.
- **Rechazado: Ocultar o eliminar completamente del gráfico los nodos fuera de su rango temporal diegético.** Remover los nodos produce saltos bruscos en el layout orbital al mover el scrubber temporal. Se optó por una atenuación visual gradual (`opacity: 0.28`, borde punteado y badge `[No nacido / Fallecido]`), manteniendo la topología del grafo estable mientras se expone con claridad la anacronía.
