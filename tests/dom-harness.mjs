/* A DOM just real enough to load and drive js/main.js under Node.
   The site loads classic scripts, so a test has to import them as modules and
   supply the globals they touch. It models structure, offsets and event
   listeners — NOT rendering, and not CSS: nothing here proves a pixel is right,
   and a layout rule can still be wrong with every check green.

   Two properties matter enough to call out, because their absence hid two real
   defects during this build:
     - `closest()` walks the real parent chain, so a delegated handler that
       tests `e.target.closest('[data-action="modal"]')` behaves as in a browser.
     - listeners are recorded and `click()` propagates to the document, so a
       control wired to a host element that no longer exists is VISIBLE as a
       click that does nothing. */

/* ── Element ─────────────────────────────────────────────────────────── */
let uid = 0;

function makeEl(tag, id) {
  const styleValues = new Map();
  const attributes = {};
  const camel = (n) => n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const dashed = (n) => n.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const el = {
    uid: ++uid,
    tagName: String(tag || 'div').toUpperCase(),
    id: id || '',
    innerHTML: '',
    textContent: '',
    /* dataset is a live view of the data-* attributes, as in a browser. A plain
       object here silently returns undefined for every dataset read, which makes
       delegated handlers look broken for the wrong reason. */
    dataset: new Proxy({}, {
      get: (_, k) => {
        const attr = 'data-' + dashed(String(k));
        return attr in attributes ? attributes[attr] : undefined;
      },
      set: (_, k, v) => { attributes['data-' + dashed(String(k))] = String(v); return true; },
      has: (_, k) => ('data-' + dashed(String(k))) in attributes,
      deleteProperty: (_, k) => { delete attributes['data-' + dashed(String(k))]; return true; },
      ownKeys: () => Object.keys(attributes).filter((k) => k.startsWith('data-')).map((k) => camel(k.slice(5))),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    }),
    className: '',
    /* get() lets a test read back what the code wrote through setProperty. */
    style: {
      setProperty(name, value) { styleValues.set(name, String(value)); },
      removeProperty(name) { styleValues.delete(name); },
      get(name) { return styleValues.get(name); },
    },
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, on) { if (on === undefined ? !this._set.has(c) : on) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    attributes,
    /* Geometry: page coords (left/top) plus the box. offsetLeft/offsetParent are
       derived from these and the tree, exactly as a browser resolves them. */
    rect: { left: 0, top: 0, width: 1, height: 1 },
    offsetWidth: 1, offsetHeight: 1, offsetParent: null, offsetTop: 0, tabIndex: -1,
    children: [],
    listeners: new Map(),
    setAttribute(k, v) { attributes[k] = String(v); if (k === 'class') this.className = String(v); },
    getAttribute(k) { return k in attributes ? attributes[k] : null; },
    removeAttribute(k) { delete attributes[k]; },
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    },
    removeEventListener() {},
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    focus() { globalThis.document.activeElement = this; },
    blur() { if (globalThis.document.activeElement === this) globalThis.document.activeElement = null; },
    /* The clipboard fallback creates a textarea and selects it. */
    select() {}, setSelectionRange() {},
    execCommand() { return true; },
    /* Dispatch a click that bubbles to the document, as a real one does. */
    click() { dispatchClick(this); },
    closest(sel) { return closestFrom(this, sel); },
    querySelector: () => null,
    querySelectorAll: () => [],
    /* offsetLeft is relative to the offsetParent: the nearest POSITIONED
       ancestor. The harness marks positioned boxes explicitly, so a controller
       that reads offsetLeft gets a room-relative number here exactly as it
       would in the browser. */
    get offsetLeft() {
      if (!this.offsetParent || !this.offsetParent.rect) return this.rect.left;
      return this.rect.left - this.offsetParent.rect.left;
    },
    getBoundingClientRect() {
      return {
        left: this.rect.left, top: this.rect.top,
        width: this.rect.width, height: this.rect.height,
        right: this.rect.left + this.rect.width,
        bottom: this.rect.top + this.rect.height,
      };
    },
  };
  /* children[i].parentNode for closest() */
  el.parentNode = null;
  return el;
}

