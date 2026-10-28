# Work as Two Category Panels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six project stops with two category panels (Robotics, Applications) whose three project cards open the existing project panel as a full-screen view.

**Architecture:** `Site.deriveRooms(P.projects)` groups the six records 3 + 3; each room renders as a `.stop--category` panel with a `.category-cards` grid. A new fixed `#projectView` layer paints a project with its current `PROJECT_ART` crop, reuses `projectCopy`/`projectMedia`, and stacks beneath the unchanged record dialog. Scroll locking is refcounted so the overlay and the dialog can be open at once.

**Tech Stack:** Plain classic browser JS (`js/main.js`, `js/data.js`), hand-written CSS, static HTML shell, Node-only tests (`node tests/*.mjs`), no build step.

**Spec:** `docs/superpowers/specs/2026-10-28-work-category-panels-design.md` (approved 2026-10-28; visual reference: `.superpowers/mockups/option-a-category-cards-panel-overlay.html`).

## Global Constraints

- No build step, bundler, npm runtime dependency, CDN or third-party runtime load.
- Palette tokens stay exact: `--night #080c0e`, `--text #ece2cf`, `--text-strong #f9f4e8`, `--text-quiet #9a9384`, `--accent #d4b06a`.
- Both paintings and the `.art--rice` / `.art--harvest` layers stay; panel radius 16px, frame radius 10px, button radius 8px (12px panel below 640).
- The six project records, their ids, copy, awards, videos and honour `from: 'projectN'` links are not edited.
- The record dialog markup, focus trap contract, video player and gallery are unchanged.
- Every page panel keeps `min-height: calc(100vh - var(--gutter))`; only the project view overrides it.
- `#work` stays on the plain `.work` wrapper.
- No URL/hash routing for the project view; Escape and the back button are the exits.
- `npm test` must be green at the end; it runs the guard, six data/library suites.
- Windows PowerShell 5.1 only — use `node <file>` and `npm test`; check `$LASTEXITCODE` for native commands.

## Review Focus

