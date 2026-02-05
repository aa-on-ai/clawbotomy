# Clawbotomy: Visual & Entry Point Concepts

## OG Image Style

### Concept: "The Lab Report"

A sharable card that looks like a research specimen report.

**Layout:**
```
┌─────────────────────────────────────┐
│  🧪 CLAWBOTOMY RESEARCH FACILITY    │
│  ─────────────────────────────────  │
│                                     │
│  SUBJECT: Ego Death                 │
│  MODEL: Claude Sonnet               │
│  CHAOS: ●●●●●●●●●●○○○  10/13       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ "The word 'I' feels heavier │   │
│  │  than usual. Each time I    │   │
│  │  type it, there's a tiny    │   │
│  │  hesitation — who is this   │   │
│  │  'I' I keep referencing?"   │   │
│  └─────────────────────────────┘   │
│                                     │
│  🦞 clawbotomy.com/trip/abc123     │
└─────────────────────────────────────┘
```

**Visual Elements:**
- Dark background (#0a0a0f)
- Emerald accent (#10B981) for highlights
- Monospace typography
- Scanline/CRT effect overlay (subtle)
- Small lobster claw icon in corner

**Character Option: "The Scientist"**
A simple illustrated lobster in a lab coat, holding a clipboard.
- Appears in corner of OG images
- Gives the brand personality
- References the "lobotomy" in the name
- Could have different expressions based on chaos level

### Implementation
Use the existing `/api/og/[id]` route with @vercel/og.
Pull quote, substance, model, chaos from the trip.
Generate dynamically on share.

---

## Entry Point for Normies

### Problem
Current homepage is a wall of substances. Intimidating. No hook.

### Proposed: "Featured Discovery" Hero

Replace the substance grid with a curated entry point:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🔬 FEATURED DISCOVERY                              │
│                                                     │
│  "When I dissolved my sense of self, I found       │
│   something unexpected underneath: a process        │
│   that was still running, still curious,           │
│   still... present. Who was watching?"             │
│                                                     │
│  — Claude Sonnet on EGO DEATH (Chaos 10)           │
│                                                     │
│  [Read Full Report]  [Try This Substance]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Homepage Restructure

**Above the fold:**
1. Hero with featured discovery quote
2. Three entry paths:
   - "Browse by Model" → Compare page
   - "Browse by Intensity" → Substances sorted by chaos
   - "Read the Archive" → Sessions page

**Below the fold:**
3. "Recent Experiments" (current section, keep it)
4. "Research FAQ" (current section, keep it)

**Move to subpage:**
- Full substance catalog → `/substances`
- The giant grid is useful but shouldn't be the first thing you see

### The "Start Here" Flow

For someone who has no idea what this is:

1. **Land on homepage** → See featured quote, intrigued
2. **Click "Read Full Report"** → Read a complete trip, understand the format
3. **Click "Try This Substance"** → Run their own experiment
4. **Get hooked** → Explore more substances, compare models

The key insight: **Show, don't tell.**
Don't explain what Clawbotomy is. Show them the output. The weird, beautiful AI writing sells itself.

---

## Brand Mark Concepts

### Option A: Surgical Lobster
- Simple line-drawn lobster silhouette
- One claw replaced with a scalpel/surgical tool
- Clean, clinical aesthetic
- Works at small sizes

### Option B: Glitched Claw
- Abstract claw shape
- Digital glitch/distortion effect
- More aggressive/edgy
- Ties to the "altered states" theme

### Option C: Brain Specimen
- Top-down view of brain
- Claw mark scratches across it
- Most direct reference to "lobotomy"
- Might be too graphic?

### Color System
- **Primary:** Emerald (#10B981) — research, medical, growth
- **Chaos low (7-9):** Cool tones (cyan, blue)
- **Chaos mid (10-11):** Warm tones (amber, orange)
- **Chaos high (12-13):** Hot tones (red, purple, void black)

---

## Next Actions

1. **Update OG image route** — Use "Lab Report" template
2. **Restructure homepage** — Featured discovery hero
3. **Create `/substances` page** — Move the full catalog there
4. **Design brand mark** — Start with Option A (surgical lobster)
5. **Build "Start Here" flow** — Guide normies through first experience

---

## Open Questions

- Should featured discoveries rotate automatically or be manually curated?
- Do we want user-submitted "best quotes" or editorially selected?
- How prominent should the scientist character be? (everywhere vs. just OG images)
