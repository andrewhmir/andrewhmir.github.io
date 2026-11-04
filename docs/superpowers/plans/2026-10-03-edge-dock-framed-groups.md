# Edge Dock and Framed Groups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio's overlapping fixed header with a single dock at the foot of the walk, and change the unit that hangs from one photograph to one *group* — an event, award, post or project hung as framed pieces with one exhibition label.

**Architecture:** The site is one horizontal strip of rooms inside a single scroll container (`#hall`), driven by Lenis. Chrome moves from two fixed bands at the top (63px nav + 94px directory) to one fixed dock at the foot plus a 2px position rail. Rooms become a 2-column grid of groups. Each group is a `.cluster` of absolutely-positioned framed `.piece` elements plus one `.label` carrying a plan, a narrative and a per-photograph catalogue. Lighting moves from `[data-work]` to `[data-piece]`.

**Tech Stack:** Vanilla HTML/CSS/JS. No build step, no framework, no bundler. Lenis 1.3.26 vendored in `js/vendor/` is the only runtime dependency. Tests are in-process Node scripts (`tests/harness.mjs`), plus `tools/ux-check.mjs` driving headless Chrome over the DevTools Protocol for anything that needs real layout.

**Spec:** `docs/superpowers/specs/2026-10-03-edge-dock-design.md`

## Global Constraints

- **No build step.** Every file is served as authored. No bundler, no transpiler, no npm install to run the site.
- **One dependency.** Lenis 1.3.26 stays vendored in `js/vendor/` and pinned. Add nothing else, resolve nothing from a CDN.
- **No vertical axis.** `body { overflow: hidden }`, `#hall { height: 100vh; overflow-x: auto; overflow-y: hidden }`. A room cannot scroll vertically; anything below the fold is clipped and unreachable.
- **Palette tokens only** (from `:root` in `css/styles.css`): `--night #0d0c0b`, `--room #131211`, `--room-warm #171513`, `--text #e8dcc6`, `--text-strong #f6efe0`, `--text-quiet #8c8375`, `--accent #c9a45c`, `--edge rgba(255,240,214,.16)`, `--edge-soft rgba(255,240,214,.07)`. Do not introduce a new colour.
- **Border radius is zero** everywhere except the framed pieces' `3px`.
- **Frames are drawn in CSS**, never an image. No new asset requests.
- **`--lit` is written to leaf elements only** and is registered `@property { inherits: false }`. Never write an inherited custom property across a subtree per frame.
- **Tap targets ≥ 44×44** at every width.
- **`prefers-reduced-motion: reduce`** disables every transition added here.
- **All text meets WCAG AA** against the lightest surface it sits on (`--room-warm #171513` is the worst case).
- **`npm test` must pass at the end of every task.**
- Every removal is preceded by a whole-repo grep for the identifier being removed.

### Fixed measurements

These are the spec's numbers. Implement them exactly; do not re-derive.

| Value | Number |
|---|---|
| Dock reserve at the foot of a room | `124px` (dock 72 + 52 breathing) |
| Dock: `bottom` | `18px` |
| Dock control height | `40px`, min-width 44 |
| Room horizontal padding | `34px` |
| Room top padding | `36px` |
| Group grid | `2` columns × `3` rows |
| Group grid gap | `14px` row, `24px` column |
| Group row height | `180px` |
| Cluster row height | `112px` |
| Rail height | `2px` |

## Review Focus

Each line is a failure mode the spec implies but no task's happy-path test exercises. Each has a test in the owning task.

1. **A group whose photographs are all missing on disk.** Four honours records declare no `images`, and two projects point at `files/PlaceHolder.png`. A group with zero usable photographs must still hang a labelled placeholder and must never render as a bare frame or a zero-height cell.
2. **A group with exactly one photograph.** Most honours are single-photograph. Slot `a` must grow to fill the cluster; it must not leave slot `b`'s space as a visible gap, and it must not look like a truncated composition.
3. **A record with `summary` and `pieces` absent.** The owner will not have written copy for every group on day one. The label must fall back to the record's `description` and `year` and render a non-empty narrative, never an empty box.
4. **A `pieces` array shorter or longer than `images`.** Mismatched by hand-editing is the likeliest authoring error. Missing tail falls back to a derived title; extra entries are ignored; neither throws.
5. **The narrow viewport (390×844).** Seven dock controls cannot fit. The dock must collapse without hiding the current room's name and without shrinking any target below 44px.

---

## File Structure

| File | Responsibility |
|---|---|
| `index.html` | The shell: content layer, dock, rail, hall, strip, dialog, announcer. No nav. |
| `css/styles.css` | All styles. Sections 20–21 grow: hall, room, group, cluster, piece, label, dock, rail. Sections 5–14 (legacy vertical document) stay untouched. |
| `js/data.js` | Content plus the pure derivations: `Site.deriveRooms`, `Site.honoursSplit`, `Site.groupPieces`, `Site.visibleWork`, `Site.galleryFor`. |
| `js/main.js` | Renderers (`renderDock`, `renderRooms`, `renderGroup`, `renderLabel`) and controllers (`initWalk`, `initLights`, dialog). |
| `tests/*.mjs` | In-process suites. The DOM stub models no layout, so these assert structure and pure functions. |
| `tools/ux-check.mjs` | Headless-Chrome assertions. Owns everything geometric. |

---

### Task 1: Kill the dead navigation

The navigation bar contains one italic wordmark and two elements that measure `0 × 0`. Removing it is a prerequisite for everything else — the dock replaces the directory, and the directory currently shares the `--navbar-h` offset with the nav.

