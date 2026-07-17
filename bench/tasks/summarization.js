const { loadPromptCases } = require('./prompt-cases');

function loadSummarizationCases() {
  return loadPromptCases('summarization', __dirname);
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
