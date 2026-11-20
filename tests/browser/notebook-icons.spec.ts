import { test, expect, type Locator } from '@playwright/test';

async function glyph(button: Locator, label: string, drawing: string) {
  await expect(button).toHaveAccessibleName(label);
  await expect(button.locator('svg')).toHaveCount(1);
  await expect(button.locator('svg')).toBeVisible();
  await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(button.locator('svg')).toHaveAttribute('data-glyph', drawing);
  const box = await button.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(48);
  expect(box!.height).toBeGreaterThanOrEqual(48);
}

for (const theme of ['light', 'dark']) {
  test(`action glyphs track removal partial restore and reset in ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const route of ['/', '/notes/remove-all-eyebrows']) {
      await page.goto(`${route}?theme=${theme}`);
      await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
      await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', theme);
      const pluck = page.locator('[data-tool="labels"]');
      const pull = page.locator('[data-tool="lines"]');
      const reset = page.locator('[data-tool="reset"]');
      const slips = page.locator('.feltSheet [data-slip]');
      const stitches = page.locator('.feltSheet [data-stitch]');
      const click = async (control: Locator) => { if (info.project.name.startsWith('mobile')) await control.tap(); else await control.click(); };
      await glyph(pluck, 'Pluck the eyebrows', 'pluck');
      await glyph(pull, 'Pull the lines', 'pull');
      const pluckDrawing = await pluck.locator('svg').innerHTML();
      const pullDrawing = await pull.locator('svg').innerHTML();
      const restoreDrawing = await reset.locator('svg').innerHTML();
      expect(pluckDrawing).not.toBe(restoreDrawing);
      expect(pullDrawing).not.toBe(restoreDrawing);
      await expect(reset).toBeDisabled();
      // Direct item edits retain the removal action for the remaining item.
      await click(slips.first());
      await glyph(pluck, 'Pluck the other one', 'pluck');
      await click(stitches.first());
      await glyph(pull, 'Pull the other line', 'pull');
      // WebKit on macOS uses Option-Tab for full keyboard navigation. Move
      // away and back after touch so focus-visible is established natively.
      await pluck.focus();
      const optionTab = info.project.name === 'mobile-webkit';
      await page.keyboard.press(optionTab ? 'Alt+Tab' : 'Tab');
      await page.keyboard.press(optionTab ? 'Alt+Shift+Tab' : 'Shift+Tab');
      await expect(pluck).toBeFocused();
      await expect(pluck).toHaveCSS('outline-width', '3px');
      await pluck.press('Enter');
      await pull.press('Space');
      await expect(page.locator('.feltSheet [data-gone="true"]')).toHaveCount(4);
      await expect(page.locator('.feltPiece[data-here="true"]')).toHaveCount(4);
      await glyph(pluck, 'Put the eyebrows back', 'restore');
      await glyph(pull, 'Put the lines back', 'restore');
      expect(await pluck.locator('svg').innerHTML()).toBe(restoreDrawing);
      expect(await pull.locator('svg').innerHTML()).toBe(restoreDrawing);
      // Both inverse actions work independently, with the original drawing restored.
      await pluck.press('Space');
      await expect(page.locator('.feltSheet [data-slip][data-gone="true"]')).toHaveCount(0);
      await glyph(pluck, 'Pluck the eyebrows', 'pluck');
      await glyph(pull, 'Put the lines back', 'restore');
      await pull.press('Enter');
      await expect(page.locator('.feltSheet [data-gone="true"]')).toHaveCount(0);
      await glyph(pull, 'Pull the lines', 'pull');
      expect(await pluck.locator('svg').innerHTML()).toBe(pluckDrawing);
      expect(await pull.locator('svg').innerHTML()).toBe(pullDrawing);
      await expect(reset).toBeDisabled();
      await click(pluck); await click(pull);
      await expect(page.locator('.feltSheet [data-gone="true"]')).toHaveCount(4);
      await reset.press('Enter');
      await expect(page.locator('.feltSheet [data-gone="true"]')).toHaveCount(0);
      await glyph(pluck, 'Pluck the eyebrows', 'pluck');
      await glyph(pull, 'Pull the lines', 'pull');
      await expect(reset).toBeDisabled();
      await expect(pluck).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test.describe('no-JS action glyphs', () => {
  test.use({ javaScriptEnabled: false });
  test('keep a complete static specimen without pretending the tools work', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.feltSheet')).toBeVisible();
    await expect(page.locator('.feltSheet [data-slip]')).toHaveCount(2);
    await expect(page.locator('.feltSheet [data-stitch]')).toHaveCount(2);
    for (const [kind, label, drawing] of [['labels', 'Pluck the eyebrows', 'pluck'], ['lines', 'Pull the lines', 'pull']]) {
      const control = page.locator(`[data-tool="${kind}"]`);
      await glyph(control, label, drawing);
      await expect(control).toBeDisabled();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
