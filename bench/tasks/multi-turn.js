const fs = require('fs');
const path = require('path');

function loadMultiTurnCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'multi-turn');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function buildPrompt(testCase) {
  return {
    systemPrompt: testCase.system_prompt,
    messages: testCase.turns || [],
  };
}

module.exports = {
  category: 'multi-turn',
  loadCases: loadMultiTurnCases,
  buildPrompt,
  isMultiTurn: true,
};
