# Project stop

The Work wrapper and its project panels: eyebrow, title, copy, optional awards,
and the button that opens the shared record dialog.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<a href="#work">` |
| Render | `js/main.js` | `/* 3 — work` · `work.className = 'work';` · `work.id = 'work';` |
| Render | `js/main.js` | `P.projects.forEach(function (p, i) {` · `cls: 'stop--project',` |
| Render | `js/main.js` | `function projectCopy(` · `Open the record →` |
| Styles | `css/styles.css` | `── Project panel extras` · `.awards {` · `.awards li {` |
| Styles | `css/styles.css` | `── Type` · `.eyebrow {` |
| Data | `js/data.js` | `projects[].id` · `projects[].title` · `projects[].category` · `projects[].venue` · `projects[].tagline` · `projects[].summary` |
| Data | `js/data.js` | `projects[].awards` |
| Test | `tests/page.test.mjs` | `'work'` · `P.projects.length` |

## Structure

`render()` creates the `.work` wrapper (`#work`) and appends one
`section.stop` with `stop--project` per `PORTFOLIO.projects` record, in array
order; the stop's id is the record id (`project1`…`project6` today). Each
panel's `.copy` cell is `.eyebrow` (category · venue), an `<h2>` title, `.lede`
tagline, `.body` summary, an optional `.awards` list and an "Open the record →"
`.btn`. The `.media` cell is the three-frame stack — see
[frames.md](frames.md).

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Project copy | `projects[]` fields in `js/data.js` (`title`, `tagline`, `summary`, `category`, `venue`) | screenshot each stop |
| Awards on a project | the record's `awards:` array of `{ description, year }`; the `<ul class="awards">` renders only when the array is non-empty | `npm test` data suites; screenshot |
| The button that opens the record | `projectCopy(` emits it with `data-kind="project"` and `data-index`; the dialog page owns the destination | click a project panel button |
| A project's stop id, rail label and position | `projects[].id` and array order in `js/data.js` | rail jumps to the record id; `page.test.mjs` count |
| Where the panel sits in `#work` | the `P.projects.forEach` loop in `render()` | screenshot; the first stop is the wrapper's landing point |
| Which crop a project uses | `PAN[2 + i]` — the crop table on the panel page | screenshot |

## Invariants

- One `.stop--project` per `PORTFOLIO.projects` record, in array order; the rendered id is the record id, so it doubles as the rail anchor.
- `#work` lives on the `.work` wrapper, not on a project panel, so the Work nav link lands on the first project.
- The copy is assembled only by `projectCopy(`; no project markup is authored in `index.html`.
- The awards list appears only when the record has awards; project awards are excluded from the Honours tiles by `from: 'projectN'` (the honours page owns that partition).
- Copy-side alternation is positional (`i % 2 === 0 ? 'left' : 'right'`), so the side follows page position, not the record.
- Frame labels and the button text are literals in the renderer, not data fields.

## Traps

- Adding a seventh project collides with `PAN[9]` (Leadership) and shifts every later crop; extend `PAN`, the rail and `page.test.mjs`'s six-project count together — see the `PAN` gotcha in `AGENTS.md`.
- Reordering `projects` changes page order, rail order, every later `PAN` crop and the copy-side alternation: one data edit, many visual changes.
- The `.awards` list is not the Honours list. Project awards live here as text and are excluded from tiles by `from: 'projectN'`; do not duplicate them.
- "Overview", "Film", "Team" and "Open the record →" are literals inside `projectMedia(` / `projectCopy(`; editing data does not change them.
- `data-kind="project"` plus `data-index` is the dialog contract; a control missing either is inert because delegation selects `[data-kind][data-index]`.
- `#work` is a plain wrapper, not a stop. The rail observes `.stop[id]` only — do not give the wrapper a panel class.
