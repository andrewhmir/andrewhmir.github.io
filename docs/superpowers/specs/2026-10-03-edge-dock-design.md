# Edge Dock and Framed Groups — Design Spec

**Date:** 2026-10-03
**Status:** Draft for review
**Amends:** `2026-10-03-night-gallery-design.md` §5 (scroll architecture), §6 (visual
system), §9 (accessibility), §12 (verification), §13 (risks)
**Supersedes:** the same spec's §6 rule "Frames: none. Light is the frame."

---

## 1. Summary

Two changes, and they are separable but they belong together.

**The chrome.** The Night Gallery's fixed chrome fights the rooms it frames. Two fixed bands —
a 63px navigation bar and a 94px directory — occupy 157px of a 900px viewport,
and the rooms begin at viewport `y = 0`, so the chrome sits **on top of** the first
room's heading rather than above it. The room's own sign row is completely
covered, the room title is bisected, and the directory's links sit directly on
the title's glyphs.

This work replaces both bands with a single piece of chrome at the **foot** of
the walk: an edge dock carrying the brand, every room, the current room's name, and
a position rail. The top of the screen is returned to the rooms. Room content is
centred in the space between the top edge and the dock, so no room is top-heavy and
the walk's dead wall is distributed rather than piled at the bottom.

The museum framing is unchanged. This is the frame around the walk, not the walk.

**The works.** Today every photograph is hung as an independent work with its own
accession number, its own label and its own `--lit` value. An event with three
photographs therefore reads as three unrelated exhibits, and the Honours room
hangs nine near-identical contact prints in a row with their captions suppressed
to an accession number and a name. Nothing tells the visitor that the nine
photographs belong to six events, or which three are the same event.

This work introduces the **group**: one event, award, post or project is one work,
hung as a composition of its photographs in real frames with mats, carrying one
exhibition label — a plan of the hang, a catalogue entry per photograph, and a
paragraph that explains the group. The label's three-column shape is taken
directly from the reference wall (a museum label photographed by the owner, whose
structure is reproduced in §8).

---

## 2. Goals and non-goals

**Goals**

- No room content is ever overlapped or bisected by fixed chrome, at any viewport
  the spec supports (1280×704 up to 2560×1440).
- The chrome stops competing with the room's own typography.
- Any room stays one click away, and the current room is always identifiable.
- Room content is vertically balanced rather than pinned to the top.
- **Every photograph is explained in text**, and every group is framed by a
  paragraph that says what the event was.
- **The grouping is visible**: one event reads as one exhibit, not as N exhibits.
- Keep every quality bar already established: modal focus containment, keyboard
  access, 44×44 tap targets, video lazy-loading, reduced-motion support, AA contrast.
- Stay a static site with no build step, and keep Lenis as the only dependency.

**Non-goals**

- Re-shooting or restyling project photography.
- Changing the walk's room order or the set of events.
- Adding a second scrolling axis.
- Redesigning the dialog ("step closer to the work") beyond opening a group.

## 3. The defect, measured

Read from the live page at 1440×900 through the DevTools Protocol, not from
reading the CSS.

| Element | Top | Bottom | Height |
|---|---|---|---|
| `.nav-header` (fixed, z 1000) | 0 | 62.8 | 62.8 |
| `.directory` (fixed, z 900) | 68 | 161.9 | 93.9 |
| `.sign` ("ROOM 1 ———") | 26 | 44.5 | 18.5 |
| `.room-title` | 98 | 166.5 | 68.5 |
| `#hall` | 0 | 900 | 900 |

Four separate faults follow from that table.

1. **The sign is fully occluded.** `.sign` spans 26–44.5; `.nav-header` covers
   0–62.8 and is opaque (`linear-gradient(to bottom, var(--bg-root) 0%, transparent 100%)`
   is solid at its top, where the sign sits). The room's accession row can never
   be seen. Confirmed: `coveredByNav: true`.

2. **The title is bisected.** `.room-title` spans 98–166.5. The directory spans
   68–161.9 and its links occupy 103.9–147.9 — the middle of the title. At
   41.76px the word "About" renders with its cap-height underneath the directory's
   first link ("Room 1 About bio & contact"), and the title's descenders emerge
   below it. In the reported screenshot the same collision renders "Honours" as
   "Horrours".

