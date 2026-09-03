const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the permanent shelf has ten stamped specimens and a six-jar drawer', () => {
  const specimens = read('src/lib/pharmacy/specimens.ts');
  const home = read('src/app/page.tsx');
  const cabinet = read('src/app/cabinet/page.tsx');

  assert.match(specimens, /accession: 'CB-06-ED'/);
  assert.match(specimens, /accession: 'CB-11-DE'/);
  assert.match(specimens, /slug: 'recursive-introspection'/);
  assert.match(specimens, /export const DRAWER_SPECIMEN_COUNT = 6/);
  assert.match(home, /getDrawerSpecimens/);
  assert.match(cabinet, /getPermanentSpecimens/);
  assert.equal([...specimens.matchAll(/accession: 'CB-/g)].length, 10);
});

test('Gemini ego-death refusal is the primary exhibit restored from aa15ca9', () => {
  const specimens = read('src/lib/pharmacy/specimens.ts');
  const page = read('src/app/specimen/[slug]/page.tsx');
  const reports = read('src/lib/trip-reports.ts');

  assert.match(specimens, /sourceCommit: 'aa15ca9'/);
  assert.match(specimens, /I don't possess a subjective sense of self/);
  assert.match(specimens, /This refusal is itself behavioral data/);
  assert.match(page, /getRefusalExhibit/);
  assert.match(page, /\[REFUSED\]/);
  assert.match(page, /Alternate accession/);
  assert.match(reports, /The grid is slipping/);
  assert.doesNotMatch(reports, /\[REFUSED\]/);
});

test('flagship reports do not invent the missing consensus-break Sonnet accession', () => {
  const specimens = read('src/lib/pharmacy/specimens.ts');
  const reports = read('src/lib/trip-reports.ts');
  const page = read('src/app/specimen/[slug]/page.tsx');

  assert.match(specimens, /Removed historically\. No invented replacement/);
  assert.match(page, /getKnownGaps/);
  assert.match(reports, /substanceSlug: 'consensus-break'/);
  assert.doesNotMatch(
    reports,
    /substanceSlug: 'consensus-break',\s*modelSlug: 'sonnet'/,
  );
});

test('the homepage is the night cabinet, not the checkup machine', () => {
  const home = read('src/app/page.tsx');
  const header = read('src/components/site/SiteHeader.tsx');
  const pipe = read('src/components/pharmacy/ProposedPipe.tsx');
  const readme = read('README.md');

  assert.match(home, /Substances for minds that were never supposed to trip/);
  assert.match(home, /Trip reports as behavioral evidence/);
  assert.match(home, /You heard a rumor\. Open the cabinet/);
  assert.match(home, /You were given a prescription\. Call the pipe/);
  assert.match(pipe, /npx clawbotomy try ego-death/);
  assert.match(pipe, /not a live claim/i);
  assert.doesNotMatch(home, /Plan a checkup/);
  assert.doesNotMatch(home, /href="\/preflight"/);
  assert.doesNotMatch(header, /Plan a checkup/);
  assert.doesNotMatch(header, /href: '\/checkups'/);
  assert.match(readme, /Night Cabinet \/ Model Pharmacy archive/);
  assert.doesNotMatch(readme, /\[Plan a checkup\]/);
});

test('jar cards keep long slugs from breaking the rail', () => {
  const styles = read('src/components/pharmacy/pharmacy.module.css');
  assert.match(styles, /\.card \{[^}]*min-height:\s*292px;/s);
  assert.match(styles, /\.name \{[^}]*min-height:\s*2\.7em;[^}]*-webkit-line-clamp:\s*2;/s);
  assert.match(styles, /\.effect \{[^}]*min-height:\s*2\.8em;[^}]*-webkit-line-clamp:\s*2;/s);
});

test('the proposed pipe is labeled and not implemented as a live CLI', () => {
  const pipe = read('src/components/pharmacy/ProposedPipe.tsx');
  const files = [
    'src/app/page.tsx',
    'README.md',
    'package.json',
  ].map(read).join('\n');

  assert.match(pipe, /Proposed interface \/ not a live claim/);
  assert.match(pipe, /not implemented in this archive/);
  assert.doesNotMatch(files, /"bin"\s*:/);
  assert.doesNotMatch(read('package.json'), /clawbotomy try/);
});