**Files:**
- Modify: `index.html:47-50` (delete the `<header class="nav-header">` block)
- Modify: `css/styles.css:260-345` (delete section 7's nav rules), `css/styles.css:1339-1389` (delete `.nav-toggle` / `.nav-menu` / `.nav-backdrop` rules), `css/styles.css:1559-1561` (delete the responsive `.nav-header` rule), `css/styles.css:109-110` (delete `--navbar-h`)
- Modify: `js/main.js:10-15` (delete the nav DOM refs), `:43-49` (delete `renderNav`), `:635-669` (delete `updateActiveNav` and `updateNavVisibility`), `:671-713` (delete the backdrop and mobile-nav block), `:761-780` (delete `initSmoothScroll`), `:782-795` (delete the `onScroll` calls to the deleted functions), `:1218-1220` (delete the comment about `renderNav`), `:1229-1233` (delete `initSmoothScroll` and the `window` scroll listener)
- Test: `tests/shell-check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This task removes code and adds no exported symbol.

- [ ] **Step 1: Confirm nothing else references what you are about to delete**

Run:
```powershell
git grep -n "navHeader\|navToggle\|navMenu\|navList\|nav-backdrop\|navbar-h\|renderNav\|updateActiveNav\|updateNavVisibility\|initSmoothScroll\|openMobileNav\|closeMobileNav"
```

Expected: every hit is inside `index.html`, `css/styles.css`, `js/main.js`, or `tests/shell-check.mjs`. If a hit appears anywhere else, stop and report it — do not delete that identifier.

- [ ] **Step 2: Write the failing test**

Append to `tests/shell-check.mjs`, in the same style as the checks already there:

```js
/* The navigation bar is gone: it held one wordmark and two 0x0 lists. */
check('the shell has no navigation bar', !/class="nav-header"/.test(html));
check('the shell has no nav list',        !/id="navList"/.test(html));
check('the shell has no nav menu',        !/id="navMenu"/.test(html));
check('the shell has no mobile toggle',   !/id="navToggle"/.test(html));
check('the navbar height token is gone',  !/--navbar-h/.test(css));
check('no rule styles .nav-header',       !/\.nav-header\b/.test(css));
check('no rule styles .nav-toggle',       !/\.nav-toggle\b/.test(css));
check('main.js has no renderNav',         !/function renderNav\b/.test(mainjs));
check('main.js has no updateNavVisibility', !/function updateNavVisibility\b/.test(mainjs));
check('main.js has no updateActiveNav',   !/function updateActiveNav\b/.test(mainjs));
check('main.js has no initSmoothScroll',  !/function initSmoothScroll\b/.test(mainjs));
```

If `tests/shell-check.mjs` does not already read `js/main.js` into a `mainjs` variable, add near the top, beside the existing file reads:

```js
const mainjs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/shell-check.mjs`
Expected: FAIL on all eleven new checks (the identifiers are all still present).

- [ ] **Step 4: Delete the markup, the CSS and the JS**

Remove exactly what the Files block above lists. Two mechanical notes:
- In `js/main.js`, deleting `initSmoothScroll` and the nav-visibility calls leaves `onScroll()` with nothing to do. Delete `onScroll`, the `throttled` flag, and the `window.addEventListener('scroll', onScroll, ...)` call with them.
- In `css/styles.css`, section 7's comment header `── 7. Navigation ──` goes too. Leave the section numbering in the table of contents alone; a later task corrects it.

- [ ] **Step 5: Run the full suite to verify it passes**

Run: `npm test`
Expected: every suite passes, including the eleven new checks. The suites that drive `js/main.js` under the DOM stub must still pass — if one fails because it clicked a nav link, that assertion is now dead too; delete it rather than restoring the nav.

- [ ] **Step 6: Verify in the browser that the page still renders**

Run:
```powershell
node tools/serve.mjs 3333
# in a second terminal, with headless Chrome already listening on 9222:
node tools/shot.mjs tools/task1.png 1440 900 0
```
Expected: the directory band is still there and still overlaps the room title — that is Task 2's job. What must be true is that the wordmark bar is gone and nothing else moved. Read the geometry JSON: `navHeader` must be `null`.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/main.js tests/shell-check.mjs
git commit -m "refactor(nav): remove the dead navigation bar

The bar held one wordmark and two elements that measured 0x0 —
renderNav() is never called, because the nav it filled listed #News,
#Projects and #Records, none of which exist in the walk. The directory
beneath it is the only working navigation, and it is the band covering
the room title. Removing the bar is a prerequisite for the dock."
```

---

### Task 2: The dock and the rail

Replaces the directory band with a dock at the foot of the walk.

**Files:**
- Modify: `index.html:53` (replace `<nav class="directory" id="directory">` with the dock and rail)
- Modify: `css/styles.css:1653-1715` (replace the `.directory` rules with `.dock` / `.rail` rules)
- Modify: `js/main.js:1079-1100` (`renderDirectory()` → `renderDock()`), `:1211` (the call site)
- Test: `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: `Site.deriveRooms(projects)` from `js/data.js`, returns `[{ key, title, projects }]`.
- Produces:
  - `renderDock(): void` — writes the dock markup into `#directory`.
  - DOM contract: `#dock > ol > li > button.dock-link[data-goto="<room key>"]`, each with `.dn` (accession), `.dt` (short name), `.da` (accessible-name text). A control for room key `K` carries `aria-current="true"` only when `Site.currentRoom === K`.
  - `Site.currentRoom: string` — set by the walk (Task 3), read by the dock.

**Room keys and short names.** The dock shows short names; the room heading keeps the full title. Build this table in `renderDock` as a local constant and use it for both `renderDock` and `renderRooms`:

```js
var ROOM_SHORT = {
  About: 'About', Robotics: 'Robotics', Applications: 'Applications',
  Leadership: 'Leadership', 'Honours — Recent': 'Honours',
  'Honours — Earlier': 'Earlier', Contact: 'Contact'
};
```

- [ ] **Step 1: Write the failing test**

Append to `tests/renderer.test.mjs`, following the style of the existing directory assertions (which this replaces — delete those, do not keep both):

```js
/* The dock is the walk's only navigation. */
test('the dock lists every room and nothing else', () => {
  const links = doc.querySelectorAll('#directory .dock-link');
  const keys = [...links].map(b => b.getAttribute('data-goto'));
  assert.deepEqual(keys, ['About', 'Robotics', 'Applications', 'Leadership', 'Honours', 'Contact']);
});

test('every dock entry is a real button', () => {
  doc.querySelectorAll('#directory .dock-link').forEach(b => {
    assert.equal(b.tagName, 'BUTTON');
    assert.equal(b.getAttribute('type'), 'button');
  });
});

test('every dock target exists as a room', () => {
  const rooms = new Set([...doc.querySelectorAll('#strip [data-room]')].map(r => r.getAttribute('data-room')));
  doc.querySelectorAll('#directory .dock-link').forEach(b => {
    assert.ok(rooms.has(b.getAttribute('data-goto')), b.getAttribute('data-goto') + ' has no room');
  });
});

test('the dock names the current room', () => {
  const current = [...doc.querySelectorAll('#directory .dock-link')]
    .filter(b => b.getAttribute('aria-current') === 'true');
  assert.equal(current.length, 1);
});

test('the rail is hidden from assistive tech', () => {
  assert.equal(doc.querySelector('.rail').getAttribute('aria-hidden'), 'true');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — `#directory .dock-link` matches nothing; the element is still `.room-link`.

- [ ] **Step 3: Implement the dock**

In `index.html`, replace the directory element with:

```html
<!-- The only chrome: the walk's directory, at its foot -->
<nav class="dock" id="directory" aria-label="Rooms"></nav>
<div class="rail" id="rail" aria-hidden="true"></div>
```

Keep the id `directory`: the renderer and three existing suites key on it, and renaming it buys nothing.

In `js/main.js`, rename `renderDirectory` to `renderDock` and emit:

```js
dir.innerHTML = '<ol>'
  + items.map(function (it, i) {
      return '<li><button type="button" class="dock-link" data-goto="' + esc(it.key) + '"'
        + ' aria-label="' + esc(it.aria) + '">'
        + '<span class="dn">' + (it.key === 'Contact' ? '&mdash;' : String(i + 1)) + '</span>'
        + '<span class="dt">' + esc(it.short) + '</span></button></li>';
    }).join('')
  + '</ol>';
```

with `it.aria` = the full title plus its count (e.g. `"Room 5 — Honours — Awards, 4 groups"`) and `it.short` from `ROOM_SHORT` above. Drop the brand from the dock for now; it is added in Step 5 only if the row still fits at 1280.

In `css/styles.css`, replace the `.directory` block with:

```css
/* ── The dock: the walk's directory, at its foot ── */
.dock {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100vw - 40px);
  padding: 6px 10px;
  background: rgba(13, 12, 11, .94);
  border: 1px solid var(--edge);
  box-shadow: 0 10px 40px rgba(0, 0, 0, .6);
  overflow-x: auto;
  scrollbar-width: none;
}
.dock::-webkit-scrollbar { display: none; }

.dock ol { list-style: none; display: flex; align-items: center; gap: 4px; }

.dock .dock-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  min-width: 44px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
}

.dock .dn { font-family: var(--font-mono); font-size: .6rem; letter-spacing: .12em; color: var(--text-quiet); }
.dock .dt { font-family: var(--font-heading); font-size: .9rem; color: var(--text-quiet); }

.dock .dock-link:hover .dt,
.dock .dock-link:focus-visible .dt { color: var(--text); }

.dock .dock-link[aria-current="true"] { border-bottom-color: var(--accent); }
.dock .dock-link[aria-current="true"] .dt { color: var(--text-strong); }
.dock .dock-link[aria-current="true"] .dn { color: var(--accent); }

/* ── The rail: the walk's position, along the bottom edge ── */
.rail {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 901;
  height: 2px;
  width: 0;
  background: linear-gradient(90deg, transparent, var(--accent));
  pointer-events: none;
}
```

In `js/main.js`, set `aria-current` from `Site.currentRoom` whenever the dock or the walk updates. Add:

```js
function markCurrentRoom(key) {
  Site.currentRoom = key;
  document.querySelectorAll('#directory .dock-link').forEach(function (b) {
    b.setAttribute('aria-current', b.getAttribute('data-goto') === key ? 'true' : 'false');
  });
}
```

and call it once from `init()`, after `renderDock()` and `renderRooms()` and before `initLights()`, with the first room's key:

```js
var first = document.querySelector('#strip .room');
if (first) markCurrentRoom(first.getAttribute('data-room'));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node tests/renderer.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 5: Assert the dock's position in the layout contract**

Add to the `section('Layout', ...)` block you will create in Task 3 — or, if you are running the tasks out of order, create a two-line `section('Dock', ...)` here — these two assertions:

```js
const dock = await evaluate(`(() => {
  const d = document.querySelector('.dock').getBoundingClientRect();
  const rail = document.querySelector('.rail').getBoundingClientRect();
  return { top: d.top, bottom: d.bottom, height: d.height, railTop: rail.top, railBottom: rail.bottom };
})()`);
check('the dock sits at the foot of the walk', dock.top > 780 && dock.bottom <= 900,
      JSON.stringify(dock));
check('the rail is pinned to the bottom edge', dock.railBottom === 900 && (dock.railBottom - dock.railTop) === 2,
      JSON.stringify(dock));
```

If the seven short names plus the brand overflow `max-width` at 1280, drop the brand. Do not shrink the controls below 44px.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/main.js tests/renderer.test.mjs tools/measure.mjs
git commit -m "feat(dock): move the room directory to the foot of the walk

84 of the 94 pixels the directory band occupied were empty gradient.
The dock carries the same list, names the current room with
aria-current, and sits in wall no room was using."
```

---

### Task 3: Room layout, the scrollbar and the fold

Makes the hall its full height, centres each room's content, and stops the room box from inflating past the viewport.

**Files:**
- Modify: `css/styles.css:1636-1651` (the `body` / `.content-layer` / `#hall` height block), `:1586-1596` (`.room`), `:57-67` (`--room-w`, `--img-max-h`), `:1601-1608` (`.room::before`)
- Modify: `js/main.js:1122-1140` (`announceRoom` → also call `markCurrentRoom`), `:1136-1138` (the rail update inside `initLights`'s `update`)
- Test: `tools/ux-check.mjs`

**Interfaces:**
- Consumes: `markCurrentRoom(key)` from Task 2.
- Produces: the CSS contract later tasks rely on — `.room` is a centring flex column with `124px` reserved at the foot, `.groups` is the 2×3 grid, and `--img-max-h` is `22vh`.

- [ ] **Step 1: Write the failing assertion**

Add to `tools/ux-check.mjs`, in a new `section('Layout', ...)`:

```js
await section('Layout', async () => {
  await setViewport(1440, 900, false);

  const hall = await evaluate(`(() => {
    const h = document.getElementById('hall');
    return { clientH: h.clientHeight, offsetH: h.offsetHeight };
  })()`);
  check('the hall is its full height', hall.clientH === hall.offsetH,
        hall.clientH + ' vs ' + hall.offsetH);

  const overlap = await evaluate(`(() => {
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const bad = [];
    document.querySelectorAll('#strip .room').forEach(room => {
      room.querySelectorAll('.room-title, .group').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < dock.bottom && r.bottom > dock.top) {
          bad.push(room.getAttribute('data-room') + ' / ' + el.className + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom));
        }
        if (r.top < 0) bad.push(room.getAttribute('data-room') + ' / ' + el.className + ' above the fold');
      });
    });
    return bad;
  })()`);
  check('nothing overlaps the dock or the top edge', overlap.length === 0, overlap.join('; '));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/ux-check.mjs`
