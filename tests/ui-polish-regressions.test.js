const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('external source CTA renders exactly one diagonal arrow', () => {
  const page = read('src/app/checkups/page.tsx');

  assert.match(page, />\s*View source\s*<\/a>/);
  assert.doesNotMatch(page, /View source ↗/);
});

test('dark next-step cards keep orange as a restrained signal', () => {
  const styles = read('src/app/home.module.css');
  const hover = styles.match(/\.nextLinks > a:hover \{[^}]*\}/s)?.[0] || '';

  assert.doesNotMatch(hover, /background: var\(--cb-signal\)/);
  assert.match(hover, /background: color-mix\([^;]*var\(--cb-signal\)[^;]*var\(--cb-ink-raised\)/);
  assert.match(hover, /border-color:/);
  assert.match(styles, /\.nextLinks strong span \{[^}]*transition:[^}]*transform/s);
  assert.match(styles, /\.nextLinks > a:hover strong span \{[^}]*translateX/s);
});

test('capability selection uses stable row geometry and a positioned select chevron', () => {
  const planner = read('src/app/preflight/InboxPreflightPlanner.tsx');
  const styles = read('src/app/preflight/preflight.module.css');

  assert.match(planner, /className={styles\.selectControl}/);
  assert.match(planner, /className={styles\.selectChevron}/);
  assert.match(styles, /\.intentField select \{[^}]*appearance: none;/s);
  assert.match(styles, /\.selectChevron \{[^}]*position: absolute;[^}]*top: 50%;/s);

  const row = styles.match(/\.capabilityRow \{[^}]*\}/s)?.[0] || '';
  const selected = styles.match(/\.selectedRow \{[^}]*\}/s)?.[0] || '';
  assert.match(row, /margin-inline: -14px;/);
  assert.match(row, /padding: 18px 14px;/);
  assert.doesNotMatch(selected, /margin-inline|padding-inline/);
});

test('plan output sections share one horizontal gutter', () => {
  const styles = read('src/app/preflight/preflight.module.css');

  assert.match(styles, /\.outputPanel \{[^}]*--cb-panel-inline:/s);
  assert.match(styles, /\.panelHeaderDark \{[^}]*var\(--cb-panel-inline\)/s);
  assert.match(styles, /\.outputStatus \{[^}]*var\(--cb-panel-inline\)/s);
  assert.match(styles, /\.planFacts > div \{[^}]*var\(--cb-panel-inline\)/s);
  assert.match(styles, /\.intentSummary,[\s\S]*var\(--cb-panel-inline\)/);
});

test('copy plan button confirms the completed clipboard action', () => {
  const planner = read('src/app/preflight/InboxPreflightPlanner.tsx');

  assert.match(planner, /actionStatus === 'copied'\s*\? 'Copied'/s);
});

test('setup disclosure animates both open and closed states with accessible controls', () => {
  const workbench = read('src/app/evaluate/AgentEvaluationWorkbench.tsx');
  const styles = read('src/app/evaluate/evaluate.module.css');

  assert.match(workbench, /aria-expanded={setupOpen}/);
  assert.match(workbench, /className={styles\.launchDetailsContent}/);
  assert.match(workbench, /className={styles\.launchDetailsInner}/);
  assert.match(styles, /\.launchDetailsContent \{[^}]*grid-template-rows: 0fr;[^}]*transition:[^}]*grid-template-rows[^}]*ease-in-out/s);
  assert.match(styles, /\.launchDetailsOpen \.launchDetailsContent \{[^}]*grid-template-rows: 1fr;/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.launchDetailsContent/);
});
