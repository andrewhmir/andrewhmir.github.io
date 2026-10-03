/* Dev-only: which class selectors does nothing emit?
   A leftover rule is not a bug, but on a stylesheet this size an orphan is
   usually the tail of a deleted feature, and it is worth knowing which. */
import { readFileSync } from 'node:fs';

const css = readFileSync('css/styles.css', 'utf8');
const sources = ['js/main.js', 'index.html', 'js/data.js']
  .map((f) => readFileSync(f, 'utf8')).join('\n');

const declared = new Set([...css.matchAll(/\.([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]));

const used = new Set();
for (const m of sources.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
for (const m of sources.matchAll(/class=\\"([^\\"]+)\\"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
for (const m of sources.matchAll(/className\s*=\s*'([^']+)'/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
for (const m of sources.matchAll(/classList\.(?:add|remove|toggle)\('([^']+)'/g)) used.add(m[1]);
/* Selectors built by concatenation, e.g. 'class="piece' + (lead ? ' piece--lead' : '') */
for (const m of sources.matchAll(/'([a-z][a-z0-9-]*)'/g)) used.add(m[1]);

const orphans = [...declared].filter((c) => !used.has(c)).sort();
console.log('CSS classes nothing emits (' + orphans.length + '):');
console.log(orphans.join('  '));

/* And the reverse: class names emitted that no rule styles. */
const styled = new Set([...css.matchAll(/\.([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]));
const unstyled = [...used].filter((c) => !styled.has(c) && c.length > 2).sort();
console.log('\nClass names emitted with no rule (' + unstyled.length + '):');
console.log(unstyled.join('  '));
