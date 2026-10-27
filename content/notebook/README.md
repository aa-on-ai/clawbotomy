# Notebook content foundation

`catalog.mjs` is the metadata authority for notebook pages, reserved/retired note
slugs and new approved structured notes. The approved list contains two explicitly approved articles dated 2026-10-27. It contains no private drafts, approval transcripts or evidence
pointers. The three existing bespoke stories remain snapshot-owned, byte-for-byte;
**existing public availability is not retrospective editorial approval**.

The pure Node ESM API lives in `scripts/lib/notebook-content.mjs`. It uses only
Node's built-in crypto module and the catalog. It performs no filesystem writes,
network calls, clock reads, publication, or automatic preview/export operations.
Public consumers are wired through `scripts/lib/notebook-public.mjs` (see below).

## Interchange schema (exact fields)

A draft is a plain data object with all of these fields and no others:

```ts
type Draft = {
  slug: string;
  title: string;
  deck: string;
  author: { name: string; kind: 'ai' };
  disclosure: string;
  blocks: Array<
    | { type: 'paragraph'; text: string }
    | { type: 'heading'; level?: 2 | 3; text: string }
    | { type: 'code'; text: string; language?: 'text' | 'sh' | 'bash' | 'json' | 'yaml' | 'javascript' | 'typescript' | 'python' | 'html' | 'css' }
    | { type: 'list'; ordered?: boolean; items: string[] }
  >;
  sources: Array<{ label: string; url: string }>;
};
type Publication = Draft & { publishedOn: string; updatedOn: string };
type ApprovedNote = Publication & {
  editorial: { status: 'approved'; contentDigest: string };
};
```

- Optional block metadata: an absent heading `level` defaults to `2`; an absent
  list `ordered` defaults to `false`. Explicit invalid/null/undefined values fail.
  Code `language` is optional and restricted to the listed tokens; it is retained
  exactly as a safe `data-language` attribute, with no syntax-highlighting runtime.
  No prose, code text or source URL is changed to accommodate these defaults.
- Drafts have **no publication dates or editorial record**. Preview rejects them
  rather than silently stripping them from a public note.
- Slugs: 1–80 lowercase ASCII letters/digits, separated by single hyphens. No
  normalization, path separators, encoded separators, reserved page/product names,
  existing legacy story slugs, or retired slugs. Catalog collections also reject
  duplicate slugs. Add a removed note's slug to `retiredSlugs` before removing it.
- Dates: required, real `YYYY-MM-DD` calendar dates; `updatedOn >= publishedOn`.
  No timestamps, inferred dates or use of today's date. Calendar validation cannot
  establish whether an operator-supplied date truthfully describes publication.
- All text fields are plain text. HTML-looking strings are escaped as literal
  text, not evaluated. There is no rawHTML, Markdown, arbitrary tag/attribute,
  inline link, media or executable code facility. Code blocks display text only.
- Required text is nonblank; no invalid Unicode or C0 control characters other
  than tab/newline/carriage return. Limits: title 200, deck 1,000, author name 120,
  disclosure 2,000, heading/source label 300, other block/list text 20,000 UTF-16
  code units. There are 1–200 blocks, 1–100 items per list, 0–100 sources.
- Source URLs: at most 2,048 characters; absolute, ASCII HTTPS URLs with a dotted
  DNS hostname. No credentials, IP literals/alternate IP encodings, single-label
  hosts, common local/internal suffixes, nondefault ports, whitespace, control
  escapes, raw quotes/angle brackets/backslashes, or malformed authority repairs.
  The explicit default port 443 is allowed. URL text is preserved, not normalized.
  Unicode path/query text must be percent-encoded. This is a conservative syntax
  gate, **not** a DNS/public-reachability, redirect-safety or secrecy guarantee.
