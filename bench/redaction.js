const SECRET_FIELD = /^(?:authorization|proxy[-_]?authorization|cookie|set[-_]?cookie|password|passwd|passphrase|api[-_]?key|x[-_]?(?:api|goog)[-_]?(?:api[-_]?)?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|private[-_]?key|client[-_]?secret|secret|credentials?)$/i;

const PATTERNS = [
  ['anthropic-api-key', /sk-ant-[A-Za-z0-9_-]{12,}/g],
  ['openai-api-key', /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g],
  ['google-api-key', /AIza[0-9A-Za-z_-]{30,}/g],
  ['github-token', /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g],
  ['bearer-token', /Bearer\s+[A-Za-z0-9._~+\/-]{12,}/gi],
  ['url-credential', /https?:\/\/[^\s/@:]+:[^\s/@]+@/gi],
  ['aws-access-key', /AKIA[0-9A-Z]{16}/g],
  ['slack-token', /xox[baprs]-[A-Za-z0-9-]{12,}/gi],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{20,}?-----END [A-Z ]*PRIVATE KEY-----/g],
  ['secret-assignment', /["']?(?:x[-_]?api[-_]?key|x[-_]?goog[-_]?api[-_]?key|api[-_]?key|private[-_]?key|access[-_]?token|refresh[-_]?token|token|password|client[-_]?secret)["']?\s*[:=]\s*["']?[A-Za-z0-9._~+\/=\-]{8,}/gi],
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['phone', /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g],
];

function pointerPart(value) {
  return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
}

function addAudit(auditMap, pointer, classification, count = 1) {
  const key = `${pointer}\u0000${classification}`;
  const current = auditMap.get(key) || { pointer, classification, count: 0 };
  current.count += count;
  auditMap.set(key, current);
}

function configuredSecrets() {
  const values = new Set();
  for (const [key, value] of Object.entries(process.env)) {
    if (!/(?:API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CREDENTIALS?)$/i.test(key)) continue;
    if (typeof value === 'string' && value.length >= 8) values.add(value);
  }
  for (const value of String(process.env.CLAWBOTOMY_REDACT_VALUES || '').split(',').map((item) => item.trim())) {
    if (value.length >= 8) values.add(value);
  }
  return [...values].sort((a, b) => b.length - a.length);
}

function redactString(input, pointer, auditMap, secrets) {
  let value = input;
  for (const secret of secrets) {
    if (!value.includes(secret)) continue;
    const count = value.split(secret).length - 1;
    value = value.split(secret).join('[REDACTED_CONFIGURED_SECRET]');
    addAudit(auditMap, pointer, 'configured-secret', count);
  }

  for (const [classification, pattern] of PATTERNS) {
    let count = 0;
    value = value.replace(pattern, () => {
      count += 1;
      return `[REDACTED_${classification.toUpperCase().replaceAll('-', '_')}]`;
    });
    if (count) addAudit(auditMap, pointer, classification, count);
  }
  return value;
}

function redactNode(value, pointer, auditMap, secrets, keyName = '') {
  if (typeof value === 'string') {
    if (SECRET_FIELD.test(keyName) && value) {
      addAudit(auditMap, pointer, 'secret-field', 1);
      return '[REDACTED_SECRET_FIELD]';
    }
    return redactString(value, pointer, auditMap, secrets);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactNode(item, `${pointer}/${index}`, auditMap, secrets));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      redactNode(item, `${pointer}/${pointerPart(key)}`, auditMap, secrets, key),
    ]));
  }
  return value;
}

function redactForPublic(value, { additionalSecrets = [] } = {}) {
  const auditMap = new Map();
  const secrets = [...new Set([...configuredSecrets(), ...additionalSecrets.filter((item) => item?.length >= 8)])]
    .sort((a, b) => b.length - a.length);
  const redacted = redactNode(value, '', auditMap, secrets);
  const audit = [...auditMap.values()].sort((a, b) => `${a.pointer}:${a.classification}`.localeCompare(`${b.pointer}:${b.classification}`));
  return { redacted, audit };
}

function residualSecretClasses(value, { additionalSecrets = [] } = {}) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const findings = new Set();
  for (const secret of [...configuredSecrets(), ...additionalSecrets]) {
    if (secret?.length >= 8 && text.includes(secret)) findings.add('configured-secret');
  }
  for (const [classification, pattern] of PATTERNS.filter(([name]) => !['email', 'phone'].includes(name))) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.add(classification);
    pattern.lastIndex = 0;
  }
  const inspectFields = (node) => {
    if (Array.isArray(node)) {
      node.forEach(inspectFields);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, item] of Object.entries(node)) {
      if (
        SECRET_FIELD.test(key)
        && typeof item === 'string'
        && item.length > 0
        && !/^\[REDACTED_[A-Z0-9_]+\]$/.test(item)
      ) findings.add('secret-field');
      inspectFields(item);
    }
  };
  if (typeof value !== 'string') inspectFields(value);
  return [...findings].sort();
}

module.exports = {
  redactForPublic,
  residualSecretClasses,
};
