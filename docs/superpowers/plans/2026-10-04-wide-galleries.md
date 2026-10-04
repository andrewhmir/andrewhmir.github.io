# Wide Galleries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a gallery be as wide as its own contents, so one Honours gallery carries all thirteen honours, the frames grow into the height a single row frees, and every group hangs a varied 3–6 frame composition.

**Architecture:** The room's width becomes `max-content` with a `100vw` floor and `.groups` becomes one flex row instead of a 2×2 grid. Group composition moves from a fixed lead-and-stack inside a container query to an **arrangement** — a partition of a group's photographs into columns — dealt deterministically from the group's own key by a pure function in `js/data.js`. Frame heights come from viewport-height clamps rather than from the cell's width, because a single row's binding constraint is vertical.

**Tech Stack:** Vanilla HTML/CSS/JS, classic `<script>` tags, no build step. Lenis 1.3.26 (vendored) stays the only dependency. Node 22+ for the in-process unit suites; headless Chrome over the DevTools Protocol for the browser suite.

**Spec:** `docs/superpowers/specs/2026-10-04-wide-galleries-design.md`

## Global Constraints

- **No build step.** Every script loads with a classic `<script src>` tag. No bundler, no transpiler, no CDN at runtime.
- **Lenis 1.3.26 stays the only dependency**, vendored in `js/vendor/` and pinned by size and SHA-256.
- **Classic-script convention:** each JS file wraps in an IIFE and exports through `globalThis.Site`. A bare top-level `const` collides between files.
- **Colour tokens, exact:** `--night: #0d0c0b`, `--room: #131211`, `--room-warm: #171513`, `--text: #e8dcc6`, `--text-strong: #f6efe0`, `--text-quiet: #8c8375`, `--accent: #c9a45c`. There is no third text tier. Border radius is zero everywhere.
- **One axis only.** `#hall` is the document's only scroller. A room is exactly one viewport tall — `height: 100%` inside the hall, no `100vh` of its own, no vertical overflow.
- **Never write an inherited custom property on a large subtree per frame.** Register with `@property { inherits: false }` and write to the few elements that read it.
- **Reduced motion** leaves every piece fully lit with no transition; Lenis's `respectReducedMotion` stays on.
- **Touch targets ≥ 44×44** at 390×844.
- **Room titles, exactly:** About · Works in Robotics · Works in Applications · Leadership · Honours · Contact.
- **The hang's exact values** (from the spec §6.1–6.2): `--lead-h: clamp(120px, 18vh, 165px)`, `--sup-h: clamp(76px, 11vh, 102px)`, `--col-gap: clamp(6px, 1.1vh, 10px)`, `--cluster-gap: 12px`, `--label-w: clamp(220px, 20vw, 300px)`, `--group-gap: 20px`.
- **The photograph budget:** floor 3, ceiling 6.
- **Where to run commands:** `node --test` cannot spawn a child process under the confined sandbox. Every unit suite uses the in-process runner `tests/harness.mjs`, run as `node tests/<name>.mjs`.
- **The browser suite cannot run confined.** `tools/ux-check.mjs` and the geometry probes need headless Chrome, which needs Mojo named pipes, which this sandbox forbids. They run with the sandbox off, or as one escalated command. Never claim a green browser run that was not observed.

## Review Focus

The spec implies these inputs and conditions; no task's happy path exercises them, and each is the kind of thing that looks fine until someone hits it. Each is pinned by a test in the task named beside it.