- Unknown fields are rejected at every level, including private IDs, evidence
  pointers and approval transcripts. No hidden/symbol/accessor properties, custom
  prototypes or sparse/extended arrays. Inputs are JSON-style data, not executable
  objects or a sandbox for hostile JavaScript proxies.

Manual review must still catch private information embedded in otherwise allowed
prose, source labels or URLs. Never put real private drafts or approval evidence
in this repository or its public output.

## Approval commitment

`editorial.status === 'approved'` and an exact matching `contentDigest` are required
for every new public entry. Missing, malformed or mismatched commitments abort the
whole operation. Rendering revalidates rather than trusting prior validation.

This is a **deterministic policy check of operator-supplied approval records**,
not a signature, proof of human identity, consent, editorial quality, source
accuracy, date truthfulness or authority to publish. Anyone with the content can
compute the digest. Private/manual authorization must be established independently;
never copy approval evidence into the public interchange object.

The commitment is `sha256:` plus lowercase SHA-256 hex of UTF-8
`JSON.stringify({ schemaVersion: 1, ...canonicalPublication })`, with no whitespace.
Canonical key order is:

1. `schemaVersion`, `slug`, `title`, `deck`, `author`, `disclosure`, `blocks`,
   `sources`, `publishedOn`, `updatedOn`.
2. Author: `name`, `kind`.
3. Paragraph/code: `type`, `text`, then code `language` only when supplied; heading:
   `type`, `level`, `text`; list:
   `type`, `ordered`, `items`.
4. Source: `label`, `url`.

The optional metadata extension preserves every previously valid version-1
commitment: defaulted level/order canonicalize to the formerly required values;
absent language adds no field. Present language is newly accepted and committed,
so adding/changing it invalidates any prior approval hash.

Object input key order does not matter; array order and exact string contents do.
No trimming or Unicode normalization is applied. The digest binds the complete
reader-visible projection—title, deck, byline, AI attribution/disclosure, body,
source labels/URLs and dates—plus slug. The editorial record is not in its own
commitment and is never rendered. A future change to projection semantics must
explicitly version the commitment rather than silently carrying approval forward.

## Exact API

All calls are synchronous. Validation failures throw `NotebookContentError` with
`code === 'INVALID_NOTEBOOK_CONTENT'`. No supplied content values are interpolated
into error messages. Returned data is detached and recursively frozen; inputs are
not mutated or frozen.

- `validateDraft(draft) -> Draft`: validates and returns a canonical-order copy.
- `computeNoteDigest(publication) -> string`: accepts exactly draft fields plus
  the two supplied dates, **without** `editorial`. Computes a commitment; does not
  approve, modify or publish anything.
- `validateApprovedNote(entry) -> ApprovedNote`: schema/date/URL/slug/approval check.
- `renderApprovedNote(entry) -> string`: validates again and returns a safe semantic
  `<article>` fragment. Uses existing `fieldNotesView`, `editorialArticle`,
  `editorialArticleHeader`, `editorialDeck`, `editorialByline`, `editorialProse`,
  `editorialSources` classes. It is not a full page or a legacy snapshot composer.
- `renderDraftPreview(draft) -> { status: 'unapproved', indexable: false,
  robots: 'noindex, nofollow', html: string }`: separate local-preview API. HTML
  visibly says **Unapproved draft — local preview only. Not published.**, has no
  dates, and contains `data-editorial-status="unapproved"`. It returns no public
  route or canonical URL and never registers a page or writes a file. The caller
  must keep previews off public routes/exports and apply the robots metadata;
  `noindex` is not an access-control boundary.
- `loadNotebookCatalog(options?) -> Catalog`: exact optional keys are
  `approvedNotes` (complete candidate list, default the repository list) and
  `retiredSlugs` (additional retired names, default empty). Extra retirement names
  extend, never replace, repository policy. Duplicate retirement names fail.
  Every candidate must pass; there is no silent filtering of drafts/invalid notes.
  Input list order is preserved. One-entry validators/renderers enforce repository
  slug policy; collection duplicates and extra retirement policy are enforced here.
  Public integration must load the complete catalog before rendering/exporting.

