# Honours

The Honours stop: the standalone honour tiles, with project-linked awards excluded by the `from` partition.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="page"` |
| Render | `js/main.js` | `/* 5 — honours */` · `S.honoursTiles(P.honors)` |
| Render | `js/main.js` | `cls: 'stop--list'` · `class="honours"` |
| Render | `js/main.js` | `data-kind="honors"` · `honour-row__mark` |
| Render | `js/main.js` | `hasPhotos` |
| Styles | `css/styles.css` | `── Honours list` · `.honour-row:disabled` · `.honour-row__mark` |
| Data | `js/data.js` | `honors[].description!` · `honors[].year!` |
| Data | `js/data.js` | `honors[].from` · `honors[].images` |
| Test | `tests/page.test.mjs` | `S.honoursTiles(P.honors).tiles.length, 5` |

## Structure

`#honours` is a `.stop.stop--list` panel (`cls: 'stop--list'`, `side: 'left'`, art
pan `PAN[10]`). Its copy is the eyebrow, `h2` and `.body`; its `.media` cell is
`<ol class="honours">` holding one `<li><button class="honour-row" data-kind="honors"
data-index>` per tile, with `.honour-row__year`, `.honour-row__text` and
`.honour-row__mark`. A tile whose record has no `images` is rendered `disabled`
with an empty mark. `data-index` is the record's position in the **unfiltered**
`P.honors` array, because `honoursTiles` keeps `{ record, index }` for exactly that
purpose (see [dialog.md](dialog.md)).

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Add or reword a standalone honour | `honors: [` in `js/data.js`; array order is list order | `node tests/page.test.mjs` — it pins five tiles |
| Move an award between the project and this list | add or remove `from: 'projectN'` on the honour; the project's own `awards` array is the readable copy on that panel | `node tests/page.test.mjs`; open the project record |
| A tile's photographs | `honors[].images` (the dialog gallery filters `PlaceHolder.png`) | open the tile; count the gallery |
| Row type, colours or spacing | `.honours`, `.honour-row`, `.honour-row__year`, `.honour-row__text`, `.honour-row__mark` | screenshots at 1440 and 390 |
| What a tile opens | nothing on the tile itself — delegation in `wireDelegation` (see [reveals-chrome.md](reveals-chrome.md)) | click an enabled and a disabled tile |

## Invariants

- The list shows standalone honours only. An honour carrying `from: 'projectN'` is a project award: `Site.honoursTiles` drops it from `tiles`, and `js/main.js` never renders the `projectAwards` half. The panel's Awards come from the project's own `awards` array, so adding `from` alone removes the honour and puts nothing on the panel (see [project.md](project.md)).
- Five tiles today: thirteen records minus eight carrying `from`; `tests/page.test.mjs` asserts the tile count.
- The partition reads the field, never the description text. Copy wordings for one win differ between the honour record and the project panel, so only `from` decides a side.
- A no-photo tile is `disabled` and its mark is empty; it never opens the dialog.
- `.stop--list` is emitted on this panel and has no CSS rule; the list styling lives on `.honours` and `.honour-row`.
- Authored order is newest-first. The renderer never sorts; the order in `js/data.js` is the order on the page.

## Traps

- A project award added without `from` becomes a sixth tile and `tests/page.test.mjs` fails. An honour given `from` disappears from the tiles and breaks the same count — the two edits must move together.
- `hasPhotos` tests `images && images.length` and does **not** filter `PlaceHolder.png`, while the dialog gallery does. An honour whose images are only the placeholder therefore renders an enabled tile that opens a dialog with an empty gallery.
- `data-index` is the unfiltered array position. `tiles` has dropped the project awards, so the tile's loop position is not its index; using the position opens a neighbour's record.
- Do not hunt for a `.stop--list` stylesheet rule — there is none by design (the panel emits the class but every list style is on `.honours`/`.honour-row`). Adding a rule is a runtime change, not a docs fix.
- The "standalone honours, newest first" sentence is a literal in the `/* 5 — honours */` block of `render()`, not derived from data; reordering `honors` without it makes the page lie.
- The `.honour-row` grid has three columns (year, text, mark); the mark column collapses to nothing on a disabled tile, so rows with and without photographs are visibly different stripes.
