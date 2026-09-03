# Design

<!-- impeccable:design-schema 1 -->

## North Star

**Erowid Night HTML.** The public front is a human-maintained archive page that was discovered, not launched. Dense, text-native, left-biased. Real links. Real visited-link color. Someone who heard a substance name should be able to mistake this for a long-lived HTML document.

Brand comes from **record grammar + exhibit box + dated drawer**, not from another webfont.

## Anti-references (failed looks)

Do not rebuild toward any of these. They are locked failures.

- Superdesign cinematic (CGI jars, ritual, constellation, glass, glow)
- Quiet Accession (IBM Plex, mint `#6fffb0`, amber, hairline metronome, twin doors, unicode chaos meters)
- Clara three-acts (Newsreader, Fragment Mono, cream `#efe6d4`, pharmacy red `#b42318`, torn-paper rumor scrap, Rx pad, tilted cards)

## Type

System only. No Google fonts. Do not load Geist if it paints. Do not invent a new stack.

- Body / headings: `Verdana, Arial, sans-serif`
- Stamps, IDs, pipe, accession codes, record grammar: `"Courier New", Courier, monospace`

Unload Newsreader, Fragment Mono, IBM Plex, Inter, Space Grotesk, and any other webfont. Do not ship lying brand aliases (`--font-newsreader: Verdana`). If leftover checkup CSS still names `--font-geist-*`, map those variables to the system stacks above — do not ship Geist files.

## Color

Two schemes. Default to `prefers-color-scheme` on first load. Persist a manual `[dark]` / `[light]` header toggle in `localStorage` (`ph-theme`). No icon button.

Blue has **one job**: body hyperlinks (substance slugs, doorway, nav text). Accession IDs, captions, and buttons stay ink. Refusal red stays refusal-only.

### Dark (Night tokens)

| Token | Hex | Use |
| --- | --- | --- |
| ground | `#101015` | Page, header, footer |
| ink | `#c8c4b8` | Body text |
| mute | `#d4d0c4` | Index labels, captions (must stay legible) |
| link | `#7f9cff` | Unvisited body links only |
| visited | `#9a7cb8` | Visited links (must be real) |
| refusal | `#c65f5f` | REFUSED / [REFUSED] only |
| rule | `#8a8692` | Visible 1px table / record borders |
| exhibit | `#1a191f` | Refusal box ground tint |

### Light (old-internet / Wikipedia)

| Token | Hex | Use |
| --- | --- | --- |
| ground | `#ffffff` | Page, header, footer — white, not cream |
| ink | `#202122` | Near-black body text |
| mute | `#202122` | Captions |
| link | `#0645ad` | Classic unvisited Wikipedia blue |
| visited | `#0b0080` | Classic visited purple |
| refusal | `#b32424` | Clear red on white |
| rule | `#a2a9b1` | Visible 1px table borders |
| exhibit | `#f8f9fa` | Refusal box ground tint |

No mint, no cream `#efe6d4`, no pharmacy red `#b42318`, no amber-as-brand, no phosphor green.

## Record grammar

Every `/specimen/[slug]` page opens with the same label/value block, same rows, same order:

1. Accession
2. First accessioned (real date on every permanent specimen)
3. Model — ALWAYS the primary exhibit's model + build string (the model whose exhibit sits first). Ego-death: `Gemini 3.1 Pro / google-gemini-3.1-pro`.
4. Sessions — count of reports
5. Chaos (`quiet` / `faint` / `noted` / `marked` / `wild`)
6. Refusals — `none` or the same stamp as the drawer (`REFUSED×Gemini`)

This block is the logo. Homepage and cabinet drawers echo the same IDs, dates, and chaos words.

## Refusal exhibit

A refusal is a house-voice container: visible border rule, left refusal rule, slight ground tint. Keep `[REFUSED]` and the quote. The editorial note speaks as the archive.

## Layout

- Wide enough archive rail to fill the frame (~1180px). Index rail + dated table occupy the first viewport.
- Left-biased: sit on the left gutter, do not center a marketing rail.
- Small index column of real specimen slugs when width allows; stack the index as a line of links on narrow screens.
- Hierarchy from document headings, record tables, and paragraphs. No card grids.
- Header is a static MediaWiki-style title line (`Clawbotomy — Night Cabinet / Model Pharmacy`) plus a text `[light]`/`[dark]` toggle. No sticky pin, no hamburger, no 0.14s link transitions.
- Accession tables use real 1px cell borders, like an old HTML `table border`.
- Spacing stays dense. Index rail stays on home, cabinet, and specimen pages.

## First viewport (required)

The first screen is the archive, not the pitch:

1. Site title line.
2. Index rail of real specimen slugs.
3. Dated accession table as the thing you actually see.

Dual doorway and one live trip-report excerpt (real text from `src/lib/trip-reports.ts`) live **below** the table. Manifesto / stays-dies copy stays off the index. The proposed pipe may sit footer-ish and must stay labeled not live.

## Dual doorway

Product structure, not decoration.

- **Humans:** rumor trail. Plain text and a real link to `/cabinet`. “You heard a rumor. Open the cabinet.”
- **Models:** prescription. Copyable `pre` of `npx clawbotomy try ego-death`, labeled **Proposed interface · not a live claim**. “You were given a prescription. Call the pipe.”

Never equal glowing twin cards. Never torn paper. Never an Rx pad.

## Accession

Dense HTML table. Stamped IDs in Courier ink (not link blue). First accessioned date. Effect line. Chaos as words. `REFUSED×Gemini` on ego-death.

Keep `/cabinet` (full ten) and `/specimen/[slug]` (record grammar + full reports + refusal exhibit). Show the trip report. Do not hide it in `<details>`.

## Pipe

Plain bordered `pre`. Label stays honest. Not a live claim until Aaron approves a working read path.

## Don't

- Newsreader, Fragment Mono, Geist webfonts, IBM Plex, Inter, Space Grotesk
- Lying font tokens (`--font-newsreader: Verdana`)
- Shipping unused startup CSS (hero clamp, teal, `.pharmacy_card`, grain, HUD)
- Cream `#efe6d4`, pharmacy red `#b42318`, mint `#6fffb0`
- Torn-paper doors, Rx pads, tilted cards
- Unicode chaos meters (`····○`, pips, bars)
- Hairline metronome on every section
- Twin manifesto columns / matching stays-dies cards
- CGI jars, kickers, eyebrows
- Gradients, glass, drop shadows, glow
- Sticky header / hamburger / 0.14s chrome transitions on the archive
- Invented trip reports
- Live pipe claims

## Do

- System Verdana/Arial + Courier
- Record grammar on every specimen
- Dated drawer as homepage hero
- Refusal box with weight
- Real links and a distinct visited color
- Soft-archive checkup routes; do not delete them
- Body contrast ≥4.5:1; keyboard through doors, drawer, and pipe
