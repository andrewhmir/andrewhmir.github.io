/* Static shell check — the invariants a DOM stub cannot reach: the markup's
   structure, the exact palette, and the hard constraints from the spec. Run it
   with `node tests/shell-check.mjs`; it exits non-zero on any failure. */
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('css/styles.css', 'utf8');
const main = readFileSync('js/main.js', 'utf8');
const data = readFileSync('js/data.js', 'utf8');
const icons = readFileSync('js/icons.js', 'utf8');
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

/* ---- HTML: one heading, not a second smaller copy of it ----
   The walk names the area it is standing in with the room's OWN heading, which
   does it by carrying `position: sticky` and travelling with the walk. It is
   NOT a second element that repeats the name: the `<header class="room-rail"
   id="roomRail">` that used to head the shell was exactly that — a 15-19px
   copy that writeRail() refilled with the current room's title and subtitle on
   every boundary crossed, while the real 27-48px heading scrolled away.

   This is the half of the guard that reads markup; the half that reads the
   rule lives with the other CSS checks below, where the rule-body helper is
   defined. Three names to keep deleted: the id, the class, and the write path.

   Both sources are read with their COMMENTS STRIPPED, for the reason the
   stylesheet checks further down record: the notes that explain why the rail is
   gone have to name it, and a raw-text scan reports every one of those notes as
   a reintroduction. `index.html` and `js/main.js` both carry such a note. */
const htmlCode = withoutComments;
const mainCode = main.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
ok('the shell has no duplicate room header',
  !/id="roomRail"/.test(htmlCode) && !/class="room-rail"/.test(htmlCode),
  'the #roomRail copy of the room heading is back in the shell — the room already has one');

ok('main.js has no rail write path',
  !/function writeRail\b/.test(mainCode) && !/getElementById\('roomRail'\)/.test(mainCode),
  'writeRail() survives, so the heading is being duplicated into a second element again');

/* ---- HTML: the document has a heading of the first rank ----
   Without one the outline begins at `h2.room-title`, so the page had no heading
   of the first rank at all. The `h1` that fixes that carries `.sr-only`,
   because the walk has no masthead — it is read, never painted.

   This does NOT weaken the guard above. A room heading names a ROOM; this names
   the COLLECTION and its author, which no room heading does. The fault that
   deleted `#roomRail` was a second, smaller copy of a heading already on
   screen, and a heading that duplicates nothing is not that fault. Both halves
   are asserted: that it exists, and that it stays out of the layout. */
const h1s = htmlCode.match(/<h1[\s>]/g) || [];
ok('the shell has exactly one h1', h1s.length === 1,
  'found ' + h1s.length + ' <h1> in the shell — the outline has no heading of the '
  + 'first rank, or more than one');
ok('the h1 is visually hidden, not painted',
  /<h1[^>]*class="[^"]*\bsr-only\b/.test(htmlCode),
  'the h1 does not carry .sr-only, so it paints a title band the walk does not have');
