# ODD Specification: Narrative Station Core (Estación de Montaje Narrativo)

- **Task ID**: `narrative-station-core`
- **Feature**: Core de Dominio, Persistencia SQLite Local `.cadence`, Motor Sweep-Line Determinista y CLI Bimodal
- **Author**: Auditor Hostil Gentle-AI & Metodólogo Senior
- **Status**: `approved-hardened`
- **Delivery Strategy**: `auto-chain` (Slices atómicos <= 400 líneas)
- **Target Architecture**: Single-file SQLite `.cadence` + Rust workspace (`cadence-core`, `cadence-cli`)

---

## 1. Causal Authority & Invariants (Leyes Mecánicas del Sistema)

1. **Invariante de Fuente Única de Verdad (Single Source of Truth) y WAL**:
   - Toda la novela reside exclusivamente en un único archivo local `.cadence` (SQLite empotrado con WAL, `busy_timeout = 5000ms`, `synchronous = NORMAL`).
   - Cero mocks, cero estado volátil desacoplado, cero servidores de red o puertos locales.
   - Cualquier lectura o mutación (por GUI o CLI) se ejecuta directamente a través de `cadence-core`.

2. **Invariante de Concurrencia Optimista (OCC) y Prevención de Lost-Updates**:
   - Cada escena tiene un contador `version: i64 NOT NULL DEFAULT 1` y una marca temporal `updated_at`.
   - Toda mutación de texto o coordenadas requiere verificar la versión esperada:
     `UPDATE scenes SET text = :text, version = version + 1 WHERE id = :id AND version = :expected_version`.
   - Si `rows_affected == 0`, se dispara conflicto causal (`StaleMutationConflict`). La UI (ProseMirror) implementa rebase o buffer draft no destructivo; el CLI aborta con código `EX_CONFLICT (75)` a menos que se use `--force`.
   - Toda transacción de escritura dura < 5ms (`BEGIN IMMEDIATE` -> Mutación SQL -> `COMMIT`). Se prohíbe retener transacciones abiertas durante I/O, red o renderizado.

3. **Invariante Espacio-Temporal 2D y Desempate Total (Total Ordering Tuple)**:
   - Cada bloque de escena posee coordenadas $(track\_id, t_{start}, duration, z\_index)$.
   - Para garantizar que el hash del manuscrito ensamblado sea idéntico byte a byte en cualquier plataforma y condición de carrera, el orden total $\mathcal{K}(S)$ se calcula mediante la 6-tupla estricta:
     $$\mathcal{K}(S) = (t_{start} \uparrow,\, track\_order \uparrow,\, anchor\_topo \uparrow,\, z\_index \uparrow,\, created\_at\_ns \uparrow,\, scene\_id \uparrow)$$
   - Los carriles silenciados (`is_muted = 1`) se excluyen mecánicamente del ensamblado.

4. **Invariante de Grafo de Anclas Acíclico (DAG Reading Anchors)**:
   - Las anclas de lectura manuales (`reading_anchors`) definen precedencias relativas.
   - Toda inserción de ancla valida en tiempo de escritura que no se cree un ciclo ($A \to B \to A$) mediante detección de ciclos DFS/Kahn. La creación de ciclos se rechaza con `CyclicAnchorError` (`ROLLBACK`).
   - Si existiese una inconsistencia residual en tiempo de ensamblado, se aplica la regla de degradación determinista: se desactiva la arista de anclaje más reciente y se preserva el orden Sweep-Line canónico sin colgar el hilo.

5. **Invariante de Resiliencia ante Cortes de Energía (Power-Cut Resilience)**:
   - La integridad de la base está respaldada por transacciones WAL atómicas de SQLite.
   - La exportación de manuscritos (Markdown, Docx) sigue estrictamente el protocolo `write-to-temp-and-rename`: se escribe en `.tmp.<uuid>`, se ejecuta `sync_all()`, y se renombra atómicamente (`std::fs::rename`). Si el proceso muere a la mitad, no hay archivos corruptos.

