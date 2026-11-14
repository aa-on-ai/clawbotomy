import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync('public/notebook/snapshot.json', 'utf8'));
const article = '/notes/two-agents-one-bug';
test.beforeEach(async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 390, height: 844 });
});
// Fixed visible-control regression fixtures, never shipped or injected into the game.
const solutions = [
  [[11, 1], [12, 2], [7, 3], [9, 1]],
  [[11, 1], [12, 3], [7, 3], [13, 1], [8, 1], [6, 1]],
  [[10, 3], [15, 1], [0, 1], [11, 3], [17, 2], [13, 1], [9, 3], [19, 2], [23, 1]],
];
const activate = (control: Locator, mobile: boolean) => mobile ? control.tap() : control.click();
async function ready(page: Page) {
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
}
async function intactArticle(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  const original = await page.evaluate(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('.editorialProse > p')).map(node => node.textContent);
  }, snapshot.pages.bug.html);
  expect(await page.locator('.editorialProse > p').allTextContents()).toEqual(original);
  await expect(page.locator('.repairLimit')).toHaveText('Clawc’s account, not an independently verified repair.');
  await expect(page.locator('.editorialScene img')).toBeVisible();
  await expect(page.locator('.receiptComparisonColumns')).toHaveCount(1);
  await expect(page.locator('.receiptProvenance')).toContainText('not a replay or verified receipt');
  await expect(page.getByRole('link', { name: 'Play Fetch', exact: true })).toHaveCount(1);
}
async function solve(page: Page, level: number, mobile: boolean, keyboard = false) {
  for (const [cell, turns] of solutions[level]) {
    const tile = page.locator(`.tile[data-cell="${cell}"]`);
    for (let turn = 0; turn < turns; turn++) {
      if (keyboard) { await tile.focus(); await tile.press('Enter'); }
      else await activate(tile, mobile);
    }
  }
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('iframe')).toHaveCount(0);
}

test('home and article discover Fetch in the same tab, preserving the notebook', async ({ page, context, request }, info) => {
  const mobile = info.project.name.startsWith('mobile');
  const pagesBefore = context.pages().length;
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  const card = page.locator('#selection-two-agents-one-bug');
  await expect(card.locator('.feltReceipt')).toHaveCount(2);
  const play = card.getByRole('link', { name: 'Play Fetch', exact: true });
  await expect(play).toHaveAttribute('href', '/play/fetch');
  await play.scrollIntoViewIfNeeded();
  expect(await play.evaluate(link => {
    const box = link.getBoundingClientRect();
    return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true); // catches the card's stretched story link stealing the click
  await page.screenshot({ path: info.outputPath('fetch-home-discovery.png') });
  await activate(play, mobile);
  await expect(page).toHaveURL(/\/play\/fetch$/);
  await ready(page);
  expect(context.pages().length).toBe(pagesBefore);
  await page.getByRole('link', { name: 'Back to the notebook', exact: true }).click();
  await expect(card).toBeVisible();
  await activate(card.locator('.feltEntryLink'), mobile);
  await expect(page).toHaveURL(/\/notes\/two-agents-one-bug/);
  await intactArticle(page);
  await page.screenshot({ path: info.outputPath('fetch-article-discovery.png') });
  await activate(page.getByRole('link', { name: 'Play Fetch', exact: true }), mobile);
  await ready(page);
  await page.locator('#notebook-source > summary').click();
  await page.locator('.source-link').click();
  await expect(page).toHaveURL(/\/notes\/two-agents-one-bug/);
  await intactArticle(page);
  await page.reload();
  await intactArticle(page);
  await noOverflow(page);
  expect(context.pages().length).toBe(pagesBefore);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://clawbotomy.com/play/fetch</loc>');
  expect((await request.get('/play/unknown-fetch')).status()).toBe(404);
});

test('real controls deliver partial failure, all three successes, and replay', async ({ page }, info) => {
  test.setTimeout(150_000);
  const mobile = info.project.name.startsWith('mobile');
  const errors: string[] = [], broken: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) broken.push(response.url()); });
  await page.goto('/play/fetch');
  await ready(page);
  if (mobile) expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
  await noOverflow(page);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://clawbotomy.com/play/fetch');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: info.outputPath('fetch-initial.png'), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await activate(page.locator('#send'), mobile);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'failure', { timeout: 20_000 });
  await expect(page.locator('#copy-count')).toHaveText('1 of 2 copies');
  await expect(page.locator('#copy-1')).toHaveClass(/filled/);
  await expect(page.locator('#copy-2')).not.toHaveClass(/filled/);
  await expect(page.locator('#snag')).toBeVisible();
  await expect(page.locator('.original-label')).toHaveText(['Original', 'Original']);
  await page.locator('#world').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('fetch-partial-failure.png') });
  await activate(page.locator('#restart'), mobile);
  for (let level = 0; level < 3; level++) {
    await expect(page.locator('#game')).toHaveAttribute('data-level', String(level + 1));
    await solve(page, level, mobile, !mobile && level === 1);
    await activate(page.locator('#send'), mobile);
    await expect(page.locator('#game')).toHaveAttribute('data-phase', 'success', { timeout: 30_000 });
    await expect(page.locator('#copy-count')).toHaveText('2 of 2 copies');
    await expect(page.locator('.original-label')).toHaveText(['Original', 'Original']);
    await expect(page.locator('.half.filled')).toHaveCount(2);
    await page.locator('#world').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`fetch-chapter-${level + 1}-success.png`) });
    if (level < 2) await activate(page.locator('#next'), mobile);
  }
  await expect(page.locator('#ending')).toBeVisible();
  await expect(page.locator('#next')).toHaveText('Play again');
  await page.locator('#ending a').click();
  await expect(page.locator('#notebook-source')).toHaveAttribute('open', '');
  await expect(page.locator('.source-content')).toContainText('reported by Clawc, not independently verified here');
  await page.screenshot({ path: info.outputPath('fetch-ending-source.png'), fullPage: true });
  await activate(page.locator('#next'), mobile);
  await expect(page.locator('#game')).toHaveAttribute('data-level', '1');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
  await expect(page.locator('#ending')).toBeHidden();
  await expect(page.locator('#copy-count')).toHaveText('0 of 2 copies');
  await noOverflow(page);
  expect(errors).toEqual([]);
  expect(broken).toEqual([]);
});

