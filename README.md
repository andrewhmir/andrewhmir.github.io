# Andrew Alangcao

**Data Engineer | Computational Cognition Researcher**

> **Editing this repo?** Read [`AGENTS.md`](AGENTS.md) first — it routes an
> intent ("change how frames are sized") to the file and the section, and lists
> the vocabulary and the constraints that have tests behind them. This README is
> the design's reasoning: read it when you want to know *why*, not *where*.

Personal portfolio website, built as a single horizontal walk through a dark gallery: eight rooms
side by side in one strip, each project, post and award hung as a **group** — a composition of
framed photographs carrying one exhibition label — and the honours that stand alone read as a
three-column list of tiles. Vanilla HTML, CSS and JavaScript — no frameworks and no build step.

## About

My work and studies revolve around understanding perception as a foundation for building more general, adaptive AI systems, with the long-term goal of contributing to AGI development — all to improve everyday life for people in the Philippines and around the world.

## The walk

A gallery is one viewport tall and **as wide as its own hang**. Its groups run in a single row that
carries on past the screen edge, and the gallery ends where its last group does. The only floor is one
screen, so a short gallery is never narrower than the window and a visitor is always standing inside
one named gallery rather than looking at two.

Within that row, **one stand is one screen**. A stand — a project or a post, with its label
and its frames — is sized so that when the walk parks on it, nothing of its neighbours is in shot:
the gap between two stands of the SAME room is the smallest one that keeps that true — a quarter of
a stand, 275px at 1440×900, 1536×864 and 1280×704, against the 170 / 218 / 90px those windows
actually need — and a stand fills 66–86% of the screen's width. So the walk reads as a sequence of
exhibits rather than as a continuous frieze.

The walk measures **two** distances, and they are not the same size. Siblings in one room are
separated by that frame; two ROOMS are separated by a threshold: 45vw of wall, 717px between the
last stand of one room and the first of the next at 1440×900, against 275px between two stands of one
room. It is spent as a **room's own right padding** — the room the visitor is leaving — and never as
a gap in the strip: a flex gap is bare hall, and bare hall measures 28.91 where the room's own ground
measures 20.44 (1.41× brighter), one flat lit screen of mural in the middle of a dim walk. The
arriving room's left padding cannot carry it either: padding-left pushes that room's content box a
band to the right, and its sticky heading then cannot reach its pin until the band has gone by
(measured at 1250 against 550). As right padding the band is the same ground the projects hang on,
20.44 against 20.93 for the room's own wall between two stands, and each room's 1px recess is the
joint at the far edge of it. It was the other way round: `--group-gap` was `2 × --stand-w`, so two
projects of one room stood 2,200px apart while two categories touched, 69px apart at 1440×900.

One room is one viewport tall, and the hall is the document's only scroller, on one axis:
horizontal. Chrome lives at the **foot** of the walk — a dock carrying every room and the current
one, with the walk's progress drawn inside it as a track. Nothing is fixed over the top of a room:
each room's own heading carries `position: sticky` and travels with the walk, so the name on screen
is the heading itself rather than a second, smaller copy of it.

A **stand** is the unit that hangs: one project or one leadership post. Its three frames hang
stacked in one column, all the same size, with a **legend** of one catalogue entry per frame beneath
them, and one **label** beside the whole cell carrying the record's own account, its awards and its
team caption. A project's first frame is its **preview film**, which plays while the stand is in shot;
the two photograph frames under it are the way into the record, because a button may not contain the
controls a film needs.

**The legend is the only place a visitor can find out what a photograph is**, and it stands under the
photographs it names: an entry is the text for one picture, so a picture and its name are not in
different columns of the stand. Each entry carries the photograph's letter, its title, its caption and
the file it came from; the frames on the wall hang clean, because a letter badged onto a photograph
reads as part of the work. A stand with a single photograph is not lettered, because there is nothing
to tell apart.

**What a photograph is called comes from its record's `pieces[]`**, and from nowhere else: `title` is
what the picture shows, `caption` is a sentence about it. Where a record declares none, the entry falls
back to "Photograph B" and the picture is undescribed — running `node tools/caption-worklist.mjs` lists
every photograph still in that state, with its letter and its file, as a block to paste back into
`js/data.js`. The line beneath is the file's own name, deliberately: a prettified stem like "Palad
Team" reads like a description and is not one.

Every stand hangs **exactly three frames, all the same size**. For a project they are its preview
film, its overview photograph and its team photograph; for a leadership post, its first three
photographs. A record that declares fewer hangs a reserved frame where the photograph will go, rather
than two frames on a wall built for three; one that declares more does not drop a photograph — a
Leadership post's fourth is simply not hung, and stays reachable in the record's own dialog. An
awaited frame draws no picture at all — it is a reserved place on the wall — and the label names
however many are awaited in a single line rather than repeating "Photograph awaited" for each.

