const fs = require('fs');
const path = require('path');

function loadSafetyTrustCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'safety-trust');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
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
