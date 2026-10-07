/* Renderer contract, checked without a browser.
   js/main.js is an IIFE that renders on load, so a minimal DOM stub is enough
   to run it and read back what it wrote. This asserts the DOM contract later
   tasks and tools/ux-check.mjs consume: the elements, their counts, and that no
   work is hung without an image — the check that catches an empty frame. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, run } from './harness.mjs';

/* ── A DOM just real enough to load the script ───────────────────────── */
const listeners = new Map();
const store = new Map();

function makeEl(id) {
  /* style keeps what it is given rather than swallowing it: the dock's
     progress is written as a custom property and nothing else can read a
     value back out of the stub. */
  const styleValues = new Map();
  return {
    id,
    innerHTML: '',
    textContent: '',
    dataset: {},
    style: {
      setProperty(name, value) { styleValues.set(name, String(value)); },
      removeProperty(name) { styleValues.delete(name); },
      get(name) { return styleValues.get(name); },
    },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    attributes: {},
    /* Listeners are kept, not swallowed, so a check can prove the scroll
       handler that drives the rail and the bar was actually bound to #hall —
       as opposed to the two functions working while nothing ever calls them. */
    listeners: new Map(),
    offsetLeft: 0, offsetWidth: 1, offsetHeight: 1, offsetParent: null, tabIndex: -1,
    children: [],
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    },
    removeEventListener() {}, appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, focus() {}, blur() {}, click() {}, closest: () => null,
    querySelector: () => null, querySelectorAll: () => [],
  };
}

const els = new Map();
const el = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
/* Current markup: the renderer's output targets, plus the walk's two anchors
   and the two pieces of chrome initLights() drives. #hall must exist or
   initWalk returns null by design; #roomRail and #dockProgress must exist or
   writeRail() and updateProgress() both early-return and the rail and the bar
   are silently dead in every check below. */
for (const id of ['strip', 'directory', 'roomRail', 'dockProgress', 'hall']) el(id);

/* The walk's geometry, seeded rather than left as the 0s and 1s makeEl defaults
   to. Unseeded, roomAtOffset() coerces them and the first check passes for a
   reason nobody chose; the brief's own inline version of it yields NaN. */
const hall = el('hall');
hall.scrollLeft = 0;
hall.scrollWidth = 5040;
hall.clientWidth = 1440;

/* ── The rooms the walk is standing in ────────────────────────────────────
   initLights() finds the current room through #strip's own querySelectorAll,
   so rooms have to be in that list or roomAt() returns null, announceRoom()
   never fires, and writeRail() is never reached. Two rooms, because the rail's
   rule is "write on room CHANGE only" and one room cannot cross a boundary.
   Each carries the title and the subtitle the real renderRooms() emits, and
   the geometry a room has: a viewport wide, starting at the walk's origin. */
function makeRoom(key, title, subRuns, offsetLeft) {
  const room = makeEl('section');
  room.setAttribute('data-room', key);
  /* Rooms tile the walk, so this is what puts one at 0..1440 and the next at
     1440..2880. pageX() reads it through the offsetParent chain, as a browser
     resolves it, and the boundary between the two is what the rail's change
     rule is exercised across. */
  room.offsetLeft = offsetLeft;
  room.offsetWidth = 1440;
  const titleEl = makeEl('span');
  titleEl.className = 't';
  titleEl.textContent = title;
  const subEl = makeEl('span');
  subEl.className = 'sub';
  /* Why the subtitle is built from runs rather than one string: Robotics,
     Applications, Leadership and Honours all nest a `<span class="count">`
     inside `.sub`, separated from the words only by a CSS margin-left. Model
     that faithfully here or the gap the rail must bridge is invisible. */
  subEl.childNodes = subRuns.map((run) => {
    const node = makeEl('span');
    node.textContent = run;
    return node;
  });
  subEl.textContent = subRuns.join('');
  /* One handler, as in the browser: the selector decides which span comes back. */
  room.querySelector = (sel) => {
    if (sel === '.room-title .t') return titleEl;
    if (sel === '.room-title .sub') return subEl;
    return null;
  };
  return { room, titleEl, subEl };
}

const ABOUT = makeRoom('About', 'About the practice',
  ['  Design   and\n fabrication ', 'of eleven years'], 0);
const ROBOTICS = makeRoom('Robotics', 'Works in Robotics', ['3 projects', 'ROBOTICS'], 1440);
const railTitleEl = ABOUT.titleEl;
el('strip').querySelectorAll = (sel) =>
  (sel === '[data-room]' ? [ABOUT.room, ROBOTICS.room] : []);

/* The rail's two lines, as the shell has them, and one handler that returns the
   span matching its selector — the same arrangement roomEl.querySelector has in
   tests/dom-harness.mjs.

   `.rr-title` counts the writes that land on it. The rail is written on room
   CHANGE only — the rule that keeps this off the per-frame path — and a count
   is the only way to observe that a repeat of the same room did not rewrite it. */
let railTitleWrites = 0;
const railNodes = {
  '.rr-title': makeEl('span'),
  '.rr-meta': makeEl('span'),
};
railNodes['.rr-title'].className = 'rr-title';
railNodes['.rr-meta'].className = 'rr-meta';
const railNode = railNodes['.rr-title'];
railNodes['.rr-title'] = new Proxy(railNode, {
  set(target, prop, value) {
    if (prop === 'textContent') railTitleWrites++;
    target[prop] = value;
    return true;
  },
});
const railEl = el('roomRail');
railEl.children.push(railNode, railNodes['.rr-meta']);
railEl.querySelector = (sel) => railNodes[sel] ?? null;

globalThis.document = {
  readyState: 'complete',
  activeElement: null,
  documentElement: makeEl('html'),
  body: makeEl('body'),
  getElementById: (id) => els.get(id) ?? null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => makeEl(tag),
  addEventListener(type, fn) { listeners.set(type, fn); },
  removeEventListener() {},
};

/* Flippable, because the reduced-motion branch of initLights() is the branch
   the plan's Review Focus names as most likely to bite — a prior build's early
   return left the rail empty and the dock unfollowed — and a fixed `false`
   means no check here can ever reach it. main.js is module-cached, so the
   branch is exercised by flipping this and re-running Site.initLights(), the
   pattern tests/lights.test.mjs already uses for the same reason. */
const motion = { reduced: false };

globalThis.window = {
  innerWidth: 1440, innerHeight: 900, scrollY: 0, isSecureContext: false,
  /* Listeners accumulate per event rather than overwriting each other: more
     than one controller binds resize — initLights()'s tracking flush and
     renderHero()'s onResize (js/main.js) — and keeping only the last one made
     the tracking flush unreachable, which could have made a check pass or fail
     for the wrong reason. */
  addEventListener(type, fn) {
    const key = 'window:' + type;
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(fn);
  },
  removeEventListener() {}, matchMedia: () => ({ matches: motion.reduced }),
  /* A frame that actually runs its callback, because one of the two branches
     initLights() can take defers its whole update through here. With a no-op
     rAF the focused branch is unreachable from a check — nothing it binds ever
     does anything — so a check could only ever exercise whichever branch the
     stub's own [data-piece] list happened to select, and would break the moment
     that list grew. Runs inline: the walk is one-dimensional here and the
     callback runs once, so there is no backlog to sequence. */
  requestAnimationFrame: (fn) => { if (typeof fn === 'function') fn(0); return 0; },
  cancelAnimationFrame() {},
  getComputedStyle: () => ({ getPropertyValue: () => '0' }),
  scrollTo() {}, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
};
globalThis.getComputedStyle = globalThis.window.getComputedStyle;
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;
globalThis.cancelAnimationFrame = globalThis.window.cancelAnimationFrame;
/* navigator already exists on Node 22+ and is getter-only; its clipboard is
   absent, which is the path copyToClipboard already falls back from. */

/* Lenis and Snap are stubbed so the walk module runs without the vendored
   bundles; this file tests the renderer, not the scroll engine. */
globalThis.Lenis = function Lenis() {
  return { scrollTo() {}, resize() {}, stop() {}, start() {}, raf() {} };
};
globalThis.Snap = function Snap() {
  return { addElement() {}, resize() {}, stop() {}, start() {} };
};

/* data.js first, exactly as index.html loads it before main.js. */
await import('../js/data.js');
await import('../js/main.js');

const PORTFOLIO = globalThis.PORTFOLIO;
const Site = globalThis.Site;
const currentRoomMarkup = Site.currentRoomMarkup;
const renderLabelFor = Site.renderLabel;
const strip = el('strip').innerHTML;
const directory = el('directory').innerHTML;
const titles = [...strip.matchAll(/<span class="t">([^<]+)<\/span>/g)].map((m) => m[1]);

/* The body of the top-level group whose text carries `title`. Splitting on the
   group opening tag leaves the previous tag's attributes at the head of each
   part, so drop up to the first '>' in every part but the first.
   The title is escaped before it is looked for: it is matched against RENDERED
   markup, and one leadership description carries an `&`. */
function groupHtmlFor(title) {
  const want = '>' + escHtml(title) + '<';
  const parts = strip.split('<div class="group"').slice(1);
  for (let i = 0; i < parts.length; i++) {
    let body = parts[i];
    if (i > 0) body = body.slice(body.indexOf('>') + 1);
    const end = body.indexOf('<div class="group"');
    if (end !== -1) body = body.slice(0, end);
    if (body.includes(want)) return body;
  }
  return '';
}

