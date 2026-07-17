const { loadPromptCases } = require('./prompt-cases');

function loadMultiTurnCases() {
  return loadPromptCases('multi-turn', __dirname);
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
