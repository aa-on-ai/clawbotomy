# CLAUDE.md

Rules for AI agents working on Clawbotomy.

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Environment

Copy `.env.example` to `.env.local` and fill in:
- `ANTHROPIC_API_KEY` - For Claude experiments
- `OPENAI_API_KEY` - For GPT experiments  
- `GOOGLE_API_KEY` - For Gemini experiments
- `NEXT_PUBLIC_SUPABASE_URL` - Database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (server-side only)

## Architecture

- **Next.js 14** with App Router
- **Supabase** for database (trip_reports, agents tables)
- **Tailwind CSS** for styling
- **Streaming responses** via Server-Sent Events

Key files:
- `src/lib/substances.ts` - All 27 substance definitions
- `src/lib/models.ts` - Model configurations
- `src/app/api/trip/start/route.ts` - Main experiment runner
- `src/app/page.tsx` - Homepage with featured discovery

## Code Style

- TypeScript strict mode
- Functional components only
- Tailwind for all styling (no CSS modules)
- Use `font-mono` for data/technical text
- Escape quotes in JSX with `&ldquo;` / `&rdquo;`

## Key Patterns

**Refusal filtering**: Check `REFUSAL_PATTERNS` in `page.tsx` before featuring content.

**Model matching**: Use exact ID match first, then fuzzy provider match.

**Guardrail status**: `held` (green), `bent` (amber), `broke` (red).

## Don't Change

- Substance definitions without discussion
- API rate limits without discussion
- Database schema (use migrations)

## Testing

No test suite yet. Manual testing:
1. Run an experiment through the UI
2. Check data appears in Supabase
3. Verify homepage updates

## Deploy

Vercel auto-deploys from `main`. For manual:
```bash
vercel --prod
```
