#!/usr/bin/env node
/* Dev-only: vendor the twelve Font Awesome glyphs this site uses, as inline
   SVG path data, so no icon font and no CDN stylesheet is fetched at runtime.

   ── Why inline SVG rather than a vendored webfont ─────────────────────────
   `index.html` used to link `use.fontawesome.com/releases/v5.15.4/css/all.css`
   — 59,305 bytes of CSS describing several thousand glyphs, plus whatever
   webfont subset the browser then decided to download — to draw twelve icons.
   Twelve paths are about 8 KB of markup, carry no second request, need no
   `font-display` decision, cannot flash, and inherit `currentColor` so an icon
   takes the colour of the text it sits in. Vendoring the font would have kept
   the CDN's shape and most of its weight; inlining removes both.

   ── Provenance and licence ────────────────────────────────────────────────
   Fetched at the pinned tag below, never from `master`, so a re-run is
   reproducible and a diff means the tag moved. Font Awesome Free 5.15.4 icons
   are **CC BY 4.0**, which requires attribution: the banner written into
   `js/icons.js` carries it, and so does `files/icons/LICENSE.txt`.

   Usage:
     chrome --headless=new --remote-debugging-port=9222 about:blank
     node tools/serve.mjs 3333
     node tools/vendor-icons.mjs [--check]                                        */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const SITE = process.env.SITE || process.cwd();
const CHECK = process.argv.includes('--check');

const TAG = '5.15.4';
const RAW = `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/${TAG}/svgs`;

/* name -> [style, file]. The name is what `Site.icon()` is called with, and it
   is deliberately the FA name minus its `fa-` prefix, so the twelve call sites
   read as the glyph rather than as a library path. */
const ICONS = {
  play:           ['solid',  'play'],
  images:         ['solid',  'images'],
  eye:            ['solid',  'eye'],
  trophy:         ['solid',  'trophy'],
  'chevron-left': ['solid',  'chevron-left'],
  'chevron-right':['solid',  'chevron-right'],
  'file-pdf':     ['solid',  'file-pdf'],
  'file-alt':     ['solid',  'file-alt'],
  users:          ['solid',  'users'],
  envelope:       ['solid',  'envelope'],
  github:         ['brands', 'github'],
  linkedin:       ['brands', 'linkedin'],
};

/* ── Chrome, over CDP ─────────────────────────────────────────────────────── */
const list = await (await fetch(CDP + '/json/list')).json();
const target = list.find((t) => t.type === 'page');
if (!target) { console.error('no page target at ' + CDP); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, { resolve, reject });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Page.navigate', { url: BASE });
await sleep(2000);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  }
  return r.result.value;
};

async function getText(url) {
  const raw = await evaluate(`(async () => {
    const r = await fetch(${JSON.stringify(url)}, { cache: 'no-store' });
    return JSON.stringify({ status: r.status, text: await r.text() });
  })()`);
  const { status, text } = JSON.parse(raw);
  if (status !== 200) throw new Error('HTTP ' + status + ' for ' + url);
  return text;
}

/* ── Pull the two things an inline icon needs ─────────────────────────────── */
const pins = [];
const entries = [];
for (const [name, [style, file]] of Object.entries(ICONS)) {
  const url = `${RAW}/${style}/${file}.svg`;
  const svg = await getText(url);
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  /* The `d` values contain no quotes, so a plain match is safe here — but the
     path COUNT is asserted, because an FA release that split a glyph into two
     paths would otherwise be vendored as a silently half-drawn icon. */
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!vb) throw new Error('no viewBox in ' + url);
  if (paths.length !== 1) {
    throw new Error(`${name}: expected 1 path, found ${paths.length} in ${url} — `
      + 'the writer below assumes one, so it must be taught about the others');
  }
  const sha = createHash('sha256').update(svg).digest('hex');
  pins.push({ name, style, file, vb, paths: paths.length, sha });
  entries.push({ name, vb, d: paths[0], style });
  console.log(`  ${name.padEnd(15)} ${style.padEnd(7)} ${vb.padEnd(12)} `
    + `${paths[0].length.toString().padStart(5)}B path  ${sha.slice(0, 12)}`);
}

/* ── Write js/icons.js ───────────────────────────────────────────────────── */
const banner = `/* ==========================================================================
   Vendored icon glyphs — GENERATED by tools/vendor-icons.mjs, do not hand-edit.
   ==========================================================================
   Twelve glyphs from Font Awesome Free ${TAG}, inlined as SVG path data.

   Font Awesome Free ${TAG} icons are CC BY 4.0, which requires attribution:
     Icons by Font Awesome Free (https://fontawesome.com) — CC BY 4.0.
   The full licence ships beside them at \`files/icons/LICENSE.txt\`.

   Fetched at the pinned tag \`${TAG}\`, never \`master\`, so re-running the tool
   is reproducible and a diff means the tag moved.

   The site used to link \`use.fontawesome.com\` for these — 59,305 bytes of CSS
   describing several thousand glyphs, plus a webfont subset on top, to draw
   twelve shapes. See the note in \`tools/vendor-icons.mjs\` for why inlining
   beats vendoring the font.

   \`Site.icon(name, cls)\` is the only reader. It returns an \`<svg>\` that takes
   its colour from \`currentColor\` and is \`aria-hidden\` — every one of these
   glyphs sits beside text that already says what it means, so announcing it
   twice would be the fault.
   ========================================================================== */
(function (global) {
  'use strict';

  var ICONS = {
`;

const body = entries.map((e) =>
  `    '${e.name}': { vb: '${e.vb}', d: '${e.d}' }`
).join(',\n');

const tail = `
  };

  /* An unknown name returns an EMPTY STRING rather than a broken box or a
     thrown error: a missing glyph should cost a decoration, not a stand. */
  function icon(name, cls) {
    var g = ICONS[name];
    if (!g) return '';
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="' + g.vb
      + '" aria-hidden="true" focusable="false"><path d="' + g.d + '"/></svg>';
  }

  Site.icons = ICONS;
  Site.icon = icon;
})(window);
`;

const out = banner + body + tail;
const dest = join(SITE, 'js', 'icons.js');
const same = existsSync(dest) && readFileSync(dest, 'utf8') === out;
if (!CHECK && !same) writeFileSync(dest, out);
console.log(`\njs/icons.js ${same ? 'unchanged' : CHECK ? 'WOULD CHANGE' : 'written'} `
  + `(${entries.length} icons, ${out.length} bytes)`);

/* The CC BY 4.0 licence travels with the glyphs, as attribution requires. */
try {
  const lic = await getText(
    `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/${TAG}/LICENSE.txt`);
  const dir = join(SITE, 'files', 'icons');
  mkdirSync(dir, { recursive: true });
  const licDest = join(dir, 'LICENSE.txt');
  const note = 'Font Awesome Free ' + TAG + ' — https://fontawesome.com\n'
    + 'Icons: CC BY 4.0 · Fonts: SIL OFL 1.1 · Code: MIT\n'
    + 'The twelve glyphs inlined in js/icons.js are the CC BY 4.0 icons.\n\n'
    + lic;
  if (!existsSync(licDest)) writeFileSync(licDest, note);
  console.log('files/icons/LICENSE.txt written');
} catch (e) {
  console.log('licence fetch failed: ' + e.message.split('\n')[0]);
}

console.log('\nname'.padEnd(18) + 'style'.padEnd(9) + 'viewBox'.padEnd(14) + 'sha256');
for (const p of pins) console.log(p.name.padEnd(18) + p.style.padEnd(9) + p.vb.padEnd(14) + p.sha);
ws.close();
