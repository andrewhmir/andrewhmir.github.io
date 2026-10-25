# Journey rail

The fixed left-hand section nav, plus the gradient shade that keeps its labels
legible over the brightest painting crops.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<nav class="rail" id="rail" aria-label="The walk through the profile"></nav>` |
| Markup | `index.html` | `<div class="rail-shade" aria-hidden="true"></div>` |
| Render | `js/main.js` | `function buildRail(` · `document.querySelectorAll('.stop[id]')` |
| Render | `js/main.js` | `data-stop="` · `a.classList.toggle('is-active'` |
| Render | `js/main.js` | `rootMargin: '-45% 0px -45% 0px'` |
| Styles | `css/styles.css` | `── Journey rail` · `.rail__stop.is-active` |
| Styles | `css/styles.css` | `── The left shade, so the rail reads over a bright crop` |
| Styles | `css/styles.css` | `.rail::before` · `.rail__stop span` |
| Styles | `css/styles.css` | `@media (min-width: 1024px)` |
| Data | `js/data.js` | `projects[].id` · `projects[].title` |
| Test | `tests/page.test.mjs` | `id="rail"` · `class="rail-shade"` |

## Structure

`nav.rail#rail` ships empty and `buildRail` fills it with one
`a.rail__stop[data-stop="<id>"] > span` per named section: About, one per project
id, Leadership, Honours and Contact — ten stops today, the hero excluded. An
`IntersectionObserver` watches every `.stop[id]` and toggles `.is-active` on the
stop whose `data-stop` matches the intersecting section id. The sibling
`div.rail-shade` is a fixed 108px gradient behind it.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A section label | the `labels` array in `buildRail`; project labels come from `P.projects`, the rest are literals | click the stop; the label matches the section |
| Which sections get a stop | `labels` in `buildRail`; the observer still watches every `.stop[id]` | scroll past a section; the dot moves |
| The active band | `rootMargin: '-45% 0px -45% 0px'` in `buildRail` | scroll slowly through one boundary |
| Rail position or spacing | `.rail` (`left`, `top`, `transform`) and `.rail__stop` (26px rows) | 1440×900 screenshot |
| Dot or label look | `.rail__stop::before`, `.rail__stop span`, `.rail__stop.is-active` | hover and active screenshots |
| Shade width or strength | the `.rail-shade` gradient stops | screenshot over the brightest crop |
| The breakpoint | `@media (min-width: 1024px)` shows the rail; the 1023px block hides `.rail-shade` and `.rail` | 1023px and 1024px screenshots |

## Invariants

- The rail is rendered entirely by `js/main.js`; the shell `<nav>` must stay
  empty (AGENTS.md vocabulary, **rail**).
- One stop per named section; the hero is deliberately not a rail entry.
- `.rail` and `.rail-shade` are fixed and both disappear below 1024px; there is
  no drawer replacing them (AGENTS.md, **Deliberately absent**).
- `.rail-shade` is decoration only: `aria-hidden="true"` and
  `pointer-events: none`.
- The active state is driven by `data-stop`, not by the `href`.

## Traps

- With no `IntersectionObserver`, `buildRail` renders the links and then returns
  before observing, so the rail looks fine and never activates.
- `.is-active` lands on the anchor; a hand-added rail link without `data-stop`
  can never become active.
- The observer watches `.stop[id]`, not the rail links; adding an emitted section
  needs both a label entry and a rendered `.stop[id]`, or the stop points at
  nothing.
- Deleting `.rail-shade` is a contrast regression over bright crops, not a
  cleanup; `page.test.mjs` pins the `rail-shade` class.
- A seventh project adds a rail stop automatically but collides with the crop
  table — see AGENTS.md's `PAN` gotcha before touching `js/data.js`.
- The shade must stay behind the rail (z-index 29 against the rail's 30) and
  never above the panels.
