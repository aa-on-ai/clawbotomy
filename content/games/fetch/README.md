# Fetch

An untimed illustrative puzzle connected to **Two agents. One bug.** It is not a replay, a new operational experiment, or evidence that the historical patch worked. The three levels, model, artwork, layout and puzzle interactions are the accepted Fetch design.

## Maintain and run

- `game.html`: document, controls, disclosure and build slots.
- `style.css`: accepted styling with one measured text-contrast correction (font URLs are substituted at build time).
- `model.js`: dependency-free canonical game model, unchanged. No separate renderer simulation.
- `game.js`: DOM controller, input, sound, animation and navigation lifecycle.
- `scripts/build-fetch.mjs` (from the repository root): deterministic document generator, no dependencies or asset copies.

Use Node 22, `npm ci`, then `npm run dev`. Open `/play/fetch`. Supported dev startup generates the game before starting Next; after editing game sources run `npm run build:fetch` and reload, or restart dev. Production `npm run build` regenerates the game in `prebuild`; `npm start` serves that build. `public/play/fetch.html` is ignored generated output, never the sole maintained source. Its canonical URL is `/play/fetch`, implemented as a Next before-files rewrite, not an iframe.

Run `node --test tests/fetch-*.test.js`, `npm run test:ui -- tests/browser/fetch.spec.ts`, then the repository's core, lint, build and full browser gates. Playwright exercises actual clicks/taps/keyboard, partial failure, all three deliveries, replay, reduced motion, cancellation and return navigation. Fixed solution fixtures exist only in tests; no solve/advance hook ships in the page. The diagnostic snapshot is read-only.

## Integration boundary

The live notebook uses `public/notebook/cover.js` after navigation, with story HTML from `snapshot.json`. That hook adds same-tab Play Fetch links to the Two Agents home card and article. The existing stretched story link remains; the independent Play link sits above its hit area. The snapshot, article paragraphs, illustrations, comparison diagram, sources and disclosure are not rewritten. No catalog schema extension or React article substitute is involved.

Return links are root-relative and same-tab so local and preview origins stay local. The game remains intentionally light themed, as accepted. Page hide invalidates the pending delivery epoch and restores an in-progress chapter to its initial editable state, including on BFCache restoration; completed or edited idle states are not reset. Audio is suspended while away. Model rules, timings and chapter layouts are unchanged.

## Accepted-source provenance and exact deltas

The accepted standalone `index.html` SHA-256 was `49fad16449777050168732756abc8e307fd241d9b522dabf57457eb8df4e2ed9`. It was generated from separate HTML, CSS, model and controller files, not recovered from an opaque blob. The original standalone workspace is not a build dependency.

Accepted source hashes:

| Source | SHA-256 |
| --- | --- |
| `model.js` (unchanged) | `6e78761293bb5e88de082db615243cfaffb7d40131c515b563000205ad995343` |
| original `style.css` | `217aa34b63904acb210819466e71246559164ec4653bf97b17127f7abdf7c35b` |
| original `game.js` | `6c625f8ef62912a8583fbbfc68bb80132b99eac84dc8df2780861782438b7ad0` |
| original `game.html` | `5704c4513794cd1a35ed15a3c493a688107d3d1371531ea7dd0b287ed050cd04` |

Only these accepted-source deltas were made:

1. HTML: canonical/social metadata and existing site favicon.
2. HTML: wordmark and article links use root-relative same-tab destinations; the wordmark has a notebook-return accessible label.
3. HTML: no-JavaScript copy describes the hosted route rather than claiming a downloadable offline artifact.
4. Controller: one `pagehide` handler cancels abandoned delivery and suspends audio for same-tab navigation.
5. CSS: the two “Waiting for a copy” labels use `#6f6d5c` instead of `#777563` against `#faf6eb`. Browser Axe found the accepted color at 4.31:1, below the 4.5:1 text threshold; the new color is 4.84:1. Every other CSS byte is unchanged, enforced by a regression hash with that single substitution reversed.
6. Packaging: replace embedded base64 fonts/images with the exact existing same-origin asset URLs. The model remains byte-identical; the tested controller is inlined verbatim. No redesign, level edit, new mechanic or binary duplication.

## Shared assets

All six resources already existed in `public/notebook/assets/`; byte equality to the accepted embedded resources is pinned in `tests/fetch-integration.test.js`.

| Accepted asset | Existing repository resource |
| --- | --- |
| `fraunces.woff2` | `/notebook/assets/fraunces.woff2` |
| `geist-sans.woff2` | `/notebook/assets/asset0.woff2` |
| `asset6.webp` (Hermy) | `/notebook/assets/asset6.webp` |
| `asset11.webp` (Clawc) | `/notebook/assets/asset11.webp` |
| `cast-clawc.webp` (portrait) | `/notebook/assets/cast-clawc.webp` |
| `asset9.webp` (disclosure illustration) | `/notebook/assets/asset9.webp` |

No external font/image host or account is needed. Existing CSP applies unchanged. The game source is registered in the editorial-notebook claims lane and its canonical route appears in the sitemap.
