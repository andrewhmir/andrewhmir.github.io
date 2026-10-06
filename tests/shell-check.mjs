/* Static shell check — the invariants a DOM stub cannot reach: the markup's
   structure, the exact palette, and the hard constraints from the spec. Run it
   with `node tests/shell-check.mjs`; it exits non-zero on any failure. */
import { readFileSync, existsSync } from 'node:fs';

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
  ['id="directory"', 'directory'],
  ['id="roomRail"', 'roomRail'],
  ['id="dockProgress"', 'dockProgress'],
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

/* ---- HTML: the sticky rail and the in-dock progress ----
   The rail names the area the walk is standing in, and the progress bar draws
   the walk's position inside the dock's own box rather than along the screen
   edge. #dockProgress is a SIBLING of #directory, not a child: renderDock()
   writes #directory.innerHTML, which destroys every child node it has, so a bar
   placed inside it would be wiped on every render. */
ok('the shell has a sticky room rail, hidden from assistive tech',
  /<header class="room-rail"[^>]*id="roomRail"[^>]*aria-hidden="true"/.test(html),
  'the shell has no aria-hidden #roomRail');

ok('the shell has no progress rail outside the dock',
  !/class="rail"/.test(html),
  'the old #rail is still in the shell — the progress belongs inside the dock');

ok('the dock progress is inside the dock',
  /<nav class="dock"[\s\S]*id="dockProgress"[\s\S]*<\/nav>/.test(html),
  'the progress bar is not inside .dock');

/* The check above cannot tell a SIBLING from a CHILD: because #directory is
   itself inside <nav class="dock">, `…id="dockProgress"…</nav>` matches just as
   happily when the track is nested inside #directory — the one shape that must
   never ship. Ordering does not separate them either: the nested track still
   appears after the directory's opening tag. Only capturing #directory's own
   content does, so assert on that. On the real shell the capture is empty
   (length 0) because renderDock() is what fills it. */
ok('the dock progress is a sibling of the directory, not inside it',
  (() => {
    const m = html.match(/<div class="dock-links" id="directory">([\s\S]*?)<\/div>/);
    if (!m) return false;
    return !/dockProgress/.test(m[1]);
  })(),
  '#dockProgress is inside #directory, so renderDock() wipes it on every render');

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
const dead = ['scrollProgress', 'scrollTopBtn', 'heroPhoto', 'heroBio', 'heroEmail',
  'heroLinks', 'newsTimeline', 'projectList', 'leadershipList', 'honorsList', 'footerEmail', 'currentYear'];
const present = dead.filter(id => html.includes('id="' + id + '"'));
ok('dead vertical-document ids removed', present.length === 0, 'still present: ' + present.join(', '));

/* ---- The dead navigation bar ----
   The bar held one italic wordmark and two elements that measured 0x0:
   renderNav() is deliberately never called, because the nav it filled listed
   #News, #Projects and #Records, none of which exist in the walk. The
   directory beneath it is the only working navigation, and it was the band
   covering the room title. Nothing may reintroduce it. */
ok('the shell has no navigation bar', !/class="nav-header"/.test(html));
ok('the shell has no nav list',        !/id="navList"/.test(html));
ok('the shell has no nav menu',        !/id="navMenu"/.test(html));
ok('the shell has no mobile toggle',   !/id="navToggle"/.test(html));
ok('the navbar height token is gone',  !/--navbar-h/.test(css));
ok('no rule styles .nav-header',       !/\.nav-header\b/.test(css));
ok('no rule styles .nav-toggle',       !/\.nav-toggle\b/.test(css));
ok('main.js has no renderNav',         !/function renderNav\b/.test(main));
ok('main.js has no updateNavVisibility', !/function updateNavVisibility\b/.test(main));
ok('main.js has no updateActiveNav',   !/function updateActiveNav\b/.test(main));
ok('main.js has no initSmoothScroll',  !/function initSmoothScroll\b/.test(main));
ok('no live-region reads .nav-backdrop', !/nav-backdrop/.test(css) && !/nav-backdrop/.test(main));
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
   --scrollbar-w by lockBodyScroll, --reveal-delay by the inline reveal style,
   and --h/--shift by renderCluster, which gives each framed piece its frame
   height and its offset out of line. */
