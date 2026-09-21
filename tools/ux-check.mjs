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
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}
/* Each section is isolated: a missing element reports failures and moves on
   instead of aborting the run, so this script is useful BEFORE the fixes. */
async function section(title, fn) {
  console.log('\n' + title);
  try { await fn(); } catch (e) { fail++; console.log('  ERROR ' + (e && e.message ? e.message : e)); }
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
  const base = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  /* rawKeyDown does NOT activate a <button> over CDP — the key has to arrive
     as a real keyDown carrying its text. */
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: '\r', unmodifiedText: '\r' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(450);
};
const modalOpen = () => evaluate(`document.getElementById('modalOverlay').classList.contains('active')`);
/* Dismiss via Escape so the app's own close path runs — removing the
   .active class by hand would skip its teardown (inert background, scroll
   lock, focus restore) and poison every later step. */
const closeModal = async () => {
  if (!(await modalOpen())) return;
  const esc = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...esc });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...esc });
  await sleep(400);
};

await setViewport(1440, 900, false);
await goto(BASE);

/* -- 1. Whole project card is a click target -------------------------- */
await section('Project card click targets', async () => {
  /* Three points inside the first card, in viewport coordinates: the
     thumbnail centre, the title centre, and a spot inside the card's own
     padding (6px in from the top-left corner). */
  const cardPoints = await evaluate(`(() => {
    const card = document.querySelector('#projectList .project-card');
    card.scrollIntoView({ behavior: 'instant', block: 'center' });
    const mid = (sel) => {
      const el = card.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const cr = card.getBoundingClientRect();
    return { thumbnail: mid('.project-thumb'), title: mid('.project-hit'), padding: { x: cr.left + 6, y: cr.top + 6 } };
  })()`);
  await sleep(350);
  for (const where of ['thumbnail', 'title', 'padding']) {
    await closeModal();
    const p = cardPoints[where];
    if (!p) { check(where + ' opens Overview', false, 'element not present yet'); continue; }
    await click(p.x, p.y);
    check(where + ' opens Overview', await modalOpen(), 'modal did not open');
  }
  await closeModal();
  check('card shows pointer cursor',
    (await evaluate(`getComputedStyle(document.querySelector('.project-card')).cursor`)) === 'pointer');
});

/* -- 2. Card is reachable and named by keyboard ----------------------- */
await section('Project card keyboard access', async () => {
  const has = await evaluate(`!!document.querySelector('.project-card .project-hit')`);
  check('card control is focusable',
    has && (await evaluate(`document.querySelector('.project-card .project-hit').tabIndex >= 0`)) === true,
    has ? undefined : 'no .project-hit control yet');
  check('card control has an accessible name',
    has && (await evaluate(`(document.querySelector('.project-card .project-hit').innerText || '').trim().length > 0`)) === true,
    has ? undefined : 'no .project-hit control yet');
  if (!has) { check('Enter on focused card opens Overview', false, 'no .project-hit control yet'); return; }
  await evaluate(`document.querySelector('.project-card .project-hit').focus()`);
  await pressEnter();
  check('Enter on focused card opens Overview', await modalOpen(), 'modal did not open');
});

