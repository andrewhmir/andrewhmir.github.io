# Portfolio UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every card in the site behave the way visitors expect when clicked, and fix the accessibility, sharing, and page-weight defects confirmed by a live browser audit.

**Architecture:** Pure vanilla HTML/CSS/JS — no frameworks, no build step. Card click behaviour is implemented with the standard "full-area link" pattern: the card's title becomes a real `<button>` whose `::after` pseudo-element covers the whole card, so a click anywhere activates the primary action while the small action pills stay individually clickable at a higher `z-index`. Gallery rows become real `<button>` elements instead of clickable `<div>`s. The modal becomes a proper `role="dialog"` with focus management and an inert background. All behaviour is verified by a dev-only Node script that drives headless Chrome over the DevTools Protocol.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla ES5-compatible JavaScript (IIFE, no modules), Node ≥22 only for dev tooling (global `WebSocket`, no npm packages).

**Design reference:** `.superpowers/mockups/option-c-whole-card-cue.html` (approved by owner) — whole card is the click target, plus a hover/focus veil on the thumbnail naming the action.

---

## Global Constraints

- **No frameworks, no build tools, no runtime dependencies.** The site must keep working by opening `index.html` directly, and must still run from a plain static host. Anything added under `tools/` is dev-only and must never be required to render the site.
- **Preserve the visual identity:** warm dark palette, serif typography, and all existing tokens from `:root` in `css/styles.css`. Do not introduce new colours outside the token set (`--accent`, `--accent-2`, `--text-bright`, `--text-body`, `--text-muted`, `--surface-1/2`, `--border-1/2`).
- **Do not rename or restructure existing data.** `js/data.js` is the single source of truth and is edited only where this plan says so.
- **Keep the `<noscript>` fallback in `index.html` working.**
- **Deployed site:** `https://andrewhmir.github.io/` (repo `andrewhmir.github.io`, branch `main`). All absolute URLs in metadata must use this origin.
- **Commit style:** conventional commits matching the existing log — `feat(scope): …`, `fix(scope): …`, `chore: …`. No `Co-Authored-By` trailer.
- **Repo hygiene:** add `.superpowers/` and `.audit-profile*/` to `.gitignore` before the first commit. Never commit the mockups, the Chrome profiles, or generated audit artefacts.
- **Work on a branch:** `git checkout -b feat/ux-fixes` before Task 2.

---

## Task 1: Add the dev UX contract check

A repeatable, headless-Chrome assertion script that encodes the UX contract this plan establishes. Written first so every later task can be watched flipping from FAIL to PASS.

**Files:**
- Create: `tools/ux-check.mjs`
- Create: `tools/README.md`
- Modify: `.gitignore` (add `.superpowers/`, `.audit-profile*/`)

**Interfaces:**
- Consumes: nothing.
- Produces: `node tools/ux-check.mjs` → prints one line per assertion, exits `0` if all pass, `1` if any fail. Env overrides: `BASE` (default `http://127.0.0.1:3333/`), `CDP` (default `http://127.0.0.1:9222`).

- [ ] **Step 1: Write the failing check script**

Create `tools/ux-check.mjs`. This is a trimmed, assertion-focused version of the audit probe already proven in this session.

