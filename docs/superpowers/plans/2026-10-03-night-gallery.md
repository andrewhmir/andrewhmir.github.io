# Night Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as a single horizontal walk through a dark gallery, where six rooms hold the owner's projects and achievements as works under their own pools of light.

**Architecture:** One horizontal scroll container (`#hall`) holds a flex strip of six room sections. Lenis 1.3.26, vendored locally, smooths the journey; `lenis/snap` in `proximity` mode provides the gentle snap. Room structure and every wall label are derived from `js/data.js` by pure functions so the gallery cannot drift from the data. Each work carries a light value that rises as it enters view.

**Tech Stack:** Vanilla HTML/CSS/JS, classic `<script>` tags, no build step. Lenis 1.3.26 (MIT) vendored. Node 22+ for unit tests. Chrome DevTools Protocol for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-03-night-gallery-design.md`

## Global Constraints

- **No build step.** Every script is loaded with a classic `<script src>` tag. No bundler, no transpiler, no CDN at runtime.
- **Vendored dependency, pinned.** Lenis exactly `1.3.26`. The only permitted dependency. Files live in `js/vendor/` and are never resolved remotely.
- **Classic-script convention** (matches the owner's `dane_trial` project): each JS file wraps in an IIFE and exports through `globalThis.Site`. A bare top-level `const` collides between files.
- **Colour tokens, exact values:** `--night: #0d0c0b`, `--room: #131211`, `--room-warm: #171513`, `--text: #e8dcc6`, `--text-strong: #f6efe0`, `--text-quiet: #8c8375`, `--accent: #c9a45c`.
- **There is no third text tier.** `#6d6559` measured 3.17:1 and fails AA. Do not reintroduce it, and do not build a tier from `color-mix()` or `opacity` — the measured ratios in the spec apply to solid colours only.
- **Border radius is zero** everywhere.
- **Never write an inherited custom property on a large subtree per frame.** Register with `@property { inherits: false }` and write to the few elements that read it.
- **Reduced motion** must leave every work fully lit with no transition, and Lenis's `respectReducedMotion` (its default) must stay on.
- **Touch targets ≥ 44×44** at 390×844.
- **Room titles are exactly:** About · Works in Robotics · Works in Applications · Leadership · Honours · Contact.
- **Where to run commands:** `node --test` **cannot spawn a child process under the confined sandbox** (`EPERM` on `spawn`). Unit tests use the in-process runner in Task 1. Browser checks (`tools/ux-check.mjs`) additionally need headless Chrome, which requires named pipes, so they only run with the sandbox off.

## Review Focus

The spec is a vision document. These are the inputs and conditions it implies but no task's happy path exercises, most likely to bite first:

1. **A gallery row whose `images` is an empty array or absent** — must open nothing, not throw, and not open a neighbouring row's photos. (This is live defect 10.1.)
2. **A project whose `category` is missing or not one of the two known values** — must not vanish from the walk and must not produce an empty room.
3. **A window resize while the walk is mid-journey** — must keep the current work aligned and must not reset the journey to the start.
4. **A restored scroll position on load** (browser reload mid-walk) — must not flash the opening room or fire the lighting transition across the whole strip.
5. **A touch gesture on a phone** — with Lenis out of the touch path, must still scroll, and must not fight the page.

Each is pinned to a test in the task that owns the code.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | `"type": "module"` (lets tests import the classic scripts) + test/serve scripts |
| `tests/harness.mjs` | In-process assertion runner (sandbox-safe; `node --test` cannot spawn) |
| `tests/derive-rooms.test.mjs` | Pure data tests for room derivation |
| `tests/gallery-index.test.mjs` | Pure data tests for the honours gallery defect |
| `tests/light.test.mjs` | Pure maths tests for the light controller |
| `js/vendor/lenis.min.js` | Vendored Lenis core (18722 bytes, pinned) |
| `js/vendor/lenis-snap.min.js` | Vendored snap plugin (5844 bytes, pinned) |
| `js/vendor/lenis.css` | Vendored required stylesheet (513 bytes, pinned) |
| `js/vendor/README.md` | Provenance, hashes, upgrade instructions |
| `js/data.js` | Content (existing) + `Site.deriveRooms`, `Site.visibleWork`, `Site.galleryFor` |
| `js/main.js` | Room renderer, light controller, Lenis init, dialog |
| `css/styles.css` | Tokens, rooms, works, plates, pools, dialog |
| `index.html` | Hall, strip, directory, nav, dialog |
| `tools/make-images.mjs` | Extended to capture stills for video-only projects |
| `tools/ux-check.mjs` | Browser UX contract, ported to the horizontal axis |
| `README.md` | Corrected dependency claim and structure |

---

### Task 1: Test runner and room derivation

**Files:**
- Create: `tests/harness.mjs`
- Create: `tests/derive-rooms.test.mjs`
- Create: `package.json`
- Modify: `js/data.js` (append an IIFE at end of file)
- Modify: `.gitignore` (add `node_modules/`)

**Interfaces:**
- Consumes: `PORTFOLIO.projects` from `js/data.js`
- Produces:
  - `Site.deriveRooms(projects) -> Room[]` where `Room = { key: string, title: string, projects: object[] }`
  - `Site.ROOM_TITLES -> { Robotics: "Works in Robotics", Applications: "Works in Applications" }`
  - `Site.ROOM_ORDER -> ["Robotics", "Applications"]`

- [ ] **Step 1: Write the test harness**

`node --test` spawns child processes with piped stdio and fails with `EPERM` under the confined sandbox. This runner executes assertions in-process instead, so it works confined and unconfined.

Create `tests/harness.mjs`:

```js
const results = [];
export function check(name, fn) { results.push({ name, fn }); }
export function run() {
  let pass = 0, fail = 0;
  for (const { name, fn } of results) {
    try { fn(); pass++; console.log('ok   ' + name); }
    catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/derive-rooms.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { deriveRooms } = globalThis.Site;

check('splits the real portfolio into the two known rooms', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.deepEqual(rooms.map(r => r.key), ['Robotics', 'Applications']);
  assert.deepEqual(rooms.map(r => r.projects.length), [3, 3]);
});

check('titles come from ROOM_TITLES', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.equal(rooms[0].title, 'Works in Robotics');
  assert.equal(rooms[1].title, 'Works in Applications');
});

check('every project appears exactly once across all rooms', () => {
  const projects = globalThis.PORTFOLIO.projects;
  const placed = deriveRooms(projects).flatMap(r => r.projects.map(p => p.id));
  assert.equal(placed.length, projects.length);
  assert.equal(new Set(placed).size, projects.length);
});

check('an uncategorised project is kept, not dropped', () => {
  const rooms = deriveRooms([
    { id: 'a', category: 'Robotics' },
    { id: 'orphan' },
  ]);
  const placed = rooms.flatMap(r => r.projects.map(p => p.id));
  assert.ok(placed.includes('orphan'), 'orphan must not vanish from the walk');
});

run();
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/derive-rooms.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'deriveRooms')`