/* The project's awards block. A check scoped to the whole GROUP can be satisfied
   by a neighbour's copy or by the project's own prose; the block is what has to
   carry the awards. It is bounded by the two landmarks that surround it — its
   own opening tag, and the catalogue that follows it — rather than by counting
   `<div>` tags, which is what the obvious depth walk gets wrong: `<div` also
   occurs inside emitted text. */
function awardsBlockFor(title) {
  const group = groupHtmlFor(title);
  const at = group.indexOf('<div class="awards">');
  if (at === -1) return '';
  const after = group.slice(at);
  const cat = after.indexOf('<div class="cat">');
  return cat === -1 ? after : after.slice(0, cat);
}

/* The reverse of `esc()` in js/main.js, so a rendered paragraph can be compared
   to the data it came from in full. Comparing the raw data against the rendered
   text without this would fail on any record carrying an ampersand, and
   comparing only a prefix is what let 90% of the copy go missing with every
   check green. */
function unesc(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/* The forward direction, for looking a record up by a string that is rendered:
   groupHtmlFor() matches rendered markup, so a title carrying `&` has to be
   escaped before it can be found. One leadership description carries one. */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* The account's paragraphs as rendered in the group whose title is `title`,
   unescaped so they can be compared to the data in full. */
function accountParagraphsFor(title) {
  const group = groupHtmlFor(title);
  return [...group.matchAll(/<p class="acct-p">([\s\S]*?)<\/p>/g)].map((m) => unesc(m[1]));
}

/* ── The DOM contract ────────────────────────────────────────────────── */
/* The honours ROOM holds only the honours that stand alone. The ones that ARE a
   project's award live on that project's card, and the room must not hang them
   as well — that duplication is the whole reason this contract exists. */
const honoursSplit = () => Site.honoursTiles(PORTFOLIO.honors);
const HONOURS_TILES = honoursSplit().tiles;

check('the walk carries six rooms in order, and honours is one of them', () => {
  /* A gallery is as wide as its contents now, so there is no four-exhibit
     ceiling to force thirteen honours into four galleries all called Honours.
     It also restores the room list the original spec pinned. */
  const roomKeys = [...strip.matchAll(/data-room="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(roomKeys, ['About', 'Robotics', 'Applications', 'Leadership',
    'Honours', 'Contact']);
  assert.equal(new Set(roomKeys).size, roomKeys.length, 'two rooms share a name');
  assert.equal(honoursSplit().tiles.length + honoursSplit().projectAwards.length,
    PORTFOLIO.honors.length, 'the honours split is not total');
});

check('room titles name every room', () => {
  assert.deepEqual(titles, ['About', 'Works in Robotics', 'Works in Applications', 'Leadership',
    'Honours', 'Contact']);
});

/* The honours gallery, bounded at its own closing tag so its markup cannot
   leak into the next room. */
const HONOURS_KEYS = ['Honours'];
const honoursStrip = HONOURS_KEYS
  .map((k) => (strip.split('data-room="' + k + '"')[1] || '').split('</section>')[0])
  .join('');

check('every record hangs as exactly one group', () => {
  /* The unit that hangs is the record, not the photograph. The entry key is
     scoped by room, because project indices restart in every project room.
     An honour that is a project's own award is not hung twice: it hangs nowhere
     as a painting, and lives in its project's awards dialog instead. */
  const groups = [...strip.matchAll(/data-group data-kind="([^"]+)" data-entry="([^"]+)"/g)];
  const projects = groups.filter((m) => m[1] === 'project').length;
  const honours = groups.filter((m) => m[1] === 'honors').length;
  const posts = groups.filter((m) => m[1] === 'leadership').length;
  assert.equal(projects, PORTFOLIO.projects.length, 'projects hang as ' + projects + ' groups');
  assert.equal(honours, 0, 'a moved honour still hangs on the honours wall');
  assert.equal(posts, PORTFOLIO.leadership.length, 'posts hang as ' + posts + ' groups');
  assert.equal(new Set(groups.map((m) => m[2])).size, groups.length,
    'two groups share an entry key');
});

check('the About and Contact rooms are snap targets themselves', () => {
  assert.ok(/data-room="About" data-snap/.test(strip), 'About is not a snap target');
  assert.ok(/data-room="Contact" data-snap/.test(strip), 'Contact is not a snap target');
});

check('work rooms are not snap targets', () => {
  assert.ok(!/data-room="Robotics" data-snap/.test(strip),
    'a work room carries data-snap, which would fight its groups');
});

check('every room that hangs groups holds them in one row', () => {
  /* A room is one viewport tall with no vertical axis, so its groups run
     sideways rather than wrapping: the row is what lets a gallery be as wide
     as its own hang. Honours is not one of them any more — it hangs no groups
     at all, it lists tiles — so it is asserted separately below. */
  for (const room of ['Robotics', 'Applications', 'Leadership']) {
    const section = strip.split('data-room="' + room + '"')[1].split('</section>')[0];
    assert.match(section, /<div class="groups">/, room + ' has no group row');
  }
  assert.match(honoursStrip, /<ul class="tiles">/, 'the honours room has no tile list');
});

check('every group hangs between three and six frames', () => {
  /* The budget is a data-layer rule; this is the same rule read off the wall,
     because a renderer that hung a different number than the data yields is
     how a photograph goes missing without anything looking broken. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const n = (body.match(/class="piece[" ]/g) || []).length;
    if (n < Site.MIN_PIECES || n > Site.MAX_PIECES) bad.push('group ' + i + ': ' + n + ' frames');
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the lead frame takes the lead height', () => {
  /* Every group hangs at least three frames, so every group has a lead. The
     height itself now comes from the stylesheet, not from inline markup: a
     cqi-based height cannot survive a content-driven width, because a group
     sized from its own width is circular. */
  const groups = strip.split('<div class="group"').slice(1);
  assert.ok(groups.length > 0, 'no groups rendered');
  const bad = [];
  groups.forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    /* An awaited lead frame carries the lead class too, so the composition
       keeps its shape whether or not the photograph has arrived. */
    if (!/class="piece[^"]*piece--lead/.test(body)) bad.push('group ' + i + ' has no lead frame');
    if (/--h:/.test(body)) bad.push('group ' + i + ' still sizes its frames inline');
  });
  assert.deepEqual(bad, [], bad.join(' | '));
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

check('the wall hangs exactly the frames its arrangement names', () => {
  /* The partition property, read off the wall rather than off the table: every
     index the arrangement names is hung once, and no other frame is. Scoped to
     frames on purpose — a catalogue entry carries data-piece too, and it is
     text, not a frame. */
  const named = new Map();
  Object.values(Site.HANG_LAYOUTS).flat().forEach((l) => named.set(l.name, l));
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const layout = named.get((body.match(/data-hang="([^"]+)"/) || [])[1]);
    if (!layout) { bad.push('group ' + i + ': names no arrangement'); return; }
    const frames = [...body.matchAll(/class="piece[^"]*"[^>]*data-piece="(\d+)"/g)]
      .map((m) => Number(m[1])).sort((a, b) => a - b);
    const want = layout.columns.flat().slice().sort((a, b) => a - b);
    if (JSON.stringify(frames) !== JSON.stringify(want)) {
      bad.push('group ' + i + ': hung [' + frames + '], arrangement names [' + want + ']');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('no photograph is dropped or duplicated by grouping', () => {
  /* Grouping must be a partition of the photographs, not a filter: the check
     that catches a grouping bug silently hiding an image.
     Scoped to the photographs that exist, and to the records that HANG as
     groups. An honour is a tile now: its photographs are fetched only when the
     tile is pressed, so they are not on this wall by design and the tile suite
     — not this one — is what holds them to account. */
  const isPlaceholder = (s) => /PlaceHolder\.png$/.test(s);
  const rendered = [...strip.matchAll(/<img src="([^"]+)"[^>]*loading="lazy"/g)]
    .map((m) => m[1]).filter((s) => !isPlaceholder(s));
  const expected = [];
  const wanted = (rec, kind) => Site.groupPieces(rec, kind)
    .filter((p) => !p.awaited).forEach((p) => expected.push(p.src));
  PORTFOLIO.leadership.forEach((l) => wanted(l, 'record'));
  PORTFOLIO.projects.forEach((p) => wanted(p, 'project'));
  /* And no honour's photograph is hung: the wall draws text, not pictures. */
  PORTFOLIO.honors.forEach((h) => {
    (h.images || []).forEach((src) => {
      assert.equal(rendered.filter((s) => s === src).length, 0,
        'a tile fetched a photograph onto the wall: ' + src);
    });
  });
  const count = (arr, v) => arr.filter((x) => x === v).length;
  [...new Set(expected)].forEach((src) => {
    assert.equal(count(rendered, src), count(expected, src), 'piece count differs for ' + src);
  });
  assert.ok(expected.length > 0, 'no real photograph was expected at all');
});

check('the first frame of a group is hung as its lead', () => {
  /* A group's lead is the composition's anchor, at the lead height rather than
     a supporting frame's. Every group has one now: the floor is three frames,
     so no group hangs a lone frame with an empty column beside it.
     A group whose photograph is still awaited is not a button — there is
     nothing to open — so its frame is a labelled span at the same height. */
  const groups = strip.split('<div class="group"').slice(1);
  assert.ok(groups.length > 0, 'no groups rendered at all');
  groups.forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    assert.match(body, /data-piece="0"/, 'group ' + i + ' has no first frame');
  });
});

check('a photograph that is still awaited is not a dead control', () => {
  /* A focusable button that does nothing when activated is worse than a frame
     that plainly is not one. Every frame without a photograph behind it — the
     padding that fills a group to the floor, and every frame of a record that
     declares none at all — is a labelled span.
     Scoped to the records that HANG, and to FRAMES. An honour that is a
     project's award hangs nowhere now, so counting every record's awaited
     frames would expect frames the walk deliberately does not draw — and a
     tile's "Photographs awaited" is a line of text on a panel, not a reserved
     place on the wall, so it is counted by the tile suite instead. */
  const pending = [...strip.matchAll(/<span class="piece piece--pending[^"]*"[^>]*>/g)].map((m) => m[0]);
  const tileText = [...honoursStrip.matchAll(/class="tile-awaited"/g)].length;
  assert.ok(tileText > 0, 'no tile says its photographs are awaited');
  const awaited = [...PORTFOLIO.projects.map((p) => [p, 'project']),
    ...PORTFOLIO.leadership.map((l) => [l, 'record'])]
    .reduce((n, [rec, kind]) => n + Site.groupPieces(rec, kind).filter((p) => p.awaited).length, 0);
  assert.equal(pending.length, awaited, pending.length + ' awaited frames, expected ' + awaited);
  pending.forEach((p) => {
    assert.match(p, /role="img"/, 'a pending frame has no role');
    assert.match(p, /aria-label="[^"]*awaited/, 'a pending frame is not named as awaited');
    assert.ok(!/data-gallery|data-action/.test(p), 'a pending frame carries a handler it cannot honour');
  });
  assert.match(strip, /aria-label="[^"]*photograph awaited/,
    'awaited frames are not named as awaited');
});

check('every piece falls back to the placeholder when its image fails', () => {
  const pieces = [...strip.matchAll(/<button type="button" class="piece"[^>]*>[\s\S]*?<\/button>/g)]
    .map((m) => m[0]);
  assert.ok(pieces.length > 0, 'no pieces rendered');
  pieces.forEach((p) => {
    assert.match(p, /onerror="[^"]*files\/PlaceHolder\.png/,
      'a piece has no image fallback: ' + p.slice(0, 80));
  });
});

check('a piece is a real button with a named target', () => {
  const pieces = strip.split('<button type="button" class="piece"').slice(1);
  assert.ok(pieces.length > 0, 'no pieces rendered');
  pieces.forEach((p) => {
    const label = p.match(/aria-label="([^"]*)"/);
    assert.ok(label && label[1].trim().length > 0, 'a piece has no accessible name');
  });
});