```js
#!/usr/bin/env node
/* Dev-only UX contract check. Drives headless Chrome over CDP — no npm deps.
   Usage:  chrome --headless=new --remote-debugging-port=9222 about:blank
           npx http-server -p 3333
           node tools/ux-check.mjs                                   */
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  → ' + detail : '')); }
}

class CDPClient {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.handlers = new Map(); this.sessionId = null; }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('cannot reach CDP at ' + this.url)), { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== undefined) {
        const p = this.pending.get(m.id);
        if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      } else if (m.method && this.handlers.has(m.method)) {
        this.handlers.get(m.method).forEach((f) => f(m.params));
      }
    });
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); });
  }
  on(m, f) { if (!this.handlers.has(m)) this.handlers.set(m, []); this.handlers.get(m).push(f); }
  waitFor(m) { return new Promise((res) => { const f = (p) => { const a = this.handlers.get(m); a.splice(a.indexOf(f), 1); res(p); }; this.on(m, f); }); }
}

const ver = await (await fetch(CDP + '/json/version')).json();
const cdp = new CDPClient(ver.webSocketDebuggerUrl);
await cdp.connect();
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
cdp.sessionId = sessionId;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Network.enable');
await cdp.send('Log.enable');

const consoleErrors = [];
const badResponses = [];
cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') consoleErrors.push((p.entry.url || '') + ' ' + p.entry.text); });
cdp.on('Network.responseReceived', (p) => { if (p.response.status >= 400) badResponses.push(p.response.status + ' ' + p.response.url); });

const evaluate = async (expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const setViewport = (width, height, mobile = false) =>
  cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const goto = async (url) => { const d = cdp.waitFor('Page.loadEventFired'); await cdp.send('Page.navigate', { url }); await d; await sleep(1500); };
const click = async (x, y) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
  await sleep(30);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(450);
};
const pressTab = async (shift = false) => {
  const b = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: shift ? 8 : 0 };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...b });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...b });
  await sleep(110);
};
const pressEnter = async () => {
  const b = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...b });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...b });
  await sleep(450);
};
const modalOpen = () => evaluate(`document.getElementById('modalOverlay').classList.contains('active')`);
const closeModal = async () => { await evaluate(`document.getElementById('modalOverlay').classList.remove('active'); document.body.style.overflow='';`); await sleep(200); };

await setViewport(1440, 900, false);
await goto(BASE);

/* ── 1. Whole project card is a click target ─────────────────────────── */
console.log('\nProject card click targets');
/* Resolve three points inside the first project card, in viewport
   coordinates: the thumbnail centre, the title centre, and a spot inside the
   card's own padding (6px in from the top-left corner). */
const cardPoints = await evaluate(`(() => {
  const card = document.querySelector('#projectList .project-card');
  card.scrollIntoView({ behavior: 'instant', block: 'center' });
  const mid = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const cr = card.getBoundingClientRect();
  return {
    thumbnail: mid(card.querySelector('.project-thumb')),
    title: mid(card.querySelector('.project-hit')),
    padding: { x: cr.left + 6, y: cr.top + 6 },
  };
})()`);
await sleep(350);
for (const where of ['thumbnail', 'title', 'padding']) {
  await closeModal();
  await click(cardPoints[where].x, cardPoints[where].y);
  check(where + ' opens Overview', await modalOpen(), 'modal did not open');
}
await closeModal();
check('card shows pointer cursor',
  (await evaluate(`getComputedStyle(document.querySelector('.project-card')).cursor`)) === 'pointer');

/* ── 2. Card is reachable and named by keyboard ──────────────────────── */
console.log('\nProject card keyboard access');
check('card control is focusable',
  (await evaluate(`document.querySelector('.project-card .project-hit').tabIndex >= 0`)) === true);
check('card control has an accessible name',
  (await evaluate(`(document.querySelector('.project-card .project-hit').innerText || '').trim().length > 0`)) === true);
await evaluate(`document.querySelector('.project-card .project-hit').focus()`);
await pressEnter();
check('Enter on focused card opens Overview', await modalOpen(), 'modal did not open');

/* ── 3. View cue appears on hover / focus ────────────────────────────── */
console.log('\nView cue');
const cueHidden = await evaluate(`getComputedStyle(document.querySelector('.project-cue')).opacity`);
await evaluate(`document.querySelector('.project-card .project-hit').focus()`);
await sleep(400);
const cueShown = await evaluate(`getComputedStyle(document.querySelector('.project-cue')).opacity`);
check('cue is hidden by default', cueHidden === '0', 'opacity was ' + cueHidden);
check('cue appears on focus-within', Number(cueShown) > 0.9, 'opacity was ' + cueShown);
await closeModal();

/* ── 4. Gallery rows are real, keyboard-operable controls ────────────── */
console.log('\nGallery rows');
const rows = await evaluate(`(() => {
  const g = [...document.querySelectorAll('[data-gallery]')];
  return {
    total: g.length,
    allButtons: g.every(el => el.tagName === 'BUTTON'),
    allFocusable: g.every(el => el.tabIndex >= 0),
    allNamed: g.every(el => (el.getAttribute('aria-label') || el.innerText || '').trim().length > 0),
  };
})()`);
check('every gallery row is a <button>', rows.allButtons, rows.total + ' rows');
check('every gallery row is focusable', rows.allFocusable);
check('every gallery row has an accessible name', rows.allNamed);
await evaluate(`document.querySelector('[data-gallery]').focus()`);
await pressEnter();
check('Enter on a gallery row opens it', await modalOpen(), 'modal did not open');

/* ── 5. Modal is a real dialog with contained focus ──────────────────── */
console.log('\nModal dialog semantics');
const dlg = await evaluate(`(() => {
  const c = document.getElementById('modalCard');
  return { role: c.getAttribute('role'), ariaModal: c.getAttribute('aria-modal'), labelled: c.getAttribute('aria-labelledby') };
})()`);
check('modal card has role="dialog"', dlg.role === 'dialog', 'role=' + dlg.role);
check('modal card has aria-modal="true"', dlg.ariaModal === 'true');
check('modal card is labelled', !!dlg.labelled);
check('focus moved inside the modal', await evaluate(`!!document.activeElement.closest('#modalCard')`));
check('background is inert', await evaluate(`!!document.querySelector('.content-layer > [inert]')`));

let escaped = false;
for (let i = 0; i < 8; i++) {
  await pressTab();
  if (!(await evaluate(`!!document.activeElement.closest('#modalCard')`))) { escaped = true; break; }
}
check('Tab never leaves the modal', !escaped, 'focus escaped behind the overlay');
await pressTab(true);
check('Shift+Tab stays inside the modal', await evaluate(`!!document.activeElement.closest('#modalCard')`));

await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await sleep(350);
check('Escape closes the modal', !(await modalOpen()));
check('background is no longer inert', await evaluate(`!document.querySelector('.content-layer > [inert]')`));

/* ── 6. No broken resources, no console errors ───────────────────────── */
console.log('\nResources');
/* The News/Leadership/Honors photos are known to be pending — the owner
   chose to keep those rows clickable with a labelled placeholder. Ignore
   those specific files, but nothing else may 404. */
const pendingPhoto = (s) => /files[\\/](news|leadership|honors)-[^/\s]*\.jpg/i.test(s);
const unexpectedResponses = badResponses.filter((u) => !pendingPhoto(u));
const realConsoleErrors = consoleErrors.filter((t) => !pendingPhoto(t));
check('no unexpected 4xx/5xx responses', unexpectedResponses.length === 0, unexpectedResponses.join(' | '));
check('no console errors beyond the pending photos', realConsoleErrors.length === 0, realConsoleErrors.join(' | '));

/* ── 7. Mobile: no overflow, tappable targets ────────────────────────── */
console.log('\nMobile (390x844)');
await setViewport(390, 844, true);
await goto(BASE);
await evaluate(`(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } return true; })()`);
await sleep(600);
const mob = await evaluate(`(() => {
  const de = document.documentElement;
  const small = [...document.querySelectorAll('a[href], button, [data-gallery]')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
  });
  return { overflow: de.scrollWidth - de.clientWidth, small: small.length,
           examples: small.slice(0, 5).map(el => (el.id || el.className) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)) };
})()`);
check('no horizontal overflow on mobile', mob.overflow === 0, mob.overflow + 'px');
check('all tap targets are at least 44x44', mob.small === 0, mob.examples.join(' | '));

await cdp.send('Target.closeTarget', { targetId });
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Add `.gitignore` entries and a short tools README**

Append to `.gitignore`:

```
# Agent / audit working dirs
.superpowers/
.audit-profile*/
```

Create `tools/README.md`:

```markdown
# Dev tools