ok('the .sr-only rule the h1 depends on is in the stylesheet',
  /\.sr-only\s*[,{]/.test(css),
  '.sr-only is not defined, so the h1 is both painted and unstyled');

ok('the shell has no progress rail outside the dock',
  !/class\s*=\s*["']rail["'\s]/.test(html),
  'the old #rail is still in the shell — the progress belongs inside the dock');

ok('the dock progress is inside the dock',
  /<nav class="dock"[\s\S]*id="dockProgress"[\s\S]*<\/nav>/.test(html),
  'the progress bar is not inside .dock');

/* The check above cannot tell a SIBLING from a CHILD: because #directory is
   itself inside <nav class="dock">, `…id="dockProgress"…</nav>` matches just as
   happily when the track is nested inside #directory — the one shape that must
   never ship. Ordering does not separate them either: the nested track still
   appears after the directory's opening tag. */
ok('the dock progress is a sibling of the directory, not inside it',
  (() => {
    /* #directory ships EMPTY in the shell - renderDock() is what fills it. So
       asserting its content is empty settles siblinghood completely: any child
       at all, including a nested wrapper around the track, is a non-empty
       capture. A lazy capture ending at the first </div> was NOT enough: one
       nested element in front of the track defeated it. */
    const m = html.match(/<div class="dock-links" id="directory">([\s\S]*?)<\/div>/);
    if (!m) return false;
    return m[1].trim() === '';
  })(),
  '#directory is not empty in the shell, so #dockProgress may sit inside it and be wiped by renderDock()');

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

/* ---- HTML: script order — data, glyphs, vendored, then main ----
   Lenis is the only vendored LIBRARY. `lenis-snap.min.js` was the second, and it
   is gone: the walk's snap went with it, so an entry reappearing here means a
   file that does not exist is being loaded. `js/icons.js` joined the list when
   the twelve glyphs were inlined; it is a GENERATED file rather than a vendored
   build, but its position is not free — see the check below it. */
const order = [...html.matchAll(/<script src="([^"]+)"/g)].map(x => x[1]);
ok('script order is data → icons → vendor → main',
  JSON.stringify(order) === JSON.stringify(['js/data.js', 'js/icons.js', 'js/vendor/lenis.min.js', 'js/main.js']),
  order.join(' → '));

/* ── js/icons.js is loaded, and its POSITION is a real requirement ────────────
   Three files and two dependencies, and each one fails differently:

     js/data.js  creates the object it is assigned onto: `globalThis.Site =
                 globalThis.Site || {}`.
     js/icons.js assigns onto that object, so it must come after it.
     js/main.js  is what CALLS `Site.icon()`, so it must come after that.

   Load it before data.js and the assignment lands on an object data.js then
   replaces, taking all twelve glyphs with it; load it after main.js and every
   call site throws on a function that does not exist yet. Both are silent in a
   diff and they are what this asserts.

   The FIRST load must be the one after data.js, and the LAST must be the one
   before main.js — so a second `js/icons.js` tag is caught here too and not only
   by the exact sequence above. That is not hypothetical: the negative test for
   this guard appended a trailing load and the `indexOf` version of this check
   passed it, because a first load did sit before main.js. */
const firstIconAt = order.indexOf('js/icons.js');
const lastIconAt = order.lastIndexOf('js/icons.js');
const dataAt = order.indexOf('js/data.js');
const mainAt = order.indexOf('js/main.js');
ok('js/icons.js is loaded, after data.js and before main.js',
  firstIconAt !== -1 && dataAt !== -1 && mainAt !== -1 && dataAt < firstIconAt && lastIconAt < mainAt,
  'the shell loads ' + order.join(' → ') + ' — js/icons.js must come after js/data.js, which '
  + 'creates the `Site` object it assigns onto, and every load of it must come before '
  + 'js/main.js, which calls Site.icon()');

/* ── index.html fetches nothing from a third-party host ───────────────────────
   Font Awesome's stylesheet was the last one, and it is gone: the twelve glyphs
   it drew are inline SVG in `js/icons.js` now. This is the guard that keeps it
   gone, and it has to be written in three directions at once.

   1. READ WITH COMMENTS STRIPPED. The removal is documented in comments that
      necessarily NAME the hosts — the note on the vendored fonts names
      `fonts.googleapis.com` and `fonts.gstatic.com`, the note beside the
      js/icons.js script tag names `use.fontawesome.com` — and a raw scan reports
      every one of those notes as a reintroduction. That is the same reason the
      rail and snap guards read stripped sources.
   2. NOT EVERY ABSOLUTE URL IS A FETCH. `rel="canonical"`, the Open Graph and
      Twitter metadata and the `<noscript>` contact links (GitHub, LinkedIn, the
      resume) all name absolute URLs and the page requests none of them. So the
      test is not `https://` anywhere in the file.
   3. BUT A LINK CAN BE A FETCH, and `rel="canonical"` is a `<link>`, so "the tag
      is a link" is not the test either — the RELATION is. Only the relations
      that make the browser go and get something are listed, so a new
      third-party link has to be added here deliberately rather than slip
      through as a rel nobody thought about. */
const FETCHING_REL = new Set([
  'stylesheet', 'icon', 'apple-touch-icon', 'mask-icon', 'manifest',
  'preload', 'prefetch', 'modulepreload', 'prerender', 'dns-prefetch', 'preconnect',
]);
const isNetworkUrl = (u) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(String(u == null ? '' : u).trim());
const fetched = [];
for (const tag of htmlCode.match(/<link\b[^>]*>/gi) || []) {
  const rel = ((tag.match(/\brel\s*=\s*["']([^"']*)["']/i) || [])[1] || '').toLowerCase().trim();
  const href = (tag.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
  if (FETCHING_REL.has(rel) && isNetworkUrl(href)) fetched.push('<link rel="' + rel + '"> ' + href);
}
for (const tag of htmlCode.match(/<script\b[^>]*>/gi) || []) {
  const src = (tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
  if (isNetworkUrl(src)) fetched.push('<script src> ' + src);
}
for (const at of htmlCode.match(/@import[^;]*/gi) || []) {
  const url = (at.match(/["']([^"']+)["']/) || at.match(/url\(\s*([^)\s]+)\s*\)/) || [])[1] || '';
  if (isNetworkUrl(url)) fetched.push('@import ' + url);
}
ok('index.html fetches nothing from a third-party host',
  fetched.length === 0,
  'the shell asks another host for: ' + fetched.join(', ') + ' — every asset is vendored '
  + '(css/fonts.css, js/vendor/lenis.min.js, js/icons.js) and the page is served from one '
  + 'origin; a CDN coming back at runtime is the regression this guard exists for');

/* ── Every glyph the walk asks for exists in the map ──────────────────────────
   `Site.icon(name)` returns an EMPTY STRING for a name it does not know, and it
   does that on purpose: a missing glyph should cost a decoration, not a stand.
   That is the right runtime behaviour and it is also why this check has to
   exist. `Site.icon('chevrons-left')` renders as NOTHING — silently, in one
   place, with the element around it still laid out and still 1em of nothing. No
   browser probe in tools/ would notice a 1em hole, so the names are read out of
   both halves and compared.

   Both ends of the seam are read, because a name that is asked for and unknown
   and a glyph that is vendored and never drawn are the same defect seen from
   opposite sides: the `icon:` values in js/data.js, the literal `Site.icon('…')`
   calls in js/main.js, and the keys of the map in js/icons.js.

   The `icon:` values are read from BOTH files, and that is not tidiness. Four of
   the twelve are named in js/main.js and nowhere else — the dialog's own tab
   descriptors (`eye`, `users`, `trophy`, `file-pdf`) — and they are consumed
   through `Site.icon(l.icon)`, a variable, so no literal-call parse can see
   them. Reading js/data.js alone leaves three of the twelve unaccounted for, and
   a typo in one of those four descriptors would then be invisible to this check
   in BOTH directions: the name is never compared against the map, and the glyph
   it should have drawn reads as a vendored glyph nobody asks for. */
const dataCode = data.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const declared = new Set([...icons.matchAll(/^\s*'([a-z-]+)':\s*\{\s*vb:/gm)].map((m) => m[1]));
const iconValues = (src) =>
  [...src.matchAll(/(?:^|[{,\s])icon:\s*["']([^"']+)["']/gm)].map((m) => m[1]);
const asked = [...new Set([
  ...iconValues(dataCode),
  ...iconValues(mainCode),
  ...[...mainCode.matchAll(/Site\.icon\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
])].sort();
const unknownGlyph = asked.filter((n) => !declared.has(n));
ok('every glyph the walk asks for exists in js/icons.js',
  asked.length > 0 && unknownGlyph.length === 0,
  unknownGlyph.length
    ? 'not in the map: ' + unknownGlyph.join(', ') + ' — Site.icon() returns "" for an unknown '
      + 'name, so this draws nothing at all, in one place, silently. The map holds: '
      + [...declared].sort().join(', ')
    : 'no icon name was found in js/data.js or js/main.js at all, so the parse — not the map — '
      + 'is what is broken');

const unusedGlyph = [...declared].filter((n) => asked.indexOf(n) === -1).sort();
ok('every vendored glyph is still asked for by the walk',
  declared.size > 0 && unusedGlyph.length === 0,
  unusedGlyph.length
    ? 'in the map and drawn nowhere: ' + unusedGlyph.join(', ') + ' — the twelve are a pinned '
      + 'set, so dropping one is a change to that set and not a call site\'s private decision'
    : 'the map declares no glyphs, so the check above is comparing against an empty set');

/* ── No Font Awesome class string survives in the code ────────────────────────
   The call sites moved to `Site.icon()` and the stylesheet link went with them.
   This is the assertion that both halves of that are still true together: an
   `<i class="fas fa-play">` left in a render path draws NOTHING now that nothing
   links Font Awesome, and it draws nothing only where that path runs — which for
   most of these call sites is a host element that no longer exists, so nothing
   else here would ever see it.

   Read on CODE with the comments stripped, for the reason above: the notes that
   explain the removal name Font Awesome at length, and a raw scan reads those
   sentences as a reintroduction. `\bfa-[a-z]` is the class prefix itself, so a
   single surviving class string is enough to fail. */
ok('no Font Awesome class string survives in the code',
  !/\bfa-[a-z]/.test(mainCode) && !/\bfa-[a-z]/.test(dataCode) && !/<i\s+class=/.test(mainCode),
  'a Font Awesome class is still emitted somewhere in js/main.js or js/data.js — nothing links '
  + 'its stylesheet now, so it draws nothing at all, and only on the path that emits it');

/* ---- CSS: braces balance ---- */
const braces = (css.match(/{/g) || []).length - (css.match(/}/g) || []).length;
ok('css braces balance', braces === 0, braces + ' unbalanced');

/* ---- CSS: every var() reference resolves ----
   Over the stylesheet with its COMMENTS REMOVED, and that matters more than it
   sounds: this file's comments discuss the tokens that were retired — "this was
   `height: var(--band-h)`", "the floor was `calc(var(--band-h) / 4)`" — so a
   scan of the raw text reports every retired token as a missing definition and
   fails on exactly the notes that record why it was retired. The first version
   of this check did that twice while the two-cell stand was built. */
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, '');
const defined = new Set([...cssBare.matchAll(/(--[\w-]+)\s*:/g)].map(x => x[1]));
/* Set from JS at runtime, so they legitimately have no stylesheet definition:
   --scrollbar-w by lockBodyScroll, --reveal-delay by the inline reveal style,
   --h/--shift by renderCluster, which gives each framed piece its frame
   height and its offset out of line, and --walk-progress by initLights, which
   writes the walk's own fraction on #dockProgress for `.dock-track::after` to
   draw. */
const RUNTIME = new Set(['--scrollbar-w', '--reveal-delay', '--h', '--shift', '--walk-progress']);
const used = new Set([...cssBare.matchAll(/var\((--[\w-]+)/g)].map(x => x[1]));
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

/* ── The room heading IS the walk's sticky sign ────────────────────────────────
   The heading names the area the walk is standing in, and it does that job as
   ITSELF rather than through a second, smaller copy of the name. Three
   declaration-level facts make that work, and each of the three fails silently
   in a browser while the stylesheet still reads correctly:

   1. `position: sticky`, obviously — without it the heading simply scrolls off
      the left of a room that is three screens wide.
   2. `align-self: flex-start`, which is the one that is easy to miss. `.room` is
      a column flex container and the heading is its first item, so `stretch`
      makes it exactly as wide as the room. A sticky element can only travel
      through the DISTANCE between its own size and its containing block's, so a
      full-width heading has zero slack and a correct-looking `position: sticky`
      is a no-op. `align-self` gives it its own text width — the slack.
   3. The offset is the room's own gutter TOKEN, not a repeated literal, so the
      pin and the padding cannot drift apart when one of them is retuned.

   The selector is `.room > .room-title` and not a bare `.room-title` for a
   fourth reason: `.room > * { position: relative }` is specificity 0-1-1 and
   outranks a bare class at 0-1-0, so a bare rule loses to it in silence. */
const roomTitle = ruleBody('.room > .room-title');
ok('the room heading is the sticky sign, not a copy of it',
  /position:\s*sticky/.test(roomTitle),
  'no `position: sticky` on .room > .room-title, so the heading scrolls off the walk');
ok('the sticky heading pins at the room gutter',
  /left:\s*var\(--room-gutter\)/.test(roomTitle),
  'the pin offset is not the room gutter token — it will drift from the stands it heads');
ok('the sticky heading is given the slack to travel',
  /align-self:\s*flex-start/.test(roomTitle),
  'the heading is still stretched to the full room width, so `position: sticky` cannot move it');
ok('the sticky heading still wraps rather than overflowing its room',
  /max-width:\s*100%/.test(roomTitle),
  'nothing caps the heading at its room, so a long subtitle stops wrapping at max-content '
  + 'width and paints over the neighbouring room');
ok('the pin offset and the room padding are one number',
  /padding:\s*42px\s+var\(--room-gutter\)\s+92px/.test(room) && /--room-gutter:\s*34px/.test(cssCode),
  'the room padding no longer reads --room-gutter, so the heading can pin off the stands\' edge');
ok('no rule styles a room rail',
  !/\.room-rail\b/.test(cssCode) && !/\.rr-title\b/.test(cssCode) && !/\.rr-meta\b/.test(cssCode),
  'a rule for the deleted rail survives — a live rule for a deleted element is documentation that lies');
ok('the rail height token is gone', !/--rail-h/.test(cssCode),
  '--rail-h survives; nothing reserves a band for a rail that no longer exists');

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

/* ── The two gaps: one between projects, one between categories ───────────────
   The walk has two distances and they are not the same thing. Two stands in one
   room are SIBLINGS — the same category under the same heading — and the wall
   between them is a frame. Two rooms are different categories, and the wall
   between them is a threshold the visitor walks through.

   They shipped the other way round. `--group-gap` was `2 * var(--stand-w)`:
   2,200px of bare wall between two projects of the SAME room. Two ROOMS, by
   contrast, were separated by nothing but their own 34px gutters and the 1px
   recess — 69px, measured at 1440x900, against a sibling gap of 2,200. The
   category boundary was the smallest distance in the walk.

   The sibling gap is now the smallest one that keeps the property the wall is
   hung for. A stand parks with its CENTRE on the screen's centre, so the bare
   wall beside it is `(100vw - stand) / 2` — 170px at 1440x900, 218 at
   1536x864, 90 at 1280x704 — and a gap at least that wide leaves no neighbour
   in shot. `max()` of that and a quarter of a stand is that same criterion,
   written down once, so the gap cannot be tuned below the property it buys.
   tools/ux-check.mjs measures the real thing; these are the static halves.

   The category gap is a share of the SCREEN rather than of the stand, because
   it is a band of wall a visitor crosses: half a screen of it is what makes the
   next room a different place instead of the next exhibit. It is spent as a ROOM's
   own padding and never as a gap in `#strip`, and this is the check that keeps
   it there. A flex gap is bare hall, and bare hall renders BRIGHTER than the
   rooms it separates — measured at 1440x900, the same 1,000px of wall reads
   28.91 as a gap against 20.44 as the room's padding, a 1.41x step, where the
   room's own wall between two stands reads 20.93. Padding is inside the box a
   background paints, so the band is the same ground as the wall the projects
   hang on.

   And it is the padding-RIGHT of the room being LEFT, not the padding-left of
   the one arriving. That was the first cut of this, and ux-check threw it out:
   padding-left pushes the arriving room's content box a whole band to the
   right, and a sticky heading travels inside its containing block, so its
   heading could not reach its pin until the band had gone by — the two samples
   700px apart that must read the same read 1250 and 550. The direction is
   load-bearing, so it is asserted here. The two gaps' ORDER — sibling nearer
   than category — is asserted in ux-check, where both can be measured in the
   same units; here they can only be asserted to exist.

   The floor below is 45vw, and it was 50vw: it came down in the same change
   that halved the token itself, from 90vw, because the old floor made the
   token's own value the thing being read rather than the property it buys. What
   this check is for is that the category distance is read in SCREENS and stays
   the larger of the walk's two — and ux-check measures that directly, 717px
   against a 275px sibling gap at 1440x900, 2.6x, at all three viewports. The
   floor is a minimum and not a target: it now sits at the value the token
   carries, so any further reduction has to come through this line and argue for
   itself rather than slip past it. */
const groupGap = (cssCode.match(/--group-gap:\s*([^;]+);/) || [])[1] || '';
const roomGap = (cssCode.match(/--room-gap:\s*([^;]+);/) || [])[1] || '';
const siblingShare = parseFloat((groupGap.match(/([\d.]+)\s*\*\s*var\(--stand-w\)/) || [])[1]);
ok('the gap between two stands is at most one stand wide',
  siblingShare > 0 && siblingShare <= 1,
  '--group-gap is "' + groupGap.trim() + '" — a gap wider than the stand it separates is a '
  + 'room boundary, not a frame between siblings');
ok('the gap between two stands covers the wall beside a parked stand',
  /max\(/.test(groupGap) && /\(\s*100vw\s*-\s*var\(--stand-w\)\s*\)\s*\/\s*2/.test(groupGap),
  '--group-gap must be at least (100vw - stand) / 2 at every window: that term is what '
  + 'leaves no neighbouring stand in shot when the walk parks');
ok('the band between two rooms is the room\'s own ground, not a gap in the strip',
  !/gap:\s*var\(--room-gap\)/.test(cssCode)
  && /padding-right:\s*calc\(var\(--room-gutter\)\s*\+\s*var\(--room-gap\)\)/.test(cssCode),
  'the threshold must be read by a room\'s padding-right: a gap between rooms is bare hall, and '
  + 'bare hall is brighter than every room on either side of it, while padding-LEFT on the arriving '
  + 'room delays its heading\'s pin by a whole band');
const categoryShare = parseFloat((roomGap.match(/([\d.]+)vw/) || [])[1]);
ok('the gap between two categories is measured in screens, not stands',
  categoryShare >= 45,
  '--room-gap is "' + roomGap.trim() + '" — the threshold between two rooms is the one distance '
  + 'in this walk that should read as a change of place: at least half a screen (45vw), and always '
  + 'the larger of the walk\'s two distances');

/* ── The stand is capped at the window ────────────────────────────────────────
   The ordering above is only sound while a stand can never be WIDER than the
   window, and that is what this asserts — the shape of the token, because the
   property is a geometric one that only ux-check can measure.

   `--stand-w` was `clamp(1100px, 68vw, 1440px)` on its own, so below a 1100px
   viewport it sat on its floor: a 1100px stand inside a 390px screen. The
   sibling gap is `max(0.25 * stand, (100vw - stand) / 2)`, so that floor pinned
   it at 275px while `--room-gap` went on shrinking as `45vw`; the two crossed at
   611px and every narrower window had two projects of one room FURTHER apart
   than two different rooms. Measured at 390x844, the failing case: sibling 275px
   against category 175px.

   `min(clamp(...), 100vw)` is the fix, and it is inert at and above 1100px —
   where the clamp already returns 1100px or less, so `min()` picks that and
   discards the `100vw` term. Below it the second term of the sibling gap is
   zero and the gap falls back to `0.25 * stand`, which with `stand = 100vw` is
   `0.25vw` against a `0.45vw` category gap at every width: a constant ratio,
   which has no crossing. 390x844 reads 97px against 175px. */
const standW = (cssCode.match(/--stand-w:\s*([^;]+);/) || [])[1] || '';
ok('a stand can never be wider than the window',
  /100vw/.test(standW) && /min\(/.test(standW),
  '--stand-w is "' + standW.trim() + '" — a stand wider than the screen puts the sibling gap on '
  + 'its floor while the category gap keeps shrinking, and below their crossing point two projects '
  + 'of one room read as further apart than two different rooms');

/* ── The narrow stand: the label leaves the walk, and the clone does not ──────
   Under 900px a stand is one column of one screen and the label is read in the
   dialog. The two halves of that are asserted together, because either one
   alone is a broken stand: a hidden label with no control is a record a phone
   visitor cannot read at all, and a control with no dialog behind it is a
   button that does nothing.

   The label is hidden BY ITS PARENT, and that scoping is load-bearing rather
   than tidy: `openLabelRef` puts a CLONE of a label into `#modalBody`, and a
   bare `.label { display: none }` would hide the copy as well — the visitor
   would press the control and open an empty dialog. */
const media900 = (() => {
  /* The block that hides the label, NOT the first `@media (max-width: 900px)`
     in the file: there are two, and the other one is section 19's residual
     rules for the vertical document this site replaced. A check that read the
     first would report on somebody else's block — and did, before this note. */
  const at = cssBare.lastIndexOf('@media (max-width: 900px)');
  if (at === -1) return '';
  let depth = 0;
  for (let i = cssBare.indexOf('{', at); i < cssBare.length; i++) {
    if (cssBare[i] === '{') depth++;
    else if (cssBare[i] === '}') { depth--; if (!depth) return cssBare.slice(at, i + 1); }
  }
  return '';
})();
const labelOpenBase = (() => {
  const at = cssBare.indexOf('.label-open {');
  if (at === -1) return '';
  const end = cssBare.indexOf('}', at);
  return end === -1 ? '' : cssBare.slice(at, end);
})();
ok('the narrow stand takes the label out of the walk, scoped by its parent',
  /\.group\s*>\s*\.label\s*\{[^}]*display:\s*none/.test(media900),
  'the 900px block must hide the label with `.group > .label { display: none }`: a bare `.label` '
  + 'rule would also hide the CLONE the dialog shows, which is read from the same markup');
ok('the narrow stand is one column',
  /\.group\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/.test(media900),
  'the 900px block must restate `.group` as `grid-template-columns: minmax(0, 1fr)` — a stand that '
  + 'keeps its `var(--label-col)` track is a hidden label with a hole where it was');
ok('the label control is hidden at desktop widths',
  labelOpenBase !== '' && /display:\s*none/.test(labelOpenBase),
  'a `.label-open` base rule must exist and be `display: none` — the control is rendered at every '
  + 'width so there is one code path, and the narrow block is the only place it is shown');
ok('the label control is shown by the narrow block',
  /\.label-open\s*\{[^}]*display:\s*flex/.test(media900),
  'the 900px block must show `.label-open`: with the label out of the walk it is the only way into '
  + 'the record');
ok('the label control clears the tap floor at every width',
  /\.label-open\s*\{[^}]*min-height:\s*(\d+)px/.test(cssBare)
  && Number((cssBare.match(/\.label-open\s*\{[^}]*min-height:\s*(\d+)px/) || [])[1]) >= 44,
  'the control is the primary control on a phone and must have its own min-height of at least 44px');

/* ── The pinning margin lives on the cluster, not on the legend ───────────────
   The legend is pinned to the foot of the hang cell by an `auto` margin, and it
   has to be `margin-bottom: auto` on the CLUSTER rather than `margin-top: auto`
   on the `.legend`. Both read identically; only one of them is solvable.

   `fitWall` reserves the height of every block in that cell which is not the
   cluster, and it reads that height through `getComputedStyle` — which reports
   an `auto` margin as its RESOLVED USED VALUE, the slack itself. On the legend
   that slack is 303.547px in the settled 390x844 layout, so the solve subtracted
   the very space it was about to create: `availH` fell to 183px of a 659px cell
   and the band collapsed to the tap floor. Measured, in that state: `--wall-h`
   184px, three 98x55 frames, and 303px of bare wall under them.

   WHY THIS NEEDS A STATIC ASSERTION AND NOT A BROWSER ONE. Move the margin back
   and the phone checks stay green: 98x55 still clears the 44x44 tap floor, the
   frames still sit inside their stand, the legend and the control still fit, and
   the sibling/category ordering is untouched. `npm test` passes and `ux-check`
   passes. Nothing measures "the band is as large as the cell allows" except the
   residual check in ux-check, which is one viewport wide — and at 1440x900 the
   failure is invisible on its own, because the token's `22vh` fallback (198px)
   happens to sit within 10px of nothing in particular while the correct band is
   579px. So the DECLARATION is the thing to pin.

   Read from `ruleBody`, on the declaration and never on prose: the comments in
   this file discuss `margin-top: auto` at length, and a raw scan of the
   stylesheet finds the phrase in the note that explains why it moved. */
const legendRule = ruleBody('.legend');
const clusterRule = ruleBody('.cluster');
ok('the cluster carries the pinning margin, not the legend',
  /margin-bottom:\s*auto\s*;/.test(clusterRule)
  && !/margin(-top|-bottom)?:\s*auto\s*;/.test(legendRule),
  '`.cluster` must carry `margin-bottom: auto` and `.legend` must carry no `auto` vertical margin: '
  + 'an `auto` margin on a block `fitWall` reserves is slack counted as consumed space, which '
  + 'collapses the band to the tap floor on every viewport while the suite stays green');

/* Hard constraint: --lit must never be written on a subtree root. */
ok('--lit is written only to work elements',
  /w\.style\.setProperty\('--lit'/.test(main) &&
  !/(strip|hall|documentElement|body)\.style\.setProperty\('--lit'/.test(main),
  'a subtree root receives --lit');

/* ── The label dialog CLONES the label, and never moves it ────────────────────
   The narrow stand hands the record's label to the dialog, and the dialog must
   show a COPY. Moving the node is the fault this asserts against, and it fails
   in two directions at once: the stand is left with no label at all, so widening
   the window back above 900px restores a two-cell stand whose right cell is
   empty — with no control to read the record from either — and `initLabelFades`
   is left holding a scroll listener bound to a node that has left the walk.

   Read from CODE with the comments stripped: `openLabelRef`'s own note says the
   word "clone" several times, and a raw scan would satisfy itself with the
   sentence describing the behaviour instead of the behaviour. The assertion is
   the pair — a `cloneNode` exists, and the live `label` node is never handed to
   `appendChild`/`insertBefore`/`append`/`replaceChildren`. */
ok('the label dialog clones its label instead of moving it',
  /cloneNode/.test(mainCode)
  && !/(appendChild|insertBefore|append|replaceChildren|prepend)\(\s*label\s*[,)]/.test(mainCode),
  'openLabelRef must put a CLONE of the label in the dialog: moving the original empties the '
  + 'stand, and widening the window above 900px cannot put it back without a re-render');

/* ---- JS: the walk's configuration ----
   Against the spec §5 block, minus the four `Snap` options it also listed. The
   snap is gone (see the guards below), so those four assertions would be asking
   for a plugin that no longer exists. */
const walkRequired = [
  [/orientation:\s*'horizontal'/, "orientation: 'horizontal'"],
  [/lerp:\s*0\.1\b/, 'lerp: 0.1'],
  [/autoRaf:\s*true/, 'autoRaf: true'],
  [/anchors:\s*true/, 'anchors: true — without it in-page links stop working'],
  [/prevent:[\s\S]{0,120}closest\('\.modal-overlay'\)/, "prevent → closest('.modal-overlay')"],
  [/wrapper:\s*hall/, 'wrapper: hall'],
  [/content:\s*strip/, 'content: strip'],
];
for (const [re, label] of walkRequired) ok('walk config: ' + label, re.test(main), 'not found');

ok('walk is exposed as Site.walk', /Site\.walk\s*=\s*initWalk\(\)/.test(main), 'not wired into init()');
ok('walk exposes goToRoom/stop/start/resize',
  ['goToRoom', 'resize', 'stop', 'start', 'lenis'].every(k => new RegExp('\\b' + k + ':').test(main)),
  'missing a key');

/* ---- JS: the snap is gone, and it stays gone ----
   The walk parked, first on each room's centre and then on each stand's, through
   the vendored `lenis-snap` plugin. All of it was removed in one change: the
   plugin file and its script tag, `data-snap` on the stands and on the About and
   Contact rooms, the walk's `snap` key, and the MutationObserver that existed
   only to register the targets as the rooms appeared. These four are the guard —
   "no snap" is a decision, and a decision with no test behind it comes back.

   They read CODE with the comments stripped, and that is not fussiness: main.js
   records the removal in prose, and the note says "no `data-snap` here", so a
   raw scan of the file finds the attribute in the sentence denying it. The
   `mainCode` defined near the top of this file is that stripped source. */
ok('no Snap is constructed', !/new Snap\b/.test(mainCode), 'initWalk builds a Snap again');
ok('the deleted snap plugin is not loaded',
  !/lenis-snap/.test(withoutComments), 'index.html loads a script whose file is gone');
ok('nothing is marked as a snap target', !/data-snap/.test(mainCode), 'a data-snap attribute survives');
ok('the walk no longer observes #strip',
  !/MutationObserver/.test(mainCode), 'the observer that only fed the snap is back');

/* ---- JS: no delegated handler may be bound to the deleted hosts ---- */
ok('delegation is bound to document, not to a deleted host',
  /document\.addEventListener\('click',[\s\S]{0,400}data-action="modal"/.test(main),
  'the modal trigger is not delegated from document');

console.log('\n' + (fail === 0 ? 'shell check: all clear' : 'shell check: ' + fail + ' failed'));
process.exit(fail ? 1 : 0);
