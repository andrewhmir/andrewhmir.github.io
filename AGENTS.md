# AGENTS.md — routing map for this repo

Written for an agent that has to change something here. `README.md` holds the
design prose and explains *why* the site looks the way it does — read it only
when you need the reasoning, not to find a file.

**Find a section by NAME, never by line number.** Line numbers move on the first
edit; every anchor below is a string you can grep for, and every one of them was
checked to resolve. Two rules that make them precise:

- Prefer the **function name** over prose: `function renderLabel(` is unique,
  where `renderLabel` alone is not.
- A CSS token is unique with its colon — `--label-col:` — and a CSS section is
  unique with its rule prefix, e.g. `── The exhibition label`. In
  `css/styles.css` every section name also appears in the Table of Contents at
  the top of the file, so a bare name returns two hits: the index and the
  section. Both are useful; the second is the code.

## What this is

A static personal portfolio: **no build step, no bundler, no package install to
run it.** Open `index.html` directly, or serve it. One npm script wraps the
tests; there are no runtime dependencies. Presentation is a single horizontal
walk — eight rooms side by side in one strip (About, two project rooms derived
from the data, Leadership, Honours, Contact), each record hung as a *stand*: a
cluster of framed photographs with one exhibition label beside them.

Three files carry the whole site:

| File | Lines | Holds |
|---|---|---|
| `js/data.js` | ~640 | `PORTFOLIO` — all authored content — plus the pure logic: room derivation, the hang layouts, the honours partition, the gallery lookup |
| `js/main.js` | ~1840 | Everything that renders `PORTFOLIO`: the cluster, the label, the rooms, the dock, the lighting, the dialog |
| `css/styles.css` | ~3160 | All styling. **76% of it is comment** — read the Table of Contents at the top, then jump to a section |

`index.html` is a 133-line shell: `#hall` → `#strip` (rooms are rendered into
it), the dock, the dialog, the announcer.

## Where to change what

Route by **intent**, not by file. If your intent is not in this table, find the
nearest one — the anchors are the shortest path to the surrounding code.

