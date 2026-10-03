/* Renderer contract, checked without a browser.
   js/main.js is an IIFE that renders on load, so a minimal DOM stub is enough
   to run it and read back what it wrote. This asserts the DOM contract later
   tasks and tools/ux-check.mjs consume: the elements, their counts, and that no
   work is hung without an image — the check that catches an empty frame. */
import assert from 'node:assert/strict';
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
for (const id of ['strip', 'directory', 'navList', 'hall']) el(id);

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
const strip = el('strip').innerHTML;
const directory = el('directory').innerHTML;
const titles = [...strip.matchAll(/<span class="t">([^<]+)<\/span>/g)].map((m) => m[1]);

/* ── The DOM contract ────────────────────────────────────────────────── */
check('six rooms, in walk order', () => {
  const roomKeys = [...strip.matchAll(/data-room="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(roomKeys, ['About', 'Robotics', 'Applications', 'Leadership', 'Honours', 'Contact']);
});

check('room titles are the six the spec names', () => {
  assert.deepEqual(titles, ['About', 'Works in Robotics', 'Works in Applications', 'Leadership', 'Honours', 'Contact']);
});

check('every project hangs exactly once', () => {
  /* Count the <article>, not the [data-project] attribute: renderWork puts it
     on both the article and its button, so the attribute appears twice. */
  const ids = [...strip.matchAll(/<article class="work"[^>]*data-project="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, PORTFOLIO.projects.length);
  assert.equal(new Set(ids).size, ids.length);
});

check('the About and Contact rooms are snap targets themselves', () => {
  assert.ok(/data-room="About" data-snap/.test(strip), 'About is not a snap target');
  assert.ok(/data-room="Contact" data-snap/.test(strip), 'Contact is not a snap target');
});

check('work rooms are not snap targets', () => {
  assert.ok(!/data-room="Robotics" data-snap/.test(strip),
    'a work room carries data-snap, which would fight its works');
});

/* ── Task 5 Step 8: no work hangs empty ──────────────────────────────── */
check('every hung work has an image', () => {
  const works = strip.split('<article class="work"').slice(1);
  const withImg = works.filter((w) => /<img /.test(w));
  assert.ok(works.length > 0, 'no works rendered at all');
  assert.equal(works.length, withImg.length,
    (works.length - withImg.length) + ' of ' + works.length + ' frames empty');
});

check('poster fallback is used when a project has no still', () => {
  const posters = [...strip.matchAll(/src="(files\/posters\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(posters, [], 'unexpected poster fallback: ' + posters.join(', '));
});

/* ── Photo-less honours must not open a neighbour's gallery ──────────── */
check('gallery rows carry their real array index', () => {
  const rows = [...strip.matchAll(/data-gallery="([^"]+)" data-entry="(\d+)"/g)];
  assert.ok(rows.length > 0, 'no gallery rows rendered');
  rows.forEach((m) => assert.ok(Number(m[2]) >= 0, 'bad index on ' + m[1]));
});

check('honours split into plates and works with none dropped', () => {
  const honours = strip.split('data-room="Honours"')[1] || '';
  const plates = (honours.match(/class="plate"/g) || []).length;
  const works = (honours.match(/<article class="work"/g) || []).length;
  const noPhoto = PORTFOLIO.honors.filter((h) => !Array.isArray(h.images) || !h.images.length).length;
  const withPhoto = PORTFOLIO.honors.length - noPhoto;
  assert.equal(plates, noPhoto, plates + ' plates, expected ' + noPhoto);
  assert.equal(works, withPhoto, works + ' works, expected ' + withPhoto);
});

check('no photo-less honour is a gallery trigger', () => {
  /* A row with no photos must have no handle to open anything: it cannot open a
     neighbour's photographs if there is nothing to click. */
  const leaked = PORTFOLIO.honors
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !Array.isArray(h.images) || !h.images.length)
    .filter(({ i }) => new RegExp('data-gallery="honors"\\s+data-entry="' + i + '"').test(strip))
    .map(({ h }) => h.description);
  assert.deepEqual(leaked, [], 'photo-less rows are clickable: ' + leaked.join(' | '));
});

check('every honours gallery row opens its own honour', () => {
  /* The defect: the emitted index was the position within a filtered loop while
     the lookup indexed the unfiltered array, so a photo-less row shifted every
     later row's index and clicking one opened another's photographs. Each
     emitted index must therefore name the very row that carries it. */
  const rows = [...strip.matchAll(/data-gallery="honors"[^>]*data-entry="(\d+)"/g)]
    .map((m) => Number(m[1]));
  assert.ok(rows.length > 0, 'no honours gallery rows rendered');
  rows.forEach((i) => {
    const entry = PORTFOLIO.honors[i];
    assert.ok(entry, 'data-entry ' + i + ' is not an honour');
    assert.ok(Array.isArray(entry.images) && entry.images.length,
      'data-entry ' + i + ' points at a photo-less honour');
  });
  assert.equal(new Set(rows).size, rows.length, 'two rows share one index');
});

/* ── The directory ───────────────────────────────────────────────────── */
check('directory lists every room and nothing else', () => {
  const goto = [...directory.matchAll(/data-goto="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(goto, ['About', 'Robotics', 'Applications', 'Leadership', 'Honours', 'Contact']);
});

check('every directory entry is a real button', () => {
  assert.ok(/<button type="button" class="room-link"/.test(directory), 'not a button');
});

check('directory targets all exist as rooms', () => {
  const goto = [...directory.matchAll(/data-goto="([^"]+)"/g)].map((m) => m[1]);
  const missing = goto.filter((k) => !strip.includes('data-room="' + k + '"'));
  assert.deepEqual(missing, [], 'no room for: ' + missing.join(', '));
});

/* ── The global the renderer needs ───────────────────────────────────── */
check('Site.walk is exposed', () => {
  assert.ok(globalThis.Site.walk, 'initWalk did not run');
});

run();
