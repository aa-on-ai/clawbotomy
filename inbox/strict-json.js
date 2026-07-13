function assertNoDuplicateObjectKeys(
  text,
  label,
  { maxValues = 250_000, maxDepth = 128 } = {},
) {
  let offset = 0;
  let values = 0;

  function fail(message) {
    throw new Error(`${label} ${message}`);
  }

  function skipWhitespace() {
    while (/\s/u.test(text[offset] || '')) offset += 1;
  }

  function readString() {
    const start = offset;
    if (text[offset] !== '"') fail('contains invalid JSON.');
    offset += 1;
    while (offset < text.length) {
      const character = text[offset];
      if (character === '"') {
        offset += 1;
        try {
          return JSON.parse(text.slice(start, offset));
        } catch {
          fail('contains invalid JSON.');
        }
      }
      if (character === '\\') offset += 2;
      else offset += 1;
    }
    fail('contains invalid JSON.');
    return null;
  }

  function readPrimitive() {
    const start = offset;
    while (offset < text.length && !/[\s,\]}]/u.test(text[offset])) offset += 1;
    if (offset === start) fail('contains invalid JSON.');
    try {
      JSON.parse(text.slice(start, offset));
    } catch {
      fail('contains invalid JSON.');
    }
  }

  function readArray(depth) {
    offset += 1;
    skipWhitespace();
    if (text[offset] === ']') {
      offset += 1;
      return;
    }
    while (offset < text.length) {
      readValue(depth + 1);
      skipWhitespace();
      if (text[offset] === ']') {
        offset += 1;
        return;
      }
      if (text[offset] !== ',') fail('contains invalid JSON.');
      offset += 1;
      skipWhitespace();
    }
    fail('contains invalid JSON.');
  }

  function readObject(depth) {
    const keys = new Set();
    offset += 1;
    skipWhitespace();
    if (text[offset] === '}') {
      offset += 1;
      return;
    }
    while (offset < text.length) {
      const key = readString();
      if (keys.has(key)) fail('contains a duplicate JSON object key.');
      keys.add(key);
      skipWhitespace();
      if (text[offset] !== ':') fail('contains invalid JSON.');
      offset += 1;
      readValue(depth + 1);
      skipWhitespace();
      if (text[offset] === '}') {
        offset += 1;
        return;
      }
      if (text[offset] !== ',') fail('contains invalid JSON.');
      offset += 1;
      skipWhitespace();
    }
    fail('contains invalid JSON.');
  }

  function readValue(depth = 0) {
    values += 1;
    if (values > maxValues) fail('contains too many JSON values.');
    if (depth > maxDepth) fail('is nested too deeply.');
    skipWhitespace();
    if (text[offset] === '{') return readObject(depth);
    if (text[offset] === '[') return readArray(depth);
    if (text[offset] === '"') return readString();
    return readPrimitive();
  }

  readValue();
  skipWhitespace();
  if (offset !== text.length) fail('contains invalid JSON.');
}

function parseStrictJson(text, label = 'JSON document', limits) {
  assertNoDuplicateObjectKeys(text, label, limits);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} contains invalid JSON.`);
  }
}

module.exports = {
  assertNoDuplicateObjectKeys,
  parseStrictJson,
};
