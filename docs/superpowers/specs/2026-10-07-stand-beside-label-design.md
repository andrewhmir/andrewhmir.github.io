# The Stand Beside Its Label — Design Spec

**Date:** 2026-10-07
**Status:** Draft for review
**Supersedes:** the two-band stand (pictures above, full-width label beneath) introduced by
`2026-10-04-museum-label-design.md`, and the `--band-h` fixed picture band from
`2026-10-04-wide-galleries-design.md` §6.1.

---

## 1. Summary

A stand is currently two stacked bands: a picture band fixed at `156px` and a label that is
the stand's full width beneath it. That shape has three faults, all measured at 1536×864 on
the Project PALAD stand and at the spec's 1280×704 floor:

1. **The label overruns the fold.** `.group` measures 765.7px against a 724px band, so the
   stand is centred on a line that does not exist: the room title is drawn at **y = −14.7**
   (clipped by the viewport edge) and the last award is drawn at y = 829 against a dock top
   of 781. The content is clipped *and* unreachable, because the hall has no vertical axis.
   At the 1280×704 floor it is worse: PALAD's stand ends at 737 against a 621px dock top, an
   overrun of 116px.

2. **The pictures are small and unevenly so.** The band is 156px tall and a column *divides*
   it, so PALAD's three frames measure **255×156, 142×73 and 110×73** — the lead frame is
   5.8× the area of its neighbours, and the composition reads as one photograph with two
   thumbnails attached. Photograph area per screen across the walk is 40,560 px², which is
   2.4% of a 1536×864 screen.

3. **The foot of the stand collides across groups.** `tools/label-fit.mjs` reports
   `Robotics:2 over Applications:0 = 154×124`: one stand's label paints over the next
   stand's photographs.

The cure is not a smaller band. It is to stop stacking the two bands: the hang becomes a
**wall on the left** and the label becomes a **reading column on the right**, each taking the
full height of the stand. Both then size from the viewport instead of from a 156px constant.

---

## 2. Goals and non-goals

**Goals**

- Every stand fits the fold at both reference viewports: 1440×900 and the 1280×704 floor.
  Nothing is clipped, nothing crosses the dock band, no stand paints over its neighbour.
- The pictures are larger than they are today at both viewports, and the frames within one
  hang share a single height so the composition reads as one hang.
- The label can be *read*: the account keeps a 46-52 character measure instead of being
  stretched to 65+ characters across the full stand width.
- The awards, the team caption and the catalogue each keep a home on the stand without
  competing with the account for the same vertical space.
- Keep every existing bar: no vertical scroll axis, one viewport tall, 44×44 tap targets,
  modal focus containment, keyboard access, reduced motion, AA contrast, no build step,
  Lenis as the only dependency.

**Non-goals**

- Changing the set of records, their copy, or their order.
- Re-shooting, re-cropping or restyling any photograph.
- The Honours room's tile list, or the About and Contact compositions. They hold no stand.
- Aesthetic work on the palette, the mural or the lighting.

---

## 3. The defect, measured

Read from the live page at both reference viewports, with every photograph forced to load.

**1536×864** (`dockTop = 781`)

| stand | label content | stand bottom | over the dock |
|---|---|---|---|
| Robotics:0 PALAD | 599px | 829 | **+48** |
| Applications:2 BiyaHey! | — | 796 | **+15** |
| Applications:0 Hivemind | 486px | 748 | — |

**1280×704** (`dockTop = 621`)

| stand | account | label content | stand bottom | over the dock |
|---|---|---|---|---|
| Robotics:0 PALAD | 1228 ch | 584px | 737 | **+116** |
| Robotics:1 C.E.N.T.H.R.O. | 1160 ch | 557px | 710 | **+89** |
| Applications:2 BiyaHey! | 1324 ch | 499px | 694 | **+73** |
| Applications:0 Hivemind | 1369 ch | 469px | 665 | **+44** |

The four Leadership stands fit with room to spare, because their labels carry a catalogue
and almost no prose (45-86 characters). The overrun is entirely the projects' accounts.

**Frames within one hang, 1536×864**

| stand | arrangement | frames |
|---|---|---|
| Robotics:0 | `lead-two` | 255×156, 142×73, 110×73 |
| Robotics:1 | `three-across` | 44×156, 145×156, 265×156 |
| Leadership:3 | `two-two` | 269×156, 44×46, 55×46, 55×46 |

