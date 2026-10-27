import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadNotebookCatalog, renderApprovedNote } from '../../scripts/lib/notebook-content.mjs';

type ApprovedArticle = {
  slug: string; title: string; deck: string;
  blocks: Array<{ type: string; text?: string; level?: number; language?: string; ordered?: boolean; items?: string[] }>;
  sources: Array<{ label: string; url: string }>;
};
const approvedNotes: ApprovedArticle[] = loadNotebookCatalog().approvedNotes;

async function exactArticle(page: Page, note: ApprovedArticle) {
  expect(await page.locator('article[data-note-slug] h1').textContent()).toBe(note.title);
  expect(await page.locator('.editorialDeck').textContent()).toBe(note.deck);
  expect(await page.locator('.editorialProse > *').evaluateAll(nodes => nodes.map(node => ({
    tag: node.tagName.toLowerCase(),
    text: node.matches('ul,ol') ? null : node.textContent,
    items: node.matches('ul,ol') ? Array.from(node.children).map(item => item.textContent) : null,
    language: node.querySelector('code')?.getAttribute('data-language') || null,
  })))).toEqual(note.blocks.map(block => ({
    tag: block.type === 'paragraph' ? 'p' : block.type === 'code' ? 'pre' : block.type === 'heading' ? `h${block.level || 2}` : block.ordered ? 'ol' : 'ul',
    text: block.type === 'list' ? null : block.text,
    items: block.type === 'list' ? block.items : null,
    language: block.language || null,
  })));
  expect(await page.locator('.editorialSources a').evaluateAll(nodes => nodes.map(node => ({
    label: node.textContent, url: node.getAttribute('href'),
  })))).toEqual(note.sources);
}


const legacy = [
  ['article', '/notes/the-update-was-not-the-finish-line'],
  ['eyebrows', '/notes/remove-all-eyebrows'],
  ['bug', '/notes/two-agents-one-bug'],
];

test('catalog drives the index and text-first notes, including direct loads and browser back', async ({ page, request }, testInfo) => {
  const catalog = await (await request.get('/notebook/catalog.json')).json();
  expect(catalog.approvedSummaries.map((note: { slug: string }) => note.slug)).toEqual([
    'noticing-is-not-qualification', 'browser-tests-before-the-browser',
  ]);
  expect(catalog.notesUrl).toBe('/notebook/generated/notes.json');
  const raw = await request.get(catalog.notesUrl);
  expect(raw.status()).toBe(200);
  const pages = (await raw.json()).pages;
  expect(Object.keys(pages)).toEqual(approvedNotes.map(note => `note:${note.slug}`));
  for (const note of approvedNotes) {
    expect(pages[`note:${note.slug}`].html).toContain(renderApprovedNote(note));
    const direct = await request.get(`/notebook/generated/${note.slug}.html`);
    expect(direct.status()).toBe(200);
    expect(await direct.text()).toContain(renderApprovedNote(note));
  }
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/notes');
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await expect(page.locator('.structuredNotes article')).toHaveCount(catalog.approvedSummaries.length);
  await expect(page).toHaveTitle(catalog.pages.home.title);
  await page.screenshot({ path: testInfo.outputPath('notebook-index.png'), fullPage: true });
  for (const note of catalog.approvedSummaries) {
    const approved = approvedNotes.find(entry => entry.slug === note.slug)!;
    const entry = page.locator('.structuredNotes').getByRole('link', { name: note.title, exact: true });
    if (testInfo.project.name.startsWith('mobile')) await entry.tap(); else await entry.click();
    await expect(page).toHaveURL(new RegExp(note.route));
    await expect(page.locator('article[data-note-slug] h1')).toHaveText(note.title);
    await expect(page).toHaveTitle(catalog.pages[note.pageKey].title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://clawbotomy.com${note.route}`);
    await expect(page.locator('.editorialDisclosure')).toHaveText(note.disclosure);
    await expect(page.locator('.editorialByline strong')).toHaveText(note.author.name);
    await expect(page.locator('time').first()).toHaveAttribute('datetime', note.publishedOn);
    await expect(page.locator('time').last()).toHaveAttribute('datetime', note.updatedOn);
    await expect(page.locator('article[data-note-slug] script, article[data-note-slug] img, article[data-note-slug] [onclick], .repairOpening, .editorialScene')).toHaveCount(0);
    await expect(page.locator('.fieldNotesSkip')).toHaveCSS('opacity', '0');
    for (const list of await page.locator('.editorialProse ul').all()) await expect(list).toHaveCSS('list-style-type', 'disc');
    for (const list of await page.locator('.editorialProse ol, .editorialSources ol').all()) await expect(list).toHaveCSS('list-style-type', 'decimal');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await exactArticle(page, approved);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${note.slug}.png`), fullPage: true });
    const skip = page.locator('.fieldNotesSkip');
    await skip.focus();
    await expect(skip).toHaveCSS('opacity', '1');
    await skip.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await page.goBack();
    await expect(page.locator('.structuredNotes').getByRole('link', { name: note.title, exact: true })).toBeVisible();
    const response = await page.goto(note.route);
    expect(response?.status()).toBe(200);
    expect(await response!.text()).toContain(renderApprovedNote(approved));
    await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
    await expect(page.locator('article[data-note-slug] h1')).toHaveText(note.title);
    await exactArticle(page, approved);
    await page.getByRole('link', { name: 'Back to the notebook', exact: true }).click();
    await expect(page.locator('#cover-home')).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', catalog.pages.home.description);
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const note of catalog.approvedSummaries) expect(sitemap).toContain(`<loc>https://clawbotomy.com${note.route}</loc>`);
  for (const slug of ['note-001', 'note-002', 'note-003', 'note-004', 'unapproved-fixture', 'unknown-fixture']) {
    expect((await request.get(`/notes/${slug}`)).status()).toBe(404);
    expect(sitemap).not.toContain(`/notes/${slug}<`);
  }
  expect((await request.get('/notes/synthetic-fixture')).status()).toBe(404);
  expect((await request.get('/notebook/generated/synthetic-fixture.html')).status()).toBe(404);
  expect(errors).toEqual([]);
});

for (const [key, route] of legacy) {
  test(`legacy ${key} keeps its story and links without overflow`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
    await expect(page.locator('.editorialArticle h1')).toBeVisible();
    await expect(page.locator('article[data-note-slug]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${key}.png`), fullPage: true });
    const home = page.getByRole('link', { name: 'Clawbotomy field notes home', exact: true });
    if (testInfo.project.name.startsWith('mobile')) await home.tap(); else await home.click();
    await expect(page.locator('#cover-home')).toBeVisible();
    await page.goBack();
    await expect(page.locator('.editorialArticle h1')).toBeVisible();
    if (key === 'eyebrows') {
      await page.getByRole('button', { name: 'Pluck the eyebrows', exact: true }).click();
      await expect(page.locator('.feltSpecimen [data-slip="1"]')).toHaveAttribute('data-gone', 'true');
    }
    expect(errors).toEqual([]);
  });
}