- [ ] **Step 4: Add the package manifest**

Create `package.json`. `"type": "module"` is what lets a test file `import` the classic-script files. It has no effect on the browser, which loads them as classic scripts.

```json
{
  "name": "portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node tests/derive-rooms.test.mjs && node tests/gallery-index.test.mjs && node tests/light.test.mjs",
    "serve": "npx http-server -p 3333"
  }
}
```

- [ ] **Step 5: Implement the derivation**

Append to `js/data.js`:

```js
/* ==========================================================================
   Gallery structure — derived from the data above, never hand-authored
   ========================================================================== */
(function () {
  'use strict';
  globalThis.Site = globalThis.Site || {};

  var ROOM_TITLES = { Robotics: 'Works in Robotics', Applications: 'Works in Applications' };
  var ROOM_ORDER  = ['Robotics', 'Applications'];

  /* Group projects into rooms. Known categories come first in ROOM_ORDER;
     anything else follows in first-seen order so no project is ever dropped. */
  function deriveRooms(projects) {
    var groups = {};
    var seen = [];
    (projects || []).forEach(function (p) {
      var key = p && p.category ? p.category : 'Other';
      if (!groups[key]) { groups[key] = []; seen.push(key); }
      groups[key].push(p);
    });
    var ordered = ROOM_ORDER.filter(function (k) { return groups[k]; })
      .concat(seen.filter(function (k) { return ROOM_ORDER.indexOf(k) === -1; }));
    return ordered.map(function (key) {
      return { key: key, title: ROOM_TITLES[key] || key, projects: groups[key] };
    });
  }

  globalThis.Site.deriveRooms = deriveRooms;
  globalThis.Site.ROOM_TITLES = ROOM_TITLES;
  globalThis.Site.ROOM_ORDER = ROOM_ORDER;
})();
```

- [ ] **Step 6: Ignore node_modules**

Append to `.gitignore` (on its own line — a trailing comment would become part of the pattern):

```
node_modules/
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node tests/derive-rooms.test.mjs`
Expected: `4 passed, 0 failed`

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore tests/harness.mjs tests/derive-rooms.test.mjs js/data.js
git commit -m "feat(gallery): derive rooms from project categories"
```

---

### Task 2: Vendor Lenis 1.3.26

**Files:**
- Create: `js/vendor/lenis.min.js`, `js/vendor/lenis-snap.min.js`, `js/vendor/lenis.css`
- Create: `js/vendor/README.md`

**Interfaces:**
- Produces: globals `Lenis` and `Snap` available to `js/main.js` via classic `<script>` tags.

- [ ] **Step 1: Download the three files**

`curl` and PowerShell's TLS fail on this host (schannel error 35); Node's own TLS works. Run:

```powershell
$dl = @'
import { writeFile, mkdir } from 'node:fs/promises';
await mkdir('js/vendor', { recursive: true });
for (const f of ['lenis.min.js','lenis-snap.min.js','lenis.css']) {
  const r = await fetch(`https://unpkg.com/lenis@1.3.26/dist/${f}`);
  if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
  await writeFile(`js/vendor/${f}`, Buffer.from(await r.arrayBuffer()));
  console.log('wrote js/vendor/' + f);
}
'@
Set-Content -Path "$env:TEMP\dl-lenis.mjs" -Value $dl -Encoding UTF8
node "$env:TEMP\dl-lenis.mjs"
```

- [ ] **Step 2: Verify byte sizes and hashes**

Run:

```powershell
Get-ChildItem js\vendor | ForEach-Object {
  $h = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.Substring(0,16).ToLower()
  "{0,-20} {1,7} bytes  sha256={2}..." -f $_.Name, $_.Length, $h
}
```

Expected exactly:

| File | Bytes | sha256 prefix |
|---|---|---|
| `lenis.min.js` | 18722 | `53195c9797e7ce7b` |
| `lenis-snap.min.js` | 5844 | `510e75108ec32d5f` |
| `lenis.css` | 513 | `2f668ae84a668327` |

If a size or hash differs, **stop** — the pinned version has changed upstream. Do not proceed with different bytes.

- [ ] **Step 3: Record provenance**

Create `js/vendor/README.md`:

```markdown
# Vendored dependencies

Do not edit these files. They are copied verbatim from published packages.

## Lenis 1.3.26

- Source: https://unpkg.com/lenis@1.3.26/dist/
- Licence: MIT © darkroom.engineering
- Why vendored: the site has no build step and no CDN at runtime.

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| `lenis.min.js` | 18722 | `53195c9797e7ce7b` |
| `lenis-snap.min.js` | 5844 | `510e75108ec32d5f` |
| `lenis.css` | 513 | `2f668ae84a668327` |

Both scripts are classic (IIFE) builds: `lenis.min.js` sets `globalThis.Lenis`,
`lenis-snap.min.js` sets `globalThis.Snap`.

## Upgrading

Re-run the download, update the sizes and hashes above, then re-run
`tools/ux-check.mjs`. `lenis-snap` switching on `isHorizontal` is load-bearing
for this project — confirm it still reads `isHorizontal` before accepting a
newer build.
```

- [ ] **Step 4: Verify the globals load in a browser**

Temporarily add to `index.html` before the closing `</body>`, above the existing scripts:

```html
<script src="js/vendor/lenis.min.js"></script>
<script src="js/vendor/lenis-snap.min.js"></script>
```

Serve (`npx http-server -p 3333`) and evaluate in the console:
`typeof Lenis + '/' + typeof Snap`
Expected: `function/function`. Leave the tags in place — Task 4 uses them.

- [ ] **Step 5: Commit**

```bash
git add js/vendor index.html
git commit -m "chore(vendor): add Lenis 1.3.26 for smooth horizontal scrolling"
```

---

### Task 3: Tokens, room geometry, and the hall markup

**Files:**
- Modify: `css/styles.css:1-90` (replace the `:root` block and table of contents)
- Modify: `index.html` (replace the content layer with hall + strip + rooms)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: DOM contract used by every later task — `#hall` (scroll container), `#strip` (flex row), `.room` (section, carries `data-room`), `.work` (a hung piece, carries `data-work`), `.plate` (a text-only record), `.directory` (room list)