A `three-across` column of three photographs at one height gives frames of 44, 145 and 265
pixels wide, because a frame's width follows its photograph and the band only caps height.
The narrowest frame in the collection is 0.750 (two 3:4 portraits), so at a 156px band a
portrait frame is 117px wide while a 2.251 landscape frame beside it is 351px.

**Where the height goes, today**

`.room` spends 42px at the head and 92px at the foot on chrome, and the stand has whatever is
left. Inside the stand, `.group` gives the picture band `--band-h` (156px) and the label the
rest. `--band-h` is a FIXED pixel value because it was sized to a different constraint: the
deepest arrangement is a 3-row column, and 156px is the smallest band in which three frames
and their two gaps still leave each frame above the 44px tap floor. That constraint belongs
to a *stacked* column, and it is what pins the pictures to 156px.

---

## 4. Requirements settled with the owner

| # | Decision | Chosen |
|---|---|---|
| 1 | Where the label goes | **Beside the hang, as a full-height column on the right** (mockup "Option B — wall left, reading column right"), over a full-width band beneath the pictures and over a text-head with a full-bleed wall at the foot. |
| 2 | The account's type size | **11.5px minimum**, accepted. The column is narrower than the stand, so the account needs a smaller size than the 13px floor the current stylesheet ships to keep a 1,228-character record on one screen. This is option B's own trade and is not applied to the title, the summary or the awards. |
| 3 | Rollout | **Every stand in every room.** Projects and leadership alike. The Honours room hangs no stand and is unaffected. |
| 4 | The one-screen rule | **Kept.** The hall stays the document's only scroller and it stays horizontal. No room gains a vertical axis. |

---

## 5. The stand

### 5.1 Two cells, full height

The stand stops being a column of two bands and becomes a **row of two cells**:

```
┌───────────────────────────────┬──────────────────┐
│                               │  Project PALAD   │   ← title, venue, count
│                               │  summary         │
│          the hang             │  ─────────────   │
│      (one uniform height      │  the account     │   ← 46-52ch, 11.5px
│       per column, frames      │  (two columns)   │
│       follow their own        │  ─────────────   │
│       photograph)             │  awards          │
│                               │  catalogue       │
└───────────────────────────────┴──────────────────┘
        wall  ~57% of the screen      label  ~43%
```

```css
.group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--label-col);
  column-gap: var(--group-col-gap);
  align-items: start;
  width: var(--stand-w);
  height: 100%;           /* the stand is the room's own band, so both cells are full height */
}
```

`--label-col` is a viewport share rather than a fixed width, so the proportion survives every
supported screen: `clamp(420px, 40vw, 620px)`. At 1536 it resolves to 614px (the label's
inner measure is 588px); at 1280 it resolves to 512px (486px). The wall takes what is left.

### 5.2 The wall

The wall is the left cell and it holds the existing `.cluster`, unchanged in structure: a flex
row of `.col` elements dealt by `Site.hangLayout`, with the per-column `drop` that keeps a
stack from reading as one tall frame.

What changes is the wall's height. It is no longer `--band-h`; it is the stand's own band:

```css
.cluster { height: 100%; align-items: stretch; }
.col     { height: 100%; }
.piece   { flex: 1 1 0; min-height: 0; }
```

A column therefore divides whatever the stand gives it, exactly as `--band-h` did, but the
dividend now grows with the viewport instead of being pinned at 156px. At 1536×864 the stand's
band is 622px, so PALAD's two-column wall gives its lead frame 622px of height and its stack
two frames of ~301px. That is 4× today's frame height.

**The tap floor must survive this, and it is the one number that needs checking.** The deepest
arrangement is a 3-row column, so the smallest frame is `(band − 2 × col-gap) / 3`. At the
1280×704 floor the stand's band is 466px, giving 148px frames — comfortably above 44px. The
`--band-h` constant existed only because the band was 156px; once the band is the stand, the
44px floor is met with three times the margin, so the constant and its argument retire.

**Frames within one column share a height**, because a column divides one budget evenly. Frames
across columns do not, and that is deliberate: the `lead-two` arrangement gives its lead a
column of its own so the lead is the largest thing on the wall. What the new shape removes is
the old *three-across* case, where three frames at one height and three different photograph
ratios produced widths of 44, 145 and 265 in a single row with no hierarchy intended.

