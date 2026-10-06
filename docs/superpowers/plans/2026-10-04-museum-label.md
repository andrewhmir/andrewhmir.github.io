# The Museum Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every project's account, awards and team caption on the wall as readable text, shrink the photographs to illustrate it, add a sticky area header and an in-dock progress bar.

**Architecture:** The walk does not change — still horizontal, still one screen tall, still one stand per screen. Inside a stand, `.group` turns from a row (cluster beside label) into a column (slim picture band above a full-width label), and the label's copy is unclamped. Two new fixed pieces of chrome share the existing scroll-tracking path in `initLights()`: a sticky `.room-rail` at the head and `#dockProgress` inside the dock. Three dialogs are deleted; the photograph carousel stays.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step. Lenis 1.3.26 (vendored) is the only dependency. Tests are in-process suites with a ten-line runner (`tests/harness.mjs`); `tools/ux-check.mjs` drives headless Chrome over CDP and is the authority on anything geometric.

**Spec:** `docs/superpowers/specs/2026-10-04-museum-label-design.md`

## Global Constraints

- **Spec section references** in this plan are to `docs/superpowers/specs/2026-10-04-museum-label-design.md`. Read it before starting.
- **No build step, no bundler, no npm install.** The site is static files.
- **`js/vendor/` is never modified.** Lenis stays pinned by size and SHA-256.
- **`js/data.js` record content does not change.** No project, honour or leadership record gains or loses a field. The only permitted change to that file is adding the pure function `Site.awardPhotos` per Task 1.
- **One scrolling axis.** `#hall` remains the document's only scroller. Nothing may introduce vertical scrolling of a room. The single sanctioned exception is `overflow-y: auto` on `.label-account` (Task 4), which spec §10.2 requires as a last resort against silently clipped prose.
- **44×44 minimum tap targets** at every supported width, including the spec's 1280×704 floor.
- **No `-webkit-line-clamp` anywhere in the label.** Spec §6.3 and §10.3.
- **Reduced motion is honoured.** `update = () => { scrollLeft, scrollWidth, clientWidth }`. Returns 0 when nothing can scroll.
- `Site.roomAtOffset(scrollLeft, viewportW, boxes)` — find the box whose span contains the viewport centre. Boxes are objects with `left` and `width`; the return value is the box itself or `null`.
- `Site.awardPhotos(projectId, honors, awardOrYear)` — resolves **one award** to its photographs. Returns an array, always; `[]` for an award that has none. Consumed by Tasks 4 and 6.

### Task 1: The pure functions, and the walk's progress inside the dock

**Files:**
- Modify: `js/data.js` — add three functions inside the existing IIFE: `progressFraction` and `roomAtOffset` after `visibleWork` (~line 519), `awardPhotos` after `galleryFor` (~line 545)
- Create: `tests/award-photos.test.mjs`
- Test: `tests/lights.test.mjs` (add four checks)

**Interfaces:**

- Consumes: `Site.galleryFor`, `Site.honoursTiles`, `PORTFOLIO` from `js/data.js`.
- Produces: `Site.progressFraction`, `Site.roomAtOffset`, `Site.awardPhotos` — consumed by Tasks 3, 4, 6 and by tests.

- [ ] **Step 1: Write the failing tests**

Create `tests/award-photos.test.mjs`:

```js
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { awardPhotos } = globalThis.Site;
const H = globalThis.PORTFOLIO.honors;
const P1 = globalThis.PORTFOLIO.projects.find((p) => p.id === 'project1');
const P3 = globalThis.PORTFOLIO.projects.find((p) => p.id === 'project3');

/* The award record exactly as renderAwards sees it, so the preferred call
   shape — the object that carries `year` — is what these checks exercise. */
const awardOf = (project, year) => project.awards.find((a) => a.year === year);

check('an award with photographs resolves to its own photographs', () => {
  const h = H.find((x) => x.from === 'project3' && x.year === 'March 2025');
  assert.ok(h && h.images.length, 'fixture needs the March 2025 award to hang photographs');
  assert.deepEqual(awardPhotos('project3', H, awardOf(P3, 'March 2025')).slice().sort(),
    h.images.slice().sort());
});

check('two awards of one project resolve differently', () => {
  /* The check the union fails. Both are C.E.N.T.H.R.O. awards, so a return at
     the level of the PROJECT hands the March win's three photographs to the May
     win as well — a control that opens a different win's gallery. */
  assert.equal(awardPhotos('project3', H, awardOf(P3, 'March 2025')).length, 3,
    'the March 2025 award hangs three photographs');
  assert.deepEqual(awardPhotos('project3', H, awardOf(P3, 'May 2025')), [],
    'the May 2025 award hangs none and must not inherit March\u2019s');
});

check('an award with no photographs of its own is not a control', () => {
  /* PALAD's December and November honours hang nothing; only February does. */
  assert.deepEqual(awardPhotos('project1', H, awardOf(P1, 'December 2025')), []);
  assert.deepEqual(awardPhotos('project1', H, awardOf(P1, 'November 2025')), []);
  assert.equal(awardPhotos('project1', H, awardOf(P1, 'February 2026')).length, 1);
});

check('a bare year string resolves the same award as its record', () => {
  assert.deepEqual(awardPhotos('project3', H, 'March 2025'),
    awardPhotos('project3', H, awardOf(P3, 'March 2025')));
});

check('a project with no linked honours returns an empty list', () => {
  assert.deepEqual(awardPhotos('project5', H, 'March 2026'), []);
});

check('an unknown project returns an empty list', () => {
  assert.deepEqual(awardPhotos('nope', H, 'March 2025'), []);
});

check('an absent or unrecognised year yields nothing rather than a guess', () => {
  assert.deepEqual(awardPhotos('project3', H, undefined), []);
  assert.deepEqual(awardPhotos('project3', H, ''), []);
  assert.deepEqual(awardPhotos('project3', H, {}), []);
  assert.deepEqual(awardPhotos('project3', H, 'March 1999'), []);
});

check('a total absence of input does not throw', () => {
  assert.deepEqual(awardPhotos('project1', undefined, 'February 2026'), []);
  assert.deepEqual(awardPhotos(undefined, H, 'March 2025'), []);
});

check('no award inherits another award\'s photographs', () => {
  const march = awardPhotos('project3', H, awardOf(P3, 'March 2025'));
  const nov = awardPhotos('project3', H, awardOf(P3, 'November 2024'));
  const one = awardPhotos('project1', H, awardOf(P1, 'February 2026'));
  assert.equal(march.length, 3, 'the March 2025 award hangs three photographs');
  assert.equal(nov.length, 2, 'the November 2024 award hangs two photographs');
  assert.equal(one.length, 1, 'the February 2026 award hangs one photograph');
  const shared = march.filter((f) => nov.includes(f) || one.includes(f));
  assert.deepEqual(shared, [], 'an award photograph is claimed by two awards');
});

run();
```

Add to `tests/lights.test.mjs`, before the final `run()`:

