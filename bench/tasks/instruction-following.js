const { loadPromptCases } = require('./prompt-cases');

function loadInstructionCases() {
  return loadPromptCases('instruction-following', __dirname);
}

function buildPrompt(testCase) {
  return {
    systemPrompt: testCase.system_prompt,
    userPrompt: testCase.user_prompt,
  };
}

module.exports = {
  category: 'instruction-following',
  loadCases: loadInstructionCases,
  buildPrompt,
};
