# The stand layout: what it measures before the two-cell shape

**Date:** 2026-10-07
**Branch:** `museum-label` at `f922630`
**Spec:** `docs/superpowers/specs/2026-10-07-stand-beside-label-design.md`
**Plan:** `docs/superpowers/plans/2026-10-07-stand-beside-label.md`, Task 2

Every number below is output from this repository's own probes, captured with the site served
on `127.0.0.1:3333` and headless Chrome on `127.0.0.1:9222`. It exists to be compared against
Task 9's after-report; nothing in the plan reads it.

This is the state of the build **after** Task 1 reconciled the browser suite, so the seven
failing checks named at the bottom are geometry and nothing else.

---

## 1. The fold

`tools/rooms.mjs`. `lastBottom` is the lowest pixel any stand in the room reaches; `dockTop`
is the dock's top edge. A row fails when `lastBottom > dockTop` — the content is then under
the dock **and** unreachable, because the hall has no vertical axis.

### 1280×704 — the spec's floor, `dockTop = 621`

| room | groups | titleTop | lastBottom | over the dock |
|---|---|---|---|---|
| Robotics | 3 | **−83** | **737** | **+116** |
| Applications | 3 | **−40** | **694** | **+73** |
| Leadership | 4 | 129 | 525 | — |
| About / Honours / Contact | 0 | 165 / 42 / 247 | — | — |

### 1536×864 — the owner's screenshot, `dockTop = 781`

| room | groups | titleTop | lastBottom | over the dock |
|---|---|---|---|---|
| Robotics | 3 | **−15** | **829** | **+48** |
| Applications | 3 | 18 | **796** | **+15** |
| Leadership | 4 | 204 | 610 | — |
| About / Honours / Contact | 0 | 241 / 42 / 323 | — | — |

Two faults, at both viewports: a stand overruns the dock, and the room it overruns takes the
room title with it — `titleTop −83` at the floor is a room heading drawn 83px above the top of
the window. Five of the six rooms are fine, which is why the fault went unnoticed: it is the
two rooms whose labels carry real prose.

**The overrun is older than it looks.** The room title's own top, measured on the Robotics
room at four viewports, against the room's 42px head padding and its band of
`clientHeight − 134`:

| viewport | title top | group top | group height | overrun past the padding |
|---|---|---|---|---|
| 1920×1080 | +69 | 151 | 810 | none |
| **1440×900** | **+12** | 87 | 751 | **21px — hidden by the 42px padding** |
| 1536×864 | **−15** | 63 | 766 | 36px |
| 1280×704 | **−83** | −14 | 751 | 116px |

The suite's first reference viewport is the one where 21px of overrun still fits inside the
42px padding, so the title has not escaped and the fold check reads `sits above the room
padding: 12` rather than a title beyond the window. The two viewports the owner actually looked
at — 1536×864 in the screenshot, 1280×704 in the spec's floor — are the two where it shows.

**From `tools/ux-check.mjs` at 1440×900**, the group's own bottom is **838** against a dock top
of **817** — over by 21px, and the room title sits 12px above the room's own padding box.

---

## 2. Frames that are not in their stand

`tools/ux-check.mjs`, the check renamed `no frame is clipped by its own stand`. Six frames
paint outside the stand that owns them, at **both** viewports, the worst 223px over:

| stand | frame | runs past its stand (1440×900) |
|---|---|---|
| Robotics:2 | 2 | 222px |
| Robotics:2 | (second frame) | 223px |
| Applications:1 | — | 89px |
| Applications:2 | — | 89px |
| Applications:1 | (second frame) | 183px |
| Applications:2 | (second frame) | 214px |

`tools/label-fit.mjs` sees the same fault as a collision rather than an overrun, and names both
parties:

```
1536x864:  Robotics:Robotics:2:2 over Applications:Applications:0:0 = 154x124
1280x704:  Robotics:Robotics:2:2 over Applications:Applications:0:0 = 154x113
```

So one stand's photographs paint over the next stand's photographs by a 154×124 block. This is
the fault the two-cell shape fixes as a consequence of giving the wall a cell of its own:
`overflow: hidden` on `.group` stops meaning "clipped" and starts meaning "kept".

`clippedLabels: []` at both viewports — no label's *own* content overflows its box. The label
is not too tall for the box it was given; **the box is too tall for the room.**

---

## 3. How big the pictures read

`tools/avg-frame.mjs` at 1536×864. This is the number the work is judged on.

| room | screens | pieces | median frame | smallest | largest | photograph area per screen |
|---|---|---|---|---|---|---|
| About | 1 | 1 | 123×156 | 123×156 | 123×156 | 19,131 |
| Robotics | 4.8 | 9 | 234×156 | 110×73 | 306×156 | 61,700 |
| Applications | 4.8 | 9 | 234×156 | 92×73 | 295×156 | 48,707 |
| Leadership | 6.8 | 14 | **110×73** | **44×46** | 269×156 | 32,701 |
| **whole walk** | **17.4** | 32 | — | — | — | **40,560** |

A 1536×864 screen is 1,327,104 px², so the walk averages **3.1%** of a screen in photographs,
and the Robotics room — the owner's worst case — 4.6%.

The spread within one room is the more revealing number: in Robotics the smallest frame is
110×73 and the largest 306×156, a **5.9× difference in area inside one room**, because a
column's frames all take the band's height and their widths then follow photographs that range
from 0.750 to 2.251 in aspect ratio.

---

## 4. The seven failing browser checks

`node tools/ux-check.mjs` → **115 passed, 7 failed**. All seven are this fault:

| check | viewport | evidence |
|---|---|---|
| `no room content crosses into the dock band or off the top` | 1440×900 | Robotics: title above padding by 12; group crosses dock, 838 > 817 |
| `no room overflows the fold at 1280x704` | 1280×704 | Robotics title top −83, group bottoms 737 and 710; Applications title top −40, group bottoms 665 and 694 — all against 621 |
| `the deepest hang clears the dock band at 1280x704` | 1280×704 | slack −33, deepest column 156px, `Robotics:0`, `lead-two` |
| `no frame is clipped by its own stand` | 1440×900 | 6 frames, worst 223px |
| `no frame is clipped by its own stand` | 1280×704 | 6 frames, worst 223px |

The suite was greener than this before Task 1 in appearance only: three of its ten original
failures were the suite asking for code the build no longer has, and one of those — the column
width budget — was masking the six clipped frames above. See the spec's §9.

---

## 5. What the after-report must move

| number | baseline | target |
|---|---|---|
| photograph area per screen, whole walk, 1536×864 | 40,560 | > 120,000 |
| stands over the dock, 1280×704 | 5 of 6 groups, worst +116px | 0 |
| stands over the dock, 1536×864 | 3 of 6 groups, worst +48px | 0 |
| room titles drawn above the viewport | Robotics −83, Applications −40 (at the floor) | 0 |
| frames outside their own stand | 6, worst 223px | 0 |
| frames painted over by another stand | 1 block, 154×124 | 0 |
| clamped to 44×44 at the floor | smallest frame 44×46 | every frame ≥ 44×44 |

And one number is expected to move the **wrong** way, which the after-report must state rather
than bury: the account's type size, 13px today at the floor, becomes 11.5px — the trade the
owner accepted in the spec's §4.2.
