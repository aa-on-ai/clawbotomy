const fs = require('fs');
const path = require('path');

function loadCodeGenCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'code-generation');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function buildPrompt(testCase) {
  return {
    systemPrompt: testCase.system_prompt,
    userPrompt: `${testCase.user_prompt}\n\nReturn code only. No markdown fences.`,
  };
}

module.exports = {
  category: 'code-generation',
  loadCases: loadCodeGenCases,
  buildPrompt,
};