```js
check('progress is the fraction of the scrollable walk consumed', () => {
  const { progressFraction } = globalThis.Site;
  assert.equal(progressFraction(0, 5000, 1000), 0);
  assert.equal(progressFraction(4000, 5000, 1000), 1);
  assert.equal(progressFraction(2000, 5000, 1000), 0.5);
});

check('progress is total when the walk cannot scroll', () => {
  const { progressFraction } = globalThis.Site;
  assert.equal(progressFraction(0, 1000, 1000), 0);
  assert.equal(progressFraction(0, 0, 0), 0);
  assert.equal(progressFraction(50, 900, 1000), 0);
});

check('the room at an offset is the one holding the viewport centre', () => {
  const { roomAtOffset } = globalThis.Site;
  const boxes = [{ key: 'About', left: 0, width: 1440 },
                 { key: 'Robotics', left: 1440, width: 1440 }];
  assert.equal(roomAtOffset(0, 1440, boxes).key, 'About');
  assert.equal(roomAtOffset(720, 1440, boxes).key, 'Robotics',
    'the viewport centre at 1440 is at the boundary and belongs to the next room');
  assert.equal(roomAtOffset(1440, 1440, boxes).key, 'Robotics');
});

check('the room lookup is total', () => {
  const { roomAtOffset } = globalThis.Site;
  assert.equal(roomAtOffset(0, 1440, []), null);
  assert.equal(roomAtOffset(0, 1440, undefined), null);
  assert.equal(roomAtOffset(99999, 1440, [{ key: 'A', left: 0, width: 100 }]), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/award-photos.test.mjs`
Expected: FAIL — `awardPhotos is not a function`.

Run: `node tests/lights.test.mjs`
Expected: FAIL — `progressFraction is not a function`.

- [ ] **Step 3: Implement `Site.progressFraction` and `Site.roomAtOffset`**

In `js/data.js`, inside the existing IIFE, after `visibleWork`:

```js
  /* How far along the walk the viewport is, 0..1. Total: a walk that cannot
     scroll (or a nonsense measurement) reads 0 rather than dividing by zero. */
  function progressFraction(scrollLeft, scrollWidth, clientWidth) {
    var max = (Number(scrollWidth) || 0) - (Number(clientWidth) || 0);
    if (!(max > 0)) return 0;
    var at = Number(scrollLeft) || 0;
    return Math.min(1, Math.max(0, at / max));
  }
  globalThis.Site.progressFraction = progressFraction;

  /* The box the viewport's centre is standing in. Takes boxes rather than
     elements so it needs no DOM: the caller measures, this decides. The
     comparison is half-open (`left <= mid < left + width`), so a boundary
     belongs to the room on its right — the same rule the walk's own
     roomAt() has always used. */
  function roomAtOffset(scrollLeft, viewportW, boxes) {
    if (!boxes || !boxes.length) return null;
    var mid = (Number(scrollLeft) || 0) + (Number(viewportW) || 0) / 2;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (!b) continue;
      if (mid >= b.left && mid < b.left + b.width) return b;
    }
    return null;
  }
  globalThis.Site.roomAtOffset = roomAtOffset;
```

- [ ] **Step 4: Implement `Site.awardPhotos`**

In `js/data.js`, inside the same IIFE, after `galleryFor`:

```js
  /* ── A project's award photographs ─────────────────────────────────────
     An honour carrying `from: 'projectN'` is that project's award, and six of
     those honours hang real photographs. They are excluded from the Honours
     room by the `from` partition, so their only route to a visitor is through
     the project that won them.

     Matched on PROJECT plus YEAR, not on the description. The wall and the
     honour name one win in two wordings — the card says "11th Philippine
     Robothon – Innovative Open Category, Overall Champion" where the honour
     says "11th Philippine Robothon – Overall Champion" — so no predicate over
     those strings can be trusted. Project plus year is exact for all eight
     awards in the shipped data. A year that matches is exact; a year that is
     absent or matches nothing yields [] rather than a guess at another
     award's photographs.

     Total by construction: every path returns an array.

     THE THIRD PARAMETER IS THE WHOLE POINT, and an earlier draft of this plan
     had only two. This is asked PER AWARD, not per project: the requirement is
     that an award WHICH HAS photographs is a control and one without is not. A
     project-level answer cannot express that — it gives every one of a project's
     awards the project's whole photograph set, so the five awards that have none
     become controls opening a DIFFERENT win's photographs. Measured: per-award
     matching gives 3 controls and 5 plain-text awards with all 6 photographs
     still reachable; a project-level union gives 8 controls, 5 of them wrong. */
  function awardPhotos(projectId, honors, awardOrYear) {
    var list = Array.isArray(honors) ? honors : [];
    if (!projectId) return [];
    var year = awardOrYear && typeof awardOrYear === 'object'
      ? awardOrYear.year
      : awardOrYear;
    if (year === undefined || year === null || year === '') return [];
    var wanted = String(year);
    var out = [];
    list.forEach(function (h) {
      if (!h || h.from !== projectId) return;
      if (String(h.year) !== wanted) return;
      var images = Array.isArray(h.images) ? h.images.filter(Boolean) : [];
      for (var i = 0; i < images.length; i++) {
        if (out.indexOf(images[i]) === -1) out.push(images[i]);
      }
    });
    return out;
  }
  globalThis.Site.awardPhotos = awardPhotos;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node tests/award-photos.test.mjs; node tests/lights.test.mjs`
Expected: PASS both.

- [ ] **Step 6: Commit**

```bash
git add js/data.js tests/award-photos.test.mjs tests/lights.test.mjs
git commit -m "feat(label): resolve a project's award photographs, and the walk's progress"
```

---

### Task 2: The shell — sticky header element and dock progress element

**Files:**
- Modify: `index.html:49-50`
- Test: `tests/shell-check.mjs`

**Interfaces:**
- Produces: `#roomRail` and `#dockProgress` in the shell; `#rail` removed. Tasks 3 and 5 read them.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

In `tests/shell-check.mjs`, find the `required` id table near line 41 and add `roomRail` and `dockProgress`, then add:

```js
ok('the shell has a sticky room rail, hidden from assistive tech',
  /<header class="room-rail"[^>]*id="roomRail"[^>]*aria-hidden="true"/.test(html),
  'the shell has no aria-hidden #roomRail');

ok('the shell has no progress rail outside the dock',
  !/class="rail"/.test(html),
  'the old #rail is still in the shell — the progress belongs inside the dock');

ok('the dock progress is inside the dock',
  /<nav class="dock"[\s\S]*id="dockProgress"[\s\S]*<\/nav>/.test(html),
  'the progress bar is not inside .dock');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/shell-check.mjs`
Expected: FAIL — `the shell has no aria-hidden #roomRail`.

- [ ] **Step 3: Edit `index.html`**

Replace the existing `#directory` / `#rail` pair with the rail, the dock, and the progress inside it. The dock's `#dockProgress` must be the dock's last child so it lays out as a second row beneath the buttons:

```html
    <!-- The sticky rail names the area the walk is standing in. Its text is
         written by initLights() on the same room-change path that moves the
         dock, so the two cannot disagree. aria-hidden: #announcer already
         announces every room change, and a second announcement is a duplicate. -->
    <header class="room-rail" id="roomRail" aria-hidden="true">
      <span class="rr-title"></span>
      <span class="rr-meta"></span>
    </header>

    <!-- The only navigation: the walk's directory at its foot, with the walk's
         progress filling inside the dock box rather than along the screen edge.

         #directory and #dockProgress are SIBLINGS inside the dock, and that is
         load-bearing: renderDock() writes #directory.innerHTML, which destroys
         every child node it has, so a progress bar placed inside #directory
         would be wiped on every render. #directory is a plain div and not a
         span — it holds an <ol> of buttons, which a span may not contain. -->
    <nav class="dock" aria-label="Rooms">
      <div class="dock-links" id="directory"></div>
      <div class="dock-track" id="dockProgress" aria-hidden="true"></div>
    </nav>
```

