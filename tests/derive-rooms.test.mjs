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
const { groupPieces } = globalThis.Site;

check('a record with no images still yields one placeholder piece', () => {
  const pieces = groupPieces({ description: 'x', year: '2026' }, 'record');
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].src, 'files/PlaceHolder.png');
});

check('a record with three images yields three pieces in order', () => {
  const pieces = groupPieces({ images: ['a.jpg', 'b.jpg', 'c.jpg'] }, 'record');
  assert.deepEqual(pieces.map(p => p.src), ['a.jpg', 'b.jpg', 'c.jpg']);
});

check('blank entries in an images array are not hung as pieces', () => {
  const pieces = groupPieces({ images: ['a.jpg', '', null, 'b.jpg'] }, 'record');
  assert.deepEqual(pieces.map(p => p.src), ['a.jpg', 'b.jpg']);
});

check('a project yields its overview and its team image', () => {
  const pieces = groupPieces({
    video: 'files/x.mp4', overview: { image: 'files/o.jpg' }, team: { image: 'files/t.jpg' }
  }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/o.jpg', 'files/t.jpg']);
});

check('a project with no still at all falls back to its poster frame', () => {
  /* BiyaHey has a video and an overview, but a project whose overview image is
     missing must still hang something: make-images.mjs generates a poster for
     every video, so that is the still of last resort before the placeholder. */
  const pieces = groupPieces({ video: 'files/Thing.mp4' }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/posters/Thing.jpg']);
});

check('a project with neither image nor video hangs the placeholder', () => {
  const pieces = groupPieces({ id: 'empty' }, 'project');
  assert.deepEqual(pieces.map(p => p.src), ['files/PlaceHolder.png']);
});

check('every real record yields at least one piece', () => {
  const P = globalThis.PORTFOLIO;
  [...P.projects.map(p => [p, 'project']),
   ...P.leadership.map(l => [l, 'record']),
   ...P.honors.map(h => [h, 'record'])].forEach(([rec, kind]) => {
    const pieces = groupPieces(rec, kind);
    assert.ok(pieces.length >= 1, 'no piece for ' + (rec.title || rec.description));
    pieces.forEach(p => assert.ok(p.src, 'a piece has no src'));
  });
});

run();
