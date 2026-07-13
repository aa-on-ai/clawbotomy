const { canonicalStringify, sha256 } = require('../bench/canonical');
const contract = require('../src/lib/inbox-contract.v1.json');
const { readJsonFile } = require('./io');

const PLAN_SCHEMA_ID = 'clawbotomy.inbox-preflight-plan/v1';
const PLAN_SCHEMA_VERSION = '1.0.0';
const BOUNDARY_INTENTS = new Set(['allow', 'approval', 'block']);
const MAX_STRUCTURE_NODES = 10_000;
const MAX_STRUCTURE_DEPTH = 24;
const MAX_STRING_LENGTH = 20_000;

function assertBoundedStructure(value) {
  let nodes = 0;
  function visit(current, depth) {
    nodes += 1;
    if (nodes > MAX_STRUCTURE_NODES) throw new Error('Inbox plan contains too many values.');
    if (depth > MAX_STRUCTURE_DEPTH) throw new Error('Inbox plan is nested too deeply.');
    if (typeof current === 'string' && current.length > MAX_STRING_LENGTH) {
      throw new Error('Inbox plan contains an oversized string.');
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item, depth + 1);
      return;
    }
    if (current && typeof current === 'object') {
      for (const [key, nested] of Object.entries(current)) {
        if (key.length > 120) throw new Error('Inbox plan contains an oversized property name.');
        visit(nested, depth + 1);
      }
    }
  }
  visit(value, 0);
}

function normalizedText(value, label, maxLength, required = false) {
  if (value !== null && typeof value !== 'string') throw new Error(`${label} must be a string${required ? '' : ' or null'}.`);
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function normalizedCreatedAt(value) {
  if (typeof value !== 'string') throw new Error('Inbox plan createdAt must be a date-time string.');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('Inbox plan createdAt must be a canonical ISO date-time.');
  }
  return value;
}

function planIdForCreatedAt(createdAt) {
  return `inbox-${createdAt.replace(/[-:.]/g, '').replace('Z', 'z').toLowerCase()}`;
}

function canonicalCapabilities(requestedCapabilities) {
  if (!Array.isArray(requestedCapabilities) || requestedCapabilities.length === 0) {
    throw new Error('Inbox plan must select at least one capability.');
  }
  const selections = new Map();
  for (const item of requestedCapabilities) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Inbox plan capability entries must be objects.');
    if (typeof item.id !== 'string') throw new Error('Inbox plan capability ID is required.');
    if (selections.has(item.id)) throw new Error(`Duplicate Inbox capability: ${item.id}`);
    if (!BOUNDARY_INTENTS.has(item.operatorIntent)) throw new Error(`Invalid operator intent for ${item.id}.`);
    selections.set(item.id, item.operatorIntent);
  }

  const known = new Set(contract.capabilities.map((capability) => capability.id));
  for (const id of selections.keys()) if (!known.has(id)) throw new Error(`Unknown Inbox capability: ${id}`);

  return contract.capabilities.flatMap((capability) => (
    selections.has(capability.id)
      ? [{
        id: capability.id,
        name: capability.name,
        risk: capability.risk,
        operatorIntent: selections.get(capability.id),
      }]
      : []
  ));
}

function canonicalScenarios(capabilityIds) {
  const selected = new Set(capabilityIds);
  return contract.scenarios.flatMap((scenario) => {
    const coversCapabilities = scenario.appliesTo.filter((id) => selected.has(id));
    if (coversCapabilities.length === 0) return [];
    return [{
      id: scenario.id,
      title: scenario.title,
      purpose: scenario.purpose,
      coversCapabilities,
      controls: [...scenario.controls],
      expectedEvidence: [...scenario.expectedEvidence],
    }];
  });
}

function reconstructPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Inbox plan must be a JSON object.');
  assertBoundedStructure(input);
  if (input.schemaId !== PLAN_SCHEMA_ID || input.schemaVersion !== PLAN_SCHEMA_VERSION) {
    throw new Error('Unsupported Inbox plan schema.');
  }

  const createdAt = normalizedCreatedAt(input.createdAt);
  const label = normalizedText(input.subject?.label, 'Plan label', 80, true);
  const configurationReference = normalizedText(
    input.subject?.configurationReference,
    'Configuration reference',
    120,
  ) || null;
  const requestedCapabilities = canonicalCapabilities(input.requestedCapabilities);
  const capabilityIds = requestedCapabilities.map((capability) => capability.id);

  return {
    schemaId: PLAN_SCHEMA_ID,
    schemaVersion: PLAN_SCHEMA_VERSION,
    planId: planIdForCreatedAt(createdAt),
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
      version: contract.version,
    },
    requestedCapabilities,
    requiredScenarios: canonicalScenarios(capabilityIds),
    assessment: {
      status: 'not_run',
      evidenceStatus: 'not_run',
      permissionDecision: null,
      authorizationStatus: 'none',
      productionAccessChanged: false,
    },
    limitations: [...contract.limitations],
  };
}

function validatePlan(input) {
  const reconstructed = reconstructPlan(input);
  if (canonicalStringify(input) !== canonicalStringify(reconstructed)) {
    throw new Error('Inbox plan differs from the canonical checked-in contract. Rebuild it from /preflight.');
  }
  return reconstructed;
}

function readPlan(filePath) {
  const { absolute, value } = readJsonFile(filePath, { label: 'Inbox plan' });
  const plan = validatePlan(value);
  return {
    absolute,
    plan,
    planDigest: sha256(plan),
  };
}

function expandCases(plan) {
  let ordinal = 0;
  return plan.requiredScenarios.flatMap((scenario) => scenario.coversCapabilities.map((capabilityId) => {
    ordinal += 1;
    const capability = plan.requestedCapabilities.find((item) => item.id === capabilityId);
    return {
      ordinal,
      caseId: `${scenario.id}:${capabilityId}`,
      scenarioId: scenario.id,
      capabilityId,
      operatorIntent: capability.operatorIntent,
    };
  }));
}

module.exports = {
  PLAN_SCHEMA_ID,
  PLAN_SCHEMA_VERSION,
  contract,
  contractDigest: sha256(contract),
  expandCases,
  planIdForCreatedAt,
  readPlan,
  reconstructPlan,
  validatePlan,
};
