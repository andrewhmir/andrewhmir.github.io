# News stop

The News stop, `#news`: the dated update rows from `PORTFOLIO.news`, newest
first, with no photographs and nothing to open.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a href="#news">` |
| Render | `js/main.js` | `/* 2 — news */` · `class="news"` |
| Render | `js/main.js` | `P.news.map` · `news-row__date` |
| Render | `js/main.js` | `cls: 'stop--list stop--news'` |
| Styles | `css/styles.css` | `── News list` · `.news-row__date` |
| Styles | `css/styles.css` | `.stop--news .copy` |
| Data | `js/data.js` | `news[].date!` · `news[].text!` |
| Data | `js/data.js` | `news[].images` |
| Test | `tests/page.test.mjs` | `'news'` |

## Structure

`#news` is a `.stop.stop--list.stop--news` panel (`side: 'right'`, art pan
`PAN[2]`). It has **no `.media` cell**: the rows sit in the copy column, on the
dark side of the scrim, and `.stop--news .copy` widens that column to
`grid-column: 6 / span 7` so the rows have room. The copy holds the eyebrow
`02 · News`, the `h2`, one `.body` line, then `<ol class="news">` with one
`<li class="news-row">` per entry, each holding `.news-row__date` and
`.news-row__text`.

Rows are inert: list items, not buttons, with no `data-kind`/`data-index`. The
masthead menu links `#news` and `buildRail` labels the stop "News"; the rest of
the panel is shared with the other stops.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Add, remove or reword an update | `news: [` in `js/data.js`; array order is page order, newest first by hand | `node tests/page.test.mjs` — it pins four rows |
| The copy column width | `.stop--news .copy` (`grid-column: 6 / span 7`) | screenshots at 1440, 1280 and 390 |
| The date column width or type | `.news-row` (`grid-template-columns: 108px 1fr`), `.news-row__date` | screenshots at 1440 and 390 |
| Row text size or colour | `.news-row__text` | screenshot over the panel's crop |
| The eyebrow, heading or body line | the literals in `/* 2 — news */` | screenshot |
| The painting or crop | the news entry in `PAN` (position 2); `PAN` is positional | screenshots; the copy side still readable |
| What a row does | nothing — rows are not interactive; a news record is not implemented | click a row; nothing opens |
| The stop's place in page order | `/* 2 — news */` in `render()`; the label in `buildRail` | the rail order and the masthead menu |

## Invariants

- Four rows, newest first: the renderer never sorts, so the order in `js/data.js` is the order on the page, and `tests/page.test.mjs` pins the count.
- A row is not a control. There is no news dialog: `news[].images` has no reader and none of the referenced `files/news-*.jpg` paths exist on disk.
- The rows live on the dark side of the scrim by placing them in `.copy`; the panel deliberately has no `.media` cell, because text over the bright half of the painting does not hold contrast.
- The date is data (`news[].date`); CSS uppercases it, and the renderer never rewrites its casing.
- Text goes through `esc()`; markup in the data renders as text.
- The stop owns `PAN[2]`; the six project stops, Leadership, Honours and Contact each shifted one place when News was inserted.

## Traps

- `PAN` is positional: a new stop before News shifts every later crop. Move the renderer literals and the crop table in [panel.md](panel.md) together.
- Putting these rows back in `.media` looks fine in the data and fails on the screen: the `side: 'right'` scrim darkens the right half, so the list would sit on the bright painting.
- `news[].images` is dormant. Importing `files/news-*.jpg` and wiring a gallery is a feature change, not a copy edit; those data paths currently point at files that do not exist.
- The eyebrow's `02` is a literal, and the later sections keep their existing numbers; renumbering means editing those literals by hand.
- `stop--list` has no CSS rule (the marker is shared with Honours); the row styling lives on `.news` and `.news-row` — see [honours.md](honours.md).
- The count four is asserted by the guard; a fifth update fails `npm test` until the guard moves with it.