- [ ] **Step 1: Replace the token layer**

In `css/styles.css`, replace the existing `:root` block with these tokens. Keep every token name that later tasks reference.

```css
:root {
  --night:        #0d0c0b;
  --room:         #131211;
  --room-warm:    #171513;
  --text:         #e8dcc6;
  --text-strong:  #f6efe0;
  --text-quiet:   #8c8375;
  --accent:       #c9a45c;

  --edge:         rgba(255, 240, 214, 0.16);
  --edge-soft:    rgba(255, 240, 214, 0.07);

  --font-heading: 'Newsreader', Georgia, 'Times New Roman', serif;
  --font-body:    Georgia, 'Times New Roman', serif;
  --font-mono:    'Courier Prime', 'Courier New', monospace;

  --room-w:       92vw;
  --work-lg:      62%;
  --work-md:      45%;
  --work-sm:      31%;
  --plate-w:      30%;

  --lit:          0;
  --ease-lit:     cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 2: Add the hall, strip and room styles**

Append to `css/styles.css`. The dot grids are the wall nap — two offset grids at 2–3%, no image request. Do **not** add film grain: on near-black it lifts the blacks and reads as dirt.

```css
/* ── Hall: the single horizontal scroll container ── */
#hall {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: none;       /* Lenis forbids native snap; see the spec §5 */
  overscroll-behavior-x: contain;
  background: var(--night);
}
#strip { display: flex; align-items: stretch; }

/* ── A room ── */
.room {
  position: relative;
  flex: 0 0 auto;
  width: var(--room-w);
  min-height: 100vh;
  padding: 64px 34px 34px;
  background:
    radial-gradient(74% 42% at 50% -10%, rgba(255,240,214,.06), transparent 74%),
    linear-gradient(180deg, var(--room-warm) 0%, var(--room) 58%, #080807 100%);
  border-right: 1px solid var(--edge-soft);
}
.room::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(rgba(255,240,214,.03) 0.5px, transparent 0.6px),
    radial-gradient(rgba(255,240,214,.02) 0.5px, transparent 0.6px);
  background-size: 4px 4px, 4px 4px;
  background-position: 0 0, 2px 2px;
}

/* ── A work: no frame. Light is the frame. ── */
.work { position: relative; }
.work .pool {
  position: absolute; left: 50%; top: -44px; transform: translateX(-50%);
  width: 136%; height: 150%; pointer-events: none;
  background: radial-gradient(closest-side,
    rgba(255,240,214,.14), rgba(255,240,214,.04) 52%, transparent 76%);
  opacity: calc(.22 + .78 * var(--lit));
  transition: opacity .55s var(--ease-lit);
}
.work .canvas {
  position: relative; background: #000; padding: 2px;
  box-shadow:
    0 0 0 1px rgba(255,240,214, calc(.17 * var(--lit)));
  filter: brightness(calc(.6 + .4 * var(--lit)));
  transition: filter .55s var(--ease-lit);
}

@media (prefers-reduced-motion: reduce) {
  .work .pool, .work .canvas { transition: none; opacity: 1; filter: none; }
}
```

- [ ] **Step 3: Replace the page markup**

In `index.html`, replace everything inside `.content-layer` with the hall. Keep the `.bg-atmosphere` div, the modal block, and the `<noscript>` block, moving the modal inside `#hall`'s sibling position (it must stay a child of `.content-layer` so the existing inert logic keeps working).

```html
<div class="content-layer">

  <header class="nav-header" id="navHeader">
    <a href="#hall" class="nav-brand">Andrew Alangcao</a>
    <nav class="nav-menu" id="navMenu"><ul class="nav-list" id="navList"></ul></nav>
  </header>

  <nav class="directory" id="directory" aria-label="Rooms"></nav>

  <main id="hall" class="hall">
    <div id="strip" class="strip">
      <!-- Rooms rendered by JS from PORTFOLIO + Site.deriveRooms -->
    </div>
  </main>

  <div class="modal-overlay" id="modalOverlay">
    <div class="modal-card" id="modalCard" role="dialog" aria-modal="true"
         aria-labelledby="modalTitle" tabindex="-1">
      <button class="modal-close" id="modalClose" aria-label="Close modal">&times;</button>
      <div class="modal-header" id="modalHeader"></div>
      <div class="modal-scroll">
        <div class="modal-image-wrap" id="modalImage"></div>
        <div class="modal-body" id="modalBody"></div>
      </div>
    </div>
  </div>

  <div id="announcer" class="sr-only" role="status" aria-live="polite"></div>
</div>
```

- [ ] **Step 4: Verify the shell renders**

Serve, open `http://127.0.0.1:3333/`. Expected: a near-black page, a room list container (`#directory` empty for now), no console errors other than the existing data guard. The strip is empty — rooms arrive in Task 5.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css index.html
git commit -m "feat(gallery): add the hall, strip and room shell"
```

---

### Task 4: Lenis and the snap

**Files:**
- Modify: `js/main.js` (add an init block near `init()` at line 827)
- Modify: `index.html` (confirm the vendor `<script>` tags from Task 2 sit before `js/main.js`)

**Interfaces:**
- Consumes: `Lenis`, `Snap` globals (Task 2); `#hall`, `#strip` (Task 3)
- Produces: `Site.walk` — an object with `lenis`, `snap`, `goToRoom(key)`, and `stop()` / `start()`

- [ ] **Step 1: Add the walk module**

Add to `js/main.js`, inside the existing IIFE, above `init()`:

```js
  /* ── The walk: Lenis smooth horizontal scrolling + proximity snap ──
     Native CSS scroll-snap is deliberately off: it re-snaps whenever the
     scroll position is set programmatically, so it fights every Lenis
     animation. lenis/snap replaces it and handles wheel, touch and keys. */
  function initWalk() {
    var hall = document.getElementById('hall');
    var strip = document.getElementById('strip');
    if (!hall || !strip || typeof Lenis === 'undefined') return null;

    var lenis = new Lenis({
      wrapper: hall,
      content: strip,
      orientation: 'horizontal',
      lerp: 0.1,
      autoRaf: true,
      anchors: true,          /* without this, in-page links stop working */
      prevent: function (node) {
        return !!(node.closest && node.closest('.modal-overlay'));
      }
    });

    var snap = null;
    if (typeof Snap !== 'undefined') {
      snap = new Snap(lenis, {
        type: 'proximity',
        distanceThreshold: '35%',
        debounce: 150        /* the 500ms default feels sluggish */
      });
    }

    function registerTargets() {
      if (!snap) return;
      snap.stop();
      var els = strip.querySelectorAll('[data-snap]');
      Array.prototype.forEach.call(els, function (el) {
        snap.addElement(el, { align: 'center' });
      });
      snap.start();
    }

    /* Rooms are rendered after this runs, so register snap targets when they
       appear rather than depending on a call-order contract with the renderer. */
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () { registerTargets(); });
      mo.observe(strip, { childList: true });
    }

    function goToRoom(key) {
      var room = strip.querySelector('[data-room="' + key + '"]');
      if (room) lenis.scrollTo(room, { offset: 0 });
    }

    return {
      lenis: lenis,
      snap: snap,
      goToRoom: goToRoom,
      registerTargets: registerTargets,
      resize: function () { lenis.resize(); if (snap) snap.resize(); },
      stop: function () { lenis.stop(); if (snap) snap.stop(); },
      start: function () { lenis.start(); if (snap) snap.start(); }
    };
  }
```

- [ ] **Step 2: Wire it into `init()`**

In `init()` (line 827), before the `renderRooms()` call added in Task 5, add:

```js
    Site.walk = initWalk();
```

The `MutationObserver` above registers the snap targets once the rooms exist, so no ordering contract is needed with the renderer.

`Site.walk.resize()` exists for the resize path: Lenis with `autoResize: true` (the default) handles this itself, so it is a manual fallback and not called from the scroll handler.

- [ ] **Step 3: Verify wheel moves the walk horizontally**

Serve, open the page, and scroll with the wheel. In the console:

```js
document.getElementById('hall').scrollLeft
```

Expected: the value increases as you scroll down/right, and
`document.getElementById('hall').scrollTop` stays `0`.

- [ ] **Step 4: Verify snap settles**

Scroll hard, then stop. Wait ~0.5s and read `scrollLeft` three times a second apart.
Expected: the last two readings are identical — the walk has settled rather than drifting.

- [ ] **Step 5: Verify anchors still work**

Add a temporary `<a href="#hall">` and click it. Expected: the walk jumps to the start. If nothing happens, `anchors: true` is missing.

- [ ] **Step 6: Commit**

```bash
git add js/main.js index.html
git commit -m "feat(gallery): smooth horizontal walk with Lenis and proximity snap"
```

---

### Task 5: Render the rooms

**Files:**
- Modify: `js/main.js` (add `renderRooms()`, `renderDirectory()`; call from `init()`)
- Modify: `js/data.js` (add `Site.visibleWork`)
- Create: `tests/light.test.mjs` (first test only — the light maths)

**Interfaces:**
- Consumes: `Site.deriveRooms` (Task 1), `#strip` / `#directory` (Task 3), `isImage` already defined in `js/main.js`
- Produces:
  - `Site.visibleWork(scrollLeft, viewportW, workCentres) -> number` — index of the work nearest the viewport centre, or `-1` when the list is empty
  - DOM: each room is `<section class="room" data-room="KEY">`; each hung piece is `<article class="work" data-work data-snap data-project="ID">`; each text record is `<div class="plate">`; the About and Contact rooms carry `data-snap` on the room itself

- [ ] **Step 1: Write the failing test for the light maths**

Create `tests/light.test.mjs`:

```js
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { visibleWork } = globalThis.Site;

check('picks the work nearest the viewport centre', () => {
  /* three works centred at 100, 500, 900 in a 1000-wide viewport */
  assert.equal(visibleWork(0, 1000, [100, 500, 900]), 1);
  assert.equal(visibleWork(400, 1000, [100, 500, 900]), 2);
  assert.equal(visibleWork(-400, 1000, [100, 500, 900]), 0);
});

check('returns -1 when there are no works', () => {
  assert.equal(visibleWork(0, 1000, []), -1);
});

check('clamps at both ends rather than going out of range', () => {
  assert.equal(visibleWork(-9999, 1000, [100, 500, 900]), 0);
  assert.equal(visibleWork(9999, 1000, [100, 500, 900]), 2);
});

run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/light.test.mjs`
Expected: FAIL — `visibleWork is not a function`

- [ ] **Step 3: Implement `visibleWork`**

Append inside the IIFE in `js/data.js`:

```js
  /* Index of the work whose centre is nearest the viewport centre.
     Pure: takes precomputed centres so it needs no DOM. */
  function visibleWork(scrollLeft, viewportW, workCentres) {
    if (!workCentres || !workCentres.length) return -1;
    var mid = scrollLeft + viewportW / 2;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < workCentres.length; i++) {
      var d = Math.abs(workCentres[i] - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  globalThis.Site.visibleWork = visibleWork;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/light.test.mjs`
Expected: `3 passed, 0 failed`

- [ ] **Step 5: Add the room renderer**

Add to `js/main.js`. Every string that appears on a wall is sourced from `PORTFOLIO` — nothing is authored here.

```js
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderLabel(entry, index) {
    return '<div class="lbl">'
      + '<span class="no">CAT. ' + String(index + 1).padStart(2, '0') + ' &mdash; ' + esc(entry.venue) + '</span>'
      + '<p class="lt">' + esc(entry.tagline || entry.title) + '</p>'
      + '<p class="by">' + entry.authors + '</p>'
      + (entry.overview && entry.overview.text
          ? '<p class="med">' + esc(entry.overview.text.split('\n\n')[0]) + '</p>' : '')
      + '<p class="pro">' + esc(entry.source === 'open' ? 'Open source' : 'Closed source')
      + (entry.awards && entry.awards.length ? ' &middot; ' + entry.awards.length + ' awards' : '')
      + '</p></div>';
  }

  /* A work needs an image. Projects with video also have a poster frame, which
     make-images.mjs generates — use it so no frame is ever empty. */
  function workImage(p) {
    if (isImage(p.video)) return p.video;
    if (p.overview && p.overview.image) return p.overview.image;
    return p.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg');
  }

  function renderWork(p, index) {
    var img = workImage(p);
    return '<article class="work" data-work data-snap data-project="' + esc(p.id) + '">'
      + '<div class="pool"></div>'
      + '<button type="button" class="project-hit canvas" data-action="modal"'
      + ' data-project="' + esc(p.id) + '" data-tab="overview"'
      + ' aria-label="Open ' + esc(p.title) + '">'
      + '<img class="project-thumb" src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy"'
      + ' onerror="this.closest(\'.work\').classList.add(\'is-empty\');this.remove();">'
      + '</button>'
      + '<div class="project-cue" aria-hidden="true"><span>View project</span></div>'
      + renderLabel(p, index)
      + '</article>';
  }

  function renderPlate(entry) {
    return '<div class="plate">'
      + '<p class="pt">' + esc(entry.description) + '</p>'
      + '<span class="py">' + esc(entry.year) + '</span></div>';
  }
```

