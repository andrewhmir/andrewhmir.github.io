# The Long Field — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `preview.html` — a vertical, sectioned profile page whose panels are painted with the two saved Amorsolo paintings — alongside the untouched walk, ready to be promoted to `index.html` after review.

**Architecture:** A new shell (`preview.html`), a new stylesheet (`css/profile.css`) and a new renderer (`js/profile.js`) that reads the existing `PORTFOLIO` and `Site.*` helpers from `js/data.js`. The page is a stack of full-bleed rounded sections; each section's background is a CSS-painted crop of one painting plus a direction-aware scrim. One shared dialog renders a record's copy, awards, links and photographs. The old walk's files are not modified in this iteration.

**Tech Stack:** Plain HTML/CSS/JS (classic scripts, no modules in the browser), Node only for dev tools and the static-guard test. No dependencies.

**Spec:** `docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md`

## Global Constraints

- Static: no build step, no bundler, no runtime dependency; `node` only for dev tools.
- No third-party URL may appear in `preview.html`, `css/profile.css`, `js/profile.js` (no CDN, no Google Fonts, no analytics).
- Content comes only from `PORTFOLIO` / `Site.*` in `js/data.js`; do not hand-copy project or honour text into HTML or JS.
- Do NOT modify `index.html`, `css/styles.css`, `js/main.js`, `css/fonts.css`, `js/data.js`, `js/icons.js` or any existing test this iteration.
- Palette tokens are exactly: `--night #080c0e`, `--text #ece2cf`, `--text-strong #f9f4e8`, `--text-quiet #9a9384`, `--accent #d4b06a`, border `rgba(236,226,207,.14)`.
- Radii: panels 16px, frames 10px, buttons 8px.
- Fonts: Newsreader (display/headings), Courier Prime (mono/meta), system sans for body — the two vendored families only.
- Accessibility: modal has `role="dialog"`, `aria-modal="true"`, labelled title, focus trap, Escape, restore focus; `prefers-reduced-motion` disables reveals; every interactive target is at least 44×44 CSS px.
- Every step ends with a runnable check; do not commit a red step.

## Review Focus

- **Text over bright art:** the copy column must stay readable where the painting is brightest (sky, paddy highlights). Expected: AA for body, AA-large for display. The scrim must be measured, not eyeballed.
- **Panel seams:** stacked painted panels each with their own scrim can produce a visible bright line at the rounded seam. Expected: no seam, no bleed, no gap.
- **Long titles at 390px:** `C.E.N.T.H.R.O.` and `BiyaHey!` must not overflow their panel or force horizontal scroll. Expected: wrap, no `scrollWidth > clientWidth`.
- **Missing media:** two projects' teams are `PlaceHolder.png`; five honours have no photographs. Expected: an honest awaited frame/omission, never a broken image or a click that opens an empty gallery.
- **Old site untouched:** `npm test` must be green after every task. Expected: 10/10 suites pass; the walk is byte-identical.

---

### Task 0: Checkpoint the current work

**Files:** none (git)
**Interfaces:** Produces: a clean tree at `checkpoint` commit; the walk recoverable.

- [ ] **Step 1: Confirm what is uncommitted**

Run: `git status --short`
Expected: the previous rework's modified/untracked files (styles.css, main.js, fonts, icons, tools, tests, images).

- [ ] **Step 2: Commit the checkpoint**

```powershell
git add -A
git commit -m "chore: checkpoint the walk before the Amorsolo profile rework"
```
Expected: one commit created.

- [ ] **Step 3: Verify clean and green**

Run: `git status --short; npm test`
Expected: empty status; all suites print `ok` and exit 0.

---

### Task 1: Shell, tokens, masthead, footer

**Files:**
- Create: `preview.html`
- Create: `css/profile.css`
- Create: `js/profile.js`
- Test: `tests/preview.test.mjs` (first assertions only)

