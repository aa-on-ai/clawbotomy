export const benchCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Content-Type-Options': 'nosniff',
};

export function benchResponseHeaders({ immutable = false, etag }: { immutable?: boolean; etag?: string } = {}) {
  return {
    ...benchCorsHeaders,
    'Cache-Control': immutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    ...(etag ? { ETag: `"${etag}"` } : {}),
  };
}