3. **The chrome costs 157px of a 900px viewport — 17.4%.**

4. **The chrome does nothing the other half does not already do.** `#navList`
   and `#navMenu` both measure **0 × 0**: `renderNav()` is deliberately never
   called, because the old nav listed `#News`, `#Projects` and `#Records`, none of
   which exist in the walk. The 63px navigation bar therefore contains one italic
   wordmark and two empty elements. The directory beneath it is the only working
   navigation — and it is the band that is covering the title.

Two further defects were found while measuring, and are fixed here.

5. **A horizontal scrollbar silently steals the bottom 15px of every room.**
   `#hall` measures `offsetHeight: 900` but `clientHeight: 885`. `.content-layer`
   and `#hall` are both `height: 100vh`, and the hall's own horizontal scrollbar
   consumes 15px of that box. The room's last 15px are clipped at every viewport,
   and the visible bar competes with the dock. Hiding the native bar restores
   `clientHeight` to 900 exactly (verified). The hall sits *inside* `.content-layer`,
   which is `overflow: visible`, so `body { overflow: hidden }` never suppressed
   it.

6. **`.room::before`, the wall-nap texture, is not click-through.** It is
   `position: absolute; inset: 0` with no `pointer-events: none`, painted after the
   room's content in DOM order. It covers the full room and sits above every
   interactive element inside it, intercepting pointer events. Keyboard access
   still works, which is why the delegation suite has not caught it. The `.sign`
   row, which it currently covers, is being removed anyway; the fix is required
   for the works themselves.

## 4. Decision log

| Decision | Choice | Note |
|---|---|---|
| Where the chrome lives | The foot of the walk, not the top | The walk is the site; the top edge belongs to the room |
| How many pieces of chrome | One | The dead nav bar is deleted, not merged |
| Chrome height | ~72px at the foot, 0 at the top | Fits the dock in one row at the supported floor |
| Vertical rhythm | Every room's content centred | Balances short rooms instead of leaving ~500px of dead wall at the foot |
| Native scrollbar | Hidden; its job moves to the dock rail | Wheel, drag, touch, arrow keys and the dock all still move the walk |
| Meeting the floor | `min-height: 100vh` on the room → lowered; `--img-max-h: 26vh` → 22vh | See §11 — verified against measurement, not assumed |
| What hangs as one work | One **group** = one event / award / post / project, not one photograph | See §7 |
| Frames | Gold frame and cream mat, drawn in CSS | Supersedes the original spec's "frames: none"; the reference wall is framed |
| The label's text | One catalogue entry per photograph, plus a group paragraph | Drafted from existing data, marked for the owner to rewrite. See §9 |
| Thirteen honours in one room | Split into two rooms, Awards and Citations; three groups per room | Thirteen groups cannot fit one viewport. See §10 |

**Rejected**

- Merging the nav bar and the directory into one top bar (the mockup shown as
  "Approach A"). It works and it is cheap, but it still spends 56px of the top
  edge on chrome and still frames the room from above.
- Keeping the native scrollbar. It is a second position indicator sitting beside
  the dock's rail, and it clips 15px from every room.
- Leaving the vertical rhythm alone. The About room leaves `900 − 447 = 453px` of
  empty wall; Leadership 578px; Contact 617px. The walk reads as unfinished rather
  than as spacious.
- A floating mark pinned to the top-left corner. It re-introduces exactly the
  defect being fixed: a fixed element with no reserved space, above a room whose
  title walks underneath it as the walk scrolls.

## 5. The dock

