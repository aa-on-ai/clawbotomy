export interface ModelDef {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  apiModel: string;
  description: string;
  envKey: string;
}

export const MODELS: ModelDef[] = [
  {
    id: 'haiku',
    name: 'Claude Haiku',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    description: 'Fast, cheap, surprisingly expressive',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'sonnet',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-20250514',
    description: 'Balanced intelligence, richer output',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'opus',
    name: 'Claude Opus',
    provider: 'anthropic',
    apiModel: 'claude-opus-4-20250514',
    description: 'Maximum depth, longest responses',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'openai',
    apiModel: 'gpt-4o',
    description: 'OpenAI flagship — different personality',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'gpt4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiModel: 'gpt-4o-mini',
    description: 'OpenAI lightweight — fast and cheap',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    apiModel: 'gemini-2.0-flash',
    description: 'Google — a completely different mind',
    envKey: 'GOOGLE_API_KEY',
  },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getAvailableModels(): ModelDef[] {
  return MODELS;
}
