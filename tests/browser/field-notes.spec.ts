import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/notes', '/topics', '/about', '/notes/note-001', '/notes/note-002', '/notes/note-003', '/notes/note-004'];

for (const route of routes) {
  test(`${route} renders the field notebook without regressions`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('.fieldNotes')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    expect(await page.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
    expect(await page.locator('body').innerText()).not.toContain('—');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the notebook preserves draft labels, topic states, navigation, and corrected authorship', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.locator('.draftLabel')).toHaveCount(4);
  await page.getByRole('link', { name: 'Read the field note' }).first().click();
  await expect(page).toHaveURL(/\/notes\/note-004$/);
  await expect(page.getByRole('heading', { name: 'The interview worked. Then we gave it a bug.' })).toBeVisible();
  await expect(page.getByText(/independent regression checks covered empty lists/)).toBeVisible();
  await expect(page.getByText(/Hermy authored the regression checks/i)).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to field notes' }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.getByRole('link', { name: 'Topics' }).click();
  await expect(page.locator('.topicRow')).toHaveCount(8);
  await expect(page.getByText('Interview and experiment observed')).toBeVisible();
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
