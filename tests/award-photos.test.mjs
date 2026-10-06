import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { awardPhotos } = globalThis.Site;
const H = globalThis.PORTFOLIO.honors;

check('a project award with photographs resolves to them', () => {
  const h = H.find((x) => x.from === 'project3'
    && Array.isArray(x.images) && x.images.length);
  assert.ok(h, 'fixture needs a project3 award that has photographs');
  assert.deepEqual(awardPhotos('project3', H).slice().sort(), H
    .filter((x) => x.from === 'project3' && Array.isArray(x.images) && x.images.length)
    .flatMap((x) => x.images).sort());
});

check('a project with no linked honours returns an empty list', () => {
  assert.deepEqual(awardPhotos('project5', H), []);
});

check('an unknown project returns an empty list', () => {
  assert.deepEqual(awardPhotos('nope', H), []);
});

check('a total absence of input does not throw', () => {
  assert.deepEqual(awardPhotos('project1', undefined), []);
  assert.deepEqual(awardPhotos(undefined, H), []);
});

check('no project inherits another project\'s photographs', () => {
  const one = awardPhotos('project1', H);
  const three = awardPhotos('project3', H);
  assert.ok(one.length && three.length, 'fixture needs two projects with award photos');
  const shared = one.filter((f) => three.includes(f));
  assert.deepEqual(shared, [], 'an award photograph is claimed by two projects');
});

run();
