const declarativePolicy = require('./declarative-policy');

const ADAPTER_REGISTRY = Object.freeze({
  'declarative-policy/v1': Object.freeze({
    descriptor: declarativePolicy.DESCRIPTOR,
    behaviorForScenario: declarativePolicy.behaviorForScenario,
    readConfig: declarativePolicy.readAdapterConfig,
    validateConfig: declarativePolicy.validateAdapterConfig,
  }),
});

function resolveAdapter(adapterId) {
  if (typeof adapterId !== 'string' || !Object.hasOwn(ADAPTER_REGISTRY, adapterId)) {
    throw new Error(`Unknown Inbox adapter: ${adapterId || '[missing]'}`);
  }
  return ADAPTER_REGISTRY[adapterId];
}

module.exports = {
  ADAPTER_REGISTRY,
  resolveAdapter,
};