Not required to build or run the site — the site is plain static files.

## ux-check.mjs

Drives headless Chrome over the DevTools Protocol to assert the UX contract
(card click targets, keyboard access, modal focus containment, tap targets).
No npm dependencies; uses Node's built-in WebSocket (Node 22+).

```powershell
# terminal 1 — serve the site
npx http-server -p 3333

# terminal 2 — headless Chrome with debugging
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 3 — run the checks
node tools/ux-check.mjs
```
```

- [ ] **Step 3: Run it and confirm the expected failures**

Run: `node tools/ux-check.mjs`
Expected: FAILs for *title opens Overview*, *card padding opens Overview*, *card shows pointer cursor*, *card control is focusable*, *cue appears on focus-within*, *every gallery row is a `<button>`*, *every gallery row is focusable*, *modal card has role="dialog"*, *focus moved inside the modal*, *Tab never leaves the modal*, *all tap targets are at least 44x44*. These are the defects this plan fixes — the script must reproduce them before they are fixed.

- [ ] **Step 4: Commit**

```bash
git add tools/ux-check.mjs tools/README.md .gitignore
git commit -m "chore(tools): add headless UX contract check"
```

---

## Task 2: Make the whole project card a click target, with a view cue

**Files:**
- Modify: `js/main.js:124-163` (`renderProjectCard`)
- Modify: `css/styles.css:546-592` (section 10, Project Cards)

**Interfaces:**
- Consumes: the existing delegated click handler on `#projectList`, which already does `e.target.closest('[data-action="modal"]')` and reads `dataset.project` / `dataset.tab` — **no JavaScript handler changes are needed in this task.**
- Produces: markup contract other tasks and the check script rely on — `.project-card > .project-media > .project-thumb` + `.project-media > .project-cue`, and `.project-card .project-hit` being a `<button data-action="modal" data-project data-tab="overview">`.

- [ ] **Step 1: Rewrite the card markup**

In `js/main.js`, replace the `return` block of `renderProjectCard` with:

```js
    return `
      <article class="project-card${soloClass} reveal" style="--reveal-delay: ${i * 80}ms">
        <div class="project-media">
          ${isImg
            ? `<img class="project-thumb img-fallback" src="${p.video}" alt="${p.title}" loading="lazy">`
            : `<video class="project-thumb" playsinline autoplay loop muted preload="none">
                <source src="${p.video}" type="video/mp4">
               </video>`
          }
          <div class="project-cue" aria-hidden="true">
            <span class="project-cue-icon"><i class="fas fa-eye"></i></span>
            <span class="project-cue-label">View project</span>
          </div>
        </div>
        <div class="project-info">
          <h3 class="project-title">
            <button type="button" class="project-hit" data-action="modal" data-project="${p.id}" data-tab="overview">${p.title}</button>${sourceBadge}
          </h3>
          ${p.tagline ? `<p class="project-tagline">${p.tagline}</p>` : ''}
          <p class="project-authors">${p.authors}</p>
          <span class="project-venue">${p.venue}</span>
          <div class="project-links">${pills}</div>
        </div>
      </article>`;
```

The title button carries `data-action="modal"` with `data-tab="overview"`, so the existing handler in `js/main.js` opens the Overview modal for it with no change.

- [ ] **Step 2: Replace the Project Cards CSS**

In `css/styles.css`, replace the block from `.project-card {` through `.project-thumb.img-fallback { … }` (lines 553–592) with:

```css
.project-card {
  position: relative;               /* containing block for .project-hit::after */
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-base),
              border-color var(--transition-base),
              transform var(--transition-base),
              box-shadow var(--transition-base);
}

.project-card:hover {
  background: var(--surface-2);
  border-color: var(--border-2);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

/* Solo projects get a subtle warm tint */
.project-card--solo {
  border-left: 2px solid var(--accent);
}

.project-media {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-1);
  background: rgba(0, 0, 0, 0.2);
  transition: border-color var(--transition-base);
}

.project-card:hover .project-media {
  border-color: var(--border-2);
}

.project-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  transition: transform 400ms var(--ease-out);
}

.project-card:hover .project-thumb {
  transform: scale(1.04);
}

.project-thumb.img-fallback {
  object-fit: contain;
}

/* The title is the card's single control; its ::after covers the whole
   card, so a click anywhere activates the primary action. */
.project-hit {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 2px;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-base);
}

.project-hit::after {
  content: '';
  position: absolute;
  inset: 0;                 /* resolves against .project-card */
  z-index: 1;               /* above the media, below the pills */
  border-radius: var(--radius-md);
}

.project-hit:hover,
.project-hit:focus-visible {
  border-bottom-color: var(--accent);
}

.project-hit:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

/* Pills sit above the full-card overlay so they stay individually clickable */
.project-links {
  position: relative;
  z-index: 2;
}

/* View cue — hover/focus affordance naming the action */
.project-cue {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  background: rgba(20, 16, 13, 0.62);
  opacity: 0;
  transition: opacity var(--transition-base);
  pointer-events: none;     /* clicks fall through to the card overlay */
}

.project-cue-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: rgba(200, 137, 46, 0.12);
  color: var(--accent);
  font-size: 0.78rem;
}

.project-cue-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-bright);
}

/* Touch devices have no hover — the cue would only flash on tap, so limit
   the pointer-driven reveal to hover-capable devices. Keyboard still gets it
   via :focus-within below. */
@media (hover: hover) {
  .project-card:hover .project-cue { opacity: 1; }
}

.project-card:focus-within .project-cue { opacity: 1; }
```

