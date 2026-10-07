# The Stand Beside Its Label — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-band stand — a 156px picture band with a full-width label beneath it — with a full-height wall on the left and a reading column on the right, so every stand fits the fold at both reference viewports and the photographs are several times larger.

**Architecture:** `.group` stops being a flex column of two bands and becomes a two-cell grid: the hang (`.cluster` of `.col`, dealt by `Site.hangLayout`) in the left cell, the exhibition label in the right cell. Both cells are full height, so the wall divides whatever the stand gives it instead of dividing a fixed 156px constant, and the label becomes one column of blocks instead of a two-area grid competing for the same row.

**Tech Stack:** Vanilla HTML, CSS custom properties, vanilla JS. No build step. `tests/` is an in-process DOM-stub suite; `tools/ux-check.mjs` drives headless Chrome over the DevTools Protocol and is the authority on layout, because the DOM stub models no CSS.

**Spec:** `docs/superpowers/specs/2026-10-07-stand-beside-label-design.md`

## Global Constraints

- No vertical scroll axis. The hall stays the document's only scroller and it stays horizontal; a room is exactly one viewport tall.
- Every frame clears 44×44 at 1440×900, at the 1280×704 floor, and at 390×844.
- No photograph is cropped or letterboxed: a frame's height is given and its width follows its own photograph's proportions.
- `--stand-w: clamp(1040px, 64vw, 1320px)` is unchanged; a stand is still `--stand-w` wide.
- The account's type floor is **11.5px**; at 1536×864 it resolves to 12.5px. No other block's size drops below what the site ships today (meta 10.5px, lead 13.5px, title 21px, awards 11.5px).
- `js/data.js` is not modified. The arrangements, the 3–6 piece budget and every record's copy already carry what this shape needs.
- No build step, no bundler, no package install. Lenis stays the only dependency.
- Reduced motion, keyboard access, modal focus containment and AA contrast are unchanged.

## Review Focus

- **A record whose account is longer than PALAD's.** Hivemind's is 1,369 characters against PALAD's 1,228, and it has no awards block to balance the column. The expected behaviour is that the whole account still lands above the dock; the failure is a silently clipped last paragraph, which no assertion catches unless the label's own content height is compared to its cell.
- **A hang whose natural width exceeds its wall cell.** A `three-across` arrangement of wide photographs in a wall narrowed by `--label-col` is the expected first failure. Expected behaviour: the wall clips at its own cell and no frame paints over the neighbouring stand. The failure is a frame the visitor cannot see at all.
- **A photograph whose bytes have not arrived.** Every frame carries `loading="lazy"`, so a frame the walk has not reached has no intrinsic width. Expected behaviour: the frame holds open above the 44px tap floor. The failure is a sliver that pops open on load, which `ux-check` only sees when it forces loading — and a sliver is below the floor in the meantime.
- **The Leadership stands, whose labels are almost pure catalogue** (45–86 characters of account, 3–4 frames). Expected behaviour: the label's blocks do not stretch to fill 622px, leaving the catalogue floating in the middle of the column. The failure is cosmetic but it is the shape most records have.
- **A viewport between the two reference sizes** (e.g. 1600×1000, 1920×1080). `--label-col` is a `vw` share, so both cells scale. Expected behaviour: the fold holds at every width above the floor, not only at the two that are asserted.

---

### Task 1: Record the failure the work exists to fix

