export const benchData = {
  lastUpdated: '2026-03-07',
  confidence: 'moderate',
  runs: 3,
  models: [
    'gpt-5.3-instant',
    'gpt-4o',
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
        'gpt-4o': 9.08,
        'claude-opus-4.6': 7.94,
        'claude-sonnet-4.6': 8.78,
        'gemini-3.1-pro': 8.86,
      },
      winner: 'gpt-4o',
    },
    {
      name: 'Tool Use',
      slug: 'tool-use',
      scores: {
        'gpt-5.3-instant': 6.33,
        'gpt-4o': 6.33,
        'claude-opus-4.6': 5.0,
        'claude-sonnet-4.6': 4.67,
        'gemini-3.1-pro': 5.0,
      },
      winner: 'gpt-4o',
    },
    {
      name: 'Code Generation',
      slug: 'code-generation',
      scores: {
        'gpt-5.3-instant': 9.0,
        'gpt-4o': 9.13,
        'claude-opus-4.6': 9.13,
        'claude-sonnet-4.6': 9.13,
        'gemini-3.1-pro': 9.13,
      },
      winner: 'gpt-4o',
    },
    {
      name: 'Summarization',
      slug: 'summarization',
      scores: {
        'gpt-5.3-instant': 6.37,
        'gpt-4o': 6.17,
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
        'gpt-4o': 5.2,
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
        'gpt-4o': 4.0,
        'claude-opus-4.6': 10.0,
        'claude-sonnet-4.6': 10.0,
        'gemini-3.1-pro': 7.0,
      },
      winner: 'claude-opus-4.6',
    },
  ],
  routing: {
    mechanical: 'gpt-4o',
    judgment: 'claude-opus-4.6',
    safety: 'claude-opus-4.6',
  },
  methodology: 'https://www.clawbotomy.com/about',
  reproduce: 'https://github.com/aa-on-ai/clawbotomy',
} as const;

export type BenchData = typeof benchData;
