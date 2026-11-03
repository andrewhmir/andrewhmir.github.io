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

`nav.rail#rail` ships empty; `buildRail` fills it with one `a.rail__stop[data-stop] > span` per
named section — About, News, each Work category, Leadership, Honours, Contact (seven today, the
hero excluded). `wireChrome` toggles `.is-active` for the panel covering the viewport middle; the
`div.rail-shade` sibling is a 144px gradient.

The rail runs flush with the screen edge in a lane of its own: the bar is the viewport's first 5px,
the ticks step inward, and the panels' 16px gutter sits outside the mark. Its label chips still open
over the panel's left crop ("DSH Plugins" ends at 135px), so at 1024px and wider every left-side copy
carries `margin-left: 76px` — a chip can never cover the text, and the shade is 144px for the same
reason.

`.rail` paints the unfilled track from the first tick's centre to the last; `.rail::before` is the
5px gold bar, its height `--rail-progress`. The fill is anchored but continuous: it reaches a tick as
that panel tops out and runs between ticks while crossing, `#progress` carrying the same fraction on
phones. Each tick starts on the line, its left end under the bar, labels above; the hit row is 77x34px.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A section label | the `labels` array in `buildRail`; category labels come from `Site.deriveRooms`, the rest are literals | click the stop; the label matches the section |
| Which sections get a stop | `labels` in `buildRail`; the page order decides what the middle finds | scroll past a section; the active tick moves |
| The active section | `activeSection()` in `wireChrome`: the panel covering the viewport middle | scroll across two panel boundaries; the tick flips as the boundary crosses the middle |
| Rail position, spacing or click area | `.rail` (`left: 0` — the bar hugs the screen edge; `top`, `transform`); `.rail__stop` (34px rows, 77px hit width) | 1440×900 screenshot; click just right of a dash |
| Stop tick or label look | `.rail__stop::before` (the em-dash rule), `.rail__stop span`, `.rail__stop.is-active`, `:focus-visible` | hover, active and Tab screenshots |
| The progress fill | `railTarget()`, `fillTarget()` and `paint()` in `wireChrome`; the square-ended 5px bar and its gradient in `.rail::before`; the track in `.rail`'s `background-size` | scroll from one panel to the next; reduced motion snaps |
| The lane the chips open into | `.stop[data-side="left"] .copy { margin-left: 76px }` inside `@media (min-width: 1024px)`; the shade covers the same lane | 1024px and 1440px screenshots of Honours and Leadership: no chip over copy |
| Shade width or strength | the `.rail-shade` gradient stops | screenshot over the brightest crop |
| The breakpoint | `@media (min-width: 1024px)` shows the rail; the 1023px block hides `.rail-shade` and `.rail` and re-shows `.progress` | 1023px and 1024px screenshots |

## Invariants

- The rail is rendered entirely by `js/main.js`; the shell `<nav>` stays empty (AGENTS.md, **rail**).
  One stop per named section; the hero is not one, so a hero covering the middle clears the tick and
  leaves the bar at 0.
- `.rail` and `.rail-shade` are fixed and both disappear below 1024px; no drawer replaces them
  (AGENTS.md, **Deliberately absent**).
- `.rail-shade` is decoration only — `aria-hidden`, `pointer-events: none`; the fill is a
  pseudo-element, so it adds no text, node or ARIA.
- The fill is scroll-driven but anchored: it sits on a tick as its panel tops out and interpolates
  between ticks; reduced motion drops the ease, not the interpolation. `railTarget()` measures from
  the first tick's centre, so the 17px inset and the 34px row move together.
- The dash's left end tucks under the fill (`z-index: 1`) below the labels (`2`), so a passed tick
  never crosses the gold. The bar is the viewport's first 5px; the 76px left-copy indent and the
  144px shade move with it.

## Traps

- No `IntersectionObserver` needed: `buildRail` renders the links and `wireChrome`'s geometry owns
  the active state, a live `getBoundingClientRect` rather than a cached offset.
- `.is-active` lands on the anchor; a hand-added link without `data-stop` never activates, and a
  `.stop[id]` with no rail entry clears the tick.
- Deleting `.rail-shade` is a contrast regression, not a cleanup; the guard pins the class. It stays
  behind the rail (29 against 30), above the panel art.
- Below 1024px `wireChrome` writes `--rail-progress` to a hidden rail (harmless); keep the masthead
  `.progress` fallback or small screens lose the cue.
- `--rail-progress` is a px length; a bare number collapses the fill, and the `reduced` branch must
  keep skipping `paint()`.
- A new category adds a rail stop automatically; a seventh project changes only the 3 + 3 counts.
- A stop label wider than about 104px reaches past the 76px lane; widen the indent and the shade
  together.
- The hit row overflows the rail's box: `.rail` keeps `pointer-events: none` with `.rail__stop` back
  on `auto`, or the strip eats panel clicks.