**Interfaces:**
- Produces: `preview.html` loads `css/fonts.css`, `css/profile.css`, then `js/data.js`, `js/icons.js`, `js/profile.js` in that order. `js/profile.js` exposes `window.Profile = { render() }` and `render()` populates `#page`.
- Produces CSS custom properties (`--night`, `--text`, `--accent`, `--gutter`, `--panel-radius`) on `:root`.

- [ ] **Step 1: Write the failing static guard**

```js
// tests/preview.test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('preview.html', 'utf8');
const css = fs.readFileSync('css/profile.css', 'utf8');
const js = fs.readFileSync('js/profile.js', 'utf8');
const all = html + css + js;

assert.match(html, /<link rel="stylesheet" href="css\/fonts\.css">/);
assert.match(html, /<link rel="stylesheet" href="css\/profile\.css">/);
assert.match(html, /<div id="page">/);
assert.match(css, /--night:\s*#080c0e/);
assert.match(css, /--accent:\s*#d4b06a/);
assert.doesNotMatch(all, /https?:\/\/(?!www\.w3\.org)/);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
console.log('ok preview shell');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/preview.test.mjs`
Expected: `ENOENT` for `preview.html`.

- [ ] **Step 3: Write `preview.html`**

Shell contains: `<header class="masthead">` with `.brand` (name), `.menu` links to `#about #work #honours #contact`, `.resume` link; `<main id="page">` empty; the shared dialog markup (`#dialog` with `.dialog-card`, `#dialogTitle`, `#dialogBody`, close button); `<footer class="foot">` with name, email, painting credit; `<div id="rail">`; scripts in order. All copy that is authored (name, title, credit) may be literal; all portfolio records must be rendered by JS.

- [ ] **Step 4: Write the tokens, reset, masthead, footer in `css/profile.css`**

`:root` tokens exactly as Global Constraints; `* { box-sizing: border-box }`; body ground `--night`, colour `--text`, system sans 16px/1.65; masthead sticky top with `backdrop-filter: blur(14px)` and a 1px translucent bottom border, `.progress` hairline; footer 1px top border with the credit line; `.sr-only`; `@media (prefers-reduced-motion: reduce)` disables transitions.

- [ ] **Step 5: Write `js/profile.js` skeleton**

`window.Profile = (function(){ function render(){ /* tasks 2–5 fill this */ } return { render }; })();` plus `Profile.render()` on `DOMContentLoaded`.

- [ ] **Step 6: Run guard + serve**

Run: `node tests/preview.test.mjs` (PASS), then `node tools/serve.mjs 3333` and open `http://127.0.0.1:3333/preview.html`.
Expected: dark page, masthead, footer, no console errors.

- [ ] **Step 7: Commit**

```powershell
git add preview.html css/profile.css js/profile.js tests/preview.test.mjs
git commit -m "feat(preview): add the profile shell, tokens and static guard"
```

---

### Task 2: Art system, hero and About

**Files:**
- Modify: `css/profile.css`, `js/profile.js`, `tests/preview.test.mjs`