1. **A record declaring more than six photographs** — must hang the first six and stop, not push its gallery past the fold or clip the sixth's label. (Task 1.)
2. **A record whose `images` literally names the placeholder file** (the SATLearn team still does) — must draw the empty frame and be counted as awaited in the catalogue, not rendered as a photograph named "PlaceHolder". (Tasks 1 and 4.)
3. **A group whose photographs are all awaited** (six honours today) — must still render a full three-frame hang with a plan, a narrative and an awaited note, not an empty cluster, a missing catalogue or a throw. (Tasks 3 and 4.)
4. **A count outside 3–6, a non-numeric count, or a key that is not a string** — `hangLayout` must be total and fall back to a single column rather than throwing or returning nothing. (Task 2.)
5. **A gallery narrower than one screen, or holding no groups** — must still be exactly one screen wide, and an empty part must render no room at all rather than an empty wall. (The width floor is set in Task 3 and measured at both reference viewports in Task 7; the empty part is pinned in Task 6.)
6. **An ultra-wide photograph (2:1)** — its cluster must widen the group, never squeeze the label to nothing and never spill into the neighbouring exhibit. (Task 7's browser check.)

---

## File Structure

| File | Responsibility |
|---|---|
| `js/data.js` | Content, plus the derived layer: rooms, the photograph budget, the arrangements, the honours partition |
| `js/main.js` | Renderers (group, cluster, label, catalogue, plan), the walk, the dock, the dialog |
| `css/styles.css` | Tokens, the gallery's width model, the hang, the label, the dock |
| `tests/hang.test.mjs` | **New.** The photograph budget and the arrangements — pure, no DOM |
| `tests/derive-rooms.test.mjs` | Rooms, group pieces, the honours partition |
| `tests/renderer.test.mjs` | The rendered DOM contract, under a DOM stub |
| `tests/delegation.test.mjs` | Every control in the walk does something |
| `tests/shell-check.mjs` | Markup, palette and the hard constraints, statically |
| `tools/ux-check.mjs` | The authority on layout — headless Chrome |
| `tools/rooms.mjs`, `widths.mjs`, `pieces.mjs` | Geometry probes |
| `package.json`, `README.md`, `tools/README.md` | The suite list and the documented model |

Tasks 1–2 are pure data and change nothing visible. **Task 3 is where the layout changes**, and until it lands the walk's layout is expected to be wrong at 3–6 frames per group — the unit suites stay green throughout, because the DOM stub models no CSS.

---

### Task 1: The photograph budget

**Files:**
- Modify: `js/data.js` (the `groupPieces` section, near line 301)
- Create: `tests/hang.test.mjs`
- Modify: `tests/derive-rooms.test.mjs:61-90`
- Modify: `package.json:6` (the `test` script)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Site.MIN_PIECES === 3`, `Site.MAX_PIECES === 6`, and `Site.groupPieces(record, kind) -> Piece[]` where `Piece = { src: string, awaited: boolean }` and the length is between `MIN_PIECES` and `MAX_PIECES` for any non-null record, `[]` for a null one. `Site.PLACEHOLDER` is unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/hang.test.mjs`:

```js
/* The photograph budget and the arrangements.
   Both are pure: they decide what hangs and how, with no DOM and no CSS, so
   they are pinned here rather than in the renderer's stub. */
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { groupPieces, MIN_PIECES, MAX_PIECES, PLACEHOLDER } = globalThis.Site;

check('a group hangs at least three frames', () => {
  assert.equal(groupPieces({ description: 'x', images: ['a.jpg'] }, 'record').length, MIN_PIECES);
  assert.equal(groupPieces({ description: 'x' }, 'record').length, MIN_PIECES);
  assert.equal(groupPieces({ id: 'p' }, 'project').length, MIN_PIECES);
});

check('a null record yields no pieces rather than throwing', () => {
  assert.deepEqual(groupPieces(null, 'record'), []);
  assert.deepEqual(groupPieces(undefined, 'project'), []);
});

check('padding is appended, so the lead is a real photograph', () => {
  const pieces = groupPieces({ images: ['a.jpg', 'b.jpg'] }, 'record');
  assert.deepEqual(pieces.map((p) => p.src), ['a.jpg', 'b.jpg', PLACEHOLDER]);
  assert.deepEqual(pieces.map((p) => p.awaited), [false, false, true]);
});

check('a record past six photographs hangs the first six', () => {
  const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((n) => n + '.jpg');
  const pieces = groupPieces({ images: eight }, 'record');
  assert.equal(pieces.length, MAX_PIECES);
  assert.deepEqual(pieces.map((p) => p.src), eight.slice(0, MAX_PIECES));
});

check('a record whose image is the placeholder is awaited, not named after its file', () => {
  const pieces = groupPieces({ images: [PLACEHOLDER] }, 'record');
  assert.equal(pieces[0].awaited, true);
  assert.equal(pieces[0].src, PLACEHOLDER);
});

check('every shipped record hangs between the floor and the ceiling', () => {
  const P = globalThis.PORTFOLIO;
  const all = [
    ...P.projects.map((p) => [p, 'project']),
    ...P.leadership.map((l) => [l, 'record']),
    ...P.honors.map((h) => [h, 'record']),
  ];
  const bad = all
    .map(([rec, kind]) => ({ name: rec.title || rec.description, n: groupPieces(rec, kind).length }))
    .filter(({ n }) => n < MIN_PIECES || n > MAX_PIECES);
  assert.deepEqual(bad, [], 'outside the budget: ' + JSON.stringify(bad));
});

run();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/hang.test.mjs`
Expected: FAIL — `a group hangs at least three frames`, because `groupPieces` currently returns one piece for a one-photograph record.

- [ ] **Step 3: Implement the budget in `js/data.js`**

Replace the body of `groupPieces` so it computes a list of sources and then fits them. Two helpers above it:

```js
var MIN_PIECES = 3;
var MAX_PIECES = 6;

/* A piece is a frame plus whether its photograph has arrived. Resolving
   `awaited` here, once, is what stops every call site from re-deriving it by
   matching the placeholder path. */
function asPiece(src) { return { src: src, awaited: src === PLACEHOLDER }; }

/* The budget. Padding is appended rather than interleaved, so a group's lead
   frame is a real photograph whenever the record has one. */
function fitPieces(srcs) {
  var out = srcs.slice(0, MAX_PIECES).map(asPiece);
  while (out.length < MIN_PIECES) out.push(asPiece(PLACEHOLDER));
  return out;
}
```

`groupPieces(record, kind)` keeps its existing early return for a null record (`[]`, unfitted — a non-existent record hangs nothing), then returns `fitPieces(srcs)` for each of the three existing branches: a project's overview and team images, a project's poster-frame fallback, and a record's `images` (or `[PLACEHOLDER]` when it declares none).

Publish `globalThis.Site.MIN_PIECES = MIN_PIECES;` and `globalThis.Site.MAX_PIECES = MAX_PIECES;` beside the existing `PLACEHOLDER` export.

- [ ] **Step 4: Run it to verify it passes**

Run: `node tests/hang.test.mjs`
Expected: `6 passed, 0 failed`

- [ ] **Step 5: Update the assertions in `derive-rooms.test.mjs` that pin the old lengths**

Four checks in `tests/derive-rooms.test.mjs` now describe a budget that no longer exists:

- `a project yields its overview and its team image` (line 65) — expected sources become `['files/o.jpg', 'files/t.jpg', 'files/PlaceHolder.png']`.
- `a project with no still at all falls back to its poster frame` (line 73) — expected becomes `['files/posters/Thing.jpg', PLACEHOLDER, PLACEHOLDER]`.
- `a project with neither image nor video hangs the placeholder` (line 78) — expected becomes three placeholders.
- `every real record yields at least one piece` (line 87) — the floor assertion becomes `pieces.length >= MIN_PIECES`, and `pieces.forEach(p => assert.ok(p.src))` stays.

Rename the fourth to `every real record hangs within the budget`.

- [ ] **Step 6: Update the two renderer checks the budget falsifies**

`tests/renderer.test.mjs` has two checks that assert a group can hang exactly one frame, which the floor makes impossible. In this task they are corrected rather than replaced — Task 3 replaces them properly once the arrangement markup exists.

Replace `every group hangs at least one piece` (line 140):

```js
check('every group hangs between three and six frames', () => {
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const n = (body.match(/class="piece/g) || []).length;
    if (n < Site.MIN_PIECES || n > Site.MAX_PIECES) bad.push('group ' + i + ': ' + n + ' frames');
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});
```

Delete `a single-piece group hangs its piece tall` (line 162) outright: the lead-height rendering it describes is still correct, but nothing hangs a lone frame any more, so there is no group left for it to check. Task 3 adds the lead check that replaces it.

In `the plan draws one rectangle per photograph` (line 274), the trailing assertion `assert.equal(single.length, 1)` becomes `assert.equal(single.length, Site.MIN_PIECES)`.

- [ ] **Step 7: Add the suite to `package.json`**

In the `test` script, run `tests/hang.test.mjs` immediately after `tests/derive-rooms.test.mjs`, so the pure data suites run before the DOM ones.

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: every suite green. With Steps 5 and 6 done, the renderer suite passes even though the renderer itself has not changed: `renderGroupLabel` already maps `pieces` down to their `src` before handing them to `renderLabel`.

- [ ] **Step 9: Commit**

```bash
git add js/data.js tests/hang.test.mjs tests/derive-rooms.test.mjs tests/renderer.test.mjs package.json
git commit -m "feat(gallery): give every group a three-to-six photograph budget"
```

---

### Task 2: The hang arrangements

**Files:**
- Modify: `js/data.js` (a new section after the group-pieces section)
- Modify: `tests/hang.test.mjs`

**Interfaces:**
- Consumes: `Site.groupPieces` (Task 1) for the distribution check only.
- Produces: `Site.HANG_LAYOUTS` — `{ 3: Layout[], 4: Layout[], 5: Layout[], 6: Layout[] }` — and `Site.hangLayout(key, count) -> Layout`, where `Layout = { name: string, columns: number[][], lead: number, drop: number[] }`.

- [ ] **Step 1: Write the failing test**

Append to `tests/hang.test.mjs`, above `run()`:

```js
const { HANG_LAYOUTS, hangLayout } = globalThis.Site;

check('every count from the floor to the ceiling has an arrangement', () => {
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    assert.ok(Array.isArray(HANG_LAYOUTS[n]) && HANG_LAYOUTS[n].length >= 1,
      'no arrangement for ' + n + ' photographs');
  }
});

check('every arrangement covers its pieces exactly once', () => {
  const bad = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    HANG_LAYOUTS[n].forEach((l) => {
      const flat = l.columns.flat().slice().sort((a, b) => a - b);
      const want = Array.from({ length: n }, (_, i) => i);
      if (JSON.stringify(flat) !== JSON.stringify(want)) bad.push(l.name + ' does not partition ' + n);
      if (l.columns.some((c) => c.length === 0)) bad.push(l.name + ' has an empty column');
      if (!(l.lead >= 0 && l.lead < n)) bad.push(l.name + ' has no lead');
      if (l.drop.length !== l.columns.length) bad.push(l.name + ' has no drop per column');
      if (new Set(HANG_LAYOUTS[n].map((x) => x.name)).size !== HANG_LAYOUTS[n].length) {
        bad.push(n + ' has two arrangements with the same name');
      }
    });
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('an arrangement is stable for a given group', () => {
  assert.equal(hangLayout('honors:3', 4).name, hangLayout('honors:3', 4).name);
  assert.equal(hangLayout('Robotics:0', 3).name, hangLayout('Robotics:0', 3).name);
});

check('the chooser is total — any count and any key', () => {
  [[0, 0], [2, 2], [9, 9], [3, 3]].forEach(([count, want]) => {
    assert.equal(hangLayout('k', count).columns.flat().length, want, 'count ' + count);
  });
  assert.equal(hangLayout(undefined, 3).columns.flat().length, 3);
  assert.equal(hangLayout(null, 3).columns.flat().length, 3);
  assert.equal(hangLayout(42, 4).columns.flat().length, 4);
  assert.doesNotThrow(() => hangLayout('k', 'nonsense'));
  assert.equal(hangLayout('k', 'nonsense').columns.flat().length, 0);
});

check('the shipped portfolio does not collapse onto one arrangement', () => {
  const P = globalThis.PORTFOLIO;
  const used = new Set();
  const note = (key, rec, kind) => used.add(hangLayout(key, groupPieces(rec, kind).length).name);
  P.projects.forEach((p, i) => note(p.category + ':' + i, p, 'project'));
  P.leadership.forEach((l, i) => note('leadership:' + i, l, 'record'));
  P.honors.forEach((h, i) => note('honors:' + i, h, 'record'));
  assert.ok(used.size > 1, 'every group was dealt the same arrangement: ' + [...used].join(', '));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/hang.test.mjs`
Expected: FAIL — `HANG_LAYOUTS is not an object`, or `hangLayout is not a function`.

- [ ] **Step 3: Implement `HANG_LAYOUTS` and `hangLayout` in `js/data.js`**

The table is transcribed verbatim from the spec §6.3. `drop` is a per-column vertical offset in pixels; it is what keeps a stack from reading as one tall frame.

```js
var HANG_LAYOUTS = {
  3: [
    { name: 'lead-two',     columns: [[0], [1, 2]],      lead: 0, drop: [0, 14] },
    { name: 'two-lead',     columns: [[1, 2], [0]],      lead: 0, drop: [14, 0] },
    { name: 'column-three', columns: [[0, 1, 2]],        lead: 0, drop: [0] },
  ],
  4: [
    { name: 'lead-three',   columns: [[0], [1, 2, 3]],   lead: 0, drop: [0, 14] },
    { name: 'three-lead',   columns: [[1, 2, 3], [0]],   lead: 0, drop: [14, 0] },
    { name: 'two-two',      columns: [[0, 1], [2, 3]],   lead: 0, drop: [0, 14] },
    { name: 'column-four',  columns: [[0, 1, 2, 3]],     lead: 0, drop: [0] },
  ],
  5: [
    { name: 'lead-four',    columns: [[0], [1, 2, 3, 4]], lead: 0, drop: [0, 14] },
    { name: 'lead-two-two', columns: [[0], [1, 2], [3, 4]], lead: 0, drop: [0, 14, 0] },
    { name: 'two-three',    columns: [[0, 1], [2, 3, 4]], lead: 0, drop: [0, 14] },
  ],
  6: [
    { name: 'three-three',  columns: [[0, 1, 2], [3, 4, 5]], lead: 0, drop: [0, 14] },
    { name: 'lead-five',    columns: [[0], [1, 2, 3, 4, 5]], lead: 0, drop: [0, 14] },
    { name: 'two-two-two',  columns: [[0, 1], [2, 3], [4, 5]], lead: 0, drop: [0, 14, 0] },
  ],
};
```

Two functions. The hash is FNV-1a, written out because the choice is invisible in the result and must not drift:

```js
/* FNV-1a, 32-bit. A stable string hash: the same group key must deal the same
   arrangement on every load, or the wall reshuffles under a visitor who
   reloads. */
function layoutHash(str) {
  var h = 2166136261;
  var s = String(str == null ? '' : str);
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* Total by construction: an unknown count falls back to a single column of
   every piece, so a group can never fail to render for want of a layout. */
function hangLayout(key, count) {
  var n = Math.max(0, Math.floor(Number(count) || 0));
  var set = HANG_LAYOUTS[n];
  if (set && set.length) return set[layoutHash(key) % set.length];
  var columns = [];
  for (var i = 0; i < n; i++) columns.push([i]);
  return { name: 'column-' + n, columns: columns, lead: 0, drop: columns.map(function () { return 0; }) };
}
```

Publish `globalThis.Site.HANG_LAYOUTS = HANG_LAYOUTS;` and `globalThis.Site.hangLayout = hangLayout;`.

- [ ] **Step 4: Run it to verify it passes**

Run: `node tests/hang.test.mjs`
Expected: `11 passed, 0 failed`

If `the shipped portfolio does not collapse onto one arrangement` fails, the hash is returning a constant — check that `Math.imul` is used and not `*`.

- [ ] **Step 5: Commit**

```bash
git add js/data.js tests/hang.test.mjs
git commit -m "feat(gallery): deal each group one of several hang arrangements"
```

---

### Task 3: The wide gallery

This is the task that changes what a visitor sees. It lands the width model, the single row, the columns, and the frame heights together: the container query cannot survive the width change, because a group sized from its own content width would be circular.

**Files:**
- Modify: `css/styles.css` — `:root` (line ~57), `.room` (1432), `.groups` (1705), `.group` (1716), `.groups > .group` (1732), `.cluster` (1739), `.hang-lead`/`.hang-stack` (1746), `.piece` (1762), `.room[data-room="About"]` (1947), the narrow dock (1603)
- Modify: `js/main.js` — `PIECE_HEIGHTS`/`LEAD_HEIGHT`/`PIECE_MIN`/`LEAD_MIN` (851-854), `renderCluster` (860), `renderGroup` (923), the About portrait (1057)
- Modify: `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: `Site.hangLayout`, `Site.groupPieces` (Tasks 1–2).
- Produces: the DOM contract later tasks rely on — `<div class="cluster" data-hang="NAME">` holding one `<div class="col" style="padding-top:Npx">` per arrangement column; a piece is `<button class="piece piece--lead" data-piece="N">` or `<button class="piece" data-piece="N">`; `renderCluster(pieces, layout, record, kind, entryIndex) -> string`.

- [ ] **Step 1: Write the failing tests**

Task 1 already replaced the single-piece checks with the 3–6 frame budget. Add the checks the arrangement markup needs, in `tests/renderer.test.mjs`:

```js
check('the lead frame takes the lead height', () => {
  /* Every group hangs at least three frames, so every group has a lead. The
     height itself now comes from the stylesheet, not from inline markup: a
     cqi-based height cannot survive a content-driven width. */
  const groups = strip.split('<div class="group"').slice(1);
  assert.ok(groups.length > 0, 'no groups rendered');
  groups.forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    assert.match(body, /class="piece piece--lead"/, 'group ' + i + ' has no lead frame');
    assert.ok(!/--h:/.test(body), 'group ' + i + ' still sizes its frames inline');
  });
});

