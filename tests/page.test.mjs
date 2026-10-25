/* Static guard for the Long Field profile page.
   Run: node tests/page.test.mjs — exits non-zero on the first failed assertion.

   This replaces the walk's shell-check. It pins what a broken edit would lose
   silently: the stylesheet/script order, the palette tokens, the two paintings,
   the section ids the renderer promises, the dialog's accessibility contract,
   and the no-third-party rule. It also proves the content data still yields the
   counts the page is built around. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(p, 'utf8');
const html = read('index.html');
const css = read('css/styles.css');
const js = read('js/main.js');
const data = read('js/data.js');
const pkg = JSON.parse(read('package.json'));

const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, '');
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── the shell ─────────────────────────────────────────────────────── */

// Fonts before styles, data before renderer: both orders are load-bearing.
assert.match(html, /href="css\/fonts\.css"[\s\S]*href="css\/styles\.css"/);
assert.match(htmlNoComments, /<script src="js\/data\.js"><\/script>\s*<script src="js\/main\.js"><\/script>/);
assert.match(html, /<main id="page" class="page"><\/main>/);
assert.match(html, /<div class="dialog" id="dialog" hidden>/);
assert.match(html, /role="dialog"/);
assert.match(html, /aria-modal="true"/);
assert.match(html, /id="rail"/);
assert.match(html, /class="rail-shade"/);
assert.match(html, /<noscript>/);
console.log('ok  shell: fonts, scripts, page, dialog, rail, no-JS fallback');

// The retired walk must not creep back in.
for (const gone of ['lenis', 'icons.js', '#hall', '#strip', 'dock-track', 'wall-mushoku']) {
  assert.equal(htmlNoComments.includes(gone), false, `retired walk reference in index.html: ${gone}`);
}
console.log('ok  shell: no walk assets');

/* ── the palette and the art system ───────────────────────────────── */

for (const token of ['--night: #080c0e', '--text: #ece2cf', '--text-strong: #f9f4e8',
  '--text-quiet: #9a9384', '--accent: #d4b06a']) {
  assert.ok(cssNoComments.includes(token), `missing palette token: ${token}`);
}
assert.match(css, /--panel-radius:\s*16px/);
assert.match(css, /--frame-radius:\s*10px/);
assert.match(css, /\.art--rice\s*\{\s*--art:\s*url\("\.\.\/files\/painting-hero\.jpg"\)/);
assert.match(css, /\.art--harvest\s*\{\s*--art:\s*url\("\.\.\/files\/painting\.jpg"\)/);
assert.match(css, /\.stop::before/);
assert.match(css, /background-position:\s*var\(--pos/);
assert.match(css, /\.rail-shade/);
console.log('ok  palette, radii, both paintings, art layers, rail shade');

// Braces must balance; an unbalanced rule silently eats the rest of the sheet.
assert.equal((cssNoComments.match(/{/g) || []).length, (cssNoComments.match(/}/g) || []).length);
console.log('ok  css: braces balanced');

/* ── no third-party resource loads (anchor hrefs are allowed) ─────── */

const resourcePatterns = [
  /<script[^>]+src="https?:/i,
  /<link[^>]+rel="stylesheet"[^>]+href="https?:/i,
  /<img[^>]+src="https?:/i,
  /url\(\s*['"]?https?:/i,
];
for (const [name, src] of [['index.html', htmlNoComments], ['css/styles.css', cssNoComments], ['js/main.js', js], ['js/data.js', data]]) {
  for (const re of resourcePatterns) {
    assert.equal(re.test(src), false, `third-party resource load in ${name}: ${re}`);
  }
}
console.log('ok  no third-party resource loads');

/* ── the renderer's contract ──────────────────────────────────────── */

for (const id of ["'top'", "'about'", "'work'", "'leadership'", "'honours'", "'contact'"]) {
  assert.ok(js.includes(id), `renderer missing section id ${id}`);
}
assert.match(js, /P\.projects\.forEach/);
assert.match(js, /S\.honoursTiles\(P\.honors\)/);
assert.match(js, /dialog__video/);
assert.match(js, /IntersectionObserver/);
assert.match(js, /prefers-reduced-motion/);
console.log('ok  renderer: sections, honours partition, video, rail, reveals');

/* ── the content still yields the page's counts ───────────────────── */

const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(data, ctx);
const P = ctx.PORTFOLIO;
const S = ctx.Site;
assert.equal(P.projects.length, 6, 'the page is built for six project stops');
assert.equal(P.leadership.length, 4, 'leadership renders four cards');
assert.equal(S.honoursTiles(P.honors).tiles.length, 5, 'honours renders the standalone tiles');
assert.equal(P.social[0].label, 'Resume', 'the masthead resume link reads PORTFOLIO.social[0]');
console.log('ok  data: 6 projects, 4 leadership cards, 5 honour tiles');

/* ── the npm test script actually runs this file ──────────────────── */

assert.match(pkg.scripts.test, /tests\/page\.test\.mjs/);
console.log('ok  package.json runs this guard');

console.log('\npage guard passed');
