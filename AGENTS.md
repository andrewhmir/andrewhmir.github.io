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
| How many frames hang, and how they are arranged | `js/data.js` | `MIN_PIECES`, `MAX_PIECES`, `HANG_LAYOUTS` |
| Which honours belong to a project | `js/data.js` | `function honoursSplit(`, and the `from: 'project` field on an honour |
| An award's photographs, in the dialog | `js/data.js` | `function awardPhotos(` |
| How a frame is sized — the band | `js/main.js` + `css/styles.css` | `function fitWall(`; `The wall: one budget` |
| A single column's frame height | `css/styles.css` | `A column's one budget` |
| The stand — the hang cell vs the label cell | `css/styles.css` | `The stand: the wall, and the label beside it`, `The hang cell` |
| The legend under the hang — the catalogue | `js/main.js` + `css/styles.css` | `function renderLegend(`, `function renderCatalogue(`; `── The legend` |
| The exhibition label's copy and furniture | `js/main.js` + `css/styles.css` | `function renderLabel(`; `── The exhibition label` |
| Room title, spacing, the walk's chrome | `css/styles.css` | `The room heading is the walk's sticky sign`, `Room furniture: the title` |
| The dock and its progress bar | `js/main.js` + `css/styles.css` | `function renderDock(`, `function initLights(`; `The dock: the walk`, `The narrow dock` |
| How big the photographs read | `css/styles.css` | `--label-col:` — the token with its colon, not the prose about it |
| The wall mural | `css/styles.css` | `#hall` — own background, `background-attachment: local` |
| The palette and text contrast | `css/styles.css` | `1. Custom Properties` |
| The lighting as a work arrives | `js/main.js` | `initLights`, or the banner `LIGHTING —` |
| The dialog, its focus trap, the carousel | `js/main.js` + `css/styles.css` | `openModal`, `trapFocus`; the banner `MODAL (single` |
| The horizontal walk and its snap | `js/main.js` | `initWalk`, or the banner `THE WALK —` |

## Vocabulary — the code names things precisely

Half of the cost of a change here is using the wrong word and editing the wrong
thing. These are not synonyms:

| Term | Means | Code |
|---|---|---|
| **hall** | The document's only scroller. One axis: horizontal | `#hall` |
| **room** | One leg of the walk — Robotics, Applications, Leadership, Honours, About, Contact | `renderRooms` |
| **gallery** | A room's row of stands, as wide as its own hang | `.groups` |
| **stand** | The unit that hangs: **one record**, being a hang plus its legend plus its label. Not a *group* | `renderGroup`, `.group` |
| **cluster** | The photographs of one stand | `renderCluster`, `.cluster` |
| **hang cell** | The stand's LEFT cell — it holds the cluster and the legend under it. Named `.hang-cell`, NOT `.wall`, which is reserved for the forbidden mural layer | `.hang-cell` |
| **legend** | The catalogue under the hang — one entry per photograph, in the hang cell | `renderLegend`, `.legend` |
| **catalogue** | The legend's list of entries | `renderCatalogue`, `.cat` |
| **label** | The stand's RIGHT cell — the record's own account, its awards, its team caption | `renderLabel`, `.label` |
| **piece** | One framed photograph on the wall | `.piece` |
| **lead** | The piece that opens the record when pressed | `.piece--lead` |
| **awaited** | A reserved frame with no photograph behind it yet | `.piece--pending` |

"A gallery is one screen tall" and "a stand is one screen wide" are both load
bearing, and confusing the two is how a layout edit goes wrong.

## Run and verify

```powershell
npm test                            # all nine unit suites, in order
node tests/renderer.test.mjs        # one suite, while iterating
node tools/serve.mjs 3333           # static server for the browser checks
```

The suites run **in-process** (`tests/harness.mjs`) because `node --test` spawns
children and fails under a confined sandbox. A suite prints `ok` per check and
exits non-zero on any failure; `npm test` stops at the first failing file.

| Suite | Covers |
|---|---|
| `tests/shell-check.mjs` | Markup structure, the exact palette, CSS brace/`var()` balance, and the hard constraints — statically |
| `tests/derive-rooms.test.mjs` | Room derivation, group pieces, the honours partition |
| `tests/hang.test.mjs` | The 3–6 photograph budget and the hang arrangements |
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
- **A stand hangs 3 to 6 frames.** Fewer hangs empty gilt frames; more hangs the
  first six.
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
- **No native CSS scroll-snap.** It re-snaps when the position is set
  programmatically and fights Lenis.
- **`--band-h`, `--frame-h`, `--max-panel-h` and `--label-w` are retired**, with
  the stacked stand they described. Only comments name them now.
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
