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

run();