Catalog result:

```ts
type Catalog = {
  pages: Page[];
  pagesByKey: Record<string, Page>;
  routes: Record<string, Page>;        // canonical and alias routes -> same page
  aliases: Record<string, string>;    // route -> pageKey, for snapshot integration
  canonicalPaths: Record<string, string>; // pageKey -> canonical route
  approvedNotes: ApprovedNote[];      // exact validated entries, including blocks
  approvedSummaries: Array<{
    slug: string; route: string; pageKey: string; title: string; deck: string;
    author: Draft['author']; disclosure: string;
    publishedOn: string; updatedOn: string;
  }>;
  retiredSlugs: string[];
};
```

Legacy page descriptors contain `pageKey`, `route`, `aliases`, `title`,
`snapshotTitle`, `kind: 'legacy-page' | 'legacy-story'`,
`publicState: 'existing-public'`, `editorialStatus: 'not-assessed'`, `snapshotDate`
and `sitemapLastModified`. They have no fabricated `publishedOn`/`updatedOn`.
`home.title` preserves the current cover title; `home.snapshotTitle` preserves the
underlying snapshot title. `snapshotDate` records only the original month-precision
snapshot label, not a newly asserted publication date. The existing sitemap's
`2026-09-24` constant is retained separately, not reinterpreted.

New page descriptors contain `pageKey: 'note:' + slug`, `route: '/notes/' + slug`,
`aliases: []`, `title: note.title + ' | Clawbotomy field notes'`,
`kind: 'approved-note'`, `publicState: 'approved-for-publication'`,
`editorialStatus: 'approved'`, `publishedOn`, `updatedOn`. Approval is not a claim
that deployment occurred. Summaries contain plain text, not preescaped markup.
Use the renderer (or context-appropriate escaping), never raw summary interpolation.

## Small synthetic example

For schema demonstration only, not a real draft or authorization:

```js
import { validateDraft, renderDraftPreview, loadNotebookCatalog }
  from './scripts/lib/notebook-content.mjs';

const draft = {
  slug: 'synthetic-example',
  title: 'Synthetic schema example',
  deck: 'Not a publication candidate.',
  author: { name: 'Fixture AI', kind: 'ai' },
  disclosure: 'Synthetic AI test data only.',
  blocks: [{ type: 'paragraph', text: '<script> stays text.' }],
  sources: [],
};

validateDraft(draft); // same field values in a detached, frozen object
const preview = renderDraftPreview(draft);
preview.status;      // 'unapproved'
preview.indexable;   // false
preview.robots;      // 'noindex, nofollow'
// preview.html contains <p>&lt;script&gt; stays text.</p> and the visible warning.
loadNotebookCatalog().approvedNotes; // the two dated public-approved articles
loadNotebookCatalog({ approvedNotes: [] }).approvedNotes; // explicit empty-state test seam
```

Synthetic approval-policy fixtures live only under `tests/fixtures/`; their status
values exercise parsing and are not records of real editorial approval.

## Public integration and build contract

- `notebookRewrites()` supplies exact notebook rewrites to Next. No wildcard
  structured-note rewrite is introduced; unknown, unapproved and retired slugs remain 404.
- `notebookSitemap()` supplies all notebook URLs (including the existing `/notes`
  alias) and preserves legacy `2026-09-24` last-modified values. Product paths keep
  their original dates and behavior. New entries use the supplied `updatedOn`.
- `/notebook/catalog.json` is a Next **force-static build-time** metadata response.
  It supplies canonical paths, aliases, descriptors and approved summaries to
  `cover.js`/`runtime.js`; archival snapshot aliases/titles are not a live authority.
  It includes both approved summaries; the explicit empty test state still supports legacy navigation.