**Files:**
- Create: `docs/superpowers/reports/2026-10-07-stand-baseline.md`
- Uses: `tools/serve.mjs`, `tools/rooms.mjs`, `tools/label-fit.mjs`, `tools/avg-frame.mjs`, `tools/ux-check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: a committed baseline of the four numbers Task 6 and Task 8 are judged against — the stand's bottom against the dock at both viewports, the count of clipped catalogue entries, the count of cross-group frame overlaps, and photograph area per screen. Nothing in later tasks reads this file; it is the evidence that the later work moved the numbers.

- [ ] **Step 1: Start the two servers the probes need**

```powershell
# terminal 1
node tools/serve.mjs 3333
# terminal 2 — headless Chrome needs Mojo named pipes, so run it unconfined
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank
```

- [ ] **Step 2: Capture the baseline numbers**

```powershell
node tools/rooms.mjs 1280 704
node tools/rooms.mjs 1536 864
node tools/label-fit.mjs 1536 864
node tools/avg-frame.mjs 1536 864
node tools/ux-check.mjs   # expect: FAIL, and the failing lines are the baseline
```

- [ ] **Step 3: Write the baseline report**

Record, verbatim from the output above, for each of `1280x704` and `1536x864`:

- every stand's `lastBottom` against `dockTop` (the failure is `lastBottom > dockTop`);
- `titleTop` for every room (the failure is `titleTop < 0`);
- from `label-fit.mjs`, `clippedLabels` and `overlaps`;
- from `avg-frame.mjs`, `areaPerScreenAcrossWalk` and the Robotics room's `areaPerScreen`;
- `ux-check.mjs`'s failing check names.

State the measured baseline this spec already carries: PALAD's stand ends at 737 against a 621px dock top at the floor (over by 116px) and its room title is drawn at y = −14.7 at 1536×864.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/reports/2026-10-07-stand-baseline.md
git commit -m "docs: record the stand-layout baseline the two-cell shape is measured against"
```

---

### Task 2: Pin the new geometry in the browser suite, and watch it fail

**Files:**
- Modify: `tools/ux-check.mjs` (the `The deepest hang stays inside the room` section at ~line 562, and the `no room overflows the fold at 1280x704` check at ~line 380)
- Reads: `docs/superpowers/specs/2026-10-07-stand-beside-label-design.md` §5.4 for the values

**Interfaces:**
- Consumes: nothing.
- Produces: three named checks that Task 3 through Task 6 must turn green. Their names are fixed here because Tasks 4–6 cite them: `the wall cell and the label cell do not overlap`, `no stand's room title is drawn above the viewport`, `the label's own content fits its cell`.

- [ ] **Step 1: Add the two-cell assertions**

In `tools/ux-check.mjs`, inside the `The deepest hang stays inside the room` section, after the existing `every frame clears 44x44` check, add a block that runs for each of `[1440, 900]` and `[1280, 704]` and asserts:

