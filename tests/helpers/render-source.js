// Execute TS/TSX with the installed compiler, without a build or a server.
// Next routing/image delivery are boundary doubles; browser specs cover their real behavior.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../..');
function load(relative, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id === 'server-only') return {};
    if (id === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children);
    if (id === 'next/image') return ({ priority, unoptimized, fill, ...props }) => React.createElement('img', props);
    if (id === 'next/navigation') return { usePathname: () => '/', notFound() { throw new Error('NEXT_NOT_FOUND'); } };
    if (id.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      const resolved = [base, `${base}.tsx`, `${base}.ts`, `${base}.js`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved, cache);
    }
    return originalRequire(id);
  };
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
  }});
  mod._compile(result.outputText, filename);
  return mod.exports;
}
function render(relative, name = 'default', props = {}) {
  return renderToStaticMarkup(React.createElement(load(relative)[name], props));
}
module.exports = { load, render };
