import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ready(page: Page, route: string) {
  await page.goto(route);
  if (await page.locator('#app').count()) await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}
async function target(control: Locator) {
  const box = await control.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(48);
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expect(control).toHaveCSS('border-radius', '11px');
}

test('notebook primary secondary quiet and icon controls keep real keyboard and theme behavior', async ({ page }) => {
  await ready(page, '/');
  const theme = page.locator('.fieldNotesThemeControl');
  const primary = page.locator('[data-tool="labels"]');
  const reset = page.locator('[data-tool="reset"]');
  await target(theme); await target(primary); await target(reset);
  await expect(reset).toBeDisabled();
  await expect(primary.locator('svg')).toHaveCSS('width', '18px');
  await expect(primary.locator('svg')).toHaveCSS('stroke-width', '1.75px');
  // WebKit follows the platform's form-only Tab preference. Establish keyboard
  // modality, then focus the button to verify the ring and keyboard activation.
  await page.keyboard.press('Tab');
  await primary.focus();
  await expect(primary).toBeFocused();
  await expect(primary).toHaveCSS('outline-style', 'solid');
  await expect(primary).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feltSlip[data-gone="true"]')).toHaveCount(2);
  await expect(reset).toBeEnabled();
  await reset.press('Enter');
  await expect(page.locator('.feltSlip[data-gone="true"]')).toHaveCount(0);
  await theme.press('Enter');
  await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'dark');
  await theme.press('Space');
  await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'light');
});

test('framework menu and disclosure icons keep their labels and keyboard states', async ({ page }, info) => {
  await ready(page, '/evaluate');
  const menu = page.getByRole('button', { name: 'Open primary navigation', exact: true });
  if (info.project.name.startsWith('mobile')) {
    await target(menu);
    await expect(menu.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await menu.press('Enter');
    const close = page.getByRole('button', { name: 'Close primary navigation', exact: true });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('header').getByRole('link', { name: 'Plan a checkup' })).toBeVisible();
    await close.press('Space');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  }
  const disclosure = page.locator('[aria-controls="launch-setup-details"]');
  await disclosure.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(disclosure.locator('.lucide-minus')).toHaveCount(1);
  await disclosure.press('Space');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(disclosure.locator('.lucide-plus')).toHaveCount(1);
  await page.getByRole('button', { name: /Load bounded example/i }).click();
  await expect(page.getByText('13 of 13 reference cases passed.')).toBeVisible();
  const selected = page.locator('[data-control="row"][aria-pressed="true"]');
  expect(await selected.count()).toBeGreaterThan(0);
  await expect(selected.first()).toHaveCSS('outline-style', 'solid');
});

test('planner glyphs and local action retain validation selected and completed states', async ({ page }) => {
  await ready(page, '/preflight');
  const build = page.getByRole('button', { name: 'Build local plan', exact: true });
  await target(build);
  await build.click();
  await expect(page.locator('#plan-label-error')).toBeVisible();
  await page.getByLabel('Plan label').fill('Control review local fixture');
  const checkbox = page.getByRole('checkbox').first();
  await expect(checkbox).toBeChecked();
  const glyph = checkbox.locator('xpath=following-sibling::span').locator('svg');
  await expect(glyph).toHaveCSS('opacity', '1');
  await checkbox.press('Space');
  await expect(glyph).toHaveCSS('opacity', '0');
  await checkbox.press('Space');
  // Re-selecting a capability intentionally clears its prior intent.
  await page.getByLabel('Your intended boundary').first().selectOption('approval');
  await build.press('Enter');
  await expect(page.getByRole('heading', { name: 'Run your configured agent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy plan', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Fetch routine controls remain distinct from playable clay tiles', async ({ page }) => {
  await ready(page, '/play/fetch');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'editing');
  for (const id of ['#send', '#undo', '#restart', '#sound']) await target(page.locator(id));
  await expect(page.locator('#undo')).toBeDisabled();
  const tile = page.locator('.tile').first();
  const label = await tile.getAttribute('aria-label');
  await tile.press('Space');
  await expect(page.locator('#undo')).toBeEnabled();
  await page.locator('#undo').press('Enter');
  await expect(tile).toHaveAttribute('aria-label', label!);
  await page.locator('#sound').press('Enter');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sound use')).toHaveAttribute('href', '#i-volume-on');
  await page.locator('#sound').press('Space');
  await expect(page.locator('#sound use')).toHaveAttribute('href', '#i-volume-off');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('shared finishes honor reduced motion without disabling the diagram', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [route, selector] of [['/', '.fieldNotesThemeControl'], ['/preflight', '[data-control="primary"]'], ['/play/fetch', '#send'], ['/notes/the-skill-didnt-shrink', '.documentMapToggle']]) {
    await ready(page, route);
    await expect(page.locator(selector).first()).toHaveCSS('transition-duration', '0s');
  }
  const toggle = page.locator('.documentMapToggle');
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('pointer hover press and keyboard focus acknowledge input without moving geometry', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Hover belongs to fine-pointer desktop; touch activation covered separately.');
  await ready(page, '/');
  const control = page.locator('[data-tool="labels"]');
  await control.scrollIntoViewIfNeeded();
  const before = await control.boundingBox();
  const rest = await control.evaluate(e => getComputedStyle(e).backgroundColor);
  await control.hover();
  await expect(control).not.toHaveCSS('background-color', rest);
  const raised = await control.evaluate(e => getComputedStyle(e).boxShadow);
  await page.mouse.down();
  await expect(control).not.toHaveCSS('box-shadow', raised);
  expect(await control.boundingBox()).toEqual(before);
  await page.mouse.up();
  await control.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(control).toHaveCSS('outline-width', '3px');
});
