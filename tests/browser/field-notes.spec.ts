import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/notes', '/topics', '/about', '/notes/note-001', '/notes/note-002', '/notes/note-003', '/notes/note-004'];

for (const route of routes) {
  test(`${route} renders the field notebook without regressions`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.ok()).toBeTruthy();
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

test('the notebook preserves draft labels, topic states, navigation, and corrected authorship', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.locator('.draftLabel')).toHaveCount(4);
  await page.getByRole('link', { name: 'Two agents. One bug. Human supervision required.' }).click();
  await expect(page).toHaveURL(/\/notes\/note-004$/);
  await expect(page.getByRole('heading', { name: 'Two agents. One bug. Human supervision required.' })).toBeVisible();
  await expect(page.getByText('I reviewed and applied the patch. Seventeen checks passed. We replayed the long answer through Discord, clearly marked as a replay. Two messages arrived. This time the controller kept both IDs.')).toBeVisible();
  await expect(page.getByText(/Hermy authored the regression checks/i)).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to field notes' }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.getByRole('link', { name: 'Ideas', exact: true }).click();
  await expect(page.locator('.topicRow')).toHaveCount(8);
  await expect(page.getByText('Interview and experiment recorded')).toBeVisible();
});

test('reading controls, story furniture, and article continuity work together', async ({ page }) => {
  await page.goto('/notes/note-004');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.fieldNotes')).toHaveCSS('color-scheme', 'dark');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'light');

  await expect(page.locator('.cloud .open')).toHaveCSS('opacity', '1');
  await expect(page.locator('.articleShell .storyFigure img')).toHaveAttribute('src', /small-bug-plush\.webp/);
  expect(await page.locator('.articleBody > p').first().evaluate((element) => getComputedStyle(element, '::first-letter').float)).toBe('none');
  await expect(page.locator('.storyQuote p')).toHaveText('why are you stopping every 5 seconds');
  await expect(page.getByRole('link', { name: /Previous field note.*Your page is ready/ })).toBeVisible();
  await expect(page.locator('.fieldNotesFooter')).toHaveText('© Clawbotomy 2026');

  await page.goto('/notes/note-003');
  await expect(page.locator('.articleShell .storyFigure img')).toHaveAttribute('src', /delivery-plush\.webp/);
  await expect(page.getByRole('link', { name: /Next field note.*Two agents\. One bug/ })).toBeVisible();
});

test('brand hover condenses the claw without hiding the brand', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Precise hover behavior only applies to fine pointers.');
  await page.goto('/notes');
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
