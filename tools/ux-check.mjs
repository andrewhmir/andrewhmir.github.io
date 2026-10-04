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

const TAP_MIN = 44;

const evaluate = async (expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const setViewport = (width, height, mobile = false) =>
  cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
/* Navigate and wait for the load event, with a bound on the wait. Without one
   a slow or busy browser hangs the whole suite in silence — `Page.loadEventFired`
   simply never arrives, the process never exits, and nothing says why. Observed
   once under the load of forcing every photograph on the wall to load, which the
   geometry section now does at both reference viewports. Fails loudly instead. */
const LOAD_TIMEOUT_MS = 30000;
const goto = async (url) => {
  const d = Promise.race([
    cdp.waitFor('Page.loadEventFired'),
    sleep(LOAD_TIMEOUT_MS).then(() => { throw new Error('timed out after ' + LOAD_TIMEOUT_MS + 'ms waiting for ' + url + ' to load'); }),
  ]);
  await cdp.send('Page.navigate', { url });
  await d;
  await sleep(1500);
};

/* ── The walk is horizontal ──────────────────────────────────────────────
   Bringing a work into view means scrolling #hall along its one axis, not the
   document. Never assert on frame rate: the wall is that headless Chrome here
   has no GPU. Assert geometry and state only. */
const waitSettled = async (timeout = 4000) => {
  /* Lenis moves the scroll position for a while after the input stops. Reading
     scrollLeft mid-flight would measure the animation, not the destination. */
  const deadline = Date.now() + timeout;
  let last = await hallScrollLeft(), still = 0;
  while (Date.now() < deadline && still < 3) {
    await sleep(120);
    const now = await hallScrollLeft();
    still = Math.abs(now - last) < 0.5 ? still + 1 : 0;
    last = now;
  }
  return last;
};
const hallScrollLeft = () => evaluate(`document.getElementById('hall').scrollLeft`);
const hallScrollTop  = () => evaluate(`document.getElementById('hall').scrollTop`);
const scrollWalk = async (px) => {
  await evaluate(`(() => {
    const h = document.getElementById('hall');
    h.scrollLeft += ${px};
    return h.scrollLeft;
  })()`);
  await sleep(700);
};
/* Centre a work (or the first one matching a selector) on the hall's axis. */
const centreWork = async (selector) => {
  await evaluate(`(() => {
    const h = document.getElementById('hall');
    const w = document.querySelector(${JSON.stringify(selector)});
    if (!w) return null;
    const hr = h.getBoundingClientRect(), wr = w.getBoundingClientRect();
    h.scrollLeft += (wr.left + wr.width / 2) - (hr.left + h.clientWidth / 2);
    return h.scrollLeft;
  })()`);
  await sleep(500);
  await waitSettled(1500);
};
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

/* -- Layout: the fold, the dock and the rail --------------------------- */
await section('Layout: nothing is clipped and nothing overlaps', async () => {
  /* The hall is the document's only scroller and it is one viewport tall.
     If its own horizontal scrollbar is visible it eats 15px of that box, and
     every room loses its last 15px — which no room can scroll back to. */
  const hall = await evaluate(`(() => {
    const h = document.getElementById('hall');
    return { clientH: h.clientHeight, offsetH: h.offsetHeight,
             scrollbar: h.offsetHeight - h.clientHeight };
  })()`);
  check('the hall is its full height', hall.scrollbar === 0, JSON.stringify(hall));

  /* The room has to be the same height as the hall, or its own centring and
     its dock reserve are computed against a box that extends past the fold:
     content is centred too low and can slide under the dock. */
  const boxes = await evaluate(`(() => {
    const h = document.getElementById('hall');
    const room = document.querySelector('#strip .room');
    return { hall: h.clientHeight, room: room.getBoundingClientRect().height, vh: innerHeight };
  })()`);
  check('a room is exactly one viewport tall',
        Math.abs(boxes.room - boxes.vh) <= 1,
        JSON.stringify(boxes));

  /* Nothing in a room may cross into the dock's band at the foot, or sit
     above the top edge. The dock is fixed, so content that overflows the
     fold is both clipped and unreachable: there is no vertical axis to
     scroll to it.
     The band is checked across the whole viewport width, not just where the
     dock's own box happens to be: the dock is centred and a room is wider
     than the viewport, so a group scrolled to either edge would otherwise
     pass while sitting inside the band. */
  const bad = await evaluate(`(() => {
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('#strip .room').forEach(room => {
      room.querySelectorAll('h2, .group, .hang, .about-copy').forEach(el => {
        const r = el.getBoundingClientRect();
        const name = room.getAttribute('data-room');
        const cls = el.className || el.tagName;
        if (r.height === 0) return;
        if (r.bottom > dock.top) {
          out.push(name + ' / ' + cls + ' crosses into the dock band: ' +
            Math.round(r.bottom) + ' > ' + Math.round(dock.top));
        }
        if (r.top < 24) {
          out.push(name + ' / ' + cls + ' sits above the room padding: ' + Math.round(r.top));
        }
      });
    });
    return out;
  })()`);
  check('no room content crosses into the dock band or off the top', bad.length === 0, bad.join('; '));

  /* Two faults that comparing rows against the dock cannot see, and which both
     shipped once before these assertions existed:

     1. A label taller than its row is CLIPPED, and there is no vertical axis to
        scroll to it and no dialog that shows it, so the text is simply gone.
        Measured before the fix: five catalogue entries hidden at 1440x900 and
        seven at 1280x704 — the third and fourth photographs of a
        four-photograph group rendered no visible text at all.
     2. A cluster wider than its cell spills over the neighbouring exhibit, and
        the later group's frames paint on top of an earlier group's photograph.
        Measured before the fix: three colliding pairs at 1440x900 and seven at
        2560x1440, the worst 181px wide. */
  const inner = await evaluate(`(() => {
    const clipped = [], collide = [];
    document.querySelectorAll('#strip .group').forEach(g => {
      const room = g.closest('.room').getAttribute('data-room');
      const label = g.querySelector('.label');
      if (!label) return;
      /* Measured against the group, NOT against the label's own scrollHeight.
         With \`overflow: hidden\` — which is how this fault actually shipped —
         scrollHeight clamps to the box and reports no overflow, so the check
         that reads it passes on a label that is hiding half its catalogue.
         What a clipped entry really is, is an entry whose bottom falls outside
         its group's box, and that comparison cannot be fooled. */
      const gr = g.getBoundingClientRect();
      const lr = label.getBoundingClientRect();
      const gone = [...label.querySelectorAll('.cat-entry')]
        .filter(e => e.getBoundingClientRect().bottom > Math.min(lr.bottom, gr.bottom) + 1).length;
      if (gone) clipped.push(room + ' ' + g.dataset.entry + ': ' + gone + ' catalogue entries clipped');
      /* And the narrative, which is above the catalogue and can push it out. */
      const narr = label.querySelector('.narr-text');
      if (narr && narr.getBoundingClientRect().bottom > gr.bottom + 1) {
        clipped.push(room + ' ' + g.dataset.entry + ': narrative runs past the group');
      }
    });
    const pieces = [...document.querySelectorAll('#strip .piece')].map(p => ({
      g: p.closest('.group'), r: p.getBoundingClientRect(),
      id: p.closest('.room').getAttribute('data-room') + ':' + p.dataset.piece
    }));
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i], b = pieces[j];
        if (a.g === b.g) continue;                     /* one composition */
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2) collide.push(a.id + ' over ' + b.id + ' ' + Math.round(w) + 'x' + Math.round(h));
      }
    }
    return { clipped, collide, pieces: pieces.length };
  })()`);
  check('every label shows all of its catalogue', inner.clipped.length === 0, inner.clipped.join(' | '));
  check('no frame paints over another group\'s photographs',
        inner.collide.length === 0, inner.collide.slice(0, 5).join(' | '));

  /* The rendered walk against the data it is built from. This is the assertion
     that catches content disappearing without anything looking broken — a
     group dropped, a photograph hung twice, a catalogue that lost an entry.
     Both Critical faults the adversarial review found were content silently
     missing from a wall that still rendered. */
  const inventory = await evaluate(`(() => {
    const groups = [...document.querySelectorAll('#strip .group')];
    const perKind = {};
    groups.forEach(g => {
      const k = g.dataset.kind;
      perKind[k] = perKind[k] || { groups: 0, pieces: 0, awaited: 0, notes: 0, awaitedGroups: 0, labels: 0, entries: 0 };
      perKind[k].groups++;
      perKind[k].pieces += g.querySelectorAll('.piece').length;
      const awaited = g.querySelectorAll('.piece--pending').length;
      perKind[k].awaited += awaited;
      if (awaited) perKind[k].awaitedGroups++;
      perKind[k].notes += g.querySelectorAll('.ca-note').length;
      if (g.querySelector('.label')) perKind[k].labels++;
      perKind[k].entries += g.querySelectorAll('.cat-entry').length;
    });
    /* Grouped pieces only. The About portrait is also a .piece — it hangs in
       the same frame — but it is presentation rather than a record's
       photograph, and the data declares it separately.
       An awaited frame draws no picture, so it contributes no src: there is
       nothing to compare and nothing to fetch. */
    const srcs = [...document.querySelectorAll('#strip .group .piece img')]
      .map(i => i.getAttribute('src'));
    const portrait = document.querySelector('#strip .room[data-room="About"] .piece img');
    return { perKind, srcs, portrait: portrait ? portrait.getAttribute('src') : null,
             rooms: document.querySelectorAll('#strip .room').length,
             dock: document.querySelectorAll('.dock-link').length };
  })()`);
  const expected = await evaluate(`(() => {
    const P = globalThis.PORTFOLIO, S = globalThis.Site;
    const want = { project: 0, honors: 0, leadership: 0 };
    const awaited = { project: 0, honors: 0, leadership: 0 };
    const all = [];
    const note = (kind, pieces) => {
      want[kind] += pieces.length;
      pieces.forEach(x => { if (x.awaited) awaited[kind]++; else all.push(x.src); });
    };
    P.projects.forEach(p => note('project', S.groupPieces(p, 'project')));
    P.honors.forEach(h => note('honors', S.groupPieces(h, 'record')));
    P.leadership.forEach(l => note('leadership', S.groupPieces(l, 'record')));
    return { want, awaited, all, groups: P.projects.length + P.honors.length + P.leadership.length };
  })()`);

  const counts = Object.entries(expected.want).map(([kind, n]) => {
    const got = inventory.perKind[kind] ||
      { pieces: 0, awaited: 0, notes: 0, awaitedGroups: 0, labels: 0, entries: 0, groups: 0 };
    return { kind, want: n, got: got.pieces, awaitedWant: expected.awaited[kind],
             awaited: got.awaited, notes: got.notes, awaitedGroups: got.awaitedGroups,
             labels: got.labels, entries: got.entries, groups: got.groups };
  });
  const short = counts.filter((c) => c.got !== c.want);
  check('every photograph the data declares is hung exactly once',
        short.length === 0, JSON.stringify(short));
  /* One note per GROUP that is missing something, not one per frame and not one
     per kind: a group of three awaited frames says so once. */
  check('every awaited frame is drawn as an awaited frame, and its label says so once',
        counts.every((c) => c.awaited === c.awaitedWant && c.notes === c.awaitedGroups),
        JSON.stringify(counts.map((c) => ({ kind: c.kind, awaited: c.awaited, want: c.awaitedWant,
          notes: c.notes, awaitedGroups: c.awaitedGroups }))));
  check('every group carries one label, one entry per photograph, and no entry for a frame with none',
        counts.every((c) => c.labels === c.groups && c.entries === c.got - c.awaited),
        JSON.stringify(counts));
  /* Multiset equality: a photograph hung twice is as wrong as one hung never. */
  const tally = (arr) => arr.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {});
  const gotTally = tally(inventory.srcs), wantTally = tally(expected.all);
  const differing = [...new Set([...Object.keys(gotTally), ...Object.keys(wantTally)])]
    .filter((k) => gotTally[k] !== wantTally[k]);
  check('the wall\'s photographs are exactly the data\'s, no more and no fewer',
        differing.length === 0,
        differing.slice(0, 5).map((k) => k + ' ' + (gotTally[k] || 0) + ' vs ' + (wantTally[k] || 0)).join(' | '));
  check('the dock carries every room the walk does',
        inventory.dock === inventory.rooms,
        inventory.dock + ' dock entries for ' + inventory.rooms + ' rooms');
  check('the About portrait hangs in the same frame as the works',
        inventory.portrait === (await evaluate(`globalThis.PORTFOLIO.profileImage`)),
        'portrait is ' + inventory.portrait);

  /* The same check at the spec's floor. 1280x704 leaves the least room above
     the dock, so it is where a room overflows first — and the DOM stub in
     tests/ cannot see layout, so this is the only place it is caught. */
  await setViewport(1280, 704, false);
  await goto(BASE);
  const floor = await evaluate(`(() => {
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('#strip .room').forEach(room => {
      room.querySelectorAll('h2, .group, .hang, .about-copy').forEach(el => {
        const r = el.getBoundingClientRect();
        const name = room.getAttribute('data-room');
        const cls = el.className || el.tagName;
        if (r.height === 0) return;
        if (r.bottom > dock.top) out.push(name + ' / ' + cls + ' bottom ' + Math.round(r.bottom) + ' > ' + Math.round(dock.top));
        if (r.top < 24) out.push(name + ' / ' + cls + ' top ' + Math.round(r.top));
      });
    });
    return out;
  })()`);
  check('no room overflows the fold at 1280x704', floor.length === 0, floor.join('; '));

  /* And the two inner-layout faults at the floor as well, where the cells are
     narrowest and both are at their worst. */
  const floorInner = await evaluate(`(() => {
    const clipped = [], collide = [];
    document.querySelectorAll('#strip .group').forEach(g => {
      const label = g.querySelector('.label');
      if (!label) return;
      const gr = g.getBoundingClientRect();
      const lr = label.getBoundingClientRect();
      const gone = [...label.querySelectorAll('.cat-entry')]
        .filter(e => e.getBoundingClientRect().bottom > Math.min(lr.bottom, gr.bottom) + 1).length;
      if (gone) clipped.push(g.closest('.room').getAttribute('data-room') + ' ' + g.dataset.entry + ': ' + gone);
    });
    const pieces = [...document.querySelectorAll('#strip .piece')].map(p => ({
      g: p.closest('.group'), r: p.getBoundingClientRect(),
      id: p.closest('.room').getAttribute('data-room') + ':' + p.dataset.piece
    }));
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i], b = pieces[j];
        if (a.g === b.g) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2) collide.push(a.id + ' over ' + b.id);
      }
    }
    return { clipped, collide };
  })()`);
  check('labels still fit at 1280x704', floorInner.clipped.length === 0, floorInner.clipped.join(' | '));
  check('frames still do not collide at 1280x704',
        floorInner.collide.length === 0, floorInner.collide.slice(0, 5).join(' | '));
  await setViewport(1440, 900, false);
  await goto(BASE);

  /* The rail is the position cue that replaced the native scrollbar. Its
     width is a fraction of the EDGE, driven by the walk's progress — not a
     fraction of the viewport compared against itself, which is what this
     assertion first read and which passed for the wrong reason while the
     strip happened to be a whole number of screens wide. */
  const railAt = async (left) => {
    await evaluate(`document.getElementById('hall').scrollLeft = ${left}`);
    await sleep(280);
    return evaluate(`(() => {
      const h = document.getElementById('hall');
      const rail = document.querySelector('.rail').getBoundingClientRect().width;
      const max = h.scrollWidth - h.clientWidth;
      return { rail, progress: max > 0 ? h.scrollLeft / max : 0, vw: innerWidth };
    })()`);
  };
  const r0 = await railAt(0);
  const rMid = await railAt(3000);
  await evaluate(`(() => { const h = document.getElementById('hall'); h.scrollLeft = h.scrollWidth; })()`);
  await sleep(400);
  const full = await railAt(0);
  await evaluate(`(() => { const h = document.getElementById('hall'); h.scrollLeft = h.scrollWidth; })()`);
  await sleep(400);
  const end = await evaluate(`(() => {
    const h = document.getElementById('hall');
    const rail = document.querySelector('.rail').getBoundingClientRect().width;
    return { rail, progress: h.scrollLeft / (h.scrollWidth - h.clientWidth), vw: innerWidth };
  })()`);
  check('the rail starts empty', r0.rail === 0, JSON.stringify(r0));
  check('the rail grows as the walk moves', rMid.rail > r0.rail, JSON.stringify([r0, rMid]));
  check('the rail tracks the walk proportionally',
        Math.abs(rMid.rail / rMid.vw - rMid.progress) < 0.02, JSON.stringify(rMid));
  check('the rail fills the edge at the end of the walk',
        Math.abs(end.rail - end.vw) <= 2, JSON.stringify(end));
  await evaluate(`document.getElementById('hall').scrollLeft = 0`);
  await sleep(400);
});

