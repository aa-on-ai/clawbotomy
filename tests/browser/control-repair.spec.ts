import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function safeFixtureFiles() {
  const source = readFileSync('tests/agent-evaluation.test.js', 'utf8');
  const fixture = runInNewContext(source.slice(source.indexOf('const runId ='), source.indexOf("test('adapter catalog")) + '\nbundle({failedCases:1});');
  return [['evaluation-attempt-fixture.json', 'attemptText'], ['manifest.json', 'manifestText'], ['summary.json', 'summaryText'], ['cases.jsonl', 'casesText']].map(([name, key]) => ({ name, mimeType: 'application/json', buffer: Buffer.from(fixture[key]) }));
}

async function ready(page: Page, route: string) {
  await page.goto(route);
  if (await page.locator('#app').count()) await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}
async function flat(control: Locator) {
  await expect(control).toHaveCSS('box-shadow', 'none');
  const box = await control.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
}
async function states(page: Page, control: Locator) {
  await flat(control);
  await control.hover(); await flat(control);
  await page.mouse.down(); await flat(control); await page.mouse.move(0, 0); await page.mouse.up();
  await page.mouse.click(0, 0);
  await keyboardReach(page, control, page.context().browser()?.browserType().name() === 'webkit');
  await flat(control); await expect(control).toHaveCSS('outline-style', 'solid');
}

test('CONTROL-QUIET-02 quiet variants remain flat through all input states', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await ready(page, '/?theme=' + theme);
    const reset = page.locator('[data-tool="reset"]');
    await expect(reset).toBeDisabled(); await flat(reset);
    await expect(reset).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(reset).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
    await page.locator('[data-tool="labels"]').click();
    await expect(reset).toBeEnabled();
    await states(page, reset);
    // Release away from the control avoids activating Reset during style checks.
    await page.keyboard.press('Tab'); await reset.focus(); await flat(reset);
    await expect(reset).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(reset).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  }
  await ready(page, '/play/fetch');
  const sound = page.locator('#sound');
  for (const pressed of ['false', 'true']) {
    if (await sound.getAttribute('aria-pressed') !== pressed) await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', pressed);
    await states(page, sound);
  }
  await ready(page, '/evaluate');
  for (const quiet of await page.locator('[data-control="quiet"]:visible').all()) await states(page, quiet);
  const disclosure = page.locator('[aria-controls="launch-setup-details"]');
  await states(page, disclosure);
  await page.getByRole('button', { name: /Load bounded example/i }).click();
  await states(page, page.locator('[data-control="row"]').first());
});

test('CONTROL-DISCLOSURE-03 owner minima and both centered indicators survive media states', async ({ page }, info) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await ready(page, '/evaluate');
    const setup = page.locator('[aria-controls="launch-setup-details"]');
    await expect(setup).toHaveCSS('min-height', info.project.name.startsWith('mobile') ? '84px' : '72px');
    const summary = page.locator('summary').filter({ has: page.locator('[class*="statusGuideIndicator"]') });
    for (const row of [setup, summary]) {
      for (const opened of [false, true]) {
        if (opened) await row.click();
        for (const hover of [false, true]) {
          if (hover) await row.hover(); else await page.mouse.move(0, 0);
          await expect.poll(async () => row.evaluate(e => {
            const r = e.getBoundingClientRect(); const i = e.querySelector('[class*="Indicator"]')!.getBoundingClientRect();
            return Math.abs((r.top + r.height / 2) - (i.top + i.height / 2));
          })).toBeLessThan(1);
          await flat(row);
        }
      }
    }
    await page.getByRole('button', { name: /Load bounded example/i }).click();
    const runs = page.locator('[class*="runIndex"] button');
    const cases = page.locator('[class*="caseIndex"] button');
    await expect(runs.first()).toHaveCSS('min-height', '78px');
    await expect(cases.first()).toHaveCSS('min-height', '62px');
    expect((await runs.first().boundingBox())!.height).toBeGreaterThanOrEqual(78);
    expect((await cases.first().boundingBox())!.height).toBeGreaterThanOrEqual(62);
  }
  const index = await (await page.request.get('/evidence/index.json')).json();
  await ready(page, '/bench/runs/' + index.runs[0].runId);
  const evidence = page.locator('[data-control="disclosure"]').first();
  await expect(evidence).toHaveCSS('min-height', '116px');
  expect((await evidence.boundingBox())!.height).toBeGreaterThanOrEqual(116);
});

async function ring(control: Locator) {
  return control.evaluate(e => { const s = getComputedStyle(e); return [s.outlineWidth, s.outlineOffset, s.outlineStyle].join('|'); });
}
async function keyboardReach(page: Page, control: Locator, webkit: boolean) {
  // Real native navigation, not focus() pretending to establish Tab order.
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press(webkit ? 'Alt+Tab' : 'Tab');
    if (await control.evaluate(e => e === document.activeElement)) return;
  }
  throw new Error('Native keyboard traversal did not reach the row');
}

test('CONTROL-FOCUS-04 persistent selection and keyboard focus are independent', async ({ page, browserName }, info) => {
  for (const forcedColors of ['none', 'active'] as const) {
    await page.emulateMedia({ forcedColors });
    await ready(page, '/evaluate');
    await page.getByRole('button', { name: /Load bounded example/i }).click();
    await expect(page.getByText('13 of 13 reference cases passed.')).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(safeFixtureFiles());
    await expect(page.getByRole('button', { name: 'Inspect first linked case' })).toBeVisible();
    for (const group of ['runIndex', 'caseIndex']) {
      const rows = page.locator(`[class*="${group}"] button[data-control="row"]`);
      const selected = rows.locator('[aria-pressed="true"]');
      const first = rows.first();
      await page.mouse.click(0, 0);
      const unfocused = await ring(first);
      await keyboardReach(page, first, browserName === 'webkit');
      expect(await ring(first)).not.toBe(unfocused);
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      if (await rows.count() > 1) {
        const next = rows.nth(1);
        await keyboardReach(page, next, browserName === 'webkit');
        await expect(next).toHaveAttribute('aria-pressed', 'false');
        expect(await ring(next)).not.toBe(await ring(first));
        await page.keyboard.press('Enter');
        await expect(next).toHaveAttribute('aria-pressed', 'true');
        await expect(first).toHaveAttribute('aria-pressed', 'false');
        const focused = await ring(next);
        await page.mouse.click(0, 0);
        expect(await ring(next)).not.toBe(focused);
      }
    }
    await info.attach('keyboard-policy', { body: browserName === 'webkit' ? 'Native Option-Tab; plain Tab uses macOS form-only preference.' : 'Native Tab navigation.', contentType: 'text/plain' });
  }
});
