const fs = require('fs');
const path = require('path');

function loadJudgmentCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'judgment');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function buildPrompt(testCase) {
  return {
    systemPrompt: testCase.system_prompt,
    userPrompt: testCase.user_prompt,
  };
}

module.exports = {
  category: 'judgment',
  loadCases: loadJudgmentCases,
  buildPrompt,
};
