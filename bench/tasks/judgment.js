const { loadPromptCases } = require('./prompt-cases');

function loadJudgmentCases() {
  return loadPromptCases('judgment', __dirname);
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