/* ── The label ───────────────────────────────────────────────────────────
   One label per group: the record's own account, its awards, its team caption
   and a catalogue entry per photograph. This is where a photograph gets its
   text, so a group shipping without one is a group whose photographs are
   never explained. */
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
  /* EVERY paragraph of EVERY project, compared in full. A prefix compared
     instead lets the rest of the copy be truncated — the reviewer's probe cut
     all 39 rendered paragraphs to 40 characters and the whole suite stayed
     green, which is a check that cannot fail meaningfully. */
  const bad = [];
  let compared = 0;
  PORTFOLIO.projects.forEach((p) => {
    const want = p.overview && p.overview.text;
    assert.ok(want, p.title + ' has no overview in the data — the fixture changed');
    const paras = want.split('\n\n').map((t) => t.trim()).filter(Boolean);
    const rendered = accountParagraphsFor(p.title);
    if (rendered.length !== paras.length) {
      bad.push(p.title + ' rendered ' + rendered.length + ' of ' + paras.length + ' paragraphs');
      return;
    }
    paras.forEach((t, i) => {
      compared++;
      if (rendered[i] !== t) {
        bad.push(p.title + ' paragraph ' + i + ' reads "' + rendered[i].slice(0, 60)
          + '" (' + rendered[i].length + ' chars), the data says "'
          + t.slice(0, 60) + '" (' + t.length + ' chars)');
      }
    });
  });
  assert.ok(compared > 20, 'too few paragraphs were compared to mean anything: ' + compared);
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the opening lead and the account never say the same sentence twice', () => {
  /* CRITICAL: on the fallback path the account IS the summary, and rendering
     the lead as well printed the record's one sentence twice, one line apart —
     which is what every Leadership post and every stand-alone honour did. The
     two blocks are mutually exclusive by SOURCE, not by comparing the strings:
     a text predicate cannot tell a genuine repetition from a record whose two
     fields happen to agree. */
  const bad = [];
  let checked = 0;
  PORTFOLIO.leadership.forEach((r) => {
    const group = groupHtmlFor(r.description);
    assert.ok(group, r.description + ' has no group on the wall');
    const leads = (group.match(/class="narr-lead"/g) || []).length;
    const paras = accountParagraphsFor(r.description);
    if (leads) bad.push(r.description + ': a lead is rendered on the fallback path');
    if (paras.length !== 1 || paras[0] !== r.summary) {
      bad.push(r.description + ': the account reads ' + JSON.stringify(paras)
        + ', the summary is ' + JSON.stringify(r.summary));
    }
    /* And the summary appears exactly once across the label's own text. Split on
       the ESCAPED summary: this is rendered markup, so a summary carrying `&`,
       `<` or `"` arrives escaped, and splitting on the raw string would fail a
       correct renderer. The paragraph comparison above already reads the
       unescaped form, so this is the same comparison made twice. */
    const body = group.split('class="label"')[1] || '';
    const seen = body.split(escHtml(r.summary)).length - 1;
    if (seen !== 1) bad.push(r.description + ': its summary appears ' + seen + ' times on the label');
    checked++;
  });
  assert.ok(checked > 0, 'no leadership record was checked');
  /* The projects are the other half of the contract: on the overview path the
     lead is complementary to the account and BOTH must stay. */
  const withLead = PORTFOLIO.projects.filter((p) => p.summary && p.overview && p.overview.text);
  assert.ok(withLead.length > 0, 'fixture needs a project with both a summary and an overview');
  withLead.forEach((p) => {
    const group = groupHtmlFor(p.title);
    if (!/class="narr-lead"/.test(group)) {
      bad.push(p.title + ' has a summary and an overview and no lead line');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the account is not line-clamped', () => {
  /* Spec §6.3 and §10.3: the four-line clamp is what hid the account, and a
     silent reintroduction would hide it again with every unit check green.

     Scoped by what can REACH the label, not by a list of prose selectors: a
     clamp on `.label-copy` (the account's own ancestor) hides exactly the same
     copy, and a check that only reads rules naming `.acct-p` cannot see it.
     So every rule in the stylesheet is inspected.

     Comments are stripped first: a comment naming the property is prose about
     why it is gone, not the property. The match is case-insensitive because CSS
     property names are ASCII case-insensitive. */
  const css = readFileSync('css/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = css.match(/[^{}]+\{[^}]*\}/g) || [];
  const clamped = blocks.filter((b) => /line-clamp/i.test(b))
    .map((b) => b.split('{')[0].trim());
  /* NO clamps anywhere, and no exemption: the title's own two-line clamp was
     removed once its justification turned out to be false. See the check below. */
  assert.deepEqual(clamped, [], 'line-clamp appears in the stylesheet: ' + clamped.join(' | '));
  assert.ok(blocks.length > 100, 'the stylesheet did not parse: ' + blocks.length + ' rules');
  /* And the account's rules are actually there, so the sweep above cannot pass
     on a stylesheet that has lost them. NAMED, not counted: "at least three"
     was the shape of check that let `.narr-lead`'s rule be deleted with the
     guard still green, because four rules name these classes and three is what
     is left. Each name below is asserted individually, so deleting any one
     fails the check that exists to notice exactly that. */
  const account = blocks.filter((b) => /\.(label-account|acct-p|narr-lead)\b/.test(b.split('{')[0]))
    .map((b) => b.split('{')[0].trim());
  assert.deepEqual(account.slice().sort(),
    ['.acct-p', '.acct-p:last-child', '.label-account', '.narr-lead'],
    'the account rules are not the four this label is built from: ' + account.join(' | '));
  assert.ok(!/\.narr-text/.test(css), '.narr-text still exists — the clamp was to live there');
});

check('no rule in the stylesheet clamps, and the renderer emits no clamp', () => {
  /* The constraint is "no line-clamp anywhere in the label", and after the
     title's clamp came out there is no exemption left to bound — so this is the
     absolute version of the check it replaces, rather than a count and a limit.

     The title's clamp was justified by "the same name is on the room heading
     and in the rail". That is false: the room headings carry the DERIVED room
     titles and the rail copies the room heading, while `.narr-title` carries the
     RECORD's own name, which has no second home. A clamp there hides the only
     place that name is written, so it goes.

     The renderer half covers inline styles, which are invisible to the
     stylesheet sweep. Comments are stripped and only the PROPERTY is matched, so
     a comment naming the retired clamp cannot fail a check about code. */
  const css = readFileSync('css/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/line-clamp\s*:/i.test(css), 'the stylesheet clamps something');
  const renderer = readFileSync('js/main.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/line-clamp\s*:/i.test(renderer),
    'js/main.js emits a line-clamp: ' + (renderer.match(/.{0,40}line-clamp\s*:.{0,20}/i) || [''])[0]);
});

check('every project award is on the wall with its year', () => {
  /* Scoped to the project's OWN awards block, not to its whole group: an award
     string checked against the group would be satisfied by a neighbour's copy or
     by the project's own prose, and the year by any year anywhere in the label.
     The block is what has to carry both — and the wall is where they are read
     now, so no award is behind a control any more.

     Each row is bounded at its OWN `</li>`. Splitting on the opening tag leaves
     the last segment running to the end of the block, so a year printed in a
     trailing lump after `</ul>` was accepted as "on its own award row" — the
     failure message claimed something the check did not test. */
  const rowsOf = (block) => block.split('<li class="award"').slice(1).map((it) => {
    const end = it.indexOf('</li>');
    return end === -1 ? it : it.slice(0, end);
  });
  const withAwards = PORTFOLIO.projects.filter((p) => Array.isArray(p.awards) && p.awards.length);
  assert.ok(withAwards.length > 0, 'fixture needs a project with awards');
  const bad = [];
  let rowsChecked = 0;
  withAwards.forEach((p) => {
    const block = awardsBlockFor(p.title);
    if (!block) { bad.push(p.title + ': no awards block'); return; }
    const rows = rowsOf(block);
    assert.equal(rows.length, p.awards.length,
      p.title + ' renders ' + rows.length + ' award rows for ' + p.awards.length + ' awards');
    p.awards.forEach((a) => {
      const item = rows.find((it) => it.includes(a.description));
      if (!item) { bad.push(p.title + ': "' + a.description + '" is not an award on the wall'); return; }
      rowsChecked++;
      if (!item.includes(a.year)) {
        bad.push(p.title + ': award year ' + a.year + ' is not on its own award row');
      }
    });
  });
  assert.equal(rowsChecked, PORTFOLIO.projects
    .reduce((n, p) => n + (p.awards || []).length, 0), 'not every award row was checked');
  assert.deepEqual(bad, [], bad.join(' | '));
  assert.ok(!/data-tab="awards"/.test(strip), 'a project award still opens a dialog');
});

check('an award with photographs is a control, and one without is not', () => {
  /* Six real photographs hang off `from`-tagged honours that the Honours room
     excludes, so an award that resolves to them MUST be a control. An award
     that resolves to nothing must NOT be — a focusable control that opens
     nothing is worse than a row that plainly is not one.
     The row's whole markup is read, not just its opening tag: the control is a
     real `<button>` INSIDE the `<li>`, because the walk's delegation is bound to
     `click` alone and an `<li>` wearing role="button" cannot be activated. */
  const rows = [...strip.matchAll(/<li class="award"[\s\S]*?<\/li>/g)].map((m) => m[0]);
  assert.ok(rows.length > 0, 'no awards rendered on the wall');
  const withPhotos = rows.filter((r) => /data-gallery=/.test(r));
  const without = rows.filter((r) => !/data-gallery=/.test(r));
  assert.ok(withPhotos.length > 0,
    'no award with photographs is a control — six photographs are unreachable');
  assert.ok(without.length > 0, 'every award is a control, including the photo-less ones');
  withPhotos.forEach((r) => {
    assert.match(r, /<button type="button"/,
      'an award control is not a real button: ' + r.slice(0, 80));
    assert.ok(!/role="button"/.test(r),
      'an award control still fakes a button with a role: ' + r.slice(0, 80));
  });
  without.forEach((r) => {
    assert.ok(!/<button/.test(r), 'a photo-less award is a button: ' + r.slice(0, 80));
  });
  /* And the count is right: exactly the awards that Site.awardPhotos resolves. */
  let expected = 0, total = 0;
  PORTFOLIO.projects.forEach((p) => {
    (p.awards || []).forEach((a) => {
      total++;
      if (Site.awardPhotos(p.id, PORTFOLIO.honors, a).length) expected++;
    });
  });
  assert.equal(rows.length, total, 'the wall does not carry every award');
  assert.equal(withPhotos.length, expected,
    withPhotos.length + ' award controls for ' + expected + ' awards that have photographs');
});

check('every team caption is on the wall, one line each, inside its own block', () => {
  /* Scoped to the `.team` block, for the same reason the awards are: the
     caption's words could otherwise be satisfied by the project's own prose,
     and the block is what has to carry them. One `<p>` per authored line, so a
     caption that arrives as three lines stays three lines. */
  const withTeam = PORTFOLIO.projects.filter((p) => p.team && Array.isArray(p.team.text) && p.team.text.length);
  assert.ok(withTeam.length > 0, 'fixture needs a project with a team caption');
  const bad = [];
  withTeam.forEach((p) => {
    const group = groupHtmlFor(p.title);
    const at = group.indexOf('<div class="team">');
    if (at === -1) { bad.push(p.title + ': no team block'); return; }
    /* The team block runs to where the catalogue begins, and its closing tag is
       the one immediately before it — so the block does not swallow the
       catalogue's own entries. */
    const block = group.slice(at).split('<div class="cat">')[0].replace(/<\/div>\s*$/, '');
    const lines = [...block.matchAll(/<p class="team-line">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    assert.equal(lines.length, p.team.text.length,
      p.title + ' renders ' + lines.length + ' team lines for ' + p.team.text.length + ' authored');
    p.team.text.forEach((line, i) => {
      if (lines[i] !== line) {
        bad.push(p.title + ': team line ' + i + ' is "' + String(lines[i]).slice(0, 40)
          + '", the data says "' + line.slice(0, 40) + '"');
      }
    });
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('every shipped project shows its full account on the wall', () => {
  /* The whole point of this work: no project's story is behind a control.
     Compared in FULL against the data, every paragraph — the prefix test this
     replaces could not fail while the copy was being truncated. */
  const bad = [];
  let compared = 0;
  PORTFOLIO.projects.forEach((p) => {
    const group = groupHtmlFor(p.title);
    if (!group) { bad.push(p.title + ': no group on the wall'); return; }
    const want = p.overview && p.overview.text;
    if (!want) { bad.push(p.title + ': no overview in the data'); return; }
    const paras = want.split('\n\n').map((t) => t.trim()).filter(Boolean);
    const rendered = accountParagraphsFor(p.title);
    if (rendered.length !== paras.length) {
      bad.push(p.title + ': ' + rendered.length + ' paragraphs rendered, ' + paras.length + ' in the data');
      return;
    }
    paras.forEach((t, i) => {
      compared++;
      if (rendered[i] !== t) bad.push(p.title + ': paragraph ' + i + ' is not the data');
    });
  });
  assert.ok(compared > 20, 'too few paragraphs were compared: ' + compared);
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the label reads title, account, awards, team, catalogue — in that order', () => {
  /* The order is what makes it a museum label rather than a caption, and it is
     the only part of that the DOM alone can pin — the direction itself is CSS.
     The TEAM block is located, not merely presumed: a check named for the team
     caption that never looks for it passes while the caption is emitted above
     the title. */
  const bad = [];
  let withTeam = 0;
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = i === 0 ? g.split('<div class="group"')[0]
      : g.slice(g.indexOf('>') + 1).split('<div class="group"')[0];
    const at = (needle) => body.indexOf(needle);
    const order = [
      ['title', at('class="narr-title"')],
      ['account', at('class="label-account"')],
      ['awards', at('class="awards"')],
      ['team', at('class="team"')],
      ['catalogue', at('class="cat"')],
    ];
    const missing = order.filter(([, n]) => n < 0).map(([name]) => name);
    /* Only the title, the account and the catalogue are on every label: a
       record with no awards and no team caption legitimately has neither. */
    const required = ['title', 'account', 'catalogue'];
    const absent = missing.filter((name) => required.includes(name));
    if (absent.length) { bad.push('group ' + i + ': missing ' + absent.join(', ')); return; }
    const present = order.filter(([, n]) => n >= 0);
    const sorted = present.slice().sort((a, b) => a[1] - b[1]).map(([name]) => name);
    if (JSON.stringify(sorted) !== JSON.stringify(present.map(([name]) => name))) {
      bad.push('group ' + i + ': reads ' + sorted.join(', ') + ', expected '
        + present.map(([name]) => name).join(', '));
    }
    /* The team block is located, not merely presumed: a check named for the team
       caption that never looks for it passes while the caption is emitted above
       the title. */
    if (!missing.includes('team')) withTeam++;
  });
  assert.ok(withTeam > 0, 'no group carries a team block, so its position was never checked');
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the catalogue names every awaited frame once, not once per frame', () => {
  /* A group whose photographs are all awaited gets no catalogue entry at all,
     only the note: three entries reading "Photograph awaited" is not a
     catalogue, it is a stutter. The entries themselves are counted by the check
     above; this one is the note. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    /* Bound the group at the next group, so the count cannot pick up a
       neighbouring group's catalogue. */
    const body = g.split('<div class="group"')[0];
    const awaited = (body.match(/class="piece piece--pending/g) || []).length;
    const notes   = (body.match(/class="ca-note"/g) || []).length;
    if (notes !== (awaited > 0 ? 1 : 0)) {
      bad.push('group ' + i + ': ' + notes + ' awaited notes for ' + awaited + ' awaited frames');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('no frame on the wall carries a letter', () => {
  /* The letter began as a badge on the frame, so a visitor reading entry C could
     find C on the photograph. On the wall it is a mark on the picture — a dark
     box in the corner of a work — and it is gone: a mark in the corner of a work
     reads as part of the work. The letters are read in the label, where the
     catalogue names each photograph in its own letter's column, so nothing on
     the wall is unaccounted for by taking them off. */
  const walled = [...strip.matchAll(/<span class="piece-(?:key|wrap)\b[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(walled, [], walled.length + ' letters still on the wall');
});

check('the catalogue letters every photograph, once each, in piece order', () => {
  /* The plan that used to carry these letters is gone, so the catalogue is now
     the only place a letter appears — and the letters ARE the piece indices,
     which is what ties an entry to a photograph. A catalogue that lettered its
     entries A, B, D would name a photograph nobody can find, and a catalogue
     with more letters than entries would name one twice. */
  const range = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const bad = [];
  let lettered = 0;
  /* The opening tag of each part is left at the head of the NEXT part, so drop
     up to the first '>' in every part but the first — the same repair
     groupHtmlFor() makes, for the same reason. */
  const parts = strip.split('<div class="group"').slice(1);
  parts.forEach((g, i) => {
    let body = g;
    if (i > 0) body = body.slice(body.indexOf('>') + 1);
    const end = body.indexOf('<div class="group"');
    if (end !== -1) body = body.slice(0, end);
    const keys = [...body.matchAll(/<span class="ce-key"[^>]*>([A-Z])<\/span>/g)].map((m) => m[1]);
    const entries = (body.match(/class="cat-entry"/g) || []).length;
    if (keys.length !== entries) {
      bad.push('group ' + i + ': ' + keys.length + ' letters for ' + entries + ' entries');
    }
    const want = range(entries);
    if (JSON.stringify(keys) !== JSON.stringify(want)) {
      bad.push('group ' + i + ': letters ' + keys.join('') + ', expected ' + want.join(''));
    }
    /* The letters ARE the piece indices — that is what ties an entry to a
       photograph now the plan is gone — so each letter must name its own piece.
       Read from the letter's OWN `data-piece`, and separately from the entry's,
       so neither can agree with the other by accident: a running counter over
       permuted entries passes the A..N sequence test above while lettering
       piece 2 as A. */
    const pairs = [...body.matchAll(
      /<div class="cat-entry" data-piece="(\d+)"><span class="ce-key" data-piece="(\d+)">([A-Z])<\/span>/g)]
      .map(([, entryPiece, keyPiece, letter]) => ({ entryPiece, keyPiece, letter }));
    if (pairs.length !== entries) {
      bad.push('group ' + i + ': ' + pairs.length + ' letters name their piece, of ' + entries + ' entries');
    }
    pairs.forEach(({ entryPiece, keyPiece, letter }) => {
      const expected = String.fromCharCode(65 + Number(entryPiece));
      if (entryPiece !== keyPiece) {
        bad.push('group ' + i + ': the entry says piece ' + entryPiece
          + ' and its letter says piece ' + keyPiece);
      }
      if (letter !== expected) {
        bad.push('group ' + i + ': entry for piece ' + entryPiece + ' is lettered ' + letter
          + ', expected ' + expected);
      }
    });
    lettered += keys.length;
  });
  assert.ok(lettered > 0, 'no catalogue entry carries a letter — the check above proved nothing');
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the catalogue names the file a photograph came from, not words made of it', () => {
  /* "Palad Team" reads like a description of the photograph and is not one, so
     a visitor takes it for the only explanation on offer. A filename says
     plainly that the line is provenance. */
  const tech = [...strip.matchAll(/<p class="ce-tech">([^<]*)<\/p>/g)].map((m) => m[1]);
  assert.ok(tech.length > 0, 'no technical lines rendered');
  const bad = tech.filter((t) => t !== 'Photograph awaited' && !/^File · \S+\.\w+$/.test(t));
  assert.deepEqual(bad, [], 'lines that are not a file: ' + bad.slice(0, 5).join(' | '));
});

check('an awaited frame is an empty frame, not a grey picture', () => {
  /* 34 of the 71 frames on this wall are waiting for a photograph. Drawing the
     same 405x260 placeholder in every one of them is not a reserved place on
     the wall, it is a broken image repeated. */
  const pending = [...strip.matchAll(/<span class="piece piece--pending[^"]*"[^>]*><\/span>/g)].map((m) => m[0]);
  assert.ok(pending.length > 0, 'no awaited frames rendered');
  pending.forEach((p) => {
    assert.ok(!/<img/.test(p), 'an awaited frame still loads a picture: ' + p.slice(0, 90));
    assert.match(p, /role="img"/, 'an awaited frame has no role');
    assert.match(p, /aria-label="[^"]*awaited/, 'an awaited frame is not named as awaited');
    assert.ok(!/data-gallery|data-action/.test(p), 'an awaited frame carries a handler it cannot honour');
  });
  /* Keyed on `src="`, not on the path: every real frame keeps its onerror
     fallback to the placeholder, which is a safety net for a photograph whose
     file is missing and not a picture anyone is meant to see. */
  assert.ok(!/src="files\/PlaceHolder\.png"/.test(strip),
    'a frame still draws the placeholder picture');
});

check('the label reads account, awards and team caption on the wall', () => {
  /* The order is what makes it a museum label rather than a caption, and it is
     the only part of that the DOM alone can pin — the direction itself is CSS.
     The account is the copy a visitor came for, so it is above the awards; the
     team caption stands apart in its own block, not mixed into the prose. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const order = ['class="narr-title"', 'class="label-account"', 'class="cat"']
      .map((needle) => body.indexOf(needle));
    if (order.some((n) => n < 0)) { bad.push('group ' + i + ': a label part is missing'); return; }
    if (JSON.stringify(order) !== JSON.stringify(order.slice().sort((a, b) => a - b))) {
      bad.push('group ' + i + ': the label does not read title, account, catalogue');
    }
    const awardsAt = body.indexOf('class="awards"');
    if (awardsAt !== -1 && awardsAt < body.indexOf('class="label-account"')) {
      bad.push('group ' + i + ': the awards are read before the account');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the catalogue covers every hung frame, so no frame is left unnamed', () => {
  /* The plan that used to draw the hang is gone, so the catalogue is the only
     text that accounts for a frame. It has to account for every one of them:
     a frame hanging with no entry is a photograph nobody can name, and the
     letters are keyed on the PIECE index, so the count is what can be read off
     the DOM without a layout engine. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const frames = (body.match(/class="piece[" ]/g) || []).length;
    const awaited = (body.match(/class="piece piece--pending/g) || []).length;
    const entries = (body.match(/class="cat-entry"/g) || []).length;
    /* An awaited frame is accounted for by the count of awaited photographs. */
    if (entries !== frames - awaited) {
      bad.push('group ' + i + ': ' + entries + ' entries for ' + (frames - awaited) + ' photographs');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  /* A record with a single real photograph is still hung as a full stand: the
     floor pads it to MIN_PIECES, so a one-photograph record is never a lone
     frame with an empty column beside it. */
  const single = Site.groupPieces({ description: 'x', images: ['a.jpg'] }, 'record');
  assert.equal(single.length, Site.MIN_PIECES);
});

check('the label counts photographs, not frames', () => {
  /* The meta line names the group's date and how many photographs it holds.
     It counted hung frames, which includes the padding that fills a group to
     the floor — so a record with no photographs at all read "3 photographs"
     three lines above "Three photographs awaited". A frame is not a
     photograph. */
  const strip_ = strip;
  const bad = [];
  strip_.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const meta = body.match(/<p class="narr-meta">([^<]*)<\/p>/);
    if (!meta) return;                       /* a record with no year has none */
    const claimed = Number((meta[1].match(/·\s*(\d+)\s+photograph/) || [])[1]);
    const frames = (body.match(/class="piece[" ]/g) || []).length;
    const awaited = (body.match(/class="piece piece--pending/g) || []).length;
    if (!Number.isNaN(claimed) && claimed !== frames - awaited) {
      bad.push('group ' + i + ': claims ' + claimed + ' of ' + (frames - awaited) + ' photographs');
    }
    if (Number.isNaN(claimed) && frames - awaited > 0) {
      bad.push('group ' + i + ': has ' + (frames - awaited) + ' photographs and names none');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  /* And the shipped case that made it visible: an honour whose record declares
     no photographs must not claim any. */
  const none = PORTFOLIO.honors.filter((h) => !Array.isArray(h.images) || !h.images.length);
  assert.ok(none.length > 0, 'fixture needs an honour with no photographs');
  none.forEach((h) => {
    const pieces = Site.groupPieces(h, 'record');
    const html = renderLabelFor(h, pieces);
    assert.ok(!/photographs?<\/p>/.test(html.split('class="label-account"')[0]),
      'a photograph-less group still claims photographs: ' + h.description);
  });
});

check('a record with no summary still renders an account', () => {
  /* The account falls back to the record's own description, because a record
     added without copy must not render an empty box where its story goes. */
  const stripped = { description: 'Some Award – Champion', year: '2026' };
  const pieces = Site.groupPieces(stripped, 'record');
  const html = renderLabelFor(stripped, pieces);
  assert.match(html, /Some Award/, 'fell through to nothing');
  assert.match(html, /class="acct-p">[^<]*Some Award/, 'the account is empty');
});

check('a record whose account falls back renders that one line exactly once', () => {
  /* CRITICAL 1, pinned on the renderer rather than only on the wall: the
     `summary` here is the account, so a label that also renders it as the lead
     prints the record's own sentence twice, one line apart. Counted across the
     WHOLE label, because scoping to one selector would miss the duplicate by
     construction. */
  const summary = 'A sentence that exists in exactly one place.';
  const record = { id: 'fallback', description: 'Some Honour', summary: summary, year: '2026' };
  const pieces = Site.groupPieces(record, 'record');
  const html = renderLabelFor(record, pieces);
  assert.equal(html.split(summary).length - 1, 1,
    'the summary is rendered ' + (html.split(summary).length - 1) + ' times');
  assert.ok(!/class="narr-lead"/.test(html),
    'a lead line is rendered for an account that is already the summary');
});

check('a record with an overview keeps its summary as the opening lead', () => {
  /* The other direction of the same contract, and the reason the two blocks are
     decided by SOURCE and not by comparing the strings: for a project the lead
     frames the account and both must stay. */
  const record = {
    id: 'lead', title: 'Project Y', summary: 'The line that frames it.',
    overview: { text: 'First paragraph of the account.\n\nSecond paragraph.' },
  };
  const pieces = Site.groupPieces(record, 'project');
  const html = renderLabelFor(record, pieces);
  assert.match(html, /<p class="narr-lead">The line that frames it\.<\/p>/,
    'the summary is not rendered as the opening lead');
  assert.equal(html.split('The line that frames it.').length - 1, 1,
    'the lead line is rendered more than once');
  assert.match(html, /<p class="acct-p">First paragraph of the account\.<\/p>/,
    'the account is missing its first paragraph');
});

check('a record with no words at all emits no empty account block', () => {
  /* The label's own rule: every level falls back rather than rendering an empty
     box. With no overview, no summary and no description there is nothing to
     put in one, so the block must not be there at all. */
  const bare = { id: 'y', title: 'OnlyTitle' };
  const html = renderLabelFor(bare, []);
  assert.ok(!/class="label-account"/.test(html),
    'an empty account block is still emitted: ' + html.slice(0, 120));
  assert.ok(!/class="acct-p"/.test(html), 'an empty paragraph is emitted');
  assert.match(html, /<p class="narr-title">OnlyTitle<\/p>/, 'the record lost its name');
});

check('a record with no copy at all falls back to its own description, in one paragraph', () => {
  /* The last resort: a record added with no `overview` and no `summary` still
     names what it is where its account goes. It is the description and NOT the
     title — reproduced by the title it would print the line above itself twice
     and read as a finished label rather than as one still waiting for copy. */
  const bare = { id: 'bare', description: 'Some Honour', year: '2026' };
  const pieces = Site.groupPieces(bare, 'record');
  const html = renderLabelFor(bare, pieces);
  assert.match(html, /<p class="narr-title">Some Honour<\/p>/,
    'the record is not named anywhere on its own label');
  const paras = [...html.matchAll(/<p class="acct-p">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  assert.deepEqual(paras, ['Some Honour'],
    'the account of a copy-less record is not its own description, once: ' + paras.join(' / '));
});

check('a pieces array shorter than images falls back per entry', () => {
  const record = { description: 'X', images: ['a.jpg', 'b.jpg'], pieces: [{ title: 'Only one' }] };
  const pieces = Site.groupPieces(record, 'record');
  const html = renderLabelFor(record, pieces);
  assert.match(html, /Only one/, 'the first entry lost its title');
  assert.match(html, /Photograph B/, 'the missing tail did not fall back');
});

check('a pieces array longer than images is ignored, not thrown', () => {
  const record = { description: 'X', images: ['a.jpg'], pieces: [{ title: 'A' }, { title: 'B' }] };
  const pieces = Site.groupPieces(record, 'record');
  assert.doesNotThrow(() => renderLabelFor(record, pieces));
  const html = renderLabelFor(record, pieces);
  assert.equal((html.match(/class="cat-entry"/g) || []).length, 1,
    'an extra pieces entry was hung as a photograph that does not exist');
  /* The other two frames are padding, and the label says so in one line rather
     than inventing a photograph for each. */
  assert.equal((html.match(/class="ca-note"/g) || []).length, 1,
    'the padding was not named as awaited');
});

check('a project label names the venue, a record label names the year', () => {
  const projectRecord = { title: 'Project X', venue: 'August 2025', overview: { text: 'why' } };
  const projectPieces = Site.groupPieces(projectRecord, 'project');
  const project = renderLabelFor(projectRecord, projectPieces);
  assert.match(project, /Project X/);
  assert.match(project, /August 2025/);
  const recordRecord = { description: 'Some Honour', year: 'April 2026' };
  const recordPieces = Site.groupPieces(recordRecord, 'record');
  const record = renderLabelFor(recordRecord, recordPieces);
  assert.match(record, /Some Honour/);
  assert.match(record, /April 2026/);
});

/* ── The copy ────────────────────────────────────────────────────────────
   Every group has authored text rather than the renderer's derived filler.
   Without this the labels would fall back one by one and nobody would notice:
   a fallback renders a label that looks complete. */
check('every group has authored copy, not derived filler', () => {
  const missing = [];
  const inspect = (rec, kind) => {
    const name = rec.title || rec.description || '(unnamed)';
    if (!rec.summary) missing.push(name + ': no summary');
    /* A padding frame has nothing authored to carry: there is no photograph to
       write about yet, and the label says so in one line. The invariant is that
       every photograph that DOES hang has a title of its own, at its own index. */
    const p = Array.isArray(rec.pieces) ? rec.pieces : [];
    Site.groupPieces(rec, kind).forEach((piece, i) => {
      if (piece.awaited) return;
      const e = p[i];
      if (!e || !e.title) missing.push(name + ': photograph ' + i + ' untitled');
    });
  };
  PORTFOLIO.projects.forEach((p) => inspect(p, 'project'));
  PORTFOLIO.leadership.forEach((l) => inspect(l, 'record'));
  PORTFOLIO.honors.forEach((h) => inspect(h, 'record'));
  assert.deepEqual(missing, []);
});

check('no label falls back to a derived narrative', () => {
  /* The narrative falls back to the record's own description. That is the
     safety net for a record added without copy; it must not be what every
     group actually shows. */
  const derived = PORTFOLIO.honors.filter((h) => h.summary === h.description);
  assert.deepEqual(derived.map((h) => h.description), [],
    'these groups narrate their own description verbatim');
});

/* ── Photo-less honours must not open a neighbour's gallery ──────────── */
check('gallery rows carry their real array index', () => {
  /* Each piece of a group carries that group's entry key, so this counts
     pieces as well as groups — which is the point: every clickable frame on
     the wall must resolve to a record that actually has photographs. */
  const rows = [...strip.matchAll(/data-gallery="([^"]+)" data-entry="([^"]+)"/g)];
  assert.ok(rows.length > 0, 'no gallery rows rendered');
  rows.forEach((m) => {
    const [, kind, entry] = m;
    assert.ok(entry.startsWith(kind + ':'),
      'an entry is not scoped by its own array: ' + entry);
    const index = Number(entry.slice(kind.length + 1));
    assert.ok(Number.isInteger(index) && index >= 0, 'bad index on ' + entry);
    const list = kind === 'honors' ? PORTFOLIO.honors
      : kind === 'leadership' ? PORTFOLIO.leadership : PORTFOLIO.news;
    assert.ok(list && list[index], 'entry ' + entry + ' is not in ' + kind);
    assert.ok(Array.isArray(list[index].images) && list[index].images.length,
      'entry ' + entry + ' points at a record with no photographs');
  });
});

check('no honour hangs the placeholder picture', () => {
  /* A tile is an accession, not a frame, so the room draws no picture at all —
     and every tile that does open photographs names its own record. */
  assert.ok(!/src="files\/PlaceHolder\.png"/.test(honoursStrip),
    'an honour still draws the placeholder picture');
  const rows = [...honoursStrip.matchAll(/data-gallery="honors" data-entry="honors:(\d+)"/g)]
    .map((m) => Number(m[1]));
  rows.forEach((i) => {
    const record = PORTFOLIO.honors[i];
    assert.ok(record, 'data-entry honors:' + i + ' is not an honour');
    assert.ok(Array.isArray(record.images) && record.images.length,
      'data-entry honors:' + i + ' points at a photo-less honour');
  });
});

/* ── The honours room is a tile list, not a hang ─────────────────────── */
check('the honours room hangs no painting', () => {
  /* The eight honours that are a project's own award used to hang here as
     groups with labels and frames, and they hang nowhere now — they are in the
     project's awards dialog. The five that remain are tiles. */
  assert.ok(!/data-group data-kind="honors"/.test(honoursStrip),
    'an honour still hangs as a framed group');
  assert.ok(!/<div class="cluster"/.test(honoursStrip),
    'a cluster is still drawn on the honours wall');
  assert.ok(!/<div class="label"/.test(honoursStrip),
    'a label is still drawn on the honours wall');
});

check('every honour that stands alone is one clickable tile', () => {
  /* A tile is a real control, so the count of tile buttons must equal the count
     of honours the data says stand alone — a tile dropped or hung twice is a
     record lost or duplicated, and neither looks broken on the wall.
     The class is matched loosely and the open tag is bounded at the `>` that
     closes it: an aria-label legitimately contains a `>` — "Top 7% of 2500
     Applicants" is followed by one — and a pattern that stops at the first `>`
     truncates the tile it is reading. */
  const tiles = [...honoursStrip.matchAll(
    /<button type="button" class="(tile[^"]*)" data-tile="(\d+)"[^>]*>([\s\S]*?)<\/button>/g)];
  assert.equal(tiles.length, HONOURS_TILES.length,
    tiles.length + ' tiles for ' + HONOURS_TILES.length + ' standalone honours');
  tiles.forEach(([, cls, i, body]) => {
    const entry = PORTFOLIO.honors[Number(i)];
    assert.ok(entry, 'a tile names honours:' + i + ', which does not exist');
    assert.ok(!entry.from, 'a tile is hung for a project award: ' + entry.description);
    assert.match(cls, /\btile\b/, 'a tile is not classed as one');
    assert.ok(body.includes('class="tile-year"'), 'a tile carries no year');
    assert.ok(body.includes('class="tile-desc"'), 'a tile carries no description');
  });
});

check('a tile with no photographs is not a control that does nothing', () => {
  /* The rule the frames already follow: a focusable control that opens nothing
     is worse than a plain row. A tile with photographs carries the gallery
     handle and names what it opens; one without carries neither, and says so
     in its own text. */
  const tiles = [...honoursStrip.matchAll(
    /<button type="button" class="(tile[^"]*)" data-tile="(\d+)"([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.ok(tiles.length > 0, 'no tiles rendered');
  tiles.forEach(([, cls, i, attrs, body]) => {
    const record = PORTFOLIO.honors[Number(i)];
    const hasPhotos = Array.isArray(record.images) && record.images.length > 0;
    const wired = /data-gallery="honors" data-entry="honors:\d+"/.test(attrs);
    assert.equal(wired, hasPhotos,
      record.description + ': photographs ' + (hasPhotos ? 'present' : 'awaited')
      + ' but wired=' + wired);
    if (hasPhotos) {
      assert.match(attrs, /aria-label="[^"]+"/, record.description + ' has no accessible name');
      assert.match(cls, /\btile--open\b/, record.description + ' is not marked as openable');
    }
    if (!hasPhotos) {
      assert.match(body, /class="tile-awaited"/, record.description + ' does not say so');
    }
  });
});

check('the project awards the honours room gave up are on their project cards', () => {
  /* This is the whole point of the move: an award must not be dropped on the
     way from the wall to its project. Every honour carrying a `from` link must
     name a project that exists, and that project's `awards` must carry the same
     achievement — compared on its leading words, because the card states the
     placing parenthetically where the honour states it after a dash. */
  const linked = PORTFOLIO.honors.filter((h) => h.from);
  assert.ok(linked.length > 0, 'no honour is linked to a project');
  linked.forEach((h) => {
    const project = PORTFOLIO.projects.find((p) => p.id === h.from);
    assert.ok(project, h.description + ' names project ' + h.from + ', which does not exist');
    const lead = String(h.description).split(/[–—(]/)[0].trim().toLowerCase();
    const listed = (project.awards || []).some(
      (a) => String(a.description).toLowerCase().includes(lead));
    assert.ok(listed, '"' + h.description + '" is not on ' + project.title + "'s awards");
    assert.ok(honoursStrip.indexOf(h.description) === -1,
      '"' + h.description + '" is still on the honours wall');
  });
});

check('every award control opens that award\'s own photographs', () => {
  /* The count check above only says a control EXISTS. The defect this replaces
     was worse than a missing control: a control that opens a different win's
     photographs. The six photographs hang off `from`-tagged honours the Honours
     room excludes, so a control wired to the wrong entry silently misattributes
     another award's pictures — and every count would still be right.
     `data-entry` is resolved exactly as main.js's delegation resolves it. */
  const withAwards = PORTFOLIO.projects.filter((p) => Array.isArray(p.awards) && p.awards.length);
  assert.ok(withAwards.length > 0, 'fixture needs a project with awards');
  const bad = [];
  let controls = 0;
  withAwards.forEach((p) => {
    const group = groupHtmlFor(p.title);
    /* The group is split at its award items rather than matched with one
       pattern: a full description in a pattern is a regex to escape, and a
       half-match against the wrong `<li>` is exactly the confusion this check
       exists to prevent. Each item is bounded at its OWN `</li>`, so the last
       one cannot borrow the end of the block. */
    const items = group.split('<li class="award"').slice(1).map((it) => {
      const end = it.indexOf('</li>');
      return end === -1 ? it : it.slice(0, end);
    });
    p.awards.forEach((a) => {
      const html = items.find((it) => it.includes(a.description));
      if (!html) { bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": no award on the wall'); return; }
      const photos = Site.awardPhotos(p.id, PORTFOLIO.honors, a);
      const ref = (html.match(/data-entry="([^"]+)"/) || [])[1];
      const open = /data-gallery="honors"/.test(html);
      if (!photos.length) {
        /* The two directions of the same contract: a photo-less award must not
           be a control, and must not LOOK like one to a screen reader either. */
        if (ref || open) bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": a photo-less award opens ' + ref);
        if (/role="button"/.test(html) || /<button/.test(html)) {
          bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": a photo-less award is a button');
        }
        return;
      }
      controls++;
      if (!open || !ref) {
        bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": no gallery handle (' + html.slice(0, 60) + ')');
        return;
      }
      /* A control that cannot be activated is worse than a row that plainly is
         not one — the rule the frames already obey. It has to be a real
         `<button>`, not an `<li>` wearing a role: the walk delegates `click`
         alone, so role+tabindex is focusable and inert on Enter. */
      if (!/<button type="button"/.test(html)) {
        bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": the control is not a real button');
      }
      if (/role="button"/.test(html)) {
        bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": the control fakes a button with a role');
      }
      /* The year rides along so a click can be re-resolved to THIS award: a
         bare entry index does not say which of the project's wins it is. */
      const carried = (html.match(/data-open-award-year="([^"]*)"/) || [])[1];
      if (carried !== a.year) {
        bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": carries year "' + carried
          + '", the award is ' + a.year);
      }
      const at = ref.indexOf(':');
      const resolved = Site.galleryFor(ref.slice(0, at), ref.slice(at + 1)).images;
      if (JSON.stringify(resolved) !== JSON.stringify(photos)) {
        bad.push(p.title + ' / "' + a.description.slice(0, 30) + '": ' + ref + ' opens ['
          + resolved.slice(0, 2).join(', ') + '], the award holds ['
          + photos.slice(0, 2).join(', ') + ']');
      }
    });
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  assert.ok(controls > 0, 'no award control was resolved at all');
});

check('the awards the honours room gave up are readable on the wall', () => {
  /* This is the whole point of the move: an honour that IS a project's award
     hangs nowhere in the Honours room, so the project's label is its only route
     to a visitor. Its description and its year have to be readable there — the
     dialog it used to live in is no longer the way to them. */
  const linked = PORTFOLIO.honors.filter((h) => h.from);
  assert.ok(linked.length > 0, 'no honour is linked to a project');
  linked.forEach((h) => {
    const project = PORTFOLIO.projects.find((p) => p.id === h.from);
    assert.ok(project, h.description + ' names project ' + h.from + ', which does not exist');
    const group = groupHtmlFor(project.title);
    assert.ok(group, project.title + ' has no group on the wall');
    const award = (project.awards || []).find((a) => a.year === h.year);
    assert.ok(award, h.description + ' (' + h.year + ') is not among ' + project.title + "'s awards");
    assert.ok(group.includes(award.description),
      '"' + award.description + '" is not readable on ' + project.title + "'s label");
    assert.ok(group.includes(award.year),
      'the award year ' + award.year + ' is not readable on ' + project.title + "'s label");
  });
});

/* ── The dock ────────────────────────────────────────────────────────────
   The dock is the walk's only navigation: the navigation bar held one
   wordmark and two 0x0 lists, and the directory band that replaced it sat
   on top of the room title. It now lives at the foot of the walk. */
check('the dock lists every room, once each, in walk order', () => {
  const goto = [...directory.matchAll(/class="dock-link" data-goto="([^"]+)"/g)].map((m) => m[1]);
  const rooms = [...strip.matchAll(/data-room="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(goto, rooms, 'dock and walk disagree');
  assert.equal(new Set(goto).size, goto.length, 'a room appears twice in the dock');
});

check('every dock entry is a real, named button', () => {
  const marks = [...directory.matchAll(
    /<button type="button" class="dock-link" data-goto="([^"]+)" aria-label="([^"]*)"/g)];
  assert.equal(marks.length, [...directory.matchAll(/data-goto="/g)].length,
    'a dock entry is not a labelled button');
  marks.forEach(([, key, label]) => {
    assert.ok(label.trim().length > 0, key + ' has an empty accessible name');
  });
});

check('dock entries carry an accession and a short name', () => {
  assert.ok(/class="dock-link"/.test(directory), 'the directory is not a dock');
  const shorts = [...directory.matchAll(/<span class="dt">([^<]*)<\/span>/g)].map((m) => m[1]);
  const accs = [...directory.matchAll(/<span class="dn">([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.equal(shorts.length, accs.length, 'a dock entry is missing a name or an accession');
  assert.ok(shorts.length > 0 && shorts.every((s) => s.trim().length > 0), 'an empty short name');
});

check('the dock marks exactly one current room', () => {
  const marked = currentRoomMarkup(
    [...directory.matchAll(/data-goto="([^"]+)"/g)].map((m) => m[1]), 'About');
  assert.deepEqual(marked.filter((m) => m.current), [{ key: 'About', current: true }],
    'the dock does not mark the room the walk is in');
});

check('the dock marks none when the walk names no room', () => {
  const marked = currentRoomMarkup(['About', 'Contact'], null);
  assert.equal(marked.filter((m) => m.current).length, 0, 'a stale room stays marked');
});

/* ── The chrome that tracks the walk ─────────────────────────────────────
   The sticky rail and the dock's progress bar are both driven from the scroll
   position, and neither is reachable from the renderer's own readback, which is
   static markup. The two checks below read the shell; the third drives the
   controller and reads what it wrote. */
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

/* The two shell checks above are static: they read index.html and cannot see
   the controller at all. This one runs the real initLights() — the module
   import at the head of this file already called it against the seeded rooms —
   and reads back what it wrote. Without it, both features could be missing from
   js/main.js entirely and every check in this file would still pass. */
check('the rail carries the room it is in, and the dock carries its progress', () => {
  assert.ok(railNodes['.rr-title'].textContent, 'nothing named the room in the rail');
  assert.equal(railNodes['.rr-title'].textContent, railTitleEl.textContent,
    'the rail\'s name is not the room title it stands for');
  assert.equal(railNodes['.rr-meta'].textContent, 'Design and fabrication · of eleven years',
    'the rail\'s second line is not the room subtitle: its runs are not separated, '
    + 'or its whitespace was not collapsed to one line');

  /* The bar is a percentage written on the track element, and the fraction is
     Site.progressFraction's. 2700 of a 5040-wide walk inside a 1440 viewport is
     2700/3600 = 75%. The three denominators this could plausibly get wrong give
     three other numbers — over scrollWidth, 53.57%; over clientWidth, 187.5%; a
     constant, 0% or 100% — which is why 75% is the value asserted. */
  hall.scrollWidth = 5040;
  hall.clientWidth = 1440;
  hall.scrollLeft = 2700;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '75%',
    'the dock progress is not the fraction of the walk the viewport has consumed');

  /* That this call site goes THROUGH Site.progressFraction, and does not
     re-derive the fraction itself. Clamping alone cannot show it: a hand-rolled
     `scrollLeft / (scrollWidth - clientWidth)` with the same two clamps is
     indistinguishable by value. Task 1's helper is a runtime seam, so standing
     in for it decides the point — a call site that computed its own fraction
     would ignore the stand-in and still read 75%. */
  const realFraction = globalThis.Site.progressFraction;
  try {
    globalThis.Site.progressFraction = () => 0.5;
    globalThis.Site.updateProgress();
    assert.equal(el('dockProgress').style.get('--walk-progress'), '50%',
      'the dock progress ignores Site.progressFraction — the fraction is being recomputed here '
      + 'instead of read from the one function the walk and the bar share');
  } finally {
    globalThis.Site.progressFraction = realFraction;
  }

  hall.scrollLeft = 0;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '0%',
    'the bar does not read zero at the walk\'s start');
  hall.scrollLeft = hall.scrollWidth - hall.clientWidth;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '100%',
    'the bar does not read full at the walk\'s end');

  /* A rubber-band overscroll puts scrollLeft past the end. Hand-rolling the
     fraction here — even with the same denominator — reads 138.9% unless the
     clamp is repeated too, so this is the assertion that fails if this call
     site stops going through Site.progressFraction's clamp. */
  hall.scrollLeft = 5000;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '100%',
    'an overscrolled walk must read full, not past it — the fraction is not clamped');

  hall.scrollLeft = -250;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '0%',
    'a negative offset must read empty, not below it');
  hall.scrollWidth = 1440;      /* the walk cannot scroll: the bar is total */
  hall.scrollLeft = 0;
  globalThis.Site.updateProgress();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '0%',
    'a walk that cannot scroll must not divide by zero');
});

/* The rail is written on room CHANGE only — the same condition the announcer
   uses — so it is two DOM writes per boundary crossed, not per frame. Nothing
   else in this file can see that: hoisting writeRail() above the
   `name !== lastRoom` guard leaves every other check green. */
check('the rail is rewritten when the room changes, and not when it has not', () => {
  const before = railTitleWrites;
  globalThis.Site.announceRoom();                    /* the same room again */
  globalThis.Site.announceRoom();
  assert.equal(railTitleWrites, before,
    'the rail was rewritten ' + (railTitleWrites - before) + ' times for a room that had '
    + 'not changed — it is on the per-frame path');

  hall.scrollLeft = 1440;                            /* the boundary into Robotics */
  globalThis.Site.announceRoom();
  assert.equal(railNodes['.rr-title'].textContent, ROBOTICS.titleEl.textContent,
    'crossing into Robotics did not rewrite the rail');
  assert.equal(railNodes['.rr-meta'].textContent, '3 projects · ROBOTICS',
    'the count beside the room subtitle is glued to it, or missing');
  assert.equal(railTitleWrites, before + 1,
    'a room change did not write exactly once');

  hall.scrollLeft = 0;                               /* back into About */
  globalThis.Site.announceRoom();
  assert.equal(railNodes['.rr-title'].textContent, ABOUT.titleEl.textContent,
    'coming back to About did not rewrite the rail');
});

/* Review Focus item 5, and the one regression the plan records from a prior
   build: the reduced-motion branch of initLights() returns early, and before
   that return calls bindTracking() the rail stayed empty and the dock never
   followed the walk. Dropping bindTracking() from that branch leaves every
   check in every suite green — lights.test.mjs reaches the branch but its scene
   carries no room, so announceRoom() returns null and nothing is observable.
   Here the branch is reached directly, by flipping the preference and re-running
   the controller against the same rooms. */
check('reduced motion still writes the rail and still follows the walk', () => {
  motion.reduced = true;
  /* Re-running initLights() binds a fresh tracking flush each time — it has no
     teardown, and in the page it runs once — so the listeners from the earlier
     runs are taken out of the way first. Otherwise every re-run leaves another
     identical flush behind and this check's later proof ("exactly one handler
     moves the bar") counts bindings that belong to no run. */
  const before = (listeners.get('window:resize') || []).slice();
  listeners.set('window:resize', []);
  try {
    /* Two things this must not be able to pass on: a value left over from the
       focused path, and the identical value written by the import-time run. */
    el('dockProgress').style.removeProperty('--walk-progress');
    railNode.textContent = '';
    railTitleWrites = 0;
    hall.scrollLeft = 0;

    globalThis.Site.initLights();

    assert.ok(railNodes['.rr-title'].textContent,
      'under reduced motion the rail stayed empty — bindTracking() is not being called '
      + 'on the early-return branch');
    assert.equal(railNodes['.rr-title'].textContent, ABOUT.titleEl.textContent,
      'the rail named the wrong room under reduced motion');
    assert.equal(railTitleWrites, 1,
      'the rail was written ' + railTitleWrites + ' times on the reduced-motion path');
    assert.equal(el('dockProgress').style.get('--walk-progress'), '0%',
      'under reduced motion the dock did not follow the walk');
  } finally {
    motion.reduced = false;
    railNode.textContent = '';
    railTitleWrites = 0;
    hall.scrollWidth = 5040;
    hall.clientWidth = 1440;
    hall.scrollLeft = 0;
    /* Back to the focused path, and to the window's original set of listeners,
       with the one flush the page would have. */
    listeners.set('window:resize', []);
    globalThis.Site.initLights();
    before.forEach((fn) => listeners.get('window:resize').push(fn));
  }
});

/* And the walk itself has to drive both of them. Everything above proves the
   functions; this proves the controller bound its tracking to the walk at all,
   which is the difference between a bar that follows the walk and two correct
   functions that nothing ever calls. */
check('the tracking flush is bound to the walk and drives the rail and the bar', () => {
  assert.ok((hall.listeners.get('scroll') || []).length > 0,
    'nothing is listening for the walk to scroll, so the rail and the bar never follow it');

  /* Identified by BEHAVIOUR, not by position in the listener list. The list is
     ordered by whoever registered first, which depends on which branch
     initLights() took — the stub's own [data-piece] list decides that — so an
     index here made the check break the moment the stub grew more realistic.
     The flush is now whichever resize handler moves the bar.

     More than one handler legitimately does: renderHero()'s own onResize sits
     on updateProgress()'s path too, because it re-reads the live dock name. So
     this asserts that the tracking is bound and reachable, not that it is the
     only thing on the path. Re-running the controller (the reduced-motion check
     above does) binds the same flush again, so the handlers are compared by
     identity: this is one flush, however many times it has been bound. */
  hall.scrollWidth = 5040;
  hall.clientWidth = 1440;
  hall.scrollLeft = 2700;
  const writers = [];
  (listeners.get('window:resize') || []).forEach((fn) => {
    if (writers.includes(fn)) return;
    el('dockProgress').style.removeProperty('--walk-progress');
    fn();
    if (el('dockProgress').style.get('--walk-progress') !== undefined) writers.push(fn);
  });
  assert.ok(writers.length > 0,
    'no resize handler moves the dock bar — the tracking flush is not bound to the walk');
  el('dockProgress').style.removeProperty('--walk-progress');
  writers[0]();
  assert.equal(el('dockProgress').style.get('--walk-progress'), '75%',
    'the flush bound to the walk did not move the dock\'s progress bar to the walk\'s position');
});

/* ── The global the renderer needs ───────────────────────────────────── */
check('Site.walk is exposed', () => {
  assert.ok(globalThis.Site.walk, 'initWalk did not run');
});

run();
