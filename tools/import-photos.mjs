#!/usr/bin/env node
/* Dev-only: import the owner's source photos into files/, resized for the web.
   Serves the source folder to a headless Chrome tab and draws each photo onto
   a canvas at a capped size, then writes the JPEG back into files/. No npm
   dependencies.

   Usage:  chrome --headless=new --remote-debugging-port=9222 about:blank
           node tools/import-photos.mjs
           SRC="D:/photos" node tools/import-photos.mjs     # different source folder

   The MAPPING table below is the contract between the owner's staging filenames
   (Downloads/AAA) and the paths referenced in js/data.js. Re-running is
   idempotent: it rewrites files/<target> from the original source.            */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { homedir } from 'node:os';

const SRC = process.env.SRC || join(homedir(), 'Downloads', 'AAA');
const SITE = process.env.SITE || process.cwd();
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const MAX_EDGE = parseInt(process.env.MAX_EDGE || '1600', 10);
const QUALITY = parseFloat(process.env.QUALITY || '0.82');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Source filename (in SRC)  ->  destination filename (in files/) */
const MAPPING = [
  /* Leadership — AGHAM Research Club, Founder */
  ['Agham_1.jpg', 'leadership-aghj-founder-1.jpg'],
  ['Agham_2.jpg', 'leadership-aghj-founder-2.jpg'],
  ['Agham_3.jpg', 'leadership-aghj-founder-3.jpg'],
  ['Agham_4.jpg', 'leadership-aghj-founder-4.jpg'],
  /* Leadership — High School Student Council, STEM-Engineering Level Rep */
  ['HSSC_1.jpg', 'leadership-ssc-stem-rep-1.jpg'],
  ['HSSC_2.jpg', 'leadership-ssc-stem-rep-2.jpg'],
  ['HSSC_3.jpg', 'leadership-ssc-stem-rep-3.jpg'],
  ['HSSC_4.jpg', 'leadership-ssc-stem-rep-4.jpg'],
  /* Leadership — Media and Coverages Committee, Head */
  ['MedCov_1.jpg', 'leadership-media-coverages-1.jpg'],
  ['MedCov_2.jpg', 'leadership-media-coverages-2.jpg'],
  ['MedCov_3.jpg', 'leadership-media-coverages-3.jpg'],
  /* Honors — 21st National Youth Congress (March 2025) */
  ['NYC_1.JPG', 'honors-nyc-2025-1.jpg'],
  ['NYC_2.JPG', 'honors-nyc-2025-2.jpg'],
  /* Honors — 11th Philippine Robothon, Overall Champion (February 2026) */
  ['PALAD_Nat_1.CR3', 'honors-robothon-2026-ph-1.jpg'],
  /* Honors — 10th Philippine Robothon, Overall Champion (March 2025) */
  ['CENTHRO_Nat_1.JPG', 'honors-robothon-2025-ph-1.jpg'],
  ['CENTHRO_Nat_2.JPG', 'honors-robothon-2025-ph-2.jpg'],
  ['CENTHRO_Nat_3.JPG', 'honors-robothon-2025-ph-3.jpg'],
  /* Honors — 2024 International Robothon, Champion (November 2024) */
  ['CENTHRO_Int_1.jpg', 'honors-robothon-2024-intl-1.jpg'],
  ['CENTHRO_Int_2.jpg', 'honors-robothon-2024-intl-2.jpg']
];

if (!existsSync(SRC)) {
  console.error('source folder not found: ' + SRC + '\nSet SRC=<folder> to point at the photos.');
  process.exit(1);
}

/* ── Static server: the job page + the source photos, same origin ────── */
const PAGE = `<!doctype html><meta charset="utf-8"><title>photo import</title>
<body style="font:14px monospace">photo import staging page</body>`;

const CONTENT_TYPE = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
/* Some sources are named with a raw-camera extension (.CR3) but are really
   JPEGs, so sniff the magic bytes instead of trusting the extension. */
function contentType(file) {
  const head = readFileSync(file).subarray(0, 3);
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && head[1] === 0x50) return 'image/png';
  return CONTENT_TYPE[extname(file).toLowerCase()] || 'application/octet-stream';
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  /* /src/<name> — basename only, so a crafted path cannot escape SRC */
  if (url.pathname.startsWith('/src/')) {
    const name = basename(decodeURIComponent(url.pathname.slice(5)));
    const file = join(SRC, name);
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': statSync(file).size });
    return res.end(readFileSync(file));
  }
  res.writeHead(404).end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port + '/';

/* ── CDP client ─────────────────────────────────────────────────────── */
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', () => rej(new Error('cannot reach CDP at ' + CDP)), { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
  }
});
const send = (method, params = {}, sessionId) => {
  const mid = ++id;
  const msg = { id: mid, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(mid, { res, rej }); ws.send(JSON.stringify(msg)); });
};

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

/* Navigate to the staging origin so the photos are same-origin — a
   cross-origin image taints the canvas and toDataURL() throws. */
await send('Page.navigate', { url: ORIGIN }, sessionId);
await sleep(600);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

/* ── Import ─────────────────────────────────────────────────────────── */
console.log('source: ' + SRC + '\ncore:   ' + SITE + '/files/' + '\ncap:    ' + MAX_EDGE + 'px long edge @ q' + QUALITY + '\n');

let srcBytes = 0, outBytes = 0, ok = 0, failed = 0;

for (const [source, target] of MAPPING) {
  const from = join(SRC, source);
  const to = join(SITE, 'files', target);
  if (!existsSync(from)) {
    console.log('  MISSING  ' + source + '  (no such file in ' + SRC + ')');
    failed++;
    continue;
  }
  try {
    const shot = await evaluate(`(async () => {
      const img = new Image();
      img.src = ${JSON.stringify('/src/' + source)};
      await new Promise((res, rej) => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', () => rej(new Error('decode failed')), { once: true });
        setTimeout(() => rej(new Error('timed out')), 30000);
      });
      if (!img.naturalWidth) throw new Error('decoded with zero width');
      const scale = Math.min(1, ${MAX_EDGE} / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      return { data: c.toDataURL('image/jpeg', ${QUALITY}), w: w, h: h, sw: img.naturalWidth, sh: img.naturalHeight };
    })()`);
    const bytes = Buffer.from(shot.data.split(',')[1], 'base64');
    writeFileSync(to, bytes);
    const before = statSync(from).size;
    srcBytes += before;
    outBytes += bytes.length;
    ok++;
    console.log('  ok       ' + source + '  (' + shot.sw + 'x' + shot.sh + ')  ->  files/' + target
      + '  (' + shot.w + 'x' + shot.h + ',  ' + kb(before) + ' -> ' + kb(bytes.length) + ')');
  } catch (e) {
    failed++;
    console.log('  FAILED   ' + source + '  (' + (e && e.message) + ')');
  }
}

const orphans = readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|cr3)$/i.test(f)
  && !MAPPING.some(([s]) => s.toLowerCase() === f.toLowerCase()));
if (orphans.length) {
  console.log('\nnot in MAPPING (left alone): ' + orphans.join(', '));
}

console.log('\nimported ' + ok + '/' + MAPPING.length + (failed ? ' (' + failed + ' failed)' : '')
  + '  ·  ' + kb(srcBytes) + ' source -> ' + kb(outBytes) + ' shipped');

await send('Target.closeTarget', { targetId }, sessionId);
server.close();
process.exit(failed ? 1 : 0);

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }
