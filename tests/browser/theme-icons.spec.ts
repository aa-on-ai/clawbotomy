import { test, expect } from '@playwright/test';

test('icon theme toggle follows initial preference, persists selection and supports keyboard', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const root = page.locator('.fieldNotes');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  const light = page.getByRole('button', { name: 'Switch to light mode' });
  await expect(light.locator('svg')).toHaveCount(1);
  await light.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('link', { name: 'Ideas', exact: true }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.fieldNotesHeader select')).toHaveCount(0);
  const size = await page.locator('.fieldNotesThemeControl').boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(48);
  expect(size?.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
