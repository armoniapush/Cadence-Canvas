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
| **Slice 6.1** | `canvas/renderer` | Rediseñar el renderizador visual: regla de 3 actos, fichas de escena literarias con extracto de texto, y cabeceras de hilos narrativos con control de visibilidad `[ 👁 ]`. | <= 300 LOC | `feat(ui-narrative): transform daw canvas into literary story timeline` | ⏳ Ready |
| **Slice 6.2** | `ui/app` | Limpiar encabezados globales, terminología de navegación ('Línea Narrativa', 'Red de Personajes'), y barra de estado editorial. | <= 250 LOC | `feat(ui-narrative): narrative terminology and refined editorial chrome` | ⏳ Pending |
| **Slice 6.3** | `testing` | Pruebas automáticas y en vivo con Chrome DevTools certificando la nueva experiencia narrativa. | <= 200 LOC | `test(ui-narrative): verify narrative timeline and literary controls` | ⏳ Pending |
