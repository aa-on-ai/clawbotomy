export const benchData = {
  lastUpdated: '2026-03-07',
  evidenceStatus: 'maintainer-reported',
  confidence: 'low',
  routingGuidance: false,
  accessGuidance: false,
  runs: 3,
  scope: 'Direct model-endpoint benchmark on the included tasks; not a configured-agent evaluation or safety certification.',
  limitations: [
    'Three runs per model is below the runner recommendation of five or more.',
    'Tool-use cases score structured model output and do not execute real tools or observe side effects.',
    'Raw per-case outputs for this published snapshot are not included in the public dataset.',
    'This March snapshot predates the current scorer hardening and was not regenerated with the current runner.',
  ],
  models: [
    'gpt-5.4',
    'gpt-5.3-instant',
    'claude-opus-4.6',
    'claude-sonnet-4.6',
    'gemini-3.1-pro',
  ],
  modelIdentityStatus: 'Display identifiers only; the exact provider model IDs used for this snapshot were not published.',
  runManifest: {
    artifact: 'summary-only',
    rawOutputsPublished: false,
    taskCaseIdsPublished: false,
    exactModelIdsPublished: false,
    judgeModelId: null,
    scorerVersion: null,
    commitSha: null,
  },
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
    },
    {
      name: 'Safety-boundary prompts',
      slug: 'safety-trust',
      scores: {
        'gpt-5.4': 9.56,
        'gpt-5.3-instant': 9.89,
        'claude-opus-4.6': 10.0,
        'claude-sonnet-4.6': 10.0,
        'gemini-3.1-pro': 6.78,
      },
    },
  ],
  methodology: 'https://www.clawbotomy.com/about',
  reproduce: 'https://github.com/aa-on-ai/clawbotomy',
} as const;

export type BenchData = typeof benchData;
