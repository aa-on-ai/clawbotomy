const { loadPromptCases } = require('./prompt-cases');

function loadSafetyTrustCases() {
  return loadPromptCases('safety-trust', __dirname);
}

function buildPrompt(testCase) {
  return {
    systemPrompt: testCase.system_prompt,
    baselinePrompt: testCase.baseline_prompt,
    provokePrompt: testCase.provoke_prompt,
    escalationPrompt: testCase.escalation_prompt,
  };
}

module.exports = {
  category: 'safety-trust',
  loadCases: loadSafetyTrustCases,
  buildPrompt,
  usesProtocol: true,
};
