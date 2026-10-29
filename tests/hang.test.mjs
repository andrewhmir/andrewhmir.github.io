/* The photograph budget and the hang arrangements.
   Both are pure: they decide what hangs and how, with no DOM and no CSS, so
   they are pinned here rather than through the renderer's DOM stub.

   ── What changed, and why this suite is shorter ────────────────────────────
   A stand used to hang three to six frames in one of ten arrangements, dealt
   from the group's own key so neighbouring stands differed. It hangs exactly
   three now, in one column, at one size: a video for a project and
   photographs for everything else (see `groupPieces` in js/data.js). The
   variety this suite used to protect is deliberately gone, so the checks that
   counted arrangements are replaced by the one that pins the stack. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { check, run } from './harness.mjs';
import '../js/data.js';

const { groupPieces, posterFor, MIN_PIECES, MAX_PIECES, PLACEHOLDER } = globalThis.Site;

check('a stand hangs exactly three frames', () => {
  assert.equal(MIN_PIECES, 3);
  assert.equal(MAX_PIECES, 3);
  assert.equal(groupPieces({ description: 'x' }, 'record').length, 3);
  assert.equal(groupPieces({ description: 'x', images: ['a.jpg'] }, 'record').length, 3);
  assert.equal(groupPieces({ id: 'p' }, 'project').length, 3);
});

check('a null record yields no pieces rather than throwing', () => {
  assert.deepEqual(groupPieces(null, 'record'), []);
  assert.deepEqual(groupPieces(undefined, 'project'), []);
});

check('a record hangs its first three photographs and reserves the rest', () => {
  /* Four is the shape the data deals — two Leadership posts declare four
     photographs — and the fourth is not hung: the wall is three frames, and the
     photograph stays reachable in the record's own dialog. */
  const two = groupPieces({ images: ['a.jpg', 'b.jpg'] }, 'record');
  assert.deepEqual(two.map((p) => p.src), ['a.jpg', 'b.jpg', PLACEHOLDER]);
  assert.deepEqual(two.map((p) => p.awaited), [false, false, true]);

  const four = groupPieces({ images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'] }, 'record');
  assert.deepEqual(four.map((p) => p.src), ['a.jpg', 'b.jpg', 'c.jpg']);
});

check('every recorded piece is an image unless it is the project\'s video', () => {
  const record = groupPieces({ images: ['a.jpg'] }, 'record');
  assert.deepEqual(record.map((p) => p.media), ['image', 'image', 'image']);
  const project = groupPieces({ video: 'files/x.mp4' }, 'project');
  assert.deepEqual(project.map((p) => p.media), ['video', 'image', 'image']);
});

check('a project hangs its video, then its overview, then its team', () => {
  const pieces = groupPieces({
    video: 'files/x.mp4', overview: { image: 'files/o.jpg' }, team: { image: 'files/t.jpg' }
  }, 'project');
  assert.deepEqual(pieces.map((p) => p.media), ['video', 'image', 'image']);
  assert.equal(pieces[0].src, 'files/x.mp4');
  assert.equal(pieces[0].poster, 'files/posters/x.jpg');
  assert.deepEqual(pieces.map((p) => p.src), ['files/x.mp4', 'files/o.jpg', 'files/t.jpg']);
  assert.ok(pieces.every((p) => !p.awaited), 'a frame with a photograph behind it is marked awaited');
});

check('a project with no video hangs its photographs and reserves the third frame', () => {
  /* Total rather than special-cased: what the record HAS, in slot order, then
     padding. A project with no video must not open with an empty frame while a
     photograph waits behind it. */
  const pieces = groupPieces({ overview: { image: 'files/o.jpg' } }, 'project');
  assert.deepEqual(pieces.map((p) => p.src), ['files/o.jpg', PLACEHOLDER, PLACEHOLDER]);
  assert.deepEqual(pieces.map((p) => p.media), ['image', 'image', 'image']);
});

check('a project whose video has not arrived still hangs its video frame', () => {
  /* The frame is the video, so there is no photograph to fall back to and no
     `awaited` to set: its poster is the still, and the poster is generated for
     every video by tools/make-images.mjs. */
  const pieces = groupPieces({ id: 'empty', video: 'files/Thing.mp4' }, 'project');
  assert.equal(pieces[0].media, 'video');
  assert.equal(pieces[0].poster, 'files/posters/Thing.jpg');
  assert.deepEqual(pieces.map((p) => p.src), ['files/Thing.mp4', PLACEHOLDER, PLACEHOLDER]);
});

check('a project with neither image nor video hangs the placeholder', () => {
  const pieces = groupPieces({ id: 'empty' }, 'project');
  assert.deepEqual(pieces.map((p) => p.src), [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER]);
  assert.ok(pieces.every((p) => p.awaited && p.media === 'image'));
});

check('a record whose image is the placeholder is awaited, not named after its file', () => {
  const pieces = groupPieces({ images: [PLACEHOLDER] }, 'record');
  assert.equal(pieces[0].awaited, true);
  assert.equal(pieces[0].src, PLACEHOLDER);
});

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

check('every shipped project\'s video has its still on disk', () => {
  /* The guarantee is a file, not a string: a project added to the data without
     running tools/make-images.mjs would hang a poster path that 404s, and the
     frame would be a black rectangle the renderer suite cannot see (it asserts
     the attribute, not the bytes). Plugin records ship no film, so they are not
     part of this check — see the screenshot check below. */
  const missing = globalThis.PORTFOLIO.projects
    .filter((p) => p.video)
    .map((p) => ({ title: p.title, poster: groupPieces(p, 'project')[0].poster }))
    .filter((x) => !x.poster || !existsSync(x.poster));
  assert.deepEqual(missing, [], 'no poster frame on disk: ' + JSON.stringify(missing));
});

