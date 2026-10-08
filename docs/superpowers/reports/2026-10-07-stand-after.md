# The stand beside its label: what it measures now

**Date:** 2026-10-07
**Branch:** `museum-label`
**Spec:** `docs/superpowers/specs/2026-10-07-stand-beside-label-design.md`
**Baseline:** `docs/superpowers/reports/2026-10-07-stand-baseline.md`
**Plan:** `docs/superpowers/plans/2026-10-07-stand-beside-label.md`, Tasks 2 and 9

Every number below is output from this repository's own probes, captured with the site served on
`127.0.0.1:3333` and headless Chrome on `127.0.0.1:9222`. The baseline column is the same probe at
the commit the work started from.

---

## 1. The headline

| measure | baseline | now | |
|---|---|---|---|
| stands over the dock, 1280×704 | 6 groups, worst +116px | **0** | fixed |
| stands over the dock, 1536×864 | 3 groups, worst +48px | **0** | fixed |
| room titles above the viewport | Robotics −83, Applications −40 at the floor | **0** | fixed |
| frames painted over by another stand | 1 block, 154×124 | **0** | fixed |
| frames outside their own stand | 6, worst 223px | **0** | fixed |
| **letterboxed photographs** | **0** | **0** | held — and it was 15 of 23 until the review caught it, see §2 |
| frames under 44×44 | baseline passed | **0** at all three viewports, smallest 47×47 | fixed at the floor |
| `ux-check` | 102 passed, 10 failed | **139 passed, 0 failed** | fixed |
| `npm test` | 8 suites, 0 failed | **8 suites, 0 failed** | held |
| photograph area per screen, 1536×864 | 40,560 px² | **31,835 px²** | **worse, see §2** |
| account type at the floor | 13px | 12.5px | worse, chosen |
| labels that scroll | — | 1 of 10 at 1536×864, 6 of 10 at the floor | new, explained in §3 |

**A correction to this report's first version.** It recorded the area measure as 29,740 px² and did
not record that the photographs were letterboxed. They were: `object-fit: contain` fitted each
photograph into a frame box of whatever shape the layout left, and at 1536×864 the box was 0.489
wide per 1 of height against photographs of 1.78 to 2.25 — **15 of 23 frames were 63–77% black
bar**, 82% at 1600×1000. The 29,740 was the area of the *frames*, bars included, which is why the
number looked better than the site did. Both faults are fixed; the numbers below are measured, not
derived.

---

## 2. What the picture area really is

The area now measures the photograph's own content box, so it cannot flatter itself with bars. Per
room at 1536×864, as a share of the screen:

| room | frames | photograph area | share of a 1536×864 screen |
|---|---|---|---|
| Robotics | 9 | 22,234 px² | 1.68% |
| Applications | 9 | 26,891 px² | 2.03% |
| Leadership | 14 | 43,283 px² | 3.26% |
| **the walk** | 32 | — | **2.40%** |

The baseline's 40,560 px² was 3.06% of the same screen, and its frames were wide and short —
234×156 median. These are 91×59 median. So the pictures are **about 21% less area and a very
different shape**: smaller and squarer, in exchange for not being letterboxed and for every frame
clearing the tap floor.

**Why, measured.** A wall beside a label cannot hold three wide photographs at once. PALAD's
`lead-two` at 1536×864: the wall cell is 330px and the hang needs `band × 5.471` of width for its
aspect ratios, so the band is solved at 59–109px depending on the stand. The photographs are
landscape, so a band of that size gives frames a good deal wider than they are tall — but the wall
is the constraint, and it is 330px because the label has 675px of the same 1040px stand.

The lever, if the owner wants the old area back: the two shapes not chosen put the hang across the
full screen. The mockup's own engine solved **122,534 px²** for a full-bleed wall at the foot with
the text above it, and 86,518 px² for a wall-heavy 52/48 split. A side-by-side wall is the one
arrangement of the three that cannot reach the baseline's number, and its ceiling is the label's
width.

---

## 3. What the label does now

| | baseline | now |
|---|---|---|
| account type at 1536×864 | 13px | 12.5–13.5px |
| account columns | 1 (65–70 chars) | 2 (25–35 chars each) |
| label width | the stand's full width (1040px) | its own cell (691px at 1440) |
| account paragraphs out of order | 0 | **0** — dealt in order, at the running-count midpoint |
| line-clamps in the label | 0 | **0** |

`tools/label-fit.mjs` at 1536×864: `clippedLabels: []`, `overlaps: []`. One label scrolls
(Hivemind, 741px of content in a 650px cell) and six do at the floor. **No label is clipped**, which
is the property both probes now test by reading `overflow-y` — `hidden` is unreachable copy,
`auto` is copy behind a scrollbar. The label is also `tabindex="0" role="region"` so that the
scroll is reachable by keyboard, which it was not: measured, the Applications label held 775px in a
502px box with no focusable descendant at all.

