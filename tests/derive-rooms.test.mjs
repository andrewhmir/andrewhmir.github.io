/* Room derivation. The `node:test` import of the plan's draft is dropped: these
   checks register with tests/harness.mjs, so that import was unused and its
   side effects are not wanted here. */
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { deriveRooms } = globalThis.Site;

check('splits the real portfolio into the two known rooms', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.deepEqual(rooms.map(r => r.key), ['Robotics', 'Applications']);
  assert.deepEqual(rooms.map(r => r.projects.length), [3, 3]);
});

check('titles come from ROOM_TITLES', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.equal(rooms[0].title, 'Works in Robotics');
  assert.equal(rooms[1].title, 'Works in Applications');
});

check('every project appears exactly once across all rooms', () => {
  const projects = globalThis.PORTFOLIO.projects;
  const placed = deriveRooms(projects).flatMap(r => r.projects.map(p => p.id));
  assert.equal(placed.length, projects.length);
  assert.equal(new Set(placed).size, projects.length);
});

check('an uncategorised project is kept, not dropped', () => {
  const rooms = deriveRooms([
    { id: 'a', category: 'Robotics' },
    { id: 'orphan' },
  ]);
  const placed = rooms.flatMap(r => r.projects.map(p => p.id));
  assert.ok(placed.includes('orphan'), 'orphan must not vanish from the walk');
});

/* ── The pieces of a group ───────────────────────────────────────────────
   One record is one group; a group's pieces are its photographs, in declared
   order. Every branch below is a real shape in js/data.js, not a hypothetical:
   four honours declare no images at all, and two projects point their team
   photograph at the placeholder. */
const { groupPieces, PLACEHOLDER, MIN_PIECES, MAX_PIECES } = globalThis.Site;

check('a record with no images still hangs a full composition', () => {
  const pieces = groupPieces({ description: 'x', year: '2026' }, 'record');
  assert.equal(pieces.length, MIN_PIECES);
  assert.ok(pieces.every(p => p.src === PLACEHOLDER && p.awaited), 'an awaited frame is not marked');
});

check('a record with three images yields three pieces in order', () => {
  const pieces = groupPieces({ images: ['a.jpg', 'b.jpg', 'c.jpg'] }, 'record');
  assert.deepEqual(pieces.map(p => p.src), ['a.jpg', 'b.jpg', 'c.jpg']);
  assert.ok(pieces.every(p => !p.awaited), 'a real photograph is marked awaited');
});

check('blank entries in an images array are not hung as pieces', () => {
  const pieces = groupPieces({ images: ['a.jpg', '', null, 'b.jpg'] }, 'record');
  assert.deepEqual(pieces.map(p => p.src), ['a.jpg', 'b.jpg', PLACEHOLDER]);
});