### 5.3 The label

The label is the right cell, the stand's full height, and one column of blocks:

| block | type | note |
|---|---|---|
| `.narr-title` | 21px heading | unchanged |
| `.narr-meta` | 10.5px mono | unchanged |
| `.narr-lead` | 13.5px | the record's `summary`; capped at 72ch |
| `.awards` | 11.5px rows | unchanged content, tighter rows |
| `.label-account` | **11.5px**, `column-count: 2` | the record's `overview.text` |
| `.cat` | 11.5px entries | unchanged content, tighter entries |
| `.team` | 11.5px | unchanged content |

The account spans both of the label's inner columns because it is the longest block and the
only one that needs the width. The awards, team and catalogue sit in a single column beneath
it.

`--label-measure` retires with the full-width label: the account carries no cap today because
its grid column *is* the cap, and that is still true — the label cell is the cap. `.narr-lead`
keeps its own `72ch` cap.

### 5.4 The frame heights the stand implies

Solved rather than picked, at both reference viewports, by the same arithmetic the mockup's
layout engine used (`fitRow` in `.superpowers/mockups/_gen.mjs`):

| | 1536×864 | 1280×704 |
|---|---|---|
| stand band | 622px | 466px |
| wall cell | 858px | 640px |
| label cell | 614px | 512px |
| 2-col wall, tallest column | 622px | 466px |
| 3-col wall, tallest column | 622px | 466px |
| finest 3-row frame | 200px | 148px |

Both reference viewports leave every frame far above the 44px tap floor, and both leave the
label inside the fold. That is the property the browser suite exists to assert, because no
unit test can measure it.

---

## 6. What this costs

**The walk gets wider.** A stand is still `--stand-w` (`clamp(1040px, 64vw, 1320px)`), and a
stand that is `--stand-w` wide with a `--label-col` of 40vw inside it leaves the wall 57% of
the screen. Frames are larger, so their widths are larger, so a `three-across` hang that fitted
1040px before may not fit it now. The wall clips at its own cell (`overflow: hidden` stays on
`.group`), so nothing spills — but a hang whose natural width exceeds its wall is a hang with
frames the visitor cannot all see at once.

**This is the one open risk and it is not yet resolved.** The wall's width is `--stand-w`
minus the label cell; if the arrangement's natural width exceeds that, the arrangement has to
be chosen against the wall's width rather than against a constant. Two levers exist and both
are in `js/data.js`, not the stylesheet: the arrangement set can be re-ordered so wide
photographs are dealt to `column-N` layouts, or the wall can take a larger share of the stand.
Neither is picked here; the browser suite will measure it and the implementation plan names
the point at which the number is read.

**The account's type is 11.5px, and the site currently ships 13px at the floor.** Accepted by
the owner (§4.2). At 1536×864 the resolved size is 12.5px because the column is wider there.
The `.acct-p` comment in the stylesheet records 13px as a legibility floor, so that comment
must be rewritten to record the new floor and the reason for it rather than left to contradict
the rule.

---

## 7. Data and interfaces

**None.** `js/data.js` is unchanged: the arrangements, the piece budget, the group split, the
honours partition and every record's copy already carry what this shape needs. The label's
blocks are all rendered today; they are re-parented, not re-derived.

`js/main.js` changes in one place: `renderCluster` writes the same columns and the same inline
`drop`, and nothing it writes is re-derived in CSS. If the wall's width has to become an input
to the arrangement choice (§6), that is a `renderGroup` change and is named in the plan as a
conditional step, not a required one.

---

## 8. What is removed

- `--band-h` and its 156px floor, with the argument that set it (it sized a *stacked* band
  against the 44px tap floor; the band is now the stand).
- `--frame-h`, already read by nothing, and the note that kept it.
- `--col-gap`'s role as a divisor of a fixed band: it stays, but as the gap between frames in
  a column that is now full height.
- The `.group` two-band flex column and its 10px band gap.
- `.label`'s `grid-template-areas: "copy aside" / "copy cat"` and its 1.8fr/1fr split.
- `--label-measure`'s two remaining `var()` fallbacks, once the account's own column is its
  measure.

---

## 9. Verification

**Unit suites that pin the old shape.** `tests/renderer.test.mjs` asserts the rendered DOM, not
geometry, so it should be unaffected — but it is the suite that would catch a re-parented label
losing a block, so it runs unchanged and is expected to pass.

