/* Dev-only probe: the RENDERED colour of the museum wall, read out of actual
   screenshots rather than composited on paper. A CSS-composite model is a
   model; this is the page.

   It samples a vertical column through the crown (where the mural is meant to
   read) and through the foot (behind the dock, where it must close), at a named
   scroll offset, and reports the WCAG contrast of the text tiers against what
   is actually under them.

   Usage:
     1. node tools/serve.mjs 3333
     2. chrome --headless=new --remote-debugging-port=9222 ... about:blank
     3. node tools/wall-pixels.mjs [width] [height] [scrollLeft] */
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const SL = Number(process.argv[4] || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) target = await (await fetch(CDP + '/json/new?about:blank')).json();
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
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE });
await sleep(3500);
await evaluate(`(async () => {
  const imgs = [...document.querySelectorAll('#strip img')];
  imgs.forEach(i => { i.loading = 'eager'; });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 600));
})()`);
if (SL) {
  await evaluate(`document.getElementById('hall').scrollLeft = ${SL}`);
  await sleep(1200);
}

/* A column clear of every room's own furniture: the About room's portrait sits
   at the left, so sample the far right of the viewport. */
const COL = Math.round(W * 0.88);
const shot = await send('Page.captureScreenshot', { format: 'png' });
const png = Buffer.from(shot.data, 'base64');
const tmp = join(tmpdir(), 'wall-pixels-' + Date.now() + '.png');
(await import('node:fs')).writeFileSync(tmp, png);

/* Decode in the page, which is the one decoder we know exists here. */
const b64 = png.toString('base64');
const rows = await evaluate(`(async () => {
  const img = new Image();
  img.src = 'data:image/png;base64,${b64}';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  /* A 2px window's mean and its range, so a one-pixel seam shows up as a row
     whose range is large rather than as a colour nobody can judge by eye. */
  const out = [];
  for (let y = 0; y < img.naturalHeight; y += 15) {
    const col = g.getImageData(${COL}, y, 1, Math.min(3, img.naturalHeight - y)).data;
    let r = 0, gg = 0, b = 0, n = 0, lo = 999, hi = -1;
    for (let i = 0; i < col.length; i += 4) {
      const l = 0.2126*col[i] + 0.7152*col[i+1] + 0.0722*col[i+2];
      r += col[i]; gg += col[i+1]; b += col[i+2]; n++;
      if (l < lo) lo = l; if (l > hi) hi = l;
    }
    out.push({ y: y, r: Math.round(r/n), g: Math.round(gg/n), b: Math.round(b/n),
               lum: +(0.2126*(r/n) + 0.7152*(gg/n) + 0.0722*(b/n)).toFixed(1),
               spread: +(hi - lo).toFixed(1) });
  }
  return out;
})()`);
try { unlinkSync(tmp); } catch {}

const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
const relLum = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
};

console.log(`rendered column x=${COL}  (${W}x${H}, scrollLeft ${SL})\n`);
console.log('   y   colour     luminance   spread');
for (const row of rows) {
  /* A row whose 3px window varies a lot is an edge — the asset's own carved
     border, or a seam between tiles. That distinction is the whole question
     when the mural is tiled rather than a single band. */
  console.log(String(row.y).padStart(5) + '   ' + hex(row) + '   ' + String(row.lum).padStart(6)
    + '   ' + String(row.spread).padStart(5) + (row.spread > 6 ? '  <- edge' : ''));
}

const TEXT = { r: 0xe8, g: 0xdc, b: 0xc6 };
const STRONG = { r: 0xf6, g: 0xef, b: 0xe0 };
const QUITE = { r: 0x8c, g: 0x83, b: 0x75 };
const worst = rows.reduce((a, r) => (r.lum > a.lum ? r : a));
const best = rows.reduce((a, r) => (r.lum < a.lum ? r : a));
console.log('\nlightest ground  ' + hex(worst) + '  lum ' + worst.lum);
console.log('darkest ground   ' + hex(best) + '  lum ' + best.lum);
console.log('\nWCAG contrast against the lightest ground found (the worst case):');
for (const [name, c] of [['--text', TEXT], ['--text-strong', STRONG], ['--text-quiet', QUITE]]) {
  const cr = contrast(c, worst);
  console.log('  ' + name.padEnd(14) + cr + ':1   ' + (cr >= 4.5 ? 'AA' : cr >= 3 ? 'AA large only' : 'FAIL'));
}
ws.close();
process.exit(0);
