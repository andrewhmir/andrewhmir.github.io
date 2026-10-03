/* Static shell check — the invariants a DOM stub cannot reach: the markup's
   structure, the exact palette, and the hard constraints from the spec. Run it
   with `node tests/shell-check.mjs`; it exits non-zero on any failure. */
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('css/styles.css', 'utf8');
const main = readFileSync('js/main.js', 'utf8');
let fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : '  -> ' + detail));
  if (!cond) fail++;
};

/* ---- HTML: tag balance for the tags a hand edit can unbalance ---- */
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','!doctype']);
const stack = [];
const errors = [];
/* Comments first: an indented `<!-- ... -->` otherwise parses as a bogus tag. */
const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
const tagRe = /<(\/?)([a-zA-Z!][\w!-]*)([^>]*?)(\/?)>/g;
let m;
while ((m = tagRe.exec(withoutComments))) {
  const [, close, rawName, attrs, selfClose] = m;
  const name = rawName.toLowerCase();
  if (VOID.has(name) || selfClose === '/' || attrs.trim().endsWith('/')) continue;
  if (!close) stack.push(name);
  else {
    const top = stack.pop();
    if (top !== name) errors.push(`</${name}> closed <${top}>`);
  }
}
ok('html tags balance', errors.length === 0 && stack.length === 0,
  errors.join('; ') + (stack.length ? ' unclosed: ' + stack.join(',') : ''));

/* ---- HTML: the DOM contract later tasks consume ---- */
const required = [
  ['id="navHeader"', 'navHeader'],
  ['id="navList"', 'navList'],
  ['id="directory"', 'directory'],
  ['id="hall"', 'hall'],
  ['id="strip"', 'strip'],
  ['id="modalOverlay"', 'modalOverlay'],
  ['id="modalCard"', 'modalCard'],
  ['id="modalClose"', 'modalClose'],
  ['id="modalHeader"', 'modalHeader'],
  ['id="modalImage"', 'modalImage'],
  ['id="modalBody"', 'modalBody'],
  ['id="announcer"', 'announcer'],
  ['class="content-layer"', 'content-layer'],
];
for (const [needle, label] of required) {
  ok('shell has ' + label, html.includes(needle), 'missing ' + needle);
}

/* The old fixed painting-and-grain layer must be gone: it sat at z-index 0 over
   a .content-layer that deliberately has no z-index, so it painted over every
   room — and the spec rules out film grain (it lifts near-blacks). */
ok('the old atmosphere layer is gone',
  !html.includes('bg-atmosphere') && !css.includes('.bg-atmosphere'),
  'still present');

/* ---- HTML: ids unique ---- */
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]);
ok('ids appear once each', new Set(ids).size === ids.length, ids.join(','));

/* ---- HTML: the vertical document is gone ---- */
const dead = ['scrollProgress', 'scrollTopBtn', 'navToggle', 'heroPhoto', 'heroBio', 'heroEmail',
  'heroLinks', 'newsTimeline', 'projectList', 'leadershipList', 'honorsList', 'footerEmail', 'currentYear'];
const present = dead.filter(id => html.includes('id="' + id + '"'));
ok('dead vertical-document ids removed', present.length === 0, 'still present: ' + present.join(', '));
ok('modal stays a child of .content-layer',
  /class="content-layer"[\s\S]*id="modalOverlay"[\s\S]*<\/div><!-- \/content-layer -->/.test(html));

/* The scroll container has to be focusable, or the keyboard cannot reach the
   walk and nothing inside it can be tabbed to. */
ok('the walk is focusable', /<main[^>]*id="hall"[^>]*tabindex="0"/.test(html),
  '#hall has no tabindex="0"');

/* ---- HTML: script order — data, vendored, then main ---- */
const order = [...html.matchAll(/<script src="([^"]+)"/g)].map(x => x[1]);
ok('script order is data → vendor → main',
  JSON.stringify(order) === JSON.stringify(['js/data.js', 'js/vendor/lenis.min.js', 'js/vendor/lenis-snap.min.js', 'js/main.js']),
  order.join(' → '));

/* ---- CSS: braces balance ---- */
const braces = (css.match(/{/g) || []).length - (css.match(/}/g) || []).length;
ok('css braces balance', braces === 0, braces + ' unbalanced');

/* ---- CSS: every var() reference resolves ---- */
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(x => x[1]));
/* Set from JS at runtime, so they legitimately have no stylesheet definition:
   --scrollbar-w by lockBodyScroll, --reveal-delay by the inline reveal style. */
