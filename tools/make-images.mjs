#!/usr/bin/env node
/* Dev-only: generate the OG share card and one poster frame per project video,
   using headless Chrome's canvas. No npm dependencies.
   Usage: chrome --headless=new --remote-debugging-port=9222 about:blank
          node tools/make-images.mjs                                    */
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const SITE = process.env.SITE || process.cwd();
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* Navigate to the site FIRST so its videos and images are same-origin.
   Drawing a cross-origin video onto a canvas taints it and toDataURL()
   throws — and http-server sends no CORS headers. */
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(1800);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

mkdirSync(join(SITE, 'files', 'posters'), { recursive: true });

/* ── 1. Poster frame per project video ── */
const videos = readdirSync(join(SITE, 'files')).filter((f) => /\.mp4$/i.test(f));
console.log('videos found: ' + videos.length);
let made = 0;
for (const file of videos) {
  const url = BASE + 'files/' + file;
  try {
    const dataUrl = await evaluate(`(async () => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.src = ${JSON.stringify(url)};
      await new Promise((res, rej) => {
        v.addEventListener('loadeddata', res, { once: true });
        v.addEventListener('error', () => rej(new Error('decode failed')), { once: true });
        setTimeout(() => rej(new Error('timed out waiting for metadata')), 30000);
      });
      const target = Math.min(1.5, (v.duration || 2) / 3);
      v.currentTime = target;
      await new Promise((res) => v.addEventListener('seeked', res, { once: true }));
      const c = document.createElement('canvas');
      c.width = 960;
      c.height = Math.round(960 * v.videoHeight / v.videoWidth);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.82);
    })()`);
    const out = join(SITE, 'files', 'posters', basename(file, extname(file)) + '.jpg');
    writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    made++;
    console.log('  poster  ' + file + '  ->  files/posters/' + basename(out));
  } catch (e) {
    console.log('  SKIP    ' + file + '  (' + (e && e.message) + ')');
  }
}

/* ── 2. Stills for projects whose media is a video and whose still is missing
      or a placeholder. Same decode path as the posters above; writing a real
      still is what stops a work hanging an empty frame in the gallery.

      `out` is where the file lands; `dataPath` is the field in js/data.js that
      has to point at it afterwards. This script writes the images and reports
      the wiring — it does not edit js/data.js, so nothing in the data file ever
      references a file that is not on disk yet. ── */
const STILLS = [
  { id: 'project2', out: 'files/HiveMind_Team.jpg', at: 0.40,
    dataPath: 'team.image', why: 'team photo is files/PlaceHolder.png' },
  { id: 'project5', out: 'files/SATLearn_Team.jpg', at: 0.40,
    dataPath: 'team.image', why: 'team photo is files/PlaceHolder.png' },
];

if (STILLS.length) {
  const data = await evaluate(`(() => {
    const out = {};
    PORTFOLIO.projects.forEach((p) => { out[p.id] = p.video; });
    return out;
  })()`);

  console.log('\nstills for video-only or placeholder projects:');
  let stillsMade = 0;
  for (const still of STILLS) {
    const video = data[still.id];
    if (!video) { console.log('  SKIP    ' + still.id + '  (no such project)'); continue; }
    const url = BASE + video;
    try {
      const dataUrl = await evaluate(`(async () => {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.src = ${JSON.stringify(url)};
        await new Promise((res, rej) => {
          v.addEventListener('loadeddata', res, { once: true });
          v.addEventListener('error', () => rej(new Error('decode failed')), { once: true });
          setTimeout(() => rej(new Error('timed out waiting for metadata')), 30000);
        });
        /* ~40% in: past any title card, before any end card. */
        v.currentTime = Math.max(0, (v.duration || 0) * ${still.at});
        await new Promise((res) => v.addEventListener('seeked', res, { once: true }));
        const LONG = 1600;
        const scale = LONG / Math.max(v.videoWidth, v.videoHeight);
        const c = document.createElement('canvas');
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.82);
      })()`);
      const outPath = join(SITE, still.out);
      writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
      stillsMade++;
      const kb = Math.round(Buffer.from(dataUrl.split(',')[1], 'base64').length / 1024);
      console.log('  still   ' + still.out + '  (' + kb + ' KB)  from ' + video);
      console.log('          wire js/data.js: ' + still.id + ' ' + still.dataPath +
        ' = "' + still.out + '"   [' + still.why + ']');
    } catch (e) {
      console.log('  SKIP    ' + still.out + '  (' + (e && e.message) + ')');
    }
  }
  console.log('stills written: ' + stillsMade + '/' + STILLS.length);
}

/* ── 3. 1200x630 OG share card ── */
try {
  const ogDataUrl = await evaluate(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(BASE + 'files/painting-hero.jpg')};
    await new Promise((res, rej) => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', () => rej(new Error('og source image failed')), { once: true });
    });
    const W = 1200, H = 630;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const grad = g.createLinearGradient(0, H * 0.35, 0, H);
    grad.addColorStop(0, 'rgba(20,16,13,0)');
    grad.addColorStop(1, 'rgba(20,16,13,0.88)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#f5f0e8';
    g.font = '400 76px Georgia, "Times New Roman", serif';
    g.fillText('Andrew Alangcao', 72, H - 150);
    g.fillStyle = '#c8892e';
    g.font = '400 30px Georgia, "Times New Roman", serif';
    g.fillText('Data Engineer  \u00b7  Computational Cognition Researcher', 72, H - 92);
    return c.toDataURL('image/jpeg', 0.86);
  })()`);
  writeFileSync(join(SITE, 'files', 'og-card.jpg'), Buffer.from(ogDataUrl.split(',')[1], 'base64'));
  console.log('  og      files/og-card.jpg');
} catch (e) {
  console.log('  SKIP    og-card.jpg  (' + (e && e.message) + ')');
}

console.log('\nposters written: ' + made + '/' + videos.length);
await send('Target.closeTarget', { targetId }, sessionId);
process.exit(0);
