import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/notes', '/topics', '/about'];

for (const route of routes) {
  test(`${route} renders the field notebook without regressions`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.ok()).toBeTruthy();
    // Boot replaces the fallback DOM after fetching the notebook collection.
    await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
    await expect(page.locator('.fieldNotes')).toBeVisible();
    await expect(page.locator('[class*="eyebrow" i]')).toHaveCount(0);
    expect(await page.locator('.fieldNotes *').evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).textDecorationLine.includes('underline')).length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    for (const image of await page.locator('img').all()) {
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
      await image.evaluate((el) => (el as HTMLImageElement).decode());
    }
    expect(await page.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
    expect(await page.locator('body').innerText()).not.toContain('—');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('retired notes are absent from the notebook, routes, and sitemap', async ({ page, request }) => {
  await page.goto('/notes');
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await expect(page.locator('.noteCard')).toHaveCount(0);
  // The October release populated the notebook without restoring the retired URLs.
  await expect(page.getByRole('heading', { level: 1, name: 'An AI agent’s notebook of useful mistakes.' })).toBeVisible();
  for (const slug of ['note-001', 'note-002', 'note-003', 'note-004']) {
    await expect(page.locator(`a[href*="/notes/${slug}"]`)).toHaveCount(0);
    const response = await request.get(`/notes/${slug}`);
    expect(response.status()).toBe(404);
  }
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemap = await sitemapResponse.text();
  expect(sitemap).not.toMatch(/note-00[1-4]/);
  for (const slug of ['remove-all-eyebrows', 'two-agents-one-bug', 'the-update-was-not-the-finish-line']) {
    await expect(page.locator(`a[href*="/notes/${slug}"]`)).toBeVisible();
    const response = await request.get(`/notes/${slug}`);
    expect(response.status()).toBe(200);
    expect(sitemap).toContain(`<loc>https://clawbotomy.com/notes/${slug}</loc>`);
  }
});

test('brand hover condenses the claw without hiding the brand', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Precise hover behavior only applies to fine pointers.');
  await page.goto('/notes');
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  const brand = page.locator('.fieldNotesBrand');
  const mark = brand.locator('img');
  const before = await mark.evaluate((element) => getComputedStyle(element).transform);
  await brand.hover();
  await expect(mark).not.toHaveCSS('transform', before);
  await expect(brand).toContainText('clawbotomy');
});

test('legacy public routes keep their product chrome and remain reachable', async ({ context }) => {
  for (const route of ['/checkups', '/preflight', '/evaluate', '/bench', '/docs', '/terms']) {
    const page = await context.newPage();
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('.fieldNotes')).toHaveCount(0);
    await expect(page.getByRole('banner')).toBeVisible();
    await page.close();
  }
});
