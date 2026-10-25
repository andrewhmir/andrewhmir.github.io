# About stop

The second panel, `#about`: the bio paragraphs and social buttons on the copy
side, with the framed portrait beside them.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a href="#about">` |
| Render | `js/main.js` | `/* 1 — about */` · `P.bio.map` |
| Render | `js/main.js` | `P.social.map` |
| Render | `js/main.js` | `'<figure class="portrait">'` · `files/profile.jpg` |
| Styles | `css/styles.css` | `.portrait {` · `.portrait img` · `.portrait figcaption {` |
| Data | `js/data.js` | `bio` · `social[].label` · `social[].url` |
| Test | `tests/page.test.mjs` | `'about'` |

## Structure

`panel()` with `side: 'left'`. The `.copy` cell holds `.eyebrow` "01 · About", an
`<h2>` literal, `.body` with one `<p>` per `bio` entry, then `.actions` with one
`.btn` per `social` entry. The `.media` cell is `figure.portrait` > `img` +
`figcaption`.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Bio copy | the `bio` array in `js/data.js`; each entry is one paragraph | screenshot 1440×900 |
| Portrait image | `files/profile.jpg` — the path is hard-coded in `/* 1 — about */` | image loads; screenshot |
| Portrait caption | the `figcaption` literal in `/* 1 — about */` | screenshot |
| Social buttons | `P.social` labels and URLs in `js/data.js` | each button opens its URL |
| Portrait shape or border | `.portrait img` (`aspect-ratio`, radius, border) | screenshot 390×844 |
| Eyebrow or heading | the literals in `/* 1 — about */` | screenshot |

## Invariants

- The portrait path is hard-coded as `files/profile.jpg` in `js/main.js`; `PORTFOLIO.profileImage` has no reader on this page — see the fields-with-no-reader gotcha in `AGENTS.md`.
- Every `bio` entry renders as its own paragraph inside `.body`; the array order is the reading order.
- The social row maps the whole `P.social` array to `.btn` links, each with a "↗" suffix; the same array feeds the hero resume, the masthead resume and the contact links.
- The About panel is `side: 'left'`, so the scrim darkens the copy side and the portrait sits on the right; the panel itself is the panel page's contract.
- The caption is a literal in the renderer, not a data field.
- Bio text is escaped: HTML in the data renders as text.

## Traps

- Editing `PORTFOLIO.profileImage` changes nothing visible; only `files/profile.jpg` in the renderer is read.
- `P.bio[3]` is also the hero sentence; rewriting or reordering `bio` edits two stops at once.
- The social array feeds four renderings — hero resume (`social[0].url`), masthead resume (label lookup, falling back to `social[0]`), About buttons and Contact links. `Resume` is `social[0]`, so a label rename keeps resolving to the same masthead entry; a plain reorder does not repoint the masthead (it follows the label) — it moves the hero resume and the About/Contact row order. The masthead repoints only when the `Resume` label disappears while its entry is not first, or when the Resume URL itself changes.
- The portrait `<img>` has no `onerror` fallback: a missing `files/profile.jpg` is a broken image, unlike project frames which swap in the placeholder.
- `figcaption` text is static; changing the data does not update it.