**This report's first version claimed the layout "fits at 1440×900 and above". It does not.** At
1440×900 Hivemind holds 743px in a 690px cell — the branch's own suite prints
`info 1 label(s) scroll at 1440x900 (reachable, not clipped)` — so 1440×900 is a scrolling viewport
for the longest account in the collection. The cells do not collide and nothing crosses the dock;
the label simply has more copy than the cell can show at once.

---

## 4. Every check the plan named

`node tools/ux-check.mjs` → **139 passed, 0 failed**, exit 0.

The seven layout checks that failed at the baseline, plus the four this work added:

| check | baseline | now |
|---|---|---|
| `no room content crosses into the dock band or off the top` | FAIL | PASS |
| `no room overflows the fold at 1280x704` | FAIL | PASS |
| `the deepest hang clears the dock band at 1280x704` | FAIL (−33) | PASS |
| `no frame is clipped by its own stand` (both viewports) | FAIL, 6 frames, worst 223px | PASS, 0 |
| `every label shows all of its catalogue` | FAIL | PASS |
| `no frame paints over another group's photographs` | FAIL | PASS |
| `labels still fit at 1280x704` | FAIL | PASS |
| `the wall cell and the label cell do not overlap` (new) | — | PASS |
| `no stand's room title is drawn above the viewport` (new) | FAIL at the floor | PASS |
| `the label's own content fits its cell` (new) | FAIL, 792 in 690 | PASS |
| `an unloaded frame still clears the tap floor` (new) | — | PASS |
| `no photograph is letterboxed` (new) | — | **PASS, and it was 15 of 23 frames before the change that added it** |
| `every scrolling label is reachable by keyboard` (new) | — | PASS |
| `every frame clears 44x44` (both viewports) | PASS | PASS, smallest 53×46 at the floor |

`npm test` → **8 suites, 0 failed** (15 + 13 + 3 + 10 + 63 + 5 + 9 + 8 = 126 assertions).

**The suite was red before this work and three of its ten failures were its own fault** — a column
budget it still asked for after the budget was removed, an awards selector for an attribute that had
been renamed, and a `.rail` element that had been deleted. All three are fixed, and the two further
stale `.rail` reads that were throwing as section ERRORs — and so were invisible in the failure
list — are fixed with them.

**One check was weakened and has been rebuilt.** `no frame exceeds its column budget` asserted
frames never exceed their column's resolved `max-width`; that budget was deliberately retired, so
replacing the check was right, but its replacement — `no frame is clipped by its own stand` — is
true by construction, because `.group` has `overflow: hidden`. It cannot fail for any frame that
rendered at all, and it is the check that would have caught the letterboxing. `no photograph is
letterboxed` is its replacement, and it is the one that fails on the fault.

---

## 5. The intermediate widths the suite does not assert

Both reference viewports are checked at every commit. `--label-col` is a `vw` share, so the range
between and beyond them is where a proportion breaks; these were opened by hand at 1600×1000 and
1920×1080 and walked room by room.

| viewport | stands over the dock | frames outside their stand | labels clipped |
|---|---|---|---|
| 1280×704 (the floor) | 0 | 0 | 0 |
| 1440×900 | 0 | 0 | 0 |
| 1536×864 | 0 | 0 | 0 |
| 1600×1000 | 0 | 0 | 0 |
| 1920×1080 | 0 | 0 | 0 |

---

## 6. What is left for the owner

1. **The photographs are smaller and squarer than what shipped.** §2: 2.40% of a screen against
   3.06%, median frame 91×59 against 234×156. They are correct now — nothing is letterboxed, the
   content box matches each photograph's own ratio to three decimals, and every frame clears the tap
   floor for the first time in this branch. The lever for the old scale is in §2 and it costs the
   label its width.
2. **Six labels scroll at the 1280×704 floor, and one at 1536×864 and 1440×900.** Every word is
   reachable, by mouse and by keyboard, and no paragraph is clipped. If that is not acceptable, the
   floor is the thing to drop.
3. **The account's type floor moved from 13px to 12.5px**, which the owner accepted in the spec's
   §4.2.
4. **`ux-check`'s arrow-key and mobile-dock checks are flaky**, and it is not this branch's doing:
   three consecutive runs of the same tree gave different failure sets, the walk is not reset
   between sections, and the same five checks fail on the baseline worktree at `a238b4a`. A run
   after the fix work gave 139/0 three times in a row, but a green run should not depend on timing.
5. **`--wall-h` is now written from js/main.js** on load, on resize and after fonts settle, so the
   band is a measurement rather than a constant. It runs on every photograph's `load` event, which
   is one small layout read per frame.
