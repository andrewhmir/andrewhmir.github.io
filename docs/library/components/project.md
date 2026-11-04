# Category panel

The Work wrapper and its three category panels: a room sentence, a project count, and three project cards that open a record's own panel.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a href="#work">` · `id="projectView"` · `role="dialog"` |
| Render | `js/main.js` | `S.deriveRooms(P.projects)` · `cls: 'stop--project stop--category',` |
| Render | `js/main.js` | `function categoryCopy(` · `03 · Work · ` · `category-count` |
| Render | `js/main.js` | `function categoryCards(` · `data-kind="panel"` · `project-card__art` |
| Render | `js/main.js` | `function roomSlug(` · `function openProject(` · `function closeProject(` |
| Render | `js/main.js` | `project-view__back` · `data-close-view` |
| Styles | `css/styles.css` | `── Category panels` · `.category-cards {` · `.project-card {` |
| Styles | `css/styles.css` | `.stop--category .copy` · `.project-card__art` · `.category-count` |
| Styles | `css/styles.css` | `── Project view` · `.project-view` |
| Data | `js/data.js` | `projects[].category` · `projects[].overview` · `projects[].shots` · `projects[].awards` |
| Data | `js/data.js` | `Site.deriveRooms` |
| Test | `tests/page.test.mjs` | `Array.from(rooms` · `function categoryCards\(` · `function roomSlug\(` |

## Structure

`render()` creates the `.work` wrapper (`#work`) and appends one `section.stop` with `stop--project stop--category` per `Site.deriveRooms(PORTFOLIO.projects)` room, in room order. The stop id is the room key slugged (`robotics`, `applications`, `dsh-plugins`), so it is the rail anchor (`#work` stays the masthead's Work landing). The `.copy` cell is `.eyebrow` ("03 · Work · <key>"), an `<h2>` (the room key), the room's `.lede` and a `.category-count` line. The `.media` cell is `.category-cards`: three `.project-card` buttons, each with the record's overview still, title, tagline and a meta line (award count, or the venue when the record has no awards). The count line reads `N projects · M awards`, or `N plugins` for a room whose records carry no awards.

The grouping is derived, not authored: `Site.deriveRooms` splits on `projects[].category`, orders the known rooms first, and keeps an unknown category rather than dropping it. `ROOM_LEDES` supplies each room's sentence; a record's own id and index are untouched, so the honours `from: 'projectN'` links still resolve.

A card click calls `openProject(index)`, painting `#projectView` with the record's `PROJECT_ART` crop and `projectCopy` / `projectMedia`. `projectMedia` hangs the overview, film and team frames for a project record; a record that declares `projects[].shots` (the DSH plugins ship no film and no team photograph) hangs those three screenshots instead, labelled from the record's `pieces`. Escape or the back button calls `closeProject` (focus returns to the card); `setLock` keeps the page still while the view or the dialog is open.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A room's sentence | `ROOM_LEDES` in `js/data.js` | screenshot the category panel |
| Which projects share a panel | the record's `category` field; rooms are derived | rail labels and card order follow the derived groups |
| A card's still, title, tagline or meta | `function categoryCards(` in `js/main.js` | open the panel; the card matches the record |
| The eyebrow, title or count line | `function categoryCopy(` | screenshot at 1440×900 |
| The id a panel and its rail stop use | `function roomSlug(` in `js/main.js` | the rail link lands on the panel |
| A category panel's crop | `PAN[3]`, `PAN[4]`, `PAN[5]` in `js/main.js` (see [panel.md](panel.md)) | screenshot; copy side still readable |
| The card split or look | `.stop--category .copy` / `.media`, `.category-cards`, `.project-card` in `css/styles.css` | 1440×900 (three abreast) and 390×844 (one column) |
| A project view's crop, side or frames | `openProject(`, `PROJECT_ART` and the record's `shots` | open a card from each category; crop, side, frames and focus return follow the record |

## Invariants

- One category panel per derived room; today Applications (Hivemind, SATLearn, BiyaHey!), DSH Plugins (dsh-btw, dsh-plan-review, dsh-miranda-theme) and Robotics (PALAD, C.E.N.T.H.R.O., Focus Buddy), three each.
- `#work` lives on the `.work` wrapper, not on a category panel, so the Work nav link lands on the first category.
- A card's `data-index` is the record's index in `PORTFOLIO.projects`, which the shared dialog and the project view resolve against.
- The copy is assembled only by `categoryCopy(`; no category markup is authored in `index.html`.
- `.category-cards` is a 3-column grid above 1024px and one column below it, in step with the panel grid collapsing to one column.
- A card opens `#projectView`; the dialog is the layer above. Both are views, not routes; Escape and the back button are the exits.
- `setLock` is a count (closing the dialog must not unlock the page while the view stays open); the shared keydown traps Tab and closeProject restores focus.

## Traps

- The split is a fact of `projects[].category`; adding a project changes a room's count and `page.test.mjs`'s data assertions, not a hand-written list.
- Adding a category shifts every later `PAN` index. Leadership, Honours and Contact hard-code `PAN[6]`, `PAN[7]` and `PAN[8]`; a fourth Work room moves them again.
- Reordering `PORTFOLIO.projects` changes card order inside each room but never moves a project between rooms.
- `.stop--category .copy` / `.media` set the 4/8 column split; the 1023px block must keep overriding them to `grid-column: 1 / -1`, or the split leaks into the one-column mobile grid.
- The cards are buttons inside `.media`; the delegated opener selects `[data-kind][data-index]`, so a card missing either attribute is inert.
- A record with no `awards` shows its `venue` in the meta line rather than an empty count.
- A plugin record has no `video` and no `team`; without `shots` its project view would hang three awaited frames. `projectMedia` hangs `shots` in order, and `tests/hang.test.mjs` checks every recorded screenshot file is on disk.
- The project view is injected HTML with no `data-reveal`: the reveal observer runs once at init, so a reveal attribute there would leave it invisible.
