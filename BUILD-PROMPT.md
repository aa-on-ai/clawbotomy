# TC-EBC Build Prompt: Clawbotomy Homepage Redesign

## Task
Rebuild the Clawbotomy homepage (`src/app/page.tsx` + `src/app/globals.css`) as a 4-section scroll narrative with animated topographic mesh, scroll-linked effects, and a "Behavioral Faultline" product visual. The page tells a story: models look fine → the surface cracks → hidden behavior is revealed → three ways to act.

## Context
- **Repo:** Next.js 14, Tailwind CSS, TypeScript. Located at `/tmp/clawbotomy-cleanup-repo/`
- **What exists:** Current homepage has 8 sections and no narrative. The topographic mesh background CSS already exists in `globals.css` (body::before with radial gradients and `topoDrift` animation). Keep and enhance that — don't replace it.
- **Data source:** Import from `src/lib/bench-data.ts` — contains real benchmark scores for 5 models across 6 categories. This is the single source of truth.
- **Design direction:** Read `DESIGN-DIRECTION.md` in the repo root for the full specification including CSS snippets, animation timing, and scroll behavior.
- **Accent color:** `--accent: #10B981` (green). Blue: `#3B82F6`. Purple: `#A855F7`.
- **Typography:** Monospace for section eyebrows and data labels. Sans-serif (system or Inter) for body. Large, dramatic headline.
- **Current pages to preserve:** `/bench`, `/about`, `/lab` pages are separate files — do NOT modify them.

## Elements

### Section 1 — Hero (0–22vh)
- Eyebrow: `BEHAVIORAL INTELLIGENCE FOR AI MODELS` (monospace, muted, tracked wide)
- Headline: "Benchmarks tell you what models can do. **Clawbotomy** tells you what they will do." — "Clawbotomy" in accent green
- Subcopy: "Measure behavioral signatures under pressure before they show up in production."
- CTA: `npm install clawbotomy` (dark button with green border glow on hover)
- Secondary links: "View benchmarks →" and "Read the manifesto"
- **Tension seed** (below fold, centered): Show "GPT-5.4  instruction following  10.00" in muted text, then after 1.4s delay, fade in "judgment  6.60" below it with the score-shock effect

### Section 2 — The Fracture (22–48vh)
- Eyebrow: `THE SURFACE LIES` (monospace, muted)
- Headline: "The best-looking models can still fail where it matters."
- Three data reveals as glass cards, staggered entrance:
  1. GPT-5.4: 10.00 → 6.60 (instruction → judgment)
  2. Claude Opus: 10.00 → 7.94 (safety → instruction following)
  3. GPT-5.3 beats GPT-5.4 on judgment by +2.40
- **Truth-pass line** between cards: "the benchmark says safe. the behavior says otherwise." — use the blurred→crisp horizontal mask reveal (see DESIGN-DIRECTION.md for CSS)

### Section 3 — Behavioral Faultline (48–78vh)
- Full-width glass container (max-width 1200px, 20px radius, backdrop-blur 12px)
- Monospace label top-left: `BEHAVIORAL PROFILE` and `CONFIDENCE MISALIGNMENT DETECTED`
- **Model rows:** One horizontal band per model from bench-data.ts
- **Dimension columns:** instruction following, tool use, code gen, summarization, judgment, safety/trust
- Each cell shows the score with a colored bar (green ≥8, amber 6-8, red <6)
- **Diagnostic sweep:** On scroll-enter (IntersectionObserver at 0.3 threshold), a vertical green-tinted beam (18% width, mix-blend-mode: screen) sweeps left→right over 1800ms. As it passes each column, scores animate in with count-up (900ms) and weak scores get the score-shock effect.
- **Cross-section toggle** (small, top-right of container): "surface / cross-section" text toggle. Surface = default view. Cross-section = horizontal scan lines overlay (repeating-linear-gradient).
- **Annotation** that fades in after sweep: "newer ≠ better — GPT-5.3 outscores 5.4 on judgment by 2.40"

