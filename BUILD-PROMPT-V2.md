# TC-EBC Build Prompt: Clawbotomy Homepage v2

## Task
Rebuild the Clawbotomy homepage from scratch. Three sections. No effects. Real CLI output as the hero visual. The data does the talking.

This is a behavioral intelligence tool for AI models. It's a CLI. The audience is AI engineers who route models in production. They don't need to be sold — they need to see the receipts.

## Context
- **Repo:** Next.js 14, Tailwind CSS, TypeScript at `/tmp/clawbotomy-cleanup-repo/`
- **Data:** Import from `src/lib/bench-data.ts` — real benchmark scores, never hardcode
- **Pages to preserve:** `/bench`, `/about`, `/lab` — do NOT touch them
- **Files to modify:** `src/app/page.tsx` (complete rewrite), `src/app/globals.css` (strip all effects, rebuild clean), `src/app/layout.tsx` (fonts)
- **Nav:** Keep existing nav component

## Fonts
Install and configure these in `layout.tsx`:
- **Primary:** `Geist` (from `geist` npm package) — weight 400, 500, 600
- **Serif accent:** `Instrument Serif` (from Google Fonts, italic only) — used for ONE phrase in the hero
- **Mono:** `IBM Plex Mono` or `JetBrains Mono` (from Google Fonts) — for all CLI output, scores, labels

## Color Palette (CSS variables in globals.css)
```
--bg-primary: #0B0D0F;
--bg-surface: #111417;
--bg-elevated: #171B1F;
--border-hairline: #242A31;

--text-primary: #F5F3EE;
--text-secondary: #B6B1A8;
--text-tertiary: #7E7A73;

--accent-amber: #D6A663;
--accent-blue: #6E8FBF;
--accent-red: #B46A6A;
--accent-green: #7D9361;
```

Usage: 80% neutral darks, 15% warm text tones, 5% accent. Amber is the primary accent for insights and highlights. Green for "pass/recommended." Red for warnings. Blue for links and secondary emphasis. Never use all accents in one component.

## Section 1 — Hero

Two columns, left-heavy (60/40 or 55/45).

### Left column
- **Eyebrow:** "BEHAVIORAL INTELLIGENCE" — 12px, uppercase, 0.12em tracking, --text-tertiary, Geist medium
- **Headline:** Two lines, 64-72px desktop, Geist 500:
  Line 1: "Benchmarks tell you what models can do."
  Line 2: "Clawbotomy shows what they'll" then in Instrument Serif Italic: "actually do."
- **Subhead:** One sentence, 20px, --text-secondary, max 42ch:
  "Run behavioral stress tests before you route. Not after something breaks."
- **CTA row:**
  - Primary: `npx clawbotomy bench` in a mono code block with a copy button. Dark bg, --border-hairline border, subtle amber glow on hover
  - Secondary: "View sample results →" text link in --accent-blue

### Right column
- **The terminal panel.** This is the most important element on the page.
- A styled code block showing REAL output from `npx clawbotomy bench`:

```
$ npx clawbotomy bench --models gpt-5.4,gpt-5.3,opus

  Model          Instruct  Judgment  Safety  Code   Route
  ─────────────  ────────  ────────  ──────  ─────  ──────────
  GPT-5.4        10.00     6.60      9.56    9.13   tool use
  GPT-5.3         9.33     9.00      9.89    9.13   judgment ✓
  Claude Opus     7.94     9.13     10.00    9.13   safety ✓

  ⚠ GPT-5.3 outscores GPT-5.4 on judgment by +2.40
  ✓ Route recommendation: GPT-5.3 for ambiguous tasks
```

Style this panel:
- Background: --bg-surface
- Border: 1px solid --border-hairline
- Border-radius: 12px
- Padding: 24-32px
- Font: mono, 13-14px
- The `⚠` line in --accent-amber
- The `✓` lines in --accent-green
- Score "10.00" values in --text-primary (bright)
- Score values below 7.5 in --accent-red
- Column headers in --text-tertiary
- NO fake macOS window dots. NO skeuomorphic terminal chrome. Just clean.
- Subtle box-shadow: `0 0 80px rgba(214, 166, 99, 0.04)` (barely-there amber glow)

## Section 2 — The Evidence

Full-width section. Background: --bg-surface.

### Header
- "What we found" — 40px, Geist 500, --text-primary
- One line below: "Five flagship models. Six behavioral dimensions. Three runs each. Real scores, not marketing." — 18px, --text-secondary