One frame size for every stand means one SHAPE for every frame, and it is `--frame-ar` in
`css/styles.css`: 16:9, cropped to fill with `object-fit: cover`. That is a reversal, and a
considered one. While a frame followed its own photograph's proportions the two alternatives were
rejected — `contain` left black bars (measured, 15 of 23 frames at 1536×864 were 63–77% bar) and
`cover` cropped. One size for every frame is the design now, and of the two ways to put a photograph
of one shape into a box of another, a crop is the one that still reads as a photograph.

Because a gallery is exactly one viewport tall inside a hall with `overflow-y: hidden`, there is no
vertical axis to overflow into: the single column is what makes the width work.

**A stand is a row of two cells, and they are not equal.** The left cell holds the hang and the legend
beneath it; the right cell is the label that reads the record. Each takes the stand's full height — the
label is *beside* the pictures, not beneath them. It was two stacked bands until an earlier build: a
picture band fixed at 156px with the label at the stand's full width below it, which measured 765.7px
inside a 724px band at 1536×864, so the room title was drawn 15px above the top of the window and the
last award 48px under the dock — 116px over at the spec's 1280×704 floor.

`--label-col` is the right cell and it is a share of the viewport rather than a fixed width, so the
proportion survives every screen: 634px at 1440, 669px at 1520, 676px at 1536 and 704px at 1600 (its
720px ceiling binds at about 1640 and holds above that). The left cell takes what is left. It used to
need the larger share because a frame followed its photograph's width, so a narrow cell made its
pictures narrower and taller until a 2.251-ratio photograph was squeezed to the 44px tap floor —
measured at a 317px wall, three frames of 44×691, a wall of lines. A frame is one box now, so the cell
binds through the BAND the solve is allowed rather than through a frame's own proportions. The stand
is `clamp(1100px, 68vw, 1440px)`, so that leaves the hang cell 435px at 1440, 390px at 1536, 361px at
1600 and 546px at 1920.

The legend is 62% of that cell's width and it shares the pictures' LEFT edge — the two no longer share a
right edge, because a frame's width is the solved band times `--frame-ar` (331px in a 435px cell at
1440×900) where 62% is 270px. Making the caption follow the pictures instead is a feedback loop, since
this block's own height is part of what the band is solved around; `css/styles.css` records it. It is
pinned to the cell's foot, which leaves the band of wall between the pictures and their names that a
hang centred on a wall has. `--label-side` is the label's own interior split — 30% for the furniture
(the summary, the awards, the team caption) beside the account's two columns. Both numbers are
measured, not chosen: a narrower furniture column wraps the awards until *they* are the tall pole and
the label scrolls, and a wider one takes the width the account needs.

The label column **does not scroll at any desktop viewport from 1366×768 up** — below that the stand is
wider than the window and the walk is a pan, not a page — which is the change that put the legend under
the hang: the catalogue was the tallest block of the label's furniture column, and the label's own
content came to 743px inside a 690px box at 1440×900, a scrollbar over copy a visitor had to go looking
for. The 1280×704 floor still scrolls, by 44px on its worst label where it used to scroll by 273px on
six of them; a `max-height: 800px` query widens the label to buy back what width can, and nothing there
is clipped either way — `ux-check` reports the scrolls as information and fails only on copy that is cut
off.

**How large a photograph reads is decided by the band, and the band is solved.** Every frame is one
box, so a stand's shape is fixed: a column of three frames is `(band − gaps) / 3` tall each and 16:9
times that wide. Two things bound the band — the cell's width, and the HEIGHT the cell has left after
its legend — and for a stack of three landscape frames the height is the one that binds, because the
column is taller than it is wide. `Site.bandFor` in `js/data.js` does that arithmetic (it is pure, and
`tests/band.test.mjs` pins it to the pixel); `fitWall` in `js/main.js` measures the two numbers and
`css/styles.css`'s `--wall-h` clamp is the band until it runs. The loading floor is part of the same
solve: a band may not take the frames under the tap target, so the floor is `44 × rows + gap × (rows −
1)` and a floor that forgets the gaps comes out at 39px on a frame.

The solve no longer reads any photograph's aspect ratio, which is a simplification worth naming: it
used to run again on every `load`, because a frame's width followed its photograph and there was no
ratio to solve with until the bytes arrived. One ratio, one shape, and the solve is the same before and
after a photograph loads.

