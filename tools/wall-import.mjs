#!/usr/bin/env node
/* Dev-only: import the museum's background mural into files/, resized for the
   web, and print the palette it actually contains so the room tokens in
   css/styles.css are derived from the picture rather than guessed.

   Same shape as import-photos.mjs: a throwaway static server puts the source
   image and the job page on one origin, a headless Chrome tab decodes and
   resamples it on a canvas, and the JPEG/WebP comes back over CDP. Chrome does
   the decoding, so no image library is needed and the canvas is never tainted.

   Usage:  chrome --headless=new --remote-debugging-port=9222 about:blank
           node tools/wall-import.mjs
           SRC="D:/art" NAME="Other.jpg" node tools/wall-import.mjs

   The mural ships untouched in tone: it is read at low opacity behind the
   rooms, so the scrim in css/styles.css is what dims it, and re-tuning the
   tone is a CSS change rather than a re-encode. Re-running is idempotent.      */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { homedir } from 'node:os';

const SRC = process.env.SRC || join(homedir(), 'Downloads');
const NAME = process.env.NAME || 'Mushoku_Extended.jpg';
const TARGET = process.env.TARGET || 'wall-mushoku.webp';
const SITE = process.env.SITE || process.cwd();
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
/* The mural tiles across the walk, so it is shipped at a fixed pixel width
   rather than the 1600px long-edge cap the photographs use: its 3.59:1 aspect
   means the long edge IS the width, and the tile's on-screen size is decided
   by background-size in the stylesheet. */
const WIDTH = parseInt(process.env.WIDTH || '1600', 10);
const QUALITY = parseFloat(process.env.QUALITY || '0.86');
const FORMAT = process.env.FORMAT || 'image/webp';
const EXT = FORMAT === 'image/webp' ? '.webp' : '.jpg';
/* ── Peak targeting ───────────────────────────────────────────────────────────
   The floor on the scrim is contrast, and contrast is a function of the BRIGHTEST
   ground the type can meet. The mural is dark on average — mean luminance 54 of
   255, so at full strength it is already only a texture — but its single
   brightest chip is 125.6, and one bright chip is enough to fail a text tier.

   So the asset is scaled so its brightest pixel lands on PEAK. That is a plain
   multiply, which preserves the picture's contrast and its midtones; a tone
   curve was tried first and made things worse, because the mural's problem is
   that it is dark, not that it is blown. The wall is then as bright as the
   contrast floor allows and no brighter.

   A value below 100 keeps every text tier on WCAG AA; tools/wall-floor.mjs
   measures the rendered page and tests/shell-check.mjs re-derives the bound. */
const PEAK = parseFloat(process.env.PEAK || '88');
const SAT = parseFloat(process.env.SAT || '1');
/* ── Seam blending ────────────────────────────────────────────────────────────
   OFF by default, and deliberately so. The wall repeats, so its left edge butts
   against its own right edge, and the mural is a photograph — those two columns
   do not match, which shows as a hard vertical line every --wall-tile pixels.

   But the mural is not a texture: it reads left to right as a composition, with
   a Greek temple at one end and an Egyptian temple with a mounted archer at the
   other. Cross-fading the edges into one another is what makes a texture loop;
   on a picture it dissolves the two ends of the story. That is why the real fix
   was --wall-tile (see css/styles.css) rather than this: at a tile as wide as
   the image, the join falls between two complete pictures.

   SEAM is the escape hatch if the join ever does read badly — it is how many
   pixels of each edge are cross-faded into the opposite edge. Set it above 0 to
   trade the ends of the picture for a softer join. */
