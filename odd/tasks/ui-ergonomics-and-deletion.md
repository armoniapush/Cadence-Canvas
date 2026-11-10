# ODD Specification: UI Ergonomics, Clean Interface & Scene Deletion

- **Task ID**: `ui-ergonomics-and-deletion`
- **Feature**: Eliminación de Escenas (`delete_scene` en IPC/CLI/UI), Eliminación de HUDs Tácticos Innecesarios, y Telemetría Compacta en Barra de Estado
- **Author**: Swarm de Refinamiento Gentle-AI & Diseñadores UI
- **Status**: `approved-hardened`
- **Delivery Strategy**: `auto-chain` (Slices atómicos <= 400 líneas)
- **Target Architecture**: Rust Tauri v2 IPC (`src-tauri`) + `cadence-cli` + React 19 Frontend (`ui/`)

---

## 1. Invariantes Causales y Directivas de Diseño

1. **Invariante de Eliminación Causal en Cascada**:
   - `Scene::delete(conn, id)` elimina la escena físicamente de SQLite.
   - Las claves foráneas `ON DELETE CASCADE` configuradas en SQLite WAL eliminan automáticamente todas las aristas en `reading_anchors` y `scene_entity_mentions` vinculadas a la escena sin dejar nodos huérfanos.
   - En la UI, la eliminación deselecciona inmediatamente la escena y actualiza el Canvas DAW y el contador de palabras.

2. **Invariante Anti-Ruido (Eliminación de HUDs Innecesarios)**:
   - Eliminar el bloque aparatoso "HUD LEICA / ARRI" y "Controles Tácticos" que saturaban la pantalla con estética militar artificial.
   - Mantener métricas esenciales y limpias para el autor: conteo de palabras, tiempo estimado de lectura y estado de guardado.
   - Eliminar el panel lateral izquierdo de 260px que consumía espacio: la telemetría causal se traslada a una elegante barra de estado inferior (*status bar*) o píldora compacta en el encabezado, otorgando el 100% del ancho horizontal al Canvas DAW.

3. **Invariante de Seguridad en Destrucción**:
   - En la UI, el botón `[ Eliminar Escena ]` en el editor requiere confirmación (o atajo rápido `Supr`/`Backspace` en el Canvas con confirmación o feedback inmediato).

---

## 2. Catálogo de Slices

| Slice ID | Módulo | Objetivo Causal | Límite LOC | Conventional Commit | Estado / Receipt |
|---|---|---|---|---|---|
| **Slice 5.1** | `core/ipc/cli` | Exponer `delete_scene` en Tauri IPC (`commands.rs`), comando `scene delete` en `cadence-cli`, y tests de integración. | <= 200 LOC | `feat(ipc-cli): support scene deletion in tauri commands and cli` | ✅ Completed (+60 LOC, 48/48 cargo tests pass) |
| **Slice 5.2** | `ui/cleanup` | Eliminar HUDs tácticos innecesarios, compactar telemetría en status bar inferior, y agregar botón y atajo `Delete` para borrar escenas. | <= 350 LOC | `feat(ui-clean): remove noisy tactical huds and add scene deletion` | ✅ Completed (+237/-239 LOC, vite build clean, 48/48 cargo tests pass) |
| **Slice 5.3** | `testing` | Suite de tests automatizados para borrado de escena, atajos y renderizado limpio sin HUDs ruidosos. | <= 250 LOC | `test(ui): verify scene deletion lifecycle and clean layout` | ✅ Completed (7/7 node tests pass, 48/48 cargo tests pass) |
| **Slice 5.4** | `ui/tracks` | Botón visual '+ Nueva Subtrama' con modal/paleta de color, soporte para silenciar carril (Mute) y comando IPC `set_track_muted`. | <= 300 LOC | `feat(ui-tracks): add create subplot modal and track mute controls` | ✅ Completed (+260 LOC, 8/8 node tests pass, vite build clean, 48/48 cargo tests pass) |
