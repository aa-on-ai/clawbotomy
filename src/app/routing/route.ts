const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Retired example — Clawbotomy</title>
</head>
<body>
  <main>
    <h1>This example has been retired.</h1>
    <p>This retired unsupported example is no longer part of Clawbotomy.</p>
    <p><a href="/bench">Review current public evidence</a></p>
  </main>
</body>
</html>`;

export function GET() {
  return new Response(body, {
    status: 410,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
