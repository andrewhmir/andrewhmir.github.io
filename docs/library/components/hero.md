# Hero stop

The first panel, `#top`: the name, the title line, the one-sentence hero line,
and two actions.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a class="brand" href="#top">` |
| Render | `js/main.js` | `/* 0 — hero */` · `'<h1>'` |
| Render | `js/main.js` | `P.heroLine` · `'<p class="hero-line">'` |
| Render | `js/main.js` | `'<div class="actions">'` · `See the work →` |
| Styles | `css/styles.css` | `.stop--hero {` · `.hero-title {` · `.hero-line, .lede {` |
| Styles | `css/styles.css` | `.actions {` |
| Data | `js/data.js` | `name` · `title` · `heroLine` · `social[].url` |
| Test | `tests/page.test.mjs` | `'top'` · `P.social[0].label` |

## Structure

The hero is `panel()` with `cls: 'stop--hero'`, `side: 'center'`.
Inside `.copy`: `<h1>` (the page's only h1), `.hero-title`, `.hero-line`, then
`.actions` holding the `.btn--solid` "See the work →" and a plain `.btn`
"Resume ↗".

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Name or title | `PORTFOLIO.name`, `PORTFOLIO.title` in `js/data.js` | screenshot 1440×900 and 390×844 |
| The one-sentence line | `PORTFOLIO.heroLine` in `js/data.js`, printed in `/* 0 — hero */` | screenshot; it no longer moves with `bio` order |
| The two actions | the `actions` markup in `/* 0 — hero */`; the resume URL is `P.social[0]` | click both; resume opens `social[0].url` |
| Hero height, padding, alignment | `.stop--hero`, `.stop--hero .stop-in`, `.copy` | screenshot 1280×704 and 390×844 |
| Name size or weight | `h1` in the `── Type` section of `css/styles.css` | screenshot 390×844; the longest title must not overflow |
| The hero's place in page order | `/* 0 — hero */` is the first `out.push` in `render()` | the hero has no rail entry |

## Invariants

- The hero renders the page's only `<h1>`; while scripts run the `<noscript>` fallback contributes raw text, not an element. See the One `<h1>` constraint in `AGENTS.md`.
- The sentence is `P.heroLine`; it is deliberately not a `bio` entry, so it cannot also print in About — see the no-content-twice constraint in `AGENTS.md`.
- The hero carries `id="top"` so the masthead brand link lands on it, and it is deliberately absent from the rail.
- The first action is an in-page anchor to `#work`; the second is an external link filled from the first `social` entry, so it is data.
- The panel is the `center` side with `cls: 'stop--hero'`; its crop, scrim and radius come from the panel page.

## Traps

- Editing `P.bio` no longer moves the hero sentence; the hero prints `P.heroLine` and About prints `P.bio`. Putting the sentence back into `bio` prints it twice (guarded by `page.test.mjs`).
- The hero resume reads `P.social[0].url`; the masthead resume selects by label (`wireChrome`). Reordering `social` changes one but not the other, and `page.test.mjs` pins `social[0].label` as `Resume`.
- `P.name` is escaped by `esc()` into the h1; markup pasted into the data renders as text, not HTML.
- Two resume controls exist (hero action and masthead), but never on screen at once: the masthead's copy is hidden while the hero is in view. Editing one does not edit the other: the hero label is the literal "Resume ↗".
- Adding a second h1 (a section heading, an injected panel) breaks the one-h1 contract silently; nothing in `page.test.mjs` counts h1 elements.
