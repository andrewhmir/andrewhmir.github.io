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

run();
