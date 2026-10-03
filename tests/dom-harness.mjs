/* A DOM just real enough to load and drive js/main.js under Node.
   The site loads classic scripts; a test has to import them as modules, so this
   provides the globals they touch. It reproduces structure and geometry, not
   rendering — nothing here proves a pixel looks right. */

function makeEl(id) {
  const styleValues = new Map();
  return {
    id,
    innerHTML: '',
    textContent: '',
    dataset: {},
    /* get() lets a test read back what the code wrote through setProperty. */
    style: {
      setProperty(name, value) { styleValues.set(name, String(value)); },
      removeProperty(name) { styleValues.delete(name); },
      get(name) { return styleValues.get(name); },
    },
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

/* `works` is the geometry the renderer would have produced: one entry per hung
   work with its offsetLeft/offsetWidth. */
function makeWorkEl(geom, index) {
  const el = makeEl('work' + index);
  return Object.assign(el, {
    dataset: { work: '' },
    offsetLeft: geom.left,
    offsetWidth: geom.width,
    offsetHeight: geom.height ?? 300,
  });
}

export async function loadSite({ reducedMotion = false, works = [] } = {}) {
  const els = new Map();
  const el = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
  /* The walk's two anchors must exist or initWalk returns null by design. */
  for (const id of ['strip', 'directory', 'navList', 'hall']) el(id);

  const workEls = works.map(makeWorkEl);
  const stripEl = el('strip');
  stripEl.querySelectorAll = (sel) => (sel === '[data-work]' ? workEls : []);

  const hall = el('hall');
  hall.scrollLeft = 0;
  hall.clientWidth = 1440;

  const listeners = new Map();
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

  const motion = { reduced: reducedMotion };
  globalThis.window = {
    innerWidth: 1440, innerHeight: 900, scrollY: 0, isSecureContext: false,
    addEventListener(type, fn) { listeners.set('window:' + type, fn); },
    removeEventListener() {},
    matchMedia: () => ({ matches: motion.reduced }),
    requestAnimationFrame: (fn) => { if (typeof fn === 'function') fn(0); return 0; },
    cancelAnimationFrame() {},
    getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    scrollTo() {},
    localStorage: { getItem: () => null, setItem() {} },
  };
  globalThis.getComputedStyle = globalThis.window.getComputedStyle;
  globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = globalThis.window.cancelAnimationFrame;

  /* Stubbed so the walk module runs without the vendored bundles. */
  globalThis.Lenis = function Lenis() {
    return { scrollTo() {}, resize() {}, stop() {}, start() {}, raf() {} };
  };
  globalThis.Snap = function Snap() {
    return { addElement() {}, resize() {}, stop() {}, start() {} };
  };

  /* data.js first, exactly as index.html loads it before main.js. */
  await import('../js/data.js');
  await import('../js/main.js');

  return {
    els, el, workEls, listeners, hall, strip: stripEl,
    /* The controller reads matchMedia on every call, so a test can flip the
       preference and re-run it. main.js itself is module-cached: a second
       loadSite() in one process returns new stubs that main.js never sees, so
       tests must reuse one scene. */
    setReducedMotion(on) { motion.reduced = !!on; },
  };
}