- [ ] **Step 6: Add the room and directory assembly**

```js
  function renderRooms() {
    var strip = document.getElementById('strip');
    if (!strip) return;
    var rooms = Site.deriveRooms(PORTFOLIO.projects);
    var html = '';

    /* Room 1 — About */
    html += '<section class="room" data-room="About" data-snap>'
      + '<div class="sign"><span class="no">ROOM 1</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">About</span>'
      + '<span class="sub">' + esc(PORTFOLIO.title) + '</span></h2>'
      + '<div class="hang"><div class="work" style="width:31%">'
      + '<div class="pool"></div>'
      + '<div class="canvas"><img src="' + esc(PORTFOLIO.profileImage) + '" alt="' + esc(PORTFOLIO.name) + '"></div>'
      + '</div><div class="about-copy">'
      + PORTFOLIO.bio.map(function (p) { return '<p class="note">' + esc(p) + '</p>'; }).join('')
      + '<div class="about-links">'
      + PORTFOLIO.social.map(function (s) {
          return '<a class="plate-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">'
            + esc(s.label) + '</a>';
        }).join('')
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button>'
      + '</div></div></div></section>';

    /* Rooms 2..N — one per derived category */
    rooms.forEach(function (room, ri) {
      html += '<section class="room" data-room="' + esc(room.key) + '">'
        + '<div class="sign"><span class="no">ROOM ' + (ri + 2) + '</span><span class="rule"></span></div>'
        + '<h2 class="room-title"><span class="t">' + esc(room.title) + '</span>'
        + '<span class="sub">' + room.projects.length + ' works'
        + '<span class="count">' + esc(room.key.toUpperCase()) + '</span></span></h2>'
        + '<div class="hang">'
        + room.projects.map(function (p, i) { return renderWork(p, i); }).join('')
        + '</div></section>';
    });

    /* Leadership */
    html += '<section class="room" data-room="Leadership">'
      + '<div class="sign"><span class="no">ROOM ' + (rooms.length + 2) + '</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Leadership</span>'
      + '<span class="sub">Posts held<span class="count">' + PORTFOLIO.leadership.length + ' POSTS</span></span></h2>'
      + '<div class="hang">'
      + PORTFOLIO.leadership.map(function (l, i) {
          var hasGallery = Array.isArray(l.images) && l.images.length > 0;
          var inner = '<p class="pt">' + esc(l.description) + '</p><span class="py">' + esc(l.year) + '</span>';
          return hasGallery
            ? '<button type="button" class="plate" data-gallery="leadership" data-entry="' + i + '">' + inner + '</button>'
            : '<div class="plate">' + inner + '</div>';
        }).join('')
      + '</div></section>';

    /* Honours */
    html += '<section class="room" data-room="Honours">'
      + '<div class="sign"><span class="no">ROOM ' + (rooms.length + 3) + '</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Honours</span>'
      + '<span class="sub">Competitions, conferences and citations'
      + '<span class="count">' + PORTFOLIO.honors.length + ' HONOURS</span></span></h2>'
      + '<div class="hang">'
      + PORTFOLIO.honors.map(function (h, i) {
          var hasGallery = Array.isArray(h.images) && h.images.length > 0;
          if (!hasGallery) return renderPlate(h);
          return '<article class="work" data-work data-snap>'
            + '<div class="pool"></div>'
            + '<button type="button" class="project-hit canvas" data-gallery="honors"'
            + ' data-entry="' + i + '" aria-label="View photos: ' + esc(h.description) + '">'
            + '<img class="project-thumb" src="' + esc(h.images[0]) + '" alt="" loading="lazy">'
            + '</button>'
            + '<div class="lbl"><span class="no">DIST. ' + String(i + 1).padStart(2, '0')
            + '</span><p class="lt">' + esc(h.description) + '</p>'
            + '<p class="by">' + esc(h.year) + '</p></div></article>';
        }).join('')
      + '</div></section>';

    /* Contact */
    html += '<section class="room" data-room="Contact" data-snap>'
      + '<div class="sign"><span class="no">&mdash;</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Contact</span>'
      + '<span class="sub">Thanks for walking the collection</span></h2>'
      + '<p class="note">Let&rsquo;s build something together.</p>'
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button></section>';

    strip.innerHTML = html;
  }

  function renderDirectory() {
    var dir = document.getElementById('directory');
    if (!dir) return;
    var rooms = Site.deriveRooms(PORTFOLIO.projects);
    var items = [{ key: 'About', title: 'About', note: 'bio & contact' }]
      .concat(rooms.map(function (r) {
        return { key: r.key, title: r.title, note: r.projects.length + ' works' };
      }))
      .concat([
        { key: 'Leadership', title: 'Leadership', note: PORTFOLIO.leadership.length + ' posts' },
        { key: 'Honours', title: 'Honours', note: PORTFOLIO.honors.length + ' honours' },
        { key: 'Contact', title: 'Contact', note: '—' }
      ]);
    dir.innerHTML = '<span class="dh">Rooms</span><ol>'
      + items.map(function (it, i) {
          return '<li><button type="button" class="room-link" data-goto="' + esc(it.key) + '">'
            + '<span class="rn">' + (it.key === 'Contact' ? '&mdash;' : 'Room ' + (i + 1)) + '</span>'
            + '<span class="rt">' + esc(it.title) + '</span>'
            + '<span class="rd">' + esc(it.note) + '</span></button></li>';
        }).join('')
      + '</ol>';
  }
```

- [ ] **Step 7: Call them from `init()` and wire the directory**

In `init()`, replace the old `renderProjectCard` / `renderLeadership` / `renderHonors` calls with:

```js
    renderDirectory();
    renderRooms();
    initLights();
```

Do **not** call `Site.walk.registerTargets()` here — Task 4's `MutationObserver` handles it, so the renderer and the walk have no call-order dependency.

and add a delegated handler next to the existing ones:

```js
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-goto]');
    if (go && Site.walk) { Site.walk.goToRoom(go.dataset.goto); }
  });
```

