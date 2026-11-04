# About stop

The second panel, `#about`: the bio paragraphs and social buttons on the copy
side, with the framed portrait beside them.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a href="#about">` |
| Render | `js/main.js` | `/* 1 — about */` · `P.bio.map` |
| Render | `js/main.js` | `sectionSocial().map` |
| Render | `js/main.js` | `'<figure class="portrait">'` · `files/profile.jpg` |
| Styles | `css/styles.css` | `.portrait {` · `.portrait img` · `.portrait figcaption {` |
| Data | `js/data.js` | `bio` · `social[].label` · `social[].url` |
| Test | `tests/page.test.mjs` | `'about'` |

## Structure

`panel()` with `side: 'left'`. The `.copy` cell holds `.eyebrow` "01 · About", an
`<h2>` literal ("Why I build" — never the hero's name), `.body` with one
`<p>` per `bio` entry, then `.actions` with one `.btn` per `sectionSocial()`
entry. The `.media` cell is `figure.portrait` > `img` + `figcaption`.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Bio copy | the `bio` array in `js/data.js`; each entry is one paragraph | screenshot 1440×900 |
| Portrait image | `files/profile.jpg` — the path is hard-coded in `/* 1 — about */` | image loads; screenshot |
| Portrait caption | the `figcaption` literal in `/* 1 — about */` | screenshot |
| Social buttons | `P.social` labels and URLs in `js/data.js`; the `Resume` entry is omitted | each button opens its URL |
| Portrait shape, border or fit | `.portrait img` (`aspect-ratio`, `max-height: calc(100vh - 250px)`, radius, border) | screenshots at 1440×900 and 390×844 |
| Eyebrow or heading | the literals in `/* 1 — about */` | screenshot |

## Invariants

- The portrait path is hard-coded as `files/profile.jpg` in `js/main.js`; there is no data field for it.
- Every `bio` entry renders as its own paragraph inside `.body`; the array order is the reading order.
- The social row maps `sectionSocial()` — `P.social` minus the `Resume` entry — to `.btn` links with a "↗" suffix. Resume stays with the masthead (and the hero), so the same action is never printed twice; Contact uses the same filtered list.
- The portrait is capped at `calc(100vh - 250px)` tall so the About panel stays
  one screen tall like the other stops; the 4:5 ratio is preserved, the image
  scales down and is centred in the media column.
- The About panel is `side: 'left'`, so the scrim darkens the copy side and the portrait sits on the right; the panel itself is the panel page's contract.
- The caption is a literal in the renderer, not a data field.
- Bio text is escaped: HTML in the data renders as text.

## Traps

- The portrait is not data: change the `<img src>` in the renderer, not a `PORTFOLIO` field.
- About prints `P.bio` only; the hero sentence is `P.heroLine`. Putting the sentence back into `bio` prints it in two stops at once.
- The social array feeds four renderings — hero resume (`social[0].url`), masthead resume (label lookup, falling back to `social[0]`), About buttons and Contact links — but the two section rows filter `Resume` out, so three of them can never share a screen. `Resume` is `social[0]`, so a label rename keeps resolving to the same masthead entry; a plain reorder does not repoint the masthead (it follows the label) — it moves the hero resume and the About/Contact row order. The masthead repoints only when the `Resume` label disappears while its entry is not first, or when the Resume URL itself changes.
- The portrait `<img>` has no `onerror` fallback: a missing `files/profile.jpg` is a broken image, unlike project frames which swap in the placeholder.
- `figcaption` text is static; changing the data does not update it.
