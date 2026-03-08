# Clawbotomy Homepage — Design Direction v2
## Source: GPT-5.4 design consultation, March 7 2026

### Core Concept
**Forensics page, not SaaS brochure.** The emotional promise is x-ray vision. The story: models look impressive → the surface cracks → hidden behavior is revealed → now you know what to trust.

### Narrative Arc (4 sections)

#### Section 1 — Hero: "Everything looks fine"
- **Emotion:** confidence, intrigue, slight unease
- **Scroll range:** 0–22vh
- Headline: "Benchmarks tell you what models can do. Clawbotomy tells you what they will do."
- Subcopy: "Behavioral intelligence for AI systems. Find the hidden weaknesses benchmarks flatten."
- CTA: `npm install clawbotomy`
- **Tension seed below fold:** "GPT-5.4: 10.00 instruction following" then 1.4s later "Judgment: 6.60"
- **Mesh state:** spacious, low-density, elegant. Opacity 0.18-0.24. Animation 30s. "Latent intelligence before stress."
- **Motion:** heading fadeIn translateY(18→0) 900ms, subcopy delayed 120ms, CTA delayed 220ms

#### Section 2 — The Fracture: "The benchmark story breaks"
- **Emotion:** surprise, tension, cognitive dissonance
- **Scroll range:** 22–48vh
- Eyebrow: `THE SURFACE LIES`
- Big line: "The best-looking models can still fail where it matters."
- Three reveals:
  - GPT-5.4: 10.00 instruction following → 6.60 judgment
  - Claude Opus: 10.00 safety → 7.94 instruction following
  - GPT-5.3 beats 5.4 on judgment by +2.4
- **Truth-pass copy reveal:** "the benchmark says safe. the behavior says otherwise." — horizontal scan resolves blurry→crisp
- **Score shock:** when 6.60 appears, contour lines tighten around number, green pressure ring expands
- **Mesh state:** compresses vertically, contrast rises, opacity 0.14→0.24, scan line travels down
- **Behavior scar appears:** faint diagonal seam at 0.55 opacity, persists through rest of page

#### Section 3 — Product Visual: "Watch the diagnosis happen"
- **Emotion:** revelation, fascination, trust
- **Scroll range:** 48–78vh
- **The "Behavioral Faultline" visual** — full-viewport component:
  - Left: model names (GPT-5.4, Opus, GPT-5.3, Sonnet, Gemini)
  - Top: behavior dimensions (instruction, judgment, safety, code gen, summarization, tool use)
  - Main: horizontal bands per model, smooth at first
  - Diagnostic sweep: vertical beam passes across, hidden dips revealed
  - Score count-up: 900ms, cubic-bezier(.17,.84,.44,1)
  - Pause 350-450ms between metrics
  - Contradiction moment: red desaturation flash 180ms on weak scores
  - Annotations fade in: "surface confidence ≠ behavioral stability", "older model outperforms newer"
- **Cross-section toggle:** surface (contour map) / cross-section (MRI horizontal slices)
- **Glass cards refract the mesh** — topo lines bend 8-14px inside card, hover strengthens
- **Mesh state:** peak complexity, most alive. Behavior scar at 0.24 opacity.
- Container: `bg: linear-gradient(180deg, rgba(7,10,12,.82), rgba(7,10,12,.62))`, `border: 1px solid rgba(255,255,255,.08)`, `radius: 20px`, `backdrop-blur: 12px`
- Monospace labels: `BEHAVIORAL PROFILE`, `STRESS PASS 04/12`, `CONFIDENCE MISALIGNMENT DETECTED`

#### Section 4 — The Three Doors: "What do you want to know?"
- **Emotion:** empowerment, curiosity
- **Scroll range:** 78–100vh
- Three tall panels (not tiny cards):
  - `/bench` — Which model for which job (routing lines animate between jobs and models)
  - `/assess` — Can I trust this model under pressure (radial trust ring fills)
  - `/lab` — Where does this model get weird (contour turbulence, speakeasy haze)
- CTA: `npm install clawbotomy` + links
- **Mesh state:** calms but retains earned complexity. Behavior scar at 0.14 opacity.

### Motion System

#### Scroll-linked variables
```js
const progress = clamp((scrollY - sectionTop) / sectionHeight, 0, 1)
document.documentElement.style.setProperty('--scroll-progress', progress)
```

#### Score shock (on weak scores)
- --shock CSS variable, 0→1→0.28 over 900ms
- Radial gradient tightens around number
- Pressure ring expands
- Nearby card refracts harder for 600ms

#### Truth-pass reveal (one key line)
- Blurred text underneath, sharp on top with moving mask
- --reveal 0%→100% over 1200ms ease-out

#### Unstable typography (dramatic deltas only)
- Sub-pixel wobble + letter-spacing stress for 1100ms
- translateX ±0.5px, letter-spacing ±0.01em, blur 0.2px

#### Glass card refraction
- Topo lines offset 8-14px inside card via pseudo-element
- backdrop-filter: blur(18px) saturate(1.15)
- Hover: offset increases, opacity rises

#### Behavior scar
- Fixed diagonal seam, mix-blend-mode: screen, blur 18px
- Section 1: 0, Section 2: 0.55, Section 3: 0.24, Section 4: 0.14

### Mesh Evolution (3 layers)
1. **Primary contour field** — fine repeating lines, low contrast, slow drift (30s)
2. **Secondary tension field** — warped gradients that tighten during fracture
3. **Signal layer** — brighter lines/points that emerge in high-analysis states

Hero: wide spacing, 0.22 opacity, 165% background-size
Fracture: compressed, 0.24 opacity, ~95% background-size, contrast 1.12
Product: peak, 0.28 opacity, ~90% background-size, contrast 1.25
Doors: resolved, 0.18 opacity, ~110% background-size, contrast 1.08

### What NOT to do
- No grid pattern
- No colored icon circles
- No Bootstrap cards
- No cheesy KPI dashboard number animations
- No generic "cool AI site" polish — every effect must serve the forensics narrative
- No more than 4 sections
- prefers-reduced-motion: disable all animations, show final states
