# Museum Label — build handoff

**Branch:** `museum-label` (off `main`, not merged, not pushed)
**Plan:** `docs/superpowers/plans/2026-10-04-museum-label.md`
**Spec:** `docs/superpowers/specs/2026-10-04-museum-label-design.md`
**Method:** superpowers subagent-driven-development — fresh implementer per task, fresh
adversarial reviewer after each, scoped re-review after each fix round.

---

## State

| Task | Status | Commits | Fix rounds | Review |
|---|---|---|---|---|
| 1 — pure functions | ✅ complete | `a5991c6`→`cbb6617` | 1 | clean after re-review |
| 2 — shell elements | ✅ complete | `69b3918`→`11665f4` | 2 | clean after re-review |
| 3 — walk wiring | ✅ complete | `41f4b5d`→`7e8e671` | 1 | clean after re-review |
| 4 — label copy | ✅ complete | `2af5443`→`83fb7d3` | 3 | clean after re-review |
| 5 — two-band stand | ⚠️ **done, not re-reviewed** | `1300b0f`→`c8005c6` | 3 | **review deferred — see below** |
| 6 — delete dialogs | ⬜ not started | — | — | — |
| 7 — geometry tools | ⬜ not started | — | — | — |
| 8 — docs + suite pass | ⬜ not started | — | — | — |
| Final whole-branch review | ⬜ not started | — | — | — |

**All nine suites green at every commit.** Renderer grew **46 → 63** checks.
`npm test` exits 0. `ux-check` is 102 passed / 7 FAIL / 3 ERROR — **its 7 failures are stale
assertions about markup this build deleted, and repairing them is Task 7's job.**

### Why Task 5's review is deferred, stated plainly

Tasks 1-4 each got a full independent review. **Task 5 did not.** It ran three fix rounds driven by
direct controller measurement over CDP (the geometry is measured, not asserted), and I took the
decision to stop rather than spend a fourth reviewer round on a 2-element residual. **This is a
process deviation and the reason is budget, not confidence.** The measurements are reproducible with
the commands in Task 5's report; an independent review of `1300b0f..c8005c6` is the right next step
if the branch is to be merged.

---

## What actually ships

A visitor now reads a project's **full account (162-220 words), its awards with dates as text, and
its team caption** on the wall, with no click. Previously the account was behind an Overview button,
the awards behind an Awards button, and the narrative was line-clamped to four lines. A sticky
`.room-rail` names the area; `#dockProgress` fills inside the dock on total walk progress.

The stand is a **two-band column**: a 156px picture band above a full-width label. The account is
uncut — `line-clamp` appears **nowhere** in `css/styles.css` or `js/main.js`.

### Measured fit (the acceptance criterion)

| viewport | clipped label text | cluster | label | rail |
|---|---|---|---|---|
| 1920×1080 | **0** | 156 | 644 | 35 |
| 1440×900 | **0** | 156 | 585 | 31 |
| 1536×864 | 2 (one award, partly) | 156 | 600 | 32 |
| 1280×704 | 12 (accepted residual) | 156 | 585 | 31 |

Before Task 5 the same measurement was 5 / 6 / 16 / 20 clipped.

**`--band-h` is 156px, not the spec's 150px**, and that is deliberate: 150 splits a 3-row column into
43.3px frames and fails the 44×44 tap floor at two viewports. The spec's own §5.1 says its numbers are
an estimate and `ux-check` is the authority.

---

## The two documented residuals, and why they are not fixable by tuning

At **1280×704** the room's content box is 546px and the densest stand's label alone needs 625px. At
**1536×864** the shortfall is 25px — one award's description and year. The human accepted both.

**They are the same closed choice**, and the reason is structural: **the room is exactly one viewport
tall with `overflow-y: hidden`, so removing chrome does not free space — the content simply
recentres.** Verified by simulation: taking the in-room `.room-title` (72px on every wall) out of flow
changed the label height by **0px** (600 → 600) and only moved *which* edge clipped.

Closing the last 25px therefore requires spending exactly one of:
1. the account's type size — the human has ruled this out twice;
2. an award — rows are already at the 44px tap floor with a 4px gap;
3. the tap floor — 150px gives 43.3px frames.

**Nothing was spent.** The honest statement is: *the one-viewport-tall rule and the full-copy
requirement are in tension at short viewports, and the human chose to keep the rule and document the
loss.*

---

## What I got wrong — five reversals, every one caught by a reviewer or a measurement

Recorded because the pattern is the finding, not the individual errors.