- [ ] **Step 8: Verify every work has content**

Serve and open the page. Evaluate:

```js
[...document.querySelectorAll('.work')].filter(w => !w.querySelector('img')).length
```

Expected: `0`. A non-zero result names the project whose frame is empty — this is the check that catches the BiyaHey gap.

Also confirm no project is hung twice:

```js
const ids = [...document.querySelectorAll('.work[data-project]')].map(w => w.dataset.project);
new Set(ids).size === ids.length
```

Expected: `true`.

- [ ] **Step 9: Commit**

```bash
git add js/main.js js/data.js tests/light.test.mjs
git commit -m "feat(gallery): render rooms, works and plates from the data"
```

---

### Task 6: The lighting controller

**Files:**
- Modify: `js/main.js` (add `initLights()`; call from `init()`)

**Interfaces:**
- Consumes: `Site.visibleWork` (Task 5), `Site.walk.lenis` (Task 4), `.work[data-work]` (Task 5)
- Produces: `--lit` written on each `.work` element; `data-seen="1"` set once a work has been lit

- [ ] **Step 1: Add the controller**

Add to `js/main.js`:

```js
  /* ── Lighting: a work's light rises as it arrives and never goes back out.
     `--lit` is written to the .work element itself (a leaf-ish node). Never
     write an inherited custom property on a large subtree per frame: measured
     at 503ms of RecalcStyleDuration per 3s of scroll in a prior project. ── */
  function initLights() {
    var strip = document.getElementById('strip');
    var hall = document.getElementById('hall');
    if (!strip || !hall) return;

    var works = Array.prototype.slice.call(strip.querySelectorAll('[data-work]'));
    if (!works.length) return;

    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      works.forEach(function (w) { w.style.setProperty('--lit', '1'); });
      return;
    }

    /* Restored mid-walk on load: mark everything already passed as seen so the
       lighting does not sweep across the whole strip on the first frame. */
    var startMid = hall.scrollLeft + hall.clientWidth / 2;
    works.forEach(function (w) {
      if (w.offsetLeft + w.offsetWidth / 2 < startMid) w.dataset.seen = '1';
    });

    var ticking = false;
    function update() {
      var vw = hall.clientWidth;
      var mid = hall.scrollLeft + vw / 2;
      var centres = works.map(function (w) { return w.offsetLeft + w.offsetWidth / 2; });
      var active = Site.visibleWork(hall.scrollLeft, vw, centres);

      works.forEach(function (w, i) {
        var c = centres[i];
        var d = Math.abs(c - mid) / (vw * 0.62);
        var v = Math.max(0, 1 - d);
        v = v * v * (3 - 2 * v);                  /* smoothstep */
        if (i === active) v = 1;
        if (v > 0.5) w.dataset.seen = '1';
        var lit = (w.dataset.seen === '1') ? Math.max(v, 0.72) : v * 0.62;
        w.style.setProperty('--lit', lit.toFixed(3));
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }

    hall.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
```

- [ ] **Step 2: Call it from `init()`**

```js
    initLights();
```

Place it after `renderRooms()` and after `Site.walk` is initialised, so the first `update()` sees real geometry.

- [ ] **Step 3: Verify lights come up and stay up**

Serve, open, and scroll to a work. Then:

```js
const w = document.querySelector('.work[data-work]');
getComputedStyle(w).getPropertyValue('--lit')
```

Expected: a number near `1`. Scroll away and read it again — expected: it does **not** return to 0.

- [ ] **Step 4: Verify reduced motion leaves everything lit**

In DevTools, enable "Emulate prefers-reduced-motion: reduce" and reload. Evaluate:

```js
[...document.querySelectorAll('.work[data-work]')].every(w =>
  Number(getComputedStyle(w).getPropertyValue('--lit')) === 1)
```

Expected: `true`, with no transition.

- [ ] **Step 5: Verify a resize does not reset the journey**

Scroll to the middle of the walk, note `hall.scrollLeft`, then resize the window. Expected: `scrollLeft` is within a few pixels of the noted value, and the centred work is still lit.

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat(gallery): light each work as it enters the walk"
```

---

### Task 7: The dialog, and the honours index defect

**Files:**
- Modify: `js/data.js` (add `Site.galleryFor`)
- Modify: `js/main.js:222-250` (`renderRecordItem`), `js/main.js:289-340` (`openGallery`), plus the delegated gallery handlers near line 558
- Create: `tests/gallery-index.test.mjs`

**Interfaces:**
- Consumes: `PORTFOLIO.news`, `PORTFOLIO.leadership`, `PORTFOLIO.honors`
- Produces: `Site.galleryFor(kind, entryIndex) -> { title: string, meta: string, images: string[] }` — always returns an object with an `images` array, empty when the entry has no photos

**Why this task exists:** `renderRecordItem` passes the *filtered* loop index into `data-index`, while `openGallery` indexes the *unfiltered* `PORTFOLIO.honors`. Selecting a photo-less honour therefore opens a different honour's photographs. The fix is to identify rows by their real index and to make the lookup total.

- [ ] **Step 1: Write the failing test**

Create `tests/gallery-index.test.mjs`:

```js
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { galleryFor } = globalThis.Site;
const H = globalThis.PORTFOLIO.honors;

check('a row with photos returns its own photos', () => {
  const i = H.findIndex(h => Array.isArray(h.images) && h.images.length);
  assert.ok(i >= 0, 'fixture needs at least one honour with photos');
  assert.deepEqual(galleryFor('honors', i).images, H[i].images);
});

check('a row without photos returns an empty list, not a neighbour\'s', () => {
  const i = H.findIndex(h => !Array.isArray(h.images) || !h.images.length);
  assert.ok(i >= 0, 'fixture needs at least one honour without photos');
  assert.deepEqual(galleryFor('honors', i).images, []);
});

check('the title always matches the row that was asked for', () => {
  H.forEach((h, i) => {
    assert.equal(galleryFor('honors', i).title, h.description,
      `row ${i} returned the wrong title`);
  });
});

check('an out-of-range index is total, not a throw', () => {
  assert.deepEqual(galleryFor('honors', 999).images, []);
  assert.deepEqual(galleryFor('honors', -1).images, []);
});

check('an unknown kind is total, not a throw', () => {
  assert.deepEqual(galleryFor('nope', 0).images, []);
});

