import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { awardPhotos } = globalThis.Site;
const H = globalThis.PORTFOLIO.honors;
const P1 = globalThis.PORTFOLIO.projects.find((p) => p.id === 'project1');
const P3 = globalThis.PORTFOLIO.projects.find((p) => p.id === 'project3');

/* The award record exactly as renderAwards sees it, so the preferred call
   shape — the object that carries `year` — is what these checks exercise. */
const awardOf = (project, year) => project.awards.find((a) => a.year === year);

check('an award with photographs resolves to its own photographs', () => {
  const h = H.find((x) => x.from === 'project3' && x.year === 'March 2025');
  assert.ok(h && h.images.length, 'fixture needs the March 2025 award to hang photographs');
  assert.deepEqual(awardPhotos('project3', H, awardOf(P3, 'March 2025')).slice().sort(),
    h.images.slice().sort());
});

check('two awards of one project resolve differently', () => {
  /* The check the union fails. Both are C.E.N.T.H.R.O. awards, so a return at
     the level of the PROJECT hands the March win's three photographs to the May
     win as well — a control that opens a different win's gallery. */
  assert.equal(awardPhotos('project3', H, awardOf(P3, 'March 2025')).length, 3,
    'the March 2025 award hangs three photographs');
  assert.deepEqual(awardPhotos('project3', H, awardOf(P3, 'May 2025')), [],
    'the May 2025 award hangs none and must not inherit March\u2019s');
});

check('an award with no photographs of its own is not a control', () => {
  /* PALAD's December and November honours hang nothing; only February does. */
  assert.deepEqual(awardPhotos('project1', H, awardOf(P1, 'December 2025')), []);
  assert.deepEqual(awardPhotos('project1', H, awardOf(P1, 'November 2025')), []);
  assert.equal(awardPhotos('project1', H, awardOf(P1, 'February 2026')).length, 1);
});

check('a bare year string resolves the same award as its record', () => {
  assert.deepEqual(awardPhotos('project3', H, 'March 2025'),
    awardPhotos('project3', H, awardOf(P3, 'March 2025')));
});

check('a project with no linked honours returns an empty list', () => {
  assert.deepEqual(awardPhotos('project5', H, 'March 2026'), []);
});

check('an unknown project returns an empty list', () => {
  assert.deepEqual(awardPhotos('nope', H, 'March 2025'), []);
});

check('an absent or unrecognised year yields nothing rather than a guess', () => {
  assert.deepEqual(awardPhotos('project3', H, undefined), []);
  assert.deepEqual(awardPhotos('project3', H, ''), []);
  assert.deepEqual(awardPhotos('project3', H, {}), []);
  assert.deepEqual(awardPhotos('project3', H, 'March 1999'), []);
});

check('a total absence of input does not throw', () => {
  assert.deepEqual(awardPhotos('project1', undefined, 'February 2026'), []);
  assert.deepEqual(awardPhotos(undefined, H, 'March 2025'), []);
});

check('no award inherits another award\'s photographs', () => {
  const march = awardPhotos('project3', H, awardOf(P3, 'March 2025'));
  const nov = awardPhotos('project3', H, awardOf(P3, 'November 2024'));
  const one = awardPhotos('project1', H, awardOf(P1, 'February 2026'));
  assert.equal(march.length, 3, 'the March 2025 award hangs three photographs');
  assert.equal(nov.length, 2, 'the November 2024 award hangs two photographs');
  assert.equal(one.length, 1, 'the February 2026 award hangs one photograph');
  const shared = march.filter((f) => nov.includes(f) || one.includes(f));
  assert.deepEqual(shared, [], 'an award photograph is claimed by two awards');
});

run();