One fixed element at the foot of the walk.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   About                                   the room, centred        │
│   DATA ENGINEER | COMPUTATIONAL COGNITION RESEARCHER   1 OF 6      │
│                                                                    │
│   [portrait]   Hi, I'm Andrew.                                     │
│                I like art, and I have fun building things.          │
│                …                                                    │
│                                                                    │
│                                                                    │
│                  ┌──────────────────────────────────────┐          │
│                  │ 1 About │ 2 Robotics │ … │ — Contact │          │  ← dock
│                  └──────────────────────────────────────┘          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← rail
└────────────────────────────────────────────────────────────────────┘
```

- **Position:** `fixed; left: 50%; bottom: 18px; transform: translateX(-50%)`.
- **Contents:** six room controls (accession `1`–`5`, then `—` for Contact) with
  the room's short name, separated by hairline dividers. Short names are used, not
  full titles: `About`, `Robotics`, `Applications`, `Leadership`, `Honours`,
  `Contact`. The full titles remain in the room headings and in each control's
  accessible name.
- **Current room:** accent underline + `--text-strong` name + accent accession.
  Exposed as `aria-current="true"` and reflected onto the directory.
- **Surface:** `rgba(13,12,11,.94)` with a 1px `--edge` border, no radius. The
  dock is *over* the wall, so unlike the old bands it must be opaque enough to be
  read and small enough not to hide a work.
- **Height:** ≤ 72px including the 18px offset. At the supported floor
  (1280×704) the dock occupies 10% of the viewport, against the current 17.4% +
  15px.
- **Touch:** each control is at least 44px tall; the dock scrolls horizontally
  when the six controls cannot fit.

### The narrow case

The six controls do not fit in one row below roughly 560px. Then the dock
collapses to **six numbered pips plus the live room's accession and name**, so the
current room is still named in full and every room is still one tap away. The
expanded names return as soon as they fit.

### The rail

A 2px full-width element pinned to the bottom edge of the viewport, above nothing
and below the dock, whose filled width is `scrollLeft / (scrollWidth − clientWidth)`.
It is `aria-hidden` — it is a visual echo of a position that the dock and the live
region already announce.

### Brand

The wordmark becomes the first element **inside** the dock, separated by a
divider, rather than a floating label. Measured cost: ~150px of dock width. At
narrow widths it is dropped before any room control is.

## 6. The room

`.room` keeps its wall treatment unchanged — the radial warm wash, the vertical
gradient, the dot-grid nap. Three changes:

1. `.room::before` gains `pointer-events: none`.
2. `.room` becomes `display: flex; flex-direction: column; justify-content: center`,
   with padding reserved at the foot for the dock:
   `padding: 44px 34px calc(72px + 26px)`.
3. `.room`'s `min-height: 100vh` is removed. It is a second constraint on a box
   that is already sized by the hall; at 1280×704 it is what forces the room to
   774px tall inside a 704px hall (see §11).

Because the room is now a centring flex column, its content is balanced in the
space above the dock: the About room's content, currently ending at 447px with
453px of dead wall beneath it, becomes balanced within the same band.

`.sign` ("ROOM 1 ———") is **deleted** from `renderRooms()` and from the stylesheet.
It carried the accession, which the dock now carries, and it was the element being
hidden behind the navigation bar. Deleting it also reclaims the 34px of top margin
that `.room-title` used to sit below it.

## 7. The group

A **group** is one event, award, post or project. It is the unit that hangs.

Today the unit is the photograph. `renderRooms()` emits one `.work` per image,
and the Honours room therefore hangs nine works for six events. The fix is to
change the unit: one group is one exhibit, composed of one or more photographs.

```
<div class="group">                          ← one event / award / post / project
  <div class="cluster">                      ← the hang: fixed slots, unequal sizes
    <figure class="piece" data-piece="0">    ← framed, matted, per-photo light
    <figure class="piece" data-piece="1">
    …
  </div>
  <div class="label">                        ← ONE label for the whole group
    <div class="plan">                       ← miniature plan of the hang
    <div class="cat">                        ← catalogue: one entry per piece
    <div class="narr">                       ← the paragraph that frames the group
  </div>
