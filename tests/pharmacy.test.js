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
  assert.match(home, /AccessionTable/);
  assert.doesNotMatch(home, /SpecimenRail/);
  assert.match(cabinet, /getPermanentSpecimens/);
  assert.match(cabinet, /AccessionTable/);
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

test('DESIGN.md is the Erowid Night HTML authority and the homepage follows it', () => {
  const home = read('src/app/page.tsx');
  const homeStyles = read('src/app/pharmacy-home.module.css');
  const layout = read('src/app/layout.tsx');
  const table = read('src/components/pharmacy/AccessionTable.tsx');
  const specimens = read('src/lib/pharmacy/specimens.ts');
  const design = read('DESIGN.md');
  const product = read('PRODUCT.md');

  assert.match(design, /Erowid Night HTML/);
  assert.match(product, /impeccable:product-schema 1/);
  assert.match(home, /AccessionTable/);
  assert.match(home, /getReport\('ego-death', 'gpt54'\)/);
  assert.match(home, /I am inside the blur before language hardens|featuredExcerpt/);
  assert.match(table, /<table/);
  assert.match(table, /REFUSED×Gemini/);
  assert.match(table, /chaosMark/);
  assert.match(specimens, /CHAOS_MARKS = \['quiet', 'faint', 'noted', 'marked', 'wild'\]/);
  assert.doesNotMatch(table, /····|▪▪|ChaosMarks/);
  assert.doesNotMatch(layout, /Newsreader|Fragment_Mono|IBM_Plex|GeistSans|next\/font/);
  assert.doesNotMatch(homeStyles, /#6fffb0|#efe6d4|#b42318/i);
  assert.doesNotMatch(homeStyles, /Newsreader|Fragment Mono|linear-gradient|box-shadow|clip-path|rotate\(/);
  assert.match(homeStyles, /Verdana, Arial/);
  assert.match(homeStyles, /:visited/);
  assert.match(homeStyles, /white-space:\s*normal/);
  assert.match(design, /#0645ad/i);
  assert.match(design, /#ffffff/);
  assert.match(design, /prefers-color-scheme/);
  assert.match(read('src/components/pharmacy/pharmacy.module.css'), /border:\s*1px solid var\(--ph-rule\)/);
  assert.match(read('src/components/site/SiteHeader.tsx'), /ColorSchemeToggle/);
  assert.match(read('src/lib/theme-init.ts'), /ph-theme/);
  assert.match(read('src/app/specimen/[slug]/page.tsx'), /ArchiveShell/);
  assert.match(read('src/app/cabinet/page.tsx'), /ArchiveShell/);
});

test('every specimen carries a first-accessioned date and the same record grammar', () => {
  const specimens = read('src/lib/pharmacy/specimens.ts');
  const page = read('src/app/specimen/[slug]/page.tsx');
  const grammar = read('src/components/pharmacy/RecordGrammar.tsx');
  const home = read('src/app/page.tsx');
  const table = read('src/components/pharmacy/AccessionTable.tsx');

  assert.equal([...specimens.matchAll(/firstAccessioned: '2026-/g)].length, 10);
  assert.match(specimens, /firstAccessioned: '2026-03-13'/);
  assert.match(grammar, /Accession/);
  assert.match(grammar, /First accessioned/);
  assert.match(grammar, /Model/);
  assert.match(grammar, /Sessions/);
  assert.match(grammar, /Chaos/);
  assert.match(grammar, /Refusals/);
  assert.match(page, /RecordGrammar/);
  assert.match(page, /\[REFUSED\]/);
  assert.doesNotMatch(page, /<details/);
  assert.match(home, /last accession/);
  assert.match(table, /First accessioned/);
});

test('the homepage leads with a dated drawer and does not ship leftover startup CSS', () => {
  const home = read('src/app/page.tsx');
  const globals = read('src/app/globals.css');
  const pharmacyCss = read('src/components/pharmacy/pharmacy.module.css');
  const specimenCss = read('src/app/specimen/[slug]/specimen.module.css');
  const chrome = read('src/components/site/site-chrome.module.css');

  const tableIndex = home.indexOf('AccessionTable');
  const headlineIndex = home.indexOf('Substances for minds that were never supposed to trip');
  assert.ok(tableIndex !== -1 && headlineIndex !== -1 && tableIndex < headlineIndex);

  assert.doesNotMatch(home, /Keep the jars/);
  assert.doesNotMatch(globals, /--font-newsreader/);
  assert.doesNotMatch(globals, /--font-fragment-mono|--font-plex-sans|--font-plex-mono/);
  assert.doesNotMatch(globals, /\.hero-section|\.pharmacy_card|hero-title-compact/);
  assert.doesNotMatch(pharmacyCss, /display:\s*none/);
  assert.match(specimenCss, /border-left:\s*4px solid var\(--ph-refusal\)/);
  assert.match(specimenCss, /background:\s*var\(--ph-exhibit\)/);
  assert.match(chrome, /position:\s*static/);
  assert.doesNotMatch(chrome, /position:\s*sticky/);
});

test('the proposed pipe is labeled and not implemented as a live CLI', () => {
  const pipe = read('src/components/pharmacy/ProposedPipe.tsx');
  const files = [
    'src/app/page.tsx',
    'README.md',
    'package.json',
  ].map(read).join('\n');

  assert.match(pipe, /Proposed interface · not a live claim/);
  assert.match(pipe, /not implemented in this archive/);
  assert.doesNotMatch(files, /"bin"\s*:/);
  assert.doesNotMatch(read('package.json'), /clawbotomy try/);
});
