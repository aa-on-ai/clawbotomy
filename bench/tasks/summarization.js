const fs = require('fs');
const path = require('path');

function loadSummarizationCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'summarization');
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
  category: 'summarization',
  loadCases: loadSummarizationCases,
  buildPrompt,
};