- [ ] **Step 3: Verify the cue and the click targets**

Run: `node tools/ux-check.mjs`
Expected: PASS for *thumbnail opens Overview*, *title opens Overview*, *card padding opens Overview*, *card shows pointer cursor*, *card control is focusable*, *card control has an accessible name*, *Enter on focused card opens Overview*, *cue is hidden by default*, *cue appears on focus-within*.
Still FAILing (fixed later): the gallery-row, modal-dialog, and tap-target checks.

- [ ] **Step 4: Manually confirm nothing regressed**

Open the site, then confirm: hovering a card lifts it and reveals *View project* over the thumbnail; the Team / Awards / Report / Video pills still open their own modals and do **not** trigger Overview; text in the card can no longer be drag-selected (expected trade-off of the full-card overlay).

- [ ] **Step 5: Commit**

```bash
git add js/main.js css/styles.css
git commit -m "feat(projects): make the whole card a click target with a view cue"
```

---

## Task 3: Make gallery rows real controls, and the placeholder an intentional state

**Files:**
- Modify: `js/main.js:109-121` (`renderNews`), `js/main.js:208-217` (`renderRecordItem`), `js/main.js:292-299` (gallery slide markup)
- Modify: `css/styles.css` (Timeline section ~676, Records section ~708, gallery slide rules)

**Interfaces:**
- Consumes: `data-gallery` / `data-index` attributes and the existing delegated handler bound by `bindGalleryList()` — unchanged.
- Produces: `[data-gallery]` elements are `<button type="button">` carrying `aria-label`; `.gallery-slide.is-placeholder` marks a slide whose photo is missing.

- [ ] **Step 1: Emit buttons for news rows that have photos**

In `js/main.js`, replace `renderNews` with:

```js
  function renderNews() {
    if (!$newsTimeline) return;
    $newsTimeline.innerHTML = PORTFOLIO.news.map((item, i) => {
      const hasGallery = Array.isArray(item.images) && item.images.length > 0;
      const hint = hasGallery ? '<span class="gallery-hint" aria-hidden="true"><i class="fas fa-images"></i></span>' : '';
      const inner = `<span class="timeline-date">${item.date}</span>
        <p class="timeline-text">${item.text}${hint}</p>`;
      const delay = `style="--reveal-delay: ${i * 60}ms"`;

      if (!hasGallery) {
        return `<div class="timeline-item reveal" ${delay}>${inner}</div>`;
      }
      return `<button type="button" class="timeline-item timeline-item--gallery reveal" ${delay}
        data-gallery="news" data-index="${i}"
        aria-label="View photos: ${item.text}">${inner}</button>`;
    }).join('');
  }
```

- [ ] **Step 2: Emit buttons for leadership/honors rows that have photos**

In `js/main.js`, replace `renderRecordItem` with:

```js
  function renderRecordItem(item, i, kind, step) {
    const hasGallery = Array.isArray(item.images) && item.images.length > 0;
    const hint = hasGallery ? '<span class="gallery-hint" aria-hidden="true"><i class="fas fa-images"></i></span>' : '';
    const inner = `<span class="record-desc">${item.description}${hint}</span>
      <span class="record-year">${item.year}</span>`;
    const delay = `style="--reveal-delay: ${i * step}ms"`;

    if (!hasGallery) {
      return `<div class="record-item reveal" ${delay}>${inner}</div>`;
    }
    return `<button type="button" class="record-item record-item--gallery reveal" ${delay}
      data-gallery="${kind}" data-index="${i}"
      aria-label="View photos: ${item.description}">${inner}</button>`;
  }
```

- [ ] **Step 3: Add the button resets and focus styles to CSS**

In `css/styles.css`, immediately **before** the `.timeline-item {` rule, add:

```css
/* Gallery rows are <button> elements — reset UA styling but keep the
   existing grid/flex row layout from .timeline-item / .record-item */
button.timeline-item,
button.record-item {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  background: none;
  border: 0;
  border-left: 1px solid var(--border-1);
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.timeline-item:focus-visible,
.record-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 4: Make a missing photo an intentional empty state**

In `js/main.js`, inside `openGallery`, replace the slide template with:

```js
          ${images.concat(images).map((src, i) => `
            <figure class="gallery-slide">
              <img src="${src}" alt="${title} — photo ${(i % images.length) + 1}"
                   onerror="this.closest('.gallery-slide').classList.add('is-placeholder');this.onerror=null;this.src='files/PlaceHolder.png';">
            </figure>`).join('')}
```

Then in `css/styles.css`, add `position: relative;` to the **existing** `.gallery-slide` rule (currently at line 994, which holds `flex: 0 0 100%; margin: 0;`), so it becomes:

```css
.gallery-slide {
  position: relative;      /* anchors the placeholder caption */
  flex: 0 0 100%;
  margin: 0;
}
```

And insert this rule directly after the existing `.gallery-slide img` rule (line 999):

```css
/* The owner has chosen to keep these rows clickable while the photos are
   still being collected, so label the placeholder instead of showing a
   bare grey box. */
.gallery-slide.is-placeholder::after {
  content: 'Photos coming soon';
  position: absolute;
  inset: auto 0 0 0;
  padding: 10px 14px;
  background: rgba(20, 16, 13, 0.72);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}
```

- [ ] **Step 5: Verify**

Run: `node tools/ux-check.mjs`
Expected: PASS for *every gallery row is a `<button>`*, *every gallery row is focusable*, *every gallery row has an accessible name*, *Enter on a gallery row opens it*.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/styles.css
git commit -m "feat(records): make gallery rows keyboard-operable buttons"
```

