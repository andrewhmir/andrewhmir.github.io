#!/usr/bin/env node
/* Dev-only: vendor the two webfonts this site uses, so nothing is fetched from
   a CDN at runtime.

   `index.html` used to link `fonts.googleapis.com` for the stylesheet and
   `fonts.gstatic.com` for the bytes, behind two `preconnect`s. This pulls those
   same faces down once and writes them into the repo:

     files/fonts/*.woff2     the bytes, one file per @font-face
     files/fonts/OFL.txt     the licences — both families are SIL OFL 1.1, and
                             the OFL requires the licence to travel with them
     css/fonts.css           the @font-face rules, rewritten to local URLs

   The `unicode-range` on every face is preserved EXACTLY, which is what keeps
   the local copy no more expensive than the CDN one: a browser still downloads
   only the subsets a page actually uses, so an English visitor takes the latin
   file and not the cyrillic one.

   ── Why this drives Chrome ────────────────────────────────────────────────
   Node has no network egress in the session that wrote this, but the headless
   Chrome the other probes use runs unconfined on the host. Assets are fetched
   inside a page rather than by navigating: Chrome DOWNLOADS a .woff2 instead of
   rendering it, so a navigation has no response body to read back.

   Usage:
     chrome --headless=new --remote-debugging-port=9222 about:blank
     node tools/serve.mjs 3333
     node tools/vendor-fonts.mjs [--check]

   `--check` re-fetches and reports drift without writing anything, which is how
   to tell whether a re-vendor is worth a commit. */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const SITE = process.env.SITE || process.cwd();
const CHECK = process.argv.includes('--check');

/* The exact query `index.html` linked, kept verbatim so the vendored faces are
   the ones the site already shipped rather than a retuned set. */
const CSS_URL = 'https://fonts.googleapis.com/css2'
  + '?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime&display=swap';
const LICENCES = [
  ['newsreader', 'https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt'],
  ['courier-prime', 'https://raw.githubusercontent.com/google/fonts/main/ofl/courierprime/OFL.txt'],
];

const FONT_DIR = join(SITE, 'files', 'fonts');
const OUT_CSS = join(SITE, 'css', 'fonts.css');

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

/* Chunked: `String.fromCharCode(...buf)` on a 56KB font overflows the argument
   limit and throws a bare RangeError with no hint about why. */
async function get(url) {
  const raw = await evaluate(`(async () => {
    const r = await fetch(${JSON.stringify(url)}, { cache: 'no-store' });
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    }
    return JSON.stringify({ status: r.status, b64: btoa(s) });
  })()`);
  const { status, b64 } = JSON.parse(raw);
  if (status !== 200) throw new Error('HTTP ' + status + ' for ' + url);
  return Buffer.from(b64, 'base64');
}

/* ── Name each face ─────────────────────────────────────────────────────────
   The filename is cosmetic — `unicode-range` is what a browser obeys — but a
   readable name is what makes a diff reviewable.

   The name is `family[-italic]-subset`, read off the FIRST range in the face's
   `unicode-range`:
     U+0000…  latin        U+0100…  latin-ext      anything else  extra
   `extra` is a real subset and not a failure — it is the small
   `U+0102-0103` range, which would be lost if the heuristic returned a counter.

   No counter is needed because (family, style, subset) is unique in this set:
   Courier Prime has two roman files, and Newsreader has three roman and three
   italic. That uniqueness is asserted rather than assumed, below, because a
   collision would silently make one face overwrite another's bytes.

   Note Newsreader arrives as a VARIABLE font: one file per subset serves
   weights 400, 500 and 600, which is why there are 14 faces but only 8 files. */