check('a project yields its overview and its team image', () => {
  const pieces = groupPieces({
    video: 'files/x.mp4', overview: { image: 'files/o.jpg' }, team: { image: 'files/t.jpg' }
  }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/o.jpg', 'files/t.jpg', PLACEHOLDER]);
  assert.deepEqual(pieces.map(p => p.awaited), [false, false, true]);
});

check('a project with no still at all falls back to its poster frame', () => {
  /* BiyaHey has a video and an overview, but a project whose overview image is
     missing must still hang something: make-images.mjs generates a poster for
     every video, so that is the still of last resort before the placeholder. */
  const pieces = groupPieces({ video: 'files/Thing.mp4' }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/posters/Thing.jpg', PLACEHOLDER, PLACEHOLDER]);
  assert.deepEqual(pieces.map(p => p.awaited), [false, true, true]);
});

check('a project with neither image nor video hangs the placeholder', () => {
  const pieces = groupPieces({ id: 'empty' }, 'project');
  assert.deepEqual(pieces.map(p => p.src), [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER]);
});

check('every real record hangs within the budget', () => {
  const P = globalThis.PORTFOLIO;
  [...P.projects.map(p => [p, 'project']),
   ...P.leadership.map(l => [l, 'record']),
   ...P.honors.map(h => [h, 'record'])].forEach(([rec, kind]) => {
    const pieces = groupPieces(rec, kind);
    assert.ok(pieces.length >= MIN_PIECES && pieces.length <= MAX_PIECES,
      (rec.title || rec.description) + ' hangs ' + pieces.length);
    pieces.forEach(p => assert.ok(p.src, 'a piece has no src'));
  });
});

/* ── The honours split ───────────────────────────────────────────────────
   The split exists because a room was exactly one screen wide with a fixed
   grid of four exhibits, so thirteen honours would not fit one. A gallery is
   now as wide as its contents, so the reason is gone and the split yields one
   part. These are the assertions that stop a split from silently hiding an
   honour: a partition that loses a record looks exactly like one that does
   not, until someone counts. */
const { honoursSplit, HONOURS_ROOMS, evenChunks } = globalThis.Site;

check('the honours split is a total partition', () => {
  const { parts } = honoursSplit(globalThis.PORTFOLIO.honors);
  const flat = parts.flat();
  assert.equal(flat.length, globalThis.PORTFOLIO.honors.length,
    'records dropped or duplicated: ' + flat.length + ' of ' + globalThis.PORTFOLIO.honors.length);
  assert.equal(new Set(flat).size, flat.length, 'a record appears in two parts');
  assert.deepEqual(flat, globalThis.PORTFOLIO.honors, 'the split did not keep input order');
});

check('every honour hangs on one wall', () => {
  assert.equal(HONOURS_ROOMS, 1, 'a gallery is as wide as its contents, so honours is one wall');
  const { parts } = honoursSplit(globalThis.PORTFOLIO.honors);
  assert.equal(parts.length, 1, HONOURS_ROOMS + ' room(s) configured but ' + parts.length + ' part(s) returned');
  assert.equal(parts[0].length, globalThis.PORTFOLIO.honors.length,
    'the single part must hold every honour');
});

check('the split is even, not one crowded room and a wall of one', () => {
  const { parts } = honoursSplit(globalThis.PORTFOLIO.honors);
  const sizes = parts.map(p => p.length).filter(n => n > 0);
  const spread = Math.max(...sizes) - Math.min(...sizes);
  assert.ok(spread <= 1, 'parts are uneven: ' + sizes.join('/'));
  assert.equal(parts.length, HONOURS_ROOMS);

  /* The rule this asserts against, spelled out: slicing at a ceil-computed
     stride partitions evenly only when the count divides. Thirteen into four
     is 4/4/4/1 by that rule — three full walls and a fourth holding a single
     honour alone, which is the unevenness a visitor actually sees. Spelled out
     here because one part would never show it, and the rule is what a future
     split by meaning would inherit. */
  const ceilSlice = (list, rooms) => {
    const per = Math.ceil(list.length / rooms);
    return Array.from({ length: rooms }, (_, i) => list.slice(i * per, (i + 1) * per));
  };
  const thirteen = Array.from({ length: 13 }, (_, i) => i);
  assert.deepEqual(ceilSlice(thirteen, 4).map((c) => c.length), [4, 4, 4, 1],
    'the ceil-slice rule changed shape, so this no longer documents what it guards against');
  assert.deepEqual(evenChunks(thirteen, 4).map((c) => c.length), [3, 3, 3, 4]);
  assert.equal(evenChunks(thirteen, 4).flat().length, 13, 'evenChunks lost a record');
  /* And across a range of counts, never a record short. */
  for (let n = 0; n <= 40; n++) {
    const list = Array.from({ length: n }, (_, i) => i);
    for (let rooms = 1; rooms <= 6; rooms++) {
      const flat = evenChunks(list, rooms).flat();
      assert.equal(flat.length, n, n + ' into ' + rooms + ' gave ' + flat.length);
    }
  }
});

check('an empty, short or single honours list does not throw', () => {
  assert.deepEqual(honoursSplit([]).parts.flat(), []);
  assert.deepEqual(honoursSplit(null).parts.flat(), []);
  const one = honoursSplit([globalThis.PORTFOLIO.honors[0]]);
  assert.deepEqual(one.parts.flat(), [globalThis.PORTFOLIO.honors[0]]);
  assert.equal(one.parts.length, HONOURS_ROOMS, 'the split must always yield one part per room');
  /* The renderer drops empty parts rather than hanging an empty wall, and that
     filter is only as good as this fact. */
  assert.equal(honoursSplit([]).parts.filter((p) => p.length).length, 0,
    'an empty list yielded a part with something in it');
});

run();
