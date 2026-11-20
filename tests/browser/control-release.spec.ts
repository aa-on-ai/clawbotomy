import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';

const appErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  appErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }, info) => {
  await info.attach('app-errors', { body: JSON.stringify(appErrors.get(page)), contentType: 'application/json' });
  expect(appErrors.get(page)).toEqual([]);
});

async function ready(page: Page, route: string) {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
}
async function keyboardReach(page: Page, target: Locator, webkit: boolean) {
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press(webkit ? 'Alt+Tab' : 'Tab');
    if (await target.evaluate(e => e === document.activeElement)) return;
  }
  throw new Error('Native keyboard traversal did not reach the target');
}
async function shot(page: Page, info: TestInfo, name: string, anchor: Locator) {
  // Native focus scrolling and the outer accordion can still be moving. Wait
  // for the target to settle in view; never synthesize focus or suppress motion.
  const settled = await anchor.evaluate(async e => {
    let previous = '';
    let stableFrames = 0;
    for (let frame = 0; frame < 120; frame++) {
      const r = e.getBoundingClientRect();
      const visible = r.top >= 64 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
      const position = [r.top, r.bottom, r.left, r.right].join('|');
      stableFrames = visible && position === previous ? stableFrames + 1 : 0;
      if (stableFrames >= 30) return true;
      if (!visible) e.scrollIntoView({ block: 'center', behavior: 'instant' });
      previous = position;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return false;
  });
  expect(settled).toBe(true);
  await expect(anchor).toBeInViewport({ ratio: 1 });
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path, scale: 'css' });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function indicators(summary: Locator, open: boolean) {
  await expect(summary.locator('.lucide-plus')).toHaveCount(1);
  await expect(summary.locator('.lucide-minus')).toHaveCount(1);
  await expect(summary.locator(open ? '.lucide-minus' : '.lucide-plus')).toBeVisible();
  await expect(summary.locator(open ? '.lucide-plus' : '.lucide-minus')).toBeHidden();
  const contained = await summary.evaluate(e => {
    const r = e.getBoundingClientRect();
    const icon = [...e.querySelectorAll('svg')].find(s => getComputedStyle(s).display !== 'none')!;
    const i = icon.getBoundingClientRect();
    return i.width >= 18 && i.left >= r.left && i.right <= r.right && i.top >= r.top && i.bottom <= r.bottom;
  });
  expect(contained).toBe(true);
}