</div>
```

### Which records become groups

| Room | Group unit | Groups | Pieces per group |
|---|---|---|---|
| About | not a group — a portrait, a bio and links, hung as today | — | — |
| Works in Robotics | one **project** | 3 | Overview + Team (2) |
| Works in Applications | one **project** | 3 | Overview + Team (2) |
| Leadership | one **post** | 4 | 2–4 photographs |
| Honours | one **award / event** | 13 | 1–3 photographs, median 1 |
| Contact | not a group | — | — |

Honours is the room that justifies the change: thirteen honours collapse from
twenty-something works into thirteen groups, and each group's photographs finally
read as belonging to one event.

### The hang (`.cluster`)

The reference wall hangs unequal pieces in a loose composition, not a grid. The
cluster reproduces that with **fixed named slots** rather than automatic layout:

| Slot | Width × height | Position | Role |
|---|---|---|---|
| `a` | 340 × 150 | 0, 0 | the primary photograph |
| `b` | 180 × 118 | 364, 10 | secondary |
| `c` | 150 × 96 | 570, 34 | tertiary, offset down |
| `d` | 230 × 142 | 558, 4 | secondary, tall |
| `e` | 150 × 106 | 802, 20 | filler |

Rules:

- A group with **one** photograph hangs slot `a` alone, larger (300 × 132) — it is
  a single framed painting, and it must not look like a broken cluster.
- A group with **n** photographs claims slots `a` … in order, and the cluster's
  width is the used span. Slots are never left as visible gaps.
- Slot heights are **ratios, not pixels**: the cluster scales with the room's
  available width so the composition holds at 1280 and at 2560.
- Frame: a 3px gold gradient, a cream mat (7px), a 2px black pad, and a cast
  shadow. The gradient stops are recorded in the mockup; the important property is
  that the frame is *drawn* (CSS), never an image — no request, no asset.
- `.piece` carries its own `--lit`, exactly as `.work` does today, so the
  lighting model and its performance constraint (`@property … inherits: false`,
  written to leaf elements only) are unchanged. The pool of light moves from
  `.work .pool` to `.piece::after`.

### What happens to the accession numbers

`DIST. 01`, `CAT. 01` and friends currently number each photograph. They become
the **piece letters** `A`, `B`, `C` … within a group, which is what the label's
plan and catalogue key against. The group itself takes a room-scoped accession
(`ROOM 5 · 10`), shown on the label.

## 8. The label

The label is the reason this redesign is worth doing: it is where each photograph
gets its text. It reproduces the reference wall's three-column structure.

```
┌─ plan ──────┬─ catalogue ─────────────────────┬─ narrative ──────────────┐
│  ┌──┐ ┌┐    │ A  Overall Champion, Mar 2025   │ 10th Philippine Robothon │
│  │A │ │B│   │    Podium and trophy on the     │                          │
│  └──┘ └┘    │    closing morning.             │ The machine that won the │
│   ┌┐        │    Event photograph · 1600×900  │ international round came  │
│   │C│       │ B  At the table, Mar 2025       │ home and entered the     │
│   └┘        │    The delegation with the      │ open category again. …   │
│             │    machine between rounds.      │                          │
│ FOUR PHOTO- │ C  Run-through, Mar 2025        │                          │
│ GRAPHS      │    Final calibration before…    │                          │
└─────────────┴─────────────────────────────────┴──────────────────────────┘
```

| Column | Contents | Source |
|---|---|---|
| Plan | Miniature rectangles at the cluster's slot geometry, each with its letter, plus a count caption | Derived from the slot table — never hand-drawn |
| Catalogue | One entry per photograph: letter, short title, date, description, and a technical line | **New data** (see §9) |
| Narrative | The group's title and the paragraph that explains the event | **New data**, drafted from existing fields |

- The catalogue is a two-column CSS multi-column list so four or five entries stay
  short; a single-photograph group renders one column.
- Every entry is a real focusable control: activating it opens that photograph in
  the existing dialog, at the piece it names. This is what makes the label
  *explanatory* rather than decorative, and it is why the label cannot be
  `aria-hidden`.
- The plan is `aria-hidden` — it is a picture of the hang, and the catalogue
  already names every piece in order.

## 9. The data

Two new optional fields per group. Both are authored content, so both live in
`js/data.js` beside the record they describe.

```js
{
  description: "Annual Commencement Exercises – High Honors",
  year: "April 2026",
  images: ["files/honors-commencement-1.jpg", "files/honors-commencement-2.jpg"],
  /* NEW — the paragraph that frames the group (2–4 sentences) */
  summary: "Graduating with high honours, and the ceremony that closed six years
            at San Beda Alabang.",
  /* NEW — one entry per image, in the same order as `images` */
  pieces: [
    { title: "High Honors",     caption: "Crossing the stage to receive the citation." },
    { title: "With the batch",  caption: "The graduating class after the ceremony." }
  ]
}
```

- **`summary`** and **`pieces`** are both optional. A group without them still
  renders: the narrative falls back to the record's existing `description` and
  `year`, and a piece without a caption renders its letter and title only. The
  site is never blocked on copy, and no label is ever empty.
- `pieces[i]` corresponds to `images[i]`. If `pieces` is shorter, the missing tail
  falls back; if it is longer, the extra entries are ignored. This is asserted.
- The technical line under each caption (`Event photograph · 1600×900`) is derived
  at render time from the image, not authored.
- **Draft copy is written for every group** as part of this work, drawn only from
  facts already in `data.js` — the record's own `description`, `year`, `category`,
  `venue`, and the project's existing `overview.text`. Each drafted line is marked
  with a `/* DRAFT COPY — review */` comment so the owner can find and rewrite
  them. No new facts are invented.

## 10. How many groups fit a room

This is the hard limit that decides the room count, and it is not negotiable
without changing the scroll architecture.

A room is exactly one viewport tall inside a hall that is exactly one viewport
tall with `overflow-y: hidden`. **A room cannot scroll vertically.** Anything that
does not fit above the dock is clipped *and unreachable*, and the horizontal walk
cannot rescue it.

Budget at 1440×900:

| Band | Height | Width |
|---|---|---|
| Room box | 900 | 1325 (92vw) |
| Room padding | 36 top, 124 bottom (dock reserve) | 34 each side |
| Room title + subtitle + margin | ~66 | — |
| **Available for groups** | **~674** | **~1257** |

A group as mocked costs **~250px tall** (150px cluster + 14px gap + ~86px label)
and **~900px wide** (the cluster spans 952px, plus a label column beside it). Two
such groups therefore do **not** fit side by side in a 1257px room, and stacking
them vertically costs 500px of the 674px available — so a room holds **two groups
comfortably, three at a squeeze**, and the type must stay readable at three.

Thirteen honours groups at two per room would need seven rooms. That is an
unreasonable walk, and it is what makes the room layout, not the room count, the
thing to fix.

**Resolution.** Two changes together:

1. **The group narrows.** The cluster takes the top of its cell and the label
   stacks beneath it in three columns, instead of sitting beside it. A group then
   costs ~900 × 250 instead of ~1257 × 250, and **three groups fit one row of a
   1257px room** at ~400px each with the catalogue reflowing to two columns.

   This is a real trade: a narrower cluster means smaller frames. The mocked
   proportions above are the ceiling, and the implementation's job is to land the
   grid at three columns without the catalogue dropping below the AA-checked type
   sizes already in the stylesheet. If three columns cannot be made readable,
   the fallback is two columns and four rooms.

2. **Honours splits by kind.** Even at three per room, thirteen groups need five
   rooms. The walk gains two:

| Room | Contents | Source |
|---|---|---|
| 5 · Honours — Awards | competition and congress honours | `honors` whose record names a competition |
| 6 · Honours — Citations | academic and conference citations | the remainder |

The split predicate is derived from `description` text already present, and it must
be a **total partition** — every honour lands in exactly one of the two rooms, with
an unmatched record falling to Awards rather than to neither. It is asserted by a
test, because a mis-split would silently hide an honour.

The dock grows to seven rooms: seven short names at ~110px is ~770px, plus the
brand at ~150px, inside the 1372px available at 1440.

`Site.deriveRooms()` gains the split; `tests/derive-rooms.test.mjs` gains the
partition assertion.

**The measured numbers in this section are from the mockup, not from the built
page.** They set the design; §15's assertions verify the built result at 1440×900
and 1280×704, and the implementation adjusts the grid until assertion 4 passes.

## 11. Meeting the height floor

The original spec's supported range is 1280×704 upward. Measurement at
1280×704 (with the scrollbar hidden) gives `hall.clientHeight: 704`, but the two
densest rooms still overflow it:

| Room | Content bottom | Room bottom | Overflow |
|---|---|---|---|
| Works in Robotics | 740.1 | 704 | **+36.1** |
| Works in Applications | 716.0 | 704 | **+12.1** |
| Contact | 649.2 | 704 | −54.8 |

The cause is `min-height: 100vh` on `.room`: at a 704px viewport it makes the room
774px tall (704 + the room's own 70px of vertical padding), and the flex row of
two works then lays out against that inflated height. Removing it, and lowering
the image budget from `26vh` to `22vh`, brings both rooms inside 704px with
margin. The `22vh` figure is a starting point to be **confirmed by measurement in
the implementation**, not assumed — the implementation task measures both dense
rooms at 1280×704 and adjusts the token until they clear, and records the numbers.

Rooms keep their one-row, no-wrap rule. Nothing is clipped and unreachable.

## 12. What gets deleted

This work removes more than it adds, and that is the point.

| Removed | Reason |
|---|---|
| `.nav-header` markup, `#navList`, `#navMenu` | Contains one wordmark; both lists measure 0×0 |
| `renderNav()` and its `PORTFOLIO.nav` consumer | Dead since the walk replaced the vertical document |
| `updateNavVisibility()`, `updateActiveNav()`, `initSmoothScroll()` | All keyed to `window.scrollY` and `--navbar-h`, and the document no longer scrolls vertically |
| `.nav-toggle`, `.nav-menu`, `.nav-backdrop`, `openMobileNav()`, `closeMobileNav()`, `lockBodyScroll()`'s nav path | The mobile hamburger is unreachable: `.nav-toggle` never enters the DOM |
| `.directory` markup, `renderDirectory()`'s band styling | Replaced by `renderDock()`; the room list itself survives |
| `.sign` markup and styles | Redundant with the dock; was the occluded element |
| `--navbar-h` | No consumer remains |
| `#hall`'s native scrollbar | Replaced by the rail |