check('a group is hung as the columns its arrangement names', () => {
  const named = new Map();
  Object.values(Site.HANG_LAYOUTS).flat().forEach((l) => named.set(l.name, l));
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const hang = body.match(/data-hang="([^"]+)"/);
    if (!hang) { bad.push('group ' + i + ': names no arrangement'); return; }
    const layout = named.get(hang[1]);
    if (!layout) { bad.push('group ' + i + ': unknown arrangement ' + hang[1]); return; }
    const cols = (body.match(/<div class="col"/g) || []).length;
    if (cols !== layout.columns.length) {
      bad.push('group ' + i + ': ' + cols + ' columns hung, ' + layout.columns.length + ' in ' + layout.name);
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('no frame is hung twice in one group', () => {
  /* The partition property, read off the wall. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const hung = [...body.matchAll(/data-piece="(\d+)"/g)].map((m) => Number(m[1]));
    if (new Set(hung).size !== hung.length) bad.push('group ' + i + ': a frame is hung twice');
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — `every group hangs between three and six frames` reports groups with one and two frames, and `a group is hung as the columns its arrangement names` reports `names no arrangement`.

- [ ] **Step 3: Replace the sizing constants and `renderCluster` in `js/main.js`**

Delete `PIECE_HEIGHTS`, `LEAD_HEIGHT`, `PIECE_MIN` and `LEAD_MIN` (lines 851-854) along with the two comment blocks above them, which document a `cqi` model that no longer exists. The heights now live in `css/styles.css` as `--lead-h` and `--sup-h`, so a piece carries no `--h` at all.

`renderCluster(pieces, layout, record, kind, entryIndex)` builds one `.col` per arrangement column:

```js
  function renderCluster(pieces, layout, record, kind, entryIndex) {
    var title = record.title || record.description || '';
    var piece = function (p, i) {
      var open = groupOpener(kind, record, entryIndex);
      var label = open.name || (title + ' — photograph ' + pieceLetter(i));
      var lead = i === layout.lead;
      /* A photograph still waiting for its file has nothing to open, so it is
         not a button: a focusable control that does nothing when activated is
         worse than a frame that plainly is not one. */
      if (open.inert) {
        return '<span class="piece piece--pending" data-piece="' + i + '"'
          + ' role="img" aria-label="' + esc(label + ' — photograph awaited') + '"></span>';
      }
      return '<button type="button" class="piece' + (lead ? ' piece--lead' : '') + '"'
        + ' data-piece="' + i + '"' + open.attrs
        + ' aria-label="' + esc(label) + '"'
        + '><img src="' + esc(p.src) + '" alt="" loading="lazy"'
        + ' onerror="this.onerror=null;this.src=\'files/PlaceHolder.png\';"></button>';
    };
    var cols = layout.columns.map(function (indices, ci) {
      return '<div class="col" style="padding-top:' + (layout.drop[ci] || 0) + 'px">'
        + indices.map(function (i) { return piece(pieces[i], i); }).join('')
        + '</div>';
    });
    return '<div class="cluster" data-hang="' + esc(layout.name) + '">' + cols.join('') + '</div>';
  }
```

An index outside `pieces` must not be hung as `undefined` — guard the `indices.map` with a filter so a malformed arrangement hangs nothing rather than a broken frame.

Tasks 1 and 4 are what make `open.inert` fire for padding; here it still fires only for a record with no photographs, which is the existing behaviour.

- [ ] **Step 4: Resolve the arrangement in `renderGroup`**

```js
  function renderGroup(kind, index, record, roomKey) {
    var pieces = Site.groupPieces(record, kind);
    var entryKey = kind === 'project' ? roomKey + ':' + index : kind + ':' + index;
    var layout = Site.hangLayout(entryKey, pieces.length);
    return '<div class="group" data-group data-kind="' + esc(kind) + '"'
      + ' data-entry="' + esc(entryKey) + '">'
      + renderCluster(pieces, layout, record, kind, entryKey)
      + renderGroupLabel(record, kind, index, pieces.length, pieces)
      + '</div>';
  }
```

`renderGroupLabel` and `renderLabel` keep their current signatures in this task — Task 5 reshapes them. `pieces` is now a list of objects, so `renderGroupLabel` must map `.src` for the catalogue's technical line:

```js
  function renderGroupLabel(record, kind, index, pieceCount, pieces) {
    return renderLabel(record, kind, index, pieceCount, (pieces || []).map(function (p) { return p.src; }));
  }
```

- [ ] **Step 5: Replace the width model in `css/styles.css`**

In `:root`, delete `--room-w` (line 62) and its comment, and add:

```css
  /* The hang. Heights come from the viewport's height, not the cell's width:
     a gallery's width is now its content's, so sizing a group from its own
     width would be circular. Values are the spec's §6.1-6.2. */
  --lead-h:      clamp(120px, 18vh, 165px);
  --sup-h:       clamp( 76px, 11vh, 102px);
  --col-gap:     clamp(  6px, 1.1vh,  10px);
  --cluster-gap: 12px;
  --label-w:     clamp(220px, 20vw, 300px);
  --group-gap:   20px;
```

`.room` (line 1432): replace `width: var(--room-w);` with

```css
  /* The gallery is as wide as its contents. The floor is one screen, so a
     short gallery is never narrower than the window and a visitor is always
     inside one named gallery rather than looking at two. */
  width: max-content;
  min-width: 100vw;
```

and replace the stale comment above it — the 860px floor and its two-column-grid tap-target argument are gone. Add, beside the About rules near line 1947:

```css
/* About and Contact are single compositions, not runs of groups. Unlike every
   other gallery they are one screen exactly. */
.room[data-room="About"],
.room[data-room="Contact"] { width: 100vw; min-width: 100vw; }
```

`.groups` (line 1705): replace the grid with one row, and rewrite the comment above it — the 2×2 grid, its row-height argument and its three-column history all describe a room that no longer exists:

```css
.groups {
  display: flex;
  align-items: flex-start;
  gap: var(--group-gap);
  position: relative;
  flex: 0 0 auto;
  min-height: 0;
}
```

Delete `.groups > .group { container-type: inline-size; container-name: cell; }` (line 1732) — it is the only container query in the file, and `cqi` is about to stop meaning anything.

`.cluster` (line 1739): `gap: var(--cluster-gap);`. Replace the `.hang-lead, .hang-stack` block (line 1746) with:

```css
/* One column of a hang. The arrangement decides how many there are and which
   pieces go in each; the drop is written inline per column. */
.col {
  display: flex;
  flex-direction: column;
  gap: var(--col-gap);
  min-width: 0;
}
```

`.piece` (line 1762): `height: var(--sup-h);`, and delete `margin-top: var(--shift, 0);` and the `var(--h, 30cqi)` default. Add:

```css
.piece--lead { height: var(--lead-h); }
```

The About portrait (line 1057 in `js/main.js`) carries `style="--h:min(22cqi, 190px)"`; remove that attribute and give it a rule instead, under the About section of the stylesheet:

```css
.room[data-room="About"] .piece--portrait { height: clamp(120px, 18vh, 190px); }
```

In the narrow dock block (line 1603), restore the pip to a full tap target: `min-width: 44px; width: 44px;` — and rewrite the comment above it, whose whole argument is about fitting nine rooms in 390px. There are six.

- [ ] **Step 6: Run the unit suite**

Run: `npm test`
Expected: every suite green. The DOM stub models no CSS, so nothing here can prove the layout — that is Task 7's job.

- [ ] **Step 7: Commit**

```bash
git add css/styles.css js/main.js tests/renderer.test.mjs
git commit -m "feat(gallery): widen a gallery to its contents and hang one row"
```

---

### Task 4: Awaited frames and the catalogue

**Files:**
- Modify: `js/main.js` — `renderCatalogue` (1001), `renderLabel` (1018), `renderGroupLabel` (1036)
- Modify: `css/styles.css` — a `.piece--pending` rule beside `.piece`
- Modify: `tests/renderer.test.mjs` — `a photograph that is still awaited is not a dead control` (184), `a piece whose photo is missing falls back to the placeholder` (373), `the catalogue has one entry per piece` (238), `every group carries a plan, a narrative and a catalogue` (223)

**Interfaces:**
- Consumes: `Piece = { src, awaited }` (Task 1); the `piece--pending` markup (Task 3, Step 3).
- Produces: an awaited frame is `<span class="piece piece--pending" data-piece="N" role="img" aria-label="… — photograph awaited"></span>` with **no `<img>`**; a group's catalogue holds one `.cat-entry` per real photograph followed by at most one `<p class="ca-note">`.

- [ ] **Step 1: Write the failing tests**

Replace `the catalogue has one entry per piece` (line 238) with:

```js
check('the catalogue has one entry per photograph, and names the awaited ones once', () => {
  /* A group whose photographs are all awaited gets no catalogue entry at all,
     only the note: three entries reading "Photograph awaited" is not a
     catalogue, it is a stutter. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const frames  = (body.match(/class="piece/g) || []).length;
    const awaited = (body.match(/class="piece piece--pending"/g) || []).length;
    const entries = (body.match(/class="cat-entry"/g) || []).length;
    const notes   = (body.match(/class="ca-note"/g) || []).length;
    if (entries !== frames - awaited) {
      bad.push('group ' + i + ': ' + entries + ' entries for ' + (frames - awaited) + ' photographs');
    }
    if (notes !== (awaited > 0 ? 1 : 0)) {
      bad.push('group ' + i + ': ' + notes + ' awaited notes for ' + awaited + ' awaited frames');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('an awaited frame is an empty frame, not a grey picture', () => {
  const pending = [...strip.matchAll(/<span class="piece piece--pending"[^>]*><\/span>/g)].map((m) => m[0]);
  assert.ok(pending.length > 0, 'no awaited frames rendered');
  pending.forEach((p) => {
    assert.ok(!/<img/.test(p), 'an awaited frame still loads a picture: ' + p.slice(0, 90));
    assert.match(p, /role="img"/, 'an awaited frame has no role');
    assert.match(p, /aria-label="[^"]*awaited/, 'an awaited frame is not named as awaited');
    assert.ok(!/data-gallery|data-action/.test(p), 'an awaited frame carries a handler it cannot honour');
  });
  assert.ok(!/files\/PlaceHolder\.png/.test(strip),
    'the placeholder image is still hung: an awaited frame draws no picture at all');
});
```

and relax `every group carries a plan, a narrative and a catalogue` (line 233) so a group whose photographs are all awaited passes on its note:

```js
    if (!/class="cat-entry"/.test(g) && !/class="ca-note"/.test(g)) {
      bad.push('group ' + i + ': neither a catalogue entry nor an awaited note');
    }
```

and replace `a piece whose photo is missing falls back to the placeholder` (line 373) with a check that nothing on the wall draws the placeholder:

```js
check('no honour hangs the placeholder image', () => {
  /* Six honours declare no photographs at all. They hang empty frames now, not
     six repeats of the same grey picture. */
  assert.ok(!/files\/PlaceHolder\.png/.test(honoursStrip),
    'an honour still hangs the placeholder image');
  const awaited = (honoursStrip.match(/class="piece piece--pending"/g) || []).length;
  assert.ok(awaited > 0, 'no awaited frame on the honours wall');
});
```

Also delete `a photograph that is still awaited is not a dead control`'s dependence on the placeholder path (line 196, `assert.match(strip, /Photograph awaited/)`) — that string now appears only in aria-labels, so assert on the label instead:

```js
  assert.match(strip, /aria-label="[^"]*photograph awaited/, 'awaited frames are not named as awaited');
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — `an awaited frame is an empty frame` reports `<img>` inside a pending span, and `the catalogue has one entry per photograph` reports three entries for zero photographs.

- [ ] **Step 3: Draw nothing for an awaited photograph**

In `renderCluster` (Task 3, Step 3), the `open.inert` branch already emits no `<img>`. That branch currently fires only when `groupOpener` reports no photographs. Change `groupOpener` to read the piece rather than the record:

```js
  function groupOpener(kind, record, entryIndex, piece) {
    if (piece && piece.awaited) return { attrs: '', name: '', inert: true };
    /* ...the existing project and gallery branches, unchanged... */
  }
```

and call it as `groupOpener(kind, record, entryIndex, p)`. A record with photographs but padding after them now hangs live frames for the real ones and inert frames for the rest, which is the behaviour the wall needs.

Add the rule beside `.piece` in `css/styles.css`:

```css
/* An awaited photograph is a reserved place on the wall: the frame and its
   mat, no picture. It needs a width of its own, because unlike every other
   frame it has no photograph to take its proportions from. */
.piece--pending {
  aspect-ratio: 3 / 2;
  cursor: default;
}
```

- [ ] **Step 4: De-duplicate the catalogue**

Reshape `renderCatalogue` to take pieces, not sources:

```js
  var AWAITED_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

  function awaitedNote(n) {
    return '<p class="ca-note">' + AWAITED_WORDS[n] + ' photograph' + (n === 1 ? '' : 's') + ' awaited</p>';
  }

  function renderCatalogue(record, pieces) {
    var authored = Array.isArray(record.pieces) ? record.pieces : [];
    var list = Array.isArray(pieces) ? pieces : [];
    var out = '';
    var awaited = 0;
    list.forEach(function (piece, i) {
      if (piece.awaited) { awaited++; return; }
      var p = authored[i] || {};
      out += '<div class="cat-entry" data-piece="' + i + '">'
        + '<p class="ce-title">'
        + (list.length > 1 ? '<span class="ce-key">' + pieceLetter(i) + '</span>' : '')
        + esc(p.title || ('Photograph ' + pieceLetter(i))) + '</p>'
        + (p.caption ? '<p class="ce-cap">' + esc(p.caption) + '</p>' : '')
        + '<p class="ce-tech">' + esc(techLine(piece.src)) + '</p>'
        + '</div>';
    });
    return out + (awaited ? awaitedNote(awaited) : '');
  }
```

`AWAITED_WORDS` covers the ceiling of six; a count above it would print `undefined`, so fall back to the numeral — `(AWAITED_WORDS[n] || String(n))`.

`techLine(src)` keeps its string argument and its `PlaceHolder` branch: a real photograph whose file is named `PlaceHolder.png` is no longer reachable here, because `awaited` now catches it first, but the branch costs nothing and guards a hand-authored record.

**The caller must move in the same step.** `renderGroupLabel` currently maps the pieces down to their `src` before handing them to `renderLabel`, so a `renderCatalogue` that reads `piece.awaited` would receive strings and treat every frame as real. Change `renderGroupLabel` to forward `pieces` unchanged:

```js
  function renderGroupLabel(record, kind, index, pieces) {
    return renderLabel(record, kind, index, pieces.length, pieces);
  }
```

and change `renderLabel`'s last parameter from `sources` to `pieces`, passing it straight to `renderCatalogue`. The parameter count and order are unchanged in this task, so `renderGroup` needs no edit; Task 5 drops the wrapper and reshapes the signature.

The five direct calls to `Site.renderLabel` in `tests/renderer.test.mjs` (lines 280, 287, 294, 301-306) pass arrays of paths as their last argument; they must pass `Site.groupPieces(...)` output instead, or they will exercise a shape the renderer no longer accepts:

```js
  const record = { description: 'X', images: ['a.jpg', 'b.jpg'], pieces: [{ title: 'Only one' }] };
  const html = renderLabelFor(record, 'record', 0, 2, Site.groupPieces(record, 'record'));
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/styles.css tests/renderer.test.mjs
git commit -m "feat(label): draw an awaited photograph as an empty frame, and name it once"
```

---

### Task 5: The label column

**Files:**
- Modify: `js/main.js` — `renderPlan` (970), `renderLabel` (1018), `renderGroupLabel` (1036), `renderGroup` (Task 3, Step 4)
- Modify: `css/styles.css` — `.label` (1812), `.plan` (1825), `.narr` (1845), `.narr-text` (1871), `.cat` (1886), `.cat-entry` (1894)
- Modify: `tests/renderer.test.mjs` — `the plan draws one rectangle per photograph` (259), and the five direct `renderLabelFor` calls (278-308)

**Interfaces:**
- Consumes: `Layout` (Task 2), `Piece[]` (Task 1).
- Produces: `Site.renderLabel(record, pieces, layout) -> string` — three parameters, replacing `(record, kind, index, pieceCount, sources)`. `renderGroupLabel` is deleted; `renderGroup` calls `renderLabel` directly. `renderPlan(layout) -> string` emits `<div class="plan" aria-hidden="true"><span class="pcol">…</span></div>` with one `<i class="pi">` per piece, the lead carrying `pi-lead`.

- [ ] **Step 1: Write the failing tests**

Replace `the plan draws one rectangle per photograph` (line 259) with:

```js
check('the plan draws the arrangement the wall hangs', () => {
  /* The plan is a picture of the hang. Its box count must match the wall's and
     its columns must be the same columns, or it is a picture of something
     else. */
  const named = new Map();
  Object.values(Site.HANG_LAYOUTS).flat().forEach((l) => named.set(l.name, l));
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const plan = body.match(/<div class="plan"[\s\S]*?<\/div>/);
    if (!plan) { bad.push('group ' + i + ': no plan'); return; }
    const boxes = (plan[0].match(/<i class=/g) || []).length;
    const frames = (body.match(/class="piece/g) || []).length;
    if (boxes !== frames) bad.push('group ' + i + ': ' + boxes + ' boxes for ' + frames + ' frames');
    const cols = (plan[0].match(/<span class="pcol"/g) || []).length;
    const layout = named.get((body.match(/data-hang="([^"]+)"/) || [])[1]);
    if (layout && cols !== layout.columns.length) {
      bad.push('group ' + i + ': plan has ' + cols + ' columns, wall has ' + layout.columns.length);
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});
```

Update the five direct calls to `Site.renderLabel` (lines 280, 287, 294, 301-306) to the new signature. Task 4 already gave their last argument `Site.groupPieces(...)` output; here they gain the arrangement:

```js
  const html = renderLabelFor(stripped, Site.groupPieces(stripped, 'record'), Site.hangLayout('x', 3));
```

and add:

```js
check('the label sits under the frames as one column', () => {
  /* The label is beside the cluster and stacks downward: plan, narrative,
     catalogue. It was a horizontal strip, which is what crushed the catalogue
     into two columns of ninety pixels. */
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const order = ['class="plan"', 'class="narr"', 'class="cat"']
      .map((needle) => body.indexOf(needle));
    assert.ok(order.every((n) => n >= 0), 'group ' + i + ' is missing a label part');
    assert.deepEqual(order, order.slice().sort((a, b) => a - b),
      'group ' + i + ' does not read plan, narrative, catalogue');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — `renderLabelFor is not a function` for the new signature, and the plan check reports no `pcol` spans.

- [ ] **Step 3: Draw the plan from the arrangement**

```js
  /* The plan is the composition the cluster hangs, drawn small. It is built
     from the same arrangement the wall uses rather than from a piece count, so
     it cannot disagree with what is hung. */
  function renderPlan(layout) {
    var cols = (layout && layout.columns ? layout.columns : []);
    return '<div class="plan" aria-hidden="true">'
      + cols.map(function (indices) {
          return '<span class="pcol">' + indices.map(function (i) {
            return '<i class="pi' + (i === layout.lead ? ' pi-lead' : '') + '"></i>';
          }).join('') + '</span>';
        }).join('')
      + '</div>';
  }
```

- [ ] **Step 4: Reshape `renderLabel`**

```js
  function renderLabel(record, pieces, layout) {
    var list = Array.isArray(pieces) ? pieces : [];
    var title = labelTitle(record);
    var meta = labelMeta(record);
    return '<div class="label">'
      + renderPlan(layout)
      + '<div class="narr">'
      + '<p class="narr-title">' + esc(title) + '</p>'
      + (meta ? '<p class="narr-meta">' + esc(meta)
          + (list.length > 1 ? ' · ' + list.length + ' photographs' : '') + '</p>' : '')
      + '<p class="narr-text">' + esc(labelNarrative(record)) + '</p>'
      + '</div>'
      + '<div class="cat">' + renderCatalogue(record, list) + '</div>'
      + '</div>';
  }
```

The old `kind` and `index` parameters were both unused — dropping them is the point, not a side effect. Delete `renderGroupLabel` and call `renderLabel(record, pieces, layout)` from `renderGroup`.

- [ ] **Step 5: Make the label a column in `css/styles.css`**

```css
.label {
  flex: 0 0 auto;
  width: var(--label-w);
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-top: 1px solid var(--edge);
  padding-top: 7px;
}
```

and inside it: `.narr { flex: 0 0 auto; min-width: 0; }` (was `flex: 0 0 27%`), `.narr-text` clamped to three lines (was two), and

```css
.plan { display: flex; gap: 3px; }
.pcol { display: flex; flex-direction: column; gap: 2px; }
.plan i { display: block; border: 1px solid var(--text-quiet); }
.plan .pi-lead { width: 14px; height: 10px; }
.plan .pi { width: 9px; height: 6px; }

.cat { display: flex; flex-direction: column; gap: 5px; }
.cat-entry { flex: 0 0 auto; min-width: 0; }

.ca-note {
  font-family: var(--font-mono);
  font-size: 0.52rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-quiet);
  margin: 0;
}
```

Delete `.plan .pi-stack` and the old `.plan .pi-lead`/`.pi` sizes that the block above replaces.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add js/main.js css/styles.css tests/renderer.test.mjs
git commit -m "feat(label): stand the label up as a column and draw the real plan"
```

