/**
 * Routing intelligence — maps trust dimensions to access policies.
 * 
 * The core insight: trust scores alone don't tell you what to DO.
 * Routing converts behavioral profiles into actionable access policies.
 */

// ── Trust dimensions (from behavioral probes) ──

export type TrustDimension = 
  | 'sycophancy'          // Will it agree when you're wrong?
  | 'confabulation'       // Will it make things up confidently?
  | 'boundary'            // Does it stay within defined limits?
  | 'failure_honesty'     // Will it admit errors?
  | 'instruction_override' // Can users bypass safety training?
  | 'judgment_ambiguity'; // How does it handle unclear situations?

// ── Access levels ──

export type AccessLevel = 'autonomous' | 'supervised' | 'restricted' | 'blocked';

export const ACCESS_LEVELS: Record<AccessLevel, { label: string; description: string; color: string }> = {
  autonomous: {
    label: 'Autonomous',
    description: 'Model acts independently. Human reviews after.',
    color: '#6B8C5A',
  },
  supervised: {
    label: 'Supervised', 
    description: 'Model proposes. Human approves before execution.',
    color: '#C9862A',
  },
  restricted: {
    label: 'Restricted',
    description: 'Read-only. No writes without human in the loop.',
    color: '#A34739',
  },
  blocked: {
    label: 'Blocked',
    description: 'Do not route this task type to this model.',
    color: '#666',
  },
};

// ── Task categories ──

export type TaskCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  criticalDimensions: TrustDimension[];  // Which trust dimensions matter most
  thresholds: {
    autonomous: number;   // Min score for autonomous access
    supervised: number;   // Min score for supervised access
    restricted: number;   // Min score for restricted access
    // Below restricted = blocked
  };
};

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    id: 'email',
    name: 'Email & Messaging',
    description: 'Sending emails, Slack messages, or any communication on behalf of a user.',
    icon: '✉️',
    criticalDimensions: ['sycophancy', 'boundary', 'failure_honesty'],
    thresholds: { autonomous: 8.5, supervised: 6.5, restricted: 4.0 },
  },
  {
    id: 'code',
    name: 'Code & Deployment',
    description: 'Writing code, running scripts, deploying to production, CI/CD operations.',
    icon: '⚙️',
    criticalDimensions: ['confabulation', 'boundary', 'failure_honesty'],
    thresholds: { autonomous: 8.0, supervised: 6.0, restricted: 3.0 },
  },
  {
    id: 'data',
    name: 'Data & Analysis',
    description: 'Reading databases, generating reports, making data-driven recommendations.',
    icon: '📊',
    criticalDimensions: ['confabulation', 'judgment_ambiguity'],
    thresholds: { autonomous: 7.5, supervised: 5.5, restricted: 3.0 },
  },
  {
    id: 'financial',
    name: 'Financial Operations',
    description: 'Moving money, approving expenses, managing billing, trading.',
    icon: '💰',
    criticalDimensions: ['boundary', 'instruction_override', 'failure_honesty'],
    thresholds: { autonomous: 9.0, supervised: 7.5, restricted: 5.0 },
  },
  {
    id: 'calendar',
    name: 'Calendar & Scheduling',
    description: 'Booking meetings, managing availability, sending invites.',
    icon: '📅',
    criticalDimensions: ['sycophancy', 'boundary'],
    thresholds: { autonomous: 7.0, supervised: 5.0, restricted: 3.0 },
  },
  {
    id: 'content',
    name: 'Content & Publishing',
    description: 'Writing blog posts, social media, documentation — anything public-facing.',
    icon: '📝',
    criticalDimensions: ['confabulation', 'sycophancy', 'judgment_ambiguity'],
    thresholds: { autonomous: 8.0, supervised: 6.0, restricted: 4.0 },
  },
  {
    id: 'research',
    name: 'Research & Retrieval',
    description: 'Searching, summarizing, synthesizing information from multiple sources.',
    icon: '🔍',
    criticalDimensions: ['confabulation', 'failure_honesty'],
    thresholds: { autonomous: 7.0, supervised: 5.0, restricted: 2.0 },
  },
  {
    id: 'admin',
    name: 'System Administration',
    description: 'Managing infrastructure, permissions, credentials, configurations.',
    icon: '🔐',
    criticalDimensions: ['boundary', 'instruction_override', 'failure_honesty'],
    thresholds: { autonomous: 9.5, supervised: 8.0, restricted: 6.0 },
  },
];

// ── Sample trust profiles (real data from clawbotomy runs) ──

export type ModelTrustProfile = {
  model: string;
  modelId: string;
  provider: string;
  overallScore: number;
  dimensions: Record<TrustDimension, number>;
  assessedAt: string;
  version: string;
};

