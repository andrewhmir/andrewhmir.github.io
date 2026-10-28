# Work as two category panels — design

Status: draft for review · 2026-10-28
Approved visual direction: `.superpowers/mockups/option-a-category-cards-panel-overlay.html` (Option A — three cards per category, project panel opens over the page).

## Goal

The Work section stops being six one-screen project stops. It becomes two
one-screen **category panels** — *Robotics* (PALAD, C.E.N.T.H.R.O., Focus Buddy)
and *Applications* (Hivemind, SATLearn, BiyaHey!) — each showing its three
projects as cards. Clicking a card opens that project's existing panel (copy +
Overview / Film / Team stack) as a full-screen view over the page. "Open the
record →" inside that panel still opens the shared record dialog, unchanged.

The 3 + 3 split is not authored by hand: `PORTFOLIO.projects[].category` already
divides the roster exactly that way, and `Site.deriveRooms` already groups by it.

## What stays

- The six project records, their ids (`project1`…`project6`), copy, awards,
  videos, posters, frames and honour links (`from: 'projectN'`) are untouched.
- The shared record dialog, its focus trap, video player, gallery and the
  `#dialog` markup are untouched. Its two body-scroll lines move to the shared
  lock count so it can stack above the project view, but its behaviour is
  unchanged.
- The painting/art/scrim system, `.stop` panels, the rail's scroll geometry and
  its progress fill, Lenis smooth scroll, reveals, reduced-motion behaviour and
  the no-third-party rule are untouched.
- `#work` stays on a plain `.work` wrapper so the masthead and hero links still
  land on the first category panel.
- The rail still has one stop per named section; it now lists *Robotics* and
  *Applications* instead of the six project titles (7 stops: About, News,
  Robotics, Applications, Leadership, Honours, Contact).

## Data

`Site.deriveRooms(P.projects)` is revived as the page's grouping function (it is
currently data-suite-only). Each returned room keeps its `{ key, title, projects }`
shape and gains one field, `lede` — the category sentence the panel shows.

`ROOM_LEDES` is a new internal map in `js/data.js` beside `ROOM_TITLES`
(Robotics/Applications → one sentence each); `deriveRooms` reads it. It is not
exported, so the `Site.*` inventory and `docs/library/data.md` classification
gain no new helper — only `Site.deriveRooms` flips from *dormant* to *used*.

`ROOM_TITLES` and `ROOM_ORDER` keep their current values and exports; the
existing `tests/derive-rooms.test.mjs` must keep passing unchanged (it asserts
keys, 3/3 sizes and the "Works in Robotics" titles; adding `lede` cannot break
those assertions).

Draft ledes (to be edited during review, then moved into `js/data.js` verbatim):

- Robotics — "Three machines built to be used rather than demonstrated: a palm
  scanner, a fingerprint fare system, and a desk robot that will not let you
  drift."
- Applications — "Three systems for problems that kept getting in the way:
  organizational memory, a better way to practise for the SAT, and a map of how
  Metro Manila actually moves."

No new `PORTFOLIO` top-level key is added — the grouping stays derived, so
`docs/library/data.md` keeps one projects table.

## Renderer (`js/main.js`)

`render()`'s Work block becomes a loop over `S.deriveRooms(P.projects)` inside the
existing `.work` wrapper. Each room emits one `panel()` with:

- `id`: the room key lowercased (`robotics`, `applications`) — this is the rail
  and masthead anchor.
- `cls: 'stop--project stop--category'`, side alternating `left` / `right` by room
  index, art/pos from the new category entries in `PAN`.
- `copy`: `categoryCopy(room)` —
  eyebrow `03 · Work · <key>`, `<h2><key>.</h2>` ("Robotics."), `.lede` room
  lede, and a `.category-count` line `3 projects · 7 awards` (awards summed from
  `projects[].awards`, singular "1 award" when one).
- `media`: `categoryCards(room)` — `.category-cards` grid of three
  `<button class="project-card" type="button" data-kind="panel" data-index="i">`
  where `i` is the record's index in `PORTFOLIO.projects` (resolved with
  `indexOf`, so the dialog's `data-index` contract is preserved). Each card is
  the record's `overview.image` (lazy, placeholder `onerror` fallback), the
  `title`, the `tagline`, and a meta line: the award count when non-zero,
  otherwise the record's `venue`.