test('keyboard, undo, restart and reduced motion retain real gameplay', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/play/fetch');
  await ready(page);
  const first = page.locator('.tile').first();
  await first.focus();
  await first.press('ArrowDown');
  await expect(page.locator('.tile[data-cell="10"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  const label = await first.getAttribute('aria-label');
  const before = await first.locator('.track').evaluate(node => getComputedStyle(node).transform);
  await first.press('Space');
  await expect(first).not.toHaveAttribute('aria-label', label!);
  expect(await first.locator('.track').evaluate(node => getComputedStyle(node).transform)).not.toBe(before);
  await expect(first.locator('.track')).toHaveCSS('transition-duration', '0s');
  await page.locator('#undo').click();
  await expect(first).toHaveAttribute('aria-label', label!);
  await solve(page, 0, false, true);
  await page.locator('#send').press('Enter');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'success', { timeout: 20_000 });
  await expect(page.locator('#copy-count')).toHaveText('2 of 2 copies');
  await page.locator('#restart').click();
  await page.locator('#send').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'running');
  await page.locator('#restart').click();
  await page.waitForTimeout(1300); // exceed the longest pending event; detect stale timer delivery
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
  await expect(page.locator('#copy-count')).toHaveText('0 of 2 copies');
  await expect(page.locator('#send')).toBeEnabled();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: info.outputPath('fetch-reduced-motion.png') });
});

test('navigation cancels pending delivery and back restores an operable game', async ({ page }, info) => {
  await page.goto('/play/fetch');
  await ready(page);
  await page.locator('#send').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'running');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.waitForTimeout(1300);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
  await expect(page.locator('#copy-count')).toHaveText('0 of 2 copies');
  await page.evaluate(() => { (window as unknown as { fetchRealm: string }).fetchRealm = 'survived'; });
  await page.locator('#send').click();
  await page.getByRole('link', { name: 'Back to the notebook', exact: true }).click();
  await expect(page.locator('#cover-home')).toBeVisible();
  await page.goBack();
  await ready(page);
  const retainedRealm = await page.evaluate(() => (window as unknown as { fetchRealm?: string }).fetchRealm === 'survived');
  await info.attach('back-lifecycle.json', { body: JSON.stringify({ retainedRealm, classification: retainedRealm ? 'same-realm restoration' : 'document reload' }), contentType: 'application/json' });
  await page.locator('.tile').first().click();
  await expect(page.locator('#undo')).toBeEnabled();
  await page.locator('#send').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'running');
  await page.locator('#restart').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
});
