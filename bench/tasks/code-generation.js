const { loadPromptCases } = require('./prompt-cases');

function loadCodeGenCases() {
  return loadPromptCases('code-generation', __dirname);
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