**Interfaces:**
- Produces: `Profile.ART` — an array of `{ id, painting, pos, side }` entries, one per section stop, in page order; `painting` is `'rice'` (`files/painting-hero.jpg`) or `'harvest'` (`files/painting.jpg`); `pos` is a CSS `background-position` string; `side` is `'left' | 'right' | 'center'`.
- Produces: `.stop` section contract — `data-id`, `data-side`, inline `style="--art:url(...);--art-pos:..."`, children `.stop-in > .copy` and `.stop-in > .media`.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(css, /\.stop::before/);
assert.match(css, /background-position:\s*var\(--art-pos\)/);
assert.equal((js.match(/painting-hero\.jpg/g) || []).length >= 1, true);
assert.equal((js.match(/painting\.jpg/g) || []).length >= 1, true);
console.log('ok art system');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/preview.test.mjs`
Expected: art-system assertion fails.

- [ ] **Step 3: Implement the art layers and panel grid in CSS**

`.stop { position: relative; margin: 16px; border-radius: 16px; overflow: hidden; isolation: isolate; }`
`.stop::before { position:absolute; inset:0; background-image: var(--art); background-size: cover; background-position: var(--art-pos); z-index:-2; }`
`.stop::after { position:absolute; inset:0; z-index:-1; background: var(--scrim); }`
Scrim rules: `.stop[data-side="left"] { --scrim: linear-gradient(90deg, rgba(8,12,14,.97), rgba(8,12,14,.90) 30%, rgba(8,12,14,.55) 58%, rgba(8,12,14,.12) 82%, rgba(8,12,14,0)); }` and the mirrored `right`; `center` uses the vertical gradient from the spec. Add `::after` inset shadows on top/bottom edges for the vignette (`box-shadow: inset 0 48px 60px -40px rgba(8,12,14,.9), inset 0 -48px 60px -40px rgba(8,12,14,.9)` on `.stop::after`).
`.stop-in { display:grid; grid-template-columns: repeat(12, 1fr); gap: 32px; padding: clamp(48px,7vw,104px); align-items:center; min-height: 88vh; }`
`.copy { grid-column: 1 / span 5; }`, `.media { grid-column: 7 / span 6; }`; `[data-side="right"]` mirrors; `center` uses `.copy--center { grid-column: 2 / span 10; text-align:center; }`.
Type: `.eyebrow` Courier Prime 12px uppercase `.14em` accent; `h1` Newsreader `clamp(40px, 6.2vw, 92px)` `.96`; `h2` Newsreader `clamp(30px, 3.4vw, 52px)`; `.lede` 18px; `.meta` Courier 12px quiet.

- [ ] **Step 4: Implement `Profile.ART`, hero and About rendering**

Hero: `section.stop.stop--hero[data-side="center"]` with `Planting Rice` at `50% 58%`; h1 = `PORTFOLIO.name`; `.hero-title` = `PORTFOLIO.title`; `.hero-line` = `PORTFOLIO.bio[2]`; actions `See the work →` → `#work`, `Resume ↗` → `PORTFOLIO.social[0].url`; scroll cue.
About: id `about`, `Harvest` at `48% 52%`, `side:left`; eyebrow `01 · About`; `h2` = `About`; bio paragraphs from `PORTFOLIO.bio`; social links from `PORTFOLIO.social`; media = `<figure class="portrait"><img src="files/profile.jpg" alt="Portrait of Andrew Alangcao" width="585" height="766">`.
`render()` appends hero + about to `#page` and sets `document.title`.

- [ ] **Step 5: Run guard and screenshot**

Run: `node tests/preview.test.mjs` (PASS); serve; screenshot `http://127.0.0.1:3333/preview.html` at 1440×900.
Expected: name legible over the painting, About panel shows harvest art bright on the right, portrait framed.

- [ ] **Step 6: Commit**

```powershell
git add css/profile.css js/profile.js tests/preview.test.mjs
git commit -m "feat(preview): paint the panels and add hero and About"
```

---

### Task 3: Six project stops

**Files:** `css/profile.css`, `js/profile.js`, `tests/preview.test.mjs`

**Interfaces:**
- Consumes: `Profile.ART` entries 1–6; `Site.projectPieces(project)` → `[{src, media, awaited, poster}]`; `PORTFOLIO.projects`.
- Produces: `section.stop.stop--project[data-id=projectN]` with `.awards` list, `.stack` of three `.frame`s where `.frame--lead` is the overview and the two smaller frames are poster and team.

- [ ] **Step 1: Add failing assertions**

```js
assert.equal((js.match(/projects\.forEach|projects\.map/g) || []).length >= 1, true);
assert.match(css, /\.frame--lead/);
assert.match(css, /\.awards/);
console.log('ok projects');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/preview.test.mjs`
Expected: failure on `projects`.

- [ ] **Step 3: Render the six stops**

