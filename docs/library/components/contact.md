# Contact

The final stop: the closing line, the obfuscated email copy button, the social row and the dark card painted behind them.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="page"` |
| Render | `js/main.js` | `/* 6 — contact */` · `center: true` |
| Render | `js/main.js` | `class="contact-mail"` · `class="contact-mail__note"` |
| Render | `js/main.js` | `sectionSocial().map` |
| Styles | `css/styles.css` | `── Contact` · `.stop--contact .stop-in::before` |
| Styles | `css/styles.css` | `@media (max-width: 1023px)` · `.contact-mail` |
| Data | `js/data.js` | `email` · `social[].label` · `social[].url!` |
| Test | `tests/page.test.mjs` | `'contact'` |

## Structure

`#contact` is the last `.stop` (`cls: 'stop--contact'`, `side: 'center'`,
`center: true`, art pan `PAN[8]`). Its `.copy.copy--center` holds the eyebrow,
the closing `h2`, a `.lede`, the `.contact-mail` copy button, its
`.contact-mail__note` status line and the `.contact-links` anchors.
`.stop--contact .stop-in::before` paints the dark card; the panel's own art
layer is `.stop::before` and its scrim `.stop::after`.

The email is a `<button type="button" data-copy="…">`, not an anchor: a click
copies the real address with `navigator.clipboard.writeText`, falling back to a
hidden textarea and `document.execCommand('copy')` where the clipboard API is
unavailable. Nothing opens a mail app. The printed label is obfuscated —
`emailText()` derives `andrew [dot] alangcao [at] gmail [dot] com` from
`P.email` — so neither the shell nor the rendered DOM prints a bare address.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| The closing heading or sentence | the literals in the `/* 6 — contact */` block of `render()` | read it back; they are not data |
| The email address | `email:` in `js/data.js` — the copy value; the printed label is derived from it | click it; the clipboard holds the real address |
| The obfuscated label | `emailText()` in `js/main.js` | read the rendered line; it must contain no `@` or bare dot |
| The "Click to copy" hint and reset | the `.contact-mail__note` text in `render()` and the reset string in `wireEmailCopy()` | click it; the note flips to "Copied to clipboard" and back |
| The social row | `social: [` order and entries in `js/data.js` | click each link |
| Card size, radius, blur or darkness | `.stop--contact .stop-in::before` | screenshots at 1440, 1280 and 390 |
| Card at tablet width | the first `@media (max-width: 1023px)` block, immediately after the card rule | a 1023px-wide screenshot |
| The panel painting or crop | `PAN[8]` in `js/main.js` | screenshot; PAN is positional |
| The copy confirmation colour | `.contact-mail__note.is-copied` | click the email; the line turns gold |

## Invariants

- The dark card is a `::before` on `.stop-in` at `z-index: -1` inside a `.stop` that sets `isolation: isolate`; the art is `.stop::before` at -2 and the scrim `.stop::after` at -1. See the art/scrim stacking gotcha in `AGENTS.md`.
- The printed label and the copied value both come from `P.email` — never hard-code either. `data-copy` carries the real address; the button has no `href`, so it cannot navigate.
- `.contact-mail` is a `<button>` restyled as display type, not a `.btn`: it keeps the page-wide `:focus-visible` ring, so keyboard focus stays visible.
- The obfuscated label is much longer than a raw address (three bracketed tokens), so the type is `clamp(17px, 2vw, 30px)` and may wrap; restoring the old `clamp(24px, 3vw, 42px)` overflows the card at 1280.
- Contact is the only centred stop: `center: true` adds `.copy--center`; the hero passes `side: 'center'` only for its scrim, and its copy stays in `grid-column: 1 / span 8`. In the 1023px block the generic `.copy--center` goes left, but contact's own rule keeps it centred.
- The shell's `<noscript>` fallback carries the same obfuscated line as plain text, not a `mailto:`, so the literal address stays out of the shipped HTML. [page-shell.md](page-shell.md) owns the fallback; no test asserts its copy — check the page with JavaScript off.

## Traps

- The card's negative `z-index` depends on `.stop`'s `isolation: isolate`. Removing the isolation lets the card and art escape behind the page, while raising the card to a positive z-index paints it over the scrim.
- There are two `@media (max-width: 1023px)` blocks. Only the one immediately after the card rule resizes the card; editing the later fallback block shows no tablet change.
- `navigator.clipboard` needs a secure context (`https` or `localhost`). The `legacyCopy()` textarea route covers `file://` and old browsers — removing it makes the click fail silently when the page is opened from disk.
- `P.email` has no fallback: empty data copies an empty string and prints an empty button.
- The social row is not `.btn`s. Adding control classes changes weight and colour unexpectedly because `.contact-links a` owns the styling inside the row.
- `text-align: center` on `.copy--center` does not centre a block child that carries its own measure: the closing `.lede` stays 32ch wide, so `.copy--center .lede` auto-centres it. Dropping that rule leaves the sentence visibly left of the heading and the email.
- `PAN[8]` is positional: a new page stop before Contact shifts it — see the PAN gotcha in `AGENTS.md`.
