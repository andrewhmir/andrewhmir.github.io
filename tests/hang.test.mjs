/* The photograph budget and the hang arrangements.
   Both are pure: they decide what hangs and how, with no DOM and no CSS, so
   they are pinned here rather than through the renderer's DOM stub. */
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { groupPieces, MIN_PIECES, MAX_PIECES, PLACEHOLDER } = globalThis.Site;

check('a group hangs at least three frames', () => {
  assert.equal(groupPieces({ description: 'x', images: ['a.jpg'] }, 'record').length, MIN_PIECES);
  assert.equal(groupPieces({ description: 'x' }, 'record').length, MIN_PIECES);
  assert.equal(groupPieces({ id: 'p' }, 'project').length, MIN_PIECES);
});

check('a null record yields no pieces rather than throwing', () => {
  assert.deepEqual(groupPieces(null, 'record'), []);
  assert.deepEqual(groupPieces(undefined, 'project'), []);
});

check('padding is appended, so the lead is a real photograph', () => {
  const pieces = groupPieces({ images: ['a.jpg', 'b.jpg'] }, 'record');
  assert.deepEqual(pieces.map((p) => p.src), ['a.jpg', 'b.jpg', PLACEHOLDER]);
  assert.deepEqual(pieces.map((p) => p.awaited), [false, false, true]);
});

check('a record past six photographs hangs the first six', () => {
  const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((n) => n + '.jpg');
  const pieces = groupPieces({ images: eight }, 'record');
  assert.equal(pieces.length, MAX_PIECES);
  assert.deepEqual(pieces.map((p) => p.src), eight.slice(0, MAX_PIECES));
});

check('a record whose image is the placeholder is awaited, not named after its file', () => {
  const pieces = groupPieces({ images: [PLACEHOLDER] }, 'record');
  assert.equal(pieces[0].awaited, true);
  assert.equal(pieces[0].src, PLACEHOLDER);
});

check('every shipped record hangs between the floor and the ceiling', () => {
  const P = globalThis.PORTFOLIO;
  const all = [
    ...P.projects.map((p) => [p, 'project']),
    ...P.leadership.map((l) => [l, 'record']),
    ...P.honors.map((h) => [h, 'record']),
  ];
  const bad = all
    .map(([rec, kind]) => ({ name: rec.title || rec.description, n: groupPieces(rec, kind).length }))
    .filter(({ n }) => n < MIN_PIECES || n > MAX_PIECES);
  assert.deepEqual(bad, [], 'outside the budget: ' + JSON.stringify(bad));
});

/* ── The arrangements ────────────────────────────────────────────────────
   An arrangement is a partition of a group's photographs into columns. The
   wall is hung from it and the label's plan is drawn from it, so a partition
   that loses an index hangs a photograph nowhere and a plan that disagrees
   with it is a picture of a different wall. */
const { HANG_LAYOUTS, hangLayout } = globalThis.Site;

check('every count from the floor to the ceiling has an arrangement', () => {
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    assert.ok(Array.isArray(HANG_LAYOUTS[n]) && HANG_LAYOUTS[n].length >= 1,
      'no arrangement for ' + n + ' photographs');
  }
});

check('every arrangement covers its pieces exactly once', () => {
  const bad = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    HANG_LAYOUTS[n].forEach((l) => {
      const flat = l.columns.flat().slice().sort((a, b) => a - b);
      const want = Array.from({ length: n }, (_, i) => i);
      if (JSON.stringify(flat) !== JSON.stringify(want)) bad.push(l.name + ' does not partition ' + n);
      if (l.columns.some((c) => c.length === 0)) bad.push(l.name + ' has an empty column');
      if (!(l.lead >= 0 && l.lead < n)) bad.push(l.name + ' has no lead');
      if (l.drop.length !== l.columns.length) bad.push(l.name + ' has no drop per column');
    });
    if (new Set(HANG_LAYOUTS[n].map((x) => x.name)).size !== HANG_LAYOUTS[n].length) {
      bad.push(n + ' has two arrangements with the same name');
    }
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

/* The depth bound is a layout contract, not a preference: the stylesheet
   divides a room's band between a column's own frames, so a column of five
   would hang five frames one-fifth of the band tall — measured at 96x54 on a
   1536x864 screen before this bound existed. A fifth photograph is meant to
   widen a stand, not to shrink every photograph on it. */
const MAX_DEPTH = 3;

check('no arrangement hangs a column deeper than the band can carry', () => {
  const bad = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    HANG_LAYOUTS[n].forEach((l) => {
      l.columns.forEach((c, ci) => {
        if (c.length > MAX_DEPTH) bad.push(l.name + ' column ' + ci + ' is ' + c.length + ' deep');
      });
    });
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the chooser never returns a column deeper than the bound', () => {
  const bad = [];
  for (let n = 0; n <= 9; n++) {
    for (const key of ['k', 'honors:3', 'Robotics:0', 'Leadership:2', 42]) {
      const l = hangLayout(key, n);
      l.columns.forEach((c) => { if (c.length > Math.max(MAX_DEPTH, 1)) bad.push(l.name + ' at ' + n); });
    }
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('an arrangement is stable for a given group', () => {
  assert.equal(hangLayout('honors:3', 4).name, hangLayout('honors:3', 4).name);
  assert.equal(hangLayout('Robotics:0', 3).name, hangLayout('Robotics:0', 3).name);
});

check('the chooser is total — any count and any key', () => {
  [[0, 0], [2, 2], [9, 9], [3, 3]].forEach(([count, want]) => {
    assert.equal(hangLayout('k', count).columns.flat().length, want, 'count ' + count);
  });
  assert.equal(hangLayout(undefined, 3).columns.flat().length, 3);
  assert.equal(hangLayout(null, 3).columns.flat().length, 3);
  assert.equal(hangLayout(42, 4).columns.flat().length, 4);
  assert.doesNotThrow(() => hangLayout('k', 'nonsense'));
  assert.equal(hangLayout('k', 'nonsense').columns.flat().length, 0);
});

check('the shipped portfolio does not collapse onto one arrangement', () => {
  const P = globalThis.PORTFOLIO;
  const used = new Set();
  const note = (key, rec, kind) => used.add(hangLayout(key, groupPieces(rec, kind).length).name);
  P.projects.forEach((p, i) => note(p.category + ':' + i, p, 'project'));
  P.leadership.forEach((l, i) => note('leadership:' + i, l, 'record'));
  P.honors.forEach((h, i) => note('honors:' + i, h, 'record'));
  assert.ok(used.size > 1, 'every group was dealt the same arrangement: ' + [...used].join(', '));
});

run();
