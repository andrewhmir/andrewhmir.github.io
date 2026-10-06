/* Dev-only: print a copy-pasteable `pieces: [...]` block for every record that
   has no per-photograph captions yet, with each frame's letter and its file.

   The catalogue's titles and captions come from `pieces[]` in js/data.js and
   from nowhere else. Without them a frame is named "Photograph B" and the
   label says nothing about what is in the picture — which is the whole reason
   a visitor cannot tell what they are looking at.

   Usage: node tools/caption-worklist.mjs [roomFilter] */
import '../js/data.js';

const P = globalThis.PORTFOLIO;
const filter = process.argv[2] || '';
const groups = [];

const add = (kind, key, record) => {
  const pieces = globalThis.Site.groupPieces(record, kind === 'project' ? 'project' : 'record');
  const authored = Array.isArray(record.pieces) ? record.pieces : [];
  const real = pieces.map((p, i) => ({ ...p, i })).filter((p) => !p.awaited);
  if (!real.length) return;
  const missing = real.filter((p) => !(authored[p.i] && authored[p.i].caption));
  if (!missing.length) return;
  groups.push({ key, record, authored, real, missing });
};

P.projects.forEach((p) => add('project', 'project — ' + (p.title || p.id), p));
P.leadership.forEach((l, i) => add('record', 'leadership — ' + String(l.description).slice(0, 46), l));
P.honors.forEach((h, i) => add('record', 'honour — ' + String(h.description || '').slice(0, 46), h));

const shown = groups.filter((g) => !filter || g.key.includes(filter));
const total = groups.reduce((n, g) => n + g.missing.length, 0);

console.log(`# ${total} photographs across ${groups.length} records have no caption yet.`);
console.log('# Fill in each `title` (what it shows) and `caption` (one sentence), then');
console.log('# paste the block over that record\'s `pieces: [...]` in js/data.js.\n');

for (const g of shown) {
  const samples = [];
  g.real.forEach((p) => samples.push(p.src.replace(/^files\//, '')));
  console.log('── ' + g.key);
  console.log('   files: ' + samples.join(', '));
  console.log('   pieces: [');
  g.real.forEach((p) => {
    const was = g.authored[p.i] || {};
    const letter = String.fromCharCode(65 + p.i);
    const title = was.title && !/^(first|second|third|fourth|fifth|sixth) photograph$/i.test(was.title)
      ? was.title : 'What ' + letter + ' shows  /* TODO */';
    const caption = was.caption || 'One sentence about this photograph.  /* TODO */';
    console.log(`     { title: ${JSON.stringify(title)}, caption: ${JSON.stringify(caption)} },`);
  });
  console.log('   ]\n');
}

console.log(`(${shown.length} of ${groups.length} records listed; pass a filter to narrow, e.g. "leadership")`);
