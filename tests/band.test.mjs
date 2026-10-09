/* The band a stand's hang stands on — the arithmetic, without a browser.
   The caller measures (see `fitWall` in js/main.js); this decides. Pure, like
   the light falloff's own suite, so the geometry can be pinned to the pixel
   without a DOM stub that models no CSS.

   ── What the solve is, now that a stand is one column of one size ─────────
   Every frame is the same box, so the stand's shape is fixed: a column of
   `rows` frames is `(band - gaps) / rows` tall each and `ratio` times that
   wide. Two things bound the band and the answer is the smaller:

     the wall   three frames wide, side by side? no — stacked: the COLUMN is as
                wide as one frame, so the band that exactly fills a wall of
                `width` is `(width / ratio) * rows + gaps`
     the cell   the band cannot be taller than the room the hang was given

   and neither may take the frames under the 44px tap target. */
import assert from 'node:assert/strict';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { bandFor } = globalThis.Site;

check('the wall binds when the cell is taller than the wall can fill', () => {
  /* A 1000px wall, 2000px of height, three 1.78-ratio frames and two 10px gaps:
     the band that fills the wall exactly is (1000/1.78)*3 + 20. */
  const band = bandFor({ width: 1000, height: 2000, rows: 3, ratio: 1.78, gap: 10 });
  assert.equal(band, 1705);
  const frameW = ((band - 20) / 3) * 1.78;
  assert.ok(frameW <= 1000, 'the solved band is wider than the wall: ' + frameW);
});

check('the cell binds when the wall is wider than the frames need', () => {
  const band = bandFor({ width: 1000, height: 600, rows: 3, ratio: 1.78, gap: 10 });
  assert.equal(band, 600, 'the band grew past the room it was given');
});

check('the tap floor binds when neither the wall nor the cell will carry it', () => {
  /* 44px a frame and the gaps between them: 3 * 44 + 2 * 10. */
  assert.equal(bandFor({ width: 100, height: 50, rows: 3, ratio: 1.78, gap: 10 }), 152);
});

check('the floor counts the gaps, not just the frames', () => {
  /* Three 44px frames are NOT a 132px band — the two gaps are part of what the
     column needs, and a floor that forgets them gives 39px frames. */
  const band = bandFor({ width: 0, height: 0, rows: 3, ratio: 1.78, gap: 10 });
  assert.equal(band, 152);
  assert.equal(bandFor({ width: 0, height: 0, rows: 1, ratio: 1.78, gap: 10 }), 44);
});

check('a geometry it cannot solve yields a usable band rather than NaN', () => {
  /* A band written to the DOM as `NaNpx` is a height nothing can resolve, and
     the wall would collapse without a single check going red. */
  const cases = [
    {},
    { width: 800 },
    { width: 800, height: 600 },
    { width: 800, height: 600, rows: 3, ratio: 0 },
    { width: NaN, height: 600, rows: 3, ratio: 1.78, gap: 10 },
    { width: 800, height: undefined, rows: 3, ratio: 1.78, gap: 10 },
    { width: -800, height: 'tall', rows: 3, ratio: 1.78, gap: 10 },
  ];
  cases.forEach((opt) => {
    const band = bandFor(opt);
    assert.ok(Number.isFinite(band) && band > 0,
      'not a usable band: ' + JSON.stringify(opt) + ' gave ' + band);
    assert.ok(band >= 44, 'a band under a single frame: ' + band);
  });
  /* And what it falls to is the floor the frames need: three 44px frames and
     the two gaps between them, not three frames and no gaps. */
  assert.equal(bandFor({ width: 0, height: 0, rows: 3, ratio: 1.78, gap: 10 }), 152);
});

check('every solved band is at one of its two bounds, and never outside', () => {
  /* The property that makes this a SOLVE rather than a floor, stated without
     restating the formula — a `bandFor` that always returned the tap floor
     clears the floor and fits the cell, and it is wrong:

         frameW  never past the wall          band  never past the cell
         frameH  never under the tap floor    and if the band is NOT the floor,
                                              it is AT the wall or AT the cell

     That last clause is the whole solve. It is checked over the cells the four
     reference viewports actually produce. */
  const gap = 10;
  const ratio = 16 / 9;
  const rows = 3;
  const minFrame = 44;
  const floor = minFrame * rows + gap * (rows - 1);
  const bad = [];
  for (const width of [200, 330, 390, 434, 509, 588, 900]) {
    for (const height of [180, 300, 397, 507, 570, 697, 900]) {
      const band = bandFor({ width, height, rows, ratio, gap, minFrame });
      const frameH = (band - gap * (rows - 1)) / rows;
      const frameW = frameH * ratio;
      const at = width + 'x' + height;
      const bound = Math.min((width / ratio) * rows + gap * (rows - 1), height);
      if (frameH < minFrame - 0.51) bad.push(at + ': frame ' + frameH.toFixed(1) + ' under the floor');
      if (band > height + 0.51) bad.push(at + ': band ' + band + ' taller than the cell');
      if (frameW > width + 1) bad.push(at + ': frame ' + frameW.toFixed(1) + ' past the wall');
      /* The clause that makes this a solve. It is asked of the BOUND, not of
         the band: asking it of the band skips it exactly when the band is the
         floor, which is the implementation this exists to catch. */
      if (bound > floor + 0.51) {
        const atWall = Math.abs(frameW - width) <= 1;
        const atCell = Math.abs(band - height) <= 0.51;
        if (!atWall && !atCell) {
          bad.push(at + ': band ' + band + ' is neither the wall (' + Math.round(frameW) + 'px of '
            + width + ' used) nor the cell (' + height + '), and the bound is above the floor ('
            + floor + ')');
        }
      }
    }
  }
  assert.deepEqual(bad, [], bad.slice(0, 4).join(' | '));
});

run();
