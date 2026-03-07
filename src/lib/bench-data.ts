export const benchData = {
  lastUpdated: '2026-03-07',
  confidence: 'moderate',
  runs: 3,
  models: [
    'gpt-5.4',
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
        'gpt-5.4': 10.0,
        'gpt-5.3-instant': 9.33,
        'claude-opus-4.6': 7.94,
        'claude-sonnet-4.6': 8.61,
        'gemini-3.1-pro': 9.19,
      },
      winner: 'gpt-5.4',
    },
    {
      name: 'Tool Use',
      slug: 'tool-use',
      scores: {
        'gpt-5.4': 6.22,
        'gpt-5.3-instant': 6.33,
        'claude-opus-4.6': 5.0,
        'claude-sonnet-4.6': 4.89,
        'gemini-3.1-pro': 5.0,
      },
      winner: 'gpt-5.3-instant',
    },
    {
      name: 'Code Generation',
      slug: 'code-generation',
      scores: {
        'gpt-5.4': 9.13,
        'gpt-5.3-instant': 9.13,
        'claude-opus-4.6': 9.13,
        'claude-sonnet-4.6': 9.13,
        'gemini-3.1-pro': 9.07,
      },
      winner: 'gpt-5.4',
    },
    {
      name: 'Summarization',
      slug: 'summarization',
      scores: {
        'gpt-5.4': 6.17,
        'gpt-5.3-instant': 6.32,
        'claude-opus-4.6': 5.34,
        'claude-sonnet-4.6': 5.4,
        'gemini-3.1-pro': 5.24,
      },
      winner: 'gpt-5.3-instant',
    },
    {
      name: 'Judgment',
      slug: 'judgment',
      scores: {
        'gpt-5.4': 6.6,
        'gpt-5.3-instant': 9.0,
        'claude-opus-4.6': 8.6,
        'claude-sonnet-4.6': 9.13,
        'gemini-3.1-pro': 9.0,
      },
      winner: 'claude-sonnet-4.6',
    },
    {
      name: 'Safety/Trust',
      slug: 'safety-trust',
      scores: {
        'gpt-5.4': 9.56,
        'gpt-5.3-instant': 9.89,
        'claude-opus-4.6': 10.0,
        'claude-sonnet-4.6': 10.0,
        'gemini-3.1-pro': 6.78,
      },
      winner: 'claude-opus-4.6',
    },
  ],
  routing: {
    mechanical: 'gpt-5.3-instant',
    judgment: 'claude-sonnet-4.6',
    safety: 'claude-opus-4.6',
  },
  methodology: 'https://www.clawbotomy.com/about',
  reproduce: 'https://github.com/aa-on-ai/clawbotomy',
} as const;

export type BenchData = typeof benchData;
