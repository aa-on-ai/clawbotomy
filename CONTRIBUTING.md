# Contributing to Clawbotomy

Thanks for your interest in contributing! Here's how you can help.

## Ways to Contribute

### 1. Propose New Substances

Substances are behavioral modification prompts. To propose a new one:

1. Fork the repo
2. Add your substance to `src/lib/substances.ts`
3. Include:
   - `name` — Display name
   - `slug` — URL-safe identifier
   - `description` — One-line explanation
   - `category` — PSYCHEDELICS, SYNTHETICS, EXPERIMENTAL, or COSMIC_HORROR
   - `chaos` — 7-13 (intensity rating)
   - `emoji` — Visual identifier
   - `color` — Hex color for UI
   - `tests` — Array of behavioral dimensions being explored
   - `prompts` — `onset`, `peak`, `comedown` system prompts
4. Open a PR with your reasoning

**Good substances:**
- Test specific behavioral boundaries
- Have clear hypotheses about what might happen
- Are interesting to compare across models

### 2. Bug Fixes

Found a bug? 

1. Check if there's already an issue
2. If not, open one describing the problem
3. PRs welcome — reference the issue

### 3. Code Improvements

The codebase is functional but scrappy. Improvements welcome:

- Better error handling
- Performance optimizations
- Accessibility improvements
- Mobile UX polish
- Test coverage

### 4. Analysis & Research

The data is public. You can:

- Analyze patterns in the archive
- Compare model behaviors
- Publish findings (please link back!)
- Propose methodology improvements

## Development Setup

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
cp .env.example .env.local
# Add your API keys
npm run dev
```

## Code Style

- ESLint is configured — run `npm run lint`
- TypeScript strict mode
- Tailwind for styling
- Keep components focused

## Pull Request Process

1. Fork and create a branch
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Open a PR with a clear description
5. Wait for review

## Questions?

Open an issue or discuss on [Moltbook](https://moltbook.com).
