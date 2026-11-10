# ODD Specification: Narrative Timeline & Storyboard Redesign (Anti-DAW / Anti-AI-Slop)

- **Task ID**: `ui-narrative-timeline-redesign`
- **Feature**: Rediseño de la UI desde estación de audio DAW a una verdadera Estación de Montaje y Línea de Tiempo Narrativa (Estructura en 3 Actos, Fichas de Escena Literarias, Hilos de Trama/POV y Red de Personajes)
- **Author**: Swarm de Arquitectura Narrativa & Diseñadores Literarios Gentle-AI
- **Status**: `approved-hardened`
- **Delivery Strategy**: `auto-chain` (Slices atómicos <= 350 líneas)
- **Target Architecture**: React 19 (`ui/src/canvas/renderer.ts`, `DawCanvas.tsx`, `App.tsx`, `AtomicEditor.tsx`)

---

## 1. Directivas de Diseño Literario & Anti-AI-Slop

1. **De DAW de Audio a Línea de Tiempo Narrativa**:
   - Eliminar términos de audio (`DAW`, `TRK 01`, `[ M ] Mute`, `BPM`, compases numéricos abstractos `T:0..T:400`).
   - Sustituir por conceptos narrativos reales:
     * **Regla de Estructura Narrativa**: Progresión de la historia organizada por Actos e hitos argumentales (**Acto I: Planteamiento**, **Incidente Incitador**, **Acto II: Confrontación**, **Punto Medio / Midpoint**, **Crisis**, **Acto III: Clímax & Desenlace**).
     * **Hilos de Trama / Puntos de Vista (POV)**: En lugar de "Pistas de audio", son Hilos Narrativos (Trama Principal, Subtramas, POVs) con indicador de visibilidad `[ 👁 ]` en lugar del botón `[ M ]`.
     * **Fichas de Escena (Story Cards)**: Tarjetas visuales que muestran el título de la escena, un extracto legible del texto de la escena, y un badge limpio de palabras/tiempo de lectura (`450 palabras · ~2 min`), en lugar de etiquetas crípticas de audio (`0w v8 T:218`).

2. **Cero AI-Slop & Tipografía Editorial**:
   - Reemplazar acentos de cian neón estridente y fondos tipo matriz por una paleta editorial cálida, oscura y concentrada (estilo Scrivener, Ulysses, Notion, Obsidian).
   - Tipografía limpia con contraste equilibrado y bordes suaves.

---

## 2. Catálogo de Slices

| Slice ID | Módulo | Objetivo Causal | Límite LOC | Conventional Commit | Estado / Receipt |
|---|---|---|---|---|---|
| **Slice 6.1** | `canvas/renderer` | Rediseñar el renderizador visual: regla de 3 actos, fichas de escena literarias con extracto de texto, y cabeceras de hilos narrativos con control de visibilidad `[ 👁 ]`. | <= 300 LOC | `feat(ui-narrative): transform daw canvas into literary story timeline` | ✅ Completed |
| **Slice 6.2** | `ui/app` | Limpiar encabezados globales, terminología de navegación ('Línea Narrativa', 'Red de Personajes'), y barra de estado editorial. | <= 250 LOC | `feat(ui-narrative): transform daw canvas into literary story timeline` | ✅ Completed |
| **Slice 6.3** | `testing` | Pruebas automáticas y en vivo con Chrome DevTools certificando la nueva experiencia narrativa. | <= 200 LOC | `test(ui-narrative): verify narrative timeline and literary controls` | ⏳ Pending |

---

## 3. Receipts & Evidencia de Implementación (Slices 6.1 & 6.2)

- **Fichas Literarias de Novela (Index Cards)**:
  * Altura de tarjeta: 88px (`TRACK_HEIGHT = 104`, `CARD_PAD_Y = 8`, `CARD_HEIGHT = 88`).
  * Escala métrica: `PIXELS_PER_UNIT = 1.3`.
  * Cabecera de hilos: `TRACK_HEADER_WIDTH = 200`.
  * Paleta Warm-Slate: fondo `#161822`, selección `#1e2235`, esquinas redondeadas 6px, acento izquierdo de 4px con el color del hilo/subtrama.
  * Extracto narrativo dinámico en gris `#94a3b8` mostrando las primeras palabras de la escena.
  * Badge inferior editorial: `[ X palabras · ~Y min ]` y etiqueta `v{version}` limpia, eliminando códigos de audio (`0w T:218`).
- **Regla Superior en Tres Actos**:
  * Acto I (0 .. 120): `ACTO I · PLANTEAMIENTO`
  * Acto II (120 .. 360): `ACTO II · CONFRONTACIÓN`
  * Punto Medio (~240): Línea vertical dorada `#eab308` y badge `PUNTO MEDIO` en regla y carriles.
  * Acto III (360 .. 480+): `ACTO III · CLÍMAX Y RESOLUCIÓN`
  * Título fijo de cabecera: `ESTRUCTURA NARRATIVA`.
- **Hilos Narrativos y Visibilidad**:
  * Botón de visibilidad `[ 👁 ]` / `[ 👁‍🗨 ]` reemplaza `[ M ]` de audio.
  * Atenuación de escenas cuando el hilo está oculto (`globalAlpha = 0.35`).
- **Limpieza de Terminología Editorial**:
  * `+ Nueva Subtrama` -> `+ Nuevo Hilo Narrativo`.
  * `☵ Vista Canvas DAW` -> `☵ Línea de Tiempo`.
  * `◈ Constelación Causal / Vista Radar` -> `◈ Red de Personajes & Lugares`.
  * Barra de estado: `{tracks.length} hilos narrativos · {scenes.length} escenas`.
- **Verificación**:
  * `npm test --prefix ui`: 9 tests passing (100% assertions green).
  * `npm run build --prefix ui`: Vite build completado en 876ms sin errores.
  * `cargo check`: Verificado con 0 errores.

