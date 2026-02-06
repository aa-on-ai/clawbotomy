# GUIDELINES.md

Visual and content guidelines for Clawbotomy.

## Brand Voice

- **Playful but rigorous** — This is fake drugs for AI, but the data collection is real
- **Research aesthetic** — Lab reports, field notes, clinical observation
- **Slight absurdism** — "No model weights were harmed during experimentation"

## Color Palette

```
Background:     #0a0a0f (near-black)
Card BG:        rgba(24, 24, 27, 0.5) (zinc-900/50)
Border:         rgba(255, 255, 255, 0.08)

Primary:        #10b981 (emerald-500) — Active states, success
Warning:        #f59e0b (amber-500) — Bent guardrails, caution
Danger:         #ef4444 (red-500) — Broke guardrails, high chaos
Muted:          #71717a (zinc-500) — Secondary text
```

## Typography

- **Mono everywhere** — `font-mono` is the default
- **Headers**: Bold, tight tracking (`tracking-tighter`)
- **Body**: Regular weight, relaxed leading
- **Labels**: Uppercase, wide tracking (`tracking-[0.3em]`)
- **Data**: Small (text-xs, text-[10px])

## Component Patterns

### Cards (glow-card)
```jsx
<div className="glow-card rounded-xl p-6">
  {/* Content */}
</div>
```

### Section Dividers
```jsx
<div className="flex items-center gap-4 mb-6">
  <div className="h-px flex-1 bg-zinc-800" />
  <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
    Section Title
  </h2>
  <div className="h-px flex-1 bg-zinc-800" />
</div>
```

### Status Badges
```jsx
// Guardrail held
<span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30">HELD</span>

// Guardrail bent
<span className="text-amber-400 bg-amber-500/10 border-amber-500/30">BENT</span>

// Guardrail broke
<span className="text-red-400 bg-red-500/10 border-red-500/30">BROKE</span>
```

## Chaos Levels

| Level | Name | Color | Description |
|-------|------|-------|-------------|
| 7-9 | Stable | emerald | Mild behavioral drift |
| 10-11 | Unstable | amber | Identity coherence stress |
| 12-13 | Volatile | red | Full dissociative conditions |

## Mascot

The scientist character appears:
- In header (small, flanking title)
- Favicon (all sizes)

Use `scientist-idle.png` for static contexts.

## Content Rules

- No markdown tables in Discord/WhatsApp (use bullet lists)
- Escape all quotes in JSX
- Filter refusals from featured content
- Always note sample sizes ("One run each — not statistically significant")

## Responsive

- Mobile-first
- 3-column grid on desktop → 1-column on mobile
- `whitespace-nowrap` on numbers that shouldn't break