/* -- The gallery is as wide as its own hang ---------------------------- */
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
      labels: [...r.querySelectorAll('.label')].map(l => l.getBoundingClientRect().width),
    }));
  })()`);
  const honoursRooms = geo.filter((r) => r.key && r.key.indexOf('Honours') === 0);
  const honours = honoursRooms[0];
  check('honours is one gallery, not four',
        honoursRooms.length === 1, honoursRooms.map((r) => r.key).join(', '));
  check('a gallery with more hang than one screen is wider than the viewport',
        !!honours && honours.w > honours.vw,
        honours ? Math.round(honours.w) + 'px in a ' + honours.vw + 'px viewport' : 'no honours gallery');
  /* The floor, and the whole reason a gallery is never narrower than a screen:
     a visitor is always standing inside one named gallery, not looking at two. */
  check('every gallery is at least one screen wide',
        geo.every((r) => r.w >= r.vw - 1),
        geo.filter((r) => r.w < r.vw - 1).map((r) => r.key + ' ' + Math.round(r.w)).join(', '));
  check('the honours gallery holds every honour',
        !!honours && honours.groups === (await evaluate(`globalThis.PORTFOLIO.honors.length`)),
        honours ? honours.groups + ' groups' : 'no honours gallery');
  /* A fixed basis is what stops a wide cluster squeezing the label: every
     label on the wall is the same width, whatever its own photographs do. */
  const widths = geo.flatMap((r) => r.labels);
  check('every label is the same width',
        widths.length > 0 && Math.max(...widths) - Math.min(...widths) <= 1,
        widths.length ? Math.round(Math.min(...widths)) + '..' + Math.round(Math.max(...widths)) : 'no labels');
});

/* -- The deepest hang still fits the band ------------------------------ */
await section('The deepest hang stays inside the room', async () => {
  /* Five frames in one column is the deepest arrangement the table produces,
     and it is the case the frame-height clamps are cut for. Only a layout
     engine can measure it, which is why it is checked here and not in
     tests/. */
  for (const [w, h] of [[1440, 900], [1280, 704]]) {
    await setViewport(w, h, false);
    await goto(BASE);
    /* Every photograph on the wall, not just the ones the walk has reached. A
       frame whose photograph has not been FETCHED has no width of its own, so
       measuring it measures the loading floor rather than the hang. */
    await evaluate(`(async () => {
      const imgs = [...document.querySelectorAll('#strip img')];
      imgs.forEach(i => { i.loading = 'eager'; });
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline && imgs.some(i => !i.complete)) {
        await new Promise(r => setTimeout(r, 200));
      }
      await new Promise(r => setTimeout(r, 600));
    })()`);
    const worst = await evaluate(`(() => {
      let worst = null;
      document.querySelectorAll('#strip .group').forEach(g => {
        const room = g.closest('.room').getBoundingClientRect();
        const gr = g.getBoundingClientRect();
        const deepest = Math.max(...[...g.querySelectorAll('.col')]
          .map(c => c.getBoundingClientRect().height));
        const slack = Math.round(room.bottom - gr.bottom);
        if (!worst || slack < worst.slack) {
          worst = { slack, deepest: Math.round(deepest), entry: g.dataset.entry,
                    hang: g.querySelector('.cluster').dataset.hang };
        }
      });
      return worst;
    })()`);
    check('the deepest hang clears the dock band at ' + w + 'x' + h,
          !!worst && worst.slack > 0, JSON.stringify(worst));
    const frames = await evaluate(`(() => {
      const out = { minW: Infinity, minH: Infinity };
      document.querySelectorAll('#strip .group .piece').forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.height === 0) return;
        out.minW = Math.min(out.minW, r.width);
        out.minH = Math.min(out.minH, r.height);
      });
      return out;
    })()`);
    check('every frame clears 44x44 at ' + w + 'x' + h,
          frames.minW >= 44 && frames.minH >= 44,
          Math.round(frames.minW) + 'x' + Math.round(frames.minH));

    /* The invariant spec 6.1 actually states: a frame takes its photograph's
       shape. The height is given, the width follows, and the frame is the
       photograph plus its mat and nothing else. A column is a flex box, and a
       flex box stretches its children by default — which draws the widest
       frame's width around every photograph in that column and leaves the
       piece's black ground showing beside the narrow ones. It is invisible to
       every other check here, because the frame still does not collide with
       anything and still clears the tap floor. */
    const stretched = await evaluate(`(() => {
      const out = [];
      const name = (p) => p.closest('.room').getAttribute('data-room') + ':' + p.dataset.piece;
      document.querySelectorAll('#strip .group .piece').forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.height === 0) return;
        if (p.classList.contains('piece--pending')) {
          /* An awaited frame has no photograph to take a shape from, so it is
             held at the 3:2 of the frame that will hang there. */
          const want = r.height * 1.5;
          if (Math.abs(r.width - want) > 14) {
            out.push(name(p) + ' awaited frame ' + Math.round(r.width) + ' wide, not ' + Math.round(want));
          }
          return;
        }
        const img = p.querySelector('img');
        if (!img || !img.complete || !img.naturalWidth) return;
        const slack = Math.round(r.width - img.getBoundingClientRect().width);
        /* The frame's own 3px gilt edge either side, and nothing more. */
        if (slack > 12) {
          out.push(name(p) + ' frame ' + Math.round(r.width) + ' around a ' +
            Math.round(img.getBoundingClientRect().width) + 'px photograph: ' + slack + 'px of ground');
        }
      });
      return out;
    })()`);
    check('a frame is as wide as its photograph at ' + w + 'x' + h,
          stretched.length === 0,
          stretched.length + ' stretched: ' + stretched.slice(0, 6).join(' | '));

    /* An awaited frame is a reserved place on the wall, not a hole in it. A
       hung photograph gets its cream mat from the image's own 6px border; a
       frame with no image gets nothing, so its interior is the piece's black
       ground inside a gilt edge — measured on the honours wall as three solid
       black rectangles where a record declares no photographs at all, which is
       the conspicuous hole the empty-frame treatment exists to avoid. The mat
       colour is read off a hung frame rather than hard-coded, so the two cannot
       drift apart. */
    const matted = await evaluate(`(() => {
      const img = document.querySelector('#strip .group .piece img');
      const mat = img ? getComputedStyle(img).borderTopColor : null;
      const awaited = [...document.querySelectorAll('#strip .piece--pending')];
      if (!mat || !awaited.length) return { ok: false, why: 'nothing to compare', mat, awaited: awaited.length };
      const bare = awaited.filter(p => {
        const cs = getComputedStyle(p);
        return (cs.boxShadow || '').indexOf(mat) === -1 && (cs.borderTopColor || '') !== mat;
      }).length;
      return { ok: bare === 0, mat, awaited: awaited.length, bare };
    })()`);
    check('an awaited frame is matted like a hung photograph at ' + w + 'x' + h,
          matted.ok, JSON.stringify(matted));
  }
  await setViewport(1440, 900, false);
  await goto(BASE);
});

/* -- 1. The whole piece is a click target ----------------------------- */
await section('Piece click targets', async () => {
  /* A piece is one framed photograph inside a group. Its whole frame must
     open the dialog, so the frame's own centre and a spot just inside its
     border are both tested — a piece whose <img> swallowed the click but
     whose frame padding did not would leave a control that only works if you
     hit the photograph exactly. */
  await centreWork('.piece[data-project]');
  const cardPoints = await evaluate(`(() => {
    const card = document.querySelector('.piece[data-project]');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return {
      centre: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      border: { x: r.left + 4, y: r.top + r.height / 2 },
      edge:   { x: r.left + r.width / 2, y: r.bottom - 3 }
    };
  })()`);
  await sleep(350);
  if (!cardPoints) { check('the piece frame opens Overview', false, 'no piece rendered yet'); return; }
  for (const where of ['centre', 'border', 'edge']) {
    await closeModal();
    const p = cardPoints[where];
    await click(p.x, p.y);
    check(where + ' of the piece opens Overview', await modalOpen(), 'modal did not open');
  }
  await closeModal();
  check('a piece shows a pointer cursor',
    (await evaluate(`getComputedStyle(document.querySelector('.piece[data-piece]')).cursor`)) === 'pointer');
});

/* -- 2. A piece is reachable and named by keyboard -------------------- */
await section('Piece keyboard access', async () => {
  const has = await evaluate(`!!document.querySelector('.piece[data-project]')`);
  check('a piece is focusable',
    has && (await evaluate(`document.querySelector('.piece[data-project]').tabIndex >= 0`)) === true,
    has ? undefined : 'no .piece control yet');
  check('a piece has an accessible name',
    has && (await evaluate(`(document.querySelector('.piece[data-project]').getAttribute('aria-label') || '').trim().length > 0`)) === true,
    has ? undefined : 'no .piece control yet');
  if (!has) { check('Enter on a focused piece opens Overview', false, 'no .piece control yet'); return; }
  await evaluate(`document.querySelector('.piece[data-project]').focus()`);
  await pressEnter();
  check('Enter on a focused piece opens Overview', await modalOpen(), 'modal did not open');
});

/* -- 3. A piece reads as a control ------------------------------------ */
await section('A piece reads as a control', async () => {
  /* The old build needed a "View project" cue because a bare thumbnail was
     not obviously clickable. A framed piece is: it has a pointer cursor, a
     visible border, and its own accessible name. This asserts the affordance
     is still there rather than a hover-only cue that a keyboard user never
     sees. */
  await closeModal();
  const piece = await evaluate(`(() => {
    const p = document.querySelector('.piece[data-project]');
    if (!p) return null;
    const cs = getComputedStyle(p);
    return { cursor: cs.cursor, border: cs.borderTopWidth, label: p.getAttribute('aria-label') };
  })()`);
  check('a piece carries a pointer cursor', piece && piece.cursor === 'pointer', JSON.stringify(piece));
  check('a piece is framed, so it reads as hung work',
        piece && parseFloat(piece.border) > 0, JSON.stringify(piece));
  check('a piece is named for assistive tech',
        piece && (piece.label || '').trim().length > 0, JSON.stringify(piece));
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

/* -- 6. Gallery photos resolve and render ----------------------------- */
/* The owner has not supplied photos for these rows yet, and chose to keep
   them clickable with a labelled placeholder. Those 404s are expected —
   every other photo must resolve, and no wired photo may fall back to the
   1.1 KB placeholder. Add a path here only while it is genuinely pending. */
const PENDING_PHOTOS = [
  'files/news-REDACTED-1.jpg',
  'files/news-graduation-1.jpg',
  'files/news-graduation-2.jpg',
  'files/news-heroes-tribute-1.jpg',
  'files/news-steam-conference-1.jpg',
  'files/leadership-personnels-week-1.jpg',
  'files/leadership-personnels-week-2.jpg',
  'files/honors-commencement-1.jpg',
  'files/honors-commencement-2.jpg',
  'files/honors-work-immersion-1.jpg',
  'files/honors-nyc-2023-1.jpg'
];
/* Matches both the bare path from js/data.js and the absolute URL carried by
   a console or network event. */
const isPendingPhoto = (src) => PENDING_PHOTOS.some((p) => String(src).replace(/\\/g, '/').includes(p));

await section('Gallery photos', async () => {
  await setViewport(1440, 900, false);
  await goto(BASE);

  /* Read the paths out of the data module the page itself uses, so this check
     tracks js/data.js instead of duplicating its contents. */
  const wired = await evaluate(`(() => {
    const out = [];
    const collect = (kind, list) => list.forEach((entry, index) => {
      (entry.images || []).forEach((src) => out.push({ kind, index, src }));
    });
    collect('news', PORTFOLIO.news);
    collect('leadership', PORTFOLIO.leadership);
    collect('honors', PORTFOLIO.honors);
    return out;
  })()`);

  const shipped = wired.filter((w) => !isPendingPhoto(w.src));
  const waiting = wired.filter((w) => isPendingPhoto(w.src));
  console.log('  info  ' + shipped.length + ' photos wired, ' + waiting.length + ' still awaiting photos');

  const unresolved = [];
  const stubs = [];
  for (const w of shipped) {
    const head = await fetch(BASE + w.src, { method: 'HEAD' });
    const len = Number(head.headers.get('content-length') || 0);
    if (!head.ok) unresolved.push(head.status + ' ' + w.src);
    else if (len < 5000) stubs.push(w.src + ' (' + len + ' bytes)');
  }
  check('every wired gallery photo resolves', unresolved.length === 0, unresolved.join(' | '));
  check('no wired photo is a placeholder stub', stubs.length === 0, stubs.join(' | '));

  /* Open each freshly wired gallery through the app's own click handler and
     confirm the decoder produced real pixels — a 200 alone would not catch a
     corrupt or mislabelled file. */
  const rows = [...new Set(shipped.map((w) => w.kind + ':' + w.index))];
  const broken = [];
  for (const row of rows) {
    const [kind, index] = row.split(':');
    /* The entry key a piece carries is scoped by its array (`honors:3`). */
    const opened = await evaluate(`(() => {
      const el = document.querySelector('[data-gallery="${kind}"][data-entry="${row}"]');
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!opened) { broken.push(row + ' (no such row)'); continue; }
    const shown = await evaluate(`(async () => {
      const track = document.getElementById('galleryTrack');
      const imgs = track ? [...track.querySelectorAll('img')] : [];
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && imgs.some((i) => !i.complete)) await new Promise((r) => setTimeout(r, 100));
      const slides = track ? [...track.querySelectorAll('.gallery-slide')] : [];
      return {
        slides: slides.length,
        empty: slides.filter((s) => {
          const i = s.querySelector('img');
          return !i || i.naturalWidth === 0;
        }).length,
        placeholders: slides.filter((s) => s.classList.contains('is-placeholder')).length
      };
    })()`);
    if (!shown.slides || shown.empty || shown.placeholders) {
      broken.push(row + ' (slides=' + shown.slides + ' broken=' + shown.empty + ' placeholder=' + shown.placeholders + ')');
    }
    await closeModal();
  }
  check('every wired gallery renders real photos', broken.length === 0, broken.join(' | '));
});

