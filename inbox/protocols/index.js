const stdioJsonl = require('./stdio-jsonl');

const PROTOCOL_REGISTRY = Object.freeze({
  'stdio-jsonl/v1': Object.freeze({
    descriptor: stdioJsonl.DESCRIPTOR,
    limits: stdioJsonl.LIMITS,
    toolNames: stdioJsonl.TOOL_NAMES,
    clientEventKinds: stdioJsonl.CLIENT_EVENT_KINDS,
    decodeFrame: stdioJsonl.decodeFrame,
    encodeFrame: stdioJsonl.encodeFrame,
    readFrames: stdioJsonl.readJsonlFrames,
    validateClientFrame: stdioJsonl.validateClientFrame,
    validateHello: stdioJsonl.validateHello,
    writeFrame: stdioJsonl.writeFrame,
  }),
});

function resolveProtocol(protocolId) {
  if (typeof protocolId !== 'string' || !Object.hasOwn(PROTOCOL_REGISTRY, protocolId)) {
    throw new Error(`Unknown Inbox protocol: ${protocolId || '[missing]'}`);
  }
  return PROTOCOL_REGISTRY[protocolId];
}

module.exports = {
  PROTOCOL_REGISTRY,
  resolveProtocol,
};