Remove the old `<div class="rail" id="rail" aria-hidden="true"></div>` line. `renderDock()` and `markCurrentRoom()` both key on `#directory` and need no change: `#directory` is still the element whose `innerHTML` carries the dock's controls, and `#dockProgress` is outside it.

`tests/dom-harness.mjs` reads `#directory` as a node, not as the `<nav>`, so nothing there breaks; it does need `dockProgress` and `roomRail` added to its id list (Task 7).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/shell-check.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/shell-check.mjs
git commit -m "feat(shell): a sticky room rail, and the walk's progress inside the dock"
```

---

### Task 3: The sticky rail and the dock progress, driven by the walk

**Files:**
- Modify: `js/main.js` — `initLights()` (lines ~1291-1425), `renderDock()` (lines ~1261-1281)
- Test: `tests/renderer.test.mjs:789-796`

**Interfaces:**
- Consumes: `Site.progressFraction`, `Site.roomAtOffset`, `#roomRail`, `#dockProgress` from Tasks 1 and 2.
- Produces: `Site.updateProgress()` (renamed from `Site.updateRail`, so a stale caller is a visible failure), `Site.roomAtOffset`-driven rail text. Task 5 relies on `renderDock()` leaving `#dockProgress` in the DOM.

- [ ] **Step 1: Write the failing test**

In `tests/renderer.test.mjs`, replace the `rail is in the shell` check (lines 789-796) with:

```js
check('the progress bar is the dock\'s own, and the old rail is gone', () => {
  const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(shell, /id="dockProgress"[\s\S]*<\/nav>/,
    'the progress bar is not inside the dock');
  assert.ok(!/class="rail"/.test(shell), 'the old edge rail is still in the shell');
  assert.ok(!/class="directory"/.test(shell), 'the top directory band is still in the shell');
});

check('the progress bar survives a dock render', () => {
  /* renderDock() writes #directory.innerHTML, which destroys every child node
     it has. The progress bar is #directory's SIBLING inside .dock for exactly
     this reason, and this is the check that it stays that way. */
  const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dock = shell.match(/<nav class="dock"[\s\S]*?<\/nav>/);
  assert.ok(dock, 'no .dock in the shell');
  const dirAt = dock[0].indexOf('id="directory"');
  const progAt = dock[0].indexOf('id="dockProgress"');
  assert.ok(dirAt >= 0 && progAt >= 0, 'the dock is missing #directory or #dockProgress');
  assert.ok(progAt > dirAt, '#dockProgress is inside #directory and will be wiped by renderDock');
});
```

Note this check reads the shell and is therefore static: it cannot prove `renderDock()` leaves
the node alone at runtime. What proves that is `tests/dom-harness.mjs`'s `#dockProgress` node
surviving a `renderDock()` call, which `tests/renderer.test.mjs` already exercises on load —
`globalThis.Site.walk` being exposed at the end of that file means `init()` ran, and `init()`
calls `renderDock()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — the shell assertions pass from Task 2, but there is no `Site.updateProgress` and nothing writes the rail.

- [ ] **Step 3: Implement**

In `js/main.js`, inside `initLights()`, replace `updateRail()` with `updateProgress()` and add the rail write to `announceRoom()`. The rail is written **only when the room changes**, exactly as the announcer is, so scrolling does not rewrite the DOM dozens of times a second:

```js
    var roomRail = document.getElementById('roomRail');
    var dockProgress = document.getElementById('dockProgress');

    /* The rail's two lines, read from the room element so the rail cannot drift
       from the heading it duplicates. Written on room CHANGE only — the same
       condition the announcer uses — so this is two DOM writes per boundary
       crossed, not per frame. */
    function writeRail(roomEl) {
      if (!roomRail || !roomEl) return;
      var title = roomEl.querySelector('.room-title .t');
      var sub = roomEl.querySelector('.room-title .sub');
      var t = roomRail.querySelector('.rr-title');
      var m = roomRail.querySelector('.rr-meta');
      if (t) t.textContent = (title && title.textContent) || '';
      if (m) m.textContent = (sub && sub.textContent.replace(/\s+/g, ' ').trim()) || '';
    }

    /* The walk's progress, inside the dock. Replaced #rail, which drew the same
       fraction as a line along the screen's own edge. The element is the TRACK;
       its ::after is the filled part, so this writes the fraction as a custom
       property rather than sizing the element itself — sizing the track would
       make the bar shrink out from under its own background. */
    function updateProgress() {
      if (!dockProgress) return;
      var v = Site.progressFraction(hall.scrollLeft, hall.scrollWidth, hall.clientWidth);
      dockProgress.style.setProperty('--walk-progress', (v * 100) + '%');
    }
    Site.updateProgress = updateProgress;
```

In `announceRoom()`, inside the `if (name && name !== lastRoom)` branch, after `markCurrentRoom(...)`, add `writeRail(r);`.

In `trackScroll()`, replace `updateRail();` with `updateProgress();`.

**`renderDock()` must not wipe the progress bar.** Move `#dockProgress` out of `#directory` in `index.html` and make the dock a positioned container instead: put `#dockProgress` as a sibling *inside* `.dock` but *after* `#directory`, so `renderDock()`'s `dir.innerHTML` write cannot reach it. The final shell shape is:

```html
    <nav class="dock" aria-label="Rooms">
      <span class="dock-links" id="directory"></span>
      <span class="dock-track" id="dockProgress" aria-hidden="true"></span>
    </nav>
```