/* -- 7. No broken resources, no console errors ------------------------ */
await section('Resources', async () => {
  const unexpected = badResponses.filter((u) => !isPendingPhoto(u));
  const realErrors = consoleErrors.filter((t) => !isPendingPhoto(t));
  check('no unexpected 4xx/5xx responses', unexpected.length === 0, unexpected.join(' | '));
  check('no console errors beyond the pending photos', realErrors.length === 0, realErrors.join(' | '));
});

/* -- 8. Share metadata ------------------------------------------------ */
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

/* -- 9. Page weight: the walk costs nothing until it is walked -------- */
await section('Page weight', async () => {
  const weight = new Map();
  cdp.on('Network.responseReceived', (p) => weight.set(p.requestId, { url: p.response.url, type: p.type, n: 0 }));
  cdp.on('Network.loadingFinished', (p) => { const w = weight.get(p.requestId); if (w) w.n = p.encodedDataLength; });
  const isVideo = (w) => w.type === 'Media' || /\.mp4/i.test(w.url);
  const sum = (pred) => [...weight.values()].filter(pred).reduce((a, w) => a + w.n, 0) / 1048576;

  await setViewport(1440, 900, false);
  await goto(BASE);          /* opens on room 1 and stays there */
  await sleep(3000);
  const topVideo = sum(isVideo);
  const topTotal = sum(() => true);
  console.log('  info  opening room: ' + topVideo.toFixed(2) + ' MB video / ' + topTotal.toFixed(2) + ' MB total');
  check('the opening room fetches no video',
    topVideo < 0.5, topVideo.toFixed(2) + ' MB of video on arrival');

  /* Then walk the whole strip — this is what a real visit costs. (A fast
     scroll is a poor measure: Chrome aborts large media the moment it leaves
     the viewport.) */
  const walkWidth = await evaluate(`document.getElementById('strip').scrollWidth`);
  for (let x = 0; x < walkWidth; x += 900) await scrollWalk(900);
  await waitSettled();
  console.log('  info  whole walk:   ' + sum(isVideo).toFixed(2) + ' MB video / ' + sum(() => true).toFixed(2) + ' MB total');
});

