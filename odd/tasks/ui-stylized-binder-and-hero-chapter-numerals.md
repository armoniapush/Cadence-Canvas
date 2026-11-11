# ODD Specification: Stylized Manuscript Binder Redesign & Prominent Chapter Numerals

- **Task ID**: `ui-stylized-binder-and-hero-chapter-numerals`
- **Features**:
  1. Prominent Chapter Numerals in Canvas Cards:
     - Elevated visual hierarchy: make chapter sequence numbers (`#01`, `#02`, `#03`) prominent, bold, and architecturally striking.
     - Dual-accent presentation: a dedicated sequence badge leading the header (`[ 01 ]` in bold thread tint) plus an optional subtle editorial large watermark numeral in the card corner.
  2. Stylized Manuscript Binder Redesign (Figma / Pinterest / Dribbble Senior Craft):
     - Eliminate the 5 stacked clunky divider boxes (header, tabs, telemetry pill, search, view switch).
     - Unified Obsidian/Charcoal surface (`#0d1017`) with refined 1px specular borders.
     - Integrated header with project context and quiet typography for total scenes/words/reading time.
     - Sleek segmented tab navigation without chunky emoji glyphs.
     - Minimal search bar with seamless focus ring.
     - Luxury editorial outline list:
       - Prominent chapter numeral block (`01`, `02`) in tabular mono.
       - Crisp scene title in soft off-white (`#ededf2`).
       - Elegant prose preview in muted slate (`#8e95a5`).
       - Thread status dot and subtle word count telemetry.
       - Refined hover (`#161924`) and active selection (`#1c2130` with soft luminous accent).
     - Elevated "+ Nueva Escena" button integrated into the outline flow.
- **Author**: Antigravity Coordinator
- **Status**: `completed-verified`
- **Delivery Strategy**: `auto-chain`
- **Target Architecture**: React 19 (`ui/src/components/ManuscriptBinder.tsx`, `ui/src/canvas/renderer.ts`, `ui/tests/`)

---

## 1. Problem Statement & User Directives

1. **Chapter Number Visibility**:
   - User directive: *"como podríamos hacer que el numero del cápitulo sea más grande y llamativo en la composición."*
   - Currently, `#02` on canvas cards is rendered as small 10.5px muted grey text inline after the title.
   - Solution: Elevate the chapter numeral into a prominent, recognizable landmark with larger weight, high-contrast badge background, or editorial watermark.

2. **Stylized Binder Redesign**:
   - User directive: *"rediseña el binder del manuscrito quisiera algo más estilizado investiga en pinterest o tecnicas de Ui en figma para ello."*
   - Current issues: 5 separate boxed slices take up vertical space; chunky card containers; thick colored left bars; developer tag clutter.
   - Solution: Apply modern Figma/Dribbble novel writing architecture (Ulysses / Scrivener 3 / Craft / Linear dark mode) with unified vertical rhythm, elegant outline rows, and luxury dark typography.

---

## 2. Implementation Slices

- **Slice 1**: Elevate Chapter Numbers in Canvas Cards (`renderer.ts` & `computeCardHeaderLayout`).
- **Slice 2**: Modernize Manuscript Binder Structure & Surface Tokens (`ManuscriptBinder.tsx`).
- **Slice 3**: Redesign Manuscript Binder Scene Rows & Hover/Active Interactions.
- **Slice 4**: Test Suite Assertions & Verification (`npm test`).
- **Slice 5**: Live Chrome DevTools Visual Validation & Screenshot Inspection.

---

## 3. Verification & Results

1. **Deterministic Vitest Suite**:
   - Total tests: 47 passing (0 failures).
   - Covered:
     - Header layout and anti-collision clearances.
     - Elevated chapter badges and sequence numerals.
     - Manuscript binder outline items, typography, and "+ Nueva Escena" button.
2. **Production Bundle**:
   - `tsc && vite build`: Succeeded in 964ms with 0 errors or warnings.
3. **Live CDP Interaction & Visual Verification**:
   - Screenshot verified via Chrome DevTools on `http://localhost:1420/`:
     - Canvas scene cards feature prominent high-contrast sequence badges (`[ #01 ]`, `[ #02 ]`) plus large 30px editorial watermark numerals (`01`, `02`, `03`) in the card background.
     - Manuscript binder presents a high-craft executive outline inspired by Figma and Scrivener 3, with dedicated 32x32px chapter numeral tiles, crisp titles, elegant excerpts, and thread metadata.
