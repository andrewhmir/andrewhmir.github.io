/* The film stills: the poster rule and the two on-disk guarantees the page
   depends on. The three-frame hang, its arrangement tables and the pieces
   budget were retired with the horizontal walk; what survives is the poster
   derivation (js/main.js calls Site.posterFor for every project frame and for
   the dialog player) and the file check that keeps a shipped video from
   rendering a poster path that 404s. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { posterFor } = globalThis.Site;

check('a poster frame is derived exactly as the generator writes it', () => {
  /* The rule is tools/make-images.mjs's own: it scans `files/` top level for
     `.mp4`, and writes `files/posters/<stem>.jpg` — FLAT, on the basename. */
  assert.equal(posterFor('files/Palad_Preview.mp4'), 'files/posters/Palad_Preview.jpg');
  assert.equal(posterFor('files/sub/Thing.mp4'), 'files/posters/Thing.jpg');
  assert.equal(posterFor('files/Shot.MP4'), 'files/posters/Shot.jpg');
  /* And everything the tool does not describe yields NO poster rather than a
     path nothing writes, which would 404 on every load. */
  assert.equal(posterFor('files/clip.webm'), '');
  assert.equal(posterFor('videos/x.mp4'), '');
  assert.equal(posterFor(''), '');
  assert.equal(posterFor(null), '');
});

check("every shipped project's video has its still on disk", () => {
  /* The guarantee is a file, not a string: a project added to the data without
     running tools/make-images.mjs would hang a poster path that 404s, and the
     frame would be a black rectangle no static check can see. Plugin records
     ship no film, so they are not part of this check — see the screenshots
     check below. */
  const missing = globalThis.PORTFOLIO.projects
    .filter((p) => p.video)
    .map((p) => ({ title: p.title, poster: posterFor(p.video) }))
    .filter((x) => !x.poster || !existsSync(x.poster));
  assert.deepEqual(missing, [], 'no poster frame on disk: ' + JSON.stringify(missing));
});

check('every plugin screenshot is on disk', () => {
  /* A plugin record has no film and no team photograph; its three frames and
     its dialog gallery are the files in `shots`. A missing one would fall back
     to the placeholder on load instead of failing here. */
  const plugins = globalThis.PORTFOLIO.projects.filter((p) => Array.isArray(p.shots) && p.shots.length);
  assert.ok(plugins.length, 'the page ships no plugin record to check');
  const missing = [];
  for (const p of plugins) {
    for (const src of p.shots) {
      if (!src || !existsSync(src)) missing.push({ title: p.title, src });
    }
  }
  assert.deepEqual(missing, [], 'no screenshot on disk: ' + JSON.stringify(missing));
});

run();
