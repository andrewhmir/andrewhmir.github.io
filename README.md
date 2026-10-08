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
and its frames — is sized so that when the walk parks on it, nothing of its neighbours is in shot: the
gap between two stands is about half a screen of bare wall, measured at 707px at 1536×864, and a stand
fills 66–86% of the screen's width. So the walk reads as a sequence of exhibits rather than as a
continuous frieze.

One room is one viewport tall, and the hall is the document's only scroller, on one axis:
horizontal. Chrome lives at the **foot** of the walk — a dock carrying every room and the current
one, with a rail along the bottom edge for position. Nothing is fixed over the top of a room.

A **stand** is the unit that hangs: one project or one leadership post. Its photographs
hang together in frames with mats — partitioned into columns by one of several **arrangements**,
dealt from the stand's own key so neighbouring stands differ and a reload never reshuffles the wall —
and one label beside them carries a plan of the hang, the paragraph that frames the stand, and a
catalogue entry per photograph.

**The label is the only place a visitor can find out what they are looking at**, so its letters are
the label's own index. The plan's box and the catalogue entry's key carry the same letter — keyed on
the same piece index, so they cannot disagree, and the letter sits in the middle of its box — and a
visitor reading entry C finds C in the plan of the hang. The frames on the wall hang clean, because a
letter badged onto a photograph reads as part of the work. A stand with a single photograph is not
lettered, because there is nothing to tell apart.

**What a photograph is called comes from its record's `pieces[]`**, and from nowhere else: `title` is
what the picture shows, `caption` is a sentence about it. Where a record declares none, the entry falls
back to "Photograph B" and the picture is undescribed — running `node tools/caption-worklist.mjs` lists
every photograph still in that state, with its letter and its file, as a block to paste back into
`js/data.js`. The line beneath is the file's own name, deliberately: a prettified stem like "Palad
Team" reads like a description and is not one.

Every stand hangs **three to six frames**. A record that declares fewer hangs empty gilt frames where
its photographs will go, rather than one thin frame on a wide wall; a record that declares more hangs
its first six. An awaited frame draws no picture at all — it is a reserved place on the wall — and the
label names however many are awaited in a single line rather than repeating "Photograph awaited" for
each.

Because a gallery is exactly one viewport tall inside a hall with `overflow-y: hidden`, there is no
vertical axis to overflow into: the single row is what makes the width work. A frame's width follows
its own photograph, so nothing is ever cropped or letterboxed.

**A stand is a row of two cells, and they are not equal.** The hang is the left cell and the label
that reads it is the right, each taking the stand's full height — the label is *beside* the pictures,
not beneath them. It was two stacked bands until this build: a picture band fixed at 156px with the
label at the stand's full width below it, which measured 765.7px inside a 724px band at 1536×864, so
the room title was drawn 15px above the top of the window and the last award 48px under the dock —
116px over at the spec's 1280×704 floor.

`--label-col` is the right cell and it is a share of the viewport rather than a fixed width, so the
proportion survives every screen: 691px at 1440 and 614px at 1280. The wall takes what is left, and
it needs the larger share — a frame's width follows its photograph, so a narrow wall does not make
its pictures smaller, it makes them narrower and taller until a 2.251-ratio photograph is squeezed to
the 44px tap floor. Measured at a 317px wall: three frames of 44×691, which is a wall of lines.

**How large a photograph reads is decided by the wall's band and its column's depth.** A column
divides the band between its own frames, so a column of two stands tall and a column of three splits
the same band three ways, and no arrangement can overrun the fold because the deepest column is the
one that divides by the most. That is also why every arrangement keeps its columns at most three deep
— a column of five would have hung five frames one-fifth of the band tall. Every arrangement is at
most two rows deep, which is the deepest that keeps the narrowest frame above the 44px tap floor in
a wall this wide.

**A column the arrangement drops is held by the cell, not cut by it.** An arrangement offsets a
column down by 14px so a stack never reads as one tall frame, and that offset is a margin — so the
dropped column's outer box is 14px taller than the band, and the frame at its foot hangs that far
below the cell. The cell's `overflow: hidden` is what stops a hang painting over its neighbour, so
it cut the difference off: measured, 10 of the collection's 32 frames — one per stand — each lost
exactly 14px, the gilt and the mat and, on six of them, part of the photograph itself. An awaited
frame in that position is the shape a visitor reported: a black rectangle with no bottom edge, which
is a hole rather than a reserved place. `--drop` is now the deepest offset the arrangement actually
deals, written on the cluster by `renderCluster` and spent as the cell's own `padding-bottom` with
`box-sizing: content-box`, so the room is added below the band instead of being taken out of it.
`ux-check` measures every frame against its cell's padding box — the edge the clip really happens at
— rather than against the stand, which is the looser box that let this ship.

**The band is solved, not chosen.** A frame's width follows its photograph, so a hang needs
`band × (the sum of its aspect ratios)` of wall. `fitWall` in `js/main.js` solves that for the band
— `(wall − gaps) / SUM(column arSum / column rows)` — from the photographs themselves, on load, on
resize and after the fonts settle; `css/styles.css`'s `--wall-h` clamp is the band until the first
photograph arrives. Without that solve the frame is an arbitrary box and `object-fit` draws the
photograph letterboxed inside it: measured, 15 of 23 frames at 1536×864 were 63–77% black bar
before the solve existed, and `ux-check` now asserts no photograph is letterboxed by comparing each
photograph's content box to its natural ratio.

`--label-col` (the label's cell, which sets the wall's width) is the other dial. `--band-h`,
`--frame-h`, `--max-panel-h` and `--label-w` are retired with the stacked shape they described.
`tools/stand-fit.mjs`, `tools/avg-frame.mjs` and `tools/label-fit.mjs` measure what they produce.

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
├── index.html          Entry point — the hall, the strip, the dock, the rail, the dialog
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
layout: the fold, the dock band, the rail, tap targets, the dialog's focus containment, the
lighting contract, and every room's fit at 1440×900 and at the spec's 1280×704 floor. It is also
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
