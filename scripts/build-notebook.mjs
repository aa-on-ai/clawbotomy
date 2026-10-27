import { lstatSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notebookArtifacts } from './lib/notebook-public.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
// A native path WITHOUT a trailing separator: rm must not follow a final link.
// No caller-selected output location is supported.
const output = join(root, 'public/notebook/generated');
function assertOwnedOutput() {
  const paths = [];
  for (let path = output; path !== parse(path).root; path = dirname(path)) paths.unshift(path);
  for (const path of paths) {
    const entry = lstatSync(path, { throwIfNoEntry: false });
    if (!entry && path === output) continue;
    if (!entry?.isDirectory() || entry.isSymbolicLink()) {
      throw new Error('Unsafe notebook output: ancestors and existing output must be real directories');
    }
  }
}
assertOwnedOutput();
// Validate/render everything BEFORE touching outputs. This preflight is not an
// atomic defense against concurrent filesystem swaps; do not mutate paths during
// generation. All existing ancestors must be directories (no recursive mkdir).
const files = notebookArtifacts(readFileSync(join(root, 'public/notebook/index.html'), 'utf8'));
assertOwnedOutput();
rmSync(output, { recursive: true, force: true });
if (Object.keys(files).length) {
  mkdirSync(output);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(output, name), content);
}
console.log(`Notebook generated files: ${Object.keys(files).length}`);
