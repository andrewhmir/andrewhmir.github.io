import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { visibleWork } = globalThis.Site;

check('picks the work nearest the viewport centre', () => {
  /* three works centred at 100, 500, 900 in a 1000-wide viewport */
  assert.equal(visibleWork(0, 1000, [100, 500, 900]), 1);
  assert.equal(visibleWork(400, 1000, [100, 500, 900]), 2);
  assert.equal(visibleWork(-400, 1000, [100, 500, 900]), 0);
});

check('returns -1 when there are no works', () => {
  assert.equal(visibleWork(0, 1000, []), -1);
});

check('clamps at both ends rather than going out of range', () => {
  assert.equal(visibleWork(-9999, 1000, [100, 500, 900]), 0);
  assert.equal(visibleWork(9999, 1000, [100, 500, 900]), 2);
});

run();