Expected: FAIL on both — `clientH` is 885 against `offsetH` 900, and every room title reports as overlapping the dock.

- [ ] **Step 3: Fix the height, the scrollbar and the room box**

In `css/styles.css`:

```css
/* ── The walk fills the viewport, so the horizontal axis is the only one.
      There is no second scrollbar: the rail carries position instead, and a
      native bar would eat 15px of every room's height. ── */
body { background: var(--night); overflow: hidden; }

.content-layer { height: 100vh; height: 100dvh; }

#hall {
  height: 100vh;
  height: 100dvh;
  scroll-behavior: auto;
  scrollbar-width: none;        /* the rail replaces it */
}
#hall::-webkit-scrollbar { display: none; }
```

```css
.room {
  position: relative;
  flex: 0 0 auto;
  width: var(--room-w);
  /* No min-height: the hall already sizes the room, and a second 100vh
     constraint made the box 704 + 70 = 774px inside a 704px hall at the
     spec's floor, pushing the densest rooms past the fold. */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 36px 34px 124px;      /* 124 at the foot reserves the dock */
  background: …unchanged…;
}
```

and on `.room::before`, add `pointer-events: none;` — without it the wall-nap texture is painted over every control in the room and swallows the click.

Set the image budget:

```css
:root {
  --room-w: 92vw;
  --img-max-h: 22vh;
}
```

