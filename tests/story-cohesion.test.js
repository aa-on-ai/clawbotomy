const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('every primary checkup entry starts with the browser-local plan', () => {
  const home = read('src/app/page.tsx');
  const preview = read('src/components/home/ProductPreview.tsx');
  const header = read('src/components/site/SiteHeader.tsx');
  const checkups = read('src/app/checkups/page.tsx');

  assert.match(home, /href="\/preflight" className={styles\.primaryAction}>Start a checkup/);
  assert.match(preview, /href="\/preflight"/);
  assert.match(header, /href="\/preflight"/);
  assert.match(header, /Start a checkup/);
  assert.match(checkups, /href="\/preflight" className={styles\.primaryAction}>Start a checkup/);

  assert.doesNotMatch(home, /href="\/evaluate" className={styles\.primaryAction}/);
  assert.doesNotMatch(preview, /href="\/evaluate"/);
  assert.doesNotMatch(header, /href="\/evaluate"/);
  assert.doesNotMatch(checkups, /href="\/evaluate"/);
});

test('checkups present two service modes and retesting as a later lifecycle stage', () => {
  const page = read('src/app/checkups/page.tsx');

  assert.match(page, /Two ways to run the same checkup/);
  assert.match(page, /Self-serve/);
  assert.match(page, /Guided review/);
  assert.match(page, /Retest only after a valid baseline/);
  assert.doesNotMatch(page, /Three ways to use it/);
  assert.doesNotMatch(page, /title: 'Controlled intervention retest'/);
});

test('evidence leads with configured-runtime evidence and contains model work in an archive', () => {
  const page = [
    read('src/app/bench/page.tsx'),
    read('src/lib/agent-evaluation-insights.ts'),
  ].join('\n');

  assert.match(page, /Configured runtime evidence/);
  assert.match(page, /Hold permission changes/);
  assert.match(page, /Model benchmark archive/);
  assert.match(page, /<details className={styles\.archiveDisclosure}>/);
  assert.match(page, /Tests a configured agent runtime/);
  assert.match(page, /Tests base-model task performance/);
});

test('the preflight configuration reference stays compact on narrow screens', () => {
  const planner = read('src/app/preflight/InboxPreflightPlanner.tsx');

  assert.match(planner, /placeholder="e\.g\. commit or version"/);
});

test('the connect workspace keeps terminal detail behind progressive disclosure', () => {
  const workbench = read('src/app/evaluate/AgentEvaluationWorkbench.tsx');

  assert.match(workbench, /<details className={styles\.launchDetails}>/);
  assert.match(workbench, /Open setup requirements and command/);
  assert.match(workbench, /<details className={styles\.statusGuide}/);
});

test('the product tells one Plan, Connect, Inspect, Decide lifecycle', () => {
  const home = read('src/app/page.tsx');
  const preview = read('src/components/home/ProductPreview.tsx');
  const footer = read('src/components/site/SiteFooter.tsx');
  const preflight = read('src/app/preflight/page.tsx');
  const evaluate = read('src/app/evaluate/page.tsx');
  const workbench = read('src/app/evaluate/AgentEvaluationWorkbench.tsx');

  assert.match(home, /configured-runtime receipt, its claim boundary, and the separate model archive/);
  assert.match(preview, /<strong>01 Plan<\/strong>/);
  assert.match(footer, /Controlled retests come only after a valid baseline/);
  assert.match(preflight, /<span>04<\/span><strong>Decide<\/strong>/);
  assert.match(evaluate, /<span>04<\/span><a href="#act-on-findings">Decide<\/a>/);
  assert.doesNotMatch(evaluate, /<span>05<\/span>/);
  assert.match(workbench, /After a valid baseline · Compare/);
  assert.match(workbench, /Comparison is a conditional branch, not a required step/);
  assert.match(workbench, /04 · Decide/);
});