/* A minimal selector engine: tag, #id, .class, [attr], [attr="value"], and
   compounds of those. Enough for the selectors main.js delegates on. */
function matches(el, sel) {
  return sel.split(',').some((one) => matchesOne(el, one.trim()));
}
function matchesOne(el, sel) {
  const m = sel.match(/^([a-zA-Z]*)((?:[.#][\w-]+|\[[^\]]+\])*)$/);
  if (!m) return false;
  const [, tag, rest] = m;
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  for (const part of rest.match(/[.#][\w-]+|\[[^\]]+\]/g) || []) {
    if (part[0] === '.') { if (!el.classList.contains(part.slice(1))) return false; }
    else if (part[0] === '#') { if (el.id !== part.slice(1)) return false; }
    else {
      const attr = part.slice(1, -1);
      const eq = attr.match(/^([\w-]+)(?:=["']?([^"']*)["']?)?$/);
      if (!eq) return false;
      const have = el.getAttribute(eq[1]);
      if (have === null) return false;
      if (eq[2] !== undefined && have !== eq[2]) return false;
    }
  }
  return true;
}
function closestFrom(el, sel) {
  for (let n = el; n; n = n.parentNode) if (n.tagName && matches(n, sel)) return n;
  return null;
}

/* ── Dispatch ────────────────────────────────────────────────────────── */
let docEl = null;
function dispatchClick(target) {
  const ev = { type: 'click', target, preventDefault() {}, stopPropagation() {} };
  for (let n = target; n; n = n.parentNode) {
    const fns = n.listeners && n.listeners.get('click');
    if (fns) fns.forEach((f) => f(ev));
  }
  if (docEl && !target.__noDoc) {
    const fns = docEl.listeners.get('click');
    if (fns) fns.forEach((f) => f(ev));
  }
  return ev;
}

/* ── The scene ───────────────────────────────────────────────────────── */
/* `rooms` is what the renderer would have produced, as real geometry:
   [{ left, width, works: [{ left, width, height, index }] }] where each work's
   `left` is measured from the START OF ITS ROOM — the numbers a browser gives
   for offsetLeft, because .room is the positioned ancestor. */
export async function loadSite({ reducedMotion = false, rooms = [] } = {}) {
  const els = new Map();
  const el = (id) => { if (!els.has(id)) els.set(id, makeEl('div', id)); return els.get(id); };
  /* The walk's two anchors (#hall, #strip must exist or initWalk returns null by
     design), the render targets, the announcer, and the dialog — without the
     dialog elements openModal/openGallery bail out and every control looks dead
     for the wrong reason. */
  for (const id of ['strip', 'directory', 'hall', 'announcer',
    'modalOverlay', 'modalCard', 'modalClose', 'modalHeader', 'modalImage', 'modalBody',
    'heroPhoto', 'heroBio', 'heroEmail', 'heroLinks',
    'newsTimeline', 'projectList', 'leadershipList', 'honorsList',
    'footerEmail', 'currentYear']) el(id);
  el('modalCard').setAttribute('role', 'dialog');
  el('modalCard').setAttribute('aria-modal', 'true');
  el('modalCard').setAttribute('aria-labelledby', 'modalTitle');
  el('modalOverlay').parentNode = null;

  const hall = el('hall');
  hall.scrollLeft = 0;
  hall.clientWidth = 1440;
  hall.offsetWidth = 1440;
  hall.rect = { left: 0, top: 0, width: 1440, height: 900 };

  const stripEl = el('strip');
  stripEl.parentNode = hall;
  hall.children.push(stripEl);

  const workEls = [];
  const roomEls = [];
  const plateEls = [];
  for (const [ri, room] of rooms.entries()) {
    const roomEl = makeEl('section');
    roomEl.setAttribute('data-room', room.key || 'Room' + ri);
    roomEl.rect = { left: room.left, top: 0, width: room.width, height: 900 };
    roomEl.offsetWidth = room.width;
    roomEl.offsetHeight = 900;
    /* .room { position: relative } — this is what makes offsetLeft room-relative. */
    roomEl.positioned = true;
    roomEl.parentNode = stripEl;
    stripEl.children.push(roomEl);
    roomEls.push(roomEl);

    for (const [wi, w] of (room.works || []).entries()) {
      const workEl = makeEl('article');
      workEl.setAttribute('data-work', '');
      workEl.rect = {
        left: room.left + w.left, top: 0,
        width: w.width, height: w.height ?? 300,
      };
      workEl.offsetWidth = w.width;
      workEl.offsetHeight = w.height ?? 300;
      workEl.offsetParent = roomEl;
      workEl.parentNode = roomEl;
      roomEl.children.push(workEl);

      /* The canvas button and label the renderer emits, so closest() and
         delegated clicks behave as they do in the page. The work canvas carries
         the same attributes renderWork puts on it — a modal trigger for a
         project, a gallery trigger for an honour. */
      const canvas = makeEl('button');
      canvas.className = 'project-hit canvas';
      canvas.positioned = false;
      canvas.offsetParent = roomEl;
      canvas.parentNode = workEl;
      canvas.rect = { left: workEl.rect.left, top: 0, width: w.width, height: (w.height ?? 300) - 100 };
      workEl.children.push(canvas);
      workEl.canvas = canvas;
      if (w.project) {
        canvas.setAttribute('data-action', 'modal');
        canvas.setAttribute('data-project', w.project);
        canvas.setAttribute('data-tab', 'overview');
      }
      if (w.gallery) {
        canvas.setAttribute('data-gallery', w.gallery);
        canvas.setAttribute('data-entry', String(w.entry));
      }

      workEls.push(workEl);
    }

    /* One leadership-style plate, a gallery trigger, so the delegated handler is
       exercised on both kinds of host. */
    const plate = makeEl('button');
    plate.className = 'plate';
    plate.setAttribute('data-gallery', 'leadership');
    plate.setAttribute('data-entry', '0');
    plate.parentNode = roomEl;
    plate.offsetParent = roomEl;
    roomEl.children.push(plate);
    roomEl.plate = plate;
    plateEls.push(plate);
  }
  stripEl.querySelectorAll = (sel) => {
    if (sel === '[data-work]') return workEls;
    if (sel === '[data-room]') return roomEls;
    if (sel === '[data-snap]') return roomEls;   /* rooms carry data-snap */
    return [];
  };
  /* A room's title, as renderRooms emits it. */
  for (const [ri, roomEl] of roomEls.entries()) {
    const title = makeEl('span');
    title.className = 't';
    title.textContent = rooms[ri].title || rooms[ri].key || '';
    title.parentNode = roomEl;
    roomEl.children.push(title);
    roomEl.querySelector = (sel) => (sel === '.room-title .t' ? title : null);
  }

  const listeners = new Map();
  docEl = {
    readyState: 'complete',
    activeElement: null,
    documentElement: makeEl('html'),
    body: makeEl('body'),
    listeners: new Map(),
    getElementById: (id) => els.get(id) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => makeEl(tag),
    createDocumentFragment: () => makeEl('fragment'),
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    },
    removeEventListener() {},
  };
  globalThis.document = docEl;

  /* The two copy buttons the rooms emit (About and Contact). */
  const copyEls = [];
  for (let i = 0; i < 2; i++) {
    const c = makeEl('button');
    c.className = 'plate-link lit';
    c.setAttribute('data-action', 'copy');
    c.setAttribute('data-copy', 'andrew.alangcao@gmail.com');
    c.parentNode = docEl.body;
    docEl.body.children.push(c);
    copyEls.push(c);
  }

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
    els, el, workEls, roomEls, plateEls, copyEls, listeners, hall, strip: stripEl,
    announcer: el('announcer'), document: docEl,
    click: (node) => dispatchClick(node),
    /* Main.js is module-cached: a second loadSite() in one process returns stubs
       main.js never sees, so a test must reuse one scene. */
    setReducedMotion(on) { motion.reduced = !!on; },
  };
}
