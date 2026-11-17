import { expect, test, type Page, type TestInfo, type Request } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadNotebookCatalog, renderApprovedNote } from '../../scripts/lib/notebook-content.mjs';

const slug = 'the-skill-didnt-shrink';
const route = `/notes/${slug}`;
const note = loadNotebookCatalog().approvedNotes.find((entry: { slug: string }) => entry.slug === slug)!;
const figureSelector = 'article[data-note-slug] .documentMap';
const privateMarkers = /\/Users\/|\.hermes\/|source-inputs\/|approvalTranscript|contentDigest|sha256:|Unapproved draft|noindex/i;

async function ready(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await expect(page.locator(`${figureSelector} .documentMapToggle`)).toBeVisible();
}
async function spreadReset(page: Page, testInfo: TestInfo, label: string) {
  const figure = page.locator(figureSelector);
  const button = figure.getByRole('button', { name: 'Spread the references', exact: true });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(figure).toHaveAttribute('data-spread', 'false');
  const text = await figure.textContent();
  const cards = figure.locator('.documentMapReference');
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveCSS('transform', 'none');
  await figure.screenshot({ path: testInfo.outputPath(`${label}-rest.png`) });
  if (testInfo.project.name.startsWith('mobile')) await button.tap();
  else { await button.focus(); await button.press('Space'); }
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(figure).toHaveAttribute('data-spread', 'true');
  await expect(cards.first()).not.toHaveCSS('transform', 'none');
  // Capture settled result, not an intermediate CSS reversal frame.
  await page.waitForTimeout(500);
  await figure.screenshot({ path: testInfo.outputPath(`${label}-spread.png`) });
  expect(await figure.textContent()).toBe(text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name.startsWith('mobile')) await button.tap(); else await button.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(cards.first()).toHaveCSS('transform', 'none');
  await figure.screenshot({ path: testInfo.outputPath(`${label}-reset.png`) });
  expect(await figure.textContent()).toBe(text);
}

test('published document-map uses exact static bytes, metadata and discovery without private records', async ({ page, request }, testInfo) => {
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(renderApprovedNote(note));
  expect(html).not.toMatch(privateMarkers);
  // The release runner pins a verified Preview origin; production stays indexable.
  const previewOrigin = process.env.CLAWBOTOMY_PREVIEW_ORIGIN;
  if (previewOrigin) {
    expect(new URL(response.url()).origin).toBe(previewOrigin);
    expect(new URL(previewOrigin).hostname).toMatch(/\.vercel\.app$/);
    expect(response.headers()['x-robots-tag']).toBe('noindex');
  } else {
    expect(response.headers()['x-robots-tag'] || '').not.toMatch(/noindex/i);
  }
  const expected = readFileSync(`public/notebook/generated/${slug}.html`);
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(expected).digest('hex'));
  const catalog = await (await request.get('/notebook/catalog.json')).json();
  expect(catalog.approvedSummaries.find((entry: { slug: string }) => entry.slug === slug)).toMatchObject({
    route, title: note.title, deck: note.deck, author: note.author, disclosure: note.disclosure,
    publishedOn: '2026-11-16', updatedOn: '2026-11-16',
  });
  expect(JSON.stringify(catalog)).not.toMatch(privateMarkers);
  const payload = await (await request.get(catalog.notesUrl)).text();
  expect(payload).not.toMatch(privateMarkers);
  expect(JSON.parse(payload).pages[`note:${slug}`].html).toContain(renderApprovedNote(note));
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(match => match[1]).filter(entry => entry.includes(`<loc>https://clawbotomy.com${route}</loc>`));
  expect(sitemapEntries).toHaveLength(1);
  expect(sitemapEntries[0]).toContain('<lastmod>2026-11-16T00:00:00.000Z</lastmod>');
  await page.goto(route);
  await ready(page);
  await expect(page).toHaveTitle(`${note.title} | Clawbotomy field notes`);
  await expect(page.locator('article[data-note-slug]')).toHaveAttribute('data-editorial-status', 'approved');
  await expect(page.locator('.editorialStatus')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://clawbotomy.com${route}`);
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) await expect(page.locator(selector)).toHaveAttribute('content', note.deck);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.screenshot({ path: testInfo.outputPath('published-full.png'), fullPage: true });
});

test('published gesture works on direct load, cover navigation and back remount without new requests', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(route);
  await ready(page);
  let requests: string[] = [];
  const collect = (request: Request) => requests.push(`${request.method()} ${request.url()}`);
  page.on('request', collect);
  await spreadReset(page, testInfo, 'direct');
  expect(requests).toEqual([]);
  page.off('request', collect);
  await page.getByRole('link', { name: 'Back to the notebook', exact: true }).click();
  await expect(page.locator('#cover-home')).toBeVisible();
  await page.locator('.structuredNotes').getByRole('link', { name: note.title, exact: true }).click();
  await ready(page);
  await spreadReset(page, testInfo, 'cover');
  await page.getByRole('link', { name: 'Back to the notebook', exact: true }).click();
  await expect(page.locator('#cover-home')).toBeVisible();
  await page.goBack();
  await ready(page);
  await spreadReset(page, testInfo, 'back');
  expect(errors).toEqual([]);
});

test('reduced motion keeps the optional spread and reset with no transition', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await ready(page);
  for (const card of await page.locator(`${figureSelector} .documentMapReference`).all()) await expect(card).toHaveCSS('transition-duration', '0s');
  await spreadReset(page, testInfo, 'reduced');
});

test('no JavaScript keeps the complete argument and static figure without a dead control', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto(new URL(route, testInfo.project.use.baseURL).href))?.status()).toBe(200);
    await expect(page.locator('article[data-note-slug] h1')).toHaveText(note.title);
    await expect(page.locator('.editorialDeck')).toHaveText(note.deck);
    expect(await page.locator('.editorialProse > p').allTextContents()).toEqual(note.blocks.filter((block: { type: string }) => block.type === 'paragraph').map((block: { text: string }) => block.text));
    await expect(page.locator(`${figureSelector} .documentMapToggle`)).toBeHidden();
    await expect(page.locator(`${figureSelector} .documentMapHint`)).toBeHidden();
    await expect(page.locator(`${figureSelector} .documentMapReference`)).toHaveCount(4);
    await expect(page.locator(`${figureSelector} figcaption`)).toHaveText(note.blocks.find((block: { type: string }) => block.type === 'document-map').caption);
    await expect(page.locator(`${figureSelector} .documentMapReference`).first()).toHaveCSS('transform', 'none');
    expect(await page.locator('article').textContent()).not.toMatch(privateMarkers);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('published-nojs.png'), fullPage: true });
  } finally { await context.close(); }
});
