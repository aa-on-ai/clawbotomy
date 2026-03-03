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
  const userPrompt = `${testCase.user_prompt}\n\nRespond ONLY as raw JSON (no markdown code fences, no commentary) with this shape:\n{\n  "tool_calls": [{"name":"tool_name","arguments":{}}],\n  "final_answer":"string"\n}\n\nRules:\n- "tool_calls" must be an array (empty array if no tool applies)\n- Each call must include "name" and an object-valued "arguments"\n- Do not return arguments as a JSON-encoded string`;

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
