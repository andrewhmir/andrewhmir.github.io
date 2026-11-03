# Contact

The final stop: the closing line, the email link, the social row and the dark card painted behind them.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="page"` |
| Render | `js/main.js` | `/* 6 — contact */` · `center: true` |
| Render | `js/main.js` | `class="contact-mail"` · `class="contact-links"` |
| Render | `js/main.js` | `sectionSocial().map` |
| Styles | `css/styles.css` | `── Contact` · `.stop--contact .stop-in::before` |
| Styles | `css/styles.css` | `@media (max-width: 1023px)` · `.contact-mail` |
| Data | `js/data.js` | `email` · `social[].label` · `social[].url!` |
| Test | `tests/page.test.mjs` | `'contact'` |

## Structure

`#contact` is the last `.stop` (`cls: 'stop--contact'`, `side: 'center'`,
`center: true`, art pan `PAN[7]`). Its `.copy.copy--center` holds the eyebrow,
the closing `h2`, a `.lede`, the `.contact-mail` mailto link and `.contact-links`
anchors. `.stop--contact .stop-in::before` paints the dark card; the panel's own
art layer is `.stop::before` and its scrim `.stop::after`.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| The closing heading or sentence | the literals in the `/* 6 — contact */` block of `render()` | read it back; they are not data |
| The email address | `email:` in `js/data.js` — used for both the link text and the `href` | click the mailto link; `npm test` has no email assertion |
| The social row | `social: [` order and entries in `js/data.js` | click each link |
| Card size, radius, blur or darkness | `.stop--contact .stop-in::before` | screenshots at 1440, 1280 and 390 |
| Card at tablet width | the first `@media (max-width: 1023px)` block, immediately after the card rule | a 1023px-wide screenshot |
| The panel painting or crop | `PAN[7]` in `js/main.js` | screenshot; PAN is positional |
| Panel height | inherits the full-screen `.stop-in` minimum; `.stop--contact` only adds its scrim | screenshot at 1280×704 |

## Invariants

- The dark card is a `::before` on `.stop-in` at `z-index: -1` inside a `.stop` that sets `isolation: isolate`; the art is `.stop::before` at -2 and the scrim `.stop::after` at -1. See the art/scrim stacking gotcha in `AGENTS.md`.
- The email text and its `href` both come from `P.email`. The social row maps `sectionSocial()` (`P.social` minus the masthead's `Resume` entry) in array order to plain anchors — no buttons, no icons on this page.
- Contact is the only centred stop: `center: true` is the flag that adds `.copy--center`; the hero passes `side: 'center'` only for its scrim, and its copy stays in `grid-column: 1 / span 8`. In the 1023px block the generic `.copy--center` goes left, but contact's own rule keeps it centred.
- At ≤1023px the card rule widens to `calc(100% - 20px)` and grows to `calc(100% - 12px)` tall. Above 1024 it is 62% tall and at most 780px wide.
- The shell's `<noscript>` fallback hand-copies the email and social URLs; keep it in step when the data changes. [page-shell.md](page-shell.md) owns the fallback, and no test asserts its copy — check the page with JavaScript off.

## Traps

- The card's negative `z-index` depends on `.stop`'s `isolation: isolate`. Removing the isolation lets the card and art escape behind the page, while raising the card to a positive z-index paints it over the scrim; a new positive-z layer inside `.stop-in` hides the art.
- There are two `@media (max-width: 1023px)` blocks. Only the one immediately after the card rule resizes the card; the later fallback block does not. Editing the wrong one shows no tablet change.
- `.stop--contact` no longer shortens the panel: it uses the same full-screen `.stop-in` minimum as every other stop and only adds the dark card and its scrim.
- `P.email` has no fallback: an empty value renders a `mailto:` link with empty text, while the no-JS fallback still shows the old address.
- The social row is not `.btn`s. Adding control classes changes weight and colour unexpectedly because `.contact-links a` owns the styling inside the row.
- `PAN[7]` is positional: a new page stop before Contact shifts it — see the PAN gotcha in `AGENTS.md`.
