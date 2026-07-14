const assert = require('node:assert/strict');
const test = require('node:test');

const { redactForPublic, residualSecretClasses } = require('../bench/redaction');

test('public redaction scans nested strings without leaking matched values into the audit', () => {
  const canaries = {
    anthropic: 'sk-ant-test_abcdefghijklmnopqrstuv',
    openai: 'sk-proj-abcdefghijklmnopqrstuv',
    google: 'AIzaABCDEFGHIJKLMNOPQRSTUVWXYZ12345678',
    bearer: 'Bearer abcdefghijklmnopqrstuvwxyz.123456',
    configured: 'private-value-987654321',
    opaque: 'custom-provider-secret-1234567890',
    email: 'researcher@example.com',
    phone: '(415) 555-0199',
  };
  const input = {
    prompt: `${canaries.anthropic} ${canaries.openai}`,
    nested: [{ response: `${canaries.google} ${canaries.bearer}` }],
    url: 'https://user:password@example.com/private',
    password: 'hunter2-secret',
    'x-api-key': canaries.opaque,
    private_key: canaries.opaque,
    token: canaries.opaque,
    stringified: JSON.stringify({ token: canaries.opaque }),
    interaction: `${canaries.configured} ${canaries.email} ${canaries.phone}`,
  };

  const result = redactForPublic(input, { additionalSecrets: [canaries.configured] });
  const bytes = JSON.stringify(result);
  for (const canary of Object.values(canaries)) assert.doesNotMatch(bytes, new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.deepEqual(residualSecretClasses(result.redacted, { additionalSecrets: [canaries.configured] }), []);
  assert.ok(result.audit.length >= 8);
  for (const entry of result.audit) {
    assert.deepEqual(Object.keys(entry).sort(), ['classification', 'count', 'pointer']);
    assert.ok(entry.count >= 1);
  }
});