run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/gallery-index.test.mjs`
Expected: FAIL — `galleryFor is not a function`

- [ ] **Step 3: Implement `galleryFor`**

Append inside the IIFE in `js/data.js`:

```js
  var GALLERY_LISTS = {
    news: function () { return PORTFOLIO.news; },
    leadership: function () { return PORTFOLIO.leadership; },
    honors: function () { return PORTFOLIO.honors; }
  };

  /* Total lookup: always returns { title, meta, images }. An entry with no
     photos yields an empty images array rather than a neighbour's photos. */
  function galleryFor(kind, entryIndex) {
    var empty = { title: '', meta: '', images: [] };
    var get = GALLERY_LISTS[kind];
    if (!get) return empty;
    var list = get();
    var entry = list && list[entryIndex];
    if (!entry) return empty;
    return {
      title: entry.description || entry.text || '',
      meta: entry.year || entry.date || '',
      images: (Array.isArray(entry.images) ? entry.images : []).filter(Boolean)
    };
  }
  globalThis.Site.galleryFor = galleryFor;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/gallery-index.test.mjs`
Expected: `5 passed, 0 failed`

- [ ] **Step 5: Rewrite `openGallery` to use it**

Replace the body of `openGallery` (line 289) so it takes a `kind` and an `entryIndex`, calls `Site.galleryFor`, and returns early when `images` is empty:

```js
  function openGallery(kind, entryIndex) {
    if (!$modalOverlay || !$modalHeader || !$modalImage || !$modalBody) return;

    var data = Site.galleryFor(kind, entryIndex);
    if (!data.images.length) return;   /* nothing to show — do not open */

    galleryState.images = data.images;
    galleryState.current = 0;

    var label = GALLERY_LABELS[kind] || '';
    $modalHeader.innerHTML = '<h3 id="modalTitle">' + data.title + '</h3>'
      + '<p class="modal-subtitle">' + label + (data.meta ? ' · ' + data.meta : '') + '</p>';

    $modalImage.style.display = '';
    $modalImage.innerHTML = buildGalleryMarkup(data.images, data.title);
    $modalBody.innerHTML = '';
    bindGalleryControls();
    updateGalleryUI();
    openDialog();
    startGalleryDrift();
  }
```

Extract the existing markup into `buildGalleryMarkup(images, title)` unchanged apart from taking its inputs as parameters.

- [ ] **Step 6: Point every row at its real index**

In `renderRecordItem` (line 222), take the true index and emit it. Change the signature to `renderRecordItem(item, trueIndex, kind, step)` and emit `data-entry="${trueIndex}"` in place of `data-index="${i}"`. Callers pass the array index from an unfiltered `map`:

```js
  function renderLeadership() {
    if (!$leadershipList) return;
    $leadershipList.innerHTML = PORTFOLIO.leadership
      .map(function (item, i) { return renderRecordItem(item, i, 'leadership', 50); }).join('');
  }
```

Do the same in `renderNews` (line 112) — emit `data-entry="${i}"`, keeping `data-index` off entirely.

In `renderRooms` (Task 5), the honours and leadership rows already emit `data-entry`. Make them consistent.

- [ ] **Step 7: Update the delegated handlers**

Replace the gallery click handlers so they read `data-entry`:

```js
  function bindGalleryList($el) {
    if (!$el) return;
    $el.addEventListener('click', function (e) {
      var item = e.target.closest('[data-gallery]');
      if (!item) return;
      openGallery(item.dataset.gallery, Number(item.dataset.entry));
    });
  }
```

- [ ] **Step 8: Verify in the browser**

Serve, open, click a photo-less honour (for example *Developer Camp Manila — Finalist* or *2025 Muntinlupa Robotics Fair — Champion*).
Expected: nothing opens. It must **not** open another honour's photos.

Then click an honour that has photos. Expected: its own photos, and the header names that honour.

- [ ] **Step 9: Verify the dialog contract still holds**

Open any work, then check: focus is inside the dialog; Tab cycles within it and never escapes; Escape closes it; focus returns to the work you opened; `document.querySelector('.content-layer > [inert]')` is non-null while open and null after.

- [ ] **Step 10: Commit**

```bash
git add js/main.js js/data.js tests/gallery-index.test.mjs
git commit -m "fix(gallery): open the row that was clicked, not a filtered neighbour"
```

---

### Task 8: Fix the empty frames

**Files:**
- Modify: `tools/make-images.mjs` (add a still-capture pass)
- Modify: `js/data.js` (point BiyaHey and the placeholder teams at real stills)
- Create: `files/BiyaHey_Overview.jpg`, `files/HiveMind_Team.jpg`, `files/SATLearn_Team.jpg`

**Interfaces:**
- Consumes: existing MP4s in `files/`
- Produces: a still image for every project, so `workImage()` never falls back to a 404

- [ ] **Step 1: Extend `make-images.mjs`**

The script already decodes video with headless Chrome and draws to a canvas — reuse that path. Add a pass that, for each project whose media is a video and whose `overview.image` is missing or a placeholder, seeks to ~40% of the duration and writes `files/<Title>_Overview.jpg` at 1600px on the long edge, quality 82.

Add a `STILLS` table at the top mapping project id to output path:

```js
const STILLS = [
  { id: 'project6', out: 'files/BiyaHey_Overview.jpg', at: 0.4 },
];
```

- [ ] **Step 2: Capture the BiyaHey still**

Run `node tools/make-images.mjs` with headless Chrome debugging on port 9222, as its README documents. Expected: `files/BiyaHey_Overview.jpg` written, roughly 50–120 KB.

- [ ] **Step 3: Wire it into the data**

In `js/data.js`, give BiyaHey an overview image:

```js
      overview: {
        image: "files/BiyaHey_Overview.jpg",
        text: "..."
      },
