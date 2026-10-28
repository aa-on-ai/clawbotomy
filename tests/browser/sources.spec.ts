import { expect, test } from '@playwright/test';

test('published design references have no review ribbon and keep working navigation', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/sources.html');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Borrow the principle.' })).toBeVisible();
  await expect(page.locator('.reviewRibbon')).toHaveCount(0);
  await expect(page.getByText(/Review preview|Not published/i)).toHaveCount(0);
  const references = page.locator('main a[href^="https://"]');
  await expect(references).toHaveCount(5);
  expect(await references.evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
    'https://ncase.me/trust/',
    'https://ciechanow.ski/mechanical-watch/',
    'https://blog.panic.com/',
    'https://craigmod.com/essays/fast_software/',
    'https://pudding.cool/process/how-to-make-dope-shit-part-1/',
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('published-sources.png'), fullPage: true });
  const sourcesUrl = new URL(page.url());
  await page.getByRole('link', { name: 'Back to the notebook' }).first().click();
  await expect(page).toHaveURL(url => url.origin === sourcesUrl.origin && url.pathname === '/');
  await expect(page.locator('.fieldNotesHeader')).toBeVisible();
  expect(errors).toEqual([]);
});
