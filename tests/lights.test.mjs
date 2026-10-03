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

/* Three works 600 wide whose centres are 420, 720 and 1800 in a 1440px
   viewport: the hall starts at scrollLeft 0, so the viewport centre is 720 —
   work 1 sits exactly on it, work 0 is already behind the opening view, and
   work 2 is still ahead. */
const THREE = [
  { left: 120, width: 600, height: 340 },   /* centre  420 */
  { left: 420, width: 600, height: 340 },   /* centre  720 */
  { left: 1500, width: 600, height: 340 },  /* centre 1800 */
];

const scene = await loadSite({ works: THREE });
const { workEls, hall, strip, setReducedMotion } = scene;
const litOf = (el) => el.style.get('--lit');
const num = (el) => Number(litOf(el));

check('light is written to the work elements, not a shared ancestor', () => {
  const written = workEls.map(litOf);
  assert.ok(written.every((v) => v !== undefined), 'a work never received --lit');
  assert.ok(strip.style.get('--lit') === undefined,
    '--lit was written on #strip, which every work would inherit');
  assert.ok(hall.style.get('--lit') === undefined, '--lit was written on #hall');
});

check('the work at the viewport centre is the brightest', () => {
  const lit = workEls.map(num);
  assert.ok(lit.every((v) => Number.isFinite(v)), 'a work has no numeric light: ' + lit.join(', '));
  /* The nearest work is forced to full brightness by design ("the work nearest
     the centre is brightest"); every other work is left to the falloff. So the
     invariant is the ordering, not the raw smoothstep value. */
  const brightest = lit.indexOf(Math.max(...lit));
  assert.equal(brightest, 1, 'work 1 is nearest the centre but work ' + brightest +
    ' is brightest (lit: ' + lit.join(', ') + ')');
  assert.ok(lit[1] > 0.9, 'the work at the viewport centre is not fully lit: ' + lit[1]);
  assert.ok(lit[2] < lit[1], 'a work further from the centre is not dimmer');
});

check('a work ahead of the walk is not yet lit', () => {
  assert.ok(num(workEls[2]) < 0.2, 'an unvisited work is already lit: ' + litOf(workEls[2]));
});

check('mid-journey reload does not sweep the lighting across the strip', () => {
  /* A restored scroll position marks everything already passed as seen up
     front, so the first frame does not replay every arrival. */
  const startMid = hall.scrollLeft + hall.clientWidth / 2;
  const passed = THREE.filter((w) => w.left + w.width / 2 < startMid).length;
  assert.ok(passed > 0, 'harness geometry has no already-passed work');
  const missed = workEls.slice(0, passed).filter((w) => w.dataset.seen !== '1');
  assert.equal(missed.length, 0,
    missed.length + ' of ' + passed + ' already-passed works were not marked seen on load');
});

check('a work that has been lit never returns to dark', () => {
  /* Once seen, an out-of-view work holds a floor instead of dimming with the
     viewport — this is "lights stay on". */
  const ahead = workEls[2];
  const unseen = num(ahead);
  ahead.dataset.seen = '1';
  globalThis.Site.initLights();
  const held = num(ahead);
  assert.ok(held > 0.6, 'an already-seen work dimmed to ' + held + ' while out of view');
  assert.ok(held > unseen, 'the floor did not lift the light (' + unseen + ' -> ' + held + ')');
  assert.equal(ahead.dataset.seen, '1', 'the seen marker was cleared');
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

check('reduced motion lights every work, with no transition', () => {
  const rules = reducedMotionRules();
  assert.ok(rules.length, 'no reduced-motion block for the works');
  const has = (target, decl) => rules.some((r) =>
    r.selector.split(',').some((s) => s.trim() === target) && decl.test(r.body));

  assert.ok(has('.work .canvas', /transition:\s*none/),
    'the canvas still transitions under reduced motion');
  assert.ok(has('.work .pool', /opacity:\s*1/),
    'a pool is not fully lit under reduced motion');

  setReducedMotion(true);
  globalThis.Site.initLights();
  const values = workEls.map(litOf);
  assert.deepEqual(values, ['1', '1', '1'], 'not every work was lit: ' + values.join(', '));
  assert.ok(strip.style.get('--lit') === undefined,
    '--lit was written on #strip instead of the works');
  setReducedMotion(false);
});

run();
