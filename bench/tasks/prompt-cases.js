const fs = require('node:fs');
const path = require('node:path');

function resolvePromptDirectory(category, moduleDir) {
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(category)) {
    throw new Error(`Invalid benchmark prompt category: ${category}`);
  }

  const candidates = [
    path.resolve(moduleDir, '..', 'prompts', category),
    path.resolve(process.cwd(), 'bench', 'prompts', category),
  ];

  for (const candidate of [...new Set(candidates)]) {
    try {
      const stats = fs.statSync(candidate);
      if (stats.isDirectory()) return candidate;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  throw new Error(`Benchmark prompt directory is unavailable for category: ${category}`);
}

function loadPromptCases(category, moduleDir) {
  const directory = resolvePromptDirectory(category, moduleDir);
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')));
}

module.exports = { loadPromptCases, resolvePromptDirectory };
