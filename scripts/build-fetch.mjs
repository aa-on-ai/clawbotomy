import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(join(root, 'content/games/fetch', name), 'utf8');
// These are byte-identical to the accepted standalone game's embedded assets.
export const fetchAssets = Object.freeze({
  SERIF: '/notebook/assets/fraunces.woff2',
  SANS: '/notebook/assets/asset0.woff2',
  HERMY: '/notebook/assets/asset6.webp',
  CLAWC: '/notebook/assets/asset11.webp',
  CLAWC_PORTRAIT: '/notebook/assets/cast-clawc.webp',
  SCENE: '/notebook/assets/asset9.webp',
});

export function renderFetch() {
  let html = read('game.html');
  const css = read('style.css'), model = read('model.js'), game = read('game.js');
  if (/<\/(?:script|style)/i.test(model + game + css)) throw new Error('Unsafe inline closing tag');
  for (const [marker, source] of [['STYLE', css], ['MODEL', model], ['GAME', game]]) {
    const slot = `/*__${marker}__*/`;
    if (html.split(slot).length !== 2) throw new Error(`Missing or duplicate ${marker} slot`);
    html = html.replace(slot, () => source);
  }
  for (const [marker, asset] of Object.entries(fetchAssets)) {
    // Fail before writing if a reused asset has disappeared.
    if (!lstatSync(join(root, 'public', asset)).isFile()) throw new Error(`Missing Fetch asset: ${asset}`);
    if (!html.includes(`__${marker}__`)) throw new Error(`Missing Fetch asset slot: ${marker}`);
    html = html.replaceAll(`__${marker}__`, asset);
  }
  if (/__[A-Z_]+__/.test(html)) throw new Error('Unresolved Fetch build marker');
  return html;
}

export function buildFetch() {
  const html = renderFetch();
  const directory = join(root, 'public/play'), output = join(directory, 'fetch.html');
  // Fixed owned output; never follow a symlink or delete unrelated play routes.
  for (let path = directory; path !== parse(path).root; path = dirname(path)) {
    const entry = lstatSync(path, { throwIfNoEntry: false });
    if (!entry && path === directory) continue;
    if (!entry?.isDirectory() || entry.isSymbolicLink()) throw new Error('Unsafe Fetch output directory');
  }
  const entry = lstatSync(output, { throwIfNoEntry: false });
  if (entry && (!entry.isFile() || entry.isSymbolicLink())) throw new Error('Unsafe Fetch output file');
  if (!lstatSync(directory, { throwIfNoEntry: false })) mkdirSync(directory);
  writeFileSync(output, html);
  console.log(`Fetch generated: public/play/fetch.html (${Buffer.byteLength(html)} bytes; shared notebook assets)`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) buildFetch();
