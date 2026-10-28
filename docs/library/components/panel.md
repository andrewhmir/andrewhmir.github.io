# Painted panel

The rounded painted surface every stop sits on: one section, one crop of one of
the two Amorsolo paintings, and a direction-aware scrim that keeps the copy side
readable.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<main id="page" class="page"></main>` |
| Render | `js/main.js` | `function panel(` · `s.dataset.side = o.side;` · `s.style.setProperty('--pos', o.pos);` |
| Render | `js/main.js` | `var PAN = [` |
| Styles | `css/styles.css` | `── The page and its painted panels` |
| Styles | `css/styles.css` | `.stop {` · `isolation: isolate;` |
| Styles | `css/styles.css` | `.stop::before` · `.stop::after` |
| Styles | `css/styles.css` | `.stop[data-side="left"]` · `"right"` · `"center"` |
| Styles | `css/styles.css` | `.stop-in {` · `.copy {` · `.media {` · `.copy--center {` |
| Styles | `css/styles.css` | `.art--rice {` · `.art--harvest {` · `background-position: var(--pos` |
| Test | `tests/page.test.mjs` | `.art--rice` · `.stop::before` |

## Structure

`panel(o)` builds one `section.stop` with `art--rice` or `art--harvest` plus the
caller's modifier (`stop--hero`, `stop--project`, `stop--contact`, …), then sets
the stop id, `data-side` and the inline `--pos`, and fills `.stop-in` with
`.copy` (or `.copy--center`) and the optional `.media`. The art is
`.stop::before`; the scrim is `.stop::after`.

`PAN` is indexed by page position; the twelve crops in page order are:

| `PAN` | Painting | `--pos` | Stop |
|---|---|---|---|
| 0 | `rice` | `50% 58%` | hero |
| 1 | `harvest` | `48% 52%` | about |
| 2 | `harvest` | `20% 26%` | news |
| 3 | `rice` | `18% 56%` | project 1 |
| 4 | `harvest` | `78% 44%` | project 2 |
| 5 | `rice` | `76% 50%` | project 3 |
| 6 | `harvest` | `22% 66%` | project 4 |
| 7 | `rice` | `44% 22%` | project 5 |
| 8 | `harvest` | `56% 50%` | project 6 |
| 9 | `rice` | `8% 44%` | leadership |
| 10 | `harvest` | `88% 36%` | honours |
| 11 | `rice` | `50% 88%` | contact |

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Which crop a stop shows | its `PAN` entry (`art`, `pos`) in `js/main.js` | screenshot at 1440×900 and 390×844; copy side still readable |
| Which side the copy sits on | the `side:` value the caller passes `panel()`; the CSS reads `data-side` | screenshot: scrim dark under the copy, painting bright on the far side |
| The copy/media column split | `.stop-in`, `.copy`, `.media`, `.copy--center` | screenshot at 1280×704; no overlap |
| A scrim gradient | `.stop[data-side="left"]`, `"right"` or `"center"` | screenshot over the brightest crop |
| Panel radius or gutter | `--panel-radius:`, `--gutter:` in `:root` | `npm test` (the radius token is pinned) |
| A third painting | a new `.art--…` class setting `--art`, plus an `art` key in `PAN` | the new class must be documented here or the class-coverage check fails |
| The panel DOM | `function panel(` | no other component paints its own panel |

## Invariants

- Every stop is a `.stop` panel; no other component paints its own background or adds a second art layer.
- `.stop` sets `isolation: isolate`, so the art (`::before`, `z-index: -2`) and the scrim (`::after`, `z-index: -1`) stay inside the panel. A positive-z layer hides the art; dropping `isolation` lets the negative layers escape — see the art/scrim stacking gotcha in `AGENTS.md`.
- `background-position: var(--pos` is the only crop mechanism: one painting moved by an inline custom property, not an image swap and not an animation.
- The twelve crops are page order, not project id order: hero, about, news, six projects, leadership, honours, contact.
- `data-side` drives both the scrim direction and the copy/media columns, and is set on the `.stop`, never on `.stop-in`.
- The panel radius is `--panel-radius: 16px` (12px below 640) and overflow is clipped, so art and scrim need no own radius.
- A new panel class is covered by the library check (V5); document it here in the same edit.

## Traps

- `PAN` is indexed by page position. A seventh project takes `PAN[9]`, which is Leadership's crop today; every later crop shifts and `page.test.mjs` asserts six projects. Extend `PAN`, the rail and the guard together (see the `PAN` gotcha in `AGENTS.md`).
- Reordering `PORTFOLIO.projects` reslices every project panel's crop silently: no selector changes and no error surfaces.
- `panel()` concatenates the art class (`'stop art--' + o.art`); a typo in an `art` key leaves no `--art`, so the panel paints flat dark instead of a painting.
- `data-side` is consumed on `.stop`; putting it on `.stop-in` changes nothing because the rules are `.stop[data-side="right"] .copy`.
- A new scrim or card painted at `z-index: 0` covers the painting; the contact card is a `.stop-in::before` in the same negative layer and relies on `.stop`'s stacking context.
- `.art--rice` and `.art--harvest` point at `../files/painting-hero.jpg` and `../files/painting.jpg`; both are pinned by the guard, and the hero painting is also the Open Graph source — do not delete or rename either file.