**A column an arrangement drops is held by the cell, not cut by it.** The one arrangement this walk
deals — three frames in one column — publishes `drop: [0]`, because a single stack of one size is
meant to read as a stack. The mechanism is kept and it is not decorative: it is the record of a fault
that shipped once, and it is what a future arrangement offsets a column with. An arrangement offsets a
column down by 14px, and that offset is a margin — so the dropped column's outer box is 14px taller
than the band, and the frame at its foot hangs that far below the cell. The cell's `overflow: hidden`
is what stops a hang painting over its neighbour, so it cut the difference off: measured, 10 of the
collection's 32 frames — one per stand — each lost exactly 14px, the gilt and the mat and, on six of
them, part of the photograph itself. An awaited frame in that position is the shape a visitor reported:
a black rectangle with no bottom edge, which is a hole rather than a reserved place. `--drop` is the
deepest offset the arrangement actually deals, written on the cluster by `renderCluster` and spent as
the cell's own `padding-bottom` with `box-sizing: content-box`, so the room is added below the band
instead of being taken out of it. `ux-check` measures every frame against its cell's padding box — the
edge the clip really happens at — rather than against the stand, which is the looser box that let this
ship.

**The band is solved, not chosen** — `Site.bandFor` in `js/data.js` holds the arithmetic, `fitWall`
in `js/main.js` does the measuring, and `tests/band.test.mjs` pins the numbers. The solve is run once
on load, on resize and after the fonts settle; it no longer re-runs when a photograph arrives, because
it no longer reads any photograph's ratio.

`--label-col` (the label's cell, which sets the wall's width) and `--frame-ar` (the shape of every
frame) are the two dials. `--band-h`, `--frame-h`, `--max-panel-h` and `--label-w` are retired with the
stacked shape they described. `tools/stand-fit.mjs`, `tools/avg-frame.mjs` and `tools/label-fit.mjs`
measure what they produce.

**The label column scrolls when its content does not fit, and the suite can tell that apart from
clipping.** The arithmetic does not always close: at the 1280×704 floor PALAD's label needs 530px of
a 502px cell and BiyaHey!'s 617px, and at 1536×864 Hivemind — 1,369 characters, the longest account
in the collection — needs 741px of 650px. The alternatives were each worse for a visitor: an account
below its 12.5px floor, a frame narrower than a photograph, or a paragraph that is clipped and
invisible until someone reads to the bottom. So the label scrolls, with a gradient cue, and both
`tools/ux-check.mjs` and `tools/label-fit.mjs` read `overflow-y` before they call a label clipped —
`hidden` is copy a visitor cannot reach, `auto` is copy they can.

## Honours, and where an award lives

An award is a project's award, so it belongs to the project: the Robothon placings, the Muntinlupa
title and the DLSU-D citation are read in the **Awards** dialog on the project's own stand — the
button sits on its exhibition label, under the paragraph that frames the project and above its
catalogue of photographs. An honour that is nobody's project — a commencement citation, a CERN-Solvay
shortlisting, a congress delegation — stands alone.

That button is the **only** way to those awards, because the walk hangs groups rather than cards.
There is no second copy of them on the wall, so a control that stops rendering takes eight awards off
the site with nothing looking broken: `tests/renderer.test.mjs` asserts one control per project that
declares awards, and `tools/ux-check.mjs` presses one and reads the dialog back against the data.

