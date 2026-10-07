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
/* Cache off, and it is not a nicety: this suite re-navigates to the same URL
   dozens of times while the stylesheet changes underneath it, and a cached
   `css/styles.css` makes every geometry measurement describe the PREVIOUS
   build. Observed while implementing the two-cell stand — the suite reported a
   stand 828px tall from a stylesheet that had already been changed to make it
   731px, and the two probes that created a fresh target disagreed with it. */
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
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
    /* Honours is a list of tiles, not a hang: a tile holds no frame, so it
       contributes nothing to the wall's census. Its own contract is the
       renderer suite's tile checks, plus the tile geometry measured below. */
    P.leadership.forEach(l => note('leadership', S.groupPieces(l, 'record')));
    const tiles = S.honoursTiles(P.honors);
    return { want, awaited, all, honours: { tiles: tiles.tiles.length, awards: tiles.projectAwards.length },
             groups: P.projects.length + P.leadership.length };
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
    const clipped = [], collide = [], scrolled = [];
    document.querySelectorAll('#strip .group').forEach(g => {
      const label = g.querySelector('.label');
      if (!label) return;
      const id = g.closest('.room').getAttribute('data-room') + ' ' + g.dataset.entry;
      const gr = g.getBoundingClientRect();
      const lr = label.getBoundingClientRect();
      const gone = [...label.querySelectorAll('.cat-entry')]
        .filter(e => e.getBoundingClientRect().bottom > Math.min(lr.bottom, gr.bottom) + 1).length;
      if (!gone) return;
      /* An entry below the box is only CLIPPED when the box cannot be scrolled.
         At the floor the label column scrolls by design, so the same geometry is
         an entry a visitor can reach. Reported, not failed. */
      const oy = getComputedStyle(label).overflowY;
      if (oy === 'hidden' || oy === 'clip') clipped.push(id + ': ' + gone);
      else scrolled.push(id + ': ' + gone + ' (' + oy + ')');
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
    return { clipped, collide, scrolled };
  })()`);
  check('labels still fit at 1280x704', floorInner.clipped.length === 0, floorInner.clipped.join(' | '));
  check('frames still do not collide at 1280x704',
        floorInner.collide.length === 0, floorInner.collide.slice(0, 5).join(' | '));
  if (floorInner.scrolled.length) {
    console.log('  info  ' + floorInner.scrolled.length + ' label(s) scroll at 1280x704 ' +
      '(reachable, not clipped): ' + floorInner.scrolled.join('; '));
  }
  await setViewport(1440, 900, false);
  await goto(BASE);

  /* The rail is the position cue that replaced the native scrollbar. Its
     width is a fraction of the EDGE, driven by the walk's progress — not a
     fraction of the viewport compared against itself, which is what this
     assertion first read and which passed for the wrong reason while the
     strip happened to be a whole number of screens wide. */
  /* The position cue that replaced the native scrollbar is the DOCK'S OWN TRACK
     — the .dock-track element, whose ::after is filled to the walk's progress
     custom property. This read the .rail element, which css/styles.css records
     as removed from the shell and replaced by exactly this track, so the whole
     block threw "Cannot read properties of null" and counted as a section ERROR
     rather than as four failing checks.

     What the assertions can still ask, and what they were always asking: the
     fill starts empty, grows as the walk moves, grows in proportion, and fills
     at the end. The fill's width is read off the custom property the walk
     writes, because a pseudo-element cannot be measured directly. */
  const railAt = async (left) => {
    await evaluate(`document.getElementById('hall').scrollLeft = ${left}`);
    await sleep(280);
    return evaluate(`(() => {
      const h = document.getElementById('hall');
      const t = document.querySelector('.dock-track');
      const pct = parseFloat(getComputedStyle(t).getPropertyValue('--walk-progress')) || 0;
      const max = h.scrollWidth - h.clientWidth;
      return { fill: Math.round(t.getBoundingClientRect().width * pct / 100),
               track: Math.round(t.getBoundingClientRect().width),
               pct, progress: max > 0 ? h.scrollLeft / max : 0, vw: innerWidth };
    })()`);
  };
  const r0 = await railAt(0);
  const rMid = await railAt(3000);
  await evaluate(`(() => { const h = document.getElementById('hall'); h.scrollLeft = h.scrollWidth; })()`);
  await sleep(400);
  const end = await evaluate(`(() => {
    const h = document.getElementById('hall');
    const t = document.querySelector('.dock-track');
    const pct = parseFloat(getComputedStyle(t).getPropertyValue('--walk-progress')) || 0;
    return { pct, track: Math.round(t.getBoundingClientRect().width),
             progress: h.scrollLeft / (h.scrollWidth - h.clientWidth), vw: innerWidth };
  })()`);
  check('the dock track starts empty', r0.fill === 0 && r0.pct === 0, JSON.stringify(r0));
  check('the dock track grows as the walk moves', rMid.fill > r0.fill, JSON.stringify([r0, rMid]));
  check('the dock track tracks the walk proportionally',
        Math.abs(rMid.pct / 100 - rMid.progress) < 0.02, JSON.stringify(rMid));
  check('the dock track fills at the end of the walk',
        Math.abs(end.pct - 100) <= 1, JSON.stringify(end));
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
  check('honours is one room, not four',
        honoursRooms.length === 1, honoursRooms.map((r) => r.key).join(', '));
  /* The honours room is a LIST of tiles now, so it is one screen wide rather
     than as wide as a hang — a grid under `width: max-content` is circular. */
  check('the honours room is exactly one screen wide',
        !!honours && Math.abs(honours.w - honours.vw) <= 1,
        honours ? Math.round(honours.w) + 'px in a ' + honours.vw + 'px viewport' : 'no honours room');
  /* The floor, and the whole reason a gallery is never narrower than a screen:
     a visitor is always standing inside one named gallery, not looking at two. */
  check('every gallery is at least one screen wide',
        geo.every((r) => r.w >= r.vw - 1),
        geo.filter((r) => r.w < r.vw - 1).map((r) => r.key + ' ' + Math.round(r.w)).join(', '));
  /* A fixed basis is what stops a wide cluster squeezing the label: every
     label on the wall is the same width, whatever its own photographs do. */
  const widths = geo.flatMap((r) => r.labels);
  check('every label is the same width',
        widths.length > 0 && Math.max(...widths) - Math.min(...widths) <= 1,
        widths.length ? Math.round(Math.min(...widths)) + '..' + Math.round(Math.max(...widths)) : 'no labels');
});

/* -- The honours room is a three-column list of tiles ------------------ */
await section('The honours room is a three-column list', async () => {
  /* Three columns is a hard requirement, not a preference: the room is one
     screen tall with no vertical axis, so a grid that wrapped into a fourth row
     would be clipped with nowhere to scroll to. Only a layout engine can say
     how many rows the tiles actually landed in. */
  const tiles = await evaluate(`(() => {
    const section = document.querySelector('#strip .room[data-room="Honours"]');
    if (!section) return null;
    const list = section.querySelector('.tiles');
    const tiles = [...section.querySelectorAll('.tile')];
    const cols = list ? getComputedStyle(list).gridTemplateColumns.split(' ').length : 0;
    const tops = [...new Set(tiles.map(t => Math.round(t.getBoundingClientRect().top)))];
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const room = section.getBoundingClientRect();
    const rects = tiles.map(t => t.getBoundingClientRect());
    return {
      count: tiles.length, cols, rows: tops.length,
      minH: rects.length ? Math.min(...rects.map(r => Math.round(r.height))) : 0,
      minW: rects.length ? Math.min(...rects.map(r => Math.round(r.width))) : 0,
      past: rects.filter(r => r.bottom > dock.top || r.top < 24).length,
      /* The room's own box, and how far any tile reaches past it. This is the
         measurement that catches the grid-overflow fault this section exists
         for: the room resolved 1052px inside a 987px content box, so the third
         column hung off the right edge while the list's own scrollWidth still
         read as fitting. Every rect check against the dock passed. */
      outOfRoom: rects.filter(r => r.right > room.right + 1 || r.left < room.left - 1).length,
      roomW: Math.round(room.width), listW: Math.round(list.getBoundingClientRect().width),
      listOverflow: list.scrollWidth - list.clientWidth,
      roomH: Math.round(room.height),
      listH: list ? Math.round(list.getBoundingClientRect().height) : 0,
    };
  })()`);
  check('the honours room renders a tile list', !!tiles && tiles.count > 0, JSON.stringify(tiles));
  check('the tiles sit in three columns', !!tiles && tiles.cols === 3,
        tiles ? tiles.cols + ' columns' : 'no tile list');
  check('no tile reaches outside its room',
        !!tiles && tiles.outOfRoom === 0 && tiles.listOverflow === 0,
        tiles ? JSON.stringify(tiles) : 'no tile list');
  check('the tiles fit the room at 1440x900',
        !!tiles && tiles.past === 0 && tiles.listH <= tiles.roomH,
        tiles ? JSON.stringify(tiles) : 'no tile list');
  check('every tile clears the 44px tap target',
        !!tiles && tiles.minH >= 44 && tiles.minW >= 44,
        tiles ? tiles.minW + 'x' + tiles.minH : 'no tiles');
  check('the tile count is every honour that stands alone',
        !!tiles && tiles.count === (await evaluate(
          `globalThis.Site.honoursTiles(globalThis.PORTFOLIO.honors).tiles.length`)),
        tiles ? tiles.count + ' tiles' : 'no tiles');

  /* And again at the spec's floor, where the room has the least height and a
     third row is most likely to be clipped. */
  await setViewport(1280, 704, false);
  await goto(BASE);
  const floor = await evaluate(`(() => {
    const section = document.querySelector('#strip .room[data-room="Honours"]');
    const room = section.getBoundingClientRect();
    const tiles = [...section.querySelectorAll('.tile')];
    const tops = [...new Set(tiles.map(t => Math.round(t.getBoundingClientRect().top)))];
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const rects = tiles.map(t => t.getBoundingClientRect());
    return { rows: tops.length,
             minH: rects.length ? Math.min(...rects.map(r => Math.round(r.height))) : 0,
             past: rects.filter(r => r.bottom > dock.top || r.top < 24).length,
             outOfRoom: rects.filter(r => r.right > room.right + 1 || r.left < room.left - 1).length };
  })()`);
  check('the tiles still fit two rows at 1280x704', floor.rows <= 2, JSON.stringify(floor));
  check('every tile still clears the tap target at 1280x704', floor.minH >= 44, JSON.stringify(floor));
  check('no tile crosses the fold or the room edge at 1280x704',
        floor.past === 0 && floor.outOfRoom === 0, JSON.stringify(floor));
  await setViewport(1440, 900, false);
});

/* -- The deepest hang still fits the band ------------------------------ */
await section('The deepest hang stays inside the room', async () => {
  /* A column divides the room's band between its own frames, so the deepest
     column of any arrangement is the case the band is really spent on. Only a
     layout engine can measure it, which is why it is checked here and not in
     tests/. */
  for (const [w, h] of [[1440, 900], [1280, 704]]) {
    await setViewport(w, h, false);
    await goto(BASE);
    /* ── The loading floor, measured BEFORE anything is forced to load ──────
       Every frame carries `loading="lazy"`, and every other frame check in this
       file forces the photographs to load first — so none of them ever sees the
       floor. What a visitor sees for the half-second before the bytes arrive is
       an unloaded frame, and its width is the floor alone: the frame, its mat
       and its gilt edge with no photograph inside. A floor under 44 is a tap
       target that is not there yet, and it is what `.piece { min-width: 44px }`
       exists to prevent. */
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
        if (p.classList.contains('piece--pending')) return;
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

    /* A frame never exceeds its own stand. This replaces a width budget read
       off the COLUMN's resolved max-width — a budget the stylesheet records as
       deliberately removed: "What is NOT here any more is a width budget... a
       stand is --stand-w wide whatever its hang now, so a frame no longer has a
       column to fit inside." The check still asked for it, got `none`, and
       failed all 32 frames at both viewports against a rule that is gone.

       The invariant that replaced it is the stand's own box. `.group` carries
       `overflow: hidden`, so a frame wider than its stand is not a stray frame
       — it is a CLIPPED one, a photograph the visitor cannot see. That is
       exactly what the client rects measure, and it needs no token at all.

       The height half goes with the width half: a frame's height IS its
       column's share of the band, by construction, so it cannot exceed it. */
    const budgeted = await evaluate(`(() => {
      const out = [];
      const name = (p) => p.closest('.room').getAttribute('data-room') + ':' + p.dataset.piece;
      document.querySelectorAll('#strip .group .piece').forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.height === 0) return;
        const stand = p.closest('.group').getBoundingClientRect();
        if (r.right > stand.right + 1) {
          out.push(name(p) + ' runs ' + Math.round(r.right - stand.right) + 'px past its stand');
        }
        if (r.left < stand.left - 1) {
          out.push(name(p) + ' starts ' + Math.round(stand.left - r.left) + 'px before its stand');
        }
      });
      return out;
    })()`);
    check('no frame is clipped by its own stand at ' + w + 'x' + h,
          budgeted.length === 0,
          budgeted.length + ' outside the stand: ' + budgeted.slice(0, 6).join(' | '));

    /* ── The stand's own shape, which is what this work changes ─────────────
       A stand is two cells: the hang and the label beside it. Three properties
       follow, and none of them is visible to tests/, which models no CSS.

       1. The cells do not overlap. They cannot while `.group` is a flex column
          that stacks them, so this one is the guard against the regression this
          work could introduce rather than a fault it fixes.
       2. No room title is drawn above the viewport. Today it is: the stand is
          centred on a line that does not exist, so a stand taller than its band
          pushes the title off the top — measured at -83 at the floor.
       3. The label's content fits the cell it was given. This is the fault that
          clipping individual catalogue entries cannot see: a block can leave the
          box without any one entry crossing the boundary the older check reads. */
    const cells = await evaluate(`(() => {
      const out = { overlap: [], titleAbove: [], labelOver: [], labelScrolls: [] };
      document.querySelectorAll('#strip .group').forEach(g => {
        const wall = g.querySelector('.cluster'), label = g.querySelector('.label');
        if (!wall || !label) return;
        const id = g.closest('.room').getAttribute('data-room') + ':' + g.dataset.entry;
        const a = wall.getBoundingClientRect(), b = label.getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if (w > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) {
          out.overlap.push(id + ' by ' + Math.round(w));
        }
        /* Content taller than its cell is only a FAULT when the cell cannot show
           it. At the spec's 1280x704 floor the label column scrolls by design
           (see the note on the max-height media query in css/styles.css) and a
           scrollable box is reachable, which is the property that matters: the
           fault this check exists for is copy that is CLIPPED, not copy behind a
           scrollbar. overflow: hidden is the test, and the scroll case is
           reported separately so it is visible rather than merely tolerated. */
        const over = label.scrollHeight > label.clientHeight + 1;
        if (!over) return;
        const oy = getComputedStyle(label).overflowY;
        if (oy === 'hidden' || oy === 'clip') {
          out.labelOver.push(id + ' ' + label.scrollHeight + ' in ' + label.clientHeight + ' (' + oy + ')');
        } else {
          out.labelScrolls.push(id + ' ' + label.scrollHeight + ' in ' + label.clientHeight + ' (' + oy + ')');
        }
        const t = g.closest('.room').querySelector('.room-title');
        if (t && t.getBoundingClientRect().top < 0) out.titleAbove.push(id);
      });
      return out;
    })()`);
    check('the wall cell and the label cell do not overlap at ' + w + 'x' + h,
          cells.overlap.length === 0, cells.overlap.join('; '));
    check('no stand\'s room title is drawn above the viewport at ' + w + 'x' + h,
          cells.titleAbove.length === 0, cells.titleAbove.join('; '));
    check('the label\'s own content fits its cell at ' + w + 'x' + h,
          cells.labelOver.length === 0, cells.labelOver.join('; '));
    /* Reported, not failed: at the floor the label's own column scrolls, and a
       label a visitor can scroll to the end of is not a label that hid a
       paragraph. The number is here so that a change which makes MORE labels
       scroll is visible in the output rather than silent. */
    if (cells.labelScrolls.length) {
      console.log('  info  ' + cells.labelScrolls.length + ' label(s) scroll at ' + w + 'x' + h +
        ' (reachable, not clipped): ' + cells.labelScrolls.slice(0, 3).join('; '));
    }

    /* ── A scrollable label has to be reachable by keyboard ─────────────────
       The label column scrolls when its content does not fit, and the hall's own
       axis is horizontal, so a keyboard-only visitor has no other way into the
       overflow. Measured before this assertion existed: the Applications label
       held 775px in a 502px box with `descendantsFocusable: 0` — the record
       there has no award control to focus — so its last paragraphs were
       unreachable without a mouse. Focusable itself OR holding something that
       is; the assertion is about the visitor being able to get in, not about
       which element they land on. */
    const kbd = await evaluate(`(() => {
      const out = [];
      document.querySelectorAll('#strip .label').forEach(l => {
        if (l.scrollHeight <= l.clientHeight + 1) return;
        const id = l.closest('.room').getAttribute('data-room') + ':' + l.closest('.group').dataset.entry;
        const inOrder = l.tabIndex >= 0 ||
          l.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]').length > 0;
        if (!inOrder) out.push(id + ' (' + l.scrollHeight + ' in ' + l.clientHeight + ')');
      });
      return out;
    })()`);
    check('every scrolling label is reachable by keyboard at ' + w + 'x' + h,
          kbd.length === 0, kbd.join('; '));

    /* The letters belong to the label now, and a visitor reads them in the plan,
       which draws the hang box by box. That a frame carries none is a DOM
       contract, but a stray wrapper would be an inline-block with a height, so
       the wall is checked here too. */
    const walled = await evaluate(
      `document.querySelectorAll('#strip .piece-key, #strip .piece-wrap').length`);
    check('no letter hangs on a frame at ' + w + 'x' + h,
          walled === 0, walled + ' letter badges still on the wall');

    /* Two things about the plan's letters are geometry, and no unit test can see
       either — the plan's markup is right whether the letters are centred or
       not, and it is right whether the lead's box ends up larger or not.
       The size is a cascade question: `.plan .pi` and `.plan .pi-lead` are two
       classes deep each, so on the lead's own box — `<i class="pi pi-lead">`,
       which matches both — the LATER rule wins. Written the other way round the
       lead's size was silently overridden and every box came out the same size,
       which is exactly the silent override a measurement catches. */
    const plan = await evaluate(`(() => {
      const out = [];
      document.querySelectorAll('#strip .plan').forEach(plan => {
        const room = plan.closest('.room').getAttribute('data-room');
        const boxes = [...plan.querySelectorAll('i')];
        const lead = plan.querySelector('.pi-lead');
        boxes.forEach(box => {
          const b = box.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(box);
          const g = range.getBoundingClientRect();
          /* A single line is centred in its line box and the line box is centred
             in the box — but the RANGE rect is the FONT's inline box, which is
             taller than a line-height:1 line box and whose extra height is not
             split evenly (Courier Prime's ascent and descent are not equal). A
             perfectly centred letter can therefore measure up to half that
             difference off, so the slack is the font's own half-leading and not a
             fudge: anything beyond it is a real shift — a left-aligned box, or
             padding on one side. */
          const cs = getComputedStyle(box);
          const slack = Math.max(1, (g.height - parseFloat(cs.lineHeight)) / 2 + 1);
          const left = g.left - b.left, right = b.right - g.right;
          const top = g.top - b.top, bottom = b.bottom - g.bottom;
          if (Math.abs(left - right) > slack || Math.abs(top - bottom) > slack) {
            out.push(room + ': the letter ' + box.textContent + ' sits off centre in its box' +
              ' (l/r ' + left.toFixed(1) + '/' + right.toFixed(1) +
              ', t/b ' + top.toFixed(1) + '/' + bottom.toFixed(1) + ')');
          }
        });
        if (lead) {
          const l = lead.getBoundingClientRect();
          const over = boxes.filter(b => b !== lead).some(b => {
            const r = b.getBoundingClientRect();
            return r.width >= l.width || r.height >= l.height;
          });
          if (over) {
            out.push(room + ': the lead box is ' + Math.round(l.width) + 'x' + Math.round(l.height) +
              ', no larger than the boxes beside it');
          }
        }
      });
      return out;
    })()`);
    check('the plan centres every letter in its box, and the lead box is the larger at ' + w + 'x' + h,
          plan.length === 0, plan.slice(0, 6).join(' | '));

    /* A stand wider than the screen is one a visitor cannot take in at a
       glance, and it is the fault this budget exists to prevent: measured at
       1651px on a 1536px screen before it. */
    const tooWide = await evaluate(`(() => {
      const out = [];
      document.querySelectorAll('#strip .group').forEach(g => {
        const r = g.getBoundingClientRect();
        if (r.width > innerWidth) out.push(g.dataset.entry + ' ' + Math.round(r.width));
      });
      return out;
    })()`);
    check('no stand is wider than the screen at ' + w + 'x' + h,
          tooWide.length === 0,
          tooWide.length + ' too wide: ' + tooWide.slice(0, 6).join(' | '));

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

/* -- One stand per screen ------------------------------------------------
   The property the wall is hung for: when the walk parks on a stand, no other
   stand is in shot. lenis-snap aligns a stand's CENTRE with the viewport's
   (see initWalk), so "what is beside it" is measured from the stand's centre
   — not from its left edge, which is what a naive check would measure and
   would pass on a stand that is mostly off screen. */
await section('One stand per screen', async () => {
  for (const [w, h] of [[1440, 900], [1536, 864], [1280, 704]]) {
    await setViewport(w, h, false);
    await goto(BASE);
    await evaluate(`(async () => {
      const imgs = [...document.querySelectorAll('#strip img')];
      imgs.forEach(i => { i.loading = 'eager'; });
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline && imgs.some(i => !i.complete)) {
        await new Promise(r => setTimeout(r, 200));
      }
      await new Promise(r => setTimeout(r, 600));
    })()`);
    const shot = await evaluate(`(() => {
      const out = [];
      document.querySelectorAll('#strip .room').forEach(room => {
        const gs = [...room.querySelectorAll('.group')];
        if (!gs.length) return;
        const boxes = gs.map(g => g.getBoundingClientRect());
        let worst = null;
        boxes.forEach((b, i) => {
          const centre = b.left + b.width / 2;
          const left = centre - innerWidth / 2, right = centre + innerWidth / 2;
          const intruders = boxes.filter((o, j) => j !== i &&
            Math.max(0, Math.min(o.right, right) - Math.max(o.left, left)) > 0);
          const rec = { entry: gs[i].dataset.entry, standW: Math.round(b.width),
            bare: Math.round((1 - b.width / innerWidth) * 100), intruders: intruders.length };
          if (!worst || rec.intruders > worst.intruders ||
              (rec.intruders === worst.intruders && rec.bare < worst.bare)) worst = rec;
        });
        out.push({ room: room.getAttribute('data-room'), stands: gs.length, worst });
      });
      return out;
    })()`);
    const intruding = shot.filter(r => r.worst.intruders > 0);
    check('no other stand is in shot when the walk parks, at ' + w + 'x' + h,
          intruding.length === 0,
          intruding.map(r => r.room + ' ' + r.worst.entry + ' +' + r.worst.intruders).join(' | '));
    /* Isolation is bought by the GAP, not by the stand being narrow. A stand is
       parked with its centre on the screen's centre, so a stand wider than the
       screen runs off BOTH edges and leaves margin - overhang of bare wall on
       its right; the next stand begins one gap after it. One stand per screen
       is therefore true exactly when the gap covers that margin — and that is
       what this measures. A stand of six frames in three columns is a genuinely
       wide composition: it may run past the screen, but never into its
       neighbour's. */
    const cover = await evaluate(`(() => {
      let minGap = Infinity, worstNeed = 0, at = null;
      document.querySelectorAll('#strip .room').forEach(room => {
        const gs = [...room.querySelectorAll('.group')];
        const boxes = gs.map(g => g.getBoundingClientRect());
        boxes.forEach((b, i) => {
          /* Bare wall visible on the right of a parked stand. */
          const need = innerWidth / 2 - (b.width / 2 - 0);
          if (need > worstNeed) { worstNeed = need; at = gs[i].dataset.entry; }
        });
        for (let i = 1; i < boxes.length; i++) {
          minGap = Math.min(minGap, boxes[i].left - boxes[i - 1].right);
        }
      });
      return { minGap: minGap === Infinity ? null : Math.round(minGap),
               need: Math.round(worstNeed), at };
    })()`);
    check('the gap between stands covers the wall beside a parked stand, at ' + w + 'x' + h,
          cover.minGap !== null && cover.minGap >= cover.need,
          'gap ' + cover.minGap + 'px against the ' + cover.need + 'px of wall beside ' + cover.at);
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
  /* Deliberately left OPEN: the modal semantics section below asserts against
     the dialog this opens. Anything scheduled between the two must not close
     it. */
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

/* -- 6. A project's awards are reachable from the walk ---------------- */
await section('A project\'s awards are reachable', async () => {
  /* Eight honours were moved off the walls and into these dialogs, so this is
     the only route to them. The walk hangs groups rather than cards, and the
     old Awards pill was rendered by a builder whose host element no longer
     exists — measured on the live page as zero controls with data-tab="awards",
     which is content silently missing from a page that still rendered.

     The control that replaced the pill is `renderAwards`'s `.award-open`
     button, carrying `data-gallery="honors"` and `data-entry` — NOT
     `data-tab="awards"`, which is the attribute this section went on asking
     for. It therefore failed against a control that was present and working,
     which is the most expensive kind of stale test: it reads as a content
     defect. The attribute it names is kept in the comment above so the next
     person recognises the failure message.

     A project's award control is keyed to an HONOURS record, not to the
     project: `awardGalleryRef` resolves the honour whose `from` names the
     project and whose year matches, and the button's `data-entry` is that
     record's index. So the assertion counts controls per project through the
     honours array rather than through `dataset.project`.

     Scheduled AFTER the modal semantics section, which asserts against the
     dialog the gallery-row section deliberately leaves open; this section opens
     and closes its own. */
  const want = await evaluate(`globalThis.PORTFOLIO.projects
    .filter(p => Array.isArray(p.awards) && p.awards.length).length`);
  const got = await evaluate(`[...document.querySelectorAll('#strip .awards .award-open')]
    .map(el => { const i = Number(String(el.dataset.entry).split(':')[1]);
      const h = globalThis.PORTFOLIO.honors[i];
      return h && h.from ? h.from : 'unresolved'; })`);
  check('every project with awards has a control in the walk',
        want > 0 && got.length > 0 && got.every(id => id !== 'unresolved'),
        'want ' + want + ' project(s) with awards, got controls for ' + got.join(','));
  const named = await evaluate(`[...document.querySelectorAll('#strip .awards .award-open')]
    .every(el => (el.getAttribute('aria-label') || el.innerText || '').trim().length > 0)`);
  check('every awards control has an accessible name', named);

  /* Press one and read the dialog back against the data it claims to show.
     `focus()` first, because that is what a real press does and the dialog
     restores focus to whatever was focused when it opened: a programmatic
     click on an unfocused element would leave the focus contract untestable. */
  const first = await evaluate(`(() => {
    const el = document.querySelector('#strip .awards .award-open');
    el.focus();
    el.click();
    const i = Number(String(el.dataset.entry).split(':')[1]);
    const h = globalThis.PORTFOLIO.honors[i];
    return { id: h ? h.from : '' };
  })()`);
  await sleep(500);
  check('pressing an awards control opens the dialog', await modalOpen(), 'modal did not open');
  /* What opens is the honours PHOTO GALLERY for that award, not an awards
     list: the control carries `data-gallery="honors"` and the walk's delegation
     routes it to `openGallery`, which titles the dialog with the honour's own
     description and subtitles it `Honors · <year>`. The assertions this
     replaces asked for a modal titled "<project> — Awards" listing
     `#modalBody .record-item` rows — a dialog the awards section no longer
     renders, so they failed on a control that works. */
  const shown = await evaluate(`({
    title: (document.getElementById('modalTitle') || {}).textContent || '',
    subtitle: (document.querySelector('#modalHeader .modal-subtitle') || {}).textContent || '',
    slides: document.querySelectorAll('#galleryTrack img').length,
  })`);
  const project = await evaluate(`(() => {
    const p = globalThis.PORTFOLIO.projects.find(x => x.id === ${JSON.stringify(first.id)});
    return { title: p.title, awards: p.awards.map(a => a.description) };
  })()`);
  check('the dialog names the award the control belongs to',
        project.awards.some(d => shown.title.indexOf(d.slice(0, 24)) === 0) && /Honors/.test(shown.subtitle),
        shown.title + ' / ' + shown.subtitle);
  check('the dialog shows the award\'s own photographs',
        shown.slides >= 1, shown.slides + ' slides');
  /* And it is THIS project's award, not a neighbour's: the honour the control
     points at must declare this project as its `from`. */
  const owns = await evaluate(`(() => {
    const el = document.querySelector('#strip .awards .award-open');
    const i = Number(String(el.dataset.entry).split(':')[1]);
    const h = globalThis.PORTFOLIO.honors[i];
    const p = globalThis.PORTFOLIO.projects.find(x => x.id === ${JSON.stringify(first.id)});
    return !!h && h.from === p.id &&
      (p.awards || []).some(a => String(a.description).toLowerCase()
        .includes(String(h.description).split(/[\\u2013\\u2014(]/)[0].trim().toLowerCase()));
  })()`);
  check('the award it opens is the project\'s own, by description', owns);
  /* Each of the eight moved honours must be readable here, on its own card. */
  const moved = await evaluate(`globalThis.Site.honoursTiles(globalThis.PORTFOLIO.honors)
    .projectAwards.map(e => ({ from: e.record.from, description: e.record.description }))`);
  const missing = [];
  for (const award of moved) {
    const listed = await evaluate(`(() => {
      const p = globalThis.PORTFOLIO.projects.find(x => x.id === ${JSON.stringify(award.from)});
      return (p.awards || []).some(a => a.description.toLowerCase()
        .includes(${JSON.stringify(award.description)}.split(/[\\u2013\\u2014(]/)[0].trim().toLowerCase()));
    })()`);
    if (!listed) missing.push(award.description + ' (' + award.from + ')');
  }
  check('every honour that left the wall is on its project\'s card',
        missing.length === 0, missing.join(' | '));
  await evaluate(`document.getElementById('modalClose').click()`);
  await sleep(350);
});