const RUNTIME = new Set(['--scrollbar-w', '--reveal-delay']);
const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(x => x[1]));
const missing = [...used].filter(t => !defined.has(t) && !RUNTIME.has(t));
ok('every var() is defined', missing.length === 0, missing.join(', '));

/* ---- CSS: the spec palette, byte for byte ---- */
const palette = {
  '--night': '#0d0c0b', '--room': '#131211', '--room-warm': '#171513',
  '--text': '#e8dcc6', '--text-strong': '#f6efe0', '--text-quiet': '#8c8375', '--accent': '#c9a45c',
};
for (const [tok, val] of Object.entries(palette)) {
  /* Anchored on the declaration, or `--text` also matches `--text-strong`. */
  ok(tok + ' is ' + val, new RegExp('(^|[\\s;{])' + tok.replace(/-/g, '\\-') + ':\\s*' + val + '\\s*;', 'm').test(css), 'not found');
}

/* Comments are stripped for the checks that look for forbidden *code*: the
   rejected colour and color-mix() are named in a comment explaining why they
   are banned, which is documentation, not use. */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
ok('rejected third tier #6d6559 absent', !cssCode.includes('6d6559'), 'used in code');
ok('no color-mix tier', !cssCode.includes('color-mix'), 'used in code');
ok('native scroll-snap is off', /scroll-snap-type:\s*none/.test(css));
ok('reduced motion leaves works lit',
  /prefers-reduced-motion: reduce[\s\S]{0,200}\.work \.canvas \{ transition: none; opacity: 1; filter: none/.test(css));
ok('no non-zero border radius token', /--radius-sm:\s*0;/.test(css) && /--radius-md:\s*0;/.test(css));

/* Hard constraint: radius is zero EVERYWHERE, not just in the tokens. The token
   check alone once passed while eight rules hardcoded 50%, 1px, 2px and 3px. */
const radii = [...cssCode.matchAll(/border-radius:\s*([^;}]+)/g)]
  .map((m) => m[1].trim())
  .filter((v) => v !== '0' && !/^var\(--radius-(sm|md)\)$/.test(v));
ok('every border-radius is zero', radii.length === 0, 'non-zero: ' + [...new Set(radii)].join(', '));

/* Hard constraint: --lit must never be written on a subtree root. */
ok('--lit is written only to work elements',
  /w\.style\.setProperty\('--lit'/.test(main) &&
  !/(strip|hall|documentElement|body)\.style\.setProperty\('--lit'/.test(main),
  'a subtree root receives --lit');

/* ---- JS: the walk's configuration, against the spec §5 block ---- */
const walkRequired = [
  [/orientation:\s*'horizontal'/, "orientation: 'horizontal'"],
  [/lerp:\s*0\.1\b/, 'lerp: 0.1'],
  [/autoRaf:\s*true/, 'autoRaf: true'],
  [/anchors:\s*true/, 'anchors: true — without it in-page links stop working'],
  [/prevent:[\s\S]{0,120}closest\('\.modal-overlay'\)/, "prevent → closest('.modal-overlay')"],
  [/new Snap\(lenis,\s*\{/, 'new Snap(lenis, …)'],
  [/type:\s*'proximity'/, "type: 'proximity'"],
  [/distanceThreshold:\s*'35%'/, "distanceThreshold: '35%'"],
  [/debounce:\s*150\b/, 'debounce: 150'],
  [/wrapper:\s*hall/, 'wrapper: hall'],
  [/content:\s*strip/, 'content: strip'],
];
for (const [re, label] of walkRequired) ok('walk config: ' + label, re.test(main), 'not found');

ok('walk is exposed as Site.walk', /Site\.walk\s*=\s*initWalk\(\)/.test(main), 'not wired into init()');
ok('walk exposes goToRoom/stop/start/resize/registerTargets',
  ['goToRoom', 'registerTargets', 'resize', 'stop', 'start', 'lenis', 'snap'].every(k => new RegExp('\\b' + k + ':').test(main)),
  'missing a key');
ok('snap targets come from [data-snap]', /querySelectorAll\('\[data-snap\]'\)/.test(main), 'not found');
ok('snap targets are registered on strip mutation',
  /MutationObserver[\s\S]{0,160}childList: true/.test(main), 'not found');

/* ---- JS: no delegated handler may be bound to the deleted hosts ---- */
ok('delegation is bound to document, not to a deleted host',
  /document\.addEventListener\('click',[\s\S]{0,400}data-action="modal"/.test(main),
  'the modal trigger is not delegated from document');

console.log('\n' + (fail === 0 ? 'shell check: all clear' : 'shell check: ' + fail + ' failed'));
process.exit(fail ? 1 : 0);