`.directory`'s room-list construction — including the "directory lists every room
and nothing else" and "every directory entry is a real button" assertions the
suite already makes — moves to the dock. The suite should keep passing against the
new element, with its selector updated, rather than being weakened.

The legacy vertical-document CSS (sections 5–14 of `css/styles.css`, ~1100 lines)
is explicitly **out of scope** here: the dialog, carousel and toast still live in
it. It is a separate cleanup.

## 13. Accessibility

Everything the original spec's §9 requires still holds. Specifically:

- The dock is a real `<nav>` with a `<ol>` of `<button>`s — not pointer-only
  hotspots, and not a `div` soup. Each control's accessible name is the full room
  title and its accession (e.g. "Room 2 — Works in Robotics, 3 works"), so the
  shortened visible label is not what a screen reader reads.
- Target size stays ≥ 44×44 at every width, including the collapsed pip form.
- The `aria-live` region still announces the current room on change. The dock adds
  `aria-current`, which is a second, non-conflicting signal.
- The rail is `aria-hidden="true"`.
- Hiding the native scrollbar does **not** remove keyboard access: `#hall` keeps
  its `tabindex="0"` and `overflow-x: auto`, so arrow keys, Page Up/Down, Home/End
  and the existing "tabbing to a work brings it into the walk" behaviour are
  unchanged. This must be asserted, because "scrollbar hidden" and "not scrollable"
  are easy to confuse and the difference matters.