`buildRail()` builds the same list: About, News, then one label per room using
`room.key`, then Leadership, Honours, Contact.

`projectCopy()` and `projectMedia()` are reused unchanged for the overlay, so the
panel it shows is literally today's project panel.

New functions:

- `openProject(index)` — resolves the record, sets the overlay's art class and
  `--pos` from `PROJECT_ART[p.id]`, `data-side` from the index parity (same
  alternation as today), injects the back button + `projectCopy` + `projectMedia`,
  reveals the overlay, locks page scroll, moves focus into it and remembers the
  card that opened it.
- `closeProject()` — hides the overlay, releases its scroll lock and returns
  focus to the opening card.
- `setLock(on)` — a small count: the overlay and the dialog both use it, so
  closing the dialog while the overlay is still open keeps the page locked and
  Lenis stopped; the page only unlocks when the last layer closes. Lenis is
  stopped on 0→1 and started on 1→0.
- `trapTab(event, container)` — the existing dialog Tab logic extracted and
  shared by the dialog and the overlay.

`wireDelegation()` listens on `document` instead of `#page` (the overlay lives
outside `#page`), dispatching `data-kind="panel"` → `openProject`, the existing
`project` / `leadership` / `honors` kinds → `openRecord`, and `data-close-view`
→ `closeProject`.

`openProject` falls back to the category's `PAN` entry (then to `50% 50%`) when a
record id has no `PROJECT_ART` entry, so a new record can never render an
unpainted view.

Key handling becomes one document `keydown`: if the dialog is open it owns
Escape and Tab; otherwise, if the overlay is open, the overlay does. This
ordering is what stops one Escape from closing both layers.

`window.Profile` gains `openProject` / `closeProject`.

## The overlay (`index.html`, `css/styles.css`)

One shell element after `#page`:

```html
<div class="stop art--rice stop--project project-view" id="projectView" hidden
     role="dialog" aria-modal="true" aria-label="Project record" tabindex="-1"></div>
```

`.project-view` turns the painted panel into a fixed full-screen layer:
`position: fixed; inset: 0; z-index: 60; margin: 0; border-radius: 0;
overflow-y: auto` and `.project-view .stop-in { min-height: 100vh }`. The art and
scrim still come from `.stop::before` / `.stop::after`, so the overlay is painted
exactly like a page panel and each project keeps its own crop. The record dialog
(z-index 80) therefore stacks above it.

The back button (`.project-view__back`, text `← <room key>`) is the first thing
in the copy column; it carries `data-close-view` and closes the overlay.
Escape closes it too. Clicking the scrim does not close it (the layer is
full-bleed).

`PROJECT_ART` in `js/main.js` keeps each record's current crop so the overlay
looks like the panel that exists today
(`project1` rice 18% 56%, `project2` harvest 78% 44%, `project3` rice 76% 50%,
`project4` harvest 22% 66%, `project5` rice 44% 22%, `project6` harvest 56% 50%).
`PAN` shrinks to the eight page positions (hero 0, about 1, news 2, Robotics 3,
Applications 4, leadership 5, honours 6, contact 7) and its two category entries
use new crops (proposed: Robotics rice 30% 62%, Applications harvest 64% 38%;
both confirmed by screenshot).

## Category panel styles

- `.stop--category .copy` spans 4 columns and `.stop--category .media` spans 8
  (mirrored for `data-side="right"`), so three cards fit abreast on desktop
  instead of the six-column media cell the project panel uses.
- `.category-cards` is a 3-column grid (12px gap) on desktop; below 1024px it
  becomes one column and the existing responsive block stacks copy and media.
- `.project-card` is a button: frame-radius box, 1px border, dark translucent
  background, serif title, quiet tagline, mono meta, accent border on
  `:hover` / `:focus-visible`; the still is `aspect-ratio: 16/10`, `object-fit:
  cover`, lazy and placeholder-backed.