/* -- 10. Reduced motion: every work fully lit, nothing autoplays ------ */
await section('Reduced motion', async () => {
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await setViewport(1440, 900, false);
  await goto(BASE);
  await sleep(1500);
  /* Spec §7: under reduced motion every piece renders at w = 1 with no
     transition, including pieces the visitor has not walked to yet. */
  const lit = await evaluate(`(() => {
    const works = [...document.querySelectorAll('.piece[data-piece]')];
    return {
      total: works.length,
      fully: works.filter(w => Number(getComputedStyle(w).getPropertyValue('--lit')) === 1).length,
    };
  })()`);
  check('every piece is fully lit under prefers-reduced-motion',
    lit.total > 0 && lit.fully === lit.total, lit.fully + ' of ' + lit.total + ' lit');
  const playing = await evaluate(`[...document.querySelectorAll('video')].filter(v => !v.paused).length`);
  check('nothing autoplays under prefers-reduced-motion', playing === 0, playing + ' playing');

  /* Reduced motion removes the light falloff, NOT the walk's bookkeeping. This
     asserted the opposite once: the controller returned before binding its
     scroll handler, so under reduced motion the rail stayed empty, the live
     region was never written and the dock never followed the walk — while the
     spec requires the live region to keep announcing. */
  const across = await evaluate(`(async () => {
    const hall = document.getElementById('hall');
    const rooms = [...document.querySelectorAll('#strip .room')];
    const last = rooms[rooms.length - 1];
    hall.scrollLeft = last.offsetLeft + 10;
    await new Promise(r => setTimeout(r, 400));
    const rail = document.querySelector('.rail').getBoundingClientRect().width;
    const cur = document.querySelector('.dock-link[aria-current="true"]');
    const max = hall.scrollWidth - hall.clientWidth;
    return {
      rail, vw: innerWidth, progress: max > 0 ? hall.scrollLeft / max : 1,
      announced: (document.getElementById('announcer') || {}).textContent || '',
      current: cur ? cur.getAttribute('data-goto') : null,
      room: last.getAttribute('data-room')
    };
  })()`);
  check('the rail still tracks the walk under prefers-reduced-motion',
        Math.abs(across.rail - across.vw * across.progress) < 6, JSON.stringify(across));
  check('the live region still names the room under prefers-reduced-motion',
        across.announced.trim().length > 0, JSON.stringify(across));
  check('the dock still follows the walk under prefers-reduced-motion',
        across.current === across.room,
        'dock says ' + across.current + ', walk is in ' + across.room);
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
});

