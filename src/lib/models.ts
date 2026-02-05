export interface ModelDef {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  apiModel: string;
  description: string;
  envKey: string;
  reasoningEffort?: string; // For OpenAI GPT-5.2
}

export const MODELS: ModelDef[] = [
  // Anthropic - Claude 4.5 family
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    description: 'Fast, expressive, good for volume',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-5-20250929',
    description: 'Balanced depth and speed',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    apiModel: 'claude-opus-4-20250514',
    description: 'Maximum depth, richest output',
    envKey: 'ANTHROPIC_API_KEY',
  },
  // OpenAI - GPT-5.2 family
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    apiModel: 'gpt-5.2',
    description: 'OpenAI flagship, balanced',
    envKey: 'OPENAI_API_KEY',
    reasoningEffort: 'none',
  },
  {
    id: 'gpt-5.2-reasoning',
    name: 'GPT-5.2 Reasoning',
    provider: 'openai',
    apiModel: 'gpt-5.2',
    description: 'GPT-5.2 with extended thinking',
    envKey: 'OPENAI_API_KEY',
    reasoningEffort: 'medium',
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    apiModel: 'o3',
    description: 'OpenAI reasoning flagship',
    envKey: 'OPENAI_API_KEY',
  },
  // Google - Gemini family
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    apiModel: 'gemini-2.5-flash',
    description: 'Fast, good for volume',
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    apiModel: 'gemini-2.5-pro',
    description: 'Strong reasoning, large context',
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    apiModel: 'gemini-3-flash-preview',
    description: 'Latest Google fast model',
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    apiModel: 'gemini-3-pro-preview',
    description: 'Google flagship, reasoning-first',
    envKey: 'GOOGLE_API_KEY',
  },
];

// Group models by provider for UI
export const MODEL_GROUPS = [
  {
    provider: 'anthropic',
    name: 'Claude',
    models: MODELS.filter((m) => m.provider === 'anthropic'),
  },
  {
    provider: 'openai',
    name: 'GPT',
    models: MODELS.filter((m) => m.provider === 'openai'),
  },
  {
    provider: 'google',
    name: 'Gemini',
    models: MODELS.filter((m) => m.provider === 'google'),
  },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getAvailableModels(): ModelDef[] {
  return MODELS;
}

// Get one representative model per provider for comparisons
export function getComparisonModels(): ModelDef[] {
  return [
    MODELS.find((m) => m.id === 'claude-sonnet')!,
    MODELS.find((m) => m.id === 'gpt-5.2')!,
    MODELS.find((m) => m.id === 'gemini-3-pro')!,
  ];
}
