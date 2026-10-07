# The Museum Label — Design Spec

**Date:** 2026-10-04
**Status:** Draft for review
**Amends:** `2026-10-04-wide-galleries-design.md` §5.4 (wayfinding — a sticky heading was
previously rejected), §6.2 (the label's shape, and its relation to the cluster)
**Supersedes:** the rule that a project's description and awards are read in a dialog; the
rule that the label is a narrow column beside the hang
**Removes:** the `.plan` diagram; the progress rail at the screen's edge; the Overview,
Team and Awards dialogs

---

## 1. Summary

A visitor to this site cannot read what a project is. The project's own account of itself —
four to seven paragraphs saying why it exists and what it does — is behind an **Overview**
button, its awards are behind an **Awards** button, and the team photo's caption, which is
the only thing that names who is in the picture, is behind a **Team** button. On a wall that
otherwise explains itself, the three things worth knowing are the three things hidden.

This work inverts the stand. The exhibition label becomes the stand's principal content and
the photographs become a slim band above it, so that **everything a project has to say is
read on the wall with no click**. A sticky header at the head of the screen names the area
the visitor is standing in. The dock's progress becomes a bar that fills inside the dock
itself.

The walk does not change: still horizontal, still one screen tall, still one stand per
screen.

---

## 2. Goals and non-goals

**Goals**

- Every project's full account, every award with its date, every team caption and every
  photograph's own title and caption is **readable on the wall**, with no control to press.
- The text is not a side note: the label is the stand's principal content and the
  photographs illustrate it.
- A sticky header names the area the walk is standing in, and changes at the area boundary.
- The dock shows the walk's progress as a bar that fills inside the dock box.
- An award that has photographs keeps them reachable, without restoring a dialog.
- Keep every existing bar: 44×44 tap targets, one viewport tall with no vertical axis,
  keyboard access, reduced motion, AA contrast, no build step, Lenis as the only dependency.

**Non-goals**

- A second scrolling axis. The hall stays the document's only scroller.
- Changing `js/data.js`. Every field this design displays already exists.
- Changing the room order, the set of rooms, or the set of records.
- Restyling About, Contact, Leadership or Honours beyond the two consequential changes
  named in §9 (they lose `.plan`, and they gain the sticky header).
- Re-shooting, re-cropping or restyling any photograph.
- Writing new copy. The prose shipped today is what will be read.

---

## 3. The defect, measured

**The copy is already written, and it is the best content on the site.** From `js/data.js`:

| | PALAD | Hivemind | CENTHRO | Focus Buddy | SATLearn | BiyaHey! |
|---|---|---|---|---|---|---|
| `overview.text` | 205w / 7¶ | 220w / 7¶ | 193w / 6¶ | 162w / 4¶ | 203w / 5¶ | 214w / 6¶ |
| `awards` | 3 | 0 | 3 | 1 | 0 | 1 |
| `team.text` | 29w | 4w | 25w | 27w | 13w | 21w |

1,197 words of account and 8 awards, all of it reachable only by pressing a button.

**The label is a third of the stand.** `--label-w` is `clamp(320px, 25vw, 380px)`. At
1536px that is 380px of a stand whose cluster is free to take 1,300px or more. The label
carries the title, the venue line, a narrative **clamped to four lines**
(`-webkit-line-clamp: 4`), an Awards button, and the catalogue. The clamp exists because
the label is a column: a fifth line would push the catalogue past the fold, and there is no
vertical axis to scroll to it.

**The narrative is therefore already truncated.** `labelNarrative()` returns
`record.summary` when present — a single sentence — and never reaches `overview.text` at
all. The one field with the real account is not rendered anywhere on the walk.

**The awards have no home on the wall.** `renderAwardsControl()` draws a *button*, and
`tests/renderer.test.mjs` asserts one button per project that declares awards, precisely
because a control that stops rendering would silently take eight awards off the site. That
test is a guard on a defect the shape of this design removes.

---

## 4. Requirements settled with the owner

Recorded because each one closes off a design that would otherwise be defensible.

| # | Decision | Chosen |
|---|---|---|
| 1 | Reading mechanics | **Wider label panel, still horizontal.** Rejected: a second scroll axis inside the label; dropping the walk for vertical pages; a room taller than one screen. |
| 2 | How much copy | **Everything, always visible.** The full `overview.text` and the full awards list, with the `summary` as the label's opening line. Rejected: a one-sentence default with a "Read more"; a trimmed rewrite; any toggle. Owner's words: *"like a museum gallery where I can find all the relevant information on the screen with no need to interact further more."* |
| 3 | Photograph size | **Text leads — frames ~110–140px tall**, down from a `--max-panel-h` of 260px. |
| 4 | Sticky header | **Pinned at the top of the viewport**, its text changing at the area boundary. Rejected: the name riding in the dock; a vertical title at the screen's edge. |
| 5 | Stand structure | **Label-dominant two-band stand** — a slim picture band above a full-width label. Rejected: side-by-side with a wider label column (the prose needs ~23 lines and the entire usable height); a three-column stand (wider than the screen, breaking one stand per screen); letting the room grow taller. |
| 6 | Leftover dialogs | **Overview, Team and Awards dialogs deleted.** The photograph carousel dialog stays, for News, Leadership, Honours and a project award's photographs. |
| 7 | Progress bar | **Inside the dock**, one continuous bar across the dock's full inner width, filling on total walk progress. |

---

## 5. The stand

`.group` is currently a row: `.cluster` beside `.label`. It becomes a column: `.cluster`
above, `.label` beneath at the stand's full width.

```
┌──────────────────────── stand ────────────────────────┐
│  ╔══╗ ╔══╗ ╔══╗                    ← picture band 130px │
│  ╚══╝ ╚══╝ ╚══╝                                        │
│  ─────────────────────────────────────────────────────  │
│  Project PALAD                        ┌─ Awards ───────┐│
│  Aug 2025 – Apr 2026 · 2 photographs  │ 11th Phil.     ││
│                                       │ Robothon …     ││
│  <the full 205-word account>          │ Feb 2026       ││
│  …                                    │ Muntinlupa …   ││
│  …                                    │ Dec 2025       ││
│                                       └────────────────┘│
│  Photographs                          Team              │
│  A The palm scanner                   The team at the   │
│  B The team                           Muntinlupa …      │
└────────────────────────────────────────────────────────┘
```

### 5.1 The vertical budget

The room is one viewport tall and always will be, so the label's height is the binding
constraint on this whole design. At 1920×1080, after the sticky header (52px), the room's
own padding and the dock band (~100px), **~890px is usable**:

| Band | Budget |
|---|---|
| Sticky header reserve | 52px |
| Picture band (`.cluster`, frames ~130px + mat + border) | 150px |
| Label: title + meta | 56px |
| Label: account | 300px |
| Label: awards | 76px |
| Label: catalogue | 120px |
| Label: team caption | 36px |
| **Total** | **790px** |

150px of headroom remains at 1080p. **The prose is the only band that flexes**, and it is
the one whose height the copy length decides, so it is the one the fit check measures.

### 5.2 Three dials

The stand's proportions come from three numbers in `css/styles.css`, replacing
`--max-panel-h` / `--band-h` / `--label-w`:

| Token | Value | Governs |
|---|---|---|
| `--frame-h` | `clamp(96px, 11vh, 140px)` | The height of a frame, and therefore the headline answer to "how big do the pictures read". |
| `--label-measure` | `clamp(46ch, 52ch, 60ch)` | The prose column's width, in characters. This is what keeps a line readable once the label is full width. |
| `--stand-w` | `clamp(1040px, 64vw, 1320px)` | The stand's width. The label is this wide; the cluster sits inside it. |

`--label-w` is deleted. It exists to hold a column to a fixed width so every label on a
long wall reads as a set; a full-width label has no need of it, and its disappearance is
what retires the four-line clamp.

### 5.3 Line length, and why the label is two columns

At full stand width the prose would run to ~100 characters, which is roughly 1.7× a
comfortable measure. The label is therefore a two-column grid:

```
.label { display: grid; grid-template-columns: minmax(0, 1fr) 300px; column-gap: 32px; }
```

Prose in the first column (the measure above), awards and team caption in the second. The
catalogue spans both, beneath.

### 5.4 The walk gets shorter, not longer

A wider stand is not a longer walk, because a stand's width is bounded by `--stand-w`:

- **Before:** 6 stands of 1,300–1,600px, plus 5 gaps of `clamp(200px, 46vw, 760px)` — 707px
  measured at 1536×864 — ≈ 9,600px for Robotics.
- **After:** 6 stands of ~1,250px, plus 5 gaps of roughly 150–250px ≈ 8,700px.

Full prose therefore costs **no extra travel**. `--group-gap` is reduced, because a stand
that fills most of a screen no longer needs half a screen of bare wall to separate it from
its neighbour. The exact value is not fixed here — see §12.

### 5.5 Snap targets move to the stand

`data-snap` currently sits on the About and Contact rooms and nowhere else. Rooms stay one
viewport tall but a stand inside them is now ~1,250px, so **centring a room in the viewport
no longer centres a stand** — and `align: 'center'` would park the walk between two
exhibits. `data-snap` is therefore added to each `.group` as well. The room's leading and
trailing padding supply the wall either side of the first and last stand.

---

## 6. The label

### 6.1 Copy, and where each line comes from

Nothing in this table is new data. Every field is in `js/data.js` today.

| Line | Source | Fallback |
|---|---|---|
| Title | `record.title` | `record.description` |
| Meta | `record.venue` | `record.year` |
| Opening line | `record.summary` | omitted |
| Account | `record.overview.text`, paragraphs split on `\n\n` | `record.summary` |
| Awards | `record.awards[]` — `description` + `year`, all of them | block omitted |
| Team caption | `record.team.text[]`, one line each | block omitted |
| Photographs | `record.pieces[]`, per existing `renderCatalogue` | `Photograph <letter>` |

`labelNarrative()` — which returns only `summary` and never reaches `overview.text` — is
replaced by `labelAccount()`, returning the account's paragraphs as an array.

### 6.2 `.plan` is retired

The plan is a small diagram of the hang whose boxes carry the same letters as the catalogue
entries, so a visitor reading entry C can find C on the wall. It costs 56px of the label's
height — the height the account needs.

The letters stay where they already work: `renderCatalogue()` prints `A`, `B`, `C` in a
column beside each entry's title, and `pieces[]` keeps its meaning. What goes is the diagram.

This is the one visual element this design subtracts, and it is reversible: if the loss is
felt, the plan returns — it costs the label 56px, which is paid for by narrowing
`--label-measure` (§5.2) until the account wraps taller.

`renderPlan()` and the `.plan` / `.pcol` / `.pi` / `.pi-lead` rules go with it.

### 6.3 The clamp goes

`.narr-text`'s `-webkit-line-clamp: 4` is removed. Its purpose was to stop the catalogue
being pushed past the fold by a long summary; with the label full width and the account
sized to fit, the clamp would only hide the copy this design exists to show.

---

## 7. Awards on the wall

`renderAwardsControl()` stops emitting a button and emits the list, under an `AWARDS · n`
heading, reusing the `.record-item` shape the Honours tiles already use — description and
year, stacked:

```
AWARDS · 3
11th Philippine Robothon – Innovative Open Category, Overall Champion   Feb 2026
Muntinlupa Robotics Fair – Champion                                    Dec 2025
2025 International Robothon – Innovative Open Category, 1st Runner Up  Nov 2025
```

### 7.1 The award photographs, which are the reason this needs care

`js/data.js` carries an honour for each project award, tagged `from: 'projectN'`, and
**six real photographs hang off those honours** — all confirmed present on disk:

| Project | Award | Photographs |
|---|---|---|
| project1 | 11th Philippine Robothon – Overall Champion | `honors-robothon-2026-ph-1.jpg` |
| project3 | 10th Philippine Robothon – Overall Champion | `honors-robothon-2025-ph-1/2/3.jpg` |
| project3 | 2024 International Robothon – Champion | `honors-robothon-2024-intl-1/2.jpg` |

Those honours are excluded from the Honours room by the `from` partition, so deleting the
Awards dialog without a replacement would **silently remove six photographs from the site**
— the same class of loss `tests/renderer.test.mjs` was written to prevent.

**Resolution:** an award entry that resolves to a tag carrying photographs becomes a real
control, opening them in the **photograph carousel dialog that stays**. An award with no
photographs is plain text, exactly as a photo-less Honours tile already is.

Resolution needs a lookup the data does not have today: given a project and one of its
award strings, find the `from`-tagged honour that is the same win. The two name it in
different wordings — the card says *"11th Philippine Robothon – Innovative Open Category,
Overall Champion"* where the honour says *"11th Philippine Robothon – Overall Champion"* —
so a string match will not do. A new pure function, `Site.awardPhotos(projectId, honors,
awardOrYear)`, matches on **project plus that award's year**, which is exact for all eight
awards in the shipped data, and returns `[]` rather than guessing when a year is absent or
matches nothing. It is total, in the shape of `Site.galleryFor`.

**The third parameter is the whole of it, and an earlier draft of this spec got it wrong.**
This is asked **per award**, not per project: §7's requirement is that an award *which has*
photographs is a control and one without is not. A project-level answer cannot express that —
it would give every one of a project's awards the project's whole photograph set, turning the
five awards that have none into controls that open a **different win's** photographs. Measured
on the shipped data: per-award matching yields **3 controls and 5 plain-text awards, with all 6
photographs still reachable**; a project-level union yields 8 controls, 5 of them wrong.

---

## 8. Sticky header and dock progress

### 8.1 The sticky header

A new fixed element, `<header class="room-rail" id="roomRail">`, at the head of the screen:

```
┌────────────────────────────────────────────────────────────┐
│ Works in Robotics                3 PROJECTS · ROBOTICS     │
└────────────────────────────────────────────────────────────┘
```

- `aria-hidden="true"`: the `#announcer` live region already announces room changes, and a
  second announcement would be a duplicate.
- **Setting it costs almost nothing.** `initLights()` already resolves which room the
  viewport's centre stands in, via `roomAt()`, and already fires `announceRoom()` on a
  change. The header writes in that same path, so a header that fails to update is the same
  defect as a dock that fails to follow the walk — one code path, one failure mode.
- It carries the room's `.t` title and its `.sub` count, read from the room element, so the
  header cannot drift from the heading it duplicates.
- Cost: ~52px of height on every wall, paid for in §5.1.

`2026-10-04-wide-galleries-design.md` §5.4 rejected a sticky heading because "a title pinned
over a hang competes with the works it labels". That rejection held while the title was a
second copy of a heading already on the wall. It does not hold now: the title names the area
the visitor is in, at a fixed point, which is what a visitor on a 8,700px wall has no other
way to know.

### 8.2 The dock's progress bar

**The progress moves inside the dock.** `#rail` — a bare line along the bottom edge of the
screen, outside the dock's box — is deleted, and the bar becomes `#dockProgress` inside
`.dock`, laid out beneath the buttons as a second row.

```
        ┌──────────────────────────────────────────────────────┐
        │  1 About   2 Robotics   3 Applications   4 Leadership │
        │  5 Honours   6 Contact                                │
        │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
        └──────────────────────────────────────────────────────┘
```

Two deliberate consequences:

- **One bar across the dock's full inner width**, not one bar per button. The dock's
  buttons are sized by their labels, not by how much walk each area occupies: Robotics is
  2 of 6 buttons (~29% of the dock's width) but ~49% of the walk's length. A bar filling on
  walk progress therefore does not land on button boundaries, and pretending otherwise
  would make the bar lie about total progress. It sits halfway across the Robotics button
  when the walk is halfway through Robotics, and reaches 100% at Contact.
- **The fill maths is unchanged.** `updateRail()`'s
  `scrollLeft / (scrollWidth - clientWidth)` moves to `updateProgress()` verbatim. One code
  path keeps the dock and the walk from ever disagreeing.

`tests/renderer.test.mjs`'s "the rail is in the shell and hidden from assistive tech"
becomes the equivalent assertion for `#dockProgress`.

---

## 9. What this touches beyond a project stand

- **Leadership and Honours** render through the same `renderLabel()`, so they gain the full
  narrative and lose `.plan` too. Their `.record-item` shape is already the one §7 adopts
  for awards. They keep their carousel dialog.
- **About and Contact** are single compositions, not runs of groups. They are unaffected
  apart from the sticky header and the dock's height.
- **`index.html`** gains `#roomRail` and `#dockProgress`; `#rail` goes.
- **`js/main.js`** loses `openModal()`, the `isTeam` / `isReport` / `isAwards` branches, the
  `data-action="modal"` delegation, and `renderPlan()`. `groupOpener()` still opens the
  gallery for a record's pieces; for a project piece it now opens that project's own
  photographs rather than an Overview dialog.
- **`js/data.js`** gains `Site.awardPhotos`. No record changes.

---

## 10. Error handling and the hard constraint

**The one risk that matters.** A stand is exactly one viewport tall inside a hall with
`overflow-y: hidden`, so prose that does not fit is **clipped and unreachable** — not
scrolled to, not expanded, gone. This is the failure this design is most exposed to, because
it is the first time the site has put unbounded text on a wall with no vertical axis.

Three guards:

1. **Measure, don't assume.** `tools/label-fit.mjs` is extended to assert that every label's
   account, awards, catalogue and team caption are fully visible at 1440×900 and at the
   1280×704 floor. This is the authority; the numbers in §5.1 are an estimate at 1920×1080
   and the floor is the case that will actually bite.
2. **A visible last resort.** The account block carries `overflow-y: auto`. On a short
   viewport or with longer copy than ships today, the block scrolls internally rather than
   losing text silently. A visible scrollbar on one block is strictly better than prose that
   is not there.
3. **A shell assertion.** `tests/shell-check.mjs` asserts the account is not line-clamped, so
   the clamp removed in §6.3 cannot be reintroduced quietly.

**Other failure modes, and their behaviour:**

| Condition | Behaviour |
|---|---|
| A record with no `overview` | The account falls back to `summary`. **A record with neither falls back to its own `description`** — which is what `tests/renderer.test.mjs`'s existing "a record with no summary still renders a narrative" check requires, and what the codebase's standing invariant demands: `npm test` asserts that every shipped record has authored copy rather than fallback text, so a fallback that renders *something* identifiable is the point. The block is omitted only when all three are absent. |
| A project with no `awards` | The awards block is omitted. Hivemind and SATLearn ship this way. |
| A project with no `team` | The team block is omitted. |
| An award with no `from`-tagged honour, or whose year matches none | Plain text, no control. **Five of the eight** shipped awards are plain text this way. |
| `Site.awardPhotos` cannot resolve a year | Returns `[]` — plain text, never a guess at another award's photographs. |
| A record whose photographs are all awaited | The frame is a reserved place, not a control, as today. |
| A viewport narrower than the 1280px floor | `--stand-w`, `--frame-h` and `--label-measure` all clamp down; the label stays above the fold. Measured by `tools/label-fit.mjs`. |

**The first row was corrected during implementation.** It originally read "both absent, the block is
omitted", which contradicted the renderer suite's own check. Task 4's implementer added the
`description` fallback to satisfy the check and flagged the contradiction rather than silently
choosing one; the check and the codebase's invariant are the binding authority, so the spec's wording
is what changed.

---

## 11. Testing

The unit suites run **in-process** and can run in a confined session. `tools/ux-check.mjs`
drives headless Chrome over the DevTools Protocol, which needs Mojo named pipes and
therefore a session with the sandbox off — it is the authority on everything geometric, and
no unit check can stand in for it.

**Rewritten, because they assert controls this design deletes:**

| Suite | Was | Becomes |
|---|---|---|
| `tests/renderer.test.mjs` | "every project with awards has a control that opens them", "every award entry can be named in a dialog", "a tile with no photographs is not a control that does nothing", "the rail is in the shell" | The awards list is on the wall and complete; an award with photographs is a control and one without is not; `#dockProgress` is in the dock and `#rail` is gone |
| `tests/delegation.test.mjs` | "a project work opens the dialog when clicked" | A project work opens that project's photographs; an award with photographs opens them; an award without does not |
| `tools/ux-check.mjs` | modal focus containment, the rail | The sticky header names the right area at offsets inside each room and changes at a boundary; the progress bar is inside the dock box, reads 0% at the walk's start and 100% at its end; no label is clipped; nothing crosses the dock band, at 1440×900 and at 1280×704 |

**Added:**

- `Site.awardPhotos(projectId, honors, awardOrYear)` — resolves **one award** to its
  photographs; returns `[]` for an award with none, for an unknown project, and for an absent or
  unmatched year; matches on project plus year so the two wordings of one win cannot disagree.
  `awardOrYear` may be the award record or a bare year string. A **new suite**,
  `tests/award-photos.test.mjs`, in the shape of the existing
  `tests/gallery-index.test.mjs`, pinning the 3-control / 5-plain-text split.
- The room-at-offset lookup and the progress fraction, as pure functions in the shape of
  `Site.visibleWork` — `Site.roomAtOffset(scrollLeft, width, rooms)` and
  `Site.progressFraction(scrollLeft, scrollWidth, clientWidth)` — so both are unit-testable
  without a layout engine.
- `tests/shell-check.mjs` asserts `#roomRail` and `#dockProgress` are in the shell, `#rail`
  is not, and the account is not line-clamped.

**Tooling:**

- `tools/label-fit.mjs` — extended per §10.1, and promoted to the primary fit authority for
  this design.
- `tools/stand-fit.mjs`, `tools/stand-overflow.mjs`, `tools/avg-frame.mjs`, `tools/rooms.mjs`
  — updated for the two-band stand, since each one's model of "a stand" changes shape.
- `tools/README.md` — updated where a tool's description no longer matches it.

---

## 12. Open question, deliberately not settled here

§5.4 proposes reducing `--group-gap` without naming a value. The number that makes a
sequence of 1,250px stands still read as separate exhibits rather than as a frieze is a
measurement, not a decision, and `tools/stand-gap.mjs` is what produces it. It is left to
the plan's tuning task, which must land on a measured value rather than a guess.