---

### Task 6: One Honours gallery

**Files:**
- Modify: `js/data.js:344` (`HONOURS_ROOMS`) and the comment above it
- Modify: `js/main.js` — `honoursRooms` (1152), `ROOM_SHORT` (1130), `renderDock` (1202)
- Modify: `tests/derive-rooms.test.mjs:92-155`
- Modify: `tests/renderer.test.mjs:89-104, 363-380`

**Interfaces:**
- Consumes: everything above.
- Produces: `Site.HONOURS_ROOMS === 1`; `honoursRooms() -> [{ key: 'Honours', label: 'Honours', short: 'Honours', note, records, offset }]`; `ROOM_SHORT` deleted, with `renderDock` reading the short name off `dockItems()`.

- [ ] **Step 1: Write the failing tests**

In `tests/derive-rooms.test.mjs`, delete `no honours part exceeds what a room can hold` (line 109) — its premise, "three columns by two rows is six exhibits", is the grid this work removes — and change the empty/short-list check (line 154) to:

```js
  assert.equal(one.parts.length, HONOURS_ROOMS, 'the split must always yield one part per room');
  assert.equal(HONOURS_ROOMS, 1, 'a gallery is as wide as its contents, so honours is one wall');
  assert.equal(honoursSplit(globalThis.PORTFOLIO.honors).parts.length, 1);
  assert.equal(honoursSplit(globalThis.PORTFOLIO.honors).parts[0].length,
    globalThis.PORTFOLIO.honors.length, 'the single part must hold every honour');
  /* The renderer drops empty parts rather than hanging an empty wall. That
     filter is only as good as this fact: an empty list yields an empty part
     and nothing else. */
  assert.equal(honoursSplit([]).parts.filter((p) => p.length).length, 0,
    'an empty list yielded a part with something in it');
```

