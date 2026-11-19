# Allo 1.0.3

Unmodified official fonts by Josh Puckett, SIL Open Font License 1.1 (see OFL.txt).
Source: https://github.com/joshpuckett/allo/tree/60992c5e12a4ad5cad41c54cd8dba370163a4828
Upstream files: `fonts/webfonts/`; hashes checked against `fonts/SHA256SUMS` at that commit.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| AlloVariableFriendly.woff2 | 246388 | b4c4d7229024f6c5ec71bceb31cd15ae179d720194cfa885dac4da2a9a2ad9d4 |
| Allo-Oblique.woff2 | 51332 | da4f8b24e1b49ac7b92f1ac0736229743e66a3296073a53f8e11e8b4a0eb2f64 |
| OFL.txt |  | abd0d6f604be7d1471efaa0bf89bca030d4a666437bfb507b85974d127902690 |

Friendly fixes roundness at 50 and retains weight 100–900 and optical size 9–32.
Use CSS weight and `font-optical-sizing: auto`, not hardcoded axis settings. No stylistic sets are enabled.
The genuine 400 oblique serves existing italic captions, credits and emphasis; current notebook content has no bold-italic role, so no unused bold-oblique file is shipped. Font synthesis is disabled.

The static notebook and generated articles share `public/notebook/typography.css`; the React shell imports the same stylesheet. Felt display roles remain at 720 (the pre-existing oversized legacy story title at 760); article display uses 720, section titles 700, UI 600, reading text 400. Existing measures and line heights remain intact.

Fraunces remains separately licensed in the parent assets directory because the standalone Fetch game intentionally keeps its internal typography. Do not replace that game's font by changing these site roles.
