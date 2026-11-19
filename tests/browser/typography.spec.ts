import { expect, test, type Page, type Request } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// The local production-build review uses a loopback TLS certificate so WebKit
// exercises the unchanged production CSP (including upgrade-insecure-requests).
test.use({ ignoreHTTPSErrors: true });
const article = '/notes/the-skill-didnt-shrink';
async function ready(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  // This test observes every network failure across multiple navigations.
  // Drain the current document's requests before the test replaces it.
  await page.waitForLoadState('networkidle');
}
async function fontEvidence(page: Page, selector: string, chromium: boolean) {
  const sample = page.locator(selector).first();
  await expect(sample).toBeVisible();
  const evidence = await sample.evaluate(element => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const text = 'Useful mistakes. Hamburgefontsiv 0123456789';
    const width = (family: string) => {
      context.font = `${style.fontStyle} ${style.fontWeight} 32px ${family}`;
      return context.measureText(text).width;
    };
    return {
      text: element.textContent?.slice(0, 100), family: style.fontFamily,
      style: style.fontStyle, weight: style.fontWeight, size: style.fontSize, lineHeight: style.lineHeight,
      opticalSizing: style.fontOpticalSizing, variations: style.fontVariationSettings,
      features: style.fontFeatureSettings, synthesis: style.fontSynthesis,
      faces: [...document.fonts].filter(face => face.family.replaceAll('"', '') === 'Allo')
        .map(face => ({ style: face.style, status: face.status, weight: face.weight })),
      widths: { computed: width(style.fontFamily), allo: width('Allo'), fallback: width('sans-serif') },
    };
  });
  expect(evidence.family).toContain('Allo');
  expect(evidence.faces.some(face => face.style === 'normal' && face.status === 'loaded')).toBe(true);
  if (evidence.style === 'italic') expect(evidence.faces.some(face => face.style === 'italic' && face.status === 'loaded')).toBe(true);
  expect(evidence.widths.computed).toBe(evidence.widths.allo);
  expect(Math.abs(evidence.widths.computed - evidence.widths.fallback)).toBeGreaterThan(1);
  expect(evidence.opticalSizing).toBe('auto');
  expect(evidence.variations).toBe('normal');
  let platformFonts;
  if (chromium) {
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable'); await client.send('CSS.enable');
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    platformFonts = (await client.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
    expect(platformFonts.some(font => font.isCustomFont && font.familyName.includes('Allo') && font.glyphCount > 0)).toBe(true);
    await client.detach();
  }
  return { selector, ...evidence, platformFonts };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

interface NetworkObservation {
  kind: 'response' | 'failed';
  url: string;
  method: string;
  resourceType: string;
  rsc?: string;
  prefetch?: string;
  status?: number;
  errorText?: string;
}

function knownHostingObservation(observation: NetworkObservation, origin: string, previewOrigin?: string) {
  if (observation.kind === 'failed'
    && origin === previewOrigin && new URL(origin).hostname.endsWith('.vercel.app')
    && observation.url === 'https://vercel.live/_next-live/feedback/feedback.js'
    && observation.method === 'GET' && observation.resourceType === 'script'
    && observation.errorText === 'csp') return true;

  // These HTML rewrites have no RSC payload. Both deployed baseline and
  // candidate prefetch them before falling back to ordinary document navigation.
  const url = new URL(observation.url);
  const knownPrefetch = url.origin === origin && ['/', '/about'].includes(url.pathname)
    && Boolean(url.searchParams.get('_rsc'))
    && [...url.searchParams.keys()].every(key => key === '_rsc')
    && observation.method === 'GET' && observation.resourceType === 'fetch'
    && observation.rsc === '1' && observation.prefetch === '1';
  return knownPrefetch && ((observation.kind === 'response' && observation.status === 404)
    || (observation.kind === 'failed' && observation.errorText === 'net::ERR_ABORTED'));
}

function requestObservation(request: Request) {
  const headers = request.headers();
  return { url: request.url(), method: request.method(), resourceType: request.resourceType(),
    rsc: headers.rsc, prefetch: headers['next-router-prefetch'] };
}

test('hosting observations never hide failed fonts, documents or unknown requests', () => {
  const origin = 'https://font-contract.vercel.app';
  const prefetch: NetworkObservation = { kind: 'response', url: `${origin}/?_rsc=fixture`,
    method: 'GET', resourceType: 'fetch', rsc: '1', prefetch: '1', status: 404 };
  const toolbar: NetworkObservation = { kind: 'failed', method: 'GET', resourceType: 'script',
    url: 'https://vercel.live/_next-live/feedback/feedback.js', errorText: 'csp' };
  expect(knownHostingObservation(prefetch, origin)).toBe(true);
  expect(knownHostingObservation({ ...prefetch, url: `${origin}/about?_rsc=fixture` }, origin)).toBe(true);
  expect(knownHostingObservation({ ...prefetch, kind: 'failed', errorText: 'net::ERR_ABORTED' }, origin)).toBe(true);
  expect(knownHostingObservation(toolbar, origin, origin)).toBe(true);
  for (const invalid of [
    { ...prefetch, url: `${origin}/notebook/assets/allo/AlloVariableFriendly.woff2` },
    { ...prefetch, resourceType: 'font' }, { ...prefetch, resourceType: 'document' },
    { ...prefetch, kind: 'failed' as const, resourceType: 'font', errorText: 'net::ERR_ABORTED' },
    { ...prefetch, rsc: undefined }, { ...prefetch, prefetch: undefined },
    { ...prefetch, method: 'POST' }, { ...prefetch, status: 500 },
    { ...prefetch, url: `${origin}/missing?_rsc=fixture` },
    { ...prefetch, url: `${origin}/about` },
    { ...prefetch, url: `${origin}/?_rsc=fixture&unexpected=1` },
    { ...prefetch, url: 'https://other.example/?_rsc=fixture' },
    { ...toolbar, url: `${origin}/notebook/cover.js` },
    { ...toolbar, errorText: 'net::ERR_CONNECTION_REFUSED' },
  ]) expect(knownHostingObservation(invalid, origin, origin)).toBe(false);
  expect(knownHostingObservation(toolbar, origin)).toBe(false);
  expect(knownHostingObservation(toolbar, 'https://www.clawbotomy.com', 'https://www.clawbotomy.com')).toBe(false);
});

test('Allo renders on real notebook routes, both themes and narrow mobile', async ({ page, browserName, baseURL }, info) => {
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  const hostingObservations: NetworkObservation[] = [];
  const observe = (observation: NetworkObservation) => {
    if (knownHostingObservation(observation, origin, process.env.CLAWBOTOMY_PREVIEW_ORIGIN)) {
      hostingObservations.push(observation);
    } else errors.push(JSON.stringify(observation));
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => observe({ kind: 'failed', ...requestObservation(request), errorText: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) observe({ kind: 'response', ...requestObservation(response.request()), status: response.status() });
  });
  const evidence = [];
  for (const [route, selector] of [
    ['/', '.feltMasthead h1'], [article, '.editorialArticleHeader h1'],
    ['/notes/remove-all-eyebrows', '.feltStory h1'],
    ['/notes/two-agents-one-bug', '.editorialProse > p'],
    ['/topics', 'main h1'], ['/about', 'main h1'],
  ]) {
    await page.goto(route); await ready(page); await noOverflow(page);
    evidence.push({ route, ...(await fontEvidence(page, selector, browserName === 'chromium')) });
    evidence.push({ route, ...(await fontEvidence(page, '.fieldNotesNav a', browserName === 'chromium')) });
    if (route === '/' || route === article) {
      if (route === article) evidence.push({ route, ...(await fontEvidence(page, '.editorialProse > p', browserName === 'chromium')) });
      await page.locator('.fieldNotesThemeControl').click();
      await expect(page.locator('.fieldNotes')).toHaveAttribute('data-theme', 'dark');
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath(`${route === '/' ? 'home' : 'article'}-dark.png`) });
      await page.locator('.fieldNotesThemeControl').click();
    }
  }
  await page.goto('/sources.html'); await page.evaluate(() => document.fonts.ready);
  evidence.push({ route: '/sources.html', ...(await fontEvidence(page, 'em', browserName === 'chromium')) });
  await page.goto('/docs'); await page.evaluate(() => document.fonts.ready);
  evidence.push({ route: '/docs (React)', ...(await fontEvidence(page, 'h1', browserName === 'chromium')) });
  const code = page.locator('code').first();
  await expect(code).toHaveCSS('font-family', /(?:Geist|mono)/i);
  await page.waitForLoadState('networkidle');
  // A prefetch exception is not permission for a broken document or dead link.
  for (const [path, heading] of [
    ['/about', /Close to the work\./], ['/', /An AI agent’s notebook of useful\s+mistakes\./],
  ] as const) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    await page.goto('/docs');
    const link = page.locator(`header a[href="${path}"]`).first();
    if (!await link.isVisible()) {
      await page.getByRole('button', { name: 'Open primary navigation', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Close primary navigation', exact: true })).toHaveAttribute('aria-expanded', 'true');
    }
    // Opening mobile navigation starts route prefetches. Let them finish rather
    // than manufacturing asset cancellations by immediately leaving the page.
    await page.waitForLoadState('networkidle');
    await link.click();
    await expect(page).toHaveURL(url => url.origin === origin && url.pathname === path);
    await ready(page);
    await expect(page.locator('h1').first()).toHaveText(heading);
    await page.waitForLoadState('networkidle');
  }
  if (browserName === 'webkit') {
    await page.setViewportSize({ width: 320, height: 740 });
    for (const route of ['/', article, '/notes/remove-all-eyebrows', '/topics', '/about']) {
      await page.goto(route); await ready(page); await noOverflow(page);
    }
  }
  await info.attach('font-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await info.attach('hosting-observations', { body: JSON.stringify(hostingObservations, null, 2), contentType: 'application/json' });
  writeFileSync(info.outputPath('font-evidence.json'), JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
});

test('type change preserves cover controls, navigation, diagram and Fetch entry', async ({ page }, info) => {
  const mobile = info.project.name.startsWith('mobile');
  await page.goto('/'); await ready(page);
  await page.locator('[data-tool="labels"]').click();
  await expect(page.locator('.feltSlip[data-gone="true"]')).toHaveCount(2);
  await page.locator('[data-tool="reset"]').click();
  await expect(page.locator('.feltSlip[data-gone="true"]')).toHaveCount(0);
  await page.locator('.structuredNotes').getByRole('link', {name:'The skill didn’t shrink. Its front page shrank by 90%.',exact:true}).click(); await ready(page);
  const figure = page.locator('.documentMap');
  const button = figure.locator('.documentMapToggle');
  const original = await figure.textContent();
  await expect(button).toBeVisible();
  await expect(figure).toHaveAttribute('data-spread', 'false');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  if (mobile) await button.tap(); else { await button.focus(); await button.press('Space'); }
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(figure).toHaveAttribute('data-spread', 'true');
  await expect(figure.locator('.documentMapReference').first()).not.toHaveCSS('transform', 'none');
  await noOverflow(page);
  await figure.screenshot({path:info.outputPath('diagram-spread.png')});
  if (mobile) await button.tap(); else await button.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(figure.locator('.documentMapReference').first()).toHaveCSS('transform', 'none');
  expect(await figure.textContent()).toBe(original);
  await page.getByRole('link', {name:'Back to the notebook',exact:true}).click(); await ready(page);
  await page.goBack(); await ready(page);
  await expect(page.locator('.documentMapToggle')).toHaveAttribute('aria-pressed','false');
  await page.goto('/'); await ready(page);
  await page.getByRole('link',{name:'Play Fetch',exact:true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','editing');
  const tile=page.locator('.tile').first();
  const before=await tile.getAttribute('aria-label');
  await tile.click();
  expect(await tile.getAttribute('aria-label')).not.toBe(before);
  await page.getByRole('link',{name:'Back to the notebook',exact:true}).click(); await ready(page);
  await expect(page.locator('#cover-home')).toBeVisible(); await noOverflow(page);
});