| Intent | Goes in | Anchor to search |
|---|---|---|
| Add or edit a project / post / honour | `js/data.js` | `projects: [`, `leadership: [`, `honors: [` |
| Add per-photograph titles or captions | `js/data.js` | the record's `pieces:` array |
| Bio, social links, news items | `js/data.js` | `bio: [`, `social: [`, `news: [` |
| Which rooms exist, their order, their titles | `js/data.js` | `function deriveRooms(`, then `ROOM_TITLES`, `ROOM_ORDER` |
| How many frames hang, and how they are arranged | `js/data.js` | `MIN_PIECES`, `MAX_PIECES`, `HANG_LAYOUTS` — three, in one stacked column |
| Which three pieces a record hangs | `js/data.js` | `function groupPieces(`, `function projectPieces(`, `function posterFor(` |
| A project's preview film | `js/main.js` + `css/styles.css` | `function initPreviews(`; `The film is a frame, not a control` |
| The frame's one shape | `css/styles.css` | `--frame-ar:` — the token with its colon |
| Which honours belong to a project | `js/data.js` | `function honoursSplit(`, and the `from: 'project` field on an honour |
| An award's photographs, in the dialog | `js/data.js` | `function awardPhotos(` |
| How a frame is sized — the band | `js/main.js` + `js/data.js` + `css/styles.css` | `function fitWall(`; `function bandFor(`; `The frame is one box` |
| A single column's frame height | `css/styles.css` | `A column's one budget` |
| The stand — the hang cell vs the label cell | `css/styles.css` | `The stand: the wall, and the label beside it`, `The hang cell` |
| The legend under the hang — the catalogue | `js/main.js` + `css/styles.css` | `function renderLegend(`, `function renderCatalogue(`; `── The legend` |
| The exhibition label's copy and furniture | `js/main.js` + `css/styles.css` | `function renderLabel(`; `── The exhibition label` |
| Room title, spacing, the walk's chrome | `css/styles.css` | `The room heading is the walk's sticky sign`, `Room furniture: the title` |
| The two gaps — between projects, and between categories | `css/styles.css` | `--group-gap:` — the token with its colon; `--room-gap:`; `The threshold between two categories` |
| The dock and its progress bar | `js/main.js` + `css/styles.css` | `function renderDock(`, `function initLights(`; `The dock: the walk`, `The narrow dock` |
| How big the photographs read | `css/styles.css` | `--label-col:` — the token with its colon, not the prose about it |
| The wall mural | `css/styles.css` | `#hall` — own background, `background-attachment: local` |
| The palette and text contrast | `css/styles.css` | `1. Custom Properties` |
| The lighting as a work arrives | `js/main.js` | `initLights`, or the banner `LIGHTING —` |
| The dialog, its focus trap, the carousel | `js/main.js` + `css/styles.css` | `openModal`, `trapFocus`; the banner `MODAL (single` |
| The horizontal walk — free scrolling, and no snap | `js/main.js` | `initWalk`, or the banner `THE WALK —` |

## Vocabulary — the code names things precisely

Half of the cost of a change here is using the wrong word and editing the wrong
thing. These are not synonyms:

| Term | Means | Code |
|---|---|---|
| **hall** | The document's only scroller. One axis: horizontal | `#hall` |
| **room** | One leg of the walk — Robotics, Applications, Leadership, Honours, About, Contact | `renderRooms` |
| **gallery** | A room's row of stands, as wide as its own hang | `.groups` |
| **stand** | The unit that hangs: **one record**, being a hang plus its legend plus its label. Not a *group* | `renderGroup`, `.group` |
| **cluster** | The three frames of one stand, stacked in one column | `renderCluster`, `.cluster` |
| **hang cell** | The stand's LEFT cell — it holds the cluster and the legend under it. Named `.hang-cell`, NOT `.wall`, which is reserved for the forbidden mural layer | `.hang-cell` |
| **legend** | The catalogue under the hang — one entry per photograph, in the hang cell | `renderLegend`, `.legend` |
| **catalogue** | The legend's list of entries | `renderCatalogue`, `.cat` |
| **label** | The stand's RIGHT cell — the record's own account, its awards, its team caption | `renderLabel`, `.label` |
| **piece** | One frame on the stand: a photograph, or a project's preview film | `.piece` |
| **preview** | A project's film, in the stand's first frame. Plays while the stand is in shot, and it is a player rather than a control, so it does NOT open the record | `.piece--video`, `initPreviews` |
| **lead** | The head frame of the stack — the film for a project, the first photograph otherwise | `.piece--lead` |
| **awaited** | A reserved frame with no photograph behind it yet | `.piece--pending` |

"A gallery is one screen tall" and "a stand is one screen wide" are both load
bearing, and confusing the two is how a layout edit goes wrong.

## Run and verify

```powershell
npm test                            # all ten unit suites, in order
node tests/renderer.test.mjs        # one suite, while iterating
node tools/serve.mjs 3333           # static server for the browser checks
```

The suites run **in-process** (`tests/harness.mjs`) because `node --test` spawns
children and fails under a confined sandbox. A suite prints `ok` per check and
exits non-zero on any failure; `npm test` stops at the first failing file.

| Suite | Covers |
|---|---|
| `tests/shell-check.mjs` | Markup structure, the exact palette, CSS brace/`var()` balance, and the hard constraints — statically |
| `tests/derive-rooms.test.mjs` | Room derivation, the pieces of a record, the honours partition |
| `tests/hang.test.mjs` | The three-frame contract, the poster frame, and the one stacked arrangement |
| `tests/band.test.mjs` | The band arithmetic — the wall, the cell and the tap floor, pinned to the pixel |
| `tests/renderer.test.mjs` | The rendered DOM contract, under a DOM stub |
| `tests/lights.test.mjs` · `light.test.mjs` | The lighting controller's contract and the falloff maths |
| `tests/delegation.test.mjs` | Every control in the walk does something |
| `tests/gallery-index.test.mjs` · `award-photos.test.mjs` | Dialog gallery lookups |

**The DOM stub models no CSS.** A layout rule can be wrong with every unit check
green — this has already happened here more than once. `tools/ux-check.mjs` is
the authority on anything geometric: it drives headless Chrome over the DevTools
Protocol and measures the fold, the dock, the room heading's pin, tap targets and
the dialog at 1440×900 and the spec's 1280×704 floor.

```powershell
# terminal 1
node tools/serve.mjs 3333
# terminal 2 — headless Chrome needs Mojo named pipes, so run this sandbox-off
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
# terminal 3
node tools/ux-check.mjs
```

`tools/README.md` indexes every probe, and says which one answers which symptom.

## Hard constraints — these have tests behind them

Changing one of these fails the suite or ships a defect that already shipped
once:

- **The palette is measured.** Every text tier must clear WCAG AA against the
  brightest wall ground, *and* the crown's luminance must stay above a floor. It
  must still read as lit — not a void. `shell-check.mjs` asserts both halves.
- **Tap targets are 44×44.** Frames are measured against their cell's padding
  box, not the stand: the cell is the box that clips.
- **A stand hangs exactly three frames, one size, stacked.** A project's first
  frame is its preview film, then the overview photograph, then the team
  photograph; every other record hangs its first three photographs and reserves
  a frame for one that has not arrived. All three are the same box at
  `--frame-ar` (16:9), cropped to fill, which is why a stand has one shape
  whichever record it carries. `hang.test.mjs` and `renderer.test.mjs` assert the
  count and the stack; `ux-check.mjs` asserts the box. A fourth photograph is
  not dropped — it is not hung, and stays reachable in the record's dialog.
- **A preview is a player, not a control.** A `<button>` may not contain a
  control and a preview needs one, so the film frame does NOT open the record:
  the two photograph frames under it are the way in. `ux-check.mjs` asserts the
  film is muted, looping, inline, pausable, and that a pause the visitor made is
  not undone by walking away and back.
- **Siblings are nearer than categories.** Two stands of one room are separated by
  `--group-gap`, a frame: the smallest gap that still leaves no neighbour in shot
  with a stand centred on the screen — the frame the deleted snap used to park
  on, and the one a hand scroll reads a stand in — derived from
  `(100vw − stand) / 2` and floored at a quarter of a stand. Two rooms are
  separated by `--room-gap`, a threshold spent
  as a room's own **right padding** — the room being left (`.room:not(:last-child)`)
  — and never as a gap in `#strip` nor as the arriving room's left padding: a
  flex gap is bare hall, which renders 1.41× brighter than the rooms it separates
  (28.91 against 20.44 at 1440×900), and padding-left delays the arriving room's
  heading pin by a whole band (ux-check read 1250 against 550). Padding is inside
  the box a background paints, so the band is the ground the projects hang on.
  Honours and About are one screen wide by construction and pay for the band in
  their own width rules. They shipped the other way round — 2,200px between two
  projects of one room against 69px between two rooms — and `shell-check.mjs`
  asserts the shape of both tokens, a half-screen (45vw) floor on the second,
  and where that second is spent. Only
  `ux-check.mjs` can measure which of the two is actually the larger, and it
  does, at all three viewports.
- **The mural is `#hall`'s own background with `background-attachment: local`.**
  Both halves are load-bearing and both fail silently. Never reintroduce a
  `.wall` element — no box inside this walk spans its scroll width, and
  `shell-check.mjs` fails on any top-level `.wall` rule. The stand's left cell is
  `.hang-cell` for exactly that reason; the vocabulary calls it the hang cell.
- **The room heading is the walk's sticky sign, and `align-self` is what makes
  it work.** `position: sticky` on a full-width flex item is inert: an element
  travels only through the distance between its own size and its containing
  block's, and `.room`'s column-flex `stretch` leaves that distance at zero. The
  rule is `.room > .room-title` — a bare class loses to `.room > *` in silence —
  and it carries `align-self: flex-start` for the slack and `max-width: 100%` so
  a long subtitle still wraps instead of painting over the next room. It pins to
  `--room-gutter`, the same token the room's own padding reads.
  `shell-check.mjs` asserts those declarations; only `ux-check.mjs` can say
  whether the heading actually MOVED. Do not reintroduce a second header
  element: the deleted `#roomRail` was a 15-19px copy of the name, and a copy is
  the fault, not the fix.
- **No sub-pixel dot grid.** A dot under one pixel quantises into hard vertical
  lines at a fractional device pixel ratio.
- **The walk is free, and no native CSS scroll-snap may come back.** Lenis
  smooths the journey and nothing latches it onto a stand: the JS snap
  (`lenis/snap`, `data-snap`, the walk's `snap` key and its `MutationObserver`)
  was removed whole, so `new Snap(…)` or a `data-snap` attribute is a
  regression, and `shell-check.mjs` fails on both. `ux-check.mjs` asserts the
  behaviour behind it — a real 200px **wheel** gesture from a stand's centre
  leaves the walk 200px from the nearest centre, where the tree that had the
  snap moved 0px and stayed on the centre. Note that the snap listened on
  Lenis's `virtual-scroll` event, so a programmatic `scrollLeft` write — what
  `scrollWalk` does — never exercised it and cannot detect its return. Native
  `scroll-snap` stays off for the other half of the reason it always did — a CSS
  snap container re-snaps when the position is set programmatically and fights
  Lenis, the dock's `goToRoom()` included.
- **`--band-h`, `--frame-h`, `--max-panel-h`, `--panel-h` and `--label-w` are
  retired**, with the stacked stand they described. Only comments and the probe
  docs name them now — no stylesheet rule declares them, and a probe that reads
  one reports the empty string. The live pair is `--frame-ar` (the shape of every
  frame) and `--wall-h` (the band its column divides, written by `fitWall`).
- **Everything is `border-radius: 0`.** There is no radius token.

## Gotchas

- **Line numbers in docs drift.** This file cites none; `css/styles.css` numbers
  its sections and says lines are not stable. Grep the name.
- **Only Windows PowerShell 5.1 is installed — `pwsh` does not exist.** 5.1 also
  renders native stderr (git progress) as a red `RemoteException` on success;
  check `$LASTEXITCODE`.
- **Headless Chrome cannot run under a confined sandbox** (named pipes), and a
  reused `--remote-debugging-port` can still be sitting on the previous URL.
- **`.tmp-diag/` is a live untracked scratch directory** holding ~30 MB of probe
  scripts and screenshots from the last diagnostics. Do not add it to a commit;
  decide whether to keep or delete it deliberately.
- **A change to a `.js` or `.css` file needs a page refresh** — there is no live
  reload and no dev server build.

## Deliberately absent

Do not add these to this repo without being asked: no build step, no bundler, no
npm runtime dependency, no test framework on disk (the harness is 15 lines), no
CDN at runtime, and no `node --test`. Lenis is the only dependency and it is
vendored, pinned by size and SHA-256 in `js/vendor/README.md`.

## Known cleanup, not yet done

- **19 dead selectors.** Referenced nowhere in `index.html`, `js/main.js` or
  `js/data.js`: `.hero-bio-container`, `.hero-cue`, `.hero-email`, `.hero-intro`,
  `.hero-links`, `.hero-painting-stage`, `.hero-photo-print`, `.hero-signature`,
  `.project-list`, `.project-source--closed`, `.project-source--open`,
  `.record-list--honors`, `.records-subheading`, `.scroll-progress`,
  `.scroll-top`, `.section-heading`, `.section-label`, `.section-note`,
  `.site-footer`. The stylesheet marks their sections `RETIRED`. Removing them is
  its own change with its own verification — it is not a documentation edit.
- **The stylesheet's comments are 76% of the file** (12,393 of 16,357 words). The
  prose there is genuinely valuable — it records measurements that stop a fixed
  defect returning — but it is also the single largest token cost in this repo,
  and `js/main.js` is written in the same style. If token cost becomes a real
  problem, this is the lever: split each section's rationale into a short
  `WHY:`-tagged note, or move the narrative to `docs/`, rather than deleting it.
  Do not do this without being asked; the comments are load-bearing for humans.

## Docs map

| File | Read it for |
|---|---|
| `AGENTS.md` | Routing, vocabulary, constraints, verification — start here |
| `README.md` | The design's reasoning, and the measurements behind each decision |
| `tools/README.md` | Every dev tool, and which probe diagnoses which symptom |
| `css/styles.css` | The Table of Contents at the top of the file |
| `docs/superpowers/` | Plans and specs for past builds — a historical record, never hand-edited |
| `tests/` · `tools/` | The suites and the probes themselves |