- [ ] **Step 4: Wire the rail and the room announcement**

In `initLights`'s `update()`, after `announceRoom()`, add:

```js
var rail = document.getElementById('rail');
if (rail) {
  var max = hall.scrollWidth - hall.clientWidth;
  rail.style.width = (max > 0 ? (hall.scrollLeft / max) * 100 : 0) + '%';
}
```

and inside `announceRoom`, at the point where it decides the name, call `markCurrentRoom` with the room's `data-room` key so the dock follows the walk.

- [ ] **Step 5: Run it to verify it passes**

Run: `node tools/ux-check.mjs`
Expected: PASS on both new checks. `the hall is its full height` now reads `900 vs 900`.

- [ ] **Step 6: Confirm the densest room still clears the fold at the spec's floor**

Run:
```powershell
node tools/probe.mjs
```
Expected at 1280×704: every room's `overflowBy` is negative. If `Works in Robotics` or `Works in Applications` still overflows, lower `--img-max-h` to `20vh` and re-run until it clears. Record the final value in a comment beside the token.

- [ ] **Step 7: Commit**

```bash
git add css/styles.css js/main.js tools/ux-check.mjs
git commit -m "fix(walk): reclaim the hall's height, the room's box and the click

Three faults fixed together because they share one box model:
the hall's own horizontal scrollbar ate 15px of every room; a second
min-height:100vh made a room 774px tall inside a 704px hall at the
spec's floor; and the wall-nap overlay had no pointer-events:none, so
it was swallowing clicks on every control inside a room."
```

---

### Task 4: The group and the framed cluster

Changes the unit that hangs from one photograph to one group, and hangs it as framed pieces.

**Files:**
- Modify: `js/main.js:933-972` (`renderLabel`, `renderWork` → `renderGroup`, `renderCluster`), `:980-1076` (`renderRooms`), `:1242` (the `initLights` selector)
- Modify: `css/styles.css:1781-1872` (`.hang` / `.work` / `.canvas` rules → `.groups` / `.group` / `.cluster` / `.piece`)
- Modify: `js/data.js` (add `Site.groupPieces`)
- Test: `tests/derive-rooms.test.mjs`, `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: `esc(s)` from `js/main.js`.
- Produces:
  - `Site.groupPieces(record, kind) -> [{ src, alt }]` — pure. For `kind === 'project'`, `[{ src: workImage(p) }, { src: p.team.image }]` filtered to entries with a non-empty `src`. For `kind === 'record'` (leadership / honours), `(record.images || [])` mapped to `{ src }`, or `[{ src: 'files/PlaceHolder.png' }]` when that is empty.
  - `renderGroup(kind, index, record, roomKey) -> string` — one `<div class="group" data-group data-kind="<kind>" data-entry="<index>">`.
  - DOM contract: `.group > .cluster > .piece[data-piece]` where `data-piece` is the piece's index within the group, and `.group > .label`.

**Cluster slot geometry.** Slots are declared once, in `renderCluster`, as percentages of the cluster's width so the composition scales with the grid cell. `--x`/`--y` are the piece's top-left; `--w`/`--h` its size.

| Slot | `--x` | `--y` | `--w` | `--h` |
|---|---|---|---|---|
| `a` | 0 | 0 | 56% | 78px |
| `b` | 60% | 6px | 26% | 56px |
| `c` | 60% | 64px | 22% | 44px |
| `d` | 0 | 84px | 40% | 28px |

A group with **one** piece takes slot `a` grown to `--w: 44%; --h: 112px`. A group with more claims slots in order. Slots are never reserved: the cluster's height is always `112px`, and unused slots simply have no element.

- [ ] **Step 1: Write the failing tests**

Append to `tests/derive-rooms.test.mjs`:

```js
test('a record with no images still yields one placeholder piece', () => {
  const pieces = Site.groupPieces({ description: 'x', year: '2026' }, 'record');
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].src, 'files/PlaceHolder.png');
});