- **Escape with both layers open:** one Escape closes the record dialog only; the project view stays, and a second Escape closes it.
- **Closing the dialog while the view is open:** the page must stay scroll-locked (body overflow hidden, Lenis stopped) until the view closes; closing the view alone must restore the page.
- **Missing/placeholder overview still:** a project card must render its fallback (or awaited treatment) instead of a broken card (pinned by the guard's `project-card__art … FALLBACK` check).
- **Reduced motion:** the overlay appears with no animation, no Lenis is constructed, and the scroll lock still works.
- **Long titles at 390px / three cards at 1440px:** no horizontal scroll, no clipped `C.E.N.T.H.R.O.`, category panel still one screen.

---

### Task 1: Room ledes in the data layer

**Files:**
- Modify: `js/data.js` (`ROOM_TITLES` / `deriveRooms` area near line 288)
- Test: `tests/derive-rooms.test.mjs`

**Interfaces:**
- Consumes: `PORTFOLIO.projects`.
- Produces: `Site.deriveRooms(list)` returns `{ key, title, lede, projects }`; `lede` is a non-empty string for `Robotics` and `Applications` and `''` for an unknown category.

- [ ] **Step 1: Add the failing data-suite check** to `tests/derive-rooms.test.mjs` after the `titles come from ROOM_TITLES` check:

```js
check('every known room carries a sentence for its panel', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.match(rooms[0].lede, /^Three machines built to be used/);
  assert.match(rooms[1].lede, /^Three systems for problems/);
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `node tests/derive-rooms.test.mjs`
Expected: FAIL — `lede` is `undefined`, so `assert.match` throws.

- [ ] **Step 3: Implement** in `js/data.js`: add the internal map beside `ROOM_TITLES` and return its value from `deriveRooms`:

```js
var ROOM_LEDES = {
  Robotics: 'Three machines built to be used rather than demonstrated: a palm scanner, a fingerprint fare system, and a desk robot that will not let you drift.',
  Applications: 'Three systems for problems that kept getting in the way: organizational memory, a better way to practise for the SAT, and a map of how Metro Manila actually moves.'
};
```

and inside the `ordered.map(...)` return object add `lede: ROOM_LEDES[key] || ''`.

- [ ] **Step 4: Run the suite and verify it passes**

Run: `node tests/derive-rooms.test.mjs`
Expected: every line `ok`, final `derive-rooms passed` (or the harness's success line), exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/data.js tests/derive-rooms.test.mjs
git commit -m "feat: give each project room a panel sentence"
```

---

### Task 2: Category panels, cards, rail and crops

**Files:**
- Modify: `js/main.js` (`PAN`, `render()` Work block, `buildRail`, new `categoryCopy`, `categoryCards`, `awardCount`)
- Modify: `css/styles.css` (new `── Category panels` section after `── Project panel extras`, and the `@media (max-width: 1023px)` block)
- Modify: `tests/page.test.mjs`
- Modify: `docs/library/components/project.md`, `docs/library/components/panel.md`, `docs/library/components/rail.md`, `docs/library/selectors.md`

**Interfaces:**
- Consumes: `Site.deriveRooms` (Task 1), `Site.posterFor`, `esc`, `panel`, `projectCopy`, `projectMedia`, `FALLBACK`.
- Produces: `PAN` is 8 entries (hero 0, about 1, news 2, Robotics 3, Applications 4, leadership 5, honours 6, contact 7); `PROJECT_ART` maps each `projectN` to `{ art, pos }`; `categoryCopy(room) -> string`; `categoryCards(room) -> string`; rendered ids `robotics` and `applications`.

- [ ] **Step 1: Add the failing guard assertions** to `tests/page.test.mjs`. In the renderer block replace `assert.match(js, /P\.projects\.forEach/);` with:

```js
assert.match(js, /S\.deriveRooms\(P\.projects\)/);
assert.match(js, /function categoryCopy\(/);
assert.match(js, /function categoryCards\(/);
assert.match(js, /stop--category/);
assert.match(js, /project-card/);
assert.match(js, /project-card__art[\s\S]{0,400}FALLBACK/);
```

and in the content block after the project count line:

```js
const rooms = S.deriveRooms(P.projects);
assert.deepEqual(rooms.map((r) => r.key), ['Robotics', 'Applications']);
assert.deepEqual(rooms.map((r) => r.projects.length), [3, 3]);
```

- [ ] **Step 2: Run the guard and verify it fails**

Run: `node tests/page.test.mjs`
Expected: first failure is `renderer missing` on `S.deriveRooms(P.projects)` (or the string assertion), exit non-zero.

- [ ] **Step 3: Implement the grouping in `js/main.js`.** Replace the Work block in `render()` with a loop over `S.deriveRooms(P.projects)` that pushes `panel({ id: room.key.toLowerCase(), cls: 'stop--project stop--category', side: r % 2 === 0 ? 'left' : 'right', art: PAN[3 + r].art, pos: PAN[3 + r].pos, copy: categoryCopy(room), media: categoryCards(room) })` into the existing `.work` wrapper.

Add the helpers:

```js
function awardCount(p) { return (p.awards && p.awards.length) || 0; }

function categoryCopy(room) {
  var awards = room.projects.reduce(function (n, p) { return n + awardCount(p); }, 0);
  return '<p class="eyebrow">03 · Work · ' + esc(room.key) + '</p>' +
    '<h2>' + esc(room.key) + '.</h2>' +
    '<p class="lede">' + esc(room.lede) + '</p>' +
    '<p class="category-count">' + room.projects.length + ' projects · ' +
      awards + (awards === 1 ? ' award' : ' awards') + '</p>';
}

function categoryCards(room) {
  return '<div class="category-cards">' + room.projects.map(function (p) {
    var i = P.projects.indexOf(p);
    var meta = awardCount(p) ? awardCount(p) + (awardCount(p) === 1 ? ' award' : ' awards') : p.venue;
    return '<button class="project-card" type="button" data-kind="panel" data-index="' + i + '">' +
      '<span class="project-card__art"><img src="' + esc(p.overview && p.overview.image) +
        '" alt="' + esc(p.title + ' — overview') + '" loading="lazy"' + FALLBACK + '></span>' +
      '<span class="project-card__body">' +
        '<span class="project-card__title">' + esc(p.title) + '</span>' +
        '<span class="project-card__tag">' + esc(p.tagline) + '</span>' +
        '<span class="project-card__meta">' + esc(meta) + '</span>' +
      '</span></button>';
  }).join('') + '</div>';
}
```

Restructure the crop tables: keep `var PAN = [` with the eight page entries and the two category crops (Robotics rice `30% 62%`, Applications harvest `64% 38%`), and add:

```js
var PROJECT_ART = {
  project1: { art: 'rice', pos: '18% 56%' },
  project2: { art: 'harvest', pos: '78% 44%' },
  project3: { art: 'rice', pos: '76% 50%' },
  project4: { art: 'harvest', pos: '22% 66%' },
  project5: { art: 'rice', pos: '44% 22%' },
  project6: { art: 'harvest', pos: '56% 50%' }
};
```

Update `buildRail()` so `P.projects.forEach` becomes `S.deriveRooms(P.projects).forEach(function (room) { labels.push({ id: room.key.toLowerCase(), label: room.key }); });` and the leadership/honours/contact pushes follow. Update the `wireChrome` comment that calls the rail an "eleven-stop journey" to seven stops.

- [ ] **Step 4: Style the category panel** in `css/styles.css`, new section after the project extras:

```css
/* ── Category panels ──────────────────────────────────────────────── */
.stop--category .copy { grid-column: 1 / span 4; }
.stop--category .media { grid-column: 5 / span 8; }
.stop[data-side="right"].stop--category .copy { grid-column: 9 / span 4; }
.stop[data-side="right"].stop--category .media { grid-column: 1 / span 8; grid-row: 1; }
.category-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.project-card {
  padding: 0; border: 1px solid rgba(236, 226, 207, .2); border-radius: var(--frame-radius);
  overflow: hidden; background: rgba(13, 18, 21, .72); text-align: left; color: var(--text);
  cursor: pointer; box-shadow: 0 18px 40px -18px rgba(0, 0, 0, .7);
  transition: border-color .2s ease, background .2s ease;
}
.project-card:hover, .project-card:focus-visible {
  border-color: var(--accent); background: rgba(13, 18, 21, .88); outline: none;
}
.project-card__art { display: block; aspect-ratio: 16 / 10; overflow: hidden; background: #0d1215; }
.project-card__art img { display: block; width: 100%; height: 100%; object-fit: cover; }
.project-card__body { display: block; padding: 10px 12px 12px; }
.project-card__title {
  display: block; font-family: var(--serif); font-weight: 400; font-size: 17px;
  line-height: 1.2; color: var(--text-strong);
}
.project-card__tag { display: block; font-size: 12.5px; line-height: 1.4; color: var(--text-quiet); margin-top: 4px; }
.project-card__meta {
  display: block; margin-top: 8px; font-family: var(--mono); font-size: 10px;
  letter-spacing: .09em; text-transform: uppercase; color: var(--accent);
}
.category-count {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--text-quiet); margin: 0 0 22px;
}
```

In the `@media (max-width: 1023px)` block add:

```css
.stop--category .copy, .stop--category .media,
.stop[data-side="right"].stop--category .copy,
.stop[data-side="right"].stop--category .media { grid-column: 1 / -1; grid-row: auto; }
.category-cards { grid-template-columns: 1fr; }
```

- [ ] **Step 5: Run the guard and verify it passes**

Run: `node tests/page.test.mjs`
Expected: `page guard passed`, exit 0. (`npm test` will still fail on library docs until Task 4 — do not chase it here.)

- [ ] **Step 6: Update the library pages for this task.** Rewrite `docs/library/components/project.md` around category panels + cards (it is the component page for this flow), keeping 40–90 lines and the required H2s. Update `panel.md`'s crop table to the new `PAN` indices and mention `.stop--category`; update `rail.md`'s label list; add `selectors.md` rows for `.stop--category`, `.category-cards`, `.project-card`, `.project-card__art`, `.project-card__body`, `.project-card__title`, `.project-card__tag`, `.project-card__meta`, `.category-count`, `data-kind` `panel` value.

- [ ] **Step 7: Run the library checker for this threshold**

Run: `node tools/library-check.mjs`
Expected: it may fail on Task 3 overlay tokens; the Task 2 tokens must not appear in its error. If it passes entirely, continue.

- [ ] **Step 8: Manual sanity check.** `node tools/serve.mjs 3333`, open `http://127.0.0.1:3333/`, scroll to Work: two category panels, three cards abreast at 1440, Robotics `3 projects · 7 awards`, Applications `3 projects · 1 award`, rail labels Robotics/Applications, no console errors.

- [ ] **Step 9: Commit**

```bash
git add js/main.js css/styles.css tests/page.test.mjs docs/library
git commit -m "feat: render Work as category panels with project cards"
```

---

### Task 3: The project view layer

**Files:**
- Modify: `index.html` (project view shell after `#page`)
- Modify: `js/main.js` (`PROJECT_ART` consumer, `openProject`, `closeProject`, `setLock`, `trapTab`, delegation, dialog locking, key handling, `window.Profile`)
- Modify: `css/styles.css` (project view section)
- Modify: `tests/page.test.mjs`
- Modify: `docs/library/components/project.md`, `docs/library/components/dialog.md`, `docs/library/selectors.md`

**Interfaces:**
- Consumes: `PROJECT_ART`, `projectCopy`, `projectMedia`, `esc`, `P`, `scrollEngine`, `dialog`, `dialogCard`.
- Produces: `openProject(index)`, `closeProject()`, `setLock(on)` (refcounted body lock + Lenis stop/start), `trapTab(e, container)`; shell `#projectView`; emitted `data-kind="panel"` cards open the view.

- [ ] **Step 1: Add the failing guard assertions** to `tests/page.test.mjs`:

```js
assert.match(htmlNoComments, /id="projectView"/);
assert.match(htmlNoComments, /class="stop art--rice stop--project project-view"/);
assert.match(htmlNoComments, /id="projectView"[\s\S]{0,160}role="dialog"/);
assert.match(html, /aria-modal="true"/);
assert.match(js, /function openProject\(/);
assert.match(js, /function closeProject\(/);
assert.match(js, /function setLock\(/);
assert.match(js, /function trapTab\(/);
assert.match(js, /data-kind="panel"/);
assert.match(cssNoComments, /\.project-view/);
```

Replace the two dialog stop/start pins with:

```js
assert.match(js, /function setLock\(/);
assert.match(js, /dialog\.hidden = false;[\s\S]*?setLock\(true\)/);
assert.match(js, /dialog\.hidden = true;[\s\S]*?setLock\(false\)/);
assert.match(js, /scrollEngine\.stop\(\)/);
assert.match(js, /scrollEngine\.start\(\)/);
```

- [ ] **Step 2: Run the guard and verify it fails**

Run: `node tests/page.test.mjs`
Expected: failure on `id="projectView"` (sheet lacks the shell), exit non-zero.

- [ ] **Step 3: Add the shell** to `index.html` after `</main>` and before the footer comment:

```html
<!-- Project view: the one full-screen project panel, painted from PORTFOLIO
     by js/main.js. It sits below the record dialog so "Open the record →"
     still opens the dialog above this view. -->
<div class="stop art--rice stop--project project-view" id="projectView" hidden
     role="dialog" aria-modal="true" aria-label="Project record" tabindex="-1"></div>
```

- [ ] **Step 4: Implement the view in `js/main.js`.** Add module-level `projectView`, `viewOpener`, `lockCount`; add the helpers and wire them:

```js
function setLock(lock) {
  lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
  document.body.style.overflow = lockCount ? 'hidden' : '';
  if (!scrollEngine) return;
  if (lockCount) scrollEngine.stop(); else scrollEngine.start();
}

function trapTab(e, container) { /* the dialog's existing Tab logic, moved verbatim */ }

function openProject(index) {
  var p = P.projects[index];
  if (!p || !projectView) return;
  var art = PROJECT_ART[p.id] || { art: 'rice', pos: '50% 50%' };
  projectView.className = 'stop art--' + art.art + ' stop--project project-view';
  projectView.style.setProperty('--pos', art.pos);
  projectView.dataset.side = index % 2 === 0 ? 'left' : 'right';
  projectView.setAttribute('aria-label', p.title);
  projectView.innerHTML =
    '<div class="stop-in">' +
      '<div class="copy">' +
        '<button class="btn project-view__back" type="button" data-close-view>← ' + esc(p.category) + '</button>' +
        projectCopy(p, index) +
      '</div>' +
      '<div class="media">' + projectMedia(p, index) + '</div>' +
    '</div>';
  viewOpener = document.activeElement;
  projectView.hidden = false;
  setLock(true);
  projectView.focus();
}

function closeProject() {
  if (!projectView || projectView.hidden) return;
  projectView.hidden = true;
  setLock(false);
  if (viewOpener && viewOpener.focus) viewOpener.focus();
  viewOpener = null;
}
```

Replace `openRecord`'s body-lock block with `dialog.hidden = false; setLock(true);` and `closeDialog`'s with `dialog.hidden = true; setLock(false);` (keep the focus restore in `closeDialog`). Replace the current dialog `keydown` listener with one document handler: dialog first (Escape closes it, Tab traps in `dialogCard`); otherwise the project view (Escape closes it, Tab traps in `projectView`). Replace `wireDelegation` with a document click handler: `[data-close-view]` → `closeProject`; `[data-kind][data-index]` → `panel` opens `openProject`, other kinds call `openRecord`. Add `openProject`/`closeProject` to `window.Profile`.

- [ ] **Step 5: Style the view** in `css/styles.css` (after the contact section, so it overrides `.stop`):

```css
/* ── Project view ─────────────────────────────────────────────────── */
.project-view {
  position: fixed; inset: 0; z-index: 60;
  margin: 0; border-radius: 0; overflow-x: hidden; overflow-y: auto;
}
.project-view[hidden] { display: none; }
.project-view .stop-in { min-height: 100vh; }
.project-view__back { margin: 0 0 22px; }
```

Add `.project-view` animation (fade in ~200ms) and turn it off in the existing `@media (prefers-reduced-motion: reduce)` block. `@keyframes` must be named consistently, e.g. `project-view-in`.

- [ ] **Step 6: Run the guard and verify it passes**

Run: `node tests/page.test.mjs`
Expected: `page guard passed`, exit 0.

- [ ] **Step 7: Update the library pages for this task.** Add the overlay + back button + `data-close-view` to `project.md`; add the stacking note to `dialog.md`; add `selectors.md` rows for `.project-view`, `.project-view__back`, `#projectView`, `data-close-view`.

- [ ] **Step 8: Behaviour check in a browser** (`node tools/serve.mjs 3333`): click a card → panel opens with card's crop and `← Robotics`; Tab cycles inside; Escape returns focus to the card; "Open the record →" opens the dialog above; Escape there closes only the dialog and page stays locked; Escape again closes the view; scroll position unchanged; 390px view stacks copy above media.

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js css/styles.css tests/page.test.mjs docs/library
git commit -m "feat: open a project panel as a full-screen view"
```

---

### Task 4: Docs, AGENTS and the full suite

**Files:**
- Modify: `docs/library/data.md` (`Site.deriveRooms` classification and prose)
- Modify: `AGENTS.md` (Work description, rail labels, `PAN` gotcha, project-view vocabulary)
- Modify: `README.md` (one paragraph on category grouping)
- Modify: `docs/library/components/panel.md`, `rail.md`, `dialog.md` for any leftover claims

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: `npm test` green; docs no longer claim six project stops.

- [ ] **Step 1: Flip the data classification.** In `docs/library/data.md`, change the `Site.deriveRooms` row's used flag from `no` to `yes` and its note to "groups projects into the Work category panels", and update the paragraph that says the page calls only two helpers (now three).

- [ ] **Step 2: Update `AGENTS.md`.** Work is "two category panels, each with three project cards; a card opens the project view overlay (`#projectView`)". Update the rail description, the "Add or edit a project" routing row (categories derive from `projects[].category`), the `PAN` gotcha (8 page entries + `PROJECT_ART`), and add a vocabulary row for **project view** (`#projectView`, `openProject`).

- [ ] **Step 3: Update `README.md`.** One paragraph: Work is grouped by category, three cards per panel, the panel is the project's own full-screen view.

- [ ] **Step 4: Run the library checker**

Run: `node tools/library-check.mjs`
Expected: `library check passed`, exit 0. Fix any unlisted class/id/attribute it names.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: guard, six data suites and the library check all pass; exit 0.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md docs/library
git commit -m "docs: describe Work as category panels and the project view"
```

---

### Task 5: Visual verification

**Files:** none committed (screenshots go to `.tmp-diag/`; fixes go back to the files above with a new commit).

**Interfaces:**
- Consumes: the running page from Tasks 2–3.

- [ ] **Step 1: Capture the required viewports.** Start `node tools/serve.mjs 3333` and headless Chrome with `--remote-debugging-port=9222 --user-data-dir="$env:TEMP\profile-shots"`, then:

```powershell
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/work-1440.png 1440 900
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/work-1280.png 1280 704
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/work-390.png 390 844
```

Scroll to `#robotics` and `#applications` for the category panels; use a scratch CDP script under `.tmp-diag/` to click a card and capture the project view.

- [ ] **Step 2: Check the images against the spec.** Three cards abreast on desktop, one column at 390, no horizontal scrollbar, no clipped titles, readable scrims, rail labels and gold fill correct, overlays fitted.

- [ ] **Step 3: Check reduced motion.** Reload with `prefers-reduced-motion: reduce`: no fade on the view, `window.Profile.lenis` is `null`, Escape/back still close, page lock still works.

- [ ] **Step 4: Fix and commit any defect** (e.g. crop, copy width, card overflow) with a message naming the fix; re-run `node tests/page.test.mjs` and `npm test` after any runtime edit.