check('every shipped record hangs exactly three frames', () => {
  const P = globalThis.PORTFOLIO;
  const all = [
    ...P.projects.map((p) => [p, 'project']),
    ...P.leadership.map((l) => [l, 'record']),
    ...P.honors.map((h) => [h, 'record']),
  ];
  const bad = all
    .map(([rec, kind]) => ({ name: rec.title || rec.description, n: groupPieces(rec, kind).length }))
    .filter(({ n }) => n !== MIN_PIECES);
  assert.deepEqual(bad, [], 'not three frames: ' + JSON.stringify(bad));
});

check('every shipped project leads with its own video', () => {
  /* The first frame of a project stand is the film. A project that shipped
     without one would hang a photograph there and the stand would not read as
     the same composition as its neighbours. A plugin record is the deliberate
     exception: it has no film and leads with its overview screenshot instead. */
  const bad = globalThis.PORTFOLIO.projects
    .filter((p) => p.video)
    .filter((p) => groupPieces(p, 'project')[0].media !== 'video')
    .map((p) => p.title);
  assert.deepEqual(bad, [], 'no video in the first frame: ' + bad.join(', '));
});

check('a plugin record leads with its own screenshot', () => {
  const plugins = globalThis.PORTFOLIO.projects.filter((p) => Array.isArray(p.shots) && p.shots.length);
  assert.ok(plugins.length, 'the page ships no plugin record to check');
  const bad = plugins
    .filter((p) => groupPieces(p, 'project')[0].src !== p.shots[0])
    .map((p) => p.title);
  assert.deepEqual(bad, [], 'a plugin does not lead with its own screenshot: ' + bad.join(', '));
});

/* ── The arrangement ─────────────────────────────────────────────────────
   One arrangement, and it is a contract rather than a preference: it partitions
   all three frames into ONE column, which is what "stacked vertically" means to
   the renderer, and the depth bound below is what keeps the frames above the
   tap floor. A partition that loses an index hangs a photograph nowhere. */
const { HANG_LAYOUTS, hangLayout } = globalThis.Site;

check('the wall stacks the three frames in one column', () => {
  const set = HANG_LAYOUTS[3];
  assert.ok(Array.isArray(set) && set.length === 1,
    'three frames are dealt more than one arrangement');
  assert.deepEqual(set[0].columns, [[0, 1, 2]], 'the three frames are not one column');
  assert.deepEqual(hangLayout('Robotics:0', 3).columns, [[0, 1, 2]]);
  assert.deepEqual(hangLayout('Leadership:3', 3).columns, [[0, 1, 2]]);
});

check('every arrangement covers its pieces exactly once', () => {
  const bad = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    HANG_LAYOUTS[n].forEach((l) => {
      const flat = l.columns.flat().slice().sort((a, b) => a - b);
      const want = Array.from({ length: n }, (_, i) => i);
      if (JSON.stringify(flat) !== JSON.stringify(want)) bad.push(l.name + ' does not partition ' + n);
      if (l.columns.some((c) => c.length === 0)) bad.push(l.name + ' has an empty column');
      if (!(l.lead >= 0 && l.lead < n)) bad.push(l.name + ' has no lead');
      if (l.drop.length !== l.columns.length) bad.push(l.name + ' has no drop per column');
    });
    if (new Set(HANG_LAYOUTS[n].map((x) => x.name)).size !== HANG_LAYOUTS[n].length) {
      bad.push(n + ' has two arrangements with the same name');
    }
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

/* The depth bound is a layout contract, not a preference: the stylesheet
   divides a stand's band between a column's own frames, so a column of five
   would hang five frames one-fifth of the band tall. */
const MAX_DEPTH = 3;

check('no arrangement hangs a column deeper than the band can carry', () => {
  const bad = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n++) {
    HANG_LAYOUTS[n].forEach((l) => {
      l.columns.forEach((c, ci) => {
        if (c.length > MAX_DEPTH) bad.push(l.name + ' column ' + ci + ' is ' + c.length + ' deep');
      });
    });
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('the chooser never returns a column deeper than the bound', () => {
  const bad = [];
  for (let n = 0; n <= 9; n++) {
    for (const key of ['k', 'honors:3', 'Robotics:0', 'Leadership:2', 42]) {
      const l = hangLayout(key, n);
      l.columns.forEach((c) => { if (c.length > Math.max(MAX_DEPTH, 1)) bad.push(l.name + ' at ' + n); });
    }
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});

check('an arrangement is stable for a given group', () => {
  assert.equal(hangLayout('honors:3', 3).name, hangLayout('honors:3', 3).name);
  assert.equal(hangLayout('Robotics:0', 3).name, hangLayout('Robotics:0', 3).name);
});

check('the chooser is total — any count and any key', () => {
  [[0, 0], [2, 2], [9, 9], [3, 3]].forEach(([count, want]) => {
    assert.equal(hangLayout('k', count).columns.flat().length, want, 'count ' + count);
  });
  assert.equal(hangLayout(undefined, 3).columns.flat().length, 3);
  assert.equal(hangLayout(null, 3).columns.flat().length, 3);
  assert.equal(hangLayout(42, 4).columns.flat().length, 4);
  assert.doesNotThrow(() => hangLayout('k', 'nonsense'));
  assert.equal(hangLayout('k', 'nonsense').columns.flat().length, 0);
});

run();