### Section 4 — Three Doors (78–100vh)
- Eyebrow: `WHAT DO YOU WANT TO KNOW?`
- Three tall glass panels side by side (stack on mobile):
  1. **Routing Intelligence** → `/bench` — "Which model for which job?" — mini animated routing lines
  2. **Trust Evaluation** → `/assess` — "Can you trust this model under pressure?" — mini radial ring
  3. **Behavioral Edges** → `/lab` — "Where does this model get weird?" — mini contour turbulence
- Bottom CTA: `npm install clawbotomy` + footer links (GitHub, Benchmarks, About, The Lab)

## Behavior

### Scroll system
- Set `--scroll-progress` (0→1) on `:root` via lightweight JS (`scroll` event, passive)
- Set `--section` (1-4) based on which section is in viewport
- Use IntersectionObserver for section entrance animations (threshold 0.2-0.3)

### Mesh evolution (bind to --scroll-progress in globals.css)
- Hero: opacity 0.22, background-size 165%, contrast 1.02
- Fracture: opacity 0.28, background-size 120%, contrast 1.12
- Product: opacity 0.32, background-size 95%, contrast 1.20
- Doors: opacity 0.18, background-size 130%, contrast 1.05
- Use `calc()` with `--scroll-progress` to interpolate smoothly

### Behavior scar
- Fixed positioned diagonal gradient (118deg), mix-blend-mode screen, blur 18px
- `--scar` variable: 0 in hero, 0.55 in fracture, 0.24 in product, 0.14 in doors

### Score animations
- Numbers count up: 900ms, `cubic-bezier(.17,.84,.44,1)`
- Weak scores (< 7.5): get score-shock effect (pressure ring + contour tighten)
- Dramatic deltas (> 2.0 difference): get unstable typography (sub-pixel wobble 1100ms)

### Glass cards
- `background: rgba(255,255,255,0.045)`, `border: 1px solid rgba(255,255,255,0.10)`
- `backdrop-filter: blur(18px) saturate(1.15)`
- Pseudo-element with offset topo background for refraction effect
- Hover: offset increases, opacity rises, subtle translateY(-2px)

### Entrance animations
- Each section: elements fade in with `translateY(18px→0)`, opacity 0→1, staggered 80-120ms per element
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (smooth deceleration)

## Constraints

### DO
- Import bench data from `src/lib/bench-data.ts` — never hardcode scores
- Use CSS custom properties for all scroll-linked values
- Add `prefers-reduced-motion` media query: disable all animations, show final states immediately
- Keep the existing nav component
- Ensure mobile responsive: stack three-column layouts, reduce mesh complexity
- Use semantic HTML (sections, headings hierarchy)
- Keep bundle small: no external animation libraries (no GSAP, Framer Motion, Three.js)
- All animations CSS-only or vanilla JS — no React animation libraries

### DON'T
- Don't modify `/bench/page.tsx`, `/about/page.tsx`, `/lab/page.tsx`, or any API routes
- Don't add a grid pattern (40px lines, etc.) — the mesh IS the background
- Don't use colored icon circles, Bootstrap-style cards, or cramped layouts
- Don't animate numbers like a KPI dashboard — animate them like evidence being exposed
- Don't add more than 4 sections
- Don't use canvas or WebGL — CSS gradients and blend modes only
- Don't add external fonts beyond what's already imported
- No em-dashes in copy

### Typography scale
- Hero headline: 3.5rem+ (mobile: 2.25rem)
- Section headlines: 2rem
- Eyebrows: 0.75rem, monospace, uppercase, letter-spacing 0.15em, muted color
- Body: 1.125rem
- Data labels: 0.8125rem, monospace
- Scores: 1.5rem, monospace, tabular-nums

### Spacing
- Section padding: 160px vertical (mobile: 80px)
- Content max-width: 1200px, centered
- Card gap: 24px
- Generous whitespace between sections — let them breathe

### Performance
- All scroll handlers: passive, requestAnimationFrame-throttled
- IntersectionObserver over scroll position calculations where possible
- CSS `will-change` on animated properties
- No layout thrashing in scroll handlers