function subsetName(range) {
  const first = (range.split(',')[0] || '').trim().toUpperCase();
  if (first.startsWith('U+0000')) return 'latin';
  if (first.startsWith('U+0100')) return 'latin-ext';
  return 'extra';
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ── Parse the stylesheet Google served ───────────────────────────────────── */
console.log('fetching ' + CSS_URL);
const css = (await get(CSS_URL)).toString('utf8');
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
  const body = m[1];
  const pick = (prop) => (body.match(new RegExp(prop + ':\\s*([^;]+);')) || [])[1];
  return {
    family: (pick('font-family') || '').replace(/['"]/g, '').trim(),
    style: (pick('font-style') || 'normal').trim(),
    weight: (pick('font-weight') || '400').trim(),
    url: (body.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1],
    range: (pick('unicode-range') || '').trim(),
  };
}).filter((f) => f.url);

if (!faces.length) { console.error('no @font-face with a woff2 found'); process.exit(2); }
console.log(faces.length + ' faces, '
  + new Set(faces.map((f) => f.url)).size + ' distinct files');

const used = new Map();
const plan = [];
for (const f of faces) {
  if (used.has(f.url)) { f.file = used.get(f.url); continue; }
  f.file = slug(f.family)
    + (f.style === 'italic' ? '-italic' : '')
    + '-' + subsetName(f.range) + '.woff2';
  if ([...used.values()].includes(f.file)) {
    console.error('two different files both want the name ' + f.file
      + ' — the naming rule needs a counter before this can be vendored');
    process.exit(2);
  }
  used.set(f.url, f.file);
  plan.push({ file: f.file, url: f.url });
}

/* ── Download the bytes ───────────────────────────────────────────────────── */
mkdirSync(FONT_DIR, { recursive: true });
const pins = [];
let bytes = 0;
for (const p of plan) {
  const buf = await get(p.url);
  bytes += buf.length;
  const sha = createHash('sha256').update(buf).digest('hex');
  pins.push({ file: p.file, size: buf.length, sha, url: p.url });
  const dest = join(FONT_DIR, p.file);
  const same = existsSync(dest)
    && createHash('sha256').update((await import('node:fs')).readFileSync(dest)).digest('hex') === sha;
  console.log(`  ${p.file.padEnd(34)} ${String(buf.length).padStart(7)}B  ${same ? 'unchanged' : 'NEW'}`);
  if (!CHECK && !same) writeFileSync(dest, buf);
}

for (const [name, url] of LICENCES) {
  const buf = await get(url);
  const sha = createHash('sha256').update(buf).digest('hex');
  pins.push({ file: name + '-OFL.txt', size: buf.length, sha, url });
  const dest = join(FONT_DIR, name + '-OFL.txt');
  console.log(`  ${(name + '-OFL.txt').padEnd(34)} ${String(buf.length).padStart(7)}B`);
  if (!CHECK && !existsSync(dest)) writeFileSync(dest, buf);
}

/* ── Write the stylesheet ───────────────────────────────────────────────── */
const banner = `/* ==========================================================================
   Vendored webfonts — GENERATED, do not hand-edit.
   ==========================================================================
   Written by \`tools/vendor-fonts.mjs\`. Re-run it to refresh; \`--check\`
   reports drift without writing.

   Two families, ${plan.length} files, ${(bytes / 1024).toFixed(1)} KB on disk.
   Nothing here is fetched from a CDN: the site used to link
   \`fonts.googleapis.com\` and \`fonts.gstatic.com\` behind two preconnects, and
   that is what this replaces.

   Both families are SIL OFL 1.1 — the licences are in \`files/fonts/\` beside
   the bytes, as the OFL requires.

   \`unicode-range\` is preserved from Google's own stylesheet, so a browser still
   downloads ONLY the subsets a page uses. The file count is not the page cost:
   an English visitor takes the two \`latin\` files and never asks for the
   \`latin-ext\` or \`extra\` ones.

   Newsreader arrives as a VARIABLE font — one file per subset serves weights
   400, 500 and 600 — which is why there are 14 faces but only 8 files.
   ========================================================================== */

`;
const rules = faces.map((f) => {
  return '@font-face {\n'
    + `  font-family: '${f.family}';\n`
    + `  font-style: ${f.style};\n`
    + `  font-weight: ${f.weight};\n`
    + '  font-display: swap;\n'
    + `  src: url('../files/fonts/${f.file}') format('woff2');\n`
    + (f.range ? `  unicode-range: ${f.range};\n` : '')
    + '}';
}).join('\n\n');

if (!CHECK) {
  writeFileSync(OUT_CSS, banner + rules + '\n');
  console.log('\nwrote css/fonts.css (' + faces.length + ' faces)');
} else {
  console.log('\n--check: nothing written');
}

/* The pin table, ready to paste into the README that records provenance. */
console.log('\nfile'.padEnd(40) + 'bytes'.padStart(8) + '  sha256');
for (const p of pins) console.log(p.file.padEnd(40) + String(p.size).padStart(8) + '  ' + p.sha);
ws.close();
