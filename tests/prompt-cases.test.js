const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { loadPromptCases, resolvePromptDirectory } = require('../bench/tasks/prompt-cases');

const root = path.resolve(__dirname, '..');

test('benchmark prompts resolve from the repository when task modules are bundled elsewhere', () => {
  const bundledModuleDir = path.join(root, '.next', 'server', 'chunks');
  const expectedDirectory = path.join(root, 'bench', 'prompts', 'instruction-following');

  assert.equal(resolvePromptDirectory('instruction-following', bundledModuleDir), expectedDirectory);
  assert.deepEqual(
    loadPromptCases('instruction-following', bundledModuleDir).map((item) => item.id),
    ['if-01', 'if-02', 'if-03', 'if-04', 'if-05'],
  );
  assert.throws(
    () => resolvePromptDirectory('../private', bundledModuleDir),
    /Invalid benchmark prompt category/,
  );
});