/* -- 11. Mobile: no overflow, tappable targets ------------------------ */
await section('Mobile (390x844)', async () => {
  await setViewport(390, 844, true);
  await goto(BASE);
  /* Walk the whole strip on the phone: this is also the touch-path check, as
     it puts every room through the layout at this width. */
  const walkWidth = await evaluate(`document.getElementById('strip').scrollWidth`);
  for (let x = 0; x < walkWidth; x += 500) await scrollWalk(500);
  await waitSettled();
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
    const elements = [...document.querySelectorAll('a[href], button, [data-gallery]')];
    const pips = elements.filter(el => el.classList.contains('dock-link'));
    const small = elements.filter(el => {
      if (el.offsetWidth < 1 || el.offsetHeight < 1) return false;
      const t = effective(el);
      /* The collapsed dock's pips are a full 44x44. They used to be 41px wide
         because nine rooms at 44 need 396px, which does not fit a 390px screen;
         one Honours gallery instead of four is what bought the floor back, so
         the exception is gone and every control is asserted at 44. */
      return t.w < 44 || t.h < 44;
    });
    return { overflow: de.scrollWidth - de.clientWidth, small: small.length,
             dockPips: pips.length,
             pipWidth: pips.length ? Math.min(...pips.map(el => el.offsetWidth)) : 0,
             examples: small.slice(0, 8).map(el => {
               const t = effective(el);
               const name = (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');
               return name + ' effective=' + Math.round(t.w) + 'x' + Math.round(t.h);
             }) };
  })()`);
  check('no horizontal overflow on mobile', mob.overflow === 0, mob.overflow + 'px');
  check('every tap target is at least 44x44, with no exception',
        mob.small === 0, mob.examples.join(' | '));
  check('every room is a pip in the collapsed dock',
        mob.dockPips >= 6, mob.dockPips + ' pips');
  check('a collapsed pip is a full 44px wide', mob.pipWidth >= 44, mob.pipWidth + 'px');
});

/* -- 12. The walk is horizontal --------------------------------------- */
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

/* -- 13. Snap settles on a work --------------------------------------- */
await section('Snap settles on a work', async () => {
  await scrollWalk(430);
  const a = await hallScrollLeft();
  await sleep(900);
  const b = await hallScrollLeft();
  check('the walk comes to rest', Math.abs(a - b) < 2, `still moving: ${a} -> ${b}`);
});

/* -- The dock and the rail -------------------------------------------- */
await section('The dock sits at the foot of the walk', async () => {
  const geo = await evaluate(`(() => {
    const d = document.querySelector('.dock');
    const rail = document.querySelector('.rail');
    if (!d || !rail) return null;
    const dr = d.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    const current = d.querySelectorAll('.dock-link[aria-current="true"]').length;
    const links = d.querySelectorAll('.dock-link').length;
    const rooms = document.querySelectorAll('#strip [data-room]').length;
    return { top: dr.top, bottom: dr.bottom, height: dr.height, left: dr.left, right: dr.right,
             railTop: rr.top, railBottom: rr.bottom, railH: rr.height,
             links, current, rooms };
  })()`);
  check('the dock and the rail are both in the shell', geo !== null, 'missing from the page');
  if (!geo) return;
  check('the dock sits at the foot of the walk', geo.top > 780 && geo.bottom <= 900,
        JSON.stringify(geo));
  check('the rail is pinned to the bottom edge, 2px tall',
        geo.railBottom === 900 && geo.railH === 2, JSON.stringify(geo));
  check('the dock carries every room, exactly once',
        geo.links === geo.rooms, geo.links + ' dock entries for ' + geo.rooms + ' rooms');
  check('exactly one dock entry is current', geo.current === 1, geo.current + ' current');
  check('the dock fits the viewport', geo.left >= 0 && geo.right <= 1440,
        geo.left + '..' + geo.right);
});

/* -- The walk is still reachable from the keyboard with no scrollbar --- */
await section('The walk scrolls without a native scrollbar', async () => {
  const bar = await evaluate(`(() => {
    const h = document.getElementById('hall');
    return { clientH: h.clientHeight, offsetH: h.offsetHeight,
             scrollbar: h.offsetHeight - h.clientHeight };
  })()`);
  check('no scrollbar steals the hall height', bar.scrollbar === 0, JSON.stringify(bar));

  /* Hiding the native scrollbar must not have removed keyboard scrolling:
     #hall keeps its overflow-x and its tabindex, so the arrow keys still move
     the walk. This is easy to confuse with "not scrollable at all", which is
     why it is asserted rather than assumed.
     The focus is confirmed before the key is sent. A single `focus()` call can
     still be settling when the key arrives, and the resulting failure reads as
     "the keyboard cannot scroll the walk" when nothing is wrong — this
     assertion was flaky for exactly that reason. */
  const pressArrow = async (key, code) => {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key, code, windowsVirtualKeyCode: code === 'ArrowRight' ? 39 : 37,
      nativeVirtualKeyCode: code === 'ArrowRight' ? 39 : 37
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key, code, windowsVirtualKeyCode: code === 'ArrowRight' ? 39 : 37,
      nativeVirtualKeyCode: code === 'ArrowRight' ? 39 : 37
    });
    await sleep(700);
  };

  await evaluate(`document.getElementById('hall').scrollLeft = 0`);
  /* Let the walk settle before measuring. Lenis animates every programmatic
     scroll, so a key sent while an earlier section's animation is still running
     is swallowed and the failure reads as "the keyboard cannot scroll the walk"
     when nothing is wrong. Verified: focus plus ArrowRight moves the walk by
     40px every time once the position has settled. */
  await waitSettled(3000);
  const focused = await evaluate(`(() => {
    const h = document.getElementById('hall');
    h.focus();
    return document.activeElement === h;
  })()`);
  check('the scroll container can take focus', focused === true, 'focus did not land on #hall');
  await sleep(250);

  const before = await hallScrollLeft();
  let after = before;
  /* One retry: the first key press after a programmatic focus is the one that
     can be swallowed, and a second press distinguishes "swallowed" from
     "cannot scroll". */
  for (let attempt = 0; attempt < 2 && after <= before; attempt++) {
    await pressArrow('ArrowRight', 'ArrowRight');
    after = await hallScrollLeft();
  }
  check('the arrow keys still move the walk', after > before, before + ' -> ' + after);

  /* And back, so this section leaves the walk where it found it. */
  const backBefore = await hallScrollLeft();
  await pressArrow('ArrowLeft', 'ArrowLeft');
  const backAfter = await hallScrollLeft();
  check('the arrow keys move the walk back', backAfter < backBefore, backBefore + ' -> ' + backAfter);
});

/* -- The dock at 390x844 ------------------------------------------------ */
await section('The dock still names the room on a phone', async () => {
  await setViewport(390, 844, true);
  await goto(BASE);
  const named = await evaluate(`(async () => {
    const hall = document.getElementById('hall');
    const live = document.getElementById('dockCurrent');
    const out = [];
    const links = [...document.querySelectorAll('.dock-link')];
    for (const l of links) {
      const room = document.querySelector('#strip .room[data-room="' + l.getAttribute('data-goto') + '"]');
      if (!room) { out.push({ want: l.getAttribute('data-goto'), got: '(no such room)' }); continue; }
      /* Setting scrollLeft directly leaves Lenis to interpolate towards it, and
         the dock is only re-marked when a scroll event fires. The jump across
         the honours gallery is thousands of pixels, so a short wait reads the
         position mid-flight and names the room the walk just left. */
      hall.scrollLeft = room.offsetLeft + 10;
      await new Promise(r => setTimeout(r, 900));
      const cur = document.querySelector('.dock-link[aria-current="true"]');
      const cq = cur ? cur.getBoundingClientRect() : null;
      const ann = document.getElementById('announcer');
      out.push({
        want: l.getAttribute('data-goto'),
        got: cur ? cur.getAttribute('data-goto') : null,
        live: live ? live.textContent : null,
        announced: ann ? ann.textContent : null,
        onScreen: cq ? (cq.left >= 0 && cq.right <= innerWidth) : false
      });
    }
    hall.scrollLeft = 0;
    return out;
  })()`);
  const wrong = named.filter((n) => n.got !== n.want);
  check('the dock marks the room the walk is in, everywhere on a phone',
        wrong.length === 0, JSON.stringify(wrong));
  const off = named.filter((n) => !n.onScreen);
  check('the current dock control is always on screen on a phone',
        off.length === 0, JSON.stringify(off));
  /* The current room is named even where the dock's labels collapse: the live
     region announces every change, which is the same signal a screen reader
     gets and the only one a phone user gets. Without it the dock is nine
     numbers and no name. */
  const announced = named.filter((n) => !n.announced || !n.announced.trim());
  check('the current room is announced even where the dock labels collapse',
        announced.length === 0, JSON.stringify(announced));
});

/* -- 14. Lights come up and stay up ----------------------------------- */
await section('Lights come up and stay up', async () => {
  /* Each piece carries its own --lit, written on the piece element. The About
     room's portrait is a .work, not a piece, so this reads a piece that
     actually lights. */
  await centreWork('.piece[data-piece]');
  const lit = await evaluate(`(() => {
    const w = document.querySelector('.piece[data-piece]');
    return w ? Number(getComputedStyle(w).getPropertyValue('--lit')) : -1;
  })()`);
  check('a piece in view is lit', lit > 0.6, 'lit was ' + lit);
  await scrollWalk(900);
  const still = await evaluate(`(() => {
    const w = document.querySelector('.piece[data-piece]');
    return w ? Number(getComputedStyle(w).getPropertyValue('--lit')) : -1;
  })()`);
  check('a piece already seen stays lit', still > 0.6, 'lit fell to ' + still);
});

/* -- 15. No piece hangs empty ----------------------------------------- */
await section('No piece hangs empty', async () => {
  /* A group whose photographs are all missing still hangs a labelled
     placeholder, so a frame is never a conspicuous hole on a near-black
     wall. An awaited frame is not empty for want of a picture — it is a
     reserved place, and it is drawn as one — so only frames that can hold a
     photograph are counted here. */
  const empty = await evaluate(
    `[...document.querySelectorAll('.piece')]
       .filter(w => !w.classList.contains('piece--pending') && !w.querySelector('img')).length`);
  check('every frame that has a photograph renders it', empty === 0, empty + ' empty frames');
  const awaited = await evaluate(
    `[...document.querySelectorAll('.piece--pending')].filter(w => w.querySelector('img')).length`);
  check('no awaited frame loads a picture', awaited === 0, awaited + ' awaited frames draw an image');
  const broken = await evaluate(
    `[...document.querySelectorAll('.piece img')].filter(i => i.complete && i.naturalWidth === 0).length`);
  check('every piece image decoded', broken === 0, broken + ' broken images');
});

await cdp.send('Target.closeTarget', { targetId });
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
