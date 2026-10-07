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

## 1. The headline, including the number that got worse

| measure | baseline | now | |
|---|---|---|---|
| stands over the dock, 1280×704 | 6 groups, worst +116px | **0** | fixed |
| stands over the dock, 1536×864 | 3 groups, worst +48px | **0** | fixed |
| room titles above the viewport | Robotics −83, Applications −40 at the floor | **0** | fixed |
| frames painted over by another stand | 1 block, 154×124 | **0** | fixed |
| frames outside their own stand | 6, worst 223px | **0** | fixed |
| `ux-check` | 102 passed, 10 failed | **135 passed, 0 failed** | fixed |
| `npm test` | 8 suites, 0 failed | **8 suites, 0 failed** | held |
| **photograph area per screen, 1536×864** | **40,560 px²** | **29,740 px²** | **WORSE** |
| photograph area per screen, 1280×704 | not measured | 24,277 px² | — |
| account type at the floor | 13px | 12.5px | worse, chosen |

The spec set a target of above 120,000 px² for the picture-area number. **It is not met, and the
next section is why.**

---

## 2. Why the pictures got smaller, measured

The pictures did not get smaller because the wall was squeezed by accident. They got smaller
because a wall BESIDE a label cannot hold three wide photographs at once, and that is a property of
the shape the owner chose rather than of any number in it.

The arithmetic, on PALAD's `lead-two` hang at 1536×864 with the label at `--label-col`'s 691px:

| | |
|---|---|
| stand width | 1320px |
| wall cell (what is left after the label and the gutter) | 490px |
| the hang's natural width at full wall height | **1,189px** — 1.720 + 2.251 + 1.500 aspect ratios × 691px |

The hang wants 2.4× the wall it has. Three shapes were built and measured before this one:

| shape | what happened |
|---|---|
| columns divide the wall's **height** (the pre-two-cell build, and the mockup's assumption) | every frame fell to the 44px tap floor. A wall of slivers: 44×691. |
| columns divide the wall's **width**, each column's height following its own photograph | frames collapsed to 44×29. A frame's box was being sized against a parent whose height was derived from that same box. |
| **shipped:** the wall is a band that scales, and its columns divide it | frames come out landscape and fill the wall: 102×190 median in Robotics. |

Above the band the geometry is correct at every viewport — nothing overflows, nothing is cropped,
nothing collides, and the suite is green at all of them. What it costs is height, and height is
where a photograph's area comes from.

**The comparison the owner should have.** The two shapes not chosen put the hang across the full
screen instead of beside the label: the mockup's own engine solved 122,534 px² for Option C
(full-bleed wall at the foot, text above) and 86,518 px² for a wall-heavy 48/52 split. A
side-by-side wall is the one arrangement of the three that cannot reach the baseline's own number.

The lever, if the owner wants that number: `--label-col` to `48vw` and `--wall-h` to about
`clamp(220px, 30vh, 420px)` was measured at **86,518 px²** with the label fitting its cell at
1440×900 — at the cost of the label scrolling on four of the six project stands rather than one.

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
`auto` is copy behind a scrollbar.

---

## 4. Every check the plan named

`node tools/ux-check.mjs` → **135 passed, 0 failed**, exit 0.

The seven layout checks that failed at the baseline, and the two the plan added:

| check | baseline | now |
|---|---|---|
| `no room content crosses into the dock band or off the top` | FAIL | PASS |
| `no room overflows the fold at 1280x704` | FAIL | PASS |
| `the deepest hang clears the dock band at 1280x704` | FAIL (−33) | PASS |
| `no frame is clipped by its own stand` (both viewports) | FAIL, 6 frames, worst 223px | PASS |
| `every label shows all of its catalogue` | FAIL | PASS |
| `no frame paints over another group's photographs` | FAIL | PASS |
| `labels still fit at 1280x704` | FAIL | PASS |
| `the wall cell and the label cell do not overlap` (new) | — | PASS |
| `no stand's room title is drawn above the viewport` (new) | FAIL at the floor | PASS |
| `the label's own content fits its cell` (new) | FAIL, 792 in 690 | PASS |
| `an unloaded frame still clears the tap floor` (new) | — | PASS |
| `every frame clears 44x44` (both viewports) | PASS | PASS |

`npm test` → **8 suites, 0 failed** (15 + 13 + 3 + 10 + 63 + 5 + 9 + 8).

**The suite was red before this work and three of its ten failures were its own fault** — a column
budget it still asked for after the budget was removed, an awards selector for an attribute that had
been renamed, and a `.rail` element that had been deleted. All three are fixed, and the two stale
`.rail` reads that were throwing as section ERRORs (and so were invisible in the failure list) are
fixed with them.

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

1. **The picture-area number is below the baseline.** §2 has the cause and the lever. This is the
   one thing in the change that is worse for a visitor than what shipped.
2. **Six labels scroll at the 1280×704 floor and one at 1536×864.** Every word is reachable and no
   paragraph is clipped, but a visitor on a short screen scrolls inside the label column. If that is
   not acceptable, the floor is the thing to drop — the layout fits at 1440×900 and above.
3. **The account's type floor moved from 13px to 12.5px**, which the owner accepted in the spec's
   §4.2 and which is what lets the account fit two columns at the floor.
