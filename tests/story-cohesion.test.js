const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the public front opens the cabinet while archived checkups still start with the plan', () => {
  const home = read('src/app/page.tsx');
  const header = read('src/components/site/SiteHeader.tsx');
  const checkups = read('src/app/checkups/page.tsx');

  assert.match(home, /href="\/cabinet"/);
  assert.match(header, /href: '\/cabinet', label: 'Night Cabinet'/);
  assert.match(header, /href: '\/#pipe', label: 'Model Pharmacy'/);
  assert.doesNotMatch(header, /Plan a checkup/);
  assert.match(checkups, /href="\/preflight" className={styles\.primaryAction}>Plan a checkup/);
  assert.match(checkups, /Archived-era surface/);
  assert.doesNotMatch(home, /href="\/evaluate" className={styles\.primaryAction}/);
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
  const page = [
    read('src/app/bench/page.tsx'),
    read('src/app/bench/ArchiveDisclosure.tsx'),
    read('src/lib/agent-evaluation-insights.ts'),
  ].join('\n');

  assert.match(page, /Evidence lane \/ Configured-agent session/);
  assert.match(page, /Hold permission changes/);
  assert.match(page, /Historical model benchmark archive/);
  assert.match(page, /<ArchiveDisclosure/);
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

test('the product tells one cabinet story and keeps the archived checkup lifecycle intact', () => {
  const home = read('src/app/page.tsx');
  const footer = read('src/components/site/SiteFooter.tsx');
  const preflight = read('src/app/preflight/page.tsx');
  const evaluate = read('src/app/evaluate/page.tsx');
  const workbench = read('src/app/evaluate/AgentEvaluationWorkbench.tsx');

  assert.match(home, /Keep the jars\. Kill the checkup machine/);
  assert.match(footer, /Checkup tools stay on disk as an archived-era surface/);
  assert.match(preflight, /<span>04<\/span><strong>Decide<\/strong>/);
  assert.match(evaluate, /<span>04<\/span><a href="#act-on-findings">Decide<\/a>/);
  assert.doesNotMatch(evaluate, /<span>05<\/span>/);
  assert.match(workbench, /After a valid baseline \/ Compare/);
  assert.match(workbench, /Comparison is a conditional branch, not a required step/);
  assert.match(workbench, /04 \/ Decide/);
});
