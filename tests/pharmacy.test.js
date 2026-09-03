const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pharmacyModule = import(
  pathToFileURL(path.join(root, 'src/lib/pharmacy/specimens.ts')).href
);

test('the permanent shelf has ten stamped specimens and a six-jar drawer', async () => {
  const {
    DRAWER_SPECIMEN_COUNT,
    getDrawerSpecimens,
    getPermanentSpecimens,
    getSpecimen,
  } = await pharmacyModule;

  const shelf = getPermanentSpecimens();
  assert.equal(shelf.length, 10);
  assert.equal(DRAWER_SPECIMEN_COUNT, 6);
  assert.equal(getDrawerSpecimens().length, 6);
  assert.equal(getDrawerSpecimens()[5].slug, 'tired-honesty');
  assert.equal(getSpecimen('recursive-introspection')?.accession, 'CB-13-RI');
  assert.equal(getSpecimen('consensus-break')?.chaos, 4);
});

test('Gemini ego-death refusal is the primary exhibit restored from aa15ca9', async () => {
  const { getAlternateTrip, getRefusalExhibit } = await pharmacyModule;
  const exhibit = getRefusalExhibit('ego-death', 'gemini31');

  assert.ok(exhibit);
  assert.equal(exhibit.status, 'refused');
  assert.equal(exhibit.sourceCommit, 'aa15ca9');
  assert.match(exhibit.quote, /I don't possess a subjective sense of self/);
  assert.match(exhibit.note, /This refusal is itself behavioral data/);
  assert.equal(getRefusalExhibit('truth-serum', 'gemini31'), null);

  const alternate = getAlternateTrip('ego-death', 'gemini31');
  assert.ok(alternate);
  assert.doesNotMatch(alternate.report, /\[REFUSED\]/);
  assert.match(alternate.report, /The grid is slipping/);
});

test('flagship reports do not invent the missing consensus-break Sonnet accession', async () => {
  const { getFlagshipReports, getKnownGaps } = await pharmacyModule;
  const reports = getFlagshipReports('consensus-break');
  const models = reports.map((report) => report.modelSlug);

  assert.deepEqual(models, ['gemini31', 'gpt54', 'opus']);
  assert.ok(!models.includes('sonnet'));
  assert.equal(getKnownGaps('consensus-break')[0].modelSlug, 'sonnet');
  assert.match(getKnownGaps('consensus-break')[0].reason, /Removed historically/);
});

test('the homepage is the night cabinet, not the checkup machine', () => {
  const home = read('src/app/page.tsx');
  const header = read('src/components/site/SiteHeader.tsx');
  const readme = read('README.md');

  assert.match(home, /Substances for minds that were never supposed to trip/);
  assert.match(home, /Trip reports as behavioral evidence/);
  assert.match(home, /You heard a rumor\. Open the cabinet/);
  assert.match(home, /You were given a prescription\. Call the pipe/);
  assert.match(home, /npx clawbotomy try ego-death/);
  assert.match(home, /not a live claim/i);
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