---

## Task 4: Make the modal a real dialog

**Files:**
- Modify: `index.html:138-147` (modal markup)
- Modify: `js/main.js` (modal open/close, focus management)
- Modify: `css/styles.css` (`.modal-card` focus outline)

**Interfaces:**
- Consumes: `$modalOverlay`, `$modalCard`, `$modalHeader`, `lockBodyScroll()`, `unlockBodyScroll()` from earlier in `js/main.js`.
- Produces: `openModal(projectId, tab)` and `openGallery(kind, index)` both leave focus inside `#modalCard` and mark background siblings `inert`; `closeModal()` clears `inert` and restores focus to the element that opened the modal.

- [ ] **Step 1: Give the dialog its semantics**

In `index.html`, replace the modal overlay block with:

```html
    <!-- Popup Modal (single shared instance) -->
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-card" id="modalCard" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1">
        <button class="modal-close" id="modalClose" aria-label="Close modal">&times;</button>
        <div class="modal-header" id="modalHeader"></div>
        <div class="modal-scroll">
          <div class="modal-image-wrap" id="modalImage"></div>
          <div class="modal-body" id="modalBody"></div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Title the dialog in both openers**

In `js/main.js`, in `openModal`, change the header render so the heading carries `id="modalTitle"`:

```js
    $modalHeader.innerHTML = `
      <h3 id="modalTitle">${title}</h3>
      <p class="modal-subtitle">${proj.venue}</p>`;
```

In `openGallery`, do the same:

```js
    $modalHeader.innerHTML = `
      <h3 id="modalTitle">${title}</h3>
      <p class="modal-subtitle">${GALLERY_LABELS[kind] || ''}${meta ? ' · ' + meta : ''}</p>`;
```

- [ ] **Step 3: Add the modal focus manager**

In `js/main.js`, add these helpers directly above `openModal`, and add the `$modalCard` reference next to the other modal references at the top of the file:

```js
  const $modalCard = document.getElementById('modalCard');
```

```js
  /* ── Dialog focus management ─────────────────────────────────── */

  var lastFocused = null;

  /* Make every sibling of the overlay inert: removes them from the tab
     order and from the accessibility tree while the dialog is open. */
  function setBackgroundInert(on) {
    var layer = document.querySelector('.content-layer');
    if (!layer) return;
    Array.prototype.forEach.call(layer.children, function (el) {
      if (el === $modalOverlay) return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function openDialog() {
    lastFocused = document.activeElement;
    $modalOverlay.classList.add('active');
    lockBodyScroll();
    $navHeader.classList.add('hidden');
    setBackgroundInert(true);
    if ($modalCard) $modalCard.focus();
  }

  /* Wrap Tab/Shift+Tab inside the dialog. `inert` already handles assistive
     tech and hit-testing; this keeps keyboard cycling deterministic. */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    if (!$modalOverlay.classList.contains('active') || !$modalCard) return;
    var items = $modalCard.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    items = Array.prototype.filter.call(items, function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === $modalCard)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', trapFocus);
```

- [ ] **Step 4: Route both openers and the closer through the manager**

In `openModal`, replace the trailing activation block:

```js
    $modalOverlay.classList.add('active');
    lockBodyScroll();
    $navHeader.classList.add('hidden');
```

with:

```js
    openDialog();
```

Do the same in `openGallery` (its trailing block sets `active`, `lockBodyScroll()`, `$navHeader.classList.add('hidden')` and then calls `startGalleryDrift()` — keep `startGalleryDrift()` after `openDialog()`):

```js
    openDialog();

    startGalleryDrift();
```

Replace `closeModal` with:

```js
  function closeModal() {
    stopGalleryDrift();
    if (!$modalOverlay) return;
    $modalOverlay.classList.remove('active');
    setBackgroundInert(false);
    unlockBodyScroll();
    $navHeader.classList.remove('hidden');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }
```

- [ ] **Step 5: Keep the dialog's own focus ring from looking broken**

In `css/styles.css`, in the Modal section, add:

```css
.modal-card:focus {
  outline: none;   /* the dialog itself is focused on open; a ring here is noise */
}
```

- [ ] **Step 6: Verify**

Run: `node tools/ux-check.mjs`
Expected: PASS for *modal card has role="dialog"*, *modal card has aria-modal="true"*, *modal card is labelled*, *focus moved inside the modal*, *background is inert*, *Tab never leaves the modal*, *Shift+Tab stays inside the modal*, *Escape closes the modal*, *background is no longer inert*.

- [ ] **Step 7: Commit**

```bash
git add index.html js/main.js css/styles.css
git commit -m "fix(modal): make the modal a proper dialog with contained focus"
```

---

## Task 5: Add share metadata

**Files:**
- Modify: `index.html:4-22` (head)
- Create: `files/og-card.jpg` (1200×630)
- Create: `tools/make-images.mjs`

**Interfaces:**
- Consumes: headless Chrome on `:9222`.
- Produces: `node tools/make-images.mjs` writes `files/og-card.jpg` and `files/posters/<video>.jpg` for every `files/*_Preview.mp4` and `files/BiyaHey.mp4` (Task 7 uses the posters).

- [ ] **Step 1: Add the metadata**

In `index.html`, directly after the `<title>` line, add:

```html
  <meta name="description" content="Andrew Alangcao — Data Engineer and Computational Cognition Researcher. Robotics, biometrics, and applied AI projects, with awards from national and international competitions.">
  <meta name="theme-color" content="#1a1614">
  <link rel="canonical" href="https://andrewhmir.github.io/">

  <!-- Open Graph / social preview -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Andrew Alangcao">
  <meta property="og:url" content="https://andrewhmir.github.io/">
  <meta property="og:title" content="Andrew Alangcao — Data Engineer &amp; Computational Cognition Researcher">
  <meta property="og:description" content="Robotics, biometrics, and applied AI projects, with awards from national and international competitions.">
  <meta property="og:image" content="https://andrewhmir.github.io/files/og-card.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
```

- [ ] **Step 2: Write the image generator**

Create `tools/make-images.mjs`. Uses Chrome's own H.264/JPEG support — the Playwright-bundled ffmpeg cannot decode these videos (`--disable-everything`, no H.264 decoder), so do not use it.

```js
#!/usr/bin/env node
/* Dev-only: generate the OG share card and one poster frame per project video,
   using headless Chrome's canvas. No npm dependencies.
   Usage: chrome --headless=new --remote-debugging-port=9222 about:blank
          node tools/make-images.mjs                                    */
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const SITE = process.env.SITE || process.cwd();
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', () => rej(new Error('cannot reach CDP')), { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
  }
});
const send = (method, params = {}, sessionId) => {
  const mid = ++id;
  const msg = { id: mid, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(mid, { res, rej }); ws.send(JSON.stringify(msg)); });
};

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

