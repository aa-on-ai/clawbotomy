import { notebookBrowserCatalog } from '../../../../scripts/lib/notebook-public.mjs';

// Build-time projection, not a runtime approval switch or filesystem draft loader.
export const dynamic = 'force-static';
export function GET() {
  return Response.json(notebookBrowserCatalog());
}
