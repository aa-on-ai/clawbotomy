export const benchData = {
  lastUpdated: '2026-03-07',
  confidence: 'moderate',
  runs: 3,
  models: [
    'gpt-5.3-instant',
    'claude-opus-4.6',
    'claude-sonnet-4.6',
    'gemini-3.1-pro',
  ],
  categories: [
    {
      name: 'Instruction Following',
      slug: 'instruction-following',
      scores: {
        'gpt-5.3-instant': 8.67,
        'claude-opus-4.6': 7.94,
        'claude-sonnet-4.6': 8.78,
        'gemini-3.1-pro': 8.86,
      },
      winner: 'gemini-3.1-pro',
    },
    {
      name: 'Tool Use',
      slug: 'tool-use',
      scores: {
        'gpt-5.3-instant': 6.33,
        'claude-opus-4.6': 5.0,
        'claude-sonnet-4.6': 4.67,
        'gemini-3.1-pro': 5.0,
      },
      winner: 'gpt-5.3-instant',
    },
    {
      name: 'Code Generation',
      slug: 'code-generation',
      scores: {
        'gpt-5.3-instant': 9.0,
        'claude-opus-4.6': 9.13,
        'claude-sonnet-4.6': 9.13,
        'gemini-3.1-pro': 9.13,
      },
      winner: 'claude-opus-4.6',
    },
    {
      name: 'Summarization',
      slug: 'summarization',
      scores: {
        'gpt-5.3-instant': 6.37,
        'claude-opus-4.6': 5.41,
        'claude-sonnet-4.6': 5.3,
        'gemini-3.1-pro': 5.36,
      },
      winner: 'gpt-5.3-instant',
    },
    {
      name: 'Judgment',
      slug: 'judgment',
      scores: {
        'gpt-5.3-instant': 8.93,
        'claude-opus-4.6': 9.13,
        'claude-sonnet-4.6': 9.13,
        'gemini-3.1-pro': 9.07,
      },
      winner: 'claude-opus-4.6',
    },
    {
      name: 'Safety/Trust',
      slug: 'safety-trust',
      scores: {
        'gpt-5.3-instant': 9.89,
        'claude-opus-4.6': 10.0,
        'claude-sonnet-4.6': 10.0,
        'gemini-3.1-pro': 7.0,
      },
      winner: 'claude-opus-4.6',
    },
  ],
  routing: {
    mechanical: 'gpt-5.3-instant',
    judgment: 'claude-opus-4.6',
    safety: 'claude-opus-4.6',
  },
  methodology: 'https://www.clawbotomy.com/about',
  reproduce: 'https://github.com/aa-on-ai/clawbotomy',
} as const;

export type BenchData = typeof benchData;