```

- [ ] **Step 4: Capture the two team stills**

Capture team frames from `files/HiveMind_Preview.mp4` and `files/SATLearn_Preview.mp4` the same way, writing `files/HiveMind_Team.jpg` and `files/SATLearn_Team.jpg`, and replace the two `files/PlaceHolder.png` references in each project's `team.image`.

- [ ] **Step 5: Verify no project points at a placeholder**

Run:

```powershell
Select-String -Path js\data.js -Pattern 'PlaceHolder' | Select-Object LineNumber,Line
```

Expected: matches only for entries whose photos are genuinely still pending, and none for the three projects above.

- [ ] **Step 6: Verify every work renders an image**

Serve, open the page, and re-run the Task 5 check:

```js
[...document.querySelectorAll('.work')].filter(w => !w.querySelector('img')).length
```

Expected: `0`.

- [ ] **Step 7: Commit**

```bash
git add tools/make-images.mjs js/data.js files/BiyaHey_Overview.jpg files/HiveMind_Team.jpg files/SATLearn_Team.jpg
git commit -m "fix(content): give every project a still so no frame hangs empty"
```

---

### Task 9: Port the browser UX checks, and correct the README

**Files:**
- Modify: `tools/ux-check.mjs` (13 sections; four viewport passes assume vertical scroll)
- Modify: `README.md`
- Modify: `tools/README.md`

**Interfaces:**
- Consumes: everything above
- Produces: a green `node tools/ux-check.mjs`

**Note:** this task needs headless Chrome, which requires named pipes, so it cannot run under the confined sandbox. Run it with the sandbox off, as `tools/README.md` already documents.

- [ ] **Step 1: Add a horizontal scroll helper**

Add near the existing `setViewport` (line 71):

```js
/* The walk is horizontal: step it by scrolling the hall, then wait for Lenis
   to settle. Never assert on frame rate — the wall is that headless Chrome
   here has no GPU. Assert geometry and state only. */
const scrollWalk = async (px) => {
  await evaluate(`(() => {
    const h = document.getElementById('hall');
    h.scrollLeft += ${px};
    return h.scrollLeft;
  })()`);
  await sleep(700);
};
const hallScrollLeft = () => evaluate(`document.getElementById('hall').scrollLeft`);
const hallScrollTop  = () => evaluate(`document.getElementById('hall').scrollTop`);
```

- [ ] **Step 2: Adapt the four vertical viewport passes**

Sections 1, 2, 3, 9, 10 and 11 currently assume vertical scrolling. Replace `card.scrollIntoView({ block: 'center' })` with a walk step that scrolls `#hall` so the target work is centred, using its `offsetLeft`. Keep every assertion the same — only the means of bringing the element into view changes.

- [ ] **Step 3: Add the four new checks**

```js
await section('The walk is horizontal', async () => {
  await setViewport(1440, 900, false);
  await goto(BASE);
  const before = await hallScrollLeft();
  await scrollWalk(600);
  const after = await hallScrollLeft();
  check('scrolling advances the walk horizontally', after > before,
    `scrollLeft ${before} -> ${after}`);
  check('it never scrolls vertically', (await hallScrollTop()) === 0);
});

await section('Snap settles on a work', async () => {
  await scrollWalk(430);
  const a = await hallScrollLeft();
  await sleep(900);
  const b = await hallScrollLeft();
  check('the walk comes to rest', Math.abs(a - b) < 2, `still moving: ${a} -> ${b}`);
});

await section('Lights come up and stay up', async () => {
  const lit = await evaluate(`(() => {
    const w = document.querySelector('.work[data-work]');
    return Number(getComputedStyle(w).getPropertyValue('--lit'));
  })()`);
  check('a work in view is lit', lit > 0.6, 'lit was ' + lit);
  await scrollWalk(900);
  const still = await evaluate(`(() => {
    const w = document.querySelector('.work[data-work]');
    return Number(getComputedStyle(w).getPropertyValue('--lit'));
  })()`);
  check('a work already seen stays lit', still > 0.6, 'lit fell to ' + still);
});

await section('No work hangs empty', async () => {
  const empty = await evaluate(
    `[...document.querySelectorAll('.work')].filter(w => !w.querySelector('img')).length`);
  check('every work has an image', empty === 0, empty + ' empty frames');
});
```

- [ ] **Step 4: Run the checks**

```powershell
# terminal 1
npx http-server -p 3333
# terminal 2
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ux-check-profile" about:blank
# terminal 3
node tools/ux-check.mjs
```

Expected: every section green, exit code 0.

- [ ] **Step 5: Correct the README**

`README.md` currently states the site has no dependencies and no build tools. After this work it has one vendored library. Update:

- The **Tech Stack** section — state that Lenis 1.3.26 is vendored in `js/vendor/` for smooth horizontal scrolling, and that there is still no build step and no CDN at runtime.
- The **Structure** tree — add `js/vendor/` and `tests/`.
- Add a **Tests** line: `node tests/derive-rooms.test.mjs` (and the other two), noting these run in-process and need no spawn.

Update `tools/README.md` to note that `ux-check.mjs` now asserts a horizontal walk, and that it requires the sandbox to be off.

- [ ] **Step 6: Verify the whole suite**

```powershell
node tests/derive-rooms.test.mjs
node tests/gallery-index.test.mjs
node tests/light.test.mjs
node tools/ux-check.mjs
```

Expected: three unit suites report `0 failed`; the browser suite exits 0.

- [ ] **Step 7: Commit**

```bash
git add tools/ux-check.mjs README.md tools/README.md
git commit -m "test(gallery): assert the horizontal walk and correct the README"
```

---

## Self-Review

**Spec coverage.** Every numbered spec section maps to a task: §4 building → Task 5; §5 scroll architecture → Tasks 2, 3, 4; §6 visual system → Task 3; §7 lighting → Task 6; §8 dialog → Task 7; §9 accessibility → Tasks 5, 6, 9; §10 defects → Tasks 7 (10.1) and 8 (10.2), with 10.3 in Task 9; §11 files → all tasks; §12 verification → Tasks 1, 5, 7, 9.

**Two spec items are deliberately not tasks here.** §5's `lenis/snap` touch behaviour is flagged in the spec's own risk table as needing confirmation against real behaviour; it is verified in Task 4 Step 3–5 on a desktop wheel, and the touch path is a manual check on a phone before shipping. §13's performance re-measurement is not a build step — it is a post-ship measurement using the owner's `trace-scroll.mjs` methodology, and should not gate the implementation.

**Type consistency.** `deriveRooms` returns `{key,title,projects}` and is consumed as such in Task 5. `visibleWork(scrollLeft, viewportW, workCentres)` is defined in Task 5 and called with exactly those arguments in Task 6. `galleryFor(kind, entryIndex)` returns `{title,meta,images}` and is consumed as such in Task 7. The DOM contract `data-room` / `data-work` / `data-snap` / `data-project` / `data-gallery` / `data-entry` is set in Task 3 and Task 5 and used unchanged in Tasks 4, 6, 7 and 9.

**Review Focus coverage.** (1) empty `images` → Task 7 Step 1; (2) missing `category` → Task 1 Step 2; (3) resize mid-journey → Task 6 Step 5; (4) restored scroll position → Task 6 Step 1; (5) touch on a phone → Task 9 Step 2 plus the manual check above.