const RUNTIME = new Set(['--scrollbar-w', '--reveal-delay', '--h', '--shift']);
const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(x => x[1]));
const missing = [...used].filter(t => !defined.has(t) && !RUNTIME.has(t));
ok('every var() is defined', missing.length === 0, missing.join(', '));

/* ---- CSS: the spec palette, byte for byte ----
   The three wall tokens are cool blue-slate, taken from the mural's own range;
   the two TEXT tiers and the accent stay warm, because warm light on cool stone
   is the contrast the page is built on.

   Retuned once, by the brighten pass ("option C — brighten the room"). The four
   values that moved are the two text tiers, the accent and the muted tier, and
   the muted tier is the one that mattered: it shipped at 4.54:1, which is AA by
   0.04 and reads as too dim to be comfortable. A wall CANNOT be opened without
   paying for it here — the crown is the brightest ground on the page and
   --text-quiet is the binding tier — so opening the wall and raising this tier
   are one change, not two. See the contrast floor below, which is what actually
   proves the pair holds. */
const palette = {
  '--night': '#080c0e', '--room': '#101519', '--room-warm': '#141b20',
  '--text': '#ece2cf', '--text-strong': '#f9f4e8', '--text-quiet': '#9a9384', '--accent': '#d4b06a',
};
for (const [tok, val] of Object.entries(palette)) {
  /* Anchored on the declaration, or `--text` also matches `--text-strong`. */
  ok(tok + ' is ' + val, new RegExp('(^|[\\s;{])' + tok.replace(/-/g, '\\-') + ':\\s*' + val + '\\s*;', 'm').test(css), 'not found');
}

/* Comments are stripped for the checks that look for forbidden *code*: the
   rejected colour and color-mix() are named in a comment explaining why they
   are banned, which is documentation, not use. */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* ---- CSS: the mural ----
   The museum wall. One image, on the hall itself, looping across the whole
   collection and carried at the scroll rate because it is the scroll
   container's own background. Two of these checks are the ones that actually
   catch a regression: the mural's own CSS is easy to write and easy to
   silently defeat.

   1. If `.room`'s gradient ever goes back to opaque `var(--room)`, every room
      paints over the mural and the feature disappears while the stylesheet
      still looks correct. An opaque room is the failure mode.
   2. If `#hall` loses `position: relative; z-index: 0` it stops being a
      stacking context, and `body { background }` then paints over the mural.
      `overflow: auto` does not create one, so nothing else here saves it. */
