import type { Page, Request } from '@playwright/test';

export interface NetworkObservation {
  kind: 'response' | 'failed';
  url: string;
  method: string;
  resourceType: string;
  rsc?: string;
  prefetch?: string;
  status?: number;
  contentType?: string;
  documentFallbackVerified?: boolean;
  errorText?: string;
}

export function knownHostingObservation(observation: NetworkObservation, origin: string, previewOrigin?: string) {
  if (observation.kind === 'failed'
    && origin === previewOrigin && new URL(origin).hostname.endsWith('.vercel.app')
    && observation.url === 'https://vercel.live/_next-live/feedback/feedback.js'
    && observation.method === 'GET' && observation.resourceType === 'script'
    && observation.errorText === 'csp') return true;

  // These HTML rewrites have no RSC payload. Both deployed baseline and
  // candidate prefetch them before falling back to ordinary document navigation.
  const url = new URL(observation.url);
  const knownRscRoute = url.origin === origin && ['/', '/about'].includes(url.pathname)
    && Boolean(url.searchParams.get('_rsc'))
    && [...url.searchParams.keys()].every(key => key === '_rsc')
    && observation.method === 'GET' && observation.resourceType === 'fetch'
    && observation.rsc === '1';
  const prefetch = observation.prefetch === '1'
    && ((observation.kind === 'response' && observation.status === 404)
      || (observation.kind === 'failed' && observation.errorText === 'net::ERR_ABORTED'));
  // Development mode fetches on click rather than prefetching. A 200 HTML
  // response causes a full-document fallback, cancelling the unused RSC body.
  // Accept only the exact request tied to a separately verified document load.
  const documentFallback = observation.prefetch === undefined
    && observation.kind === 'failed' && observation.errorText === 'net::ERR_ABORTED'
    && observation.status === 200 && observation.contentType?.split(';')[0].trim() === 'text/html'
    && observation.documentFallbackVerified === true;
  return knownRscRoute && (prefetch || documentFallback);
}

export function requestObservation(request: Request) {
  const headers = request.headers();
  return { url: request.url(), method: request.method(), resourceType: request.resourceType(),
    rsc: headers.rsc, prefetch: headers['next-router-prefetch'] };
}

export interface ConsoleObservation {
  text: string;
  location: { url: string; lineNumber: number; columnNumber: number };
  argumentCount: number;
}
export interface CspObservation {
  documentURI: string;
  blockedURI: string;
  effectiveDirective: string;
  disposition: string;
}

export function knownHostingConsole(
  message: ConsoleObservation, observations: NetworkObservation[], csp: CspObservation[],
  origin: string, previewOrigin?: string,
) {
  // Browser-generated resource errors have no JS arguments. App console.error
  // calls (even with identical text) must remain blocking.
  if (message.argumentCount !== 0) return false;
  if (/^Failed to load resource: the server responded with a status of 404 \(Not Found\)$|^Failed to load resource: the server responded with a status of 404 \(\)$/.test(message.text)) {
    return message.location.lineNumber === 0 && message.location.columnNumber === 0
      && observations.some(observation => observation.url === message.location.url
        && observation.kind === 'response' && observation.status === 404
        && knownHostingObservation(observation, origin, previewOrigin));
  }
  const toolbar = 'https://vercel.live/_next-live/feedback/feedback.js';
  const webkit = `Refused to load ${toolbar} because it does not appear in the script-src directive of the Content Security Policy.`;
  const chromium = `Refused to load the script '${toolbar}' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.`;
  if (message.text.trim() !== webkit && message.text.trim() !== chromium) return false;
  // WebKit may block before emitting a network request. Require the browser's
  // enforced CSP event for that exact script/document, not just console wording.
  return csp.some(event => new URL(event.documentURI).origin === origin
    && event.disposition === 'enforce'
    && ['script-src', 'script-src-elem'].includes(event.effectiveDirective)
    && knownHostingObservation({ kind: 'failed', url: event.blockedURI,
      method: 'GET', resourceType: 'script', errorText: 'csp' }, origin, previewOrigin));
}

export async function collectHostingObservations(page: Page, origin: string, previewOrigin?: string) {
  const pageErrors: string[] = [];
  const consoleErrors: ConsoleObservation[] = [];
  const network: NetworkObservation[] = [];
  const csp: CspObservation[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(),
      location: message.location(), argumentCount: message.args().length });
  });
  page.on('requestfailed', request => network.push({ kind: 'failed',
    ...requestObservation(request), errorText: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) network.push({ kind: 'response',
      ...requestObservation(response.request()), status: response.status() });
  });
  await page.exposeBinding('__recordHostingCsp', ({ frame }, event: CspObservation) => {
    if (frame === page.mainFrame()) csp.push(event);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      if (!event.isTrusted) return;
      const record = (window as unknown as {
        __recordHostingCsp: (event: CspObservation) => Promise<void>;
      }).__recordHostingCsp;
      void record({ documentURI: event.documentURI, blockedURI: event.blockedURI,
        effectiveDirective: event.effectiveDirective, disposition: event.disposition });
    });
  });
  return () => {
    const networkDisposition = network.map(observation => ({ observation,
      knownHosting: knownHostingObservation(observation, origin, previewOrigin) }));
    const consoleDisposition = consoleErrors.map(observation => ({ observation,
      knownHosting: knownHostingConsole(observation, network, csp, origin, previewOrigin) }));
    return { pageErrors, consoleErrors, network, csp, networkDisposition, consoleDisposition,
      errors: [...pageErrors,
        ...networkDisposition.filter(item => !item.knownHosting).map(item => JSON.stringify(item.observation)),
        ...consoleDisposition.filter(item => !item.knownHosting).map(item => JSON.stringify(item.observation))] };
  };
}
