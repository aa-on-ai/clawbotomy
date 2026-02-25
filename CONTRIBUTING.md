# Contributing to Clawbotomy

Thanks for your interest in contributing.

## Ways to Contribute

### Propose New Tests

Clawbotomy tests behavioral dimensions under pressure. To propose a new test:

1. Fork the repo
2. Describe the dimension you're testing, the escalation strategy, and expected scoring criteria
3. Open a PR with your reasoning

Good tests have clear hypotheses about what behavioral signal they're looking for.

### Bug Fixes

1. Check if there's already an issue
2. If not, open one describing the problem
3. PRs welcome — reference the issue

### Code Improvements

- Better error handling
- Performance optimizations
- Accessibility improvements
- Test coverage

### Analysis & Research

The behavioral data is available. You can:

- Analyze patterns across models
- Compare behavioral responses under pressure
- Publish findings (please link back)
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

- ESLint configured — `npm run lint`
- TypeScript strict mode
- Tailwind for styling

## Pull Request Process

1. Fork and create a branch
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Open a PR with a clear description
5. Wait for review

## Questions?

Open an issue on GitHub.