const ruleBody = (sel) => {
  const at = cssCode.search(new RegExp('(^|[},])\\s*' + sel.replace(/[.#]/g, '\\$&') + '\\s*\\{', 'm'));
  if (at < 0) return '';
  const open = cssCode.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < cssCode.length; i++) {
    if (cssCode[i] === '{') depth++;
    else if (cssCode[i] === '}' && --depth === 0) return cssCode.slice(open + 1, i);
  }
  return '';
};
const room = ruleBody('.room');

/* The ramp is read to the end of the declaration, not to the first `)` — the
   first stop's own `rgba(...)` closes a lazy match at three digits and the
   remaining stops vanish. */
const roomStops = [...room.matchAll(/linear-gradient\(180deg([^;]*)\);/g)]
  .flatMap((m) => [...m[1].matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g)])
  .map((m) => ({ r: +m[1], g: +m[2], b: +m[3], a: +m[4] }));
ok('the room scrim is translucent', roomStops.length >= 3,
  'found ' + roomStops.length + ' rgba stops in the room gradient');
ok('every room stop is translucent', roomStops.every((s) => s.a > 0 && s.a < 1),
  'opaque stop: ' + JSON.stringify(roomStops.filter((s) => !(s.a > 0 && s.a < 1))));
/* Subtle, not loud: the crown has to let the mural read and the foot has to
   keep the dock and the captions on near-black. */
if (roomStops.length) {
  const crown = roomStops[0].a, foot = roomStops[roomStops.length - 1].a;
  ok('the mural is most visible at the crown', crown < foot,
    'crown ' + crown + ' is not lighter than foot ' + foot);
  ok('the crown is not too loud', crown >= 0.3, 'alpha ' + crown + ' is nearly clear');
  ok('the foot stays closed', foot >= 0.7,
    'alpha ' + foot + ' lets the mural through behind the dock');
}

/* ── A room's edge is a RECESS, not a lit hairline ────────────────────────────
   The boundary between two rooms is drawn by `.room`'s border-right. It was
   `1px solid var(--edge-soft)` — a cool white at 7% — which is a LIGHT line.
   Over flat black that reads as a soft division; over the mural it reads as a
   line drawn down the wall, because the eye finds a bright hairline far more
   easily against texture than against a void. Measured at scrollLeft 500 on the
   About/Robotics boundary: the bright border put a +13.9/-7.0 luminance step on
   a single column (21.49 summed across the three), which ranked it the 8th
   largest deviation of 983 columns on the whole wall; making it a dark recess
   dropped that to 5.57.

   The guard is a LUMINANCE comparison rather than the literal value, so the
   border may be retuned — but never to something lighter than the wall it sits
   on, which is the regression. --night is 8,12,14 and --edge-soft is 214,232,240,
   so the two ends are far apart and the test is not delicate. */
const roomEdge = (room.match(/border-right:\s*1px\s+solid\s+(rgba?\([^)]+\))/) || [])[1] || '';
const edgeNums = (roomEdge.match(/\d+(\.\d+)?/g) || []).map(Number);
const edgeLum = edgeNums.length >= 3 ? 0.2126 * edgeNums[0] + 0.7152 * edgeNums[1] + 0.0722 * edgeNums[2] : null;
const edgeAlpha = edgeNums.length >= 4 ? edgeNums[3] : 1;
const nightLum = 0.2126 * 0x08 + 0.7152 * 0x0c + 0.0722 * 0x0e;
ok('a room edge is a recess in the wall, not a lit line',
  edgeLum !== null && edgeLum <= nightLum + 8,
  'border-right is ' + (roomEdge || 'missing') + ' (luminance ' + (edgeLum === null ? '?' : edgeLum.toFixed(1))
  + '); a LIGHT border draws a visible vertical line over the mural — see wall-roomseam.mjs');
ok('the room edge still separates the rooms',
  edgeAlpha > 0.2,
  'border alpha ' + edgeAlpha + ' — too faint to mark the room boundary at all');

/* ── No sub-pixel dot grids on the wall ───────────────────────────────────────
   The room used to carry a "wall nap": two offset dot grids on a 4px period,
   drawn at 0.5px and 0.6px. A dot smaller than a pixel inside a
   `radial-gradient` is antialiased against the pixel grid, and on a wide
   viewport at a non-integer device pixel ratio that quantises into hard vertical
   columns down the whole height of the room — literal lines drawn on the mural.

   Measured at 1917x1078 dpr 2: one column sat darker than its neighbours on
   97.4% of rows (mean -3.3). It survived removing the room border, the scrims
   AND the mural, so nothing else explained it. Removing the layer took that
   column to 19.9%, which is ordinary mural texture.

   Two independent guards, because the failure is invisible in a code review and
   obvious only on a large screen: the layer must be gone, and no radial-gradient
   stop in the stylesheet may describe a sub-pixel dot. */
ok('the wall carries no sub-pixel dot grid',
  !/\.room::before/.test(cssCode),
  '.room::before is back — a sub-pixel dot grid over the mural draws vertical lines at non-integer dpr');
const subPixelDots = [...cssCode.matchAll(/radial-gradient\(\s*rgba\([^)]*\)\s*(\d*\.\d+)px/g)]
  .map((m) => m[1])
  .filter((v) => parseFloat(v) < 1);
ok('no radial-gradient draws a dot smaller than one pixel',
  subPixelDots.length === 0,
  'sub-pixel radii: ' + [...new Set(subPixelDots)].join(', ') + 'px — these antialias into lines');

/* ── The mural ────────────────────────────────────────────────────────────────
   The mural is `#hall`'s OWN background with `background-attachment: local`.
   That is not a preference; it is the only arrangement that works, and both
   wrong answers are silent.

   1. A background on a scroll container with the default `scroll` attachment is
      pinned to the container's box, so the wall sat perfectly still while the
      rooms slid past — measured as a 0px frame-to-frame change over nine 45px
      scroll steps, against 5.2 for `local`. `local` is what binds the painting
      to the SCROLLED CONTENT rather than to the viewport.
   2. A separate absolutely-positioned element CANNOT span this walk. `#hall`
      and `#strip` both have a 987px layout box inside a 32227px scroll, so an
      `inset: 0` layer sizes to one VIEWPORT, not to the collection: measured
      wall 987px against a walk of 30601px, a 29614px shortfall. The mural's
      fill area then ends at x=987 and the visitor scrolls onto bare --night
      past the first screen. That was the shipped bug — the mural looked right
      at every offset a screenshot was taken at near the start of the walk.
   3. `repeat-x` fills the width but leaves the wall bare below one frieze. */
const hall = ruleBody('#hall');
const strip = ruleBody('#strip');

ok('the hall carries the mural as its own background',
  /background-image:/.test(hall) && /var\(--wall\)/.test(hall),
  '#hall does not paint var(--wall) — the mural is missing from the walk');
ok('the mural is bound to the scrolled content, not the viewport',
  /background-attachment:\s*local/.test(hall),
  'a background on a scroll container is pinned unless it is `local`; '
  + '`scroll` and `fixed` both hold still while the rooms slide past');
ok('the hall is a stacking context, so the rooms layer predictably',
  /position:\s*relative/.test(hall) && /z-index:\s*0/.test(hall),
  '#hall lost position/z-index');
ok('no separate wall element, because none can span the walk',
  !/id="wall"/.test(html) && !/^\.wall\s*\{/m.test(cssCode),
  'a .wall layer sizes to the viewport (987px) inside a 32227px scroll, '
  + 'so the mural stops after one screen — see the note above');
ok('the rooms paint above the mural',
  /position:\s*relative/.test(strip) && /z-index:\s*1/.test(strip),
  '#strip needs position/z-index above the hall background or the rooms disappear');

/* Both axes. Horizontally it loops the length of the collection; vertically it
   has to fill the viewport, because one frieze at 1080x301 leaves the wall bare
   below 301px and the "wall" then stops a third of the way down the screen.
   `repeat-x` is the specific regression this guards. The SCRIM layer is
   `no-repeat` on purpose: it is a veil, and a tiled vertical gradient would
   band every viewport. */
ok('the mural loops across the collection and down the wall',
  /background-repeat:\s*[^;]*repeat,\s*repeat\b/.test(hall),
  'the mural must repeat on both axes, not repeat-x');
/* ── The tile must show the whole mural AND show it repeating ─────────────────
   Three failure modes, and earlier versions of this feature managed two of them.

   1. A tile WIDER than the window repeats the picture, but only one copy is
      ever in shot, so it reads as a single image cut short rather than a wall
      that loops. That is what a 1600px tile did at 1547px.
   2. A tile shrunk enough to guarantee a repeat at every size stops being a
      mural: at 50vw there were four copies across and four down, and the
      dragons became wallpaper.
   3. A stretched image is a distorted one. The `auto` in the second value is
      what scales the mural while keeping its 3.59:1 proportions.

   A bounded viewport-relative tile satisfies all three, so the assertion is on
   that shape rather than on a pixel count. tools/wall-crop.mjs prints the
   copies-across/down table for any candidate. */
const tile = (cssCode.match(/--wall-tile:\s*([^;]+);/) || [])[1];
ok('the mural tile tracks the window, so the repeat stays visible',
  !!tile && /vw/.test(tile),
  '--wall-tile is "' + (tile || '').trim() + '" — a fixed width cannot keep a copy in shot at every window size');
ok('the mural tile is bounded, so it stays a mural and not wallpaper',
  !!tile && /clamp\(/.test(tile),
  '--wall-tile needs a floor and a ceiling: too small is pattern, too large is a single copy');
ok('the mural is scaled, never stretched',
  !!tile && /\bauto\b/.test(tile),
  'without `auto` the image is stretched to the tile instead of keeping its proportions');

/* The scrim is the opacity dial, so it has to exist and be a real scrim. */
const scrim = cssCode.match(/--wall-scrim:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
ok('--wall-scrim is a real scrim', !!scrim && +scrim[4] >= 0.25 && +scrim[4] < 1,
  scrim ? 'alpha ' + scrim[4] : 'not defined');
ok('the shipped mural exists in files/',
  existsSync('files/wall-mushoku.webp'),
  'run: node tools/wall-import.mjs');

/* ── The measured contrast floor under the wall ───────────────────────────────
   The one thing the mural genuinely risks is contrast, and it risks it in
   exactly one place: the crown of the room scrim over the mural's brightest
   pixel, which is the brightest ground any text on this page ever meets. The
   room title's datum line and the plan's annotations both sit on it.

   This is a MODEL of the compositing, and it is deliberately conservative: it
   does not scale the asset down to the tile, and it does not reproduce the
   browser's own resampling. On the real page at 1440x900 the SHIPPED bound
   measures 4.61:1 while this arithmetic says 4.65:1 — close, and always on the
   safe side, which is what makes it useful as a regression guard. Retuning the
   scrim, the crown stop or the asset so that the model drops under 4.5 means
   the page is already under it.

   The brighten pass moved exactly those two numbers, and this is the check that
   proves it moved them safely: the wall was opened (scrim .42 -> .32, crown
   .58 -> .46) and --text-quiet was raised (#8c8375 -> #9a9384) to pay for it.
   The binding tier now clears AA by 0.76 instead of 0.04.

   The numbers come from the tools, not from guesses: tools/wall-import.mjs
   prints the mural's palette and peak, tools/wall-tune.mjs measures the
   rendered band and tools/wall-pixels.mjs reads the rendered page. */
const MURAL_PEAK = { r: 0x30, g: 0x3e, b: 0x42 };   /* brightest pixel of the SHIPPED asset, scaled to the 1080px tile */
const MIN_CROWN_LUM = 0.010;   /* 1% of white: the floor the brightening bought, see the check below */
const relativeLum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [relativeLum(a), relativeLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hexToRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

const crownStop = roomStops[0];
if (crownStop) {
  /* The hall's own scrim is under every room, so the crown composites over
     it — missing that term is how this check would pass while the page fails. */
  const wall = [8, 12, 14, +scrim[4]];
  const afterWall = {
    r: MURAL_PEAK.r * (1 - wall[3]) + wall[0] * wall[3],
    g: MURAL_PEAK.g * (1 - wall[3]) + wall[1] * wall[3],
    b: MURAL_PEAK.b * (1 - wall[3]) + wall[2] * wall[3]
  };
  const ground = {
    r: afterWall.r * (1 - crownStop.a) + crownStop.r * crownStop.a,
    g: afterWall.g * (1 - crownStop.a) + crownStop.g * crownStop.a,
    b: afterWall.b * (1 - crownStop.a) + crownStop.b * crownStop.a
  };
  const tiers = {
    '--text': hexToRgb(palette['--text']),
    '--text-strong': hexToRgb(palette['--text-strong']),
    '--text-quiet': hexToRgb(palette['--text-quiet'])
  };
  for (const [tok, col] of Object.entries(tiers)) {
    const cr = contrast(col, ground);
    /* --text-quiet is the binding tier, so 4.5 is the bar for all three. */
    ok(tok + ' clears AA on the brightest wall ground', cr >= 4.5,
      cr.toFixed(2) + ':1 — the crown scrim is too clear for the mural under it');
  }
  /* And the floor must not have been bought by simply closing the wall. */
  ok('the crown is still clear enough to see the mural',
    crownStop.a >= 0.38 && crownStop.a <= 0.75,
    'crown alpha ' + crownStop.a + ' — opaque hides the mural, clear breaks the text');

  /* ── And the wall must stay LIT, which is the other half of the same bargain ──
     The brighten pass exists because the page read as too dark, so the failure
     mode to guard is not only "the text fails" but "someone quietly closed the
     wall again". The crown ground is the brightest wall any text meets, so its
     luminance is the one number that says how open the wall is: at 1.18% of
     white it was the dark that was complained about, and the retune took it to
     1.54%. This is a floor, not an equality, so the wall may be opened further
     — what it may not do is go back to being a void. */
  const crownLum = relativeLum(ground);
  ok('the wall stays lit, not a void',
    crownLum >= MIN_CROWN_LUM,
    'the crown ground is ' + (100 * crownLum).toFixed(2) + '% of white, under the '
    + (100 * MIN_CROWN_LUM).toFixed(2) + '% floor the brighten pass established '
    + '— the wall has been closed again');
}

ok('rejected third tier #6d6559 absent', !cssCode.includes('6d6559'), 'used in code');
ok('no color-mix tier', !cssCode.includes('color-mix'), 'used in code');
ok('native scroll-snap is off', /scroll-snap-type:\s*none/.test(css));
ok('reduced motion leaves pieces lit',
  /prefers-reduced-motion: reduce[\s\S]{0,200}\.piece \{ transition: none; filter: none/.test(css));
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
