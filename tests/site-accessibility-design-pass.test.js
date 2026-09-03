const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

test('the site has no visual bullet-list treatment', () => {
  const source = sourceFiles(path.join(root, 'src'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const globals = read('src/app/globals.css');

  assert.match(globals, /:where\(ul, ol\)[\s\S]*list-style:\s*none/);
  assert.doesNotMatch(source, /\blist-disc\b/);
  assert.doesNotMatch(source, /list-style:\s*(?:disc|circle|square)/);
  assert.doesNotMatch(source, /content:\s*['"][•◦▪]['"]/);
  assert.doesNotMatch(source, /[•◦▪]/);
});

test('signal-filled controls use the accessible deep signal treatment', () => {
  const globals = read('src/app/globals.css');
  const chrome = read('src/components/site/site-chrome.module.css');
  const home = read('src/app/home.module.css');

  assert.match(globals, /--cb-signal-strong:\s*#b23a2b/);
  assert.match(globals, /--cb-on-signal:\s*var\(--cb-bone\)/);
  assert.match(chrome, /\.navigation \.navAction[\s\S]*color:\s*var\(--cb-on-signal\)[\s\S]*background:\s*var\(--cb-signal-strong\)/);
  assert.match(home, /\.previewAction[\s\S]*color:\s*var\(--cb-on-signal\)[\s\S]*background:\s*var\(--cb-signal-strong\)/);
});

test('the historical benchmark archive exposes visible state and eased disclosure', () => {
  const page = read('src/app/bench/page.tsx');
  const disclosure = read('src/app/bench/ArchiveDisclosure.tsx');
  const styles = read('src/app/bench/bench.module.css');

  assert.match(page, /<ArchiveDisclosure/);
  assert.match(disclosure, /Historical model benchmark archive/);
  assert.match(disclosure, /aria-expanded={open}/);
  assert.match(disclosure, /aria-controls="model-benchmark-archive"/);
  assert.match(disclosure, /open \? 'Close archive' : 'Open archive'/);
  assert.match(styles, /\.archiveContent[\s\S]*grid-template-rows:\s*0fr[\s\S]*transition:\s*grid-template-rows var\(--cb-motion-base\) ease-in-out/);
  assert.match(styles, /\.archiveDisclosureOpen \.archiveContent[\s\S]*grid-template-rows:\s*1fr/);
});

test('long run reports collapse cases into eased, reviewable summaries', () => {
  const page = read('src/app/bench/runs/[runId]/page.tsx');
  const disclosure = read('src/app/bench/runs/[runId]/EvidenceCaseDisclosure.tsx');
  const styles = read('src/app/bench/runs/[runId]/run.module.css');

  assert.match(page, /<EvidenceCaseDisclosure/);
  assert.match(page, /Review a case, then open its repeats only when needed/);
  assert.match(disclosure, /aria-expanded={open}/);
  assert.match(disclosure, /open \? 'Hide case evidence' : 'Review case evidence'/);
  assert.match(styles, /\.caseDisclosureContent[\s\S]*grid-template-rows:\s*0fr/);
  assert.match(styles, /\.caseDisclosureOpen \.caseDisclosureContent[\s\S]*grid-template-rows:\s*1fr/);
});

test('method and evidence pages use structured rows without decorative text collisions', () => {
  const about = read('src/app/about/page.tsx');
  const bench = read('src/app/bench/page.tsx');
  const benchStyles = read('src/app/bench/bench.module.css');
  const runStyles = read('src/app/bench/runs/[runId]/run.module.css');

  assert.match(about, /className={styles\.methodRows}/);
  assert.match(about, /Freeze the plan/);
  assert.match(about, /Observe the run/);
  assert.match(about, /Keep the decision human/);
  assert.doesNotMatch(about, /list-disc/);
  assert.match(bench, /className={styles\.claimBoundary}/);
  assert.doesNotMatch(benchStyles, /linear-gradient\(90deg, transparent 0 74%/);
  assert.doesNotMatch(runStyles, /linear-gradient\(90deg, transparent 0 74%/);
});

test('the reviewed contrast defects keep text on accessible surface treatments', () => {
  const checkups = read('src/app/checkups/checkups.module.css');
  const preflight = read('src/app/preflight/preflight.module.css');
  const bench = read('src/app/bench/bench.module.css');
  const run = read('src/app/bench/runs/[runId]/run.module.css');
  const result = read('src/components/home/ResultBreakdown.tsx');

  assert.match(checkups, /\.finalCta \.secondaryAction[\s\S]*color:\s*var\(--cb-bone\)/);
  assert.match(preflight, /\.panelHeader > span[\s\S]*color:\s*var\(--cb-signal-strong\)/);
  assert.match(bench, /\.tableRegion td small[\s\S]*var\(--cb-ink\) 72%/);
  assert.match(run, /\.decisionCards \.limitCard span[\s\S]*color:\s*var\(--cb-bone\)/);
  assert.match(result, /className={styles\.resultBar} role="img" aria-label=/);
});

test('long evidence labels wrap without widening the mobile viewport', () => {
  const evaluate = read('src/app/evaluate/evaluate.module.css');

  assert.match(evaluate, /\.caseStudy header strong[\s\S]*max-width:\s*100%[\s\S]*white-space:\s*normal/);
});

test('visual callouts do not create nested complementary landmarks', () => {
  const source = sourceFiles(path.join(root, 'src'))
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /<\/?aside\b/);
});
