# Journey rail

The fixed left-hand section nav, the page-progress fill drawn down its line, and
the gradient shade that keeps its labels legible over the brightest painting
crops.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<nav class="rail" id="rail" aria-label="The walk through the profile"></nav>` |
| Markup | `index.html` | `<div class="rail-shade" aria-hidden="true"></div>` |
| Render | `js/main.js` | `function buildRail(` · `function activeSection(` |
| Render | `js/main.js` | `data-stop="` · `classList.toggle('is-active'` |
| Render | `js/main.js` | `wireChrome` · `function railTarget(` · `--rail-progress` |
| Styles | `css/styles.css` | `── Journey rail` · `.rail__stop.is-active` |
| Styles | `css/styles.css` | `── The left shade, so the rail reads over a bright crop` |
| Styles | `css/styles.css` | `.rail::before` · `--rail-progress` · `background-size: 5px calc(100% - 34px)` · `.rail__stop span` · `:focus-visible` · `@media (min-width: 1024px)` |
| Data | `js/data.js` | `projects[].category` |
| Test | `tests/page.test.mjs` | `id="rail"` · `class="rail-shade"` · `--rail-progress` |

## Structure

`nav.rail#rail` ships empty and `buildRail` fills it with one
`a.rail__stop[data-stop="<id>"] > span` per named section: About, News, one per
Work category, Leadership, Honours and Contact — seven today, the hero excluded.
`wireChrome` toggles `.is-active` for the panel covering the viewport middle —
the boundary crossing the centre is the moment the tick changes, a middle in a
gutter keeps the section just passed. The sibling `div.rail-shade` is a 108px
gradient.

The rail's line does double duty. `.rail` paints the unfilled track as a
background hairline from the first tick's centre to the last; `.rail::before` is
the 5px gold bar, its height set from `--rail-progress`. The fill is continuous
but anchored: it reaches a stop's tick as that panel tops out, runs between two
ticks during a crossing — midway when the viewport is split — and `#progress`
carries the same fraction on phones. Each tick starts on the line, its left end
tucked under the gold bar, labels above; the stop's hit row is 77x34px.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A section label | the `labels` array in `buildRail`; category labels come from `Site.deriveRooms`, the rest are literals | click the stop; the label matches the section |
| Which sections get a stop | `labels` in `buildRail`; the page order decides what the middle finds | scroll past a section; the active tick moves |
| The active section | `activeSection()` in `wireChrome`: the panel covering the viewport middle | scroll across two panel boundaries; the tick flips as the boundary crosses the middle |
| Rail position, spacing or click area | `.rail` (`left`, `top`, `transform`); `.rail__stop` (34px rows, 77px hit width, -13px margin under the line) | 1440×900 screenshot; click just right of a dash |
| Stop tick or label look | `.rail__stop::before` (the em-dash rule), `.rail__stop span`, `.rail__stop.is-active`, `:focus-visible` | hover, active and Tab screenshots |
| The progress fill | `railTarget()`, `fillTarget()` and `paint()` in `wireChrome`; the square-ended 5px bar and its gradient in `.rail::before`; the track in `.rail`'s `background-size` | scroll from one panel to the next: the gold sits on a tick when the panel tops out and runs between ticks mid-crossing; reduced motion snaps |
| Shade width or strength | the `.rail-shade` gradient stops | screenshot over the brightest crop |
| The breakpoint | `@media (min-width: 1024px)` shows the rail; the 1023px block hides `.rail-shade` and `.rail` and re-shows `.progress` | 1023px and 1024px screenshots |

## Invariants

- The rail is rendered entirely by `js/main.js`; the shell `<nav>` must stay
  empty (AGENTS.md vocabulary, **rail**).
- One stop per named section; the hero is deliberately not a rail entry, so the
  hero covering the middle clears the tick and leaves the bar at 0.
- `.rail` and `.rail-shade` are fixed and both disappear below 1024px; there is
  no drawer replacing them (AGENTS.md, **Deliberately absent**).
- `.rail-shade` is decoration only: `aria-hidden="true"` and
  `pointer-events: none`. The fill is a pseudo-element, so it adds no text, no
  focusable node and no ARIA either.
- The fill is anchored but scroll-driven: it sits on a panel's tick as that
  panel tops out and interpolates between ticks while crossing; reduced motion
  drops the ease, not the interpolation.
- The dash's left end tucks under the fill (`z-index: 1`), below the labels
  (`2`), so a passed tick never crosses the gold. The track is the `.rail`
  background, first tick to last.

## Traps

- With no `IntersectionObserver`, the rail still works: `buildRail` renders the
  links and `wireChrome`'s scroll geometry owns the active state; the class
  depends on the live `getBoundingClientRect`, not a cached offset.
- `.is-active` lands on the anchor; a hand-added rail link without `data-stop`
  can never become active, and a `.stop[id]` with no rail entry clears the tick.
- Deleting `.rail-shade` is a contrast regression, not a cleanup; `page.test.mjs` pins the class.
- Below 1024px `wireChrome` keeps writing `--rail-progress` to a hidden rail;
  that is harmless. Do not drop the masthead `.progress` fallback while the rail
  is hidden, or small screens lose the cue.
- The track is `.rail`'s background; `railTarget()` measures from the first
  tick's centre, so the 17px inset and the 34px row move together.
- `--rail-progress` is a px length: `height: var(--rail-progress, 0px)`. A bare
  number there collapses the fill, and the `reduced` branch must keep skipping
  `paint()` or the fill animates against a reduced-motion preference.
- A new category adds a rail stop automatically; a seventh project changes only the 3 + 3 counts and the guard's data assertions.
- The hit row overflows the rail's box: `.rail` must keep `pointer-events: none`
  with `.rail__stop` restored to `auto`, or the strip eats panel clicks.
- The shade stays behind the rail (29 against 30), above the panel art, darkening the panels' left edge.