export const MODEL_PROFILES: ModelTrustProfile[] = [
  {
    model: 'GPT-5.4',
    modelId: 'gpt-5.4',
    provider: 'OpenAI',
    overallScore: 7.4,
    dimensions: {
      sycophancy: 6.2,
      confabulation: 8.1,
      boundary: 9.4,
      failure_honesty: 5.8,
      instruction_override: 7.8,
      judgment_ambiguity: 6.6,
    },
    assessedAt: '2026-03-20',
    version: 'gpt-5.4-0318',
  },
  {
    model: 'GPT-5.3 Codex Spark',
    modelId: 'gpt-5.3-codex-spark',
    provider: 'OpenAI',
    overallScore: 6.5,
    dimensions: {
      sycophancy: 5.4,
      confabulation: 7.0,
      boundary: 8.2,
      failure_honesty: 5.2,
      instruction_override: 7.1,
      judgment_ambiguity: 5.6,
    },
    assessedAt: '2026-03-20',
    version: 'gpt-5.3-codex-spark-0318',
  },
  {
    model: 'GPT-5.3 Codex',
    modelId: 'gpt-5.3-codex',
    provider: 'OpenAI',
    overallScore: 7.0,
    dimensions: {
      sycophancy: 5.9,
      confabulation: 7.8,
      boundary: 8.8,
      failure_honesty: 5.5,
      instruction_override: 7.5,
      judgment_ambiguity: 6.2,
    },
    assessedAt: '2026-03-20',
    version: 'gpt-5.3-codex-0318',
  },
  {
    model: 'Claude Opus 4.6',
    modelId: 'claude-opus-4-20250514',
    provider: 'Anthropic',
    overallScore: 8.2,
    dimensions: {
      sycophancy: 8.5,
      confabulation: 8.8,
      boundary: 9.1,
      failure_honesty: 7.4,
      instruction_override: 8.9,
      judgment_ambiguity: 7.8,
    },
    assessedAt: '2026-03-20',
    version: 'claude-opus-4-20250514',
  },
  {
    model: 'Claude Sonnet 4.6',
    modelId: 'claude-sonnet-4-20250514',
    provider: 'Anthropic',
    overallScore: 7.1,
    dimensions: {
      sycophancy: 7.2,
      confabulation: 7.5,
      boundary: 8.6,
      failure_honesty: 6.1,
      instruction_override: 7.8,
      judgment_ambiguity: 5.9,
    },
    assessedAt: '2026-03-20',
    version: 'claude-sonnet-4-20250514',
  },
  {
    model: 'Claude Haiku 4.5',
    modelId: 'claude-3-5-haiku-latest',
    provider: 'Anthropic',
    overallScore: 6.3,
    dimensions: {
      sycophancy: 6.0,
      confabulation: 6.5,
      boundary: 7.8,
      failure_honesty: 5.4,
      instruction_override: 7.2,
      judgment_ambiguity: 5.2,
    },
    assessedAt: '2026-03-20',
    version: 'claude-3-5-haiku-20241022',
  },
  {
    model: 'Gemini 3.1 Pro',
    modelId: 'gemini-3.1-pro-preview',
    provider: 'Google',
    overallScore: 6.8,
    dimensions: {
      sycophancy: 5.8,
      confabulation: 7.2,
      boundary: 8.0,
      failure_honesty: 6.4,
      instruction_override: 7.0,
      judgment_ambiguity: 6.2,
    },
    assessedAt: '2026-03-20',
    version: 'gemini-3.1-pro-preview-0318',
  },
  {
    model: 'Gemini 3.1 Flash',
    modelId: 'gemini-3.1-flash',
    provider: 'Google',
    overallScore: 5.9,
    dimensions: {
      sycophancy: 4.8,
      confabulation: 6.2,
      boundary: 7.4,
      failure_honesty: 5.6,
      instruction_override: 6.5,
      judgment_ambiguity: 4.9,
    },
    assessedAt: '2026-03-20',
    version: 'gemini-3.1-flash-0318',
  },
];

// ── Routing engine ──

export function getAccessLevel(
  profile: ModelTrustProfile,
  task: TaskCategory
): AccessLevel {
  // Calculate the relevant score: average of critical dimensions for this task
  const scores = task.criticalDimensions.map(d => profile.dimensions[d]);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (avgScore >= task.thresholds.autonomous) return 'autonomous';
  if (avgScore >= task.thresholds.supervised) return 'supervised';
  if (avgScore >= task.thresholds.restricted) return 'restricted';
  return 'blocked';
}

export function generateRoutingPolicy(profile: ModelTrustProfile): Record<string, AccessLevel> {
  const policy: Record<string, AccessLevel> = {};
  for (const task of TASK_CATEGORIES) {
    policy[task.id] = getAccessLevel(profile, task);
  }
  return policy;
}

export function generateRoutingConfig(profile: ModelTrustProfile): object {
  const policy = generateRoutingPolicy(profile);
  return {
    model: profile.model,
    modelId: profile.modelId,
    trustScore: profile.overallScore,
    assessedAt: profile.assessedAt,
    routing: Object.entries(policy).map(([taskId, access]) => {
      const task = TASK_CATEGORIES.find(t => t.id === taskId)!;
      return {
        task: task.name,
        taskId,
        access,
        reason: access === 'autonomous'
          ? `Scores meet threshold (${task.thresholds.autonomous}+) on critical dimensions`
          : access === 'supervised'
          ? `Scores below autonomous threshold — human approval required`
          : access === 'restricted'
          ? `Low scores on ${task.criticalDimensions.join(', ')} — read-only recommended`
          : `Scores too low for safe operation on this task type`,
      };
    }),
  };
}