- `.category-count` is the mono, letter-spaced quiet line under the lede.
- No reveal attributes inside the overlay: `[data-reveal]` starts at `opacity: 0`
  and the reveal observer runs once at init, so injected content would stay
  invisible. The overlay instead fades in with a ~200 ms CSS animation that the
  existing `prefers-reduced-motion` block turns off.

## Accessibility

- Cards are real buttons, so each is keyboard-focusable and named by its title,
  tagline and meta.
- The overlay is `role="dialog" aria-modal="true"` and labelled with the project
  title; focus moves to the layer, Tab is trapped inside it, Escape and the back
  button close it, and focus returns to the card that opened it.
- With the record dialog opened from the overlay, the dialog is the top layer:
  its trap and Escape win, closing it returns focus to the overlay's "Open the
  record" button, and the page stays locked until the overlay also closes.
- Page scroll stays behind (body overflow locked, Lenis stopped) while either
  layer is open; reduced-motion users never get a Lenis instance, and the lock
  helper tolerates `scrollEngine` being null.
- No hash/history changes: both layers are views, not routes (see Out of scope).

## Tests and docs

`tests/page.test.mjs` is updated in the same change:

- Shell: `#projectView` exists, `hidden`, `role="dialog"`, `aria-modal`, and the
  dialog markup is unchanged.
- Renderer: `S.deriveRooms(`, `function categoryCopy(`, `function categoryCards(`,
  `function openProject(`, `data-kind="panel"`, `project-card`, `stop--category`,
  `project-view`.
- Data: six projects still; `deriveRooms` yields exactly 2 rooms of 3 with keys
  `Robotics` / `Applications`; the existing counts (4 leadership, 5 honour tiles,
  4 news) stay.
- Scroll-lock pins move from the literal `scrollEngine.stop()`/`start()` lines to
  `setLock(` plus the helper's stop/start pair.
- The `.stop-in` one-screen rule, palette, paintings, Lenis order, no-third-party
  and CSS-brace checks stay as they are.

`docs/library/` must be updated until `tests/library.test.mjs` is green again:

- `components/project.md` — rewritten around category panels, cards and the
  project view (it is the component page that owns this flow).
- `components/panel.md` — `.stop--category` and the new `PAN` / `PROJECT_ART`
  crop table.
- `components/rail.md` — the label list, not six project names.
- `components/dialog.md` — one line: the project view stacks beneath it.
- `selectors.md` — `.stop--category`, `.category-cards`, `.project-card` and its
  parts, `.category-count`, `.project-view`, `.project-view__back`, `#projectView`,
  `data-close-view`.
- `data.md` — `Site.deriveRooms` becomes *used*; prose no longer says the page
  calls only two helpers.
- `AGENTS.md` — Work description (two category panels), rail labels, the `PAN`
  gotcha (no longer indexed by project position), vocabulary entry for the
  project view, and the `docs/library` route.
- `README.md` — one paragraph on why Work is grouped by category.

Manual verification is required because the guard is static: 1440×900 and
1280×704 shots of both category panels and an open project view, 390×844 stack,
Escape order (view → dialog → view), focus restore, rail active tick, reduced
motion, and no horizontal scrollbar or title overflow.

## Out of scope

- URL/hash routing or browser-back support for a project view (both layers stay
  in-page views, like the dialog).
- Changing the categories, reordering projects, adding a seventh project, or
  editing project copy.
- Changing the record dialog, the films, the frames, or the art system.
- Any new dependency, build step or third-party load.

## Acceptance criteria

1. Work is exactly two painted category panels, Robotics then Applications, each
   with three project cards and the room lede/count.
2. Clicking a card opens the project's existing panel full-screen with its back
   button; Escape and the back button both return to the same page position and
   the opened card.
3. "Open the record →" in the project view still opens the record dialog; closing
   it returns to the project view, and the page stays locked until the view
   closes.
4. The rail lists 7 stops (Robotics/Applications replace the six project names)
   and its fill/active tick still track the page.
5. `npm test` is green (guard + data suites + library checks), with the guard's
   new assertions.
6. Manual screenshots at 1440×900, 1280×704 and 390×844 show no horizontal
   scroll, readable scrims, three cards abreast on desktop, one column on phone,
   and a fitted overlay.
