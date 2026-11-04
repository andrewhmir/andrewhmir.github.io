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
const vendorCss = read('js/vendor/lenis.css');
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
assert.match(htmlNoComments, /id="projectView"/);
assert.match(htmlNoComments, /class="stop art--rice stop--project project-view"/);
const viewTag = (htmlNoComments.match(/<div[^>]*id="projectView"[^>]*>/) || [''])[0];
assert.ok(viewTag.includes('hidden'), 'the project view must ship hidden');
assert.ok(viewTag.includes('tabindex="-1"'), 'the project view must be focusable as a container');
assert.ok(viewTag.includes('data-lenis-prevent'), 'the project view must opt out of Lenis wheel capture');
assert.match(cssNoComments, /\.project-view\s*\{[^}]*z-index:\s*60/);
assert.match(cssNoComments, /\.dialog\s*\{[^}]*z-index:\s*80/);
assert.equal((js.match(/(?:project|plugin)\d: \{ art:/g) || []).length, 9, 'each record keeps a view crop');
console.log('ok  shell: fonts, scripts, page, dialog, rail, no-JS fallback');

// The retired walk must not creep back in. Lenis is the one exception: the
// vendored library is now the page's smooth-wheel layer, pinned below; the
// walk's own engine and shell ids stay out.
for (const gone of ['icons.js', 'lenis-snap', '#hall', '#strip', 'dock-track', 'wall-mushoku']) {
  assert.equal(htmlNoComments.includes(gone), false, `retired walk reference in index.html: ${gone}`);
}
console.log('ok  shell: no walk assets');

/* ── smooth scrolling (Lenis) ─────────────────────────────────────── */

// Vendored locally, its stylesheet after the page's, its script before the
// data/renderer pair: a third-party host would also fail the resource scan below.
assert.match(htmlNoComments, /<link rel="stylesheet" href="js\/vendor\/lenis\.css">/);
assert.match(htmlNoComments, /<script src="js\/vendor\/lenis\.min\.js"><\/script>/);
assert.match(htmlNoComments, /js\/vendor\/lenis\.min\.js[\s\S]*js\/data\.js[\s\S]*js\/main\.js/);
assert.match(htmlNoComments, /css\/styles\.css[\s\S]*js\/vendor\/lenis\.css/);
assert.match(js, /function wireSmoothScroll\(/);
assert.match(js, /var scrollEngine/);
// One strict control-flow assertion: both early returns and the autoRaf
// constructor, in that order, so deleting a guard cannot pass the check.
assert.match(js, /function wireSmoothScroll\(\) \{\s*if \(!window\.Lenis\) return;\s*if \(window\.matchMedia && window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return;\s*var lenis = new window\.Lenis\(\{ autoRaf: true \}\);/);
// The dialog must stop and start the engine, not merely define an adapter.
assert.match(js, /function setLock\(/);
assert.match(js, /dialog\.hidden = false;[\s\S]*?setLock\(true\)/);
assert.match(js, /dialog\.hidden = true;[\s\S]*?setLock\(false\)/);
assert.match(js, /scrollEngine\.stop\(\)/);
assert.match(js, /scrollEngine\.start\(\)/);
// The card opts out of Lenis's capture: a stopped Lenis would otherwise cancel
// the wheel over the dialog's own scroll area.
assert.match(html, /class="dialog__card" data-lenis-prevent/);
assert.match(js, /scrollMarginTop/);
// The offset branch must stay conditional: Lenis subtracts a target's own
// scroll-margin, so passing it again for a .stop target would double it.
assert.match(js, /if \(margin\) \{[\s\S]*?lenis\.scrollTo\(target\);[\s\S]*?\} else \{/);
// The skip link keeps its native focus move, and modified clicks (new tab,
// download) stay the browser's, not the smooth-scroll handler's.
assert.match(js, /classList\.contains\('skip'\)/);
assert.match(js, /e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey/);
console.log('ok  smooth scroll: vendored Lenis (autoRaf), reduced-motion opt-out, anchor skip/modifier pass-through, dialog stop/start');

/* ── the palette and the art system ───────────────────────────────── */

for (const token of ['--night: #080c0e', '--text: #ece2cf', '--text-strong: #f9f4e8',
  '--text-quiet: #9a9384', '--accent: #d4b06a']) {
  assert.ok(cssNoComments.includes(token), `missing palette token: ${token}`);
}
assert.match(css, /--panel-radius:\s*16px/);
assert.match(css, /--frame-radius:\s*10px/);
assert.match(css, /\.art--rice\s*\{\s*--art:\s*url\("\.\.\/files\/painting-hero\.jpg"\)/);
assert.match(css, /\.art--harvest\s*\{\s*--art:\s*url\("\.\.\/files\/painting\.jpg"\)/);
/* Each painting then offers AVIF, WebP and a JPEG through image-set(); the plain
   JPEG declaration above is the fallback for a browser without image-set(). */
assert.match(css, /@supports \(background-image: image-set\(/);
assert.match(css, /image-set\(\s*url\("\.\.\/files\/painting-hero\.avif"\) type\("image\/avif"\)/);
assert.match(css, /url\("\.\.\/files\/painting-hero\.webp"\) type\("image\/webp"\)/);
assert.match(css, /image-set\(\s*url\("\.\.\/files\/painting\.avif"\) type\("image\/avif"\)/);
assert.match(css, /url\("\.\.\/files\/painting\.webp"\) type\("image\/webp"\)/);
assert.match(css, /\.stop::before/);
assert.match(css, /background-position:\s*var\(--pos/);
assert.match(css, /\.rail-shade/);
console.log('ok  palette, radii, both paintings, art layers, rail shade');

// Progress lives in the rail: wireChrome eases the scroll fraction and writes it
// in px, the rail's ::before is a 5px gradient bar sized by that value (no glow),
// and the masthead hairline is the small-screen fallback.
assert.match(js, /--rail-progress/);
assert.match(cssNoComments, /--rail-progress/);
assert.match(cssNoComments, /\.rail::before/);
assert.match(cssNoComments, /\.rail::before\s*\{[^}]*width:\s*5px/);
assert.match(cssNoComments, /height:\s*var\(--rail-progress/);
assert.equal(/\.rail::before\s*\{[^}]*box-shadow/.test(cssNoComments), false, 'the fill must not glow');
// The bar and its chips are square-cornered: no rounded ends, no rounded labels.
assert.match(cssNoComments, /\.rail::before\s*\{[^}]*border-radius:\s*0/);
assert.match(cssNoComments, /\.rail__stop span\s*\{[^}]*border-radius:\s*0/);
assert.match(js, /function paint\(/);
assert.match(js, /requestAnimationFrame\(paint\)/);
assert.match(cssNoComments, /\.progress\s*\{[^}]*display:\s*none/);
// Rail stops reuse the page's rule language: dashes beside the bar, not circles.
assert.equal(/\.rail__stop::before\s*\{[^}]*border-radius:\s*50%/.test(cssNoComments), false, 'rail markers must not be circles');
assert.match(cssNoComments, /\.rail__stop\.is-active::before\s*\{[^}]*background:\s*var\(--accent\)/);
// The dash starts on the rail's line, its left end tucking under the gold bar,
// and the stop's hit row is bigger than the mark so the rail is easy to click.
assert.match(cssNoComments, /\.rail__stop\s*\{[^}]*height:\s*34px/);
assert.match(cssNoComments, /\.rail__stop::before\s*\{[^}]*left:\s*0;/);
assert.match(js, /var origin = railStops\[0\]\.offsetTop/);

// The fill rests on the active section's tick: active is the panel covering the
// viewport middle, the fill is interpolated between tick anchors, and every
// panel is one screen tall.
assert.match(js, /function activeSection\(/);
assert.match(js, /function fillTarget\(/);
assert.match(cssNoComments, /\.stop-in\s*\{[^}]*min-height:\s*calc\(100vh - var\(--gutter\)\)/);
assert.equal(/min-height:\s*(86|74)vh/.test(cssNoComments), false, 'panels must share one full-screen height');
console.log('ok  rail carries an eased 5px page-progress bar; no glow; dash stops; full-screen panels; mobile-only hairline');

// Braces must balance; an unbalanced rule silently eats the rest of the sheet.
assert.equal((cssNoComments.match(/{/g) || []).length, (cssNoComments.match(/}/g) || []).length);
console.log('ok  css: braces balanced');

/* ── one voice: no content printed twice in one viewport ─────────── */

// The masthead is fixed, so anything it repeats is on screen twice. While the
// hero — which prints the name and offers Resume — is on screen, the bar's two
// copies stand down; the existing `.is-stuck` walk-begins state brings them back.
assert.match(cssNoComments,
  /\.masthead:not\(\.is-stuck\) \.brand[^{]*\{[^}]*opacity:\s*0/);
// The hero line is its own data field, never a bio paragraph, so the same
// sentence cannot print in the hero and again in About.
assert.match(js, /P\.heroLine/);
// About and Contact list the other channels; Resume belongs to the masthead
// (and the hero), so printing it in a section row would put two on screen.
assert.match(js, /function sectionSocial\(/);
assert.match(js, /s\.label !== 'Resume'/);
// The footer must not repeat the name the masthead already carries.
assert.equal(htmlNoComments.includes('foot__name'), false, 'the footer repeats the masthead name');
console.log('ok  one voice: masthead stands down over the hero; hero line, Resume and footer deduped');

/* ── the contact email copies, it does not mail ───────────────────── */

// The label is obfuscated and the click copies the real address out of
// data-copy. The literal address must not sit in the shell, where a scraper
// reads it without running the renderer.
assert.equal(htmlNoComments.includes('mailto:'), false, 'the shell still ships a mailto');
assert.equal(js.includes('mailto:'), false, 'the renderer still builds a mailto link');
assert.match(js, /\[dot\]/);
assert.match(js, /\[at\]/);
assert.match(js, /data-copy="' \+ esc\(P\.email\)/);
assert.match(js, /navigator\.clipboard\.writeText/);
assert.match(js, /document\.execCommand\('copy'\)/);
assert.match(js, /class="contact-mail__note"/);
console.log('ok  contact email: obfuscated label, copies via data-copy, no mailto anywhere');

/* ── no third-party resource loads (anchor hrefs are allowed) ─────── */

const resourcePatterns = [
  /<script[^>]+src="https?:/i,
  /<link[^>]+rel="stylesheet"[^>]+href="https?:/i,
  /<img[^>]+src="https?:/i,
  /url\(\s*['"]?https?:/i,
];
for (const [name, src] of [['index.html', htmlNoComments], ['css/styles.css', cssNoComments], ['js/vendor/lenis.css', vendorCss], ['js/main.js', js], ['js/data.js', data]]) {
  for (const re of resourcePatterns) {
    assert.equal(re.test(src), false, `third-party resource load in ${name}: ${re}`);
  }
}
console.log('ok  no third-party resource loads');

/* ── the renderer's contract ──────────────────────────────────────── */

for (const id of ["'top'", "'about'", "'news'", "'work'", "'leadership'", "'honours'", "'contact'"]) {
  assert.ok(js.includes(id), `renderer missing section id ${id}`);
}
assert.match(js, /S\.deriveRooms\(P\.projects\)/);
assert.match(js, /function categoryCopy\(/);
assert.match(js, /function categoryCards\(/);
assert.match(js, /function openProject\(/);
assert.match(js, /function closeProject\(/);
assert.match(js, /function trapTab\(/);
assert.match(js, /data-kind="panel"/);
assert.match(js, /stop--category/);
assert.match(js, /project-card/);
assert.match(js, /project-card__art[\s\S]{0,400}FALLBACK/);
assert.match(js, /function roomSlug\(/);
assert.match(js, /Array\.isArray\(p\.shots\)/, 'a plugin record hangs its screenshots');
assert.match(cssNoComments, /\.project-view/);
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
assert.equal(P.projects.length, 9, 'the page is built for nine project records');
const rooms = S.deriveRooms(P.projects);
assert.equal(Array.from(rooms, (r) => r.key).join(','), 'Applications,DSH Plugins,Robotics', 'the Work panels are the three categories');
assert.equal(Array.from(rooms, (r) => r.projects.length).join(','), '3,3,3', 'each category panel holds three projects');
assert.equal(P.leadership.length, 4, 'leadership renders four cards');
assert.equal(S.honoursTiles(P.honors).tiles.length, 5, 'honours renders the standalone tiles');
assert.equal(P.news.length, 4, 'news renders four rows');
assert.equal(P.social[0].label, 'Resume', 'the masthead resume link reads PORTFOLIO.social[0]');
assert.equal(P.heroLine, 'In pursuit of knowledge.', 'the hero sentence is a dedicated field');
assert.equal(P.bio.includes(P.heroLine), false, 'the hero sentence must not also be a bio paragraph');
console.log('ok  data: 9 projects, 4 leadership cards, 5 honour tiles, 4 news rows; hero line kept out of bio');

/* ── the npm test script actually runs this file ──────────────────── */

assert.match(pkg.scripts.test, /tests\/page\.test\.mjs/);
console.log('ok  package.json runs this guard');

console.log('\npage guard passed');
