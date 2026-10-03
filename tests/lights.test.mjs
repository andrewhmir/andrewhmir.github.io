/* The lighting controller's contract.
   Layout geometry and scroll position are the two things a DOM stub cannot
   model honestly, so these tests pin what is decidable without a browser: the
   custom property is registered non-inheriting (the measured 503ms of
   RecalcStyleDuration per 3s of scroll trap), light is written to the work
   elements themselves, the work at the centre is brightest, reduced motion
   lights everything, and a work that has been lit never goes dark again.

   Two constraints of tests/harness.mjs shape this file: checks run
   synchronously (an async check would have its assertions skipped and pass
   without testing anything), and main.js is module-cached, so there is exactly
   one scene — the reduced-motion path is exercised by flipping the preference
   and re-running the controller, not by loading the site twice. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, run } from './harness.mjs';
import { loadSite } from './dom-harness.mjs';

const css = readFileSync('css/styles.css', 'utf8');

check('--lit is registered non-inheriting', () => {
  /* Hard constraint: an inherited custom property written on a large subtree
     per frame cost 503ms of RecalcStyleDuration per 3s of scroll. */
  const rule = css.match(/@property\s+--lit\s*\{[\s\S]*?\}/);
  assert.ok(rule, '--lit is not registered with @property');
  assert.match(rule[0], /inherits:\s*false/, '--lit inherits — the measured per-frame cost');
  assert.match(rule[0], /syntax:\s*['"]<number>['"]/, '--lit has no typed syntax');
});

/* One room whose works are laid out as a browser lays them out: .room is the
   positioned ancestor, so each work's offsetLeft is measured from the START OF
   ITS ROOM. These are exactly the numbers the controller reads. Room 1 spans
   0..1440 and room 2 begins at 1440, so the two rooms' works are only
   distinguishable by a page-coordinate calculation.

   Work centres in page coordinates: room1 gives 120+300=420 and 700+300=1000;
   room2 gives 50+300=350, so 1790 page. */
const ROOMS = [
  { key: 'Robotics', left: 0, width: 1440, works: [
    { left: 120, width: 600, height: 340 },
    { left: 700, width: 600, height: 340 },
  ] },
  { key: 'Applications', left: 1440, width: 1440, works: [
    { left: 50, width: 600, height: 340 },
    { left: 760, width: 600, height: 340 },
  ] },
];

const scene = await loadSite({ rooms: ROOMS });
const { workEls, hall, strip, setReducedMotion } = scene;
const litOf = (el) => el.style.get('--lit');
const num = (el) => Number(litOf(el));

/* Page centre of each work, and the viewport centre for a given scroll. */
const centres = ROOMS.flatMap((r) => r.works.map((w) => r.left + w.left + w.width / 2));
const viewportCentre = () => hall.scrollLeft + hall.clientWidth / 2;

check('light is written to the work elements, not a shared ancestor', () => {
  const written = workEls.map(litOf);
  assert.ok(written.every((v) => v !== undefined), 'a work never received --lit');
  assert.ok(strip.style.get('--lit') === undefined,
    '--lit was written on #strip, which every work would inherit');
  assert.ok(hall.style.get('--lit') === undefined, '--lit was written on #hall');
});

check('the work at the viewport centre is the brightest', () => {
  /* Walk the whole strip, centring each work in turn. Room-relative offsets and
     page coordinates disagree about which work that is, so this is the check
     that fails if the controller measures from the wrong origin. */
  const wrong = [];
  let exercised = 0;
  for (let i = 0; i < centres.length; i++) {
    hall.scrollLeft = centres[i] - hall.clientWidth / 2;
    globalThis.Site.initLights();
    const lit = workEls.map(num);
    const brightest = lit.indexOf(Math.max(...lit));
    /* Which work the viewport centre is genuinely nearest, in page coords. */
    const wanted = centres.reduce((best, c, j) =>
      Math.abs(c - viewportCentre()) < Math.abs(centres[best] - viewportCentre()) ? j : best, 0);
    if (brightest !== wanted) {
      wrong.push('at scrollLeft ' + hall.scrollLeft + ' (viewport centre ' + viewportCentre() +
        ') work ' + wanted + ' at page ' + centres[wanted] + ' should be brightest, got work ' +
        brightest + ' — lit ' + lit.join(', '));
    }
    exercised++;
  }
  assert.equal(exercised, centres.length, 'did not walk every work');
  assert.deepEqual(wrong, [], wrong.join(' | '));
});

check('a work already seen keeps its light when it leaves the viewport', () => {
  hall.scrollLeft = centres[3] - hall.clientWidth / 2;   /* walk on to the last work */
  globalThis.Site.initLights();
  const passed = centres.findIndex((c) => Math.abs(c - viewportCentre()) > hall.clientWidth * 0.62);
  assert.ok(passed >= 0, 'geometry left no work far enough behind');
  assert.equal(workEls[passed].dataset.seen, '1',
    'work ' + passed + ' was in view earlier and is not marked seen');
  assert.ok(num(workEls[passed]) > 0.6,
    'a work already seen dimmed to ' + litOf(workEls[passed]) + ' after leaving the view');
});

/* Every rule inside every @media (prefers-reduced-motion: reduce) block. The
   stylesheet has more than one such block, and a non-greedy `{…}` regex stops
   at the first `}` — so count braces instead. */
function reducedMotionRules() {
  const out = [];
  const open = /@media\s*\(prefers-reduced-motion:\s*(reduce|no-preference)\)\s*\{/g;
  let m;
  while ((m = open.exec(css))) {
    if (m[1] !== 'reduce') continue;
    let depth = 1, i = open.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const body = css.slice(open.lastIndex, i - 1);
    for (const r of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ selector: r[1].trim(), body: r[2] });
    }
  }
  return out;
}

check('reduced motion lights every piece, with no transition', () => {
  const rules = reducedMotionRules();
  assert.ok(rules.length, 'no reduced-motion block for the pieces');
  const has = (target, decl) => rules.some((r) =>
    r.selector.split(',').some((s) => s.trim() === target) && decl.test(r.body));

  assert.ok(has('.piece', /transition:\s*none/) && has('.piece', /filter:\s*none/),
    'a piece still transitions or dims under reduced motion');

  setReducedMotion(true);
  globalThis.Site.initLights();
  const values = workEls.map(litOf);
  assert.deepEqual(values, workEls.map(() => '1'),
    'not every piece was lit: ' + values.join(', '));
  assert.ok(strip.style.get('--lit') === undefined,
    '--lit was written on #strip instead of the pieces');
  setReducedMotion(false);
});

run();