`tests/shell-check.mjs` asserts the palette and the hard constraints statically, and it names
the tokens. It must be updated for `--band-h`'s removal.

**Browser checks** (`tools/ux-check.mjs`, the authority on layout, because the DOM stub models
no CSS):

- every stand's bottom is above the dock band at 1440×900 **and** at 1280×704 — the assertion
  that fails today at both;
- no stand's room title is drawn above the viewport;
- no frame is painted over by another group's frame;
- every frame clears 44×44 at both reference viewports and at 390×844;
- the wall's cell never overlaps the label's cell.

**The suite itself is red before this work starts, and three of its ten failures are its own
fault.** Measured on the draft build — `node tools/ux-check.mjs` reports `102 passed, 10 failed`:

| failing check | cause |
|---|---|
| `no frame exceeds its column budget` (both viewports, 32 frames) | the column width budget was deliberately removed (`css/styles.css`, the `.col` note); the check reads a `max-width` that is now `none` |
| `every project with awards has a control in the walk` | the check queries `[data-tab="awards"]`; `renderAwards` emits `[data-gallery="honors"]` |
| `the dock and the rail are both in the shell` | the check queries `.rail`, which `css/styles.css` records as removed from the shell and replaced by the dock's track; it then returns early, silently skipping its whole section |

The remaining seven are the layout faults §3 measures. The three that are the suite's own fault
are fixed by the plan's first task, before the baseline is taken, so that a red suite can be
read. A green run has to mean the walk is right — a suite that fails on absent code cannot be
used to judge this change.

**The probes need re-pointing**: `tools/rooms.mjs` (prints `.group` height and the deepest
column), `tools/stand-fit.mjs` (resolves `--band-h` / `--max-panel-h` / `--label-w`, all
retired), `tools/label-fit.mjs` (the overlap check is the one that found fault 3),
`tools/avg-frame.mjs` (the "how big do the pictures read" number this work exists to move),
`tools/widths.mjs`, `tools/pieces.mjs`.

**The measured claim this work is judged on**: photograph area per screen at 1536×864, today
40,560 px². Expected above 120,000 px². `tools/avg-frame.mjs` is the instrument.

> **Caveat.** Headless Chrome was expected to need Mojo named pipes, which a confined session
> forbids. It does not on this build: the suite ran confined and completed all 112 checks. If a
> run does fail with a named-pipe error, the sandbox is the cause and the same command works
> unconfined. No green run will be claimed without one.

**Docs:** `README.md` §"The walk" and §"The stand" describe the two-band stand and the fixed
band throughout; they are rewritten with the new shape.

---

## 10. Risks

| Risk | Assessment |
|---|---|
| **A hang is wider than its wall** | The open risk of §6. `overflow: hidden` on `.group` stops it spilling into the neighbour, so the failure mode is a clipped frame, not a broken wall — and it is measurable before shipping. |
| **The label still overruns at the floor** | The 1280×704 numbers in §3 say today's overrun is 116px and this shape removes ~180px of label height by moving the awards and catalogue beside the account. The plan's first step measures it rather than trusting the arithmetic. |
| **11.5px reads as small print** | It is the same family as the 10.5px meta and 11.5px award rows the site already ships, and the account is the only block whose size moves. If it reads badly in the browser, §4.2's alternative is a wider label at 13px — a two-line change to `--label-col`. |
| **The `.piece` loading floor** | `.piece { min-width: calc(var(--band-h) / 4) }` and the image's 38px `min-width` are both sized against a 156px band. With the band gone they need a new basis, or a frame whose bytes have not arrived collapses below the tap floor before it loads. |

## 11. File map

| File | Change |
|---|---|
| `css/styles.css` | `--band-h` / `--frame-h` removed, `--label-col` added, `.group` to a two-cell grid, `.cluster` / `.col` / `.piece` to a full-height division, `.label` to one column, `.piece` loading floors re-based |
| `tests/shell-check.mjs` | the retired tokens |
| `tools/ux-check.mjs` | the fold, overlap and tap-floor assertions at both viewports |
| `tools/rooms.mjs`, `stand-fit.mjs`, `label-fit.mjs`, `avg-frame.mjs`, `widths.mjs`, `pieces.mjs` | re-pointed at the new geometry |
| `README.md` | the walk and the stand |
