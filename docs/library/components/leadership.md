# Leadership

The Leadership stop: four cards, each a button that opens the shared record dialog on that record's photographs.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="page"` |
| Render | `js/main.js` | `/* 4 — leadership */` · `P.leadership.map` |
| Render | `js/main.js` | `class="leaders"` · `class="leader"` |
| Render | `js/main.js` | `leader__thumb--empty` · `function isAwaited(` |
| Styles | `css/styles.css` | `── Leadership cards` · `.leader__thumb--empty` |
| Data | `js/data.js` | `leadership[].description!` · `leadership[].year!` · `leadership[].images!` · `leadership[].summary!` |
| Test | `tests/page.test.mjs` | `P.leadership.length, 4` |

## Structure

`#leadership` is one `.stop` panel (`side: 'left'`, art pan `PAN[5]`). Its `.media`
cell holds `.leaders`, a two-column grid of `.leader` buttons. Each button carries
`data-kind="leadership"` and `data-index`, and contains either an
`<img class="leader__thumb">` or a `<span class="leader__thumb leader__thumb--empty">`,
then `.leader__body` with `.leader__year` and `.leader__text`. A click opens
[dialog.md](dialog.md) through the delegated handler on `document` (see
[reveals-chrome.md](reveals-chrome.md)).

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Add, remove or reorder a card | `leadership: [` in `js/data.js` (array order is card order) | `node tests/page.test.mjs` — it pins four records |
| The "four committees and clubs" sentence above the grid | the literal in the `/* 4 — leadership */` block of `render()` | read it back; it is not data |
| A card's photo | `leadership[].images[0]`; later images are dialog-only | card and dialog screenshots |
| The no-photo label | the `leader__thumb--empty` span in `js/main.js` and its rule in CSS | screenshot a record whose `images` is absent |
| Card type, year colour or body text | `.leader__year`, `.leader__text`, `.leader__body` | screenshots at 1440 and 390 |
| Grid columns and gap | `.leaders` (and its one-column rule in the 639px block) | screenshots at 1440 and 390 |

## Invariants

- Four records today; `tests/page.test.mjs` asserts `P.leadership.length === 4`, and the renderer's sentence says "Four committees and clubs", so the count and that prose must move together.
- Every card is a `button` with `data-kind="leadership"` and `data-index`; the shared dialog is the only detail view — see [dialog.md](dialog.md).
- A record with no `images`, or whose first image is `files/PlaceHolder.png`, renders `.leader__thumb--empty` (the `isAwaited` test), never an `<img>`.
- `description` is both the card text and the dialog title; there is no separate `title` field.
- Two columns today and one below 640px. This page has no automated layout check; verify by screenshot at 1440 and 390 (see `AGENTS.md`, Run and verify).

## Traps

- Two different "missing photograph" states. No `images` (or a `PlaceHolder.png` first image) renders the `leader__thumb--empty` span. A path naming a file that is not on disk renders a real `<img>` that swaps to `PlaceHolder.png` via the inline `onerror` fallback — see the missing-photograph gotcha in `AGENTS.md`. Do not treat them as one state.
- `.leader__thumb` is a fixed 84px column and `.leader__thumb--empty` carries its own `display: grid` centring. Dropping the `--empty` class leaves an unstyled 84px span with no border or label.
- The whole card is one button. Adding a link or a second button inside nests interactive elements and splits the click target; photographs beyond the thumb are reached through the dialog.
- `data-index` is the record's index in `P.leadership`, so reordering the array re-points every card's dialog. Re-check the dialog after a reorder.
- The card caption is a single line of `description` with no clamp; a verbose record grows the card and breaks the 2x2 row rhythm.
