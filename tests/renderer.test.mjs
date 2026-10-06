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
const renderLabelFor = Site.renderLabel;
const strip = el('strip').innerHTML;
const directory = el('directory').innerHTML;
const titles = [...strip.matchAll(/<span class="t">([^<]+)<\/span>/g)].map((m) => m[1]);

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
   One label per group: a plan of the hang, the narrative that frames the
   group, and a catalogue entry per photograph. This is where a photograph
   gets its text, so a group shipping without one is a group whose
   photographs are never explained. */
check('every group carries a plan, a narrative and a catalogue', () => {
  const groups = strip.split('<div class="group"').slice(1);
  assert.ok(groups.length > 0, 'no groups rendered');
  const bad = [];
  groups.forEach((g, i) => {
    if (!/<div class="plan"/.test(g)) bad.push('group ' + i + ': no plan');
    const title = g.match(/<p class="narr-title">([^<]*)<\/p>/);
    if (!title || !title[1].trim()) bad.push('group ' + i + ': no narrative title');
    const text = g.match(/<p class="narr-text">([^<]*)<\/p>/);
    if (!text || !text[1].trim()) bad.push('group ' + i + ': empty narrative');
    if (!/class="cat-entry"/.test(g) && !/class="ca-note"/.test(g)) {
      bad.push('group ' + i + ': neither a catalogue entry nor an awaited note');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the catalogue has one entry per photograph, and names the awaited ones once', () => {
  /* A group whose photographs are all awaited gets no catalogue entry at all,
     only the note: three entries reading "Photograph awaited" is not a
     catalogue, it is a stutter. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    /* Bound the group at the next group, so the count cannot pick up a
       neighbouring group's catalogue. */
    const body = g.split('<div class="group"')[0];
    const frames  = (body.match(/class="piece[" ]/g) || []).length;
    const awaited = (body.match(/class="piece piece--pending/g) || []).length;
    const entries = (body.match(/class="cat-entry"/g) || []).length;
    const notes   = (body.match(/class="ca-note"/g) || []).length;
    if (entries !== frames - awaited) {
      bad.push('group ' + i + ': ' + entries + ' entries for ' + (frames - awaited) + ' photographs');
    }
    if (notes !== (awaited > 0 ? 1 : 0)) {
      bad.push('group ' + i + ': ' + notes + ' awaited notes for ' + awaited + ' awaited frames');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('no frame on the wall carries a letter', () => {
  /* The letter began as a badge on the frame, so a visitor reading entry C could
     find C on the photograph. On the wall it is a mark on the picture — a dark
     box in the corner of a work — and the letters are read in the label anyway:
     the plan draws the same hang, and the catalogue beneath it names each
     photograph. So the frame hangs clean and the label carries the letters. */
  const walled = [...strip.matchAll(/<span class="piece-(?:key|wrap)\b[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(walled, [], walled.length + ' letters still on the wall');
});

check('the plan and the catalogue carry the letters, and cover every frame', () => {
  /* Two places a letter appears, both keyed on the PIECE index: the plan's box
     and the catalogue entry. They cannot disagree about which photograph is
     which, and between them they account for every hung frame — a letter no box
     draws is a photograph nobody can find. Awaited frames are lettered too:
     they are hung frames and the plan draws them.

     The letters are the piece indices, so they are NOT in document order: a lead
     hangs in a column of its own, and in a "two-lead" arrangement that column is
     the second one — the frame a visitor reads first is photograph A. What has
     to hold is that the boxes cover every frame, and cover nothing twice. */
  const bad = [];
  const range = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const frames = (body.match(/class="piece[" ]/g) || []).length;
    const keys = [...body.matchAll(/<span class="ce-key">([A-Z])<\/span>/g)].map((m) => m[1]);
    const plan = (body.match(/<div class="plan"[\s\S]*?<\/div>\s*<div class="narr"/) || [''])[0];
    const boxes = [...plan.matchAll(/<i class="pi[^"]*">([A-Z])<\/i>/g)].map((m) => m[1]);
    const sorted = (a) => a.slice().sort().join('');
    if (frames > 1) {
      if (sorted(boxes) !== range(frames).join('')) {
        bad.push('group ' + i + ': the plan draws ' + boxes.join('') + ' for ' + frames + ' frames');
      }
      /* Every catalogue entry must have its box: an entry for a letter the plan
         does not draw names a photograph nobody can find. */
      const orphan = keys.filter((k) => !boxes.includes(k));
      if (orphan.length) bad.push('group ' + i + ': entries ' + orphan.join('') + ' have no box in the plan');
    } else if (keys.length || boxes.length) {
      /* One photograph needs no letter: there is nothing to tell apart. */
      bad.push('group ' + i + ': a single-photograph stand is lettered');
    }
  });
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

check('the plan is hidden from assistive tech', () => {
  /* It is a picture of the hang; the catalogue already names every piece in
     order, so a screen reader reading both would hear the group twice. */
  const plans = [...strip.matchAll(/<div class="plan"[^>]*>/g)].map((m) => m[0]);
  assert.ok(plans.length > 0, 'no plan rendered');
  plans.forEach((p) => assert.match(p, /aria-hidden="true"/, 'a plan is not aria-hidden'));
});

check('the label reads plan, narrative, catalogue — in that order', () => {
  /* The label is a column now, not a strip: it stacks downward beside the
     cluster. The order is what makes it a museum label rather than a caption,
     and it is the only part of that the DOM alone can pin — the direction
     itself is CSS. */
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const order = ['class="plan"', 'class="narr"', 'class="cat"'].map((needle) => body.indexOf(needle));
    if (order.some((n) => n < 0)) { bad.push('group ' + i + ': a label part is missing'); return; }
    if (JSON.stringify(order) !== JSON.stringify(order.slice().sort((a, b) => a - b))) {
      bad.push('group ' + i + ': the label does not read plan, narrative, catalogue');
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the plan draws the arrangement the wall hangs', () => {
  /* The plan is a picture of the hang, so its box count has to match the
     wall's AND its columns have to be the same columns. Drawn from a piece
     count it could only ever be a picture of something else. */
  const named = new Map();
  Object.values(Site.HANG_LAYOUTS).flat().forEach((l) => named.set(l.name, l));
  const bad = [];
  strip.split('<div class="group"').slice(1).forEach((g, i) => {
    const body = g.split('<div class="group"')[0];
    const plan = body.match(/<div class="plan"[\s\S]*?<\/div>/);
    if (!plan) { bad.push('group ' + i + ': no plan'); return; }
    const boxes = (plan[0].match(/<i class=/g) || []).length;
    const frames = (body.match(/class="piece[" ]/g) || []).length;
    if (boxes !== frames) bad.push('group ' + i + ': ' + boxes + ' boxes for ' + frames + ' frames');
    const layout = named.get((body.match(/data-hang="([^"]+)"/) || [])[1]);
    const cols = (plan[0].match(/<span class="pcol"/g) || []).length;
    if (layout && cols !== layout.columns.length) {
      bad.push('group ' + i + ': plan has ' + cols + ' columns, wall has ' + layout.columns.length);
    }
  });
  assert.deepEqual(bad, [], bad.join(' | '));
  /* And the honours groups with a single real photograph are among them. */
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
    const html = renderLabelFor(h, pieces, Site.hangLayout('test', pieces.length));
    assert.ok(!/photographs?<\/p>/.test(html.split('class="narr-text"')[0]),
      'a photograph-less group still claims photographs: ' + h.description);
  });
});

check('a record with no summary still renders a narrative', () => {
  const stripped = { description: 'Some Award – Champion', year: '2026' };
  const pieces = Site.groupPieces(stripped, 'record');
  const html = renderLabelFor(stripped, pieces, Site.hangLayout('test', pieces.length));
  assert.match(html, /Some Award/, 'fell through to nothing');
  assert.match(html, /class="narr-text">[^<]*Some Award/, 'the narrative is empty');
});

check('a pieces array shorter than images falls back per entry', () => {
  const record = { description: 'X', images: ['a.jpg', 'b.jpg'], pieces: [{ title: 'Only one' }] };
  const pieces = Site.groupPieces(record, 'record');
  const html = renderLabelFor(record, pieces, Site.hangLayout('test', pieces.length));
  assert.match(html, /Only one/, 'the first entry lost its title');
  assert.match(html, /Photograph B/, 'the missing tail did not fall back');
});

check('a pieces array longer than images is ignored, not thrown', () => {
  const record = { description: 'X', images: ['a.jpg'], pieces: [{ title: 'A' }, { title: 'B' }] };
  const pieces = Site.groupPieces(record, 'record');
  const layout = Site.hangLayout('test', pieces.length);
  assert.doesNotThrow(() => renderLabelFor(record, pieces, layout));
  const html = renderLabelFor(record, pieces, layout);
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
  const project = renderLabelFor(projectRecord, projectPieces,
    Site.hangLayout('test', projectPieces.length));
  assert.match(project, /Project X/);
  assert.match(project, /August 2025/);
  const recordRecord = { description: 'Some Honour', year: 'April 2026' };
  const recordPieces = Site.groupPieces(recordRecord, 'record');
  const record = renderLabelFor(recordRecord, recordPieces,
    Site.hangLayout('test', recordPieces.length));
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

check('every project with awards has a control that opens them', () => {
  /* The dialog is the ONLY place a project's awards can be read — eight honours
     were moved off the wall into it — so a project whose awards are in the data
     but have no control in the walk has silently lost them. The control is on
     the group's label, because the walk hangs groups and has no cards. */
  const withAwards = PORTFOLIO.projects.filter((p) => Array.isArray(p.awards) && p.awards.length);
  assert.ok(withAwards.length > 0, 'fixture needs a project with awards');
  withAwards.forEach((p) => {
    assert.match(strip, new RegExp(
      '<button[^>]*data-action="modal"[^>]*data-project="' + p.id + '"[^>]*data-tab="awards"'),
      p.title + ' has awards in the data and no control in the walk');
  });
  const buttons = (strip.match(/data-tab="awards"/g) || []).length;
  assert.equal(buttons, withAwards.length,
    buttons + ' awards controls for ' + withAwards.length + ' projects with awards');
});

check('every award entry can be named in a dialog', () => {
  /* The dialog is the only place a project's awards can be read, and it renders
     each entry's description and year. An entry missing either would render a
     blank row rather than throw, so the shape is pinned here. */
  PORTFOLIO.projects.filter((p) => p.awards).forEach((p) => {
    p.awards.forEach((a) => {
      assert.equal(typeof a.description, 'string', p.title + ' has an unnamed award');
      assert.ok(a.description.trim(), p.title + ' has an empty award description');
      assert.equal(typeof a.year, 'string', p.title + ' award "' + a.description + '" has no year');
      assert.ok(a.year.trim(), p.title + ' award "' + a.description + '" has an empty year');
    });
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
