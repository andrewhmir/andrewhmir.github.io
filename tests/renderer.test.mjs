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
  return {
    id,
    innerHTML: '',
    textContent: '',
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    attributes: {},
    offsetLeft: 0, offsetWidth: 1, offsetHeight: 1, offsetParent: null, tabIndex: -1,
    children: [],
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, focus() {}, blur() {}, click() {}, closest: () => null,
    querySelector: () => null, querySelectorAll: () => [],
  };
}

const els = new Map();
const el = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
/* Current markup: the renderer's output targets, plus the walk's two anchors.
   #hall must exist or initWalk returns null by design. */
for (const id of ['strip', 'directory', 'rail', 'hall']) el(id);

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

globalThis.window = {
  innerWidth: 1440, innerHeight: 900, scrollY: 0, isSecureContext: false,
  addEventListener(type, fn) { listeners.set('window:' + type, fn); },
  removeEventListener() {}, matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
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
const strip = el('strip').innerHTML;
const directory = el('directory').innerHTML;
const titles = [...strip.matchAll(/<span class="t">([^<]+)<\/span>/g)].map((m) => m[1]);

/* ── The DOM contract ────────────────────────────────────────────────── */
check('the walk carries the rooms in order, honours split four ways', () => {
  const roomKeys = [...strip.matchAll(/data-room="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(roomKeys, ['About', 'Robotics', 'Applications', 'Leadership',
    'Honours — I', 'Honours — II', 'Honours — III', 'Honours — IV', 'Contact']);
});

check('room titles name every room', () => {
  assert.deepEqual(titles, ['About', 'Works in Robotics', 'Works in Applications', 'Leadership',
    'Honours · I', 'Honours · II', 'Honours · III', 'Honours · IV', 'Contact']);
});

/* The honours rooms, in walk order, each bounded at its own closing tag so
   one room's markup cannot leak into the next. */
const honoursStrip = ['Honours — I', 'Honours — II', 'Honours — III', 'Honours — IV']
  .map((k) => (strip.split('data-room="' + k + '"')[1] || '').split('</section>')[0])
  .join('');

check('every record hangs as exactly one group', () => {
  /* The unit that hangs is the record, not the photograph. The entry key is
     scoped by room, because project indices restart in every project room. */
  const groups = [...strip.matchAll(/data-group data-kind="([^"]+)" data-entry="([^"]+)"/g)];
  const projects = groups.filter((m) => m[1] === 'project').length;
  const honours = groups.filter((m) => m[1] === 'honors').length;
  const posts = groups.filter((m) => m[1] === 'leadership').length;
  assert.equal(projects, PORTFOLIO.projects.length, 'projects hang as ' + projects + ' groups');
  assert.equal(honours, PORTFOLIO.honors.length, 'honours hang as ' + honours + ' groups');
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

check('every room holds its groups in the grid', () => {
  /* A room is one viewport tall with no vertical axis, so its groups live in
     a fixed grid of known rows rather than a wrapping flow. */
  for (const room of ['Robotics', 'Applications', 'Leadership', 'Honours — I', 'Honours — II', 'Honours — III', 'Honours — IV']) {
    const section = strip.split('data-room="' + room + '"')[1].split('</section>')[0];
    assert.match(section, /<div class="groups">/, room + ' has no group grid');
  }
});

check('every group hangs at least one piece', () => {
  const groups = strip.split('<div class="group"').slice(1);
  assert.ok(groups.length > 0, 'no groups rendered at all');
  groups.forEach((g, i) => {
    assert.match(g, /class="piece" data-piece="0"/, 'group ' + i + ' has no first piece');
  });
});

check('no photograph is dropped or duplicated by grouping', () => {
  /* Grouping must be a partition of the photographs, not a filter: the check
     that catches a grouping bug silently hiding an image. */
  const rendered = [...strip.matchAll(/<img src="([^"]+)"[^>]*loading="lazy"/g)].map((m) => m[1]);
  const expected = [];
  PORTFOLIO.honors.forEach((h) => Site.groupPieces(h, 'record').forEach((p) => expected.push(p.src)));
  PORTFOLIO.leadership.forEach((l) => Site.groupPieces(l, 'record').forEach((p) => expected.push(p.src)));
  PORTFOLIO.projects.forEach((p) => Site.groupPieces(p, 'project').forEach((x) => expected.push(x.src)));
  const count = (arr, v) => arr.filter((x) => x === v).length;
  [...new Set(expected)].forEach((src) => {
    assert.equal(count(rendered, src), count(expected, src), 'piece count differs for ' + src);
  });
});

check('a single-piece group claims slot a and grows it', () => {
  /* Most honours are single-photograph. A lone piece must fill the cluster
     rather than sit in slot a at slot a's size, which would read as a
     truncated composition. */
  const single = Site.groupPieces({ description: 'x', images: ['only.jpg'] }, 'record');
  assert.equal(single.length, 1);
  const groups = strip.split('<div class="group"').slice(1);
  const withOne = groups.filter((g) => (g.match(/class="piece"/g) || []).length === 1);
  assert.ok(withOne.length > 0, 'no single-piece group in the strip');
  withOne.forEach((g) => {
    assert.match(g, /--h:160px/, 'a lone piece does not take the grown slot');
  });
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

check('every honours record hangs as a group', () => {
  /* The old build split the honours room into photo-bearing works and
     photo-less plates. A record with no photographs is now a group with one
     placeholder piece, so no honour is dropped — and the three-way split must
     not lose one either. */
  const groups = (honoursStrip.match(/data-group data-kind="honors"/g) || []).length;
  assert.equal(groups, PORTFOLIO.honors.length,
    groups + ' honours groups, expected ' + PORTFOLIO.honors.length);
});

check('a piece whose photo is missing falls back to the placeholder', () => {
  /* Every honour that declares no photographs at all hangs exactly one
     labelled placeholder. On a near-black wall an empty frame is a
     conspicuous hole. */
  const placeholders = (honoursStrip.match(/src="files\/PlaceHolder\.png"/g) || []).length;
  const noPhoto = PORTFOLIO.honors.filter((h) => !Array.isArray(h.images) || !h.images.length).length;
  assert.equal(placeholders, noPhoto, placeholders + ' placeholders, expected ' + noPhoto);
});

check('no photo-less honour is a gallery trigger', () => {
  /* A record with no photos must have no handle to open anything: it cannot
     open a neighbour's photographs if there is nothing to click. The group's
     placeholder piece carries no data-gallery at all. */
  const leaked = PORTFOLIO.honors
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !Array.isArray(h.images) || !h.images.length)
    .filter(({ i }) => new RegExp('data-gallery="honors"\\s+data-entry="honors:' + i + '"').test(strip))
    .map(({ h }) => h.description);
  assert.deepEqual(leaked, [], 'photo-less rows are clickable: ' + leaked.join(' | '));
});

check('every honours gallery row opens its own honour', () => {
  /* The defect: the emitted index was the position within a filtered loop while
     the lookup indexed the unfiltered array, so a photo-less row shifted every
     later row's index and clicking one opened another's photographs. Each
     emitted index must therefore name the very row that carries it. */
  const rows = [...strip.matchAll(/data-group data-kind="honors" data-entry="honors:(\d+)"/g)]
    .map((m) => Number(m[1]));
  assert.ok(rows.length > 0, 'no honours groups rendered');
  assert.equal(rows.length, PORTFOLIO.honors.length, 'not every honour is hung');
  assert.equal(new Set(rows).size, rows.length, 'two honours groups share one index');
  rows.forEach((i) => {
    const entry = PORTFOLIO.honors[i];
    assert.ok(entry, 'data-entry honors:' + i + ' is not an honour');
  });
  /* And each photograph that can be opened belongs to a record that has some:
     a photo-less record gets no handler at all. */
  const clickable = [...strip.matchAll(/data-gallery="honors" data-entry="honors:(\d+)"/g)]
    .map((m) => Number(m[1]));
  clickable.forEach((i) => {
    const entry = PORTFOLIO.honors[i];
    assert.ok(Array.isArray(entry.images) && entry.images.length,
      'data-entry honors:' + i + ' points at a photo-less honour');
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

check('the rail is in the shell and hidden from assistive tech', () => {
  /* The DOM stub fabricates elements named in its id list, so it cannot tell
     whether the shell actually has a rail. Read the markup. */
  const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(shell, /<div class="rail"[^>]*aria-hidden="true"/,
    'the shell has no aria-hidden rail');
  assert.ok(!/class="directory"/.test(shell), 'the top directory band is still in the shell');
});

/* ── The global the renderer needs ───────────────────────────────────── */
check('Site.walk is exposed', () => {
  assert.ok(globalThis.Site.walk, 'initWalk did not run');
});

run();