For each project (`PORTFOLIO.projects`), in order: eyebrow = `` `${p.category} · ${p.venue}` ``; h2 = `p.title`; `.lede` = `p.tagline`; body = `p.summary`; `.awards` = `p.awards.map(a => `${a.description} — ${a.year}`)`; `.media` = `.stack` with lead = `p.overview.image` (`alt` = `${p.title} overview`), small frames = poster (`Site.posterFor(p.video)`) and `p.team.image`. Each frame: `<button class="frame" data-record="projectN" data-photo="0|1|2">`, with `<img loading="lazy">` and a `.frame__label` (Courier: `Overview`, `Film`, `Team`). Awaited images (`PlaceHolder.png`) render as `.frame--awaited` with `Awaiting photograph` label and `disabled`.
Assign `Profile.ART` project entries in this exact order: PALAD `rice 18% 56% left`; Hivemind `harvest 78% 44% right`; C.E.N.T.H.R.O. `rice 76% 50% left`; Focus Buddy `harvest 22% 66% right`; SATLearn `rice 44% 22% left`; BiyaHey! `harvest 56% 50% right`.

- [ ] **Step 4: Frame CSS**

`.media .stack { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }` lead spans both columns; small frames half; `.frame { padding:0; border:1px solid rgba(236,226,207,.18); border-radius:10px; overflow:hidden; background:#0d1215; }` `.frame img { width:100%; height:100%; object-fit:cover; display:block; }` lead aspect-ratio `16/9`, small `4/3`; `.frame__label` Courier 11px, positioned under the image inside the button; `.frame--awaited` dashed border, no image.
On `<1024px`: `.stack` stays two columns with lead full width; on `<640px`: single column.
`.awards { list-style:none; margin:0 0 28px; padding:0; display:grid; gap:8px; }` `.awards li` Courier 12px quiet with `—` bullet; `.open-record` is the bordered CTA.

- [ ] **Step 5: Run guard and screenshot**

Run: `node tests/preview.test.mjs`; screenshot at 1440×900 and 390×844.
Expected: six panels alternating sides; artwork pans as the panels scroll; no title overflow at 390px.

- [ ] **Step 6: Commit**

```powershell
git add css/profile.css js/profile.js tests/preview.test.mjs
git commit -m "feat(preview): add the six project stops and their frames"
```

---

### Task 4: Leadership, Honours, Contact

**Files:** `css/profile.css`, `js/profile.js`, `tests/preview.test.mjs`

**Interfaces:**
- Consumes: `PORTFOLIO.leadership`; `Site.honoursTiles(PORTFOLIO.honors).tiles` → `[{record, index}]`.
- Produces: `section.stop#leadership[data-side=left]`, `section.stop#honours[data-side=right]`, `section.stop#contact[data-side=center]`.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(js, /honoursTiles/);
assert.match(js, /leadership/);
assert.match(css, /\.honour-row/);
console.log('ok records');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/preview.test.mjs`
Expected: failure on `honoursTiles`.

- [ ] **Step 3: Render leadership**

Four `.leader` cards (two columns ≥1024px): `<button>` with `.leader__thumb` (first `images[0]`, or awaited), `.leader__body` (Courier years, sans description), `aria-label` naming the record. Data attributes `data-kind="leadership" data-index="<original index>"`.
`Profile.ART` leadership = `rice 8% 44% left`. Copy column: eyebrow `Leadership`, h2 `Running things`, intro line; media column holds the four cards instead of a photo stack — so leadership is `data-side="right"` with cards card-grid in `.media`.

- [ ] **Step 4: Render honours**

`Site.honoursTiles(PORTFOLIO.honors).tiles` in data order, each `.honour-row`: Courier year, sans description, a gold `◦` marker when the record has photographs. Wrapped in `.honours-grid` two columns ≥1024px. Honours and project awards are already partitioned — do not re-split.
`Profile.ART` honours = `harvest 88% 36% right`. Copy column is the list; media column holds a tall `.honours-note` block with the count and a line about the project awards living on their project panels.

- [ ] **Step 5: Render contact**

Centred: eyebrow `Contact`, h2 `Let's build something.`, one sentence, email link (large serif), social row (GitHub · LinkedIn · Resume), sign-off. `Profile.ART` contact = `rice 50% 12% center`.
Footer already exists from Task 1; ensure `#contact` scrolls above it.