const SEAM = parseInt(process.env.SEAM || '0', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

const from = join(SRC, NAME);
if (!existsSync(from)) {
  console.error('source image not found: ' + from + '\nSet SRC=<folder> and NAME=<file>.');
  process.exit(1);
}
if (extname(TARGET) !== EXT) {
  console.error('TARGET ' + TARGET + ' does not match FORMAT ' + FORMAT + ' (expected ' + EXT + ')');
  process.exit(1);
}

/* ── Static server: the job page and the source image, same origin ────── */
function contentType(file) {
  const head = readFileSync(file).subarray(0, 3);
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && head[1] === 0x50) return 'image/png';
  if (head.toString('ascii', 0, 4) === 'RIFF') return 'image/webp';
  return 'application/octet-stream';
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8"><title>wall import</title>'
      + '<body style="font:14px monospace">wall import staging page</body>');
  }
  /* /src/<name> — basename only, so a crafted path cannot escape SRC */
  if (url.pathname.startsWith('/src/')) {
    const name = basename(decodeURIComponent(url.pathname.slice(5)));
    const file = join(SRC, name);
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
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

/* Navigate to the staging origin so the image is same-origin — a cross-origin
   image taints the canvas and toDataURL() throws. */
await send('Page.navigate', { url: ORIGIN }, sessionId);
await sleep(600);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

console.log('source: ' + from + '\nshipped: ' + SITE + '/files/' + TARGET
  + '\nresize: ' + WIDTH + 'px wide  ·  ' + FORMAT + ' q' + QUALITY + '\n');

/* ── Resample and encode. The palette is read back from the SAME canvas the
      file is encoded from, so the printed colours are the shipped ones. ──── */
const shot = await evaluate(`(async () => {
  const img = new Image();
  img.src = ${JSON.stringify('/src/' + NAME)};
  await new Promise((res, rej) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', () => rej(new Error('decode failed')), { once: true });
    setTimeout(() => rej(new Error('timed out')), 30000);
  });
  if (!img.naturalWidth) throw new Error('decoded with zero width');

  const w = ${WIDTH};
  const h = Math.max(1, Math.round(img.naturalHeight * (w / img.naturalWidth)));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);

  /* Scale the picture so its brightest pixel lands on PEAK. Measured first, then
     applied, so the palette printed below is the palette that ships. */
  const PEAK = ${PEAK}, SAT = ${SAT};
  if (PEAK > 0 || SAT !== 1) {
    const id = g.getImageData(0, 0, w, h);
    const d = id.data;
    const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    let peak = 0;
    for (let i = 0; i < d.length; i += 4) { const l = lum(i); if (l > peak) peak = l; }
    const k = peak > 0.5 && PEAK > 0 ? PEAK / peak : 1;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], gg = d[i + 1], b = d[i + 2];
      if (SAT !== 1) {
        const y = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        r = y + (r - y) * SAT; gg = y + (gg - y) * SAT; b = y + (b - y) * SAT;
      }
      r *= k; gg *= k; b *= k;
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[i + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
      d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    g.putImageData(id, 0, 0);
  }

  /* Wrap the left/right edges into one another so the tile loops seamlessly.
     Done AFTER the tone pass, on the shipped pixels, so the blend is between
     the colours that actually reach the screen.

     Both originals are read before either is written: writing one edge and then
     reading it back for the other edge cascades the blend and drags the whole
     seam toward the average, which is how this looked right in the code and
     wrong on the wall. */
  const SEAM = ${SEAM};
  if (SEAM > 0 && SEAM * 2 < w) {
    const id = g.getImageData(0, 0, w, h);
    const d = id.data;
    const at = (x, y, c) => (y * w + x) * 4 + c;
    for (let y = 0; y < h; y++) {
      for (let k = 0; k < SEAM; k++) {
        const t = (k + 1) / (SEAM + 1);
        const rIdx = w - 1 - k;
        const lIdx = k;
        for (let c = 0; c < 3; c++) {
          const rOrig = d[at(rIdx, y, c)];
          const lOrig = d[at(lIdx, y, c)];
          d[at(rIdx, y, c)] = rOrig * (1 - t) + lOrig * t;
          d[at(lIdx, y, c)] = lOrig * (1 - t) + rOrig * t;
        }
      }
    }
    g.putImageData(id, 0, 0);
  }

  /* The palette: average luminance over a 16-column x 4-row grid, then the
     column means sorted — so the printed p10/p50/p90 are the darkest, the
     typical and the lightest part of the actual mural. */
  const px = g.getImageData(0, 0, w, h).data;
  const lum = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;
  const cells = [];
  const COLS = 16, ROWS = 4;
  const cw = Math.floor(w / COLS), ch = Math.floor(h / ROWS);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      let r = 0, gg = 0, b = 0, n = 0;
      for (let y = cy * ch; y < (cy + 1) * ch; y++) {
        for (let x = cx * cw; x < (cx + 1) * cw; x++) {
          const i = (y * w + x) * 4;
          r += px[i]; gg += px[i + 1]; b += px[i + 2]; n++;
        }
      }
      cells.push({ r: r / n, g: gg / n, b: b / n, l: lum(r / n, gg / n, b / n) });
    }
  }
  cells.sort((a, b) => a.l - b.l);
  const at = (q) => {
    const c0 = cells[Math.min(cells.length - 1, Math.round(q * (cells.length - 1)))];
    const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
    return { hex: '#' + hex(c0.r) + hex(c0.g) + hex(c0.b), l: +c0.l.toFixed(1) };
  };
  const mean = cells.reduce((a, c0) => a + c0.l, 0) / cells.length;

  /* The single BRIGHTEST pixel, which is not the same number as the p90 cell
     mean and is the one that bounds contrast: a background is composited
     per pixel, so one bright chip of stone in an otherwise dark cell is a
     ground bright enough to fail a text tier even though the cell's mean
     passes. */
  let peak = { r: 0, g: 0, b: 0, l: -1 };
  for (let i = 0; i < px.length; i += 4) {
    const l = lum(px[i], px[i + 1], px[i + 2]);
    if (l > peak.l) peak = { r: px[i], g: px[i + 1], b: px[i + 2], l: l };
  }

  /* The luminance distribution, because the peak is a single chip of stone and
     using it to bound text contrast closes the wall to a flat wash. What the
     stylesheet is tuned against is a quantile — see tests/shell-check.mjs. */
  const hist = new Uint32Array(256);
  const n4 = px.length / 4;
  for (let i = 0; i < px.length; i += 4) hist[Math.min(255, Math.round(lum(px[i], px[i + 1], px[i + 2])))]++;
  const quant = (q) => {
    let acc = 0;
    const want = q * n4;
    for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= want) return l; }
    return 255;
  };
  /* The colour at the 99.9th percentile of the whole image, then where that
     luminance first appears above 99.9 of it. */
  let q999 = { r: 0, g: 0, b: 0, l: 0 };
  const qL = quant(0.999);
  for (let i = 0; i < px.length; i += 4) {
    if (Math.round(lum(px[i], px[i + 1], px[i + 2])) === qL) {
      q999 = { r: px[i], g: px[i + 1], b: px[i + 2], l: lum(px[i], px[i + 1], px[i + 2]) };
      break;
    }
  }
  const hex = (v) => Math.round(v).toString(16).padStart(2, '0');

  return {
    data: c.toDataURL(${JSON.stringify(FORMAT)}, ${QUALITY}),
    w: w, h: h, sw: img.naturalWidth, sh: img.naturalHeight,
    palette: {
      p10: at(0.10), p50: at(0.50), p90: at(0.90), meanLum: +mean.toFixed(1),
      p90Lum: +quant(0.90).toFixed(1), p99Lum: +quant(0.99).toFixed(1), p999Lum: +quant(0.999).toFixed(1),
      above140: +(Array.from(hist.slice(141)).reduce((a, b) => a + b, 0) / n4 * 100).toFixed(3),
      peak: { hex: '#' + hex(peak.r) + hex(peak.g) + hex(peak.b), l: +peak.l.toFixed(1),
              r: peak.r, g: peak.g, b: peak.b },
      q999: { hex: '#' + hex(q999.r) + hex(q999.g) + hex(q999.b), l: +q999.l.toFixed(1),
              r: q999.r, g: q999.g, b: q999.b }
    }
  };
})()`);

const bytes = Buffer.from(shot.data.split(',')[1], 'base64');
const to = join(SITE, 'files', TARGET);
writeFileSync(to, bytes);

console.log('  ok  ' + NAME + '  (' + shot.sw + 'x' + shot.sh + ')  ->  files/' + TARGET
  + '  (' + shot.w + 'x' + shot.h + ',  ' + kb(statSync(from).size) + ' -> ' + kb(bytes.length) + ')\n');
console.log('mural palette (16x4 cell means, sorted by luminance):');
console.log('  darkest p10  ' + shot.palette.p10.hex + '   luminance ' + shot.palette.p10.l);
console.log('  typical p50  ' + shot.palette.p50.hex + '   luminance ' + shot.palette.p50.l);
console.log('  lightest p90 ' + shot.palette.p90.hex + '   luminance ' + shot.palette.p90.l);
console.log('  mean luminance ' + shot.palette.meanLum + ' of 255  ('
  + (shot.palette.meanLum / 255 * 100).toFixed(0) + '% of white)');
console.log('  BRIGHTEST PIXEL ' + shot.palette.peak.hex + '   luminance ' + shot.palette.peak.l);
console.log('luminance quantiles (what the stylesheet is tuned against):');
console.log('  p90  ' + shot.palette.p90Lum + '   p99  ' + shot.palette.p99Lum
  + '   p99.9  ' + shot.palette.p999Lum);
console.log('  pixels above luminance 140: ' + shot.palette.above140 + '% of the mural');

await send('Target.closeTarget', { targetId }, sessionId);
server.close();
process.exit(0);
