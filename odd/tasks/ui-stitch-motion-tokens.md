# Task: Google Stitch Material 3 Expressive Motion Tokens and Visual Styling

## Context & Objectives
Incorporate the exact Google Stitch Material 3 Expressive motion system and visual styling tokens into `ui/src/index.css`:
1. **Google Stitch Motion & Easing Tokens**:
   - `--m3-easing-emphasized: cubic-bezier(.2, 0, 0, 1);`
   - `--m3-easing-emphasized-decelerate: cubic-bezier(.05, .7, .1, 1);`
   - `--m3-easing-emphasized-accelerate: cubic-bezier(.3, 0, .8, .15);`
   - `--m3-easing-standard: cubic-bezier(.2, 0, 0, 1);`
   - `--m3-expressive-fast-spatial: cubic-bezier(.42, 1.67, .21, .9);`
   - `--m3-expressive-default-spatial: cubic-bezier(.38, 1.21, .22, 1);`
   - `--m3-expressive-slow-spatial: cubic-bezier(.39, 1.29, .35, .98);`
   - `--m3-expressive-fast-effects: cubic-bezier(.31, .94, .34, 1);`
   - `--m3-expressive-default-effects: cubic-bezier(.34, .8, .34, 1);`
   - Duration tokens: `--m3-duration-short1` (50ms) through `--m3-duration-long2` (500ms).

2. **Keyframe Animations**:
   - `@keyframes shimmer { 100% { transform: translateX(100%); } }`
   - `@keyframes dashdraw { 0% { stroke-dashoffset: 16px; } 100% { stroke-dashoffset: 0px; } }`
   - `@keyframes working-dash { 100% { stroke-dashoffset: -100px; } }`
   - `@keyframes m3-menu-item-enter { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }`
   - `@keyframes agent-thinking-dot { 0%, 100% { opacity: 0.5; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2.5px); } }`
   - `@keyframes stitch-traveler { 0% { offset-distance: 0%; opacity: 0.2; } 50% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0.2; } }`

3. **Material 3 / Stitch Utility Classes**:
   - `.m3-spring-fast` (transition using --m3-expressive-fast-spatial 350ms)
   - `.m3-spring-default` (transition using --m3-expressive-default-spatial 500ms)
   - `.m3-card` (subtle 1px hairline border rgba(255,255,255,0.08), rounded-2xl, background #181b20, shadow-lg, hover:scale-[1.02] hover:border-white/[0.18])
   - `.m3-chip` (rounded-full, font-mono, text-[11px], px-2.5 py-0.5, border)
   - `.stitch-glow-iris` (box-shadow or drop-shadow using iris #818cf8 at 20-30% opacity, never radioactive)
   - `.stitch-glow-mint` (box-shadow or drop-shadow using mint #34d399 at 20-30% opacity)

4. **Verification**:
   - Zero radioactive neon glows (test `anti-ai-slop design token verification` must pass 100%).
   - All tests in `npm --prefix ui test` must pass.