- [ ] **Step 6: Run guard and screenshot**

Run: `node tests/preview.test.mjs`; screenshots at 1440×900 and 390×844.
Expected: all three sections present; honour count is 8; leadership 4; contact links resolve.

- [ ] **Step 7: Commit**

```powershell
git add css/profile.css js/profile.js tests/preview.test.mjs
git commit -m "feat(preview): add leadership, honours and contact"
```

---

### Task 5: The record dialog

**Files:** `css/profile.css`, `js/profile.js`, `tests/preview.test.mjs`

**Interfaces:**
- Produces: `Profile.openRecord(kind, index)`; `Profile.closeDialog()`; dialog element contract `#dialog[hidden]`, `.dialog-card[role=dialog]`, `#dialogTitle`, `#dialogBody`, `.dialog-close`.
- Consumes: `PORTFOLIO.projects|leadership|honors`, `Site.galleryFor(kind, index)`, `Site.awardPhotos(projectId, PORTFOLIO.honors, award)`.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(js, /function openRecord/);
assert.match(js, /function closeDialog/);
assert.match(js, /aria-modal/);
assert.match(css, /\[hidden\]\s*{\s*display:\s*none/);
console.log('ok dialog');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/preview.test.mjs`
Expected: dialog assertions fail.

- [ ] **Step 3: Implement the dialog**

`openRecord` branches by kind: project → title, meta (category · venue), overview text paragraphs (split on `\n\n`), team caption, awards list, links, gallery of the three pieces (plus `Site.awardPhotos` when present, de-duplicated); leadership/honours → title/description/year + `Site.galleryFor(kind, index).images`. Photo-less records show a single honest line, no gallery, no focusable dead control.
Focus: save `document.activeElement`, focus `.dialog-card`, trap Tab within it, Escape and `.dialog-close` and overlay click call `closeDialog`, which restores focus and re-hides. Set `document.body.style.overflow = 'hidden'` while open.
`#dialog` markup lives in `preview.html` (Task 1); the JS only fills and toggles `hidden`.

- [ ] **Step 4: Wire every `.frame`, `.leader`, `.honour-row:not(no-photos)`**

Use event delegation on `#page`: `[data-record]` → `openRecord('project', n)`, `[data-kind][data-index]` → `openRecord(kind, index)`.

- [ ] **Step 5: Verify keyboard and guard**

Run: `node tests/preview.test.mjs`; serve; Tab to a frame, Enter opens, Tab cycles inside, Escape closes and returns focus.
Expected: focus never leaves the dialog while open; focus returns to the frame that opened it.

- [ ] **Step 6: Commit**

```powershell
git add css/profile.css js/profile.js preview.html tests/preview.test.mjs
git commit -m "feat(preview): add the record dialog with a focus trap"
```

---

### Task 6: Rail, masthead behaviour, reveals

**Files:** `css/profile.css`, `js/profile.js`, `tests/preview.test.mjs`

**Interfaces:**
- Produces: `#rail` fixed `<nav>` of `<a class="rail__stop" href="#id">`; `.is-active` class set from IntersectionObserver; `.masthead.is-stuck` after hero; `.progress` width 0–100%.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(js, /IntersectionObserver/);
assert.match(css, /\.rail__stop\.is-active/);
assert.match(js, /prefers-reduced-motion/);
console.log('ok motion');
```

- [ ] **Step 2: Run it to fail**

Run: `node tests/preview.test.mjs`
Expected: failure.

- [ ] **Step 3: Implement rail + active stop**

Build one rail stop per section in page order (`about`, `work`, each project, `leadership`, `honours`, `contact`), label from the section's eyebrow/title, `aria-label` = the stop name. Observer with `rootMargin: '-45% 0px -45% 0px'` sets `.is-active` on the intersecting stop. Clicking uses default anchor scrolling (`scroll-margin-top` on `.stop` equal to masthead height) — no scroll hijacking.
CSS: rail fixed left 20px, centred vertically, hairline `::before`; dots 5px, hit area 44px via padding; active dot gold and label visible; hidden below 1024px.

- [ ] **Step 4: Masthead + progress + reveals**

On scroll (passive, `requestAnimationFrame`): `.masthead.is-stuck` when `scrollY > hero height - 72`; `.progress` width = `scrollY / (docHeight - innerHeight)`. Reveals: a `data-reveal` attribute on `.copy` and `.media`; observer adds `.is-in`; CSS transitions opacity/translateY 600ms; when `matchMedia('(prefers-reduced-motion: reduce)').matches`, mark everything `.is-in` immediately and never observe.

- [ ] **Step 5: Verify**

Run: `node tests/preview.test.mjs`; scroll the page at 1440×900; screenshots top/middle/bottom.
Expected: active dot tracks the section; no layout jump when the masthead sticks; reveals do not re-run.

- [ ] **Step 6: Commit**

```powershell
git add css/profile.css js/profile.js tests/preview.test.mjs
git commit -m "feat(preview): add the journey rail, sticky masthead and reveals"
```

---

### Task 7: Responsive and browser verification

**Files:** `css/profile.css`, `js/profile.js`

**Interfaces:** none new.

- [ ] **Step 1: Add the breakpoints**

`@media (max-width: 1023px)`: `.stop-in` single column, copy before media; `.copy/.media` `grid-column: 1 / -1`; rail hidden; card grids single/two columns; `.stack` lead full-width + two halves.
`@media (max-width: 639px)`: side gutters 10px; panel radius 12px; hero `h1` `clamp(38px, 11vw, 56px)`; masthead links to three; `.stack` one column; honours single column; contact serif `clamp(28px, 9vw, 40px)`; frames keep 44px minimum tap area.

- [ ] **Step 2: Screenshot pass**

Capture 1440×900, 1280×704, 768×1024, 390×844: full page plus each stop. Check: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), titles wrap, frames not clipped, no seam between panels, dialog fits 390px.

- [ ] **Step 3: Contrast pass**

Using a screenshot pixel probe or manual sampling: for each stop, sample the brightest pixel behind the copy column's bounding box and compute contrast against `--text`; body copy must be ≥4.5:1, display ≥3:1. If a crop fails, adjust that stop's `pos` or increase its side of the scrim (record which one in the commit message).

- [ ] **Step 4: Commit**

```powershell
git add css/profile.css js/profile.js
git commit -m "fix(preview): tune the responsive stack and scrims"
```

---

### Task 8: Static guards, docs note, final commit

**Files:** `tests/preview.test.mjs`, `package.json`, `docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md`

- [ ] **Step 1: Complete the guard suite**

Final assertions: six project sections and six `#palad`-equivalent ids exist in the rendered string (render under a DOM stub or grep the data-driven builder); leadership renders four; honours renders eight; every `.stop` has `data-side` and an inline `--art`; no `http(` CSS URLs; no external hosts; CSS braces balanced; exactly one `<h1>` in `preview.html` (hero is rendered by JS — assert the renderer emits the only `h1`).

- [ ] **Step 2: Add the guard to `npm test`**

Append `&& node tests/preview.test.mjs` to the `test` script. Run `npm test`.
Expected: every old suite plus the new one prints `ok`.

- [ ] **Step 3: Note the preview in the spec**

Add a `## Preview` line with the URL (`preview.html`) and the command (`node tools/serve.mjs 3333`).

- [ ] **Step 4: Commit**

```powershell
git add tests/preview.test.mjs package.json docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md
git commit -m "test(preview): guard the profile page and note the preview"
```

---

### Task 9: Review handoff

**Files:** none

- [ ] **Step 1: Final verification**

Run: `git status --short; npm test; node tests/preview.test.mjs`
Expected: clean tree; all suites green.

- [ ] **Step 2: Present the preview**

Report the preview URL, the screenshots taken, and the three decisions most worth a second opinion (hero crop, scrim strength, frame proportions). Then ask for iteration notes.
