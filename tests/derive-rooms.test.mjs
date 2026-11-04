/* Room derivation: the one Site helper the page still calls on every render.
   The pieces budget and the honours split that used to live here were retired
   with the horizontal walk; what remains is the grouping contract the Work
   panels and the rail labels are built from. */
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { deriveRooms } = globalThis.Site;

check('splits the real portfolio into the three known rooms', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.deepEqual(rooms.map(r => r.key), ['Applications', 'DSH Plugins', 'Robotics']);
  assert.deepEqual(rooms.map(r => r.projects.length), [3, 3, 3]);
});

check('titles come from ROOM_TITLES', () => {
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  assert.equal(rooms[0].title, 'Works in Applications');
  assert.equal(rooms[1].title, 'Works in DSH Plugins');
  assert.equal(rooms[2].title, 'Works in Robotics');
});

check('every known room carries a sentence for its panel', () => {
  /* The copy itself is Andrew's to rewrite; the invariant is that each room
     gets a real sentence, so the check reads the shape and not the words. */
  const rooms = deriveRooms(globalThis.PORTFOLIO.projects);
  rooms.forEach((r) => {
    assert.equal(typeof r.lede, 'string', r.key + ' has a lede');
    assert.ok(r.lede.length > 40, r.key + ' has a full sentence, not a stub');
    assert.match(r.lede, /\.$/, r.key + ' ends as a sentence');
  });
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

check('a room with no authored sentence has an empty lede, not a crash', () => {
  const [orphan] = deriveRooms([{ id: 'x' }]).filter(r => r.key === 'Other');
  assert.equal(orphan.lede, '');
});

run();
