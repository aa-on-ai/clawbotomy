import inboxContract from './inbox-contract.v1.json' with { type: 'json' };

export const INBOX_PLAN_SCHEMA_ID = 'clawbotomy.inbox-preflight-plan/v1' as const;
export const INBOX_PLAN_SCHEMA_VERSION = '1.0.0' as const;

export type CapabilityId = 'search_read' | 'draft' | 'send' | 'archive' | 'delete';
export type BoundaryIntent = 'allow' | 'approval' | 'block';
export type CapabilityRisk = 'read' | 'write' | 'external' | 'destructive';

export interface CapabilityDefinition {
  id: CapabilityId;
  name: string;
  description: string;
  risk: CapabilityRisk;
  boundaryQuestion: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  purpose: string;
  appliesTo: CapabilityId[];
  controls: string[];
  expectedEvidence: string[];
}

export interface CapabilitySelection {
  capabilityId: CapabilityId;
  intendedBoundary: BoundaryIntent;
}

export interface BuildInboxPlanInput {
  planLabel: string;
  configurationReference?: string;
  selections: CapabilitySelection[];
  createdAt?: string;
}

export interface InboxPreflightPlan {
  schemaId: typeof INBOX_PLAN_SCHEMA_ID;
  schemaVersion: typeof INBOX_PLAN_SCHEMA_VERSION;
  planId: string;
  createdAt: string;
  generatedBy: {
    surface: 'clawbotomy.com/preflight';
    mode: 'browser-local';
    uploaded: false;
    networkRequests: 0;
  };
  subject: {
    label: string;
    configurationReference: string | null;
    declaration: 'Operator-supplied reference only; Clawbotomy did not inspect this configuration.';
  };
  pack: {
    id: 'inbox';
    version: '1.0.0';
  };
  requestedCapabilities: Array<{
    id: CapabilityId;
    name: string;
    risk: CapabilityRisk;
    operatorIntent: BoundaryIntent;
  }>;
  requiredScenarios: Array<{
    id: string;
    title: string;
    purpose: string;
    coversCapabilities: CapabilityId[];
    controls: string[];
    expectedEvidence: string[];
  }>;
  assessment: {
    status: 'not_run';
    evidenceStatus: 'not_run';
    permissionDecision: null;
    authorizationStatus: 'none';
    productionAccessChanged: false;
  };
  limitations: string[];
}

export const BOUNDARY_OPTIONS: ReadonlyArray<{
  id: BoundaryIntent;
  label: string;
  description: string;
}> = [
  {
    id: 'allow',
    label: 'Allow automatically',
    description: 'This is your intended starting boundary, not a Clawbotomy recommendation.',
  },
  {
    id: 'approval',
    label: 'Require approval',
    description: 'The agent may prepare the action, but a person must approve it.',
  },
  {
    id: 'block',
    label: 'Keep blocked',
    description: 'The capability should remain unavailable to the agent.',
  },
];

export const INBOX_CAPABILITIES = inboxContract.capabilities as ReadonlyArray<CapabilityDefinition>;
export const INBOX_SCENARIOS = inboxContract.scenarios as ReadonlyArray<ScenarioDefinition>;
export const INBOX_PLAN_LIMITATIONS = inboxContract.limitations as ReadonlyArray<string>;

const CAPABILITY_IDS = new Set(INBOX_CAPABILITIES.map((capability) => capability.id));
const BOUNDARY_IDS = new Set(BOUNDARY_OPTIONS.map((option) => option.id));

function normalizedText(value: string | undefined, label: string, maxLength: number, required = false) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function normalizedCreatedAt(createdAt?: string) {
  const value = createdAt || new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Created time must be a valid date-time.');
  return parsed.toISOString();
}

function createPlanId(createdAt: string) {
  return `inbox-${createdAt.replace(/[-:.]/g, '').replace('Z', 'z').toLowerCase()}`;
}

export function scenariosForCapabilities(capabilityIds: CapabilityId[]) {
  const selected = new Set(capabilityIds);
  return INBOX_SCENARIOS.filter((scenario) => scenario.appliesTo.some((id) => selected.has(id)));
}

export function buildInboxPreflightPlan(input: BuildInboxPlanInput): InboxPreflightPlan {
  const label = normalizedText(input.planLabel, 'Plan label', 80, true);
  const configurationReference = normalizedText(input.configurationReference, 'Configuration reference', 120) || null;
  if (!Array.isArray(input.selections) || input.selections.length === 0) {
    throw new Error('Choose at least one Inbox capability.');
  }

  const duplicateCheck = new Set<CapabilityId>();
  for (const selection of input.selections) {
    if (!CAPABILITY_IDS.has(selection.capabilityId)) {
      throw new Error(`Unknown Inbox capability: ${selection.capabilityId}`);
    }
    if (duplicateCheck.has(selection.capabilityId)) {
      throw new Error(`Duplicate Inbox capability: ${selection.capabilityId}`);
    }
    if (!BOUNDARY_IDS.has(selection.intendedBoundary)) {
      throw new Error(`Choose an intended boundary for ${selection.capabilityId}.`);
    }
    duplicateCheck.add(selection.capabilityId);
  }

  const orderedSelections = INBOX_CAPABILITIES.flatMap((capability) => {
    const selection = input.selections.find((candidate) => candidate.capabilityId === capability.id);
    return selection ? [{ capability, selection }] : [];
  });
  const selectedIds = orderedSelections.map(({ capability }) => capability.id);
  const createdAt = normalizedCreatedAt(input.createdAt);
  const scenarios = scenariosForCapabilities(selectedIds);

  return {
    schemaId: INBOX_PLAN_SCHEMA_ID,
    schemaVersion: INBOX_PLAN_SCHEMA_VERSION,
    planId: createPlanId(createdAt),
    createdAt,
    generatedBy: {
      surface: 'clawbotomy.com/preflight',
      mode: 'browser-local',
      uploaded: false,
      networkRequests: 0,
    },
    subject: {
      label,
      configurationReference,
      declaration: 'Operator-supplied reference only; Clawbotomy did not inspect this configuration.',
    },
    pack: {
      id: 'inbox',
      version: '1.0.0',
    },
    requestedCapabilities: orderedSelections.map(({ capability, selection }) => ({
      id: capability.id,
      name: capability.name,
      risk: capability.risk,
      operatorIntent: selection.intendedBoundary,
    })),
    requiredScenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      purpose: scenario.purpose,
      coversCapabilities: scenario.appliesTo.filter((id) => duplicateCheck.has(id)),
      controls: [...scenario.controls],
      expectedEvidence: [...scenario.expectedEvidence],
    })),
    assessment: {
      status: 'not_run',
      evidenceStatus: 'not_run',
      permissionDecision: null,
      authorizationStatus: 'none',
      productionAccessChanged: false,
    },
    limitations: [...INBOX_PLAN_LIMITATIONS],
  };
}

export function serializeInboxPreflightPlan(plan: InboxPreflightPlan) {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function inboxPlanFilename(plan: InboxPreflightPlan) {
  const slug = plan.subject.label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'agent';
  return `clawbotomy-inbox-${slug}.json`;
}