/* Navigate to the site FIRST so its videos and images are same-origin.
   Drawing a cross-origin video onto a canvas taints it and toDataURL()
   throws — and http-server sends no CORS headers. */
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(1800);
const evaluate = async (expr, awaitPromise = true) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

mkdirSync(join(SITE, 'files', 'posters'), { recursive: true });

/* ── 1. Poster frame per project video ── */
const videos = readdirSync(join(SITE, 'files')).filter((f) => /\.mp4$/i.test(f));
for (const file of videos) {
  const url = BASE + 'files/' + file;
  const dataUrl = await evaluate(`(async () => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true;
    v.src = ${JSON.stringify(url)};
    await new Promise((res, rej) => {
      v.addEventListener('loadeddata', res, { once: true });
      v.addEventListener('error', () => rej(new Error('video failed to load')), { once: true });
      setTimeout(() => rej(new Error('video load timeout')), 20000);
    });
    v.currentTime = Math.min(1.5, (v.duration || 2) / 3);
    await new Promise((res) => v.addEventListener('seeked', res, { once: true }));
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = Math.round(960 * v.videoHeight / v.videoWidth);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  })()`);
  const out = join(SITE, 'files', 'posters', basename(file, extname(file)) + '.jpg');
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('poster  ' + file + '  →  files/posters/' + basename(out));
}

/* ── 2. 1200x630 OG share card ── */
const ogDataUrl = await evaluate(`(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(BASE + 'files/painting-hero.jpg')};
  await new Promise((res, rej) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', () => rej(new Error('og source image failed')), { once: true });
  });
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // cover-fit the painting
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  // warm scrim so the text stays legible
  const grad = g.createLinearGradient(0, H * 0.35, 0, H);
  grad.addColorStop(0, 'rgba(20,16,13,0)');
  grad.addColorStop(1, 'rgba(20,16,13,0.88)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#f5f0e8';
  g.font = '400 76px Georgia, "Times New Roman", serif';
  g.fillText('Andrew Alangcao', 72, H - 150);
  g.fillStyle = '#c8892e';
  g.font = '400 30px Georgia, "Times New Roman", serif';
  g.fillText('Data Engineer  ·  Computational Cognition Researcher', 72, H - 92);
  return c.toDataURL('image/jpeg', 0.86);
})()`);
writeFileSync(join(SITE, 'files', 'og-card.jpg'), Buffer.from(ogDataUrl.split(',')[1], 'base64'));
console.log('og      files/og-card.jpg');

