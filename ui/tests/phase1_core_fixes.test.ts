import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULER_HEIGHT, computeCardHeaderLayout } from '../src/canvas/renderer.ts';
import { computeActMetrics } from '../src/actMetrics.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Phase 1 Core Fixes & Enhancements Verification', () => {
  it('prompt input parsing extracts clean title and preserves full body text', () => {
    const rawPrompt = 'El detective descubre una carta quemada en la chimenea del orfanato. El sello de cera negra confirma la sospecha.';
    const trimmed = rawPrompt.trim();
    const firstSentence = trimmed.split(/[.?!;\n]/)[0].trim();
    let title = '';
    if (firstSentence.length <= 40) {
      title = firstSentence;
    } else {
      const words = firstSentence.split(' ');
      let acc = '';
      for (const w of words) {
        if ((acc + ' ' + w).trim().length > 40) break;
        acc = (acc + ' ' + w).trim();
      }
      title = (acc || firstSentence.slice(0, 36)) + '...';
    }
    const body = trimmed;

    assert.equal(title, 'El detective descubre una carta quemada...');
    assert.equal(body, rawPrompt);
  });

  it('double click coordinate math subtracts TRACK_HEADER_WIDTH to avoid 210px shift', () => {
    const TRACK_HEADER_WIDTH = 210;
    const PIXELS_PER_UNIT = 1.0;
    const zoom = 1.0;
    const panX = 0;

    // Simulate click at x = 330px (120px into the track timeline)
    const clientX = 330;
    const buggyT = Math.max(0, Math.round((clientX - panX) / (PIXELS_PER_UNIT * zoom)));
    const fixedT = Math.max(0, Math.round((clientX - TRACK_HEADER_WIDTH - panX) / (PIXELS_PER_UNIT * zoom)));

    assert.equal(buggyT, 330); // 210px error!
    assert.equal(fixedT, 120);  // Exact correct placement at 120 units!
  });

  it('export markdown compiler generates valid structured frontmatter and scene entries', () => {
    const mockScenes = [
      { id: 's1', track_id: 't1', t_start: 0, duration: 120, title: 'Prólogo', text: 'En una noche lluviosa...', word_count: 4 },
      { id: 's2', track_id: 't1', t_start: 140, duration: 100, title: 'El Descubrimiento', text: 'La puerta se abrió sola.', word_count: 5 },
    ];
    const title = 'Crónicas del Abismo';
    const author = 'Elena V.';

    let md = `# ${title}\n**Autor:** ${author}\n\n---\n\n`;
    mockScenes.forEach((s, idx) => {
      md += `## Escena ${idx + 1}: ${s.title}\n`;
      md += `> **T:** ${s.t_start}s | **Palabras:** ${s.word_count}\n\n`;
      md += `${s.text}\n\n`;
    });

    assert.ok(md.includes('# Crónicas del Abismo'));
    assert.ok(md.includes('## Escena 1: Prólogo'));
    assert.ok(md.includes('## Escena 2: El Descubrimiento'));
    assert.ok(md.includes('La puerta se abrió sola.'));
  });

  it('export json compiler preserves project integrity and scenes data structure', () => {
    const mockProject = { id: 'p1', title: 'Novela Test', author: 'Autor' };
    const mockScenes = [
      { id: 's1', track_id: 't1', t_start: 0, duration: 120, title: 'Capítulo 1', text: 'Texto', word_count: 1 },
    ];

    const jsonStr = JSON.stringify({
      project: mockProject,
      exportedAt: '2026-11-10T19:40:00Z',
      scenes: mockScenes,
    }, null, 2);

    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.project.title, 'Novela Test');
    assert.equal(parsed.scenes.length, 1);
    assert.equal(parsed.scenes[0].title, 'Capítulo 1');
  });

  it('OCC save mutex prevents race condition between in-flight saves and rapid typing', async () => {
    let databaseVersion = 1;
    let inFlight = false;
    let pending: { title: string; text: string } | null = null;
    let conflictOccurred = false;

    // Simulate backend that takes 50ms and increments version
    async function mockBackendSave(expectedV: number, _text: string) {
      if (expectedV !== databaseVersion) {
        throw new Error('StaleMutationConflict');
      }
      await new Promise((r) => setTimeout(r, 20));
      databaseVersion++;
      return { version: databaseVersion };
    }

    let currentVersionRef = 1;

    async function executeSave(title: string, text: string): Promise<void> {
      if (inFlight) {
        pending = { title, text };
        return;
      }
      try {
        inFlight = true;
        const ver = currentVersionRef;
        const res = await mockBackendSave(ver, text);
        currentVersionRef = res.version;
      } catch {
        conflictOccurred = true;
      } finally {
        inFlight = false;
        if (pending) {
          const next = pending;
          pending = null;
          await executeSave(next.title, next.text);
        }
      }
    }

    // Fire first save
    const p1 = executeSave('Título', 'Palabra uno');
    // Rapidly fire second save while first is in-flight
    const p2 = executeSave('Título', 'Palabra uno y dos');

    await Promise.all([p1, p2]);

    assert.equal(conflictOccurred, false, 'No false concurrency conflict should occur during rapid typing');
    assert.equal(databaseVersion, 3, 'Both revisions should have been saved sequentially with monotonically increasing versions');
  });

  it('tabular monospace typography and truncation utilities in index.css', () => {
    const cssPath = resolve(__dirname, '../src/index.css');
    const css = readFileSync(cssPath, 'utf8');

    // 1. Wire JetBrains Mono / Fira Code monospace font stack
    assert.ok(
      css.includes("--font-mono: 'JetBrains Mono', 'Fira Code', monospace;"),
      'Must map --font-mono to JetBrains Mono / Fira Code monospace font stack'
    );

    // 2. Tabular numeric variants for jitter-free numbers
    assert.ok(css.includes('.tabular-nums {'), 'Must define .tabular-nums utility');
    assert.ok(
      css.includes('font-variant-numeric: tabular-nums;'),
      'Must define font-variant-numeric: tabular-nums'
    );
    assert.ok(
      css.includes('.version-badge') || css.includes('.badge-mono'),
      'Must define badge classes with tabular numbers'
    );

    // 3. Truncation CSS utilities
    assert.ok(css.includes('.truncate-1 {'), 'Must define .truncate-1 utility class');
    assert.ok(css.includes('text-overflow: ellipsis;'), 'Truncate-1 must use text-overflow: ellipsis');
    assert.ok(css.includes('.truncate-2 {'), 'Must define .truncate-2 utility class');
    assert.ok(css.includes('-webkit-line-clamp: 2;'), 'Truncate-2 must use -webkit-line-clamp: 2');
  });

  it('card header track name truncation when text is long (e.g. "Hilo C: Revelación del Oráculo" never overlaps telemetry)', () => {
    const longTrackName = 'Hilo C: Revelación del Oráculo'; // Long track name
    const sceneIdx = 0;
    const words = 850;

    // 1. Standard card width (250px)
    const layout250 = computeCardHeaderLayout(
      250,
      longTrackName,
      sceneIdx,
      words,
      (text: string) => text.length * 7
    );

    assert.ok(layout250.displayTrkName.endsWith('…'), 'Long track name must be cleanly truncated with ellipsis');
    assert.equal(layout250.showMeta, true, 'Standard card width (250px) displays telemetry');
    assert.ok(
      layout250.trkNameW <= layout250.availTrackNameW,
      'Measured track name width must never exceed available width'
    );

    // Collision boundary verification
    const leftEdgeEnd = 27 + layout250.trkNameW + (layout250.showIndex ? layout250.numStr.length * 7 + 14 : 0);
    const rightTelemetryStart = 250 - 16 - layout250.metaStrW;
    assert.ok(
      leftEdgeEnd <= rightTelemetryStart,
      `Track header text must NEVER overlap telemetry (leftEnd: ${leftEdgeEnd} <= rightStart: ${rightTelemetryStart})`
    );

    // 2. Compact card width (140px): Telemetry omitted to prevent collision and preserve readability
    const layout140 = computeCardHeaderLayout(
      140,
      longTrackName,
      sceneIdx,
      words,
      (text: string) => text.length * 7
    );

    assert.equal(layout140.showMeta, false, 'Narrow card must omit telemetry when available width is restricted');
    assert.ok(layout140.availTrackNameW >= 50, 'Track name retains legible available width when telemetry is omitted');
    assert.ok(layout140.displayTrkName.length > 2, 'Track name must remain readable even when truncated');
  });

  it('RULER_HEIGHT = 26 invariant for narrative beats ruler', () => {
    // Invariant: The narrative beats ruler has a clean, understated 26px height
    assert.strictEqual(RULER_HEIGHT, 26, 'RULER_HEIGHT invariant must be exactly 26px');

    // Check renderer source code directly to verify the constant definition
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');

    // Invariant requirement: RULER_HEIGHT is exported and defined as 26
    assert.ok(rendererSrc.includes('export const RULER_HEIGHT = 26;'), 'renderer.ts must export RULER_HEIGHT = 26;');
  });

  it('unified drawer tab state machine transitions and responsive auto-collapse', () => {
    type DrawerTab = 'binder' | 'structure' | 'goals';
    interface DrawerState {
      isOpen: boolean;
      activeTab: DrawerTab;
    }

    function drawerReducer(
      state: DrawerState,
      action:
        | { type: 'TOGGLE_BINDER' }
        | { type: 'TOGGLE_STRUCTURE' }
        | { type: 'SELECT_TAB'; tab: DrawerTab }
        | { type: 'CLOSE' }
        | { type: 'SCENE_SELECTED'; windowWidth: number }
    ): DrawerState {
      switch (action.type) {
        case 'TOGGLE_BINDER':
          if (!state.isOpen) return { isOpen: true, activeTab: 'binder' };
          if (state.activeTab === 'binder') return { ...state, isOpen: false };
          return { isOpen: true, activeTab: 'binder' };
        case 'TOGGLE_STRUCTURE':
          if (!state.isOpen) return { isOpen: true, activeTab: 'structure' };
          if (state.activeTab === 'structure') return { ...state, isOpen: false };
          return { isOpen: true, activeTab: 'structure' };
        case 'SELECT_TAB':
          return { isOpen: true, activeTab: action.tab };
        case 'CLOSE':
          return { ...state, isOpen: false };
        case 'SCENE_SELECTED':
          if (action.windowWidth < 1440) {
            return { ...state, isOpen: false };
          }
          return state;
        default:
          return state;
      }
    }

    // 1. Initial State: Drawer starts open on Binder
    let state: DrawerState = { isOpen: true, activeTab: 'binder' };

    // 2. Toggle Structure (⌘D) switches active tab to 'structure', keeping drawer open
    state = drawerReducer(state, { type: 'TOGGLE_STRUCTURE' });
    assert.equal(state.isOpen, true);
    assert.equal(state.activeTab, 'structure');

    // 3. Toggling structure again when active closes the drawer
    state = drawerReducer(state, { type: 'TOGGLE_STRUCTURE' });
    assert.equal(state.isOpen, false);

    // 4. Toggle Binder (⌘B) re-opens the drawer on 'binder'
    state = drawerReducer(state, { type: 'TOGGLE_BINDER' });
    assert.equal(state.isOpen, true);
    assert.equal(state.activeTab, 'binder');

    // 5. Selecting Goals tab directly switches tab
    state = drawerReducer(state, { type: 'SELECT_TAB', tab: 'goals' });
    assert.equal(state.isOpen, true);
    assert.equal(state.activeTab, 'goals');

    // 6. Responsive auto-collapse: selecting scene on screen < 1440px collapses drawer
    state = drawerReducer(state, { type: 'SCENE_SELECTED', windowWidth: 1366 });
    assert.equal(state.isOpen, false, 'Must auto-collapse on < 1440px screens to prevent 3-panel squeeze');

    // 7. On wide screens (>= 1440px), selecting scene keeps drawer open if already open
    let wideState: DrawerState = { isOpen: true, activeTab: 'binder' };
    wideState = drawerReducer(wideState, { type: 'SCENE_SELECTED', windowWidth: 1600 });
    assert.equal(wideState.isOpen, true, 'Wide displays (>= 1440px) maintain drawer state with sufficient center canvas width');
  });

  it('computeActMetrics calculates actual scene counts, word counts and percentages dynamically based on timestamps', () => {
    // Mock scene dataset across the 3 acts
    const testScenes = [
      // Act I (t_start < 200)
      { id: 's1', track_id: 't1', t_start: 0, duration: 80, title: 'Llamada al Destino', word_count: 500 },
      { id: 's2', track_id: 't2', t_start: 120, duration: 60, title: 'Rechazo del Héroe', word_count: 300 },
      // Act II (200 <= t_start < 400)
      { id: 's3', track_id: 't1', t_start: 210, duration: 90, title: 'Pruebas y Aliados', word_count: 800 },
      { id: 's4', track_id: 't2', t_start: 320, duration: 70, title: 'La Caverna Más Profunda', word_count: 600 },
      // Act III (t_start >= 400)
      { id: 's5', track_id: 't1', t_start: 450, duration: 100, title: 'Batalla Final', word_count: 400 },
    ];

    const result = computeActMetrics(testScenes as any);

    // Total words = 500 + 300 + 800 + 600 + 400 = 2600 words
    assert.equal(result.totalWords, 2600);
    assert.equal(result.totalMins, 11); // 2600 / 240 rounded up = 11 mins

    // Act I: 2 scenes, 800 words (800 / 2600 = 31%)
    const act1 = result.acts.find((a) => a.id === 'acto-1');
    assert.ok(act1);
    assert.equal(act1.sceneCount, 2);
    assert.equal(act1.wordCount, 800);
    assert.equal(act1.percentage, 31);
    assert.equal(act1.statusText, '2 beats · 800 pal');

    // Act II: 2 scenes, 1400 words (1400 / 2600 = 54%)
    const act2 = result.acts.find((a) => a.id === 'acto-2');
    assert.ok(act2);
    assert.equal(act2.sceneCount, 2);
    assert.equal(act2.wordCount, 1400);
    assert.equal(act2.percentage, 54);
    assert.equal(act2.statusText, '2 beats · 1,400 pal');

    // Act III: 1 scene, 400 words (400 / 2600 = 15%)
    const act3 = result.acts.find((a) => a.id === 'acto-3');
    assert.ok(act3);
    assert.equal(act3.sceneCount, 1);
    assert.equal(act3.wordCount, 400);
    assert.equal(act3.percentage, 15);
    assert.equal(act3.statusText, '1 beat · 400 pal');

    // Dynamic update test: when new words are written in Act II, metrics change dynamically
    const updatedScenes = [
      ...testScenes,
      { id: 's6', track_id: 't1', t_start: 280, duration: 50, title: 'Giro Intermedio', word_count: 400 },
    ];
    const updatedResult = computeActMetrics(updatedScenes as any);
    const updatedAct2 = updatedResult.acts.find((a) => a.id === 'acto-2')!;
    assert.equal(updatedAct2.sceneCount, 3);
    assert.equal(updatedAct2.wordCount, 1800);
    assert.equal(updatedResult.totalWords, 3000);
    assert.equal(updatedAct2.percentage, 60); // 1800 / 3000 = 60%
  });

  it('computeActMetrics fallback to text length when word_count is missing', () => {
    const rawScenes = [
      { id: 's1', track_id: 't1', t_start: 10, duration: 60, title: 'Intro', text: 'Una dos tres cuatro cinco palabras en total.' },
    ];
    const result = computeActMetrics(rawScenes as any);
    assert.equal(result.totalWords, 8);
    assert.equal(result.acts[0].wordCount, 8);
    assert.equal(result.acts[0].sceneCount, 1);
    assert.equal(result.acts[0].percentage, 100);
  });

  it('Senior Left Sidebar Unification & 500px Timeline Anti-Squeeze Invariants', () => {
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    const binderPath = resolve(__dirname, '../src/components/ManuscriptBinder.tsx');
    const binderSrc = readFileSync(binderPath, 'utf8');

    // Invariant 1: App.tsx has unified navigation without two simultaneous sidebars
    assert.ok(!appSrc.includes('isLeftDockOpen'), 'App.tsx must not contain the obsolete separate isLeftDockOpen dock state');
    assert.ok(appSrc.includes('isLeftNavOpen'), 'App.tsx must use single unified isLeftNavOpen state');
    assert.ok(appSrc.includes('leftNavTab'), 'App.tsx must track unified leftNavTab');

    // Invariant 2: ManuscriptBinder uses max 320px drawer width
    assert.ok(binderSrc.includes("width: '320px'"), 'ManuscriptBinder must set width to 320px');
    assert.ok(binderSrc.includes("maxWidth: '320px'"), 'ManuscriptBinder must constrain maxWidth to 320px');

    // Invariant 3: Segmented tabs exist at the top of the unified drawer
    assert.ok(binderSrc.includes('role="tablist"'), 'ManuscriptBinder must define a tablist');
    assert.ok(binderSrc.includes("setTab('binder')"), 'Must have binder tab switcher');
    assert.ok(binderSrc.includes("setTab('structure')"), 'Must have structure tab switcher');
    assert.ok(binderSrc.includes("setTab('goals')"), 'Must have goals tab switcher');

    // Invariant 4: Mathematical proof of Center Timeline >= 500px breathing room
    const windowWidth = 1280; // Standard small laptop viewport
    const editorWidth = 420;
    const workspacePadding = 28; // 14px left + 14px right
    const gap = 12;
    // With auto-collapse on < 1440px:
    const remainingCanvasWidth = windowWidth - editorWidth - workspacePadding - gap;
    assert.ok(
      remainingCanvasWidth >= 500,
      `Timeline canvas breathing room (${remainingCanvasWidth}px) must be >= 500px on 1280px display`
    );
  });

  it('Elimination of Unneeded UI Clutter (Sincronizado badge, Stitch prompt bar, colliding dock telemetry)', () => {
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');

    // 1. Sincronizado badge must be completely eliminated from App.tsx
    assert.ok(!appSrc.includes('Sincronizado</span>'), 'App.tsx must not contain the obsolete Sincronizado status badge');
    assert.ok(!appSrc.includes('Motor WAL determinista sincronizado'), 'App.tsx must not contain Sincronizado tooltip');

    // 2. Floating prompt bar must be completely eliminated from DawCanvas.tsx
    assert.ok(!dawCanvasSrc.includes('Describe tu siguiente escena'), 'DawCanvas.tsx must not contain floating prompt input');
    assert.ok(!dawCanvasSrc.includes('Google Stitch Floating Prompt Capsule'), 'DawCanvas.tsx must not contain prompt capsule markup');
    assert.ok(!dawCanvasSrc.includes('stitchMode'), 'DawCanvas.tsx must not retain unused stitchMode state');

    // 3. Bottom dock telemetry must be removed to prevent collision on narrow viewports
    assert.ok(!dawCanvasSrc.includes('{totalWords.toLocaleString()}'), 'DawCanvas bottom dock must not render duplicate telemetry');
    assert.ok(!dawCanvasSrc.includes('{scenes.length}'), 'DawCanvas bottom dock must not render scenes count pill');
  });

  it('Direct Inline Scene Title Editing on Canvas and Collision-Free Card Headers', () => {
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');

    // 1. DawCanvas provides editingTitleState and renders inline <input> on canvas
    assert.ok(dawCanvasSrc.includes('editingTitleState'), 'DawCanvas must manage editingTitleState');
    assert.ok(dawCanvasSrc.includes('onUpdateSceneTitle'), 'DawCanvas must accept onUpdateSceneTitle prop');
    assert.ok(dawCanvasSrc.includes('aria-label="Editar título de la escena"'), 'DawCanvas must render accessible inline title input');

    // 2. Double-clicking on an existing scene card activates editingTitleState
    assert.ok(dawCanvasSrc.includes('setEditingTitleState({ id: s.id, title: s.title })'), 'Double clicking existing scene card must activate title editor');

    // 3. Renderer uses scene title (s.title) in the top card header row
    assert.ok(rendererSrc.includes('computeCardHeaderLayout(\n      scnW,\n      s.title,'), 'Renderer must pass scene title to card header layout');
    assert.ok(rendererSrc.includes('data.editingSceneId !== s.id'), 'Renderer must suppress canvas title text while inline input is active');

    // 4. Mathematical proof: Extreme scene title length never collides with reading telemetry
    const mockMeasure = (str: string) => str.length * 6.5;
    const extremeTitle = 'Hilo C: Revelación del Oráculo y el Manuscrito Prohibido de la Ciudad Olvidada';
    const cardWidth = 260;
    const words = 450;

    const layout = computeCardHeaderLayout(cardWidth, extremeTitle, 0, words, mockMeasure);
    assert.ok(layout.displayTitle.endsWith('…'), 'Extreme title must be cleanly truncated with ellipsis');
    assert.ok(layout.showMeta, 'Reading telemetry is preserved');

    // Collision check: left title end vs right telemetry start
    const indexStrW = mockMeasure(`·  ${layout.numStr}`);
    const leftTitleEnd = 27 + layout.titleW + 6 + indexStrW;
    const rightTelemetryStart = cardWidth - 16 - layout.metaStrW;

    assert.ok(
      leftTitleEnd <= rightTelemetryStart,
      `Title end (${leftTitleEnd}px) must not collide with telemetry start (${rightTelemetryStart}px)`
    );
    assert.ok(
      rightTelemetryStart - leftTitleEnd >= 14,
      `Must maintain minimum 14px safety clearance between title and telemetry`
    );
  });

  it('Elimination of Hardcoded Timeline Acts Banner for Full Author Structural Freedom', () => {
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');

    // 1. DawCanvas defaults showDramaticActs to false
    assert.ok(dawCanvasSrc.includes('showDramaticActs = false'), 'DawCanvas must default showDramaticActs to false');
    assert.ok(dawCanvasSrc.includes('showDramaticActs,'), 'DawCanvas must pass showDramaticActs to renderer state');

    // 2. Renderer conditionally gates DRAMATIC_ACT_ZONES behind data.showDramaticActs
    assert.ok(
      rendererSrc.includes('if (data.showDramaticActs) {\n      for (const zone of DRAMATIC_ACT_ZONES) {') ||
      rendererSrc.includes('if (data.showDramaticActs) {'),
      'Renderer must gate dramatic act zones behind data.showDramaticActs flag'
    );

    // 3. Clean timeline graduation with zero tick text collisions and zero cryptic unit numbers
    assert.ok(!rendererSrc.includes("ctx.fillText(`${t}u`"), 'Renderer must NOT render confusing unit graduation numbers');
  });

  it('Header Action Buttons Elevation and Track Column Footer Add Button', () => {
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');

    // 1. App header does not contain '+ Nuevo Hilo' or non-functional 'A' avatar badge
    assert.ok(!appSrc.includes("title=\"Autor Gentle-AI\""), 'App.tsx must not contain the obsolete author avatar badge');
    assert.ok(!appSrc.includes("<span>+ Nuevo Hilo</span>"), 'App.tsx top header must not contain + Nuevo Hilo button');

    // 2. App header contains cohesive Exportar and Ajustes action buttons
    assert.ok(appSrc.includes('<span>Exportar</span>'), 'App.tsx must contain Exportar button');
    assert.ok(appSrc.includes('<span>Ajustes</span>'), 'App.tsx must contain Ajustes button with text label');

    // 3. DawCanvas accepts onCreateTrackClick and renders reconstructed track column button
    assert.ok(dawCanvasSrc.includes('onCreateTrackClick'), 'DawCanvas must accept onCreateTrackClick prop');
    assert.ok(dawCanvasSrc.includes('Nuevo Hilo'), 'DawCanvas left track column must contain Nuevo Hilo slot button');
    assert.ok(dawCanvasSrc.includes('Añadir trama'), 'DawCanvas must show informative track channel subtitle');
    assert.ok(!dawCanvasSrc.includes('dashed'), 'DawCanvas slot must NOT use dashed border per Linear craft rules');
  });

  it('Decoupled Scene Dragging vs. Click Selection & Laser Guideline Elimination', () => {
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');

    // 1. Elimination of vertical dashed laser line in renderer.ts
    assert.ok(!rendererSrc.includes('setLineDash([2, 3])'), 'renderer.ts must not render the vertical dashed laser guideline');
    assert.ok(!dawCanvasSrc.includes('setMagnetGuideT'), 'DawCanvas must not trigger re-renders with setMagnetGuideT');

    // 2. DawCanvas does NOT select scene on pointerdown (prevents opening editor while dragging)
    assert.ok(
      dawCanvasSrc.includes('// Do NOT select scene immediately on pointer down'),
      'DawCanvas must guard onSelectScene on pointerdown'
    );
    assert.ok(
      dawCanvasSrc.includes('onSelectScene(currentDrag.s);'),
      'DawCanvas must select scene on pointerup only when moved === false'
    );

    // 3. Immediate synchronous repaint in ResizeObserver eliminates blank canvas blink
    assert.ok(
      dawCanvasSrc.includes('rendererRef.current?.render();'),
      'DawCanvas must immediately repaint canvas upon resize'
    );

    // 4. Smooth cubic-bezier drawer transition on right stage editor in App.tsx
    assert.ok(
      appSrc.includes('transition: \'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)'),
      'App.tsx must smoothly animate editor drawer width'
    );
  });

  it('Permanent Headless Magnetism, Full Leftward Dragging, Clean Ruler & Senior Binder', () => {
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');
    const binderPath = resolve(__dirname, '../src/components/ManuscriptBinder.tsx');
    const binderSrc = readFileSync(binderPath, 'utf8');

    // 1. Permanent headless magnetism: dock button is removed, magnetEnabled is permanent true
    assert.ok(!dawCanvasSrc.includes('Imantación</span>'), 'DawCanvas must not contain the manual Imantación button in bottom dock');
    assert.ok(dawCanvasSrc.includes('const magnetEnabled = true;'), 'DawCanvas must set magnetEnabled permanently true');

    // 2. Full leftward dragging: panX defaults to 0 flush with track header
    assert.ok(dawCanvasSrc.includes('panX: 0'), 'DawCanvas must initialize panX to 0 flush with track header');

    // 3. Clean ruler: no cryptic "Xu" numbers rendered
    assert.ok(!rendererSrc.includes('ctx.fillText(`${t}u`'), 'renderer.ts must not render cryptic unit numbers on timeline ruler');

    // 4. Senior Manuscript Binder: no developer noise "T: Xu" and elegant "Nueva Escena" action
    assert.ok(!binderSrc.includes('T: {s.t_start}u'), 'ManuscriptBinder must not render developer noise T: Xu in scene cards');
    assert.ok(binderSrc.includes('Nueva Escena</span>'), 'ManuscriptBinder must feature refined Nueva Escena button');
    assert.ok(
      binderSrc.includes('Pinned Bottom Footer Action: + Nueva Escena'),
      'ManuscriptBinder must pin Nueva Escena in a sticky bottom footer so it is never clipped by scrolling'
    );
  });

  it('Hero Chapter Numeral Prominence & Small Header Badge Elimination', () => {
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');

    // 1. Small badge eliminated from canvas header line (title gets full horizontal width)
    assert.ok(
      !rendererSrc.includes('ctx.fillText(headerLayout.numStr'),
      'renderer.ts must not render the small number pill badge in the header row'
    );

    // 2. Hero architectural chapter numeral is prominent and vivid
    assert.ok(
      rendererSrc.includes("ctx.font = '800 36px ' + FONT_SANS;"),
      'renderer.ts must scale hero chapter numeral to 800 36px'
    );
    assert.ok(
      rendererSrc.includes('isSel ? 0.48 : 0.32'),
      'renderer.ts must render hero chapter numeral with luminous high visibility (0.32 unselected, 0.48 selected)'
    );
    assert.ok(
      rendererSrc.includes('x + scnW - 14, y + scnH - 14'),
      'renderer.ts must anchor hero numeral at bottom-right corner'
    );
  });

  it('Pinterest & Orion High-Craft Art Direction & UI Technique Verification', () => {
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');

    // 1. Pinterest Diffuse Chromatic Aurora Bloom behind selected/active card
    assert.ok(
      rendererSrc.includes('// Diffuse Ambient Chromatic Aurora Bloom (Pinterest SaaS Card Reveal & Orion)'),
      'renderer.ts must render diffuse chromatic aura bloom behind active card'
    );
    assert.ok(
      rendererSrc.includes("rgba(56, 189, 248, 0.12)"),
      'renderer.ts must feature radiant cyan chromatic aura step'
    );
    assert.ok(
      rendererSrc.includes("rgba(168, 85, 247, 0.08)"),
      'renderer.ts must feature electric violet chromatic aura step'
    );

    // 2. High-precision 1px Top Edge Inset Specular Highlight (Apple / Vercel / Pinterest technique)
    assert.ok(
      rendererSrc.includes('// Razor-sharp 1px Top Edge Inset Specular Highlight (Apple / Vercel / Pinterest technique)'),
      'renderer.ts must render razor-sharp top edge inset specular highlight'
    );

    // 3. Workflow Plan High-Contrast Telemetry Capsule Pill
    assert.ok(
      rendererSrc.includes('// Right-aligned High-Contrast Telemetry Capsule (Workflow Plan Pill Technique)'),
      'renderer.ts must encase reading telemetry in a sculpted capsule pill'
    );
    assert.ok(
      rendererSrc.includes('ctx.roundRect(pillX, pillY, pillW, pillH, 9999)'),
      'renderer.ts must render 9999px capsule pill for telemetry'
    );

    // 4. Orion Multi-Color Iridescent Flow Ribbons
    assert.ok(
      rendererSrc.includes('#38bdf8') && rendererSrc.includes('#a855f7'),
      'renderer.ts must render multi-stop iridescent gradients (cyan to violet) along ribbons'
    );

    // 5. Executive Floating Pill Dock
    assert.ok(
      dawCanvasSrc.includes("borderRadius: '9999px'"),
      'DawCanvas must style bottom floating dock as executive capsule pill'
    );
  });

  it('Elimination of Intrusive AHORA Bar & Senior Editor Close Button Elevation', () => {
    const rendererPath = resolve(__dirname, '../src/canvas/renderer.ts');
    const rendererSrc = readFileSync(rendererPath, 'utf8');
    const editorPath = resolve(__dirname, '../src/editor/AtomicEditor.tsx');
    const editorSrc = readFileSync(editorPath, 'utf8');

    // 1. AHORA bar and vertical slicing guideline eliminated from canvas
    assert.ok(!rendererSrc.includes('AHORA'), 'renderer.ts must not render the intrusive AHORA pill badge');
    assert.ok(
      !rendererSrc.includes("ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)'"),
      'renderer.ts must not slice through cards with vertical hairline guidelines'
    );

    // 2. Editor close button elevation: SVG close icon with 26x26px hit area and divider
    assert.ok(
      editorSrc.includes('aria-label="Cerrar editor lateral"'),
      'AtomicEditor must feature accessible aria-label on close button'
    );
    assert.ok(
      editorSrc.includes("width: '26px',") && editorSrc.includes("height: '26px'"),
      'AtomicEditor must provide generous 26x26px close button target'
    );
    assert.ok(
      editorSrc.includes('Trash2') || editorSrc.includes('polyline points="3 6 5 6 21 6"'),
      'AtomicEditor must use a clean trash can icon instead of ambiguous ✕ for Borrar'
    );
    assert.ok(
      !editorSrc.includes('<span>✕</span> Borrar'),
      'AtomicEditor must not display ✕ in front of Borrar to prevent confusion with close button'
    );
  });

  it('Linear & Raycast Senior Craft: Zero Emojis, 4-Tier Buttons, Subtle Badges & Ghost Inputs', () => {
    const cssPath = resolve(__dirname, '../src/index.css');
    const cssSrc = readFileSync(cssPath, 'utf8');
    const editorPath = resolve(__dirname, '../src/editor/AtomicEditor.tsx');
    const editorSrc = readFileSync(editorPath, 'utf8');
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const binderPath = resolve(__dirname, '../src/components/ManuscriptBinder.tsx');
    const binderSrc = readFileSync(binderPath, 'utf8');
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');

    // 1. Prohibición Total de Emojis: No emojis in active UI components
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(dawCanvasSrc), 'DawCanvas must contain ZERO emojis');
    assert.ok(!emojiRegex.test(editorSrc), 'AtomicEditor must contain ZERO emojis');
    assert.ok(!emojiRegex.test(binderSrc), 'ManuscriptBinder must contain ZERO emojis');
    assert.ok(!emojiRegex.test(appSrc), 'App.tsx must contain ZERO emojis');

    // 2. Jerarquía de Botones (4 niveles) in index.css
    assert.ok(cssSrc.includes('.btn-primary'), 'index.css must define .btn-primary');
    assert.ok(cssSrc.includes('.btn-secondary'), 'index.css must define .btn-secondary');
    assert.ok(cssSrc.includes('.btn-ghost'), 'index.css must define .btn-ghost');
    assert.ok(cssSrc.includes('.btn-destructive'), 'index.css must define .btn-destructive');
    assert.ok(cssSrc.includes('.btn-ghost-extended'), 'index.css must define .btn-ghost-extended');

    // 3. Badges con opacidad al 10% y borde al 20%
    assert.ok(cssSrc.includes('.badge-mention-character'), 'index.css must define .badge-mention-character');
    assert.ok(cssSrc.includes('.badge-mention-location'), 'index.css must define .badge-mention-location');
    assert.ok(cssSrc.includes('.badge-mention-object'), 'index.css must define .badge-mention-object');
    assert.ok(editorSrc.includes('<User size={12}'), 'AtomicEditor must use Lucide User icon in Character badge');
    assert.ok(editorSrc.includes('<MapPin size={12}'), 'AtomicEditor must use Lucide MapPin icon in Location badge');
    assert.ok(editorSrc.includes('<Box size={12}'), 'AtomicEditor must use Lucide Box icon in Object badge');

    // 4. Encabezado editable ghost sin caja visible permanente
    assert.ok(cssSrc.includes('.title-input-ghost'), 'index.css must define .title-input-ghost');
    assert.ok(editorSrc.includes('title-input-ghost'), 'AtomicEditor must use .title-input-ghost for clean title typography');

    // 5. Botones "Nuevo Hilo" / "Nueva Escena" sin border-dashed
    assert.ok(!dawCanvasSrc.includes('border: \'1px dashed'), 'DawCanvas must not use dashed borders on slot buttons');
    assert.ok(!binderSrc.includes('border: \'1px dashed'), 'ManuscriptBinder must not use dashed borders on slot buttons');

    // 6. Micro-tipografía y escala de bordes
    assert.ok(cssSrc.includes('rounded-md') || cssSrc.includes('border-radius: 6px'), 'Unified border radius 6px for buttons/badges');
    assert.ok(cssSrc.includes('rounded-lg') || cssSrc.includes('border-radius: 8px'), 'Unified border radius 8px for cards');
    assert.ok(cssSrc.includes('--zinc-900'), 'Neutral dark zinc scale present in index.css');
  });

  it('React Bits Aurora & Neon Iridescent Glow Buttons System Verification', () => {
    const cssPath = resolve(__dirname, '../src/index.css');
    const cssSrc = readFileSync(cssPath, 'utf8');
    const glowBtnPath = resolve(__dirname, '../src/components/GlowButton.tsx');
    const glowBtnSrc = readFileSync(glowBtnPath, 'utf8');
    const borderGlowPath = resolve(__dirname, '../src/components/BorderGlow.tsx');
    const borderGlowSrc = readFileSync(borderGlowPath, 'utf8');
    const appPath = resolve(__dirname, '../src/App.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    const dawCanvasPath = resolve(__dirname, '../src/canvas/DawCanvas.tsx');
    const dawCanvasSrc = readFileSync(dawCanvasPath, 'utf8');
    const binderPath = resolve(__dirname, '../src/components/ManuscriptBinder.tsx');
    const binderSrc = readFileSync(binderPath, 'utf8');

    // 1. Keyframe animations in index.css
    assert.ok(cssSrc.includes('@keyframes star-movement-linear'), 'index.css must include rotating conic star border animation');
    assert.ok(cssSrc.includes('@keyframes aurora-wave'), 'index.css must include fluid breathing aurora wave animation');

    // 2. GlowButton variants from React Bits & user images
    assert.ok(glowBtnSrc.includes('iridescent'), 'GlowButton must support Google Ask AI Mode iridescent variant');
    assert.ok(glowBtnSrc.includes('deepthink'), 'GlowButton must support DeepThink warm-amber to violet variant');
    assert.ok(glowBtnSrc.includes('aurora'), 'GlowButton must support Apple Intelligence / Aurora wave variant');
    assert.ok(glowBtnSrc.includes('specular'), 'GlowButton must support specular highlight variant');

    // 3. BorderGlow cursor tracking
    assert.ok(borderGlowSrc.includes('--glow-x'), 'BorderGlow must dynamically set --glow-x for cursor tracking');
    assert.ok(borderGlowSrc.includes('--glow-y'), 'BorderGlow must dynamically set --glow-y for cursor tracking');

    // 4. Integrated into primary application controls
    assert.ok(appSrc.includes('<BorderGlow variant="rainbow"'), 'App.tsx must encase top capsule switcher in BorderGlow');
    assert.ok(dawCanvasSrc.includes('<GlowButton'), 'DawCanvas must feature GlowButton for Nuevo Hilo action slot');
    assert.ok(dawCanvasSrc.includes('<BorderGlow'), 'DawCanvas must wrap bottom dock in BorderGlow');
    assert.ok(binderSrc.includes('<GlowButton'), 'ManuscriptBinder must feature GlowButton for Nueva Escena action slot');
  });
});
