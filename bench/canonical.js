const { createHash } = require('node:crypto');

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON does not support non-finite numbers.');
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new Error(`Canonical JSON does not support ${typeof value} values.`);
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  const input = Buffer.isBuffer(value)
    ? value
    : (typeof value === 'string' ? value : canonicalStringify(value));
  return createHash('sha256').update(input).digest('hex');
}

module.exports = {
  canonicalStringify,
  canonicalize,
  sha256,
};