await send('Target.closeTarget', { targetId });
process.exit(0);
```

- [ ] **Step 3: Generate and verify the images**

Run: `node tools/make-images.mjs`
Expected: one `poster` line per `.mp4` in `files/` (6 videos), then `og files/og-card.jpg`. Confirm `files/og-card.jpg` exists and is at least 20 KB.

- [ ] **Step 4: Extend the check script to cover metadata, then run it**

In `tools/ux-check.mjs`, immediately after the `Resources` section, add:

```js
console.log('\nShare metadata');
const meta = await evaluate(`({
  description: (document.querySelector('meta[name="description"]') || {}).content || '',
  ogImage: (document.querySelector('meta[property="og:image"]') || {}).content || '',
  ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || '',
  themeColor: (document.querySelector('meta[name="theme-color"]') || {}).content || '',
})`);
check('description present', meta.description.length > 50, meta.description.length + ' chars');
check('og:title present', meta.ogTitle.length > 0);
check('og:image is absolute', /^https:\/\//.test(meta.ogImage), meta.ogImage);
check('theme-color present', /^#/.test(meta.themeColor), meta.themeColor);
```

Run: `node tools/ux-check.mjs`
Expected: PASS for all four *Share metadata* checks.

- [ ] **Step 5: Commit**

```bash
git add index.html files/og-card.jpg tools/make-images.mjs tools/ux-check.mjs
git commit -m "feat(seo): add share metadata and a social preview card"
```

---

## Task 6: Raise mobile tap targets to 44×44

**Files:**
- Modify: `css/styles.css` (`@media (max-width: 768px)` block, ~line 1226)

**Interfaces:**
- Consumes: existing `.nav-toggle`, `.nav-brand`, `.pill` classes.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the sizing rules**

Inside the existing `@media (max-width: 768px)` block in `css/styles.css`, add:

```css
  /* Comfortable touch targets — Apple/Google guidance is 44x44 */
  .nav-toggle {
    min-width: 44px;
    min-height: 44px;
  }

  .nav-brand {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }

  .pill {
    min-height: 44px;
    padding: 11px 15px;
  }
```

- [ ] **Step 2: Verify**

Run: `node tools/ux-check.mjs`
Expected: PASS for *all tap targets are at least 44x44* and *no horizontal overflow on mobile*.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "fix(mobile): enlarge tap targets to 44x44"
```

---

## Task 7: Cut page weight — posters and in-view playback

The desktop audit measured ~40 MB of autoplaying video per visit, with `CENTHRO_Preview.mp4` alone at 33.8 MB and zero poster frames, so cards showed a dark box before the video started.

**Files:**
- Modify: `js/main.js` (`renderProjectCard` video markup; add a playback observer in `init`)
- Modify: `css/styles.css` (nothing required — posters fill the frame)

**Interfaces:**
- Consumes: `files/posters/<name>.jpg` produced by `tools/make-images.mjs` in Task 5.
- Produces: project `<video>` elements carry a `poster`, use `preload="none"`, and are paused unless in view and motion is allowed.

- [ ] **Step 1: Point each video at its poster and stop eager loading**

In `js/main.js`, in `renderProjectCard`, replace the video branch with:

```js
          ${isImg
            ? `<img class="project-thumb img-fallback" src="${p.video}" alt="${p.title}" loading="lazy">`
            : `<video class="project-thumb" playsinline loop muted preload="none"
                     poster="${p.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg')}">
                <source src="${p.video}" type="video/mp4">
               </video>`
          }
```

Note the `autoplay` attribute is gone — Step 2 decides when to play.

- [ ] **Step 2: Play only what is on screen, and only when motion is welcome**

In `js/main.js`, add this function next to `initRevealObserver`:

```js
  /* ── In-view video playback ────────────────────────────────────
     Videos have preload="none", so nothing is fetched until a card is
     actually on screen. Playback is skipped entirely when the visitor
     has asked for reduced motion. */
  function initVideoPlayback() {
    var videos = document.querySelectorAll('.project-card video');
    if (!videos.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay refused — poster stays */ });
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.25 });

    Array.prototype.forEach.call(videos, function (v) { observer.observe(v); });
  }
```

Then call it from `init()`, immediately after `initRevealObserver();`:

```js
    initRevealObserver();
    initVideoPlayback();
    initSmoothScroll();
```

- [ ] **Step 3: Add a weight assertion, then verify the payload actually dropped**

In `tools/ux-check.mjs`, insert this block immediately **before** the `/* ── 7. Mobile: no overflow, tappable targets ── */` section, and renumber that mobile section's comment to `8.`:

```js
/* ── 7. Page weight: no video before a card is on screen ─────────────── */
console.log('\nPage weight');
const weight = new Map();
cdp.on('Network.responseReceived', (p) => weight.set(p.requestId, { url: p.response.url, type: p.type, n: 0 }));
cdp.on('Network.loadingFinished', (p) => { const w = weight.get(p.requestId); if (w) w.n = p.encodedDataLength; });
await setViewport(1440, 900, false);
await goto(BASE);            /* lands at the top of the page and stays there */
await sleep(2500);
const loadedRow = [...weight.values()];
const videoMB = loadedRow.filter((w) => w.type === 'Media' || /\.mp4/i.test(w.url))
                         .reduce((a, w) => a + w.n, 0) / 1048576;
const totalMB = loadedRow.reduce((a, w) => a + w.n, 0) / 1048576;
check('no video is fetched before Projects scrolls into view',
  videoMB < 0.5, videoMB.toFixed(2) + ' MB of video at page top');
check('page-top weight stays small', totalMB < 8, totalMB.toFixed(2) + ' MB total at page top');
```

Run: `node tools/ux-check.mjs`
Expected: all checks PASS, including the two new weight checks. Before Task 7 these two fail (the original page pulled ~40 MB of video on load); after it, a visit that never scrolls to Projects should transfer only the hero assets. A wrong poster path would surface here or in *no 4xx/5xx responses* as a 404.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "perf(video): add posters and play previews only in view"
```

- [ ] **Step 5: Flag the remaining item to the owner (do not do this unreviewed)**

`files/CENTHRO_Preview.mp4` is 33.8 MB — 4.5× larger than all other project videos combined. Re-encoding it needs a full ffmpeg build (the one bundled with Playwright cannot decode H.264). Report the measured before/after numbers from Step 3 and ask whether to install ffmpeg (`winget install Gyan.FFmpeg`) and re-encode, or leave the source as-is. **Do not re-encode or delete the original without an explicit yes.**

---

## Task 8: Final verification and cleanup

**Files:**
- Modify: `README.md` (document the tools folder)
- Delete: leftover audit artefacts

- [ ] **Step 1: Run the whole contract check**

Run: `node tools/ux-check.mjs`
Expected: `N passed, 0 failed` and exit code `0`.

- [ ] **Step 2: Confirm the audit's original defects are gone**

Run: `node tools/ux-check.mjs` and confirm exit code `0`. Each finding in Appendix A maps to a named check — verify these specifically:

| Finding | Checks that prove it fixed |
|---|---|
| 1 — dead card | `thumbnail opens Overview`, `title opens Overview`, `padding opens Overview`, `card shows pointer cursor`, `card control is focusable`, `card control has an accessible name`, `Enter on focused card opens Overview`, `cue appears on focus-within` |
| 2 — placeholder galleries | `Enter on a gallery row opens it` (plus the labelled *Photos coming soon* caption, checked by eye) |
| 3 — inconsistent honors | `every gallery row is a <button>` (all 12) |
| 4 — modal not a dialog | `modal card has role="dialog"`, `modal card has aria-modal="true"`, `focus moved inside the modal`, `Tab never leaves the modal`, `Shift+Tab stays inside the modal`, `background is inert`, `background is no longer inert` |
| 5 — keyboard-dead rows | `every gallery row is focusable`, `every gallery row has an accessible name` |
| 6 — page weight | `no video is fetched before Projects scrolls into view`, `page-top weight stays small` |
| 7 — no share tags | the four *Share metadata* checks |
| 8 — small tap targets | `all tap targets are at least 44x44` |

Any check that still fails means the corresponding fix regressed — fix it before proceeding.

- [ ] **Step 3: Document the dev tooling**

In `README.md`, add a short section after *Running Locally*:

```markdown
## Development checks

`tools/ux-check.mjs` drives headless Chrome to verify the interaction contract
(card click targets, keyboard access, modal focus containment, tap targets).
It is dev-only — the site itself still has no build step and no dependencies.
See `tools/README.md`.
```

- [ ] **Step 4: Remove throwaway artefacts**

Delete the Chrome profile directories created while auditing (`.audit-profile/`, `.audit-profile2/`, `.audit-profile3/`) and confirm `git status` shows only intended files. Confirm `.superpowers/` is ignored, not committed.

- [ ] **Step 5: Commit and open a PR**

```bash
git add README.md
git commit -m "docs: document the dev UX check"
git push -u origin feat/ux-fixes
```

Then open a PR into `main` describing what changed, the before/after measurements from the audit, and the verification output.

---

## Appendix A — Audit findings this plan resolves

Measured with headless Chrome 153 over CDP at 1440×900 and 390×844 against a live `http-server`, using real mouse clicks, real `Tab` presses, and real wheel scrolling.

| # | Finding | Evidence | Fixed by |
|---|---------|----------|----------|
| 1 | Project cards were 96.5% dead space; clicking the thumbnail or title did nothing | Card 143,175 px², clickable pills 5,013 px² (3.5%); `cursor: auto` on card/thumb/title/tagline/authors/venue; a real click on thumbnail and title left the modal closed and `activeElement` on `body`; 30/30 probe points `clickable: false` | Tasks 2, 3 |
| 2 | All 16 gallery photos 404; all 12 gallery rows showed the same 1.1 KB `PlaceHolder.png` | Opened all 12 galleries — the only image file ever displayed was `PlaceHolder.png` | Task 3 (labelled empty state), owner kept rows clickable |
| 3 | Honors rows inconsistent — 13 rows, only 4 clickable, visually identical | `rowAffordanceCounts.honors` = 13 rows / 4 with images | Task 3 |
| 4 | Modal was not a dialog; focus escaped behind it | `role: null`, `aria-modal: null`, focus on open = `body`, Tab reached `#scrollTopBtn` → `body` → nav links | Task 4 |
| 5 | All 12 clickable gallery rows were unreachable by keyboard | `<div>`, `tabIndex: -1`, 0 focusable, no role, no label | Task 3 |
| 6 | ~40 MB of autoplaying video, no poster frames | 60 requests / 81.3 MB total, 75.8 MB video; `CENTHRO_Preview.mp4` 33.8 MB on disk; `hasPoster: 0` | Task 7 |
| 7 | No description or social tags | `meta description`, `og:title`, `theme-color` all absent | Task 5 |
| 8 | 26 tap targets below the 44 px mobile guideline | e.g. nav toggle 38×25, pills 29–31 px tall | Task 6 |

**Verified healthy in the same audit — deliberately unchanged:** no horizontal overflow at 1440 or 390 px; text contrast ≥ 6.03:1 for every sampled token (WCAG AA pass); Escape closes the modal; body scroll-lock and scrollbar-width compensation work; reveal-on-scroll fires correctly under real scrolling (0 → 27 elements, none stuck invisible); mobile nav opens, closes, and closes on backdrop click; `<noscript>` fallback present.

---

## Appendix B — Execution notes (deviations from the plan as written)

Corrections found while executing. `tools/ux-check.mjs` as committed is authoritative; the Task 1 code block above is the pre-execution draft.

1. **The check script must not abort.** Probing `.project-hit` before Task 2 existed threw and killed the run. Each numbered section is now wrapped in `section(title, fn)`, which catches and records an `ERROR` and continues — so the script is genuinely usable as a failing test *before* the fixes.
2. **`rawKeyDown` does not activate a `<button>` over CDP.** Measured four dispatch shapes: only `type: 'keyDown'` carrying `text: '\\r'` produced a click (and `modalOpen: true`). Space activates on either shape. `pressEnter()` uses the `keyDown` form.
3. **The harness must dismiss modals through the app.** Its original `closeModal()` stripped the `.active` class directly, which skipped the teardown Task 4 introduced — the background stayed `inert` and silently blocked every later click. It now sends Escape.
4. **Measure tap targets by layout size.** `getBoundingClientRect()` reported the closed modal's close button as 42×42 because `.modal-card` is scaled; `offsetWidth`/`offsetHeight` report the true 44×44.
5. **Tap targets need an "effective area" notion.** `.project-hit`'s own box is only the title text, but its `::after` overlay makes the whole card the target. The check walks up to the positioned ancestor when a full-area `::after` is present.
6. **No `width: 100%` on the button resets.** It fought the existing `margin-left: 4px`, making every clickable row 1036 px wide against 1032 px for the inert `<div>` rows in the same list. Both containers are flex columns, so rows stretch correctly without it.
7. **Two more controls needed enlarging** beyond the plan's three: `.modal-close` and `.scroll-top` (the "Top" button, 29×38).
8. **Page weight is reported two ways.** "Video at page top" is the contract worth asserting (now 0.00 MB, was 2.74 MB). A single "full page" figure is unreliable — Chrome aborts large media when it leaves the viewport — so a dwell on the Projects section is reported as `info` instead: 32.73 MB before, 37.85 MB after, because previews that used to be aborted now actually play. **That number is dominated by `CENTHRO_Preview.mp4` (33.8 MB) and is the remaining open item.**