---

## 2. Schema DDL v1 (Persistencia SQLite en `.cadence`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#6366f1',
    track_order INTEGER NOT NULL,
    is_muted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY NOT NULL,
    track_id TEXT NOT NULL,
    t_start INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    z_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    char_count INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS reading_anchors (
    id TEXT PRIMARY KEY NOT NULL,
    from_scene_id TEXT NOT NULL,
    to_scene_id TEXT NOT NULL,
    anchor_type TEXT NOT NULL DEFAULT 'precedes',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(from_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY(to_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    UNIQUE(from_scene_id, to_scene_id)
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL, -- 'character', 'location', 'item', 'faction'
    name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY NOT NULL,
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    rel_type TEXT NOT NULL,
    revealed_at_scene_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(to_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(revealed_at_scene_id) REFERENCES scenes(id) ON DELETE SET NULL
);

-- Índices de Alta Concurrencia y Búsqueda Espacial
CREATE INDEX IF NOT EXISTS idx_scenes_track_time ON scenes(track_id, t_start, duration);
CREATE INDEX IF NOT EXISTS idx_tracks_project_order ON tracks(project_id, track_order);
CREATE INDEX IF NOT EXISTS idx_entities_project_kind ON entities(project_id, kind);
CREATE INDEX IF NOT EXISTS idx_relations_pair ON relations(from_entity_id, to_entity_id);
```

---

## 3. Inputs & Deterministic Operations

| Operación | Input | Salida Observable & RDD Receipt |
|---|---|---|
| `project_init` | `path: PathBuf, title: String` | Archivo `.cadence` con schema v1 verificado (`PRAGMA integrity_check = ok`). |
| `track_create` | `project_id, name, color, order` | `TrackCreatedReceipt { track_id, track_order }`. |
| `scene_create` | `track_id, t_start, duration, title, text` | `SceneCreatedReceipt { scene_id, version: 1, words, chars }`. |
| `scene_edit` | `scene_id, expected_version, text` | `SceneUpdatedReceipt { scene_id, version: N+1, words, chars }` o `ConflictError`. |
| `scene_move` | `scene_id, expected_version, track_id, t_start` | Coordenadas actualizadas con versión incrementada. |
| `anchor_create`| `from_scene_id, to_scene_id, anchor_type` | Arista en `reading_anchors` o `CyclicDependencyError`. |
| `assemble` | `project_id, format (Markdown\|Docx), target_path` | `AssemblyReceipt { sha256_hash, scene_count, word_count, bytes_written }`. |
| `cli_query` | Subcomandos con `--json` | Salida JSON determinista en stdout, exit code 0. |

---

## 4. Verification Gates (Criterios de Aceptación Innegociables)

1. **Gate 1 - Persistencia, WAL & Concurrencia**:
   - `cargo test -p cadence-core -- storage::` pasa al 100%.
   - Test de contención concurrente: 50 hilos intentando mutar escenas simultáneamente con jitter; 0 bloqueos `SQLITE_BUSY`, 100% consistencia de versiones.
2. **Gate 2 - Sweep-Line & Determinismo Byte-a-Byte**:
   - Test con 500 escenas con colisiones simultáneas exactas de `t_start` y `track_order`.
   - El hash SHA-256 del manuscrito ensamblado es idéntico al `golden_assembly_hash` en 1.000 iteraciones consecutivas.
3. **Gate 3 - Anclas DAG & Aciclicidad**:
   - Inserción de ciclo recursivo $A \to B \to A$ es abortada y rechazada mecánicamente.
4. **Gate 4 - Aho-Corasick & Scanner de Menciones**:
   - Extracción de menciones para 1.000 entidades en 10.000 palabras se ejecuta en < 500 microsegundos en RAM (< 350 KB footprint).
5. **Gate 5 - Resiliencia ante Crash**:
   - Ensamblado interrumpido prematuramente no deja artefactos corruptos en la ruta final de destino.

---

## 5. Negative Space & Rejected Hypotheses (Anti-AI-Slop)

- **Rechazado: Almacenamiento en carpetas de archivos Markdown planos sueltos.** Rompe la atomicidad transaccional y la sincronización bimodal instantánea con agentes.
- **Rechazado: Servidor local HTTP / REST / WebSocket para comunicar CLI y GUI.** Introduce complejidad de puertos, serialización extra y riesgos de socket huérfano. CLI y GUI interactúan como librerías directas contra el mismo motor `cadence-core` y la misma base SQLite WAL.
- **Rechazado: ORMs pesados con metaprogramación opaca.** Uso de queries SQL explícitas en `rusqlite` con transacciones de microsegundos y migraciones versionadas.
- **Rechazado: Cálculos tonales en el hilo de UI de ProseMirror.** El cálculo de métricas tonales se delega asíncronamente a Rust (`rayon`) en una única pasada < 0.5ms.

---

## 6. Slices Catálogo (Auto-Chain <= 400 LOC Budget)

| Slice ID | Módulo | Objetivo Causal | Límite LOC | Conventional Commit | Estado / Receipt |
|---|---|---|---|---|---|
| **Slice 1.1** | `storage` | Conexión SQLite WAL, pragmas, schema DDL v1 y test de integridad. | <= 300 LOC | `feat(storage): initialize sqlite wal schema v1 with pragmas` | ✅ Delivered (`e9dcdcb`, 4/4 tests ok, 299 LOC) |
| **Slice 1.2** | `domain` | Tipos de dominio, validadores y CRUD de `Project` y `Track`. | <= 320 LOC | `feat(domain): track and project entities with causal validation` | ✅ Delivered (`ac04323`, 7/7 tests ok, 263 LOC) |
| **Slice 1.3** | `domain/scene` | CRUD de `Scene` con OCC (`version`), contadores de palabras y retry helper. | <= 350 LOC | `feat(domain): scene operations with optimistic version locking` | ✅ Delivered (`c819a6e`, 11/11 tests ok, 282 LOC) |
| **Slice 1.4** | `cli` | Scaffolding de `cadence` CLI (`init`, `track`, `scene`) con soporte `--json`. | <= 380 LOC | `feat(cli): bimodal cli scaffolding for project, tracks and scenes` | ✅ Delivered (`be0d776`, 3/3 tests ok, 271 LOC) |
| **Slice 2.1** | `sweep_line` | Algoritmo Sweep-Line puro 2D con tupla total de desempate y golden hash test. | <= 310 LOC | `feat(sweep): 2d sweep-line assembly engine with total tie-breaking` | ✅ Delivered (`249dd42`, 5/5 tests ok, 95 LOC) |
| **Slice 2.2** | `anchors` | DAG de lectura, validación acíclica Kahn y ordenación topológica. | <= 330 LOC | `feat(anchors): reading anchors dag with cycle detection` | ✅ Delivered (6/6 tests ok, 225 LOC) |
| **Slice 2.3** | `export/md` | Exporter Markdown puro con write-to-temp atómico y tests byte-exact. | <= 260 LOC | `feat(export): deterministic markdown manuscript generator` |
| **Slice 2.4** | `export/docx`| Exporter Docx modular implementando el trait `DocumentExporter`. | <= 380 LOC | `feat(export): standard manuscript docx generator` |
| **Slice 3.1** | `mentions` | Matcher Aho-Corasick para `@`, `#`, `!` en memoria y resolución de entidades. | <= 300 LOC | `feat(mentions): fast aho-corasick entity mention extraction` |
| **Slice 3.2** | `world_graph` | Subgrafo 1-hop de escena y auditor de anacronismos temporales. | <= 340 LOC | `feat(world): 1-hop ego-graph extraction and temporal validator` |
| **Slice 3.3** | `metrics` | Pipeline de histograma tonal en 1 pasada (< 0.5ms) sobre buffer de texto. | <= 280 LOC | `feat(metrics): single-pass 4-channel tonal histogram engine` |