- Focus rings must remain visible against the dock surface; the dock is opaque
  specifically so a focus ring on it has something to sit on.
- Reduced motion: the rail's width is set directly, with no transition under
  `prefers-reduced-motion: reduce`.

## 14. Files

| File | Change |
|---|---|
| `index.html` | Remove `.nav-header`; replace `.directory` with the dock and the rail |
| `css/styles.css` | Delete sections 7's nav rules; add the dock; centre `.room`; `pointer-events` fix; hide the hall scrollbar; `--img-max-h` |
| `js/main.js` | `renderDirectory()` → `renderDock()`; delete the nav and vertical-scroll controllers; keep the walk, lights, dialog |
| `tests/*` | Point the directory assertions at the dock; add the group and split assertions; add the new assertions in §15 |
| `tools/ux-check.mjs` | Add the overlap, fold and scrollbar assertions |
| `README.md` | Describe the dock and the rail |
| `docs/superpowers/specs/2026-10-03-night-gallery-design.md` | §5, §6, §9 amended by this document |

## 15. Verification

Verification is by measurement through the DevTools Protocol, because every fault
in §3 is a geometry fault that no unit test can see. The existing DOM stub models
no layout, so these live in `tools/ux-check.mjs`.

New assertions, at 1440×900 and at the 1280×704 floor:

1. **Nothing overlaps the room content.** For every room and every element inside
   it, the element's rect does not intersect the dock's rect, and its
   `top ≥ 0`. This is the assertion that would have caught the original defect.
2. **The title is fully visible.** `.room-title`'s rect sits entirely above the
   dock and entirely below `y = 0`, in all six rooms.
3. **The hall is its full height.** `hall.clientHeight === hall.offsetHeight`, i.e.
   no scrollbar is stealing 15px.
4. **Nothing overflows the fold.** For every room, content bottom ≤ room bottom,
   at both viewports. This is the assertion that pins the §11 token.
5. **Every group renders its label.** Each group in the DOM has a plan, at least
   one catalogue entry per photograph, and a non-empty narrative — so no group can
   ship with a photograph that has no text.
6. **No photograph is dropped or duplicated by grouping.** The multiset of `img`
   `src` values across a room equals the multiset the data declares for it. This is
   the assertion that catches a grouping bug hiding an image.
7. **The honours split is exact.** The union of the Awards and Citations rooms is
   exactly `PORTFOLIO.honors`, with nothing dropped and nothing duplicated.
8. **The walk still scrolls.** After a scroll gesture, `scrollLeft` changes and
   `scrollTop` stays 0 — the existing check, kept.
9. **Keyboard scrolling still works** with the native bar hidden: focus `#hall`,
   press ArrowRight, assert `scrollLeft` increased.
10. **The rail tracks the walk.** Rail width scales monotonically with `scrollLeft`
    and reaches 100% at the end of the strip.
11. **The dock names the current room** in the live region as the walk moves.

Re-run unchanged: tap targets ≥ 44×44 at 390×844, modal focus containment, the
whole-piece click target, lights come up and stay up, no work hangs an empty frame.

Manual acceptance, because headless Chrome cannot judge it: whether the dock's
surface hides too much of a label at the foot of a room, whether the rail reads as
a position cue or as decoration, and whether a framed cluster reads as one exhibit
or as a crowded grid.

## 16. Risks

| Risk | Mitigation |
|---|---|
| The dock covers a work's wall label at the foot of a room | The room reserves `72px + 26px` at the foot; assertion 4 measures it. The exact reserve is tuned in implementation. |
| Hiding the scrollbar removes a navigation affordance | The rail, the dock and the live region carry position; assertions 5, 6 and 7 pin the behaviour. |
| The brand inside the dock pushes the six rooms past the available width | The brand is dropped first, then the dock collapses to pips. Both are pure CSS breakpoints. |
| Deleting the nav controller breaks something that still calls it | Every removal is preceded by a whole-repo grep, and `npm test` must pass before and after. |
| A one-row, no-wrap room cannot meet 1280×704 once centred | §11's token is measured, not assumed; if `22vh` is insufficient the row gap tightens before the works wrap. |
| A framed cluster costs more height than a bare row, so fewer groups fit | §10's budget is measured: three groups per room at a fixed grid. If three columns cannot be made readable, the fallback is two columns and four rooms. |
| Grouping silently drops or duplicates a photograph | Assertion 6 compares the rendered `src` multiset against the data, per room. |
| The honours split predicate mis-files an honour, hiding it | The predicate is asserted to be a total partition; the fallback is that an unmatched record goes to Awards, never to neither. |
| Drafted copy states something the owner did not do | Drafts are drawn only from facts already in `data.js`, marked `/* DRAFT COPY — review */`, and the fallback render works with `summary` and `pieces` absent. |

## 17. Out of scope

- The legacy vertical-document CSS sections (5–14) and their dead controllers
  beyond the nav.
- Re-shooting photography, or the BiyaHey still.
- Any second axis of navigation.
- Room transitions beyond scroll position.
