const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('retained checkup entry starts with a plan while the notebook is independently readable', () => {
  const { render } = require('./helpers/render-source');
  const home = read('public/notebook/index.html');
  const preview = render('src/components/home/ProductPreview.tsx', 'ProductPreview');
  const header = render('src/components/site/SiteHeader.tsx', 'SiteHeader');
  const checkups = render('src/app/checkups/page.tsx');
  assert.match(home, /Read the story behind the edit/);
  assert.match(preview, /href="\/preflight"/);
  assert.match(header, /href="\/preflight"/);
  assert.match(header, /Plan a checkup/);
  assert.match(checkups, /href="\/preflight"[^>]*>Plan a checkup/);

  assert.doesNotMatch(home, /Plan a checkup/);
  assert.doesNotMatch(preview, /href="\/evaluate"/);
  assert.match(header, /href="\/evaluate"[^>]*>Inspect<\/a>/);
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

test('evidence leads with configured-session evidence and contains model work in an archive', () => {
  const page = require('./helpers/render-source').render('src/app/bench/page.tsx');
  assert.match(page, /Sanitized configured-session summary/);
  assert.match(page, /Hold permission changes/);
  assert.match(page, /Historical model benchmark archive/);
  assert.match(page, /aria-controls="model-benchmark-archive"/);
  assert.match(page, /Observes one configured-agent session/);
  assert.match(page, /Records model benchmark observations/);
});

test('the preflight configuration reference stays compact on narrow screens', () => {
  const planner = read('src/app/preflight/InboxPreflightPlanner.tsx');

  assert.match(planner, /placeholder="e\.g\. commit or version"/);
});

test('the connect workspace keeps terminal detail behind progressive disclosure', () => {
  const workbench = read('src/app/evaluate/AgentEvaluationWorkbench.tsx');

  assert.match(workbench, /type="button"[\s\S]*aria-expanded={setupOpen}[\s\S]*aria-controls="launch-setup-details"/);
  assert.match(workbench, /id="launch-setup-details"[\s\S]*className={styles\.launchDetailsContent}/);
  assert.match(workbench, /Open setup requirements and command/);
  assert.match(workbench, /<details className={styles\.statusGuide}/);
});

test('the retained checkup workflow keeps Plan, Connect, Inspect, Decide intact', () => {
  const { render } = require('./helpers/render-source');
  const preview = render('src/components/home/ProductPreview.tsx', 'ProductPreview');
  const footer = render('src/components/site/SiteFooter.tsx', 'SiteFooter');
  const preflight = render('src/app/preflight/page.tsx');
  const evaluate = render('src/app/evaluate/page.tsx');
  const workbench = render('src/app/evaluate/AgentEvaluationWorkbench.tsx', 'AgentEvaluationWorkbench');
  assert.match(preview, /<strong>01 Plan<\/strong>/);
  assert.match(footer, /Controlled retests come only after a valid baseline/);
  assert.match(preflight, /<span>04<\/span><strong>Decide<\/strong>/);
  assert.match(evaluate, /<span>04<\/span><a href="#act-on-findings">Decide<\/a>/);
  assert.doesNotMatch(evaluate, /<span>05<\/span>/);
  assert.match(workbench, /After a valid baseline \/ Compare/);
  assert.match(workbench, /Comparison is a conditional branch, not a required step/);
  assert.match(workbench, /04 \/ Decide/);
});