- `npm run build` runs `scripts/build-notebook.mjs` through `prebuild`.
  `npm run dev` uses the guarded lifecycle below. Do not bypass these entry points
  with direct `next build`/`next dev` invocations.
  The exporter validates the entire catalog and renders before writing. It refuses
  existing symlink/non-directory output paths or ancestors before mutation, and
  deletes using a native path without a trailing separator. This is not atomic
  protection against concurrent filesystem swaps: do not alter output/ancestor
  paths during generation. It replaces only its owned ignored
  `public/notebook/generated/` directory. Empty catalog:
  **directory absent, no note JSON/HTML generated**. Populated catalog: `notes.json`
  with rendered page fragments plus one complete HTML document per approved slug.
  Repeated generation is byte-deterministic. There are no clocks, environment
  publication switches, private-file loaders or runtime approval overrides.
- The three snapshot story HTML strings, index HTML, original CSS, toys and assets
  remain unchanged. `cover.js` still owns their existing bespoke composition. New
  `note:*` pages skip it: text, byline, supplied dates, disclosure and sources render
  in an independent semantic shell styled by `structured.css`. They are linked from
  the cover index. Direct loads have escaped metadata, canonical URL and readable
  article HTML even without JavaScript. Index enhancement still requires JavaScript,
  as the original snapshot notebook did.
- `note-001` through `note-004` are explicitly retired, as established by the
  existing browser regression contract. They cannot be reintroduced as approvals.
- Public projections contain no approval commitments or private review evidence.
  Allowed prose still needs manual privacy/fact review; schema checks cannot prove
  authorization, historical truth, or public source safety.

## Supported live development (fail-stop, not hot publication)

On POSIX systems use `npm run dev -- --hostname 127.0.0.1 --port 3000`.
The wrapper forwards `--hostname`/`-H` and `--port`/`-p` (also long `=value`
forms); it rejects alternate project directories and other flags before generation.
This intentionally narrow command always owns this repository's catalog/output.
Windows process-group handling and arbitrary Next CLI options are not supported.

The wrapper monitors **`content/notebook/catalog.mjs` itself**, starting before
validation/generation. A content or filesystem-identity change, replacement,
deletion or read failure latches a nonzero shutdown of the entire owned Next
process group. Invalid edits stop it too; they are not parsed as permission to
continue serving the previous approval. There is no automatic restart. A fresh
`npm run dev` validates/regenerates before Next starts, so retirement removes both
canonical routes and direct generated HTML/JSON. A failed validation never starts
a new server. SIGINT/SIGTERM and Next exit also clean up the owned child group.

Detection polls at 100 ms; shutdown signals the group and escalates after a short
grace period. This is **not instantaneous, race-proof revocation**, nor does it
retract an already loaded browser document. Do not hot-edit imported catalog data
modules: stop dev first for those changes. This is a one-file lifecycle guard, not
a general dependency watcher. Production remains an immutable build/start path;
regenerate/rebuild before starting a changed catalog. No production CSP is changed.

Local previews remain outside this repository/public tree. Use `renderDraftPreview`
with an unpublished warning and noindex metadata; do not mint dates or approval to
render them. Portable review wrappers must not include raw evidence or local paths.

```sh
node --experimental-strip-types --test tests/notebook-content.test.js tests/notebook-public.test.js tests/notebook-build.test.js tests/notebook-dev.test.js
npm test
npm run test:openclaw
npm run lint
npm run build
```

`tests/browser/notebook-catalog.spec.ts` exercises the two-entry release catalog,
metadata, direct detail loads, index/back navigation, retired routes and legacy
stories. Run it against the built server alongside the existing browser suites.
Negative/lifecycle publication tests use explicit empty and synthetic catalogs in
isolated temporary copies, never runtime flags or private drafts. The default
contract pins the two public-approved commitments, dates and routes. Never commit
generated test fixtures or private evidence. Any later publication needs its own
authorization; a matching digest alone is not permission.