test('F1 generated scenarios expose native open and closed indicators', async ({ page, browserName }, info) => {
  await ready(page, '/preflight');
  await page.getByLabel('Plan label', { exact: true }).fill('Release control fixture');
  await page.getByRole('button', { name: 'Build local plan', exact: true }).click();
  const details = page.locator('[class*="scenarioList"] details');
  await expect(details.first()).toHaveAttribute('open', '');
  const summary = details.nth(1).locator('summary');
  await summary.scrollIntoViewIfNeeded();
  await shot(page, info, 'F1-closed', summary);
  await indicators(summary, false);
  await indicators(details.first().locator('summary'), true);
  await keyboardReach(page, summary, browserName === 'webkit');
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
  if (cdp) await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await page.keyboard.press('Enter');
  if (cdp) await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
  await expect(details.nth(1)).toHaveAttribute('open', '');
  await indicators(summary, true);
  await shot(page, info, 'F1-open-keyboard', summary);
  await page.keyboard.press('Space');
  await expect(details.nth(1)).not.toHaveAttribute('open', '');
  await indicators(summary, false);
  await cdp?.detach();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('F2 actual case focus stays inside the scrollport independently of selection', async ({ page, browserName }, info) => {
  for (const forcedColors of (browserName === 'chromium' ? ['none', 'active'] : ['none']) as ('none' | 'active')[]) {
    await page.emulateMedia({ forcedColors });
    await ready(page, '/evaluate');
    await page.getByRole('button', { name: /Load bounded example/i }).click();
    await expect(page.getByText('13 of 13 reference cases passed.')).toBeVisible();
    const rows = page.locator('[class*="caseIndex"] button[data-control="row"]');
    const first = rows.first();
    await first.scrollIntoViewIfNeeded();
    await shot(page, info, `F2-${forcedColors}-selected-unfocused`, first);
    for (const index of [0, 1, (await rows.count()) - 1]) {
      const row = rows.nth(index);
      await keyboardReach(page, row, browserName === 'webkit');
      await expect(row).toBeFocused();
      await expect(row).toHaveAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      // Measure the painted outline's full outer edge against the clipping ancestor,
      // not just the existence of a computed outline. Preserve a full-size frame too.
      await shot(page, info, `F2-${forcedColors}-focus-${index}`, row);
      const ring = await row.evaluate(e => {
        const r = e.getBoundingClientRect();
        const clip = e.closest('ul')!.getBoundingClientRect();
        const s = getComputedStyle(e);
        const extent = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        return { visible: e.matches(':focus-visible'), width: parseFloat(s.outlineWidth),
          contained: r.left - extent >= clip.left - .5 && r.right + extent <= clip.right + .5 && r.top - extent >= clip.top - .5 && r.bottom + extent <= clip.bottom + .5 };
      });
      expect(ring.visible).toBe(true);
      expect(ring.width).toBeGreaterThanOrEqual(3);
      expect(ring.contained).toBe(true);
    }
    const last = rows.last();
    await page.keyboard.press('Enter');
    await expect(last).toHaveAttribute('aria-pressed', 'true');
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await shot(page, info, `F2-${forcedColors}-bottom-selected`, last);
  }
});

test('F3 nested prompt and repeat evidence retain native disclosure indicators', async ({ page, browserName }, info) => {
  const index = await (await page.request.get('/evidence/index.json')).json();
  let sawPrompt = false;
  let sawRepeat = false;
  for (const run of index.runs) {
    await ready(page, '/bench/runs/' + run.runId);
    const outer = page.locator('button[aria-controls^="evidence-case-"]').first();
    await outer.click();
    await expect(outer).toHaveAttribute('aria-expanded', 'true');
    // The JS-owned outer grid animates. Await its actual transition before
    // positioning the nested native summary; do not change the animation.
    await outer.evaluate(async e => {
      const article = e.closest('article')!;
      const content = article.querySelector('[id^="evidence-case-"]')!;
      getComputedStyle(content).gridTemplateRows;
      await Promise.all(article.getAnimations({ subtree: true }).map(animation => animation.finished));
    });
    const summaries = page.locator('[class*="evidenceDisclosure"] > summary');
    const summary = summaries.first();
    const label = await summary.locator(':scope > span').textContent();
    sawPrompt ||= label === 'Inspect untrusted prompt and response';
    sawRepeat ||= /^Inspect repeat \d+ evidence$/.test(label!);
    await summary.scrollIntoViewIfNeeded();
    await shot(page, info, `F3-${run.runId}-closed`, summary);
    await indicators(summary, false);
    await keyboardReach(page, summary, browserName === 'webkit');
    // Disable script execution after the JS-owned outer case is opened. The nested
    // details must still toggle natively; no-JS initial outer-case access is not claimed.
    const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
    if (cdp) await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
    await page.keyboard.press('Enter');
    if (cdp) await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
    await expect(summary.locator('..')).toHaveAttribute('open', '');
    await indicators(summary, true);
    await expect(summary.locator('..').getByRole('heading', { name: 'User prompt', exact: true })).toBeVisible();
    await shot(page, info, `F3-${run.runId}-open`, summary);
    await page.keyboard.press('Space');
    await expect(summary.locator('..')).not.toHaveAttribute('open', '');
    await indicators(summary, false);
    await cdp?.detach();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(sawPrompt).toBe(true);
  expect(sawRepeat).toBe(true);
});

test('release coverage Bench actions and desktop plan clipboard readback', async ({ page, context }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page, '/bench');
  const primary = page.locator('main').getByRole('link', { name: 'Plan a checkup', exact: true });
  const secondary = page.getByRole('link', { name: 'Open the local viewer', exact: true });
  await primary.scrollIntoViewIfNeeded();
  await expect(primary).toBeInViewport();
  await expect(secondary).toBeInViewport();
  await shot(page, info, 'Bench-both-CTA', primary);
  await expect(secondary).toBeInViewport();
  if (info.project.name === 'desktop-chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await ready(page, '/preflight');
    await page.getByLabel('Plan label', { exact: true }).fill('Release clipboard fixture');
    await page.getByRole('button', { name: 'Build local plan', exact: true }).click();
    const expected = await page.getByLabel('Inbox preflight plan JSON for Release clipboard fixture', { exact: true }).innerText();
    await page.getByRole('button', { name: 'Copy plan', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(expected);
    expect(JSON.parse(copied).subject.label).toBe('Release clipboard fixture');
    await shot(page, info, 'Preflight-Copied', page.getByRole('button', { name: 'Copied', exact: true }));
    await info.attach('clipboard-readback', { body: JSON.stringify({ equal: copied === expected, bytes: Buffer.byteLength(copied), label: JSON.parse(copied).subject.label }), contentType: 'application/json' });
  }
  expect(errors).toEqual([]);
});
