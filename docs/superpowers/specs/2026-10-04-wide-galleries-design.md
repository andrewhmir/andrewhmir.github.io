# Wide Galleries — Design Spec

**Date:** 2026-10-04
**Status:** Draft for review
**Amends:** `2026-10-03-night-gallery-design.md` §7 (room derivation and the honours
partition); `2026-10-03-edge-dock-design.md` §5 (the group cell, the label's shape) and
§6 (the cluster's frame heights)
**Supersedes:** the rule that a room is exactly one viewport wide, and the fixed 2×2
group grid that rule forced

---

## 1. Summary

A room is currently one viewport wide and exactly one viewport tall, holding a fixed
2×2 grid — four exhibits — because there is no vertical axis to overflow into and no
horizontal room to grow. That constraint is the direct cause of the worst content
artefact on the site: thirteen honours, four at a time, become **four consecutive
galleries all called "Honours"**, split by arithmetic rather than by meaning.

This work removes the width constraint and keeps the height one. A gallery becomes as
wide as its own contents need, running past the screen edge, with a floor of one screen
so a short gallery is never narrower than the window. One Honours gallery then carries
all thirteen honours, the dock drops from nine entries to six, and the arithmetic split
disappears along with the reason for it.

Two consequences follow, and they are the substance of this work:

**The freed height is given to the frames.** With one row instead of two, a gallery's
entire vertical band is available to a single hang, so the frames grow to roughly 1.7×
their present size. The label, which today is a horizontal strip crushed beside them,
becomes a tall narrow column and reads for the first time.

**The hang is varied and every group is full.** Each group is dealt one of several
arrangements for its photograph count — a single column, a lead beside a stack, two even
columns — chosen deterministically from the group's own key so neighbouring groups
differ and a reload never reshuffles the wall. Every group hangs between three and six
frames, with awaited photographs filling the gaps.

---

## 2. Goals and non-goals

**Goals**

- A gallery's width follows its contents and is never narrower than one screen.
- One Honours gallery, not four: every honour hangs on one continuous wall, and no two
  rooms share a name.
- Frames grow into the height a single row frees, so a multi-screen gallery does not
  read as an empty corridor.
- Every label is legible: the narrative is a sentence and each catalogue entry has a
  column of its own.
- The hang varies group to group, deterministically — the same visitor sees the same
  wall on every reload.
- Every group hangs 3–6 frames; a record whose photographs are still awaited still hangs
  a full composition rather than a single thin frame.
- Nothing is cropped or letterboxed: a frame keeps its photograph's own proportions.
- Keep every existing bar: 44×44 tap targets, one viewport tall with no vertical axis,
  modal focus containment, keyboard access, reduced motion, AA contrast, no build step,
  Lenis as the only dependency.

**Non-goals**

- A second scrolling axis. The hall stays the document's only scroller.
- Changing the room order, the set of rooms, or the set of records.
- Redesigning the dialog, or the About and Contact compositions beyond their width.
- Re-shooting, re-cropping or restyling any photograph.
- Splitting Honours into meaningfully named galleries. That is a content decision for
  the owner and is deliberately not taken here.

---

## 3. The defect, measured

**The grid forces the split.** `.groups` is
`grid-template-columns: repeat(2, 1fr)` with `grid-auto-rows: minmax(190px, auto)`,
inside a room whose width is `var(--room-w)` — that is, `max(92vw, 860px)`. Four exhibits
per room, exactly. `HONOURS_ROOMS = 4` in
`js/data.js` exists only to satisfy that grid, and `Site.evenChunks` exists only to make
the four parts even: thirteen honours into four rooms is 3, 3, 3, 4.

**The split is visible in the chrome.** `honoursRooms()` names the four parts
`Honours — I` … `Honours — IV`, `ROOM_SHORT` carries four separate entries for them, and
the dock therefore lists "Honours", "Honours II", "Honours III", "Honours IV" as if they
were different collections.

**The height is there and unused.** At 1440×900 a room's content band measures about
657px after its padding and its title. Two rows of groups occupy about 448px of it — a
4-photograph cluster stands 217px and the row gap is 14px. One row would occupy about
217px, leaving two thirds of every gallery as bare wall. On a room that is one screen
wide that is merely slack; on a three-to-five-screen gallery it is the whole experience.

**The label is crushed by the two-row rule.** Because two rows had to fit, frame heights
are capped at `min(20cqi, 96px)` for a lead and `min(14cqi, 62px)` for a support. The
label sits *beside* those frames in a row of `plan | narrative | catalogue`, and the
catalogue — two columns, never wrapping, per `css/styles.css` — is left about 90px per
photograph. The label's own comment in that file already claims "the label sits under the
frames", which the code does not do; the README makes the same claim. The two-row
workaround is what moved it, and removing the two-row rule is what lets it back.

**Frame heights are tied to the wrong axis.** Heights are a percentage of the *cell's
width* (`cqi`), which was correct while the cell was a grid track of known width. Once a
group's width is content-driven, sizing it from its own width is circular, and the
container query has to go.

---

## 4. Requirements settled with the owner

Recorded because each one closes off a design that would otherwise be defensible.

| # | Decision | Chosen |
|---|---|---|
| 1 | Groups per gallery, vertically | **One row.** A gallery is a long wall, not a taller grid. |
| 2 | A gallery narrower than the screen | **Floored at one screen.** Never narrower, so a visitor is always inside one named gallery. Above that, width follows contents. |
| 3 | Frame scale and label position | **Frames grow; the label stays beside them** (mockup "Option B — Hang bigger, label beside"), over keeping today's small frames and over moving the label beneath the hang. |
| 4 | Variety | **Varied but fixed.** Each group is dealt an arrangement deterministically; a reload never reshuffles the wall. Rejected: randomising at render time. |
| 5 | Photograph count per group | **3–6, every group on the wall** — projects, leadership and honours alike. |
| 6 | Missing photographs | **Placeholders now.** The owner will supply the real ones later. |

---

## 5. The gallery

### 5.1 Width

```css
.room   { width: max-content; min-width: 100vw; }   /* was: width: var(--room-w) */
.groups { display: flex; gap: 20px; }               /* was: a 2-column grid        */
```

The room's width is its own content: padding, plus every group's natural width, plus the
gaps between them. `min-width: 100vw` supplies the floor from decision 2. The `860px`
floor in `--room-w` is dropped with the token: it existed so that a two-column grid of
408px cells kept every frame above the 44px tap floor, and frames are now 76–165px tall
regardless of any cell.

About and Contact keep an explicit `width: 100vw`. They are single compositions, not runs
of groups, and neither should stretch to its text.

`#hall` remains the only scroller and the strip remains one flex row, so a longer gallery
is simply a longer strip. Nothing about the scroll architecture changes.

### 5.2 Honours becomes one gallery

`HONOURS_ROOMS` goes from `4` to `1`. `Site.honoursSplit` keeps its shape — a total
partition returning one entry per room — so the renderer, the dock and the partition
tests keep working unchanged; the single part now holds all thirteen records in array
order.

The gallery is keyed `Honours` and titled `Honours`: no numeral, no `ROOM_SHORT` entries
for `Honours — I…IV`. That restores the room-title list the original spec pinned —
About · Works in Robotics · Works in Applications · Leadership · Honours · Contact — from
which the numerals were a deviation.

### 5.3 The dock

Six entries instead of nine. At 390×844 the narrow dock's pips go back to a full 44×44;
the 41px compromise in `css/styles.css` existed only to fit nine pips in 390px and is
retired with the ninth room. `walkRooms()`, `dockItems()` and `markCurrentRoom()` are
unchanged in shape.

### 5.4 Wayfinding

The room heading sits at the gallery's left and scrolls away; on a five-screen gallery it
is gone for most of the walk. This is **accepted**, because the dock already names the
current room at every width — `markCurrentRoom` marks `aria-current` on the dock entry,
and the narrow dock carries the live name in `.dock-live`. No sticky heading is added: a
title pinned over a hang competes with the works it labels.

---

## 6. The hang

### 6.1 Frame heights come from the wall's height

The container query is removed. `.groups > .group` loses
`container-type: inline-size` / `container-name: cell`, and every `cqi` in the group area
is replaced by a viewport-height clamp, because the binding constraint on a single row is
now vertical:

```css
--lead-h:  clamp(120px, 18vh, 165px);
--sup-h:   clamp( 76px, 11vh, 102px);
--col-gap: clamp(  6px,  1.1vh,  10px);   /* between frames in one column */
--cluster-gap: 12px;                      /* between columns            */
```

| | 1440×900 | 1280×704 (the spec's floor) |
|---|---|---|
| lead frame | 162px | 127px |
| supporting frame | 99px | 77px |
| frame gap in a column | 10px | 8px |
| tallest arrangement (5 stacked) | 535px | 417px |
| content band available | 662px | 466px |

Both reference viewports leave the tallest arrangement inside the band. That is the
property the arrangement table is built to preserve, and it is pinned by a browser check
rather than by a unit test, because only a layout engine can measure it.

A frame keeps its photograph's proportions: the height is set and the width follows, as
today. Nothing is cropped and nothing is letterboxed.

### 6.2 The label becomes a column

Today `.label` is a row — `plan | narrative | catalogue` — sized to whatever the cluster
leaves. It becomes a fixed-basis column beside the cluster:

```css
.label { flex: 0 0 auto; width: clamp(220px, 20vw, 300px); flex-direction: column; }
```

| | 1440×900 | 1280×704 |
|---|---|---|
| label column | 288px | 256px |

Contents stack downward: the plan of the hang, the title, the venue or year, the
narrative, then one catalogue entry beneath another. Narrative clamped to three lines,
title to two.

The fixed basis is load-bearing in two directions. It stops a wide cluster squeezing the
text to nothing — the cluster is what varies, so a wide cluster makes a **wider group**,
never a narrower label. And it keeps the label the same width from group to group, which
is what makes a wall of them read as a set.

### 6.3 The arrangements

An arrangement is a partition of a group's photographs into columns, plus which piece is
the lead and how far each column is dropped in pixels:

```js
{ name: 'lead-two', columns: [[0], [1, 2]], lead: 0, drop: [0, 14] }
```

`.cluster` is a flex row of `.col` elements; each `.col` is a flex column. The staggered
`drop` is what keeps a stack from reading as one tall frame — the current
`.hang-stack { padding-top }` trick, generalised.

The set, by photograph count (3–6):

| count | arrangements |
|---|---|
| 3 | `lead-two` [[0],[1,2]] · `two-lead` [[1,2],[0]] · `column-three` [[0,1,2]] |
| 4 | `lead-three` [[0],[1,2,3]] · `three-lead` [[1,2,3],[0]] · `two-two` [[0,1],[2,3]] · `column-four` [[0,1,2,3]] |
| 5 | `lead-four` [[0],[1,2,3,4]] · `lead-two-two` [[0],[1,2],[3,4]] · `two-three` [[0,1],[2,3,4]] |
| 6 | `three-three` [[0,1,2],[3,4,5]] · `lead-five` [[0],[1,2,3,4,5]] · `two-two-two` [[0,1],[2,3],[4,5]] |

Selection is `Site.hangLayout(key, count)`: a stable hash of the group's entry key
(`honors:3`, `Robotics:project3`) modulo the number of arrangements for that count. Pure,
DOM-free, and therefore unit-testable. The distribution check asserts that the real
portfolio does not collapse onto a single arrangement.

It is total: a count outside 3–6, an unknown count, or a key of any shape falls back to
`column-N` — every piece in one column, in order — rather than throwing or returning
nothing. A group can therefore never fail to render because a layout is missing.

`renderPlan` draws the chosen arrangement rather than a generic lead-and-stack, so the
label's diagram still cannot disagree with the wall — the property the current
implementation already protects and that this change must not lose.

### 6.4 The honest cost

Because the photographs in this collection are wide — mostly 1.78:1 to 2.01:1 — a taller
frame is a proportionally wider one, and a group's width is dominated by its cluster.

| | today | after |
|---|---|---|
| group width | 618px (a fixed grid cell) | about 480–780px, by arrangement |
| the walk | about 8 screens | about 12 screens |
| Honours alone | 4 rooms of one screen | one gallery, about 5 screens |

This is the price of frames this much bigger with the label still beside them, and it is
accepted. The levers, if it proves too long, are the frame clamps in §6.1 or moving the
label beneath the hang, which roughly halves a group's width.

---

## 7. The photographs

### 7.1 The 3–6 rule

`Site.groupPieces` gains a floor and a ceiling:

- **Floor 3.** A group hangs at least three frames. Padding is appended, never
  interleaved, so a group's lead frame is a real photograph whenever one exists.
- **Ceiling 6.** A record that declares more than six photographs hangs the first six.

Each piece gains an explicit `awaited` flag rather than leaving the renderer to
re-derive it by string-matching the placeholder path.

What this means for the data as it stands:

| | records | real photographs | padding frames | frames on the wall |
|---|---|---|---|---|
| Projects | 6 | 12 | 6 | 18 |
| Leadership | 4 | 13 | 1 | 14 |
| Honours | 13 | 12 | 27 | 39 |

### 7.2 An awaited photograph is an empty frame

34 of the 71 frames on the wall would otherwise be the same 405×260 grey placeholder —
on the Honours wall, three identical greys in a row for each of six photo-less honours.

A piece whose `awaited` flag is set instead renders as a **bare gilt frame with its mat
and no image**: a reserved place on the wall, at the same height as the frame that will
hang there. It stays an inert, labelled element — not a button that does nothing — which
is the rule the current build already follows for a photograph-less record.

This unifies two cases that are the same thing: a record with no `images` at all, and a
record whose `images` literally names the placeholder (the SATLearn team still). Both
draw the empty frame.

### 7.3 The catalogue names awaited photographs once

The catalogue currently emits one entry per piece, which would give a photo-less honour
three entries all reading "Photograph awaited". Instead:

- one entry per **real** photograph, as today;
- then, if any frames are padding, a single line — *Two photographs awaited*.

The plan diagram still draws every frame, so the label continues to describe the wall
exactly; only the prose is de-duplicated.

---

## 8. Data and interfaces

```js
/* js/data.js */
Site.MIN_PIECES            // 3
Site.MAX_PIECES            // 6
Site.groupPieces(record, kind)   // -> [{ src, awaited }], 3..6 long
Site.HANG_LAYOUTS          // { 3: [...], 4: [...], 5: [...], 6: [...] }
Site.hangLayout(key, count)      // -> an arrangement; stable for a given key
Site.HONOURS_ROOMS         // 1  (was 4)
Site.honoursSplit(honors)        // unchanged shape: { parts: [ [...] ] }
```

`js/main.js` changes in four places: `renderCluster` builds columns from an arrangement
rather than a lead plus a stack; `renderGroup` resolves the arrangement from the group's
entry key and its piece count; `renderPlan` draws that arrangement; `renderCatalogue`
applies §7.3. `renderRooms` renders one Honours gallery, and `honoursRooms()` returns one
entry keyed `Honours`.

Nothing in the modal, the gallery index, the light controller, the walk, the dock's
marking logic or the copy delegation changes.

---

## 9. What is removed

- `--room-w` and its `max(92vw, 860px)` floor, and the tap-target argument that justified
  the floor.
- The 2-column `.groups` grid and `grid-auto-rows`.
- `container-type: inline-size` / `container-name: cell` on `.groups > .group`, and every
  `cqi` value in the group area: `PIECE_HEIGHTS`, `LEAD_HEIGHT`, the `4cqi` stagger, the
  cluster and stack gaps, and the About portrait's `22cqi`.
- `.hang-lead` and `.hang-stack`, replaced by `.col`.
- The `PIECE_MIN` / `LEAD_MIN` floors, subsumed by the pixel floors the new clamps
  already carry.
- `HONOURS_ROOMS = 4` and the `Honours — I…IV` names, numerals and `ROOM_SHORT` entries.
- The 41px narrow-dock pip, restored to 44px.

---

## 10. Verification

**Unit suites that pin the old shape and must be updated:** `derive-rooms` (the honours
partition and `HONOURS_ROOMS`), `renderer` (room keys and titles, the `Honours — I…IV`
list, group and piece counts), `delegation` (its rooms scene), `shell-check`.

**New unit checks:**

- every group hangs between 3 and 6 frames;
- padding is appended after the record's own photographs, in order, and none is dropped;
- a record declaring 8 photographs hangs exactly 6;
- `hangLayout` is stable: the same key and count always give the same arrangement;
- every count from 3 to 6 has at least one arrangement, and every arrangement's columns
  cover its piece indices exactly once — the property that stops a layout silently
  dropping a frame;
- the real portfolio does not collapse onto one arrangement;
- `honoursSplit` yields exactly one part holding every record.

**Browser checks** (`tools/ux-check.mjs`, the authority on layout, since the DOM stub
models no CSS): a gallery is still exactly one viewport tall; a gallery whose contents
need it exceeds the viewport width; no group crosses the dock band at 1440×900 or at the
1280×704 floor; clusters do not overlap their neighbours; every frame clears 44×44 at
390×844; the tallest arrangement stays inside the content band at both reference
viewports; the walk still moves and settles.

The geometry probes `tools/rooms.mjs`, `tools/widths.mjs` and `tools/pieces.mjs` need
re-pointing at the new geometry.

> **Caveat.** Headless Chrome needs Mojo named pipes, which this session's sandbox
> forbids. The browser suite and the probes must run with the sandbox off, or as a single
> escalated command. No green run will be claimed without one.

**Docs:** `README.md` claims a "fixed grid of at most six groups" and that "thirteen
honours is therefore three rooms" (the code makes four); both are rewritten, along with
the width and structure notes. The `.superpowers/mockups/option-w*.html` files are
working artefacts under a gitignored directory and are not shipped.

---

## 11. Risks

| Risk | Assessment |
|---|---|
| **The walk is 50% longer** | Accepted in §6.4. Mitigated by the arrangement set favouring compact columns where the count allows, and by the two levers named there. |
| **Wide photographs dominate group width** | The label's fixed basis is the guard: a wide cluster widens the group, it never squeezes the label or clips a frame. `.group { overflow: hidden }` stays as a backstop. |
| **`width: max-content` resolves unexpectedly** | The layout is now derived by the browser from content rather than declared. Only a layout engine can check it, so the browser suite is the gate, and the probes exist to diagnose it. |
| **The Honours wall is placeholder-heavy** | 27 of 39 frames today. Accepted by decision 6 as temporary scaffolding; the empty-frame treatment in §7.2 is what keeps it from reading as a broken image repeated. |
| **Every project gains a placeholder** | Direct consequence of decision 5. The project's two real stills lead, so the padding sits last. |
| **Frames no longer scale with the gallery's width** | Deliberate. The removed coupling existed only to make a fixed grid cell work. |

## 12. File map

| File | Change |
|---|---|
| `js/data.js` | `MIN_PIECES`/`MAX_PIECES`, `groupPieces` padding and `awaited`, `HANG_LAYOUTS`, `hangLayout`, `HONOURS_ROOMS` 4→1 |
| `js/main.js` | `renderCluster` columns, `renderGroup` arrangement, `renderPlan`, `renderCatalogue`, one Honours gallery, `honoursRooms`, `ROOM_SHORT` |
| `css/styles.css` | Room width, `.groups` row, `.room` width, label column, `.col`, frame height clamps, `cqi` removal, dock pip |
| `tests/*.mjs` | The four suites above, plus the new checks |
| `tools/*.mjs` | `ux-check`, `rooms`, `widths`, `pieces` |
| `README.md` | The walk, the width model, the honours gallery |
