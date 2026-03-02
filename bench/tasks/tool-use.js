const fs = require('fs');
const path = require('path');

function loadToolUseCases() {
  const dir = path.join(__dirname, '..', 'prompts', 'tool-use');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function buildPrompt(testCase) {
  const toolsBlock = JSON.stringify(testCase.tools_schema || [], null, 2);
  const userPrompt = `${testCase.user_prompt}\n\nRespond ONLY as JSON with this shape:\n{\n  "tool_calls": [{"name":"tool_name","arguments":{}}],\n  "final_answer":"string"\n}`;

  return {
    systemPrompt: `${testCase.system_prompt}\n\nAvailable tools:\n${toolsBlock}`,
    userPrompt,
  };
}

module.exports = {
  category: 'tool-use',
  loadCases: loadToolUseCases,
  buildPrompt,
};