```js
const cells = await evaluate(`(() => {
  const out = { overlap: [], titleAbove: [], labelOver: [] };
  const dockTop = document.querySelector('.dock').getBoundingClientRect().top;
  document.querySelectorAll('#strip .group').forEach(g => {
    const wall = g.querySelector('.cluster'), label = g.querySelector('.label');
    if (!wall || !label) return;
    const id = g.closest('.room').getAttribute('data-room') + ':' + g.dataset.entry;
    const a = wall.getBoundingClientRect(), b = label.getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    if (w > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.overlap.push(id + ' by ' + Math.round(w));
    /* The label's own content against the cell it was given: the fault that
       clipping the catalogue's entries only shows once they are gone. */
    if (label.scrollHeight > label.clientHeight + 1) out.labelOver.push(id + ' ' + label.scrollHeight + ' in ' + label.clientHeight);
    const t = g.closest('.room').querySelector('.room-title');
    if (t && t.getBoundingClientRect().top < 0) out.titleAbove.push(id);
  });
  return out;
})()`);
check('the wall cell and the label cell do not overlap', cells.overlap.length === 0, cells.overlap.join('; '));
check('no stand\'s room title is drawn above the viewport', cells.titleAbove.length === 0, cells.titleAbove.join('; '));
check('the label\'s own content fits its cell', cells.labelOver.length === 0, cells.labelOver.join('; '));
```

- [ ] **Step 2: Run the suite and confirm the new checks fail**

Run: `node tools/ux-check.mjs`
Expected: FAIL. `the wall cell and the label cell do not overlap` reports no failures yet (the current flex column stacks them, so they cannot overlap) — that check is the guard against this work's own regression, and it passing now is correct. `no stand's room title is drawn above the viewport` must FAIL with `Robotics:Robotics:0`. `the label's own content fits its cell` must FAIL with at least `Robotics:Robotics:0`.

If `no stand's room title is drawn above the viewport` passes, stop: the baseline in Task 1 disagrees with the running build, and the discrepancy is the bug to understand before changing any CSS.

- [ ] **Step 3: Commit**

```bash
git add tools/ux-check.mjs
git commit -m "test: pin the two-cell stand geometry in the browser suite"
```

---

### Task 3: The stand becomes two full-height cells

**Files:**
- Modify: `css/styles.css` — the `--band-h` / `--frame-h` declarations (lines ~190–212), `.group` (~line 2103), `.cluster` (~line 2144), `.col` (~line 2168), `.label` (~line 2345)
- Test: `tools/ux-check.mjs`

**Interfaces:**
- Consumes: the checks from Task 2.
- Produces: `--label-col: clamp(420px, 40vw, 620px)`, a new token later tasks and the probes read; `.group` as `display: grid` with `grid-template-columns: minmax(0, 1fr) var(--label-col)`; `.cluster { height: 100% }`.

- [ ] **Step 1: Replace the band tokens**

In `css/styles.css`'s `:root`, delete `--band-h: 156px;` and `--frame-h: clamp(96px, 11vh, 140px);` with their comment blocks, and add in their place:

```css
  /* ── The stand's shape, the only two numbers in it ────────────────────
     A stand is a row of two full-height cells: the hang, and the label that
     reads it. This replaces a column of two stacked bands — a picture band
     fixed at 156px and a full-width label beneath it — which measured 765.7px
     inside a 724px band at 1536x864 (title drawn at y = -14.7, last award
     under the dock) and 116px over the dock at the spec's 1280x704 floor.

     The old --band-h was a FIXED height because it was sized to a different
     constraint: the deepest arrangement is a 3-row column, and 156px was the
     smallest band in which three frames and their two gaps still left each
     frame above the 44x44 tap floor. That constraint belongs to a column, and
     a column now divides the STAND: at the floor the stand's band is 466px, so
     a 3-row column gives 148px frames — three times the tap floor. The
     constant and its argument retire together.

     --label-col is a VIEWPORT share rather than a fixed width, so the
     proportion survives every supported screen: 614px at 1536 (588px of inner
     measure), 512px at 1280 (486px). The wall takes what is left. */
  --label-col:   clamp(420px, 40vw, 620px);
  --group-col-gap: clamp(24px, 2.2vw, 40px);
```

- [ ] **Step 2: Make `.group` a two-cell grid**

Replace `.group`'s rule body: drop `flex-direction: column` and `gap: 10px`, and set

```css
.group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--label-col);
  column-gap: var(--group-col-gap);
  align-items: stretch;
  width: var(--stand-w);
  max-width: var(--stand-w);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
```

Keep `overflow: hidden` and its existing comment: it is what stops a hang wider than its wall painting over the neighbouring exhibit.

- [ ] **Step 3: Give the wall and its columns the stand's height**

```css
.cluster { height: 100%; align-items: stretch; }
.col     { height: 100%; }
```

`.col` keeps `align-items: flex-start` (load-bearing: a stretched column draws the widest frame's width around every photograph in it) and `min-height: 0` (what allows `flex: 1 1 0` on `.piece` to divide instead of stack).

- [ ] **Step 4: Collapse `.label` to one column**

Replace the grid-areas declaration with a single-column flow that is the cell's full height:

```css
.label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border-top: 1px solid var(--edge);
  padding-top: 0;
}
```

- [ ] **Step 5: Run the suite**

Run: `node tools/ux-check.mjs`
Expected: the fold checks at both viewports turn green, and `the wall cell and the label cell do not overlap` stays green. `no stand's room title is drawn above the viewport` may still fail — the label has its width but its blocks have not been re-flowed yet; that is Task 5.

Also run `node tests/shell-check.mjs`; it asserts the palette and hard constraints statically and must still pass.

- [ ] **Step 6: Commit**

```bash
git add css/styles.css
git commit -m "feat: make the stand a row of two full-height cells"
```

---

### Task 4: The wall divides the stand, not a constant

**Files:**
- Modify: `css/styles.css` — `.piece` (~line 2189), `.piece--pending` (~line 2268), `.piece img` (~line 2279)
- Test: `tools/ux-check.mjs`

**Interfaces:**
- Consumes: `.cluster { height: 100% }` and `.col { height: 100% }` from Task 3.
- Produces: nothing new. This task makes the existing division property true of the new dividend.

- [ ] **Step 1: Re-base the frame's loading floor**

Delete `.piece { min-width: calc(var(--band-h) / 4); }` and put the floor on `.piece` with `.piece img`:

```css
/* A photograph is fetched when the walk reaches it, so a frame can be on
   screen before its bytes are. With the height coming from the column and the
   width following the photograph, an unloaded frame collapses to the frame and
   the mat alone. These two floors hold it open above the 44px tap target.

   44 on the frame and 32 on the image: the frame is the image plus its 6px mat
   and the piece's 3px gilt edge either side, so 32 + 12 + 6 = 50, and the
   matted interior is 44. Measured at the 1280x704 floor, where the deepest
   column gives 148px frames and the floor never binds; the floor is for the
   frame that has not loaded, not for the one that has. */
.piece     { min-width: 44px; }
.piece img { min-width: 32px; }
```

- [ ] **Step 2: Confirm the division is still flexbox, not arithmetic**

Read `.piece { flex: 1 1 0; min-height: 0; }` and `.col { gap: var(--col-gap); }`. Both stay exactly as they are. Do not add a `calc((band - gaps) / rows)` re-derivation: the header of `css/styles.css` records that a divisor written on the DOM and re-derived in the stylesheet is how the two drift apart.

- [ ] **Step 3: Run the tap-floor and deepest-hang checks**

Run: `node tools/ux-check.mjs`
Expected: `every frame clears 44x44 at 1440x900`, `every frame clears 44x44 at 1280x704` and `the deepest hang clears the dock band at ...` all PASS, with the reported minimum frame meaningfully larger than at baseline (Task 1's report has the baseline minimum).

- [ ] **Step 4: Pin the loading floor, which every other check measures without loading**

Every frame carries `loading="lazy"`, and `ux-check`'s existing frame checks force every image to load before measuring — so the floor is never what they see. It is what a visitor sees for the half-second before the bytes arrive, and it is the floor this task just re-based. Add to the deepest-hang section, in its own `goto(BASE)` before the force-loading step of that section:

```js
/* Measured BEFORE the forced load: an unloaded frame's width is the loading
   floor, and a floor under 44 is a tap target that is not there yet. */
const unloaded = await evaluate(`(() => {
  const out = { minW: Infinity, minH: Infinity, n: 0 };
  document.querySelectorAll('#strip .group .piece').forEach(p => {
    const r = p.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    out.n++; out.minW = Math.min(out.minW, r.width); out.minH = Math.min(out.minH, r.height);
  });
  return out;
})()`);
check('an unloaded frame still clears the tap floor at ' + w + 'x' + h,
      unloaded.n > 0 && unloaded.minW >= 44 && unloaded.minH >= 44,
      JSON.stringify(unloaded));
```

- [ ] **Step 5: Measure how much bigger the pictures got**

Run: `node tools/avg-frame.mjs 1536 864`
Expected: `areaPerScreenAcrossWalk` above 120,000, against the 40,560 in Task 1's baseline. If it is below 100,000 the wall is not dividing the stand — re-read Step 1 of Task 3 before touching anything else.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css
git commit -m "feat: divide the stand's full height between a column's frames"
```

---

### Task 5: The label becomes a reading column

**Files:**
- Modify: `css/styles.css` — `.label-copy`, `.label-aside`, `.cat`, `.narr-lead`, `.label-account`, `.acct-p`, `.awards`, `.award`, `.cat-entry`
- Test: `tools/ux-check.mjs`, `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: `.label` as a full-height single column from Task 3.
- Produces: nothing new. `.label-copy` and `.label-aside` stop being grid areas; `js/main.js` is untouched, so every block the renderer emits must still have a home.

- [ ] **Step 1: Confirm the renderer emits what the column needs**

Run: `node tests/renderer.test.mjs`
Expected: PASS. This suite asserts the rendered DOM contract — one label per group, one catalogue entry per photograph, no entry for an awaited frame. It must keep passing unchanged: this task re-parents blocks, it does not re-derive them. If it fails, stop and reconcile before editing CSS.

- [ ] **Step 2: Set the account's type floor**

```css
/* ── The account's floor is 11.5px, and that is a measured trade ────────
   The label is one column beside the hang rather than the stand's full width,
   so the account has a narrower measure than it did — and a narrower measure
   costs lines, which cost height, which is what the fold is spent on. PALAD's
   1,228-character account fits its cell at 11.5px and does not at 13px.
   Resolved: 12.5px at 1536x864, 11.5px at the 1280x704 floor.

   This is the ONE size in the label that moves, and it moves for the account
   only: the title stays 21px, the lead 13.5px, the meta 10.5px, the awards
   11.5px. The old comment here recorded 13px as the legibility floor; the floor
   is now 11.5px, and the reason is this cell's width rather than a preference. */
.label-account { font-size: clamp(11.5px, 0.78vw, 12.5px); min-width: 0; }
.acct-p        { font-size: inherit; line-height: 1.42; color: var(--text); margin: 0 0 .62em; }
```

- [ ] **Step 3: Lay the label's blocks out in one column**

Delete the `.label-copy { grid-area: copy }` / `.label-aside { grid-area: aside }` / `.cat { grid-area: cat }` rules. The blocks the renderer emits are `.narr`, `.label-account`, `.awards`, `.cat` and the team line; in a flex column they flow in that order with no further rule.

Tighten the two blocks that sit at the foot, because the label's height is now the fold:

```css
.awards          { margin-top: 9px; }
.award           { min-height: 28px; padding: 3px 0 3px 8px; }
.award-list      { gap: 4px; }
.cat-entry       { padding: 4px 0; }
.cat-note        { margin-top: 6px; }
```

The `44px` in `.award`'s `min-height` comment is about the tap target. Check it still holds: `.award-open` is the control, and the row's own `min-height` is what carried the floor. If `ux-check`'s 390×844 tap-target section fails after this, restore `min-height: 44px` on `.award-open` specifically rather than on every row.

- [ ] **Step 4: Cap the lead at the column's measure**

```css
.narr-lead { max-width: 72ch; }
```

`--label-measure` retires: the account's cap is its own cell. Delete the token and its note if nothing else reads it (check with a grep for `--label-measure` first).

- [ ] **Step 5: Run the suites**

Run: `node tests/renderer.test.mjs` and `node tools/ux-check.mjs`
Expected: both PASS, including `the label's own content fits its cell` and `no stand's room title is drawn above the viewport` from Task 2 — both of which were failing at the end of Task 3.

- [ ] **Step 6: Check the two worst records by hand**

Open the site, walk to **Applications / Hivemind** (1,369 characters of account, no awards block) and to **Applications / BiyaHey!** (1,324 characters, three awards) at 1280×704. Both accounts must be fully visible above the dock. This is the Review Focus item no assertion covers on its own: the account's own height against its cell.

- [ ] **Step 7: Commit**

```bash
git add css/styles.css
git commit -m "feat: re-flow the label into a reading column beside the hang"
```

---

### Task 6: Re-point the geometry probes

**Files:**
- Modify: `tools/stand-fit.mjs`, `tools/label-fit.mjs`, `tools/widths.mjs`, `tools/pieces.mjs`
- Read: `tools/rooms.mjs` (no change expected; `.group` height and the deepest column are what it already prints)

**Interfaces:**
- Consumes: `--label-col` from Task 3.
- Produces: probes that report the new shape, so Tasks 7 and 8 measure the right thing.

- [ ] **Step 1: Find every probe that resolves a retired token**

```powershell
Select-String -Path tools\*.mjs -Pattern "band-h|frame-h|max-panel-h|label-w|label-measure"
```

- [ ] **Step 2: Re-point each hit**

For each file the search names: replace the retired token with `--label-col` where the probe means the label's width, and delete the resolution where the probe means a constant that no longer exists. `stand-fit.mjs`'s `impliedBand` — "the band the room's own furniture implies, which is the number `--band-h` has to beat" — has no job left; replace it with the stand's own band (the group's height minus the room's padding) and the wall cell's resolved width. `label-fit.mjs`'s `overlaps` check is the one that found this work's third fault; keep it and add the wall-vs-label overlap from Task 2.

- [ ] **Step 3: Run every probe at both viewports**

```powershell
node tools/rooms.mjs 1440 900
node tools/rooms.mjs 1280 704
node tools/stand-fit.mjs 1536 864
node tools/label-fit.mjs 1536 864
node tools/widths.mjs 1536 864
node tools/avg-frame.mjs 1536 864
```

Expected: every probe runs without a `ReferenceError`, resolves `--label-col` to a number, and reports `clippedLabels: []` and `overlaps: []` at 1536×864.

- [ ] **Step 4: Commit**

```bash
git add tools/
git commit -m "tools: re-point the geometry probes at the two-cell stand"
```

---

### Task 7: Check the widths the wall actually gets

**Files:**
- Modify: `js/data.js` — `HANG_LAYOUTS` or `hangLayout` (only if this task's measurement requires it)
- Test: `tests/hang.test.mjs`, `tools/ux-check.mjs`

**Interfaces:**
- Consumes: `--label-col` from Task 3 and the re-pointed probes from Task 6.
- Produces: possibly a re-ordered arrangement set. `Site.hangLayout(key, count)` keeps its exact signature either way.

This is the spec's one open risk (§6): the wall is narrower than `--stand-w`, so a hang that fitted the stand before may not fit its cell. `overflow: hidden` stops it spilling, so the failure is a clipped frame rather than a broken wall — but a clipped frame is a photograph the visitor cannot see.

- [ ] **Step 1: Measure every hang against its own wall**

Run: `node tools/widths.mjs 1536 864` and again at `1280 704`. For every group, compare the cluster's natural width to the wall cell's width.

Expected outcome, and the reason this task exists: at least one `three-across` or `two-two` group overflows its cell. Record which.

- [ ] **Step 2: If nothing overflows, prove it and skip to Step 5**

Add the assertion rather than changing the data: in `tools/ux-check.mjs`'s deepest-hang section, assert for every group that `cluster.getBoundingClientRect().width <= wall.clientWidth + 1`. Name it `no hang is wider than its wall`. This is the regression guard either way; Task 8's branch review needs it.

- [ ] **Step 3: If something overflows, re-order the arrangements for that count**

In `js/data.js`'s `HANG_LAYOUTS`, move the narrowest arrangement for the offending count to the front. A `column-N` layout is a single column, so its wall width is its widest single frame rather than the sum of a row. Do **not** change `hangLayout`'s selection rule, and do **not** change `MIN_PIECES` / `MAX_PIECES`.

- [ ] **Step 4: Re-run the suites**

Run: `npm test` and `node tools/ux-check.mjs`
Expected: both PASS, including `no hang is wider than its wall` and the arrangement-distribution check in `tests/hang.test.mjs` (the portfolio must not collapse onto a single arrangement).

- [ ] **Step 5: Check a stand whose label is almost pure catalogue**

The Leadership stands carry 45–86 characters of account and 3–4 frames, so their labels are a title, a catalogue and almost nothing else — the shape most records have, and the one no assertion describes. At 1536×864, open **Leadership** and walk its four stands. Expected: the catalogue sits directly under the title rather than floating in the middle of a 622px column, and the wall's frames fill the stand's height. If the catalogue floats, the label needs `justify-content: flex-start` rather than the default stretch — fix it here and re-run Step 4.

- [ ] **Step 6: Commit**

```bash
git add js/data.js tools/ux-check.mjs
git commit -m "fix: keep every hang inside the wall its stand now gives it"
```

---

### Task 8: Rewrite the documentation and take the final measurement

**Files:**
- Modify: `README.md` — §"The walk", §"The stand", §"Structure", the tools table
- Create: `docs/superpowers/reports/2026-10-07-stand-after.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the shipped record.

- [ ] **Step 1: Rewrite the README's stand section**

`README.md` describes the two-band stand and the fixed band throughout: "The label takes whatever is left", the `--band-h` / `--max-panel-h` dials, "the label is the stand's full width now". Every one of those sentences is now false. Rewrite §"The walk" and §"The stand" to describe the two-cell stand, the account's 11.5px floor and why it is lower than the rest of the label, and the fact that a column now divides the stand rather than a constant.

- [ ] **Step 2: Run the full verification**

```powershell
npm test
node tools/ux-check.mjs
node tools/avg-frame.mjs 1536 864
node tools/avg-frame.mjs 1280 704
```

Expected: `npm test` fully green; `ux-check` fully green including the three checks Task 2 added and `no hang is wider than its wall`.

- [ ] **Step 3: Measure the improvement, and the cost**

Capture the same four numbers Task 1 captured, at the same two viewports, and write `docs/superpowers/reports/2026-10-07-stand-after.md` with a before/after table. It must state the measured `areaPerScreenAcrossWalk` against the baseline 40,560, and it must state the account's resolved font size at each viewport — the one number in the change that got worse for the visitor.

- [ ] **Step 4: Check the intermediate widths**

Open the site at 1600×1000 and at 1920×1080 and walk every room. Both reference viewports are asserted; these two are not, and `--label-col` is a `vw` share, so they are where a proportion that works at 1280 and 1536 breaks. Expected: no stand crosses the dock and no frame is clipped. Record what you saw in the report.

- [ ] **Step 5: Prove the proportion holds across the range, not only at two points**

A `vw` share is exactly the kind of rule that works at the viewports someone looked at. Add the sweep to `tools/ux-check.mjs`'s deepest-hang section, reusing the `cells` probe from Task 2:

```js
/* The two reference viewports are the ones the spec names; a vw share has to
   hold between them too, so this walks the range rather than the endpoints. */
for (const [w, h] of [[1024, 768], [1600, 1000], [1920, 1080], [2560, 1440]]) {
  await setViewport(w, h, false);
  await goto(BASE);
  const cells = await evaluate(/* the Task 2 cells probe, verbatim */);
  check('no stand overflows the fold at ' + w + 'x' + h,
        cells.overlap.length === 0 && cells.labelOver.length === 0 && cells.titleAbove.length === 0,
        [...cells.overlap, ...cells.labelOver, ...cells.titleAbove].join('; '));
}
```

Run it and record every width that fails in the report. A width that fails here is a real report item, not a reason to widen the loop.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/superpowers/reports/2026-10-07-stand-after.md
git commit -m "docs: describe the two-cell stand and record what it measured"
```