/* -- 7. Gallery photos resolve and render ----------------------------- */
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
     tracks js/data.js instead of duplicating its contents.
     Honours is listed as its TILES, not as every record: an honour that is a
     project's award has no tile to press — its photographs hang in the project's
     dialog — so asking the walk for that row would report a missing control
     where the design intends none. */
  const wired = await evaluate(`(() => {
    const out = [];
    const collect = (kind, list) => list.forEach((entry, index) => {
      (entry.images || []).forEach((src) => out.push({ kind, index, src }));
    });
    collect('news', PORTFOLIO.news);
    collect('leadership', PORTFOLIO.leadership);
    globalThis.Site.honoursTiles(PORTFOLIO.honors).tiles.forEach(({ record, index }) => {
      (record.images || []).forEach((src) => out.push({ kind: 'honors', index, src }));
    });
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
    /* The walk's position cue is the dock's own track, not the .rail element
       this read: that element was removed from the shell and the dock's track
       replaced it. See the same fix in the layout section. */
    const t = document.querySelector('.dock-track');
    const pct = parseFloat(getComputedStyle(t).getPropertyValue('--walk-progress')) || 0;
    const cur = document.querySelector('.dock-link[aria-current="true"]');
    const max = hall.scrollWidth - hall.clientWidth;
    return {
      pct, vw: innerWidth, progress: max > 0 ? hall.scrollLeft / max : 1,
      announced: (document.getElementById('announcer') || {}).textContent || '',
      current: cur ? cur.getAttribute('data-goto') : null,
      room: last.getAttribute('data-room')
    };
  })()`);
  check('the position cue still tracks the walk under prefers-reduced-motion',
        Math.abs(across.pct / 100 - across.progress) < 0.02, JSON.stringify(across));
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
  /* This asked for `.rail`, which no longer exists: the rail that drew the
     walk's position as a 2px hairline along the bottom edge was removed from
     the shell, and `css/styles.css` records it as replaced by the dock's own
     track. Because the probe returned null on a missing `.rail`, the whole
     section silently stopped running — four checks and a FAIL that read
     "missing from the page" and was nothing of the kind.
     The chrome that exists is: `.room-rail` at the head, `.dock` at the foot,
     and `#dockProgress` as the dock's own track. */
  const geo = await evaluate(`(() => {
    const d = document.querySelector('.dock');
    const rail = document.querySelector('.room-rail');
    const track = document.getElementById('dockProgress');
    if (!d || !rail || !track) return null;
    const dr = d.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    const tr = track.getBoundingClientRect();
    const current = d.querySelectorAll('.dock-link[aria-current="true"]').length;
    const links = d.querySelectorAll('.dock-link').length;
    const rooms = document.querySelectorAll('#strip [data-room]').length;
    return { top: dr.top, bottom: dr.bottom, height: dr.height, left: dr.left, right: dr.right,
             railTop: rr.top, railH: rr.height,
             trackH: tr.height, trackBottom: tr.bottom, trackLeft: tr.left, trackRight: tr.right,
             links, current, rooms };
  })()`);
  check('the dock, the rail and the dock track are all in the shell', geo !== null, 'missing from the page');
  if (!geo) return;
  check('the dock sits at the foot of the walk', geo.top > 780 && geo.bottom <= 900,
        JSON.stringify(geo));
  check('the room rail is pinned to the top edge and clears its own type',
        geo.railTop === 0 && geo.railH >= 24, JSON.stringify(geo));
  /* The track is the dock's own progress bar, so it reads as part of the dock:
     inside the dock's box and no taller than a hairline. */
  check('the dock track is inside the dock and is a hairline',
        geo.trackH > 0 && geo.trackH <= 4 &&
        geo.trackLeft >= geo.left - 1 && geo.trackRight <= geo.right + 1 &&
        geo.trackBottom <= geo.bottom + 1, JSON.stringify(geo));
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

  /* And back, so this section leaves the walk where it found it.
     `waitSettled` FIRST, and it is the whole fix for a flake that made this
     section's two checks and the mobile section's three fail on roughly one run
     in two — measured on the same tree: one run 137 passed / 0 failed, the next
     135 / 2 with `the arrow keys move the walk back -> 40 -> 40`. The walk had
     moved once and then held, because Lenis's snap was still animating from the
     ArrowRight above and swallowed the ArrowLeft. Moving out and back are two
     presses, so they are two journeys, and each needs the walk to have arrived
     before the next key is sent. The note above this block already records the
     same fault for the FIRST press; it applies to every press after it too. */
  await waitSettled(3000);
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