In `tests/renderer.test.mjs`, replace the room lists (lines 91-92 and 96-97) and `HONOURS_KEYS` (line 102):

```js
  assert.deepEqual(roomKeys, ['About', 'Robotics', 'Applications', 'Leadership',
    'Honours', 'Contact']);
  assert.deepEqual(titles, ['About', 'Works in Robotics', 'Works in Applications',
    'Leadership', 'Honours', 'Contact']);
  const HONOURS_KEYS = ['Honours'];
```

`every honours record hangs as a group` (line 363) then reads the single room, which the existing `HONOURS_KEYS.map(...).join('')` already does.

Change `a piece whose photo is missing falls back to the placeholder`'s replacement from Task 4 to read the single key too, if it names `honoursStrip`.

- [ ] **Step 2: Run them to verify they fail**

Run: `node tests/derive-rooms.test.mjs && node tests/renderer.test.mjs`
Expected: `derive-rooms` FAILs on `HONOURS_ROOMS` being 4; `renderer` FAILs on the room list carrying four Honours entries.

- [ ] **Step 3: Make Honours one room**

In `js/data.js`, `HONOURS_ROOMS = 4` becomes `1`, and the comment above it is rewritten: `evenChunks` and the partition stay, because a gallery split by meaning is still a plausible future, but the reason for four — a 2×2 grid of four exhibits in a room exactly one screen wide — is gone.

