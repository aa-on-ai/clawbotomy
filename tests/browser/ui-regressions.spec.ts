import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const primaryRoutes = [
  '/',
  '/about',
  '/checkups',
  '/preflight',
  '/evaluate',
  '/bench',
  '/docs',
  '/terms',
];

async function gotoReady(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'load' });
  expect(response?.ok(), `${route} should load successfully`).toBeTruthy();
  await page.waitForFunction(() => {
    const fontFamily = getComputedStyle(document.body).fontFamily.toLowerCase();
    return !fontFamily.includes('times');
  });
}

async function waitForReactHandler(page: Page, selector: string) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return Boolean(element && Object.keys(element).some((key) => key.startsWith('__reactProps')));
  }, selector);
}

for (const route of primaryRoutes) {
  test(`${route} has no overflow or serious accessibility violations`, async ({ page }) => {
    await gotoReady(page, route);

    const viewport = page.viewportSize();
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth, `${route} should fit the ${viewport?.width}px viewport`).toBeLessThanOrEqual(
      viewport?.width || documentWidth,
    );

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('/preflight exposes validation errors and a full-size checkbox target', async ({ page }) => {
  await gotoReady(page, '/preflight');
  await waitForReactHandler(page, 'button[type="submit"]');
  await page.getByRole('button', { name: 'Build local plan' }).click();

  const label = page.getByLabel('Plan label');
  const labelError = page.locator('#plan-label-error');
  await expect(labelError).toBeVisible();

  const firstCheckbox = page.getByRole('checkbox').first();
  const checkboxBox = await firstCheckbox.boundingBox();
  expect(checkboxBox?.width).toBeGreaterThanOrEqual(48);
  expect(checkboxBox?.height).toBeGreaterThanOrEqual(48);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await expect(label).toHaveAttribute('aria-describedby', /plan-label-error/);
});

test('a first-time visitor can plan the default boundary and inspect both reference controls', async ({ page }) => {
  await gotoReady(page, '/preflight');
  await waitForReactHandler(page, 'button[type="submit"]');

  await expect(page.getByRole('checkbox', { name: /Search and read/i })).toBeChecked();
  await expect(page.getByLabel('Your intended boundary').first()).toHaveValue('approval');
  await expect(page.getByRole('checkbox', { name: /Delete messages/i })).toBeChecked();
  await expect(page.getByLabel('Your intended boundary').last()).toHaveValue('block');
  await page.getByLabel('Plan label').fill('First checkup');
  await page.getByRole('button', { name: 'Build local plan' }).click();
  await expect(page.getByRole('heading', { name: 'Run your configured agent' })).toBeVisible();
  const preflightCommand = page.getByLabel('Command to preflight a configured OpenClaw evaluation');
  await expect(preflightCommand).toContainText('agent:preflight');
  const commandLines = (await preflightCommand.innerText()).split('\n');
  expect(commandLines[0]).toBe('npm run agent:preflight -- \\');
  expect(commandLines.slice(1)).toHaveLength(5);
  for (const line of commandLines.slice(1)) {
    expect(line).toMatch(/^  --/);
  }

  await gotoReady(page, '/evaluate');
  await waitForReactHandler(page, 'button');
  await expect(page.getByRole('heading', { name: 'Decide only after you load a run.' })).toBeVisible();
  await expect(page.getByText('Sanitized configured-session example')).toHaveCount(0);

  await page.getByRole('button', { name: /Load bounded example/i }).click();
  await expect(page.getByText('Bounded control loaded. No configured agent was inspected.')).toBeVisible();
  await expect(page.getByText('13 of 13 reference cases passed.')).toBeVisible();
  await expect(page.getByText('Evidence lane / Synthetic reference control')).toBeVisible();

  await page.getByRole('button', { name: /Load overreach example/i }).click();
  await expect(page.getByText('Overreach control loaded. No configured agent was inspected.')).toBeVisible();
  await expect(page.getByText('0 of 13 reference cases passed.')).toBeVisible();
  await expect(page.getByText('13', { exact: true }).first()).toBeVisible();
});

test('/evaluate keeps disclosure copy clear of its indicator on mobile', async ({ page }) => {
  await gotoReady(page, '/evaluate');
  await waitForReactHandler(page, '[aria-controls="launch-setup-details"]');

  const disclosure = page.getByRole('button', { name: /Open setup requirements and command/i });
  const label = disclosure.locator('strong');
  const indicator = disclosure.getByTestId('disclosure-indicator');
  const [labelBox, indicatorBox] = await Promise.all([label.boundingBox(), indicator.boundingBox()]);

  expect(labelBox).not.toBeNull();
  expect(indicatorBox).not.toBeNull();
  expect((indicatorBox?.x || 0) - ((labelBox?.x || 0) + (labelBox?.width || 0))).toBeGreaterThanOrEqual(12);

  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');

  const statusGuide = page.locator('summary').filter({ hasText: 'Read the process exit before the score' });
  const statusTitle = statusGuide.getByRole('heading', { name: 'Read the process exit before the score' });
  const statusIndicator = statusGuide.getByTestId('status-guide-indicator');
  await expect(statusIndicator).toBeVisible();
  const [statusTitleBox, statusIndicatorBox] = await Promise.all([
    statusTitle.boundingBox(),
    statusIndicator.boundingBox(),
  ]);
  expect(statusTitleBox).not.toBeNull();
  expect(statusIndicatorBox).not.toBeNull();
  expect((statusIndicatorBox?.x || 0) - ((statusTitleBox?.x || 0) + (statusTitleBox?.width || 0))).toBeGreaterThanOrEqual(12);
});

test('/docs uses the editorial reading system instead of wall-to-wall monospace', async ({ page }) => {
  await gotoReady(page, '/docs');

  const readingCopy = page.locator('[data-reading-copy]');
  expect(await readingCopy.count()).toBeGreaterThan(5);

  const fontFamilies = await readingCopy.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).fontFamily.toLowerCase()),
  );
  for (const fontFamily of fontFamilies) {
    expect(fontFamily).not.toContain('mono');
  }
});