/* -- 3. View cue appears on hover / focus ----------------------------- */
await section('View cue', async () => {
  const hasCue = await evaluate(`!!document.querySelector('.project-cue')`);
  if (!hasCue) {
    check('cue is hidden by default', false, 'no .project-cue yet');
    check('cue appears on focus-within', false, 'no .project-cue yet');
    return;
  }
  /* Clear focus and park the pointer away from the card: earlier sections
     leave focus on a card control and the mouse hovering it, both of which
     legitimately reveal the cue. */
  await closeModal();
  await evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur();`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, buttons: 0 });
  await sleep(400);
  const cueHidden = await evaluate(`getComputedStyle(document.querySelector('.project-cue')).opacity`);
  await evaluate(`document.querySelector('.project-card .project-hit').focus()`);
  await sleep(400);
  const cueShown = await evaluate(`getComputedStyle(document.querySelector('.project-cue')).opacity`);
  check('cue is hidden by default', cueHidden === '0', 'opacity was ' + cueHidden);
  check('cue appears on focus-within', Number(cueShown) > 0.9, 'opacity was ' + cueShown);
  await closeModal();
});

/* -- 4. Gallery rows are real, keyboard-operable controls ------------- */
await section('Gallery rows', async () => {
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
});

/* -- 5. Modal is a real dialog with contained focus ------------------- */
await section('Modal dialog semantics', async () => {
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
  check('focus returns to whatever opened the modal',
    await evaluate(`document.activeElement === document.querySelector('[data-gallery]')`),
    'activeElement=' + await evaluate(`document.activeElement.tagName + '.' + document.activeElement.className`));
  check('background is no longer inert', await evaluate(`!document.querySelector('.content-layer > [inert]')`));
});

/* -- 6. No broken resources, no console errors ------------------------ */
await section('Resources', async () => {
  /* The News/Leadership/Honors photos are known to be pending — the owner
     chose to keep those rows clickable with a labelled placeholder. Ignore
     those specific files, but nothing else may 404. */
  const pendingPhoto = (s) => /files[\\/](news|leadership|honors)-[^/\s]*\.jpg/i.test(s);
  const unexpected = badResponses.filter((u) => !pendingPhoto(u));
  const realErrors = consoleErrors.filter((t) => !pendingPhoto(t));
  check('no unexpected 4xx/5xx responses', unexpected.length === 0, unexpected.join(' | '));
  check('no console errors beyond the pending photos', realErrors.length === 0, realErrors.join(' | '));
});

/* -- 7. Share metadata ------------------------------------------------ */
await section('Share metadata', async () => {
  const meta = await evaluate(`({
    description: (document.querySelector('meta[name="description"]') || {}).content || '',
    ogImage: (document.querySelector('meta[property="og:image"]') || {}).content || '',
    ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || '',
    ogDesc: (document.querySelector('meta[property="og:description"]') || {}).content || '',
    themeColor: (document.querySelector('meta[name="theme-color"]') || {}).content || '',
  })`);
  check('description present', meta.description.length > 50, meta.description.length + ' chars');
  check('og:title present', meta.ogTitle.length > 0);
  check('og:description present', meta.ogDesc.length > 0);
  check('og:image is absolute', /^https:\/\//.test(meta.ogImage), meta.ogImage);
  check('theme-color present', /^#/.test(meta.themeColor), meta.themeColor);
  const ogPath = meta.ogImage.replace(/^https:\/\/[^/]+\//, '');
  const res = await fetch(BASE + ogPath, { method: 'HEAD' });
  check('og:image actually resolves', res.ok, res.status + ' ' + ogPath);
});

/* -- 8. Mobile: no overflow, tappable targets ------------------------- */
await section('Mobile (390x844)', async () => {
  await setViewport(390, 844, true);
  await goto(BASE);
  await evaluate(`(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } return true; })()`);
  await sleep(600);
  const mob = await evaluate(`(() => {
    const de = document.documentElement;
    /* Measure LAYOUT size (offsetWidth/Height), not getBoundingClientRect:
       the closed modal card is scaled, which shrinks its children's rects
       without changing how big the control really is. */
    const effective = (el) => {
      const ownW = el.offsetWidth, ownH = el.offsetHeight;
      /* Full-area overlay pattern (.project-hit::after): the element's own box
         is just the title text while the real tap target is the whole card. */
      const after = getComputedStyle(el, '::after');
      if (after.content && after.content !== 'none' && after.position === 'absolute') {
        let anc = el.parentElement;
        while (anc && getComputedStyle(anc).position === 'static') anc = anc.parentElement;
        if (anc && (anc.offsetWidth > ownW || anc.offsetHeight > ownH)) {
          return { w: anc.offsetWidth, h: anc.offsetHeight };
        }
      }
      return { w: ownW, h: ownH };
    };
    const small = [...document.querySelectorAll('a[href], button, [data-gallery]')].filter(el => {
      if (el.offsetWidth < 1 || el.offsetHeight < 1) return false;
      const t = effective(el);
      return t.w < 44 || t.h < 44;
    });
    return { overflow: de.scrollWidth - de.clientWidth, small: small.length,
             examples: small.slice(0, 8).map(el => {
               const t = effective(el);
               const name = (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');
               return name + ' effective=' + Math.round(t.w) + 'x' + Math.round(t.h);
             }) };
  })()`);
  check('no horizontal overflow on mobile', mob.overflow === 0, mob.overflow + 'px');
  check('all tap targets are at least 44x44', mob.small === 0, mob.examples.join(' | '));
});

await cdp.send('Target.closeTarget', { targetId });
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
