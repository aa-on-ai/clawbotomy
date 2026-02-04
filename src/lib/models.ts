export interface ModelDef {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  apiModel: string;
  description: string;
  envKey: string;
}

export const MODELS: ModelDef[] = [
  // Anthropic - Claude 4.5 family
  {
    id: 'haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    description: 'Fast, cheap, surprisingly expressive',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-5-20250203',
    description: 'Balanced intelligence, richer output',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'opus',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    apiModel: 'claude-opus-4-5-20250203',
    description: 'Maximum depth, longest responses',
    envKey: 'ANTHROPIC_API_KEY',
  },
  // OpenAI - ChatGPT 5.2 family
  {
    id: 'gpt-instant',
    name: 'ChatGPT 5.2 Instant',
    provider: 'openai',
    apiModel: 'gpt-5.2-instant',
    description: 'OpenAI fast — quick responses',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'gpt-auto',
    name: 'ChatGPT 5.2 Auto',
    provider: 'openai',
    apiModel: 'gpt-5.2-auto',
    description: 'OpenAI flagship — balanced',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'gpt-thinking',
    name: 'ChatGPT 5.2 Thinking',
    provider: 'openai',
    apiModel: 'gpt-5.2-thinking',
    description: 'OpenAI reasoning — deeper thought',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'gpt-pro',
    name: 'ChatGPT 5.2 Pro',
    provider: 'openai',
    apiModel: 'gpt-5.2-pro',
    description: 'OpenAI maximum — most capable',
    envKey: 'OPENAI_API_KEY',
  },
  // Google - Gemini 3 family
  {
    id: 'gemini-fast',
    name: 'Gemini 3 Fast',
    provider: 'google',
    apiModel: 'gemini-3-fast',
    description: 'Google fast — quick and capable',
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gemini-thinking',
    name: 'Gemini 3 Thinking',
    provider: 'google',
    apiModel: 'gemini-3-thinking',
    description: 'Google reasoning — extended thought',
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    apiModel: 'gemini-3-pro',
    description: 'Google flagship — maximum capability',
    envKey: 'GOOGLE_API_KEY',
  },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getAvailableModels(): ModelDef[] {
  return MODELS;
}