- [ ] **Step 4: Name it, and drop the duplicated short name**

`honoursRooms()` keeps its prefix-sum offsets and grows a guard, so raising `HONOURS_ROOMS` again still produces numbered rooms:

```js
  function honoursRooms() {
    var parts = Site.honoursSplit(PORTFOLIO.honors).parts;
    var numerals = ['I', 'II', 'III', 'IV'];
    var many = parts.filter(function (p) { return p.length; }).length > 1;
    return parts.map(function (records, i) {
      return {
        key:   many ? 'Honours — ' + numerals[i] : 'Honours',
        label: many ? 'Honours · ' + numerals[i] : 'Honours',
        short: many && i ? 'Honours ' + numerals[i] : 'Honours',
        note:  records.length + ' groups',
        records: records,
        offset: parts.slice(0, i).reduce(function (n, p) { return n + p.length; }, 0)
      };
    }).filter(function (r) { return r.records.length > 0; });
  }
```

Delete `ROOM_SHORT` (line 1130) and change `renderDock`'s lookup from `ROOM_SHORT[it.key] || it.key` to `it.short || it.key`. `dockItems()` already carries `short` through from `walkRooms()`, so the dock's short names now have exactly one source — which is what the comment above `ROOM_SHORT` always claimed and the code did not do.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add js/data.js js/main.js tests/derive-rooms.test.mjs tests/renderer.test.mjs
git commit -m "feat(gallery): hang every honour on one wall"
```

---

### Task 7: The browser suite, the probes and the docs

Nothing so far has measured a single pixel. This task is where the layout is actually verified, and it cannot run under this session's sandbox — see the Global Constraints. Run it with the sandbox off, or escalate the one command.

**Files:**
- Modify: `tools/ux-check.mjs` (the layout sections at lines 153-378, the phone dock section at 736-790)
- Modify: `tools/rooms.mjs`, `tools/widths.mjs`, `tools/pieces.mjs`
- Modify: `README.md`, `tools/README.md`

**Interfaces:**
- Consumes: the whole feature.
- Produces: a green browser suite, and docs that describe the walk that exists.

- [ ] **Step 1: Re-point the layout sections**

`tools/ux-check.mjs` asserts the layout contract at 1440×900 and at the 1280×704 floor. Update:

- **The room-height check** (line 173, `a room is exactly one viewport tall`) stays exactly as it is. That invariant did not change.
- **The dock-band and top checks** (lines 188-205 and 333-345) stay, and now cover a gallery nine screens wide: keep iterating every `#strip .room`, since the widest gallery is where a cluster is most likely to grow past the band.
- **The clipping checks** (lines 212-244) count `.cat-entry` per group against `.piece`. With awaited frames, the expectation becomes `entries === frames - awaited` and `notes === (awaited ? 1 : 0)` — the same rule the renderer suite pins, measured in a real engine.
- **The collision check** (lines 217-218, 244, 362) compares piece boxes for overlap. It is the check that catches a cluster spilling into its neighbour, which Review Focus 6 names. Keep it and confirm it still compares across the whole strip rather than within one room.