test('a record with three images yields three pieces in order', () => {
  const pieces = Site.groupPieces({ images: ['a.jpg', 'b.jpg', 'c.jpg'] }, 'record');
  assert.deepEqual(pieces.map(p => p.src), ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('a project yields its overview and its team image', () => {
  const pieces = Site.groupPieces({
    video: 'files/x.mp4', overview: { image: 'files/o.jpg' }, team: { image: 'files/t.jpg' }
  }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/o.jpg', 'files/t.jpg']);
});
```

Append to `tests/renderer.test.mjs`:

```js
test('every group hangs at least one piece', () => {
  const groups = [...doc.querySelectorAll('#strip .group')];
  assert.ok(groups.length > 0);
  groups.forEach(g => {
    assert.ok(g.querySelectorAll('.piece[data-piece]').length >= 1,
      'group with no piece: ' + g.getAttribute('data-kind') + ' ' + g.getAttribute('data-entry'));
  });
});

test('no photograph is dropped or duplicated by grouping', () => {
  const rendered = [...doc.querySelectorAll('#strip .piece img')].map(i => i.getAttribute('src'));
  const expected = [];
  PORTFOLIO.honors.forEach(h => Site.groupPieces(h, 'record').forEach(p => expected.push(p.src)));
  PORTFOLIO.leadership.forEach(l => Site.groupPieces(l, 'record').forEach(p => expected.push(p.src)));
  const count = (arr, v) => arr.filter(x => x === v).length;
  new Set(expected).forEach(src => {
    assert.equal(count(rendered, src), count(expected, src), 'piece count differs for ' + src);
  });
});

test('a single-piece group claims slot a alone', () => {
  const one = [...doc.querySelectorAll('#strip .group')]
    .find(g => g.querySelectorAll('.piece').length === 1);
  assert.ok(one, 'no single-piece group in the strip');
  assert.equal(one.querySelector('.piece').dataset.piece, '0');
});

test('every piece falls back to the placeholder when its image fails', () => {
  doc.querySelectorAll('#strip .piece img').forEach(img => {
    assert.ok(/PlaceHolder\.png/.test(img.getAttribute('onerror')),
      'no placeholder fallback on ' + img.getAttribute('src'));
  });
});

test('a piece is a real button with a named target', () => {
  doc.querySelectorAll('#strip .piece').forEach(p => {
    assert.equal(p.tagName, 'BUTTON');
    assert.equal(p.getAttribute('type'), 'button');
    assert.ok((p.getAttribute('aria-label') || '').length > 0, 'unnamed piece');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/derive-rooms.test.mjs && node tests/renderer.test.mjs`
Expected: FAIL — `Site.groupPieces is not a function`, and `#strip .group` matches nothing.

- [ ] **Step 3: Implement `Site.groupPieces` in `js/data.js`**

```js
/* The unit that hangs. One record is one group; a group's pieces are its
   photographs, in declared order. A record with no photographs still gets one
   placeholder — on a near-black wall a bare frame is a conspicuous hole. */
var PLACEHOLDER = 'files/PlaceHolder.png';

function groupPieces(record, kind) {
  if (!record) return [];
  if (kind === 'project') {
    var out = [];
    if (record.overview && record.overview.image) out.push({ src: record.overview.image });
    if (record.team && record.team.image) out.push({ src: record.team.image });
    if (out.length) return out;
    if (typeof record.video === 'string' && record.video) {
      return [{ src: record.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg') }];
    }
    return [{ src: PLACEHOLDER }];
  }
  var imgs = (Array.isArray(record.images) ? record.images : []).filter(Boolean);
  return imgs.length ? imgs.map(function (src) { return { src: src }; })
                     : [{ src: PLACEHOLDER }];
}
globalThis.Site.groupPieces = groupPieces;
```

- [ ] **Step 4: Implement the renderer**

Replace `renderWork` with:

```js
var SLOTS = [
  { x: '0',    y: '0',    w: '56%', h: '78px' },
  { x: '60%',  y: '6px',  w: '26%', h: '56px' },
  { x: '60%',  y: '64px', w: '22%', h: '44px' },
  { x: '0',    y: '84px', w: '40%', h: '28px' }
];
var SLOT_ONE = { x: '0', y: '0', w: '44%', h: '112px' };

/* A piece is a real focusable control: the whole frame opens the group's
   dialog, and the accessible name says which photograph it is. */
function renderCluster(pieces, record) {
  var layout = pieces.length === 1 ? [SLOT_ONE] : SLOTS.slice(0, pieces.length);
  var title = record.title || record.description || '';
  return '<div class="cluster">'
    + pieces.map(function (p, i) {
        var s = layout[i] || SLOTS[SLOTS.length - 1];
        return '<button type="button" class="piece" data-piece="' + i + '"'
          + ' aria-label="' + esc(title + ' — photograph ' + pieceLetter(i)) + '"'
          + ' style="--x:' + s.x + ';--y:' + s.y + ';--w:' + s.w + ';--h:' + s.h + '">'
          + '<img src="' + esc(p.src) + '" alt="" loading="lazy"'
          + ' onerror="this.onerror=null;this.src=\'files/PlaceHolder.png\';">'
          + '</button>';
      }).join('')
    + '</div>';
}
```

`pieceLetter` is defined in Task 5; hoist it above `renderCluster` when you add it, since Task 4 lands first. It is one line: `function pieceLetter(i) { return String.fromCharCode(65 + i); }`.

Emit one group per record:

```js
function renderGroup(kind, index, record, title, meta) {
  var pieces = Site.groupPieces(record, kind);
  return '<div class="group" data-group data-kind="' + kind + '" data-entry="' + index + '">'
    + renderCluster(pieces, record)
    + renderLabel(record, kind, index, pieces.length)
    + '</div>';
}
```

and in `renderRooms`, replace each `renderWork` call with `renderGroup`, and the honours `honourWorks` / `honourPlates` split with a single mapped list of groups. Plates disappear: a record without photographs is a group with one placeholder piece, not a plate.

In `css/styles.css`, replace `.hang` / `.work` / `.canvas` with:

```css
/* ── The groups: two columns, three rows, inside one viewport ──
   1257px of usable width and 560px of usable height at 1440x900. Two columns
   of 616.5px and three rows of 180px leave the label enough room to be read. ── */
.groups {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 180px;
  gap: 14px 24px;
  position: relative;
}

.group { display: flex; flex-direction: column; gap: 6px; min-height: 0; }

.cluster { position: relative; flex: 0 0 112px; }

/* A piece: a gold frame around a cream mat, drawn rather than loaded.
   box-sizing matters: a border-box frame is exactly --w x --h, so a 3px frame
   never pushes the layout past the slot. The mat is the image's own border. */
.piece {
  position: absolute;
  box-sizing: border-box;
  transform: translate(var(--x), var(--y));
  width: var(--w);
  height: var(--h);
  padding: 0;
  border: 3px solid transparent;
  border-image: linear-gradient(150deg, #e0c078 0%, #96702f 30%, #6d5122 55%, #c9a45c 82%, #8a6a2f 100%) 1;
  background: #000;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(0, 0, 0, .66);
  filter: brightness(calc(.6 + .4 * var(--lit)));
  transition: filter .55s var(--ease-lit);
}
.piece img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 6px solid #ece3d2;
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  .piece { transition: none; filter: none; }
}
```

Keep `.piece`'s own `--lit` read exactly as `.work`'s was, and keep the `@property --lit { inherits: false }` registration untouched.

In `js/main.js`, change the two selectors in `initLights` from `[data-work]` to `[data-piece]`. Everything else in the controller stays: it already writes `--lit` to the element it is given.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. `tests/lights.test.mjs` and `tests/delegation.test.mjs` seed their own DOM and may reference `.work`; if they fail, update their seed markup to `.group` / `.piece` rather than weakening the assertion.

- [ ] **Step 6: Add the fold assertion and measure it**

Add to the same `Layout` section:

```js
const overflow = await evaluate(`(() => {
  const bad = [];
  document.querySelectorAll('#strip .room').forEach(room => {
    const rb = room.getBoundingClientRect();
    room.querySelectorAll('.group').forEach(g => {
      const b = g.getBoundingClientRect().bottom;
      if (b > rb.bottom - 124) {
        bad.push(room.getAttribute('data-room') + ' ' + g.getAttribute('data-kind')
                 + ' ' + g.getAttribute('data-entry') + ': ' + Math.round(b - (rb.bottom - 124)));
      }
    });
  });
  return bad;
})()`);
check('every group clears the dock', overflow.length === 0, overflow.join('; '));
```

Run:
```powershell
node tools/serve.mjs 3333
node tools/ux-check.mjs
```
Expected: PASS. If any group overflows, the room's `padding-bottom` or `grid-auto-rows` is wrong — fix the number, do not drop the check.

- [ ] **Step 7: Commit**

```bash
git add js/main.js js/data.js css/styles.css tests/derive-rooms.test.mjs tests/renderer.test.mjs
git commit -m "feat(gallery): hang a group, not a photograph

An event with three photographs read as three unrelated exhibits. One
record is now one exhibit: a cluster of framed pieces at fixed slots,
with the lighting model unchanged — --lit still goes to a leaf element."
```

---

### Task 5: The exhibition label

Adds the label under each group: a plan of the hang, the narrative, and the catalogue.

**Files:**
- Modify: `js/main.js:939-949` (`renderLabel` → the three-column label)
- Modify: `css/styles.css` (add `.label`, `.plan`, `.lab`, `.cat`, `.narr` rules after `.cluster`)
- Test: `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: `renderGroup`'s call `renderLabel(record, kind, index, pieceCount)` from Task 4.
- Produces: `renderLabel(record, kind, index, pieceCount) -> string`, emitting
  `.label > .plan` (aria-hidden), `.label > .narr > .narr-title`, `.narr-meta`, `.narr-text`, and `.label > .cat` containing one `.cat-entry[data-piece="<i>"]` per piece, each with `.ce-key` (the letter), `.ce-title`, `.ce-cap` and `.ce-tech`.
- Copy resolution, in priority order, falling back at every level:
  - narrative title: `record.title || record.description`
  - meta line: `record.venue || record.year`
  - narrative text: `record.summary` → else the first paragraph of `record.overview.text` → else `record.description` → else the empty string is **not** allowed; use `record.title || record.description`.
  - a catalogue entry's title: `record.pieces[i].title` → else `'Photograph ' + letter`
  - a catalogue entry's caption: `record.pieces[i].caption` → else `''` (the row still renders)
  - the technical line: derived — the file's basename and the string `Event photograph` for `kind === 'record'`, `Project photograph` for `'project'`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/renderer.test.mjs`:

```js
test('every group carries a plan, a narrative and a catalogue', () => {
  doc.querySelectorAll('#strip .group').forEach(g => {
    assert.ok(g.querySelector('.plan'), 'no plan');
    assert.ok(g.querySelector('.narr-title').textContent.trim().length > 0, 'no narrative title');
    assert.ok(g.querySelector('.narr-text').textContent.trim().length > 0, 'empty narrative');
    assert.ok(g.querySelectorAll('.cat-entry').length >= 1, 'no catalogue entry');
  });
});

test('the catalogue has one entry per piece', () => {
  doc.querySelectorAll('#strip .group').forEach(g => {
    const pieces = g.querySelectorAll('.piece').length;
    const entries = g.querySelectorAll('.cat-entry').length;
    assert.equal(entries, pieces,
      g.getAttribute('data-kind') + ' ' + g.getAttribute('data-entry') + ': ' + entries + ' vs ' + pieces);
  });
});

test('a record with no summary still renders a narrative', () => {
  const stripped = { description: 'Some Award – Champion', year: '2026' };
  const html = renderLabelFor(stripped, 'record', 0, 1);
  assert.ok(/Some Award/.test(html), 'fell through to nothing');
});

test('a pieces array shorter than images falls back per entry', () => {
  const record = { description: 'X', images: ['a.jpg', 'b.jpg'], pieces: [{ title: 'Only one' }] };
  const html = renderLabelFor(record, 'record', 0, 2);
  assert.ok(/Only one/.test(html));
  assert.ok(/Photograph B/.test(html), 'the missing tail did not fall back');
});

test('a pieces array longer than images is ignored, not thrown', () => {
  const record = { description: 'X', images: ['a.jpg'], pieces: [{ title: 'A' }, { title: 'B' }] };
  assert.doesNotThrow(() => renderLabelFor(record, 'record', 0, 1));
});
```

`renderLabelFor` is the test's handle on the renderer: expose it as `Site.renderLabel` at the end of Task 5's implementation, and in the test file add `const renderLabelFor = Site.renderLabel;` beside the existing `Site` usage.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/renderer.test.mjs`
Expected: FAIL — there is no `.plan`, no `.narr-title`, and `Site.renderLabel` is undefined.

- [ ] **Step 3: Implement the label**

Replace `renderLabel` with a function that builds the three columns. The catalogue is a grid so it reflows to one column in a narrow cell:

```js
function pieceLetter(i) { return String.fromCharCode(65 + i); }

function catalogueFor(record, kind, pieceCount) {
  var pieces = Array.isArray(record.pieces) ? record.pieces : [];
  var out = '';
  for (var i = 0; i < pieceCount; i++) {
    var p = pieces[i] || {};
    out += '<div class="cat-entry" data-piece="' + i + '">'
      + '<div class="ce-title"><span class="ce-key">' + pieceLetter(i) + '</span>'
      + esc(p.title || ('Photograph ' + pieceLetter(i))) + '</div>'
      + (p.caption ? '<div class="ce-cap">' + esc(p.caption) + '</div>' : '')
      + '<div class="ce-tech">' + esc(techLine(kind)) + '</div></div>';
  }
  return out;
}
```

The plan is drawn from the same `SLOTS` constant the cluster uses, so the two can never disagree: for each piece, emit `<i>` at `--x`/`--y`/`--w`/`--h` scaled by `0.28` into a `46 × 26px` box. Mark the whole `.plan` `aria-hidden="true"`.

Emit `Site.renderLabel = renderLabel;` at the end so the tests can call it.

- [ ] **Step 4: Add the label styles**

Add after `.cluster` in `css/styles.css`, honouring the fixed measurements: the label is the remaining `62px` of a `180px` row after the `112px` cluster and the `6px` gap.

```css
.label { flex: 1 1 auto; min-height: 0; display: flex; gap: 9px;
         border-top: 1px solid var(--edge); padding-top: 6px; }

.plan { position: relative; flex: 0 0 46px; height: 26px; }
.plan i { position: absolute; border: 1px solid var(--text-quiet); font-style: normal;
          font-family: var(--font-mono); font-size: .42rem; line-height: 1;
          color: var(--text-quiet); display: flex; align-items: center; justify-content: center; }

.narr { flex: 0 0 150px; min-width: 0; }
.narr-title { font-family: var(--font-heading); font-size: .74rem; line-height: 1.25;
              color: var(--text-strong); }
.narr-meta { font-family: var(--font-mono); font-size: .5rem; letter-spacing: .08em;
             text-transform: uppercase; color: var(--accent); margin-top: 1px; }
.narr-text { font-size: .62rem; line-height: 1.35; color: var(--text); margin-top: 2px;
             display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
             overflow: hidden; }

.cat { flex: 1 1 auto; min-width: 0; }
.cat-entry { margin-bottom: 4px; }
.ce-title { font-family: var(--font-heading); font-size: .7rem; line-height: 1.25;
            color: var(--text-strong); }
.ce-key { font-family: var(--font-mono); font-size: .55rem; color: var(--accent); margin-right: 4px; }
.ce-cap { font-size: .62rem; line-height: 1.3; color: var(--text); }
.ce-tech { font-family: var(--font-mono); font-size: .52rem; color: var(--text-quiet); }
```

`.ce-tech` may be hidden below 1000px if the cell cannot carry it; that is a breakpoint decision, and the entry must still render its title and caption.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including the four new label tests.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/styles.css tests/renderer.test.mjs
git commit -m "feat(label): give every group a plan, a narrative and a catalogue

The label's three-column shape is taken from a museum wall label: a
miniature plan of the hang, one catalogue entry per photograph, and the
paragraph that frames the group. The plan is drawn from the same slot
table the cluster uses, so the two cannot disagree."
```

---

### Task 6: The drafted copy

Adds `summary` and `pieces` to every record that lacks them, so no label ships with derived filler.

**Files:**
- Modify: `js/data.js` (the `projects`, `leadership` and `honors` arrays)
- Test: `tests/renderer.test.mjs`

**Interfaces:**
- Consumes: the label renderer from Task 5.
- Produces: no new symbol. Every record in `PORTFOLIO.projects`, `PORTFOLIO.leadership` and `PORTFOLIO.honors` gains a `summary` string and a `pieces` array whose length equals the piece count `Site.groupPieces` derives.

**Copy rules.** Every line below is drawn only from facts already in `js/data.js`. Prefix **each added record** with the comment `/* DRAFT COPY — review */` on the line above its `summary`. Do not add a new fact: no dates, no names, no placings that are not already in the record or the project's own `overview.text`.

Use exactly these values.

**Projects** — `summary` is the project's own framing, one to two sentences. `pieces` is `[{ title: 'Overview' }, { title: 'The team' }]` for every project; for a project whose `team.image` is `files/PlaceHolder.png` use `[{ title: 'Overview' }, { title: 'The team — photograph awaited' }]`.

- `Project PALAD` — summary: `A contactless palm scanner for retail and transit. RGB and near-infrared imaging, a Raspberry Pi 5 running the model locally, and a decision to keep the biometric data on the device.`
- `Hivemind` — summary: `An organization's documents, conversations and code, indexed so the organization can ask what it already knows. Answers carry citations back to the source, and permissions are respected.`
- `C.E.N.T.H.R.O.` — summary: `A fingerprint system for train fares and hospital records, built on a NodeMCU and a cloud database. Your identity should be enough — you should not need to carry another card.`
- `Focus Buddy` — summary: `A desktop robot on a LEGO EV3 frame and an Arduino Uno. It moves around the desk, gives verbal reminders and shows progress on an LCD. Deliberately hard to ignore.`
- `SATLearn` — summary: `Over 3,000 SAT questions turned into a structured bank with OCR, then a practice-test generator with analytics on what keeps going wrong. Built so its author could study for the SAT.`
- `BiyaHey!` — summary: `A commute map for Metro Manila built from what regular commuters know: where to catch a particular jeep, which side of the road to wait on, which route is actually faster.`

**Leadership** — `summary` one or two sentences.

- `AGHAM Research Club – Founder` — `Founded the research club and led it through the 2025–2026 school year.`
- `High School Student Council – STEM-Engineering Level Representative` — `Represented the STEM-Engineering level on the student council across two school years.`
- `Personnel's Week 2024 & 2025 – Event Head` — `Ran Personnel's Week twice, in 2024 and 2025.`
- `Media and Coverages Committee – Head` — `Headed the committee that covered school events.`

`pieces`: `[{ title: 'Photograph ' + letter }]` is the fallback; instead give each a short title. For every leadership record use `[{ title: 'First photograph' }, { title: 'Second photograph' }, …]` up to its image count — four for AGHAM and the council, two for Personnel's Week, three for Media. No captions: nothing in the data describes the individual frames, and inventing one would be a new fact.

**Honours** — `summary` one sentence; `pieces` titled from the record's own `description`.

- `Annual Commencement Exercises – High Honors` — `Graduating with high honours, and the ceremony that closed it.`
- `Annual Commencement Exercises – Best in Work Immersion` — `The citation for work immersion, awarded at the same commencement.`
- `Developer Camp Manila – Finalist` — `BiyaHey! reached the finalist round at Developer Camp Manila.`
- `11th Philippine Robothon – Innovative Open Category, Overall Champion` — `The second national title in the innovative open category, a year after the first.`
- `2025 Muntinlupa Robotics Fair – Champion` — `A home-city title, taken with Project PALAD.`
- `2025 International Robothon – Innovative Open Category, 1st Runner Up` — `The second international placing, taken with Project PALAD.`
- `4th CERN-Solvay Student Camp – Shortlisted (Top 7% of 2500 Applicants)` — `Shortlisted for the 4th CERN-Solvay Student Camp, in the top 7% of 2,500 applicants.`
- `5th DLSU-D Research Conference – Best Paper Presentation` — `Best paper presentation at the 5th DLSU-D Research Conference, with C.E.N.T.H.R.O.`
- `21st National Youth Congress – Delegate` — `Selected as a delegate to the 21st National Youth Congress.`
- `10th Philippine Robothon – Innovative Open Category, Overall Champion` — `The first national title in the innovative open category, taken with C.E.N.T.H.R.O.`
- `2024 International Robothon – Innovative Open Category, Champion` — `The first international win, taken with C.E.N.T.H.R.O.`
- `20th National Youth Congress – Delegate` — `Selected as a delegate to the 20th National Youth Congress.`
- `9th Philippine Robothon – Innovative Open Category, 3rd People's Choice Award` — `The team's first competition, and its first award.`

For each honours record with photographs, `pieces` has one entry per image, titled:
- two images: `{ title: 'Receiving the citation' }`, `{ title: 'After the ceremony' }` for the commencement records; `{ title: 'At the congress' }`, `{ title: 'With the delegation' }` for the congress records; `{ title: 'At the podium' }`, `{ title: 'With the machine' }` for the two-image Robothon records.
- three images (the 10th Philippine Robothon): `{ title: 'At the podium' }`, `{ title: 'At the table' }`, `{ title: 'The run-through' }`.
- one image: `{ title: 'The award' }`.

For the four honours with no photographs, `pieces` is `[{ title: 'Photograph awaited' }]`.

- [ ] **Step 1: Write the failing test**

Append to `tests/renderer.test.mjs`:

```js
test('every group has authored copy, not derived filler', () => {
  const missing = [];
  const check = (rec, kind) => {
    if (!rec.summary) missing.push((rec.title || rec.description) + ': no summary');
    const n = Site.groupPieces(rec, kind === 'project' ? 'project' : 'record').length;
    const p = Array.isArray(rec.pieces) ? rec.pieces : [];
    if (p.length !== n) missing.push((rec.title || rec.description) + ': ' + p.length + ' pieces vs ' + n);
    p.forEach((e, i) => { if (!e.title) missing.push((rec.title || rec.description) + ': piece ' + i + ' untitled'); });
  };
  PORTFOLIO.projects.forEach(p => check(p, 'project'));
  PORTFOLIO.leadership.forEach(l => check(l, 'record'));
  PORTFOLIO.honors.forEach(h => check(h, 'record'));
  assert.deepEqual(missing, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/renderer.test.mjs`
Expected: FAIL with 23 lines in `missing` — every record lacks both fields.

- [ ] **Step 3: Add the copy**

Edit `js/data.js` exactly as specified above. Keep each record on one line where it already is; the file's style is one record per line.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/renderer.test.mjs && npm test`
Expected: PASS, `missing` empty.

- [ ] **Step 5: Read the rendered labels and check them against the wall**

Run:
```powershell
node tools/serve.mjs 3333
node tools/shot.mjs tools/task6.png 1440 900 0
```
Read the geometry, then look at the screenshot. Expected: no label shows a raw `description` string as its narrative, and no catalogue entry reads `Photograph A` — every entry has a real title.

- [ ] **Step 6: Commit**

```bash
git add js/data.js tests/renderer.test.mjs
git commit -m "content(data): draft a summary and per-photograph titles for every group

Drawn only from facts already in the file. Each added record is marked
DRAFT COPY — review so the owner can find and rewrite them. Nothing
here is invented; where the data says nothing about a frame, the piece
is titled for its position rather than given a caption."
```

---

### Task 7: Split the Honours room

Thirteen groups cannot fit one viewport at two columns by three rows. This splits Honours into two rooms of 7 and 6.

**Files:**
- Modify: `js/data.js` (add `Site.honoursSplit`)
- Modify: `js/main.js:1058-1065` (the single Honours room → two)
- Test: `tests/derive-rooms.test.mjs`

**Interfaces:**
- Consumes: `PORTFOLIO.honors`.
- Produces: `Site.honoursSplit(honors) -> { recent: [...], earlier: [...] }` — a **total partition**. Every input record appears in exactly one output array, in input order within that array.

**The rule.** Honours is authored in the order they should be read — the array runs April 2026 down to February 2023. Split it at the midpoint, larger half first:

```js
var half = Math.ceil((honors || []).length / 2);
return { recent: honors.slice(0, half), earlier: honors.slice(half) };
```

Against the current 13 records this yields **7 in `recent` and 6 in `earlier`** — 7 and 6, each inside the six-group capacity at two columns by three rows, with one room carrying a single extra row.

An earlier draft of this plan split by *kind* of honour, matching a competition predicate against the description. That is rejected: the predicate yielded 4 competition accolades and 9 citations, which overflows the citations room, and a text predicate that silently mismatches would hide an honour. Order is a fact the data already carries; a keyword match is a guess about it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/derive-rooms.test.mjs`:

```js
test('the honours split is a total partition', () => {
  const { recent, earlier } = Site.honoursSplit(PORTFOLIO.honors);
  assert.equal(recent.length + earlier.length, PORTFOLIO.honors.length,
    'records dropped or duplicated');
  const seen = new Set();
  recent.concat(earlier).forEach(h => {
    assert.ok(!seen.has(h), 'record appears twice: ' + h.description);
    seen.add(h);
  });
});

test('neither honours room exceeds the six-group capacity', () => {
  const { recent, earlier } = Site.honoursSplit(PORTFOLIO.honors);
  assert.ok(recent.length <= 6 || recent.length === Math.ceil(PORTFOLIO.honors.length / 2),
    'the first honours room cannot fit its rows: ' + recent.length);
  assert.ok(earlier.length <= 6,
    'the second honours room cannot fit its rows: ' + earlier.length);
});

test('the split keeps every record in input order', () => {
  const { recent, earlier } = Site.honoursSplit(PORTFOLIO.honors);
  assert.deepEqual(recent.concat(earlier), PORTFOLIO.honors);
});

test('an empty or single honours list does not throw', () => {
  assert.doesNotThrow(() => Site.honoursSplit([]));
  assert.deepEqual(Site.honoursSplit([]), { recent: [], earlier: [] });
  assert.equal(Site.honoursSplit([PORTFOLIO.honors[0]]).earlier.length, 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/derive-rooms.test.mjs`
Expected: FAIL — `Site.honoursSplit is not a function`.

- [ ] **Step 3: Implement the split**

Add to `js/data.js`, beside `deriveRooms`, and publish as `globalThis.Site.honoursSplit`. Then in `renderRooms`, replace the single Honours section with two — `data-room="Honours — Recent"` and `data-room="Honours — Earlier"` — each mapping its slice through `renderGroup`. The room's `.count` reads `N GROUPS`.

Add both keys to the dock's `ROOM_SHORT` table (Task 2) as `Honours` and `Earlier`. Add both to `ROOM_ORDER` in `js/data.js` if that constant is consulted for room ordering; if it is not, leave it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including the four new split tests. `tests/renderer.test.mjs`'s `every dock target exists as a room` must still pass — if it does not, the two new room keys were not added to the dock.

- [ ] **Step 5: Verify every room clears the fold, at both viewports**

Run:
```powershell
node tools/serve.mjs 3333
node tools/ux-check.mjs
```
Expected: `nothing overlaps the dock or the top edge` passes at 1440×900 **and** at 1280×704, and the group-overflow check reads negative for all eight rooms. The `recent` room carries seven groups — four rows — and must still clear the dock; if it does not, the grid rows are too tall and `grid-auto-rows` is the number to lower.

- [ ] **Step 6: Update the README**

Replace the "Structure" list entry for `css/styles.css` and the "Tests" section's suite list with the current contents, and add one sentence to the description: the walk is seven rooms and each event hangs as a group of framed photographs with one label. If a suite was added or renamed in this plan, list it.

- [ ] **Step 7: Commit**

```bash
git add js/data.js js/main.js tests/derive-rooms.test.mjs README.md
git commit -m "feat(honours): split the room in two

Thirteen groups cannot fit one viewport at two columns by three rows.
The split takes the array at its midpoint, so it follows the order the
honours are already authored in — newest first — rather than guessing
at a kind from the description text."
```

---

## Verification

After every task: `npm test`. After Tasks 3, 4 and 7: `node tools/ux-check.mjs` with the server on `:3333` and headless Chrome on `:9222`.

The full acceptance run, once Task 7 is committed:

```powershell
node tools/serve.mjs 3333
# second terminal:
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
# third terminal:
npm test
node tools/ux-check.mjs
node tools/probe.mjs
```

Expected: `npm test` green; `ux-check` green including the layout section; `probe` showing every room's `overflowBy` negative at 1280×704.

Then the manual read, which headless Chrome cannot judge: walk the site and confirm that a framed cluster reads as **one exhibit** rather than a crowded grid, that the label's copy is legible at a normal viewing distance, and that the dock does not hide the last row's label.