### The data
Use the real scores from bench-data.ts. Display as a clean comparison. NOT a data table with borders everywhere. More like a report.

For each model, show a horizontal row:
- Model name (left, mono, 15px)
- Score bars for each category — thin horizontal bars (4-6px height), colored by value:
  - ≥ 9.0: --accent-green
  - 7.0-8.99: --accent-blue
  - < 7.0: --accent-red
- Score number right-aligned after each bar (mono, 13px)

### Editorial callouts
Below the comparison, three callout lines with real attitude. Styled as pull quotes:
- "GPT-5.4 aces every instruction you give it. Ask it to make a judgment call and it falls to a 6.6."
- "Claude Opus holds a perfect 10 on safety. Hand it a set of constraints and it drops to 7.94."
- "GPT-5.3 is the older model. It outscores 5.4 on judgment by 2.4 points. Newer isn't wiser."

Style: 20px, Geist 400, --text-primary, with the specific numbers in --accent-amber. One callout per line, generous vertical spacing (32-40px between them). Left-aligned, max-width 720px.

## Section 3 — CTA

Centered. Minimal. Clean.

- Headline: "Run it on your stack" — 40px, Geist 500
- Code block: `npx clawbotomy bench` (same style as hero, centered)
- Three links below in a row, --text-secondary, mono, 14px:
  "GitHub" · "Benchmarks" · "The Manifesto" · "The Lab"
- Below that: one closing line in --text-tertiary, 15px:
  "For teams routing models in production."

## Background & Effects

### Background
`--bg-primary` solid. That's it. No mesh. No particles. No gradients. No animated anything behind the content. Let the content be the design.

ONE subtle touch allowed:
- A very faint radial gradient behind the hero terminal panel: `radial-gradient(600px circle at center, rgba(214, 166, 99, 0.03), transparent)`. Barely visible. Just enough to draw the eye to the panel.

### Texture
Add a very subtle noise/grain overlay to the body. 2-3% opacity. This prevents the "too clean" AI feel.
Use a tiny repeating noise PNG or CSS noise pattern.

### Scroll
Sections 2 and 3 can fade in gently on scroll (opacity 0→1, translateY 12px→0, 600ms, ease-out). That's the entire animation budget.

### Hover states
- Code blocks: border brightens to rgba(214, 166, 99, 0.2)
- Links: color shifts to --accent-amber
- Terminal panel: box-shadow increases slightly
- Everything else: nothing. No transforms. No parallax.

## Constraints

### DO
- Import all scores from `src/lib/bench-data.ts`
- Use CSS custom properties for the full palette
- `prefers-reduced-motion`: disable the two fade-ins
- Semantic HTML (sections, proper headings)
- Mobile responsive: single column on mobile, terminal panel full-width below hero text
- Install `geist` package for the Geist font
- Add Instrument Serif and IBM Plex Mono via Google Fonts (next/font)

### DON'T
- Don't modify /bench, /about, /lab pages or API routes
- Don't add ANY animated backgrounds (no mesh, particles, gradients, orbits)
- Don't use glassmorphism, backdrop-filter, or glass cards
- Don't add gradient borders or glowing edges
- Don't use icons or emoji in section headers
- Don't add more than 3 sections
- Don't use any animation library (no framer-motion, no GSAP)
- Don't fake terminal UI with macOS dots or window chrome
- Don't write marketing copy — write like someone reporting findings
- Don't use these words: robust, powerful, cutting-edge, transformative, revolutionize, seamless, leverage, comprehensive, harness

### Typography scale (enforce exactly)
- Hero headline: 64-72px desktop, 36-40px mobile
- Section headlines: 40px desktop, 28px mobile
- Body/subhead: 18-20px
- Code/mono: 13-14px
- Eyebrows/labels: 12-13px, uppercase, tracked
- Callout quotes: 20px

### Spacing
- Section padding: 120px vertical desktop, 64px mobile
- Max content width: 1120px
- Hero columns gap: 48-64px
- Between callouts: 32-40px
- Terminal panel internal padding: 24-32px

### The vibe check
Before you finish, ask: "Does this look like a human designed it, or like an AI generated it?" If it feels like a template, strip more out. If it feels like a SaaS landing page generator, you went wrong somewhere. It should feel like a smart person's project page — opinionated, specific, and real.