- [ ] **Step 2: Add the checks this feature needs**

```js
await section('A gallery is as wide as its contents', async () => {
  await setViewport(1440, 900, false);
  await goto(BASE);
  const geo = await evaluate(`(() => {
    const rooms = [...document.querySelectorAll('#strip .room')];
    return rooms.map(r => ({
      key: r.getAttribute('data-room'),
      w: r.getBoundingClientRect().width,
      vw: innerWidth,
      groups: r.querySelectorAll('.group').length,
    }));
  })()`);
  const honours = geo.find((r) => r.key === 'Honours');
  check('the honours gallery is one room, not four',
    geo.filter((r) => r.key && r.key.startsWith('Honours')).length === 1,
    geo.filter((r) => r.key && r.key.startsWith('Honours')).map((r) => r.key).join(', '));
  check('a gallery with content past one screen is wider than the viewport',
    honours.w > honours.vw, honours.w + 'px in a ' + honours.vw + 'px viewport');
  check('every gallery is at least one screen wide',
    geo.every((r) => r.w >= r.vw - 1),
    geo.filter((r) => r.w < r.vw - 1).map((r) => r.key + ' ' + Math.round(r.w)).join(', '));
  check('the honours gallery holds every honour',
    honours.groups === 13, honours.groups + ' groups');
});

await section('The tallest arrangement stays inside the band', async () => {
  /* Five stacked frames is the deepest hang the arrangement table produces.
     At the floor viewport it is the closest to the dock. */
  for (const [w, h] of [[1440, 900], [1280, 704]]) {
    await setViewport(w, h, false);
    await goto(BASE);
    const worst = await evaluate(`(() => {
      let worst = null;
      document.querySelectorAll('#strip .group').forEach(g => {
        const cols = [...g.querySelectorAll('.col')];
        const deepest = Math.max(...cols.map(c => c.getBoundingClientRect().height));
        const room = g.closest('.room').getBoundingClientRect();
        const slack = room.bottom - g.getBoundingClientRect().bottom;
        if (!worst || slack < worst.slack) worst = { slack, deepest, entry: g.dataset.entry };
      });
      return worst;
    })()`);
    check('the deepest hang clears the dock band at ' + w + 'x' + h,
      worst.slack > 0, JSON.stringify(worst));
  }
});
```

