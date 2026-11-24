import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadNotebookCatalog, renderApprovedNote } from '../../scripts/lib/notebook-content.mjs';

const slug = 'the-gate-had-never-seen-a-real-page';
const route = `/notes/${slug}`;
const note = loadNotebookCatalog().approvedNotes.find((entry: { slug: string }) => entry.slug === slug)!;
const gate = note.blocks.find((block: { type: string }) => block.type === 'gate-runs');
const figureSelector = 'article[data-note-slug] .gateRuns';
const privateMarkers = /\/Users\/|\.hermes\/|clawbotomy-handoff|approvalTranscript|contentDigest|sha256:|Unapproved draft/i;

async function ready(page: Page) {
  await page.goto(route);
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await expect(page.locator(figureSelector)).toHaveAttribute('data-enhanced', 'true');
  return page.locator(figureSelector);
}
// Focus moves to the next primary action; a second choice is reached with Tab.
async function press(button: Locator, testInfo: TestInfo, focused = true) {
  await expect(button).toBeVisible();
  if (testInfo.project.name.startsWith('mobile')) await button.tap();
  else {
    if (focused) await expect(button).toBeFocused();
    else { await button.page().keyboard.press('Tab'); await expect(button).toBeFocused(); }
    await button.press('Enter');
  }
}
const result = (figure: Locator, where: string) => figure.locator(`${where} .gateRunsResult`);
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('published gate note serves its exact static bytes without private records', async ({ request }) => {
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(renderApprovedNote(note));
  expect(html).not.toMatch(privateMarkers);
  const expected = readFileSync(`public/notebook/generated/${slug}.html`);
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(expected).digest('hex'));
  expect((await request.get('/notebook/gate-runs.js')).status()).toBe(200);
});

test('without script every recorded run is visible and no control is shown', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);
  const figure = page.locator(figureSelector);
  await expect(figure.locator('.gateRunsResult')).toHaveCount(6);
  for (const r of await figure.locator('.gateRunsResult').all()) await expect(r).toBeVisible();
  await expect(figure.locator('button:visible')).toHaveCount(0);
  await expect(figure.getByText(gate.predict.reveal)).toBeVisible();
  await context.close();
});

test('replay: predict, run, follow the base first, then the other fix and the control', async ({ page }, testInfo) => {
  const figure = await ready(page);
  await expect(figure.locator('.gateRunsPending:visible')).toHaveCount(6);
  await expect(figure.locator('.gateRunsResult:visible')).toHaveCount(0);
  await expect(figure.locator('.gateRunsReveal')).toBeHidden();
  await figure.screenshot({ path: testInfo.outputPath('start.png') });
  const guess = figure.getByRole('button', { name: gate.predict.options[1], exact: true });
  if (testInfo.project.name.startsWith('mobile')) await guess.tap(); else { await guess.focus(); await guess.press('Enter'); }
  await expect(guess).toHaveAttribute('aria-pressed', 'true');
  await press(figure.getByRole('button', { name: gate.controls.runTest }), testInfo);
  await expect(result(figure, '[data-step="test"]')).toBeVisible();
  await press(figure.getByRole('button', { name: gate.controls.runPage }), testInfo);
  await expect(result(figure, '[data-cell="0"]')).toContainText(gate.grid.cells[0].message);
  await expect(figure.getByText(gate.controls.choose)).toBeVisible();
  await press(figure.getByRole('button', { name: gate.controls.fixBase }), testInfo);
  await expect(result(figure, '[data-cell="2"]')).toContainText(gate.grid.cells[2].message);
  await expect(result(figure, '[data-cell="1"]')).toBeHidden();
  await expect(figure.locator('.gateRunsGrain')).toBeVisible();
  await expect(figure.locator('.gateRunsStatus')).toContainText(gate.grid.cells[2].message);
  await press(figure.getByRole('button', { name: gate.controls.other }), testInfo);
  for (const i of [0, 1, 2, 3]) await expect(result(figure, `[data-cell="${i}"]`)).toBeVisible();
  await expect(result(figure, '[data-cell="3"]')).toContainText(gate.grid.cells[3].message);
  await expect(figure.locator('.gateRunsReveal')).toContainText(`${gate.controls.guess} ${gate.predict.options[1]}.`);
  await press(figure.getByRole('button', { name: gate.controls.runControl }), testInfo);
  await expect(result(figure, '[data-step="control"]')).toContainText(gate.control.run.message);
  await expect(figure.locator('.gateRunsPending:visible')).toHaveCount(0);
  await noOverflow(page);
  await figure.screenshot({ path: testInfo.outputPath('end.png') });
  await press(figure.getByRole('button', { name: gate.controls.reset }), testInfo);
  await expect(figure.locator('.gateRunsPending:visible')).toHaveCount(6);
  await expect(guess).toHaveAttribute('aria-pressed', 'false');
  await expect(guess).toBeEnabled();
});

test('replay: the url() fix first still stops at the base tag', async ({ page }, testInfo) => {
  const figure = await ready(page);
  const guess = figure.getByRole('button', { name: gate.predict.options[2], exact: true });
  if (testInfo.project.name.startsWith('mobile')) await guess.tap(); else { await guess.focus(); await guess.press('Enter'); }
  await press(figure.getByRole('button', { name: gate.controls.runTest }), testInfo);
  await press(figure.getByRole('button', { name: gate.controls.runPage }), testInfo);
  await press(figure.getByRole('button', { name: gate.controls.fixData }), testInfo, false);
  await expect(result(figure, '[data-cell="1"]')).toContainText(gate.grid.cells[0].message);
  await expect(result(figure, '[data-cell="2"]')).toBeHidden();
  await expect(figure.locator('.gateRunsGrain')).toBeHidden();
  await press(figure.getByRole('button', { name: gate.controls.other }), testInfo);
  await expect(result(figure, '[data-cell="2"]')).toContainText(gate.grid.cells[2].message);
  await expect(figure.locator('.gateRunsGrain')).toBeVisible();
  await noOverflow(page);
});

test('reduced motion reveals without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const figure = await ready(page);
  await figure.getByRole('button', { name: gate.predict.options[0], exact: true }).click();
  await figure.getByRole('button', { name: gate.controls.runTest }).click();
  await expect(result(figure, '[data-step="test"]')).toHaveCSS('animation-name', 'none');
});
