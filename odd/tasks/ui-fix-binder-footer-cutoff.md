# Task Specification: Fix Binder Footer Button Cutoff & Sticky Action Bar

## Problem Statement
In the Manuscript Binder (`ManuscriptBinder.tsx`), the `+ Nueva Escena` button was rendered as the final child inside the scrollable container (`overflowY: 'auto'`). When the number of narrative scene cards increases (e.g. 7 or more scenes), the container overflows. Consequently, the `+ Nueva Escena` button gets pushed below the viewport fold, appearing partially clipped/sliced in half or entirely hidden unless the user manually scrolls to the very bottom.

## Requirements
1. **Pinned/Sticky Bottom Footer**:
   - Extract the `+ Nueva Escena` button out of the scrollable scene cards list.
   - Place it inside a dedicated, pinned bottom footer container (`flexShrink: 0`, `borderTop: '1px solid rgba(255, 255, 255, 0.06)'`, `backgroundColor: '#0c0e14'`).
   - Ensure the scroll container above has `minHeight: 0`, `flex: 1`, `overflowY: 'auto'`, with appropriate bottom padding so scene cards never overlap the footer.
2. **Permanent Visibility & Accessibility**:
   - The `+ Nueva Escena` button must remain permanently visible, fully formed, and styled with the React Bits iridescent glow, regardless of whether there are 0, 7, or 100 scenes.
3. **Ergonomic Auto-Scroll**:
   - When a new scene is created or selected, optionally ensure smooth scrolling so the new card is brought into view without obscuring the pinned footer.
4. **Verification**:
   - `npm test`: all unit tests passing.
   - `npm run build`: `tsc && vite build` clean with zero errors.
   - In-memory CDP browser inspection on `http://localhost:1420/`: verify with 7+ scenes that `+ Nueva Escena` is 100% visible, fully clickable, and not clipped.