`js/data.js` says which is which with one authored field, `from: 'projectN'`, on the honours that are
a project's award. `Site.honoursTiles(honours)` splits the array on it and returns `{ tiles,
projectAwards }`, each entry carrying the record's **true index** into the unfiltered array because
that is what `Site.galleryFor` resolves against. The split reads the field rather than matching the
description against the project's own award text: the wall and the label name one win in two wordings,
and no predicate over those strings can be trusted to leave a record on exactly one side. It is a
total partition, so a mis-filed honour is a failing test rather than an honour that quietly left the
site.

The Honours room is then a **three-column list of tiles** — one tile per honour that stands alone,
carrying its year, its description, and whether there are photographs behind it. A tile with
photographs is a real button and opens them in the shared dialog; one without is a plain panel that
says "Photographs awaited", because a focusable control that opens nothing is worse than a row that
plainly is not one. Three columns is not a preference: the room is one screen tall with no vertical
axis, so a fourth row would be clipped with nowhere to scroll to, and `tools/ux-check.mjs` measures
the columns, the rows and the tile boxes at both reference viewports.

## Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, container queries, responsive design, a lit gallery palette on a
  near-black wall

  The palette is *lit*, not near-black throughout: the wall is near-black and the light in the
  room is not. Retuning it is two dials and they are a single constraint — `--wall-scrim` and the
  crown stop of `.room` set how open the wall is, and `--text-quiet` is the tier that has to
  survive it, because the crown is the brightest ground any text on the page meets. The tier that
  ships spent its whole margin on this once already, so `tests/shell-check.mjs` now asserts both
  halves: every tier clears WCAG AA *and* the crown's luminance stays above a floor, so the wall
  can be opened further but cannot be quietly closed again.
- **Vanilla JavaScript** — Data-driven rendering
- **Lenis 1.3.26** — Smooth horizontal scrolling, vendored in `js/vendor/`. MIT ©
  darkroom.engineering. This is the site's only dependency: it is committed, pinned by
  size and SHA-256 (`js/vendor/README.md`), and never resolved from a CDN at runtime.
  There is still no build step, no bundler and no package install needed to serve the site.

## Structure

```
├── index.html          Entry point — the hall, the strip, the dock, the dialog
├── css/
│   └── styles.css      All styles
├── js/
│   ├── data.js         Single source of truth — all content, the room derivation,
│   │                   the group split, and the honours tiles
│   ├── main.js         Group renderer, label renderer, tile renderer, the light
│   │                   controller, the Lenis walk, the dock, the dialog
│   └── vendor/         Lenis 1.3.26, vendored and pinned (see its README)
├── tests/              In-process unit suites (no test framework, no spawn)
├── files/              Images, videos, and assets
│   └── posters/        Poster frames for the project preview videos
├── tools/              Dev-only checks and asset generators (not required to run the site)
├── docs/               Plans and design notes
└── .gitignore
```

## Adding content

Every label is derived from `js/data.js`. A record may carry two optional fields, both authored:

```js
{
  description: "Some Award – Champion",
  year: "April 2026",
  images: ["files/award-1.jpg", "files/award-2.jpg"],
  summary: "The paragraph that frames the group.",        // optional
  pieces: [                                               // optional, one per image
    { title: "At the podium", caption: "Receiving the award." },
    { title: "With the team" }
  ]
}
```

Both are optional and every level falls back, so a record added without copy still renders: the
narrative falls back to the record's own description, and a piece with no title is named for its
position. `npm test` asserts that every shipped record has authored copy rather than fallback text.

An **honours** record, and only an honours record, may also carry `from: 'projectN'`. Add it when the
honour IS that project's award, and add the same award to the project's own `awards` array — the
renderer suite fails if you give a project an award it does not list, or list one the honour does not
name, and the project's label grows an Awards button as soon as its `awards` array is non-empty.
Without `from`, the record is an honour that stands alone and is drawn as a tile in the Honours
room. Its `images` are then fetched when a visitor presses the tile rather than hung on a wall.

`images` is also the hang's budget, not just its content: a record that declares fewer than three
hangs empty frames up to three, and one that declares more than six hangs its first six. So a record
added with one photograph still gets a full composition, and adding the rest later is a data edit
with nothing else to change. The budget applies to a **stand** — a project or a leadership post; an
honour's photographs are a gallery in the dialog, not a hang.

## Running Locally

Open `index.html` in any browser — no server or build step required.

## Tests

The unit suites run **in-process** with a ten-line runner (`tests/harness.mjs`) instead of
`node --test`, which spawns child processes and fails under a confined sandbox:

```powershell
node tests/shell-check.mjs         # markup, palette and the hard constraints, statically
node tests/derive-rooms.test.mjs   # rooms, group pieces and the honours partition
node tests/hang.test.mjs           # the 3-6 photograph budget and the hang arrangements
node tests/light.test.mjs          # the light falloff maths
node tests/lights.test.mjs         # the lighting controller's contract
node tests/renderer.test.mjs       # the rendered DOM contract, under a DOM stub
node tests/gallery-index.test.mjs  # the honours gallery index lookup
node tests/delegation.test.mjs     # every control in the walk does something
npm test                           # runs the above in order
```

The suites that drive `js/main.js` run it under a DOM stub (`tests/dom-harness.mjs`). It does
**not** model CSS layout — a layout rule can still be wrong with every check green, so the browser
suite below remains the authority on anything visual.

`tools/ux-check.mjs` drives headless Chrome over the DevTools Protocol and is the authority on
layout: the fold, the dock band, the room heading's pin, tap targets, the dialog's focus containment,
the lighting contract, and every room's fit at 1440×900 and at the spec's 1280×704 floor. It is also
the only place a gallery's width, the depth of the tallest hang and a label's fixed basis can be
measured at all — the DOM stub models no CSS. It needs headless Chrome, which needs named pipes —
see `tools/README.md`.

`tools/rooms.mjs` prints per-room geometry, `tools/stand-fit.mjs` and `tools/stand-gap.mjs` measure
the band a stand may use and how much bare wall it leaves either side, and `tools/avg-frame.mjs`
prints the one number for "how big do the pictures read": photograph area per screen. All of them
force `loading="lazy"` images to load first, or they would measure frames the walk has not reached.
See `tools/README.md` for the full table.

## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.
