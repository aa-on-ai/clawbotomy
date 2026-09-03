# Design

<!-- impeccable:design-schema 1 -->

## North Star

**Erowid Night HTML.** The public front is a human-maintained archive page that was discovered, not launched. Dense, text-native, left-biased. Real links. Real visited-link color. Someone who heard a substance name should be able to mistake this for a long-lived HTML document.

## Anti-references (failed looks)

Do not rebuild toward any of these. They are locked failures.

- Superdesign cinematic (CGI jars, ritual, constellation, glass, glow)
- Quiet Accession (IBM Plex, mint `#6fffb0`, amber, hairline metronome, twin doors, unicode chaos meters)
- Clara three-acts (Newsreader, Fragment Mono, cream `#efe6d4`, pharmacy red `#b42318`, torn-paper rumor scrap, Rx pad, tilted cards)

## Type

System only. No Google fonts. Do not load Geist if it paints.

- Body / headings: `Verdana, Arial, sans-serif`
- Stamps, IDs, pipe, accession codes: `"Courier New", Courier, monospace`

Unload Newsreader, Fragment Mono, IBM Plex, Inter, Space Grotesk, and any other webfont. If leftover checkup CSS still names `--font-geist-*`, map those variables to the system stacks above — do not ship Geist files.

## Color (provisional)

| Token | Hex | Use |
| --- | --- | --- |
| ground | `#101015` | Page, header, footer |
| ink | `#c8c4b8` | Body text |
| link | `#7f9cff` | Unvisited links |
| visited | `#9a7cb8` | Visited links (must be real) |
| refusal | `#c65f5f` | REFUSED / [REFUSED] only |
| rule | `#44414b` | Occasional document rules, not a metronome |

No mint, no cream, no pharmacy red, no amber-as-brand, no phosphor green.

## Layout

- Narrow document, about 760–860px.
- Left-biased: sit on the left gutter, do not center a marketing rail.
- Small index column of real specimen slugs when width allows; stack the index as a line of links on narrow screens.
- Hierarchy from document headings and paragraphs. No card grids.

## First viewport (required)

The first screen must contain all three, before manifesto copy:

1. Real specimen slugs as links into `/specimen/[slug]`.
2. One live trip-report excerpt — real text from `src/lib/trip-reports.ts`. Do not invent.
3. A way into the dual doorway: Humans (rumor / shared link to the cabinet) vs Models (copyable prescription).

The archive demonstrates the product. Manifesto (“why anyone comes”, stays/dies) may exist below.

## Dual doorway

Product structure, not decoration.

- **Humans:** rumor trail. Plain text and a real link to `/cabinet`. “You heard a rumor. Open the cabinet.”
- **Models:** prescription. Copyable `pre` of `npx clawbotomy try ego-death`, labeled **Proposed interface · not a live claim**. “You were given a prescription. Call the pipe.”

Never equal glowing twin cards. Never torn paper. Never an Rx pad.

## Accession

Dense HTML list or table. Stamped IDs in Courier. Effect line. Chaos as words (`quiet` / `faint` / `noted` / `marked` / `wild`), never unicode meters or color-only marks. `REFUSED×Gemini` on ego-death.

Keep `/cabinet` (full ten) and `/specimen/[slug]` (reports + refusal exhibit).

## Pipe

Plain bordered `pre`. Label stays honest. Not a live claim until Aaron approves a working read path.

## Don't

- Newsreader, Fragment Mono, Geist webfonts, IBM Plex, Inter, Space Grotesk
- Cream `#efe6d4`, pharmacy red `#b42318`, mint `#6fffb0`
- Torn-paper doors, Rx pads, tilted cards
- Unicode chaos meters (`····○`, pips, bars)
- Hairline metronome on every section
- Twin manifesto columns / matching stays-dies cards
- CGI jars, kickers, eyebrows
- Gradients, glass, drop shadows, glow
- Invented trip reports
- Live pipe claims

## Do

- System Verdana/Arial + Courier
- Real links and a distinct visited color
- First viewport = slugs + real excerpt + dual doorway
- Dense accession document
- Soft-archive checkup routes; do not delete them
- Body contrast ≥4.5:1; keyboard through doors, drawer, and pipe