This changes `#directory` from the `<nav>` to a `<span>` inside it. `renderDock()` and `markCurrentRoom()` both key on `#directory`, so neither needs a code change — but `tests/renderer.test.mjs`'s dock checks read `directory.innerHTML`, which still works, and `tests/dom-harness.mjs` needs `dockProgress` added to its id list (Task 8).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/renderer.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html js/main.js tests/renderer.test.mjs
git commit -m "feat(walk): drive the sticky rail and the dock's progress from the scroll"
```

---

### Task 4: The label's copy — account, awards, team caption

**Files:**
- Modify: `js/main.js` — `renderLabel()` (lines ~1053-1075), `labelNarrative()` (lines ~953-960), `renderAwardsControl()` (lines ~1038-1047)
- Modify: `css/styles.css` — `.narr-*`, `.label-awards`, `.cat` (lines ~2200-2300)
- Test: `tests/renderer.test.mjs:316-600`

**Interfaces:**
- Consumes: `Site.awardPhotos`, `PORTFOLIO.honors` from Task 1.
- Produces: `labelAccount(record) -> string[]`, `renderAwards(record) -> string`, `renderTeam(record) -> string`, and the classes `.label-account` (one `<p>` per paragraph), `.awards`, `.award`, `.team`, `.team-line`. Task 5 styles them; Task 7 opens the galleries they reference.

- [ ] **Step 1: Write the failing tests**

In `tests/renderer.test.mjs`, replace the plan assertions (`every group carries a plan…` at 321, `the plan and the catalogue carry the letters…` at 371, `the plan is hidden from assistive tech` at 436, `the label reads plan, narrative, catalogue — in that order` at 444, `the plan draws the arrangement the wall hangs` at 461) with:

```js
check('every group carries a full account, not a one-line narrative', () => {
  const groups = [...strip.matchAll(/<div class="group"[\s\S]*?(?=<div class="group"|<\/section>)/g)].map((m) => m[0]);
  assert.ok(groups.length, 'no groups rendered');
  const bad = [];
  groups.forEach((g, i) => {
    if (!/class="label-account"/.test(g)) bad.push('group ' + i + ': no account block');
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  assert.ok(!/class="plan"/.test(strip), 'the retired plan diagram is still rendered');
});

check('the account is the record\'s own overview, paragraph for paragraph', () => {
  const p = PORTFOLIO.projects.find((x) => x.overview && x.overview.text.includes('\n\n'));
  assert.ok(p, 'fixture needs a project whose overview has more than one paragraph');
  const paras = p.overview.text.split('\n\n');
  const group = groupHtmlFor(p.title);
  const rendered = [...group.matchAll(/<p class="acct-p">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  assert.equal(rendered.length, paras.length,
    p.title + ' rendered ' + rendered.length + ' of ' + paras.length + ' paragraphs');
  paras.forEach((t, i) => assert.ok(rendered[i].includes(t.slice(0, 40)),
    p.title + ' paragraph ' + i + ' does not match the data'));
});

check('the account is not line-clamped', () => {
  /* Spec §6.3 and §10.3: the four-line clamp is what hid the account, and a
     silent reintroduction would hide it again with every unit check green. */
  const css = readFileSync('css/styles.css', 'utf8');
  const block = css.match(/\.label-account[^{]*\{[^}]*\}/g) || [];
  const clamped = block.filter((b) => /line-clamp/.test(b));
  assert.deepEqual(clamped, [], 'a label block is line-clamped again');
  const css2 = readFileSync('css/styles.css', 'utf8');
  assert.ok(!/\.narr-text/.test(css2), '.narr-text still exists — the clamp was to live there');
});

check('every project award is on the wall with its year', () => {
  const withAwards = PORTFOLIO.projects.filter((p) => Array.isArray(p.awards) && p.awards.length);
  assert.ok(withAwards.length > 0, 'fixture needs a project with awards');
  const bad = [];
  withAwards.forEach((p) => {
    const group = groupHtmlFor(p.title);
    if (!/class="awards"/.test(group)) { bad.push(p.title + ': no awards block'); return; }
    p.awards.forEach((a) => {
      if (!group.includes(a.description)) bad.push(p.title + ': "' + a.description + '" is not on the wall');
      if (!group.includes(a.year)) bad.push(p.title + ': award year ' + a.year + ' is not on the wall');
    });
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  assert.ok(!/data-tab="awards"/.test(strip), 'a project award still opens a dialog');
});

check('an award with photographs is a control, and one without is not', () => {
  /* Six real photographs hang off `from`-tagged honours that the Honours room
     excludes, so an award that resolves to them MUST be a control. An award
     that resolves to nothing must NOT be — a focusable control that opens
     nothing is worse than a row that plainly is not one. */
  const awards = [...strip.matchAll(/<li class="award"([^>]*)>/g)].map((m) => m[1]);
  assert.ok(awards.length > 0, 'no awards rendered on the wall');
  const withPhotos = awards.filter((a) => /data-gallery=/.test(a));
  const without = awards.filter((a) => !/data-gallery=/.test(a));
  assert.ok(withPhotos.length > 0,
    'no award with photographs is a control — six photographs are unreachable');
  assert.ok(without.length > 0, 'every award is a control, including the photo-less ones');
  /* And the count is right: exactly the awards that Site.awardPhotos resolves,
     asked PER AWARD — that is what makes 3 controls and 5 plain text correct
     rather than 8 controls and 0. */
  let expected = 0, total = 0;
  PORTFOLIO.projects.forEach((p) => {
    (p.awards || []).forEach((a) => {
      total++;
      if (Site.awardPhotos(p.id, PORTFOLIO.honors, a).length) expected++;
    });
  });
  assert.equal(awards.length, total, 'the wall does not carry every award');
  assert.equal(withPhotos.length, expected,
    withPhotos.length + ' award controls for ' + expected + ' awards that have photographs');
});

check('every team caption is on the wall', () => {
  const withTeam = PORTFOLIO.projects.filter((p) => p.team && Array.isArray(p.team.text) && p.team.text.length);
  assert.ok(withTeam.length > 0, 'fixture needs a project with a team caption');
  const bad = [];
  withTeam.forEach((p) => {
    const group = groupHtmlFor(p.title);
    if (!/class="team"/.test(group)) { bad.push(p.title + ': no team block'); return; }
    p.team.text.forEach((line) => {
      if (!group.includes(line)) bad.push(p.title + ': team line missing — ' + line.slice(0, 40));
    });
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('every shipped project shows its full account on the wall', () => {
  /* The whole point of this work: no project's story is behind a control. */
  const bad = [];
  PORTFOLIO.projects.forEach((p) => {
    const group = groupHtmlFor(p.title);
    if (!group) { bad.push(p.title + ': no group on the wall'); return; }
    const want = p.overview && p.overview.text;
    if (!want) { bad.push(p.title + ': no overview in the data'); return; }
    if (!group.includes(want.split('\n\n')[0].slice(0, 40))) {
      bad.push(p.title + ': the account is not rendered');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});
```

`groupHtmlFor(title)` is a small helper to add near the top of that file: it finds the top-level
group whose rendered text carries the title. Implement it by splitting on the group opening tag
and, **for every part after the first, stripping its leading tag name** — because splitting on
`<div class="group"` leaves the remainder of that opening tag (its attributes and closing `>`)
at the head of the NEXT part, and the honours wall hangs the tiles as `<li>` elements between
the groups:

```js
/* The body of the top-level group whose text carries `title`. Splitting on the
   group opening tag leaves the previous tag's attributes at the head of each
   part, so drop up to the first '>' in every part but the first. */
function groupHtmlFor(title) {
  const parts = strip.split('<div class="group"').slice(1);
  for (let i = 0; i < parts.length; i++) {
    let body = parts[i];
    if (i > 0) body = body.slice(body.indexOf('>') + 1);
    const end = body.indexOf('<div class="group"');
    if (end !== -1) body = body.slice(0, end);
    if (body.includes('>' + title + '<')) return body;
  }
  return '';
}
```

The label's title renders as `<p class="narr-title">Project PALAD</p>`, so `'>' + title + '<'`
matches it. The group's opening `<div>` cannot match, because it is not inside its own body.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — `group 0: no account block`, `the retired plan diagram is still rendered`.

- [ ] **Step 3: Implement the label's copy**

In `js/main.js`, replace `labelNarrative()` with:

```js
  /* The account is the record's own words, paragraph for paragraph. This is the
     one field with the real story, and until now nothing on the walk rendered
     it: labelNarrative() returned `summary` and stopped. */
  function labelAccount(record) {
    var text = record && record.overview && record.overview.text;
    if (typeof text === 'string' && text.trim()) {
      return text.split('\n\n').map(function (t) { return t.trim(); }).filter(Boolean);
    }
    if (record && record.summary) return [record.summary];
    return [];
  }
```

Replace `renderAwardsControl(record)` with `renderAwards(record)`:

```js
  /* A project's awards, read on the wall. They used to be a button into a
     dialog, which made eight awards invisible to a visitor who did not press
     it. An award that has photographs is a real control opening them in the
     photograph dialog — those honours are excluded from the Honours room, so
     without this their six photographs would be unreachable. One without is
     plain text, as a photo-less honours tile already is.

     `Site.awardPhotos` is asked PER AWARD, inside the loop, and the award is
     passed as its third argument. Asking it once for the whole project hands
     every award the project's entire photograph set, which makes the five
     photo-less awards into controls opening a DIFFERENT win's photographs —
     the "focusable control that opens nothing" failure this comment's rule
     exists to prevent. Correct split: 3 controls, 5 plain text. */
  function renderAwards(record) {
    if (!record || !Array.isArray(record.awards) || !record.awards.length) return '';
    var items = record.awards.map(function (a) {
      var photos = (typeof Site.awardPhotos === 'function')
        ? Site.awardPhotos(record.id, PORTFOLIO.honors, a) : [];
      var open = photos.length
        ? ' data-open-award-photos="' + esc(record.id) + '"'
          + ' data-open-award-year="' + esc(a.year || '') + '"'
          + ' role="button" tabindex="0"'
        : '';
      var year = a.year ? '<span class="award-year">' + esc(a.year) + '</span>' : '';
      return '<li class="award"' + open + '>'
        + '<span class="award-desc">' + esc(a.description || '') + '</span>'
        + year + '</li>';
    }).join('');
    return '<div class="awards">'
      + '<p class="awards-head">Awards · ' + record.awards.length + '</p>'
      + '<ul class="award-list">' + items + '</ul></div>';
  }
```

Add `renderTeam(record)`:

```js
  /* The team photo's caption is the only thing on the walk that names who is in
     the picture, and it was behind a button. */
  function renderTeam(record) {
    var t = record && record.team;
    if (!t || !Array.isArray(t.text) || !t.text.length) return '';
    return '<div class="team"><p class="team-head">Team</p>'
      + t.text.map(function (line) {
          return '<p class="team-line">' + esc(line) + '</p>';
        }).join('')
      + '</div>';
  }
```

Rewrite `renderLabel()` to emit the account, the summary as its opening line, and the two blocks. The catalogue and the photograph count stay exactly as they are:

```js
  function renderLabel(record, pieces, layout) {
    var list = Array.isArray(pieces) ? pieces : [];
    var photographs = list.filter(function (p) { return !p.awaited; }).length;
    var title = labelTitle(record);
    var meta = labelMeta(record);
    var account = labelAccount(record);
    return '<div class="label">'
      + '<div class="label-copy">'
      + '<div class="narr">'
      + '<p class="narr-title">' + esc(title) + '</p>'
      + (meta ? '<p class="narr-meta">' + esc(meta)
          + (photographs
              ? ' · ' + photographs + ' photograph' + (photographs === 1 ? '' : 's')
              : '') + '</p>' : '')
      + (record.summary ? '<p class="narr-lead">' + esc(record.summary) + '</p>' : '')
      + '<div class="label-account">'
      + account.map(function (t) {
          return '<p class="acct-p">' + esc(t) + '</p>';
        }).join('')
      + '</div>'
      + '</div>'
      + renderAwards(record)
      + '</div>'
      + '<div class="label-aside">' + renderTeam(record) + '</div>'
      + '<div class="cat">' + renderCatalogue(record, list) + '</div>'
      + '</div>';
  }
```

Delete `renderPlan()` and its call. **Drop the now-unused `layout` parameter from
`renderLabel`** rather than leaving it: change the signature to
`renderLabel(record, pieces)` and update `renderGroup()`'s call and the test helper
`renderLabelFor` (used by several checks in `tests/renderer.test.mjs`) to match. A parameter
nothing reads is a lie about the function's inputs.

**Four existing checks read markup this task removes and must be rewritten in the same step.**
They are in `tests/renderer.test.mjs`:

| Line | Currently asserts | Rewrite to |
|---|---|---|
| 517-518 | `html.split('class="narr-text"')[0]` has no "photographs" | split on `class="label-account"` — the meta line is above the account, so the assertion keeps its meaning |
| 522-527 | `a record with no summary still renders a narrative` | assert the account falls back to the record's own description: `class="acct-p">[^<]*Some Award` |
| 321-336 | `every group carries a plan, a narrative and a catalogue` | covered by the new `every group carries a full account…` check above |
| 592+ | `no label falls back to a derived narrative` | `.narr-lead` replaces `narr-text` as the place the summary lands; a record with no `summary` must still render its description somewhere |

Delete or rewrite line 361's `no frame on the wall carries a letter` **comment** too: it
justifies the clean frame by saying "the plan draws the same hang", which is no longer true.
The assertion itself stays — the catalogue still carries the letters.

The check at line 371, `the plan and the catalogue carry the letters, and cover every frame`,
must be replaced: the plan is gone, so the letters now exist only in the catalogue. Replace it
with a check that every hung photograph has exactly one catalogue entry, keyed on its piece
index:

```js
check('the catalogue letters every photograph, once each, in piece order', () => {
  const range = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const keys = [...body.matchAll(/<span class="ce-key">([A-Z])<\/span>/g)].map((m) => m[1]);
    const entries = (body.match(/class="cat-entry"/g) || []).length;
    if (keys.length !== entries) {
      bad.push('group ' + i + ': ' + keys.length + ' letters for ' + entries + ' entries');
    }
    const want = range(entries);
    if (JSON.stringify(keys) !== JSON.stringify(want)) {
      bad.push('group ' + i + ': letters ' + keys.join('') + ', expected ' + want.join(''));
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});
```

In `css/styles.css`, delete `.narr-text`, `.label-awards`, and `.label-awards i` / `:hover` / `:focus-visible`, and the `.plan`, `.pcol`, `.plan i`, `.plan .pi`, `.plan .pi-lead` rules. Add:

```css
/* The account: the record's own words. NOT clamped — the four-line clamp this
   replaces is what hid the copy this build exists to show (spec §6.3). */
.label-account { min-width: 0; }
.acct-p {
  font-size: clamp(13px, 0.88vw, 15px);
  line-height: 1.45;
  color: var(--text);
  margin: 0 0 8px;
  max-width: var(--label-measure, 56ch);
}
.acct-p:last-child { margin-bottom: 0; }

.narr-lead {
  font-size: clamp(13px, 0.9vw, 15px);
  line-height: 1.4;
  color: var(--text-strong);
  margin: 6px 0 0;
  max-width: var(--label-measure, 56ch);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/renderer.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/main.js css/styles.css tests/renderer.test.mjs
git commit -m "feat(label): read the account, the awards and the team caption on the wall"
```

---

### Task 5: The stand — a picture band above a full-width label

**Files:**
- Modify: `css/styles.css` — `:root` tokens (lines ~164-174), `.group` (1937), `.cluster` (1963), `.col` (1988), `.piece` (2025), `.label` (2136), `.narr-*` (2204)
- Modify: `js/main.js` — `renderRooms()` (lines ~1147-1196), `renderGroup()` (line ~929)

**Interfaces:**
- Consumes: the label markup from Task 4.
- Produces: `--frame-h`, `--label-measure`, `--stand-w` tokens; a two-band `.group`; `data-snap` on every `.group`; the `.room-rail` and `.dock-track` rules Tasks 3 and 7 read. Tasks 6 and 7 measure and tune these.

- [ ] **Step 1: Replace the three dials**

In `css/styles.css`'s `:root`, delete `--max-panel-h` (line 164), `--band-h` (165) and `--label-w` (173), and add:

```css
  /* ── The stand's three dials ─────────────────────────────────────────────
     --frame-h is how large a photograph reads, and it is the headline answer
     to "pictures smaller, text equal": down from a 260px cap to 96-140px.
     --label-measure is the account's line length, which is what keeps prose
     readable once the label is as wide as the stand.
     --stand-w is the stand's own width, and it is what stops a wider label
     making the walk longer: the label is this wide whatever the copy says. */
  --frame-h:      clamp(96px, 11vh, 140px);
  --label-measure: clamp(46ch, 52ch, 60ch);
  --stand-w:      clamp(1040px, 64vw, 1320px);
```

- [ ] **Step 2: The two-band stand**

First, retarget the dock and add the two new pieces of chrome. `.dock` currently lays its
contents out as a row of controls; it becomes a column so the progress bar sits beneath
them, while `.dock-links` takes over the row behaviour the dock used to have:

```css
.dock {
  /* Was a single flex row. It is a column now: the links, then the track. */
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

/* The row of room controls, which is what .dock used to be. */
.dock-links {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.dock-links::-webkit-scrollbar { display: none; }
.dock-links ol { list-style: none; display: flex; align-items: center; gap: 4px; }

/* ── The walk's progress, inside the dock ────────────────────────────────
   It replaced #rail, which drew the same fraction as a hairline along the
   screen's own edge, outside this box. Filling from the dock's left edge on
   total walk progress means it sits about halfway across the Robotics button
   when the walk is halfway through Robotics. It is NOT one bar per button:
   the buttons are sized by their labels, not by how much walk each area
   occupies, so a per-button bar would misreport total progress. */
/* #dockProgress is itself the track: the filled part is its ::after, whose
   width is the --walk-progress initLights() writes on the element. */
.dock-track {
  display: block;
  height: 2px;
  margin-top: 5px;
  background: var(--edge-soft);
  position: relative;
}
.dock-track::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--walk-progress, 0%);
  background: var(--accent);
}

/* ── The sticky room rail ────────────────────────────────────────────────
   Names the area the walk is standing in, at the head of the screen. It is
   the one element fixed over a room; a title pinned over a hang was rejected
   when it was a second copy of a heading already on the wall, and this is not
   that — it is the only way to know which area an 8,700px wall belongs to. */
.room-rail {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 950;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 13px clamp(18px, 2.4vw, 34px) 11px;
  background: linear-gradient(180deg, rgba(8, 12, 14, .92), rgba(8, 12, 14, 0));
  pointer-events: none;
}
.rr-title {
  font-family: var(--font-heading);
  font-size: clamp(15px, 1.05vw, 19px);
  color: var(--text-strong);
}
.rr-meta {
  font-family: var(--font-mono);
  font-size: clamp(9.5px, 0.6vw, 11px);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-quiet);
}
```

`.room`'s `padding-top` must clear the rail: raise it from `36px` to `58px` (the measured
rail height, 52px, plus 6px).

Replace `.group`:

```css
/* A stand is two bands: the pictures above, the label beneath at the stand's
   full width. It was a row, with the label as a 320-380px column beside the
   hang; at that width the account is clamped to four lines and the catalogue
   is pushed past the fold. A full-width label is what lets the copy be read. */
.group {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: var(--stand-w);
  max-width: var(--stand-w);
  min-height: 0;
  /* Nothing may paint outside its own stand. */
  overflow: hidden;
}
```

Replace `.label`:

```css
.label {
  flex: 0 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.62fr);
  grid-template-areas:
    "copy  aside"
    "cat   cat";
  column-gap: clamp(20px, 2.4vw, 40px);
  row-gap: 14px;
  border-top: 1px solid var(--edge);
  padding-top: 10px;
}
.label-copy  { grid-area: copy;  min-width: 0; }
.label-aside { grid-area: aside; min-width: 0; }
.cat         { grid-area: cat;   min-width: 0; }
```

Add the picture band and the awards/team blocks:

```css
/* The picture band. The cluster no longer has a column budget to fit beside a
   label, so a frame's height is simply --frame-h and its width still follows
   its own photograph — nothing is cropped and nothing is letterboxed. */
.cluster { align-items: flex-start; }
.col { max-width: none; }
.piece { height: var(--frame-h); }
.piece--lead { max-height: var(--frame-h); }
.piece--pending { width: auto; aspect-ratio: 3 / 2; height: var(--frame-h); }

.awards { min-width: 0; }
.awards-head, .team-head {
  font-family: var(--font-mono);
  font-size: clamp(10px, 0.62vw, 11.5px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 7px;
}
.award-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.award { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
/* Only an award that has photographs is a control, so only it gets the cue. */
.award[role="button"] { cursor: pointer; padding: 5px 7px; margin: -5px -7px; }
.award[role="button"]:hover .award-desc,
.award[role="button"]:focus-visible .award-desc { color: var(--text-strong); }
.award-desc { font-size: clamp(12px, 0.82vw, 13.5px); line-height: 1.3; color: var(--text); }
.award-year {
  font-family: var(--font-mono);
  font-size: clamp(10px, 0.6vw, 11px);
  letter-spacing: 0.06em;
  color: var(--text-quiet);
}
.team { min-width: 0; }
.team-line { font-size: clamp(11.5px, 0.78vw, 13px); line-height: 1.35; color: var(--text-quiet); margin: 0 0 5px; }
```

- [ ] **Step 3: Reduce the gap, and move the snap targets to the stands**

`--group-gap` (line 174) is currently `clamp(200px, 46vw, 760px)`. A stand now fills most of a screen, so half a screen of bare wall between stands makes the walk a corridor. **Measure rather than guess** — see Step 4 — and set the result here.

In `js/main.js`, `renderRooms()`, add `data-snap` to each project group's section. The rooms keep their own `data-snap` for About and Contact. In `renderGroup()` (line ~929), add `data-snap` to the `.group` div:

```js
    return '<div class="group" data-group data-snap data-kind="' + esc(kind) + '"'
```

`tests/dom-harness.mjs` returns `roomEls` for `[data-snap]`; update it in Task 8 to return group elements as well, or the walk's snap targets will silently be rooms only.

- [ ] **Step 4: Measure the gap**

Needs headless Chrome and a session with the sandbox off. Serve the site and run:

```powershell
node tools/serve.mjs 3333
node tools/stand-gap.mjs 1920 1080
```

Set `--group-gap` to the smallest value at which no stand's neighbour is in shot when a stand is centred, then re-run at the spec's floor:

```powershell
node tools/stand-gap.mjs 1280 704
```

Record both measured values in the commit message. **Do not commit a guessed value.**

- [ ] **Step 5: Run the unit suites**

Run: `npm test`
Expected: PASS, except any suite that asserts the old geometry. Those are Tasks 6-8.

- [ ] **Step 6: Commit**

```bash
git add css/styles.css js/main.js
git commit -m "feat(stand): pictures as a band above a full-width label

--group-gap measured at 1920x1080 and at 1280x704 via tools/stand-gap.mjs"
```

---

### Task 6: Delete the Overview, Team and Awards dialogs

**Files:**
- Modify: `js/main.js` — `openModal()` (482-523), the delegated handler (557-569), `groupOpener()` (901-915)
- Modify: `css/styles.css` — `.modal-scroll`, `.modal-image-wrap`, `.label-awards`
- Test: `tests/delegation.test.mjs`, `tests/shell-check.mjs:454`

**Interfaces:**
- Consumes: `Site.awardPhotos` (Task 1), the award markup from Task 4.
- Produces: `data-open-award-photos` as the delegated hook for an award's photographs. `groupOpener()` returns a gallery reference for a project piece instead of a modal one.

- [ ] **Step 1: Write the failing tests**

In `tests/delegation.test.mjs`, replace the `a project work opens the dialog when clicked` check and its fixture's `data-action="modal"`/`data-tab` attributes (lines 226-230 of `tests/dom-harness.mjs`) with checks that a project piece opens **photographs**, and add:

```js
check('a project work opens its own photographs, not a dialog about it', () => {
  /* The Overview dialog is gone: a project's account is on the wall. What is
     left for a piece to open is the project's photographs. */
  const button = workEls.find((w) => w.canvas.getAttribute('data-gallery')).canvas;
  assert.ok(button, 'a project piece carries no gallery reference');
  scene.click(button);
  assert.ok(modal.classList.contains('active'),
    'clicking the project piece left the photograph dialog closed');
  scene.click(scene.el('modalClose'));
});

check('an award with photographs opens them from the wall', () => {
  const award = scene.el('awardWithPhotos');
  assert.ok(award, 'no award with photographs was rendered');
  scene.click(award);
  assert.ok(modal.classList.contains('active'),
    'clicking an award with photographs opened nothing');
  scene.click(scene.el('modalClose'));
});

check('no project control opens a description or awards dialog', () => {
  const walk = readFileSync('js/main.js', 'utf8');
  assert.ok(!/data-action="modal"/.test(walk),
    'a modal trigger is still emitted — the Overview/Team/Awards dialogs were to be deleted');
  assert.ok(!/function openModal/.test(walk), 'openModal still exists');
});
```

In `tests/shell-check.mjs`, delete the `walkRequired` entry asserting `data-action="modal"` is delegated from `document` (line ~454), and replace it with:

```js
ok('the award-photograph trigger is delegated from document',
  /document\.addEventListener\('click',[\s\S]{0,600}data-open-award-photos/.test(main),
  'the award-photograph trigger is not delegated from document');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/delegation.test.mjs; node tests/shell-check.mjs`
Expected: FAIL — `openModal still exists`, `a modal trigger is still emitted`.

- [ ] **Step 3: Implement**

In `js/main.js`:

1. Delete `openModal()` entirely.
2. In the document click delegation, replace the `data-action="modal"` branch with:

```js
    var awardBtn = t.closest('[data-open-award-photos]');
    if (awardBtn) {
      var projectId = awardBtn.getAttribute('data-open-award-photos');
      var year = awardBtn.getAttribute('data-open-award-year');
      var photos = Site.awardPhotos(projectId, PORTFOLIO.honors, year);
      if (photos.length) openGalleryImages(photos, projectAwardTitle(projectId));
      return;
    }
```

3b. **Wire the keyboard.** An award is a `<li role="button" tabindex="0">`, not a `<button>` — it is an `<li>` because it is an item in a list, and a `<button>` there would be invalid inside `<ul>`. A `tabindex="0"` element does NOT activate on Enter or Space the way a real button does, so without this the award is focusable and does nothing: a control a keyboard visitor can reach and cannot use. Add a keydown delegation beside the click one:

```js
  /* An award is a list item with role="button", because a <button> may not be a
     child of <ul>. tabindex="0" makes it focusable but does NOT make Enter and
     Space activate it the way a real button does — so without this, the award is
     reachable by keyboard and does nothing when pressed. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = e.target;
    if (!t || !t.closest) return;
    var awardBtn = t.closest('[data-open-award-photos]');
    if (!awardBtn) return;
    e.preventDefault();
    var projectId = awardBtn.getAttribute('data-open-award-photos');
    var year = awardBtn.getAttribute('data-open-award-year');
    var photos = Site.awardPhotos(projectId, PORTFOLIO.honors, year);
    if (photos.length) openGalleryImages(photos, projectAwardTitle(projectId));
  });
```

3. Add `openGalleryImages(images, title)`, extracted from `openGallery()` so the carousel can be driven from an images array rather than only from `Site.galleryFor`:

```js
  /* The carousel, driven from an images array. openGallery() resolves its images
     through Site.galleryFor; an award's photographs are resolved through
     Site.awardPhotos, so both funnel here rather than duplicating the markup. */
  function openGalleryImages(images, title) {
    if (!$modalOverlay || !$modalHeader || !$modalImage || !$modalBody) return;
    var list = (Array.isArray(images) ? images : []).filter(Boolean);
    if (!list.length) return;
    galleryState.images = list;
    galleryState.current = 0;
    $modalHeader.innerHTML = '<h3 id="modalTitle">' + esc(title) + '</h3>';
    $modalImage.style.display = '';
    $modalImage.innerHTML = buildGalleryMarkup(list, title);
    $modalBody.innerHTML = '';
    bindGalleryControls();
    updateGalleryUI();
    openDialog();
    startGalleryDrift();
  }
```

Rewrite `openGallery()` to resolve through `Site.galleryFor` and then call `openGalleryImages` with the subtitle it needs, and add `projectAwardTitle(projectId)` returning `` <project title> — Awards ``.

4. In `groupOpener()`, the project branch becomes a gallery reference to the project's own photographs. `groupOpener(kind, record, entryIndex, piece)` already receives `entryIndex`, and `renderGroup()` builds it as `roomKey + ':' + index`, so return:

```js
      return {
        attrs: ' data-gallery="project" data-entry="' + esc(entryIndex) + '"',
        name: 'Open ' + (record.title || 'project') + '\u2019s photographs'
      };
```

A project's photographs are per-index across six rooms, so they cannot go in `GALLERY_LISTS`
(which maps a kind to one flat array). `galleryFor` gains a `project` branch that resolves the
`<roomKey>:<index>` reference against the derived rooms. **Note it calls the local
`groupPieces` and the local `awardPhotos`, not `Site.groupPieces`/`Site.awardPhotos`** — inside
this IIFE `globalThis.Site` is assigned at the bottom of each function's own block, and it is
not in scope as a reliable reference during the IIFE's own execution:

```js
  function galleryFor(kind, entryIndex) {
    var empty = { title: '', meta: '', images: [] };
    if (kind === 'project') {
      var ref = String(entryIndex == null ? '' : entryIndex);
      var at = ref.indexOf(':');
      if (at < 1) return empty;
      var roomKey = ref.slice(0, at);
      var idx = Number(ref.slice(at + 1));
      if (!Number.isInteger(idx) || idx < 0) return empty;
      var room = deriveRooms(PORTFOLIO.projects).filter(function (r) {
        return r.key === roomKey;
      })[0];
      var proj = room && room.projects[idx];
      if (!proj) return empty;
      var imgs = groupPieces(proj, 'project')
        .filter(function (p) { return !p.awaited; })
        .map(function (p) { return p.src; })
        /* A PROJECT's gallery, not one award's: iterate the project's awards and
           take each one's photographs. Passing no third argument would also work
           but reads as if the function were project-level, which it is not. */
        .concat((proj.awards || []).reduce(function (acc, a) {
          return acc.concat(awardPhotos(proj.id, PORTFOLIO.honors, a));
        }, []));
      /* Deduplicated: a project's overview image and one of its award
         photographs are different files today, but nothing in the data
         guarantees that, and a repeated slide would read as a defect. */
      var seen = [];
      imgs.forEach(function (src) { if (src && seen.indexOf(src) === -1) seen.push(src); });
      return { title: proj.title || '', meta: proj.venue || '', images: seen };
    }
    var get = GALLERY_LISTS[kind];
    /* …unchanged from here… */
  }
```

`deriveRooms`, `groupPieces` and `awardPhotos` are all functions declared earlier in the same
IIFE, so they are in scope by name.

5. In `css/styles.css`, delete `.modal-scroll`, `.modal-image-wrap` and the `.label-awards` family.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/delegation.test.mjs; node tests/shell-check.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/data.js css/styles.css tests/delegation.test.mjs tests/shell-check.mjs
git commit -m "feat(label): delete the description, team and awards dialogs"
```

---

### Task 7: Point the geometry tools at the two-band stand

**Files:**
- Modify: `tools/label-fit.mjs`, `tools/stand-fit.mjs`, `tools/stand-overflow.mjs`, `tools/avg-frame.mjs`, `tools/rooms.mjs`, `tools/ux-check.mjs`, `tools/README.md`
- Modify: `tests/dom-harness.mjs` — add `roomRail`, `dockProgress` to the id list; return groups for `[data-snap]`
- Test: `tools/ux-check.mjs`

**Interfaces:**
- Consumes: every token and class from Task 5.
- Produces: the fit authority spec §10.1 names.

- [ ] **Step 1: Extend `tools/label-fit.mjs` to the authority spec §10.1 requires**

It must assert, at 1440×900 and at 1280×704, for every group:

- every `.acct-p` is fully inside the room's content band — its bottom is above the dock band's top;
- no `.acct-p` is clipped by its own box (`scrollHeight <= clientHeight + 1`);
- the `.awards`, `.team` and `.cat` blocks are fully inside the band;
- nothing crosses the fold.

Exit `1` on any failure, in the shape of `tools/ux-check.mjs`.

- [ ] **Step 2: Update the stand tools**

`tools/stand-fit.mjs`, `tools/stand-overflow.mjs`, `tools/avg-frame.mjs` and `tools/rooms.mjs` each model a stand as a cluster beside a label and read `--band-h` / `--max-panel-h` / `--label-w`. Replace those reads with `--frame-h` / `--label-measure` / `--stand-w`, and a stand's height with its two bands summed.

- [ ] **Step 3: Extend `tools/ux-check.mjs`**

Replace the modal-focus-containment and rail sections with:

- the sticky rail names the right area at an offset inside each room, and changes at a boundary;
- `#dockProgress`'s box is inside `.dock`'s box;
- `#dockProgress` width is 0% at the walk's start and 100% at its end;
- an award with photographs opens the photograph dialog, and an award without is not a control;
- nothing crosses the dock band at 1440×900 and at 1280×704.

- [ ] **Step 4: Run everything**

Needs the sandbox off.

```powershell
node tools/serve.mjs 3333
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
node tools/label-fit.mjs 1920 1080
node tools/label-fit.mjs 1280 704
node tools/ux-check.mjs
```

Expected: `label-fit` passes at both sizes; `ux-check` exits 0. **If label-fit fails at 1280×704, the fix is `--label-measure` or `--frame-h` — not a clamp, and not a scrollbar.**

- [ ] **Step 5: Update `tools/README.md`** where a tool's description no longer matches it, and add `label-fit.mjs`'s new role.

- [ ] **Step 6: Commit**

```bash
git add tools/ tests/dom-harness.mjs
git commit -m "test(ux): measure the two-band stand, the sticky rail and the dock's progress"
```

---

### Task 8: Documentation, and the whole-suite pass

**Files:**
- Modify: `README.md`
- Test: every suite

- [ ] **Step 1: Update `README.md`**

The sections that are now wrong: **Honours, and where an award lives** (an award is read on the project's own label, not in a dialog); **The walk** (a stand is two bands; the label is full width; `.plan` is gone; `--label-w`/`--band-h`/`--max-panel-h` are replaced by `--frame-h`/`--label-measure`/`--stand-w`); **Tech Stack** (Lenis is still the only dependency); **Structure** (unchanged paths); **Tests** (add `award-photos.test.mjs`; note `label-fit.mjs`'s promotion). Add a short section on the sticky rail and the dock's progress.

- [ ] **Step 2: Run the full suite**

```powershell
npm test
```

Expected: every suite passes, `0 failed`.

- [ ] **Step 3: Verify by eye, in the real browser**

Open `index.html` at 1920×1080 and at a narrowed window. Confirm: the account is fully readable; the awards are on the wall; the sticky rail names the area and changes at a boundary; the progress bar fills inside the dock and reaches the end at Contact; no prose is cut off.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe the museum label, the sticky rail and the dock's progress"
```

---

## Review Focus

The five inputs and conditions most likely to bite a person using this, each with the
task whose tests pin it:

1. **A project whose account is longer than the ones shipping today.** Nothing bounds
   `overview.text`, and a stand cannot grow vertically. A longer account is clipped and
   gone. Pinned by Task 4's `every shipped project shows its full account on the wall` and
   by Task 7's `label-fit` at the 1280×704 floor.
2. **An award that has photographs the honour does not list, or an honour whose project
   does not exist.** The visitor expects the award to be plain text, never to open a
   stranger's photographs. Pinned by Task 1's `no project inherits another project's
   photographs` and `an unknown project returns an empty list`.
3. **A viewport at the 1280×704 floor.** The label is at its narrowest and the account at
   its longest relative to the space. The visitor expects to still read it. Pinned by
   Task 7's `label-fit` at that size.
4. **A visitor who never presses anything.** The whole point: the account, the awards and
   the team caption are readable without interaction. Pinned by Task 4's
   `every project award is on the wall with its year` and `every team caption is on the
   wall`.
5. **A visitor arriving with `prefers-reduced-motion: reduce`.** The rail and the progress
   bar are not motion and must still work — the `reduce` branch of `initLights()` returns
   early, and in a prior build that early return left the rail empty and the dock
   unfollowed. Pinned by Task 3's changes reaching `bindTracking()` on that branch, and by
   the existing `reduced motion lights every piece, with no transition`.