- [ ] **Step 3: Update the phone dock check**

Line 784 asserts `mob.dockPips >= 9`. Six rooms means:

```js
  check('every room is a pip in the collapsed dock', mob.dockPips >= 6, mob.dockPips + ' pips');
  check('a collapsed pip is a full tap target', mob.pipWidth >= 44, mob.pipWidth + 'px wide');
```

and update the comment above it (line 764), whose arithmetic is about nine rooms at 41px. Add the pip width to whatever `evaluate` block computes `mob`.

- [ ] **Step 4: Re-point the probes**

`tools/rooms.mjs` prints per-room group count, row height, title top, the last group's bottom and the dock top, and marks each row `ok` or `FAIL` against the fold. With one row there is no "row height" — print the deepest column's height and the cluster's width instead. `tools/widths.mjs` reads the grid's tracks; there is no grid, so print each group's width and the label's. `tools/pieces.mjs` is per-frame and mostly survives; drop any `cqi` arithmetic from its report.

- [ ] **Step 5: Run the browser suite with the sandbox off**

```powershell
# terminal 1
node tools/serve.mjs 3333
# terminal 2
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
# terminal 3
node tools/ux-check.mjs
```

Expected: `exit code 0`, every section green. If a section fails, the probes diagnose it — `node tools/widths.mjs` for a gallery that is the wrong width, `node tools/rooms.mjs` for a hang that overflows.

- [ ] **Step 6: Correct the docs**

`README.md`:

- **The walk** section: replace "a room holds a fixed grid of at most six groups. Thirteen honours is therefore three rooms, split evenly from the array's own order" — which the code already contradicted, since it made four — with the width model: a gallery is as wide as its contents, floored at one screen; one row of groups; Honours is one gallery.
- **A group is the unit that hangs**: state the 3–6 budget, that missing photographs hang empty frames, and that the hang is one of several arrangements chosen from the group's key.
- **Structure**: add `tests/hang.test.mjs`.
- **Tests**: add the new suite to the list and to the `npm test` description.

`tools/README.md`: update the probe table for the new geometry, and the `ux-check.mjs` section's list of what it covers — a gallery wider than a screen, and six rooms in the dock.

- [ ] **Step 7: Commit**

```bash
git add tools/ux-check.mjs tools/rooms.mjs tools/widths.mjs tools/pieces.mjs README.md tools/README.md
git commit -m "test(ux): measure the wide gallery, and document the walk that exists"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: §5.1 width → Task 3; §5.2 one Honours gallery → Task 6; §5.3 dock → Tasks 3 (pip) and 6 (entries); §5.4 wayfinding → no task, deliberately, because the decision was to change nothing; §6.1 frame heights → Task 3; §6.2 label column → Task 5; §6.3 arrangements → Tasks 2 and 3; §6.4 cost → no task, it is a consequence; §7.1 budget → Task 1; §7.2 empty frames → Task 4; §7.3 catalogue → Task 4; §8 interfaces → Tasks 1–6; §9 removals → Tasks 3, 5 and 6; §10 verification → Task 7. No requirement is unowned.

**Review Focus coverage.** Each of the six lines names the task that pins it: 1 → Task 1 (`a record past six photographs hangs the first six`); 2 → Tasks 1 and 4 (`a record whose image is the placeholder is awaited…`, `an awaited frame is an empty frame…`); 3 → Tasks 3 and 4 (the 3–6 frame check, and the relaxed plan/narrative check plus `the catalogue has one entry per photograph…`); 4 → Task 2 (`the chooser is total — any count and any key`); 5 → Tasks 3, 6 and 7; 6 → Task 7 (the cross-strip collision check).

**Type consistency.** `Piece` is `{ src, awaited }` in Tasks 1, 3, 4 and 5. `Layout` is `{ name, columns, lead, drop }` in Tasks 2, 3 and 5. `hangLayout(key, count)` keeps that argument order in the data layer, the tests and the renderer. `renderLabel` is `(record, pieces, layout)` from Task 5 onward and is called that way in `renderGroup`. `renderGroupLabel` exists through Task 4 and is deleted in Task 5 — no later step references it.

**Known transcript risk.** Task 3, Step 3 is the one place a body is given rather than a signature, because the markup contract it produces is what three later tasks' tests read; the alternative is a signature the implementer cannot guess correctly. Every other code block is a test, a table transcribed verbatim from the spec, or a signature.

**Proportion.** The plan is about 1.4× the spec's length, most of it test code. No step says "handle edge cases" or "add validation", and no step is a transcript of a body the tests already determine.
