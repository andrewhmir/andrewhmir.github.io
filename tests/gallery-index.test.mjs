import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { galleryFor } = globalThis.Site;
const H = globalThis.PORTFOLIO.honors;

check('a row with photos returns its own photos', () => {
  const i = H.findIndex(h => Array.isArray(h.images) && h.images.length);
  assert.ok(i >= 0, 'fixture needs at least one honour with photos');
  assert.deepEqual(galleryFor('honors', i).images, H[i].images);
});

check('a row without photos returns an empty list, not a neighbour\'s', () => {
  const i = H.findIndex(h => !Array.isArray(h.images) || !h.images.length);
  assert.ok(i >= 0, 'fixture needs at least one honour without photos');
  assert.deepEqual(galleryFor('honors', i).images, []);
});

check('the title always matches the row that was asked for', () => {
  H.forEach((h, i) => {
    assert.equal(galleryFor('honors', i).title, h.description,
      `row ${i} returned the wrong title`);
  });
});

check('an out-of-range index is total, not a throw', () => {
  assert.deepEqual(galleryFor('honors', 999).images, []);
  assert.deepEqual(galleryFor('honors', -1).images, []);
});

check('an unknown kind is total, not a throw', () => {
  assert.deepEqual(galleryFor('nope', 0).images, []);
});

run();
