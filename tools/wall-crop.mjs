/* Dev-only: is the whole mural on the wall, and is the loop visible?

   These two pull against each other, and every wrong version of this feature
   chose one and lost the other:

     - a tile WIDER than the window repeats the picture but shows a single copy,
       so it reads as one image cut short rather than a wall that loops;
     - a tile small enough to guarantee a repeat at every window size turns a
       frieze into wallpaper and the dragons into pattern.

   The tile is not a crop in either case: `background-size: ... auto` scales the
   asset into the tile and keeps its 3.59:1 proportions, so the whole picture is
   always present. What the tile decides is how many copies are in shot.

   The mural is `#hall`'s own background (see the note on #hall in the
   stylesheet), so the candidates are applied there. Only the IMAGE layer is
   overridden; the scrim layer stays as shipped.

   Prints the copies-across/down table per candidate and captures a screenshot of
   each so the difference is visible rather than argued about.

   Loads over file:// so no server is needed. Usage:
     1. chrome --headless=new --remote-debugging-port=9222 ... about:blank
     2. node tools/wall-crop.mjs [width] [height] */
import { writeFile } from 'node:fs/promises';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const URL_ARG = process.env.URL || 'file:///C:/Users/Andrew/Desktop/portfolio/index.html';
const W = Number(process.argv[2] || 1547);
const H = Number(process.argv[3] || 872);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CANDIDATES = [
  { name: 'a-half-window-50vw', size: '50vw auto' },
  { name: 'b-two-thirds-66vw', size: '66vw auto' },
  { name: 'c-1000px', size: '1000px auto' },
  { name: 'd-full-image-1600px', size: '1600px auto' },
  { name: 'e-viewport-width-100vw', size: '100vw auto' }
];

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) target = await (await fetch(CDP + '/json/new?about:blank')).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ARG });
await sleep(4000);

const asset = await evaluate(`(async () => {
  const img = new Image(); img.src = 'files/wall-mushoku.webp';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  return { w: img.naturalWidth, h: img.naturalHeight };
})()`);
const RATIO = asset.h / asset.w;

console.log(`asset ${asset.w}x${asset.h} (${(asset.w / asset.h).toFixed(2)}:1) at ${W}x${H} over file://\n`);
console.log('candidate'.padEnd(22) + 'tile w/h'.padEnd(13) + 'copies across'.padEnd(16) + 'copies down'.padEnd(14) + 'image scale');

for (const c of CANDIDATES) {
  await evaluate(`(() => {
    let s = document.getElementById('crop'); if (!s) { s = document.createElement('style'); s.id = 'crop'; document.head.appendChild(s); }
    /* Layer 1 is the scrim, layer 2 is the image; only the image is resized. */
    s.textContent = '#hall { background-size: auto, ${c.size} !important; }';
  })()`);
  await sleep(350);
  /* The computed value keeps units like 66vw literal, so measure it rather than
     parse it: reading a bare number out of "66vw auto" gives NaN, and reading
     it out of a clamp() gives the wrong term entirely. */
  const m = await evaluate(`(() => {
    const bs = getComputedStyle(document.getElementById('hall')).backgroundSize;
    const layer = bs.split(',').pop().trim().split(/[ ]+/)[0];
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;visibility:hidden;width:' + layer;
    document.body.appendChild(d);
    const tw = d.getBoundingClientRect().width; d.remove();
    return { tw: Math.round(tw), resolved: bs };
  })()`);
  const th = Math.round(m.tw * RATIO);
  console.log(c.name.padEnd(22) + (m.tw + 'x' + th).padEnd(13)
    + String((W / m.tw).toFixed(2)).padEnd(16) + String((H / th).toFixed(2)).padEnd(14)
    + (m.tw / asset.w).toFixed(2) + 'x');
  await evaluate(`document.getElementById('hall').scrollLeft = 0`);
  await sleep(350);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('tools/crop-' + c.name + '.png', Buffer.from(shot.data, 'base64'));
}
await evaluate(`document.getElementById('crop').remove()`);
console.log('\nwrote tools/crop-*.png');
ws.close(); process.exit(0);