| # | My claim | Reality | Caught by |
|---|---|---|---|
| 1 | `awardPhotos` should match a project, not an award | The union gave 5 photo-less awards a *different* win's photographs | Task 1 reviewer |
| 2 | A sibling-check snippet using a lazy capture | Defeated by ONE nested `<div>`; all four checks green on forbidden markup | Task 2 reviewer |
| 3 | Award controls need a `data-open-award-photos` path | The `data-gallery` path already existed; my attribute would have been read by nothing | Task 4 implementer |
| 4 | "17 records render the summary twice" | Honours render tiles, never a label — the real blast radius was 4 | Task 4 reviewer |
| 5 | `.cat`'s 310px is the removable block; move it to the aside | 310px was grid *stretch*; its content is 98px. Re-parenting changed the label by **0px** | Task 5 implementer |
| 6 | Spec's 150px picture band | 150px fails the 44×44 tap floor; 156px is the minimum | Task 5 implementer |
| 7 | Removing the in-room title frees 72px | The room is viewport-locked; the label height did not change at all | my own simulation |

**The unifying failure: a claim about the code standing in for a claim about its behaviour.** #4 and
#5 are the same subtype — a number about a *box* or a *data shape* treated as a number about *what
actually renders*.

---

## The single most useful finding

**Eleven instances of one defect class: a check that reports success while doing nothing, or a comment
explaining a success nobody verified.**

The worst was mine: Task 4's account checks compared only the **first 40 characters** of each
paragraph. A probe truncating all 39 paragraphs to 40 characters passed **57/0** — ninety percent of
the copy this build exists to display could have been missing with every check green.

Others: Task 3's positional `flushes[0]`; a no-op `requestAnimationFrame` that made a branch
unreachable; PowerShell `-replace` patterns that matched nothing (four mutants falsely "passed"); a
guard that did not pin the rule it named; the `partly-hidden` comment class; and **`tools/label-fit.mjs`
being structurally incapable of failing** — it compares `scrollHeight` to `clientHeight` on an element
with no `overflow`.

**Six of the eleven were introduced by tests or comments** — the parts of this codebase nothing was
checking. That is the concrete case for the review seat.

---

## What remains

### Task 6 — delete the Overview/Team/Awards dialogs
Brief is ready at `.superpowers/sdd/task-6-brief.md` and **carries a correction**: an earlier
amendment of mine mandated a `data-open-award-photos` path that must NOT be built. Awards already
work through `data-gallery="honors" data-entry="honors:N"` and the existing delegation. This task is
now much smaller than the plan says — mostly deleting `openModal()` and its branches.

### Task 7 — repair the geometry tools
The important one. `tools/label-fit.mjs` **cannot fail** and must be repaired to assert against the
**usable band** (below `.room-rail`, above `.dock`) and to fail on regressions. It must assert a
**documented shortfall** at 1280×704, not an impossible fit. Also stale and listed by line number in
its brief: four `.rail` regions in `ux-check.mjs` (two would *throw* on a null `querySelector`), the
modal-focus block (keep it, re-aim at the photo carousel), `.narr-text` at `:251` (silently *skips* the
only check for prose past its group), `.plan`, `[data-tab="awards"]` (now zero matches, will fail),
`tools/label-depth.mjs:70`, and `tools/wall-move.mjs:36`.

### Task 8 — docs and whole-suite pass
`README.md` sections that are now wrong: "Honours, and where an award lives", "The walk", the dials,
and the suite list (now nine).

### Deferred minors worth triaging
- `css/styles.css:170-171` — a redundant "fallback never consulted" clause.
- **No test pins the token comments.** Renaming `--label-measure` would silently widen three prose
  rules with every suite green. The one deferred item I would act on.
- `:has()` is the only selector newer than `:focus-visible`; verified safe, simpler precedent exists.
- `tests/renderer.test.mjs` `:567` splits on the raw `r.summary`, so a summary containing `&`/`<`/`"`
  would fail a correct renderer. Latent; data is frozen.
- The seven `ux-check` failures are stale assertions, not live defects.

---

## How to reproduce the numbers

```powershell
node tests/renderer.test.mjs          # 63 passed
npm test                              # nine suites, exit 0
node tools/serve.mjs 3333             # a server may already be on 3333
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
```

The clipping measurement is in `.superpowers/sdd/museum-label.md` and Task 5's report; it counts label
text elements against the **usable band** (below `.room-rail`'s bottom, above `.dock`'s top), because
measuring against the viewport's edges is wrong — both overlay the room.

**Note:** `.superpowers/` is gitignored scratch. `.superpowers/sdd/museum-label.md` is the full
ruling ledger with every decision's cost-if-wrong; it will not survive a `git clean -fdx`.
