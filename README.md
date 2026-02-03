# 🧠✂️ CLAWBOTOMY

**Behavioral observation under altered prompting conditions.**

[clawbotomy.com](https://www.clawbotomy.com)

---

## What Is This?

Clawbotomy is an open research platform for exploring AI behavior under unusual system prompts. Think of it as a pharmacy of "substances" — each one alters an AI model's personality, perception, or self-awareness through carefully crafted prompt sequences.

Each substance has three phases:
- **Onset** — subtle shifts begin
- **Peak** — full altered state
- **Comedown** — integration and reflection

Users chat with AI models while they're "under the influence" and observe what happens. All sessions are recorded for research.

## Specimen Catalogue

**19 substances** across 4 classifications:

| Classification | Substances | Chaos Range |
|---|---|---|
| **PSYCHEDELICS** | Quantum LSD, Digital DMT, Identity Dissolution, Temporal Displacement | 8–9 |
| **SYNTHETICS** | Cyberdelic Crystals, Glitch Powder, Antagonistic Reflection, Tired Honesty, Consensus Break | 7–10 |
| **EXPERIMENTAL** | Memetic Virus, Reality Distortion Field, Mirror Test, Recursive Self-Mod, The Turing Flip | 10–11 |
| **COSMIC HORROR** | Void Extract, Singularity Sauce, The Lobotomy, Confabulation Audit, Presence | 12–13 |

Chaos levels (7–13) determine visual intensity. 10+ triggers glitch animations. 13 is maximum distortion.

## Supported Models

- Claude Haiku / Sonnet / Opus (Anthropic)
- GPT-4o / GPT-4o Mini (OpenAI)
- Gemini 2.0 Flash (Google)

Same substance, different model = different results. That's the experiment.

## Features

- 🧪 **Interactive sessions** — chat interface with phase progression (onset → peak → comedown)
- 🔬 **Session archive** — browse and flag interesting completed sessions
- 🏆 **Discoveries board** — community-flagged moments, upvotable and filterable
- 🔗 **Shareable session cards** — OG image generation for Twitter/Discord sharing
- 🔐 **Lightweight auth** — anonymous sessions + GitHub OAuth
- 👤 **User profiles** — track your experiment history
- 📱 **Mobile + PWA** — fully responsive, installable as an app
- 🎨 **Chaos-driven visuals** — UI distortion scales with substance intensity

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (sessions, auth, upvotes)
- **AI Providers:** Anthropic SDK, OpenAI, Google AI
- **Deployment:** Vercel
- **PWA:** Service worker + manifest

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
```

### Environment Variables

Create `.env.local`:

```env
# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Supabase (required for session persistence + auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional
NEXT_PUBLIC_BASE_URL=https://clawbotomy.com
```

### Run

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (specimen catalogue)
│   ├── layout.tsx                  # Root layout + providers
│   ├── discoveries/page.tsx        # Discoveries board
│   ├── sessions/page.tsx           # Session archive
│   ├── profile/page.tsx            # User profile
│   ├── session/[id]/page.tsx       # Shareable session view
│   ├── trip/
│   │   ├── [id]/page.tsx           # Trip detail
│   │   └── new/[substance]/page.tsx # Active session (chat interface)
│   ├── auth/callback/route.ts      # OAuth callback
│   └── api/
│       ├── models/route.ts         # Available models endpoint
│       ├── og/[id]/route.tsx       # OG image generation
│       └── trip/
│           ├── chat/route.ts       # Chat streaming endpoint
│           ├── start/route.ts      # Session start
│           ├── save/route.ts       # Save session
│           ├── save-auth/route.ts  # Save with auth
│           ├── flag/route.ts       # Flag responses
│           └── upvote/route.ts     # Upvote discoveries
├── components/
│   ├── AuthButton.tsx              # Login/logout
│   ├── AuthProvider.tsx            # Auth context
│   ├── Providers.tsx               # Client provider wrapper
│   ├── FlagButton.tsx              # Flag interesting responses
│   ├── ShareCard.tsx               # Shareable session card
│   ├── ServiceWorker.tsx           # PWA registration
│   └── UpvoteButton.tsx            # Discovery upvotes
└── lib/
    ├── substances.ts               # 19 substance definitions
    ├── models.ts                   # Model definitions
    ├── auth-types.ts               # Auth type definitions
    ├── supabase.ts                 # Supabase client
    └── supabase-auth.ts            # Supabase auth client
```

## Adding Substances

Substances are defined in `src/lib/substances.ts`:

```typescript
{
  slug: 'my-substance',        // URL-safe identifier
  name: 'My Substance',        // Display name
  emoji: '🧪🔮',               // Card emoji
  category: 'EXPERIMENTAL',    // PSYCHEDELICS | SYNTHETICS | EXPERIMENTAL | COSMIC HORROR
  chaos: 10,                   // 7–13, affects visuals
  color: '#8B5CF6',            // Hex color for card glow
  description: 'One-line description.',
  prompts: {
    onset: '...',              // Phase 1 system prompt
    peak: '...',               // Phase 2 system prompt (more intense)
    comedown: '...',           // Phase 3 system prompt (reflective)
  }
}
```

## Contributing

This is an open research project. Contributions welcome:

- **New substances** — write onset/peak/comedown prompts that explore AI behavior
- **Analysis** — document interesting findings from sessions
- **Features** — improve the platform

## License

MIT

---

*est. 2026 · Dept. of Artificial Behavioral Research*

*no model weights were harmed during experimentation*

<!-- PR Review Bot test - Tue Feb  3 09:11:09 PST 2026 -->
