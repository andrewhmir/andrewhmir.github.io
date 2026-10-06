/* Dev-only verification: does the mural now reach the eye at EVERY scroll
   offset along the walk, and does it still travel with the scroll?

   This is the check the shipped bug would have failed. The old arrangement
   measured a flat band (spread 0.0) at scrollLeft 8000, because a 987px layer
   cannot back a 30601px walk. Isolation is done with `opacity: 0`, never
   `display: none`: hiding #strip collapses the walk to one viewport and there
   is then nothing to scroll, which is how an earlier probe produced confident
   nonsense.

   Usage:
     1. node tools/serve.mjs 3399
     2. chrome --headless=new --remote-debugging-port=9222 ... about:blank
     3. node tools/wall-verify.mjs [width] [height] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3399/';
const W = Number(process.argv[2] || 987);
const H = Number(process.argv[3] || 852);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) target = (await (await fetch(CDP + '/json/new?about:blank')).json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '?verify=' + Date.now() });
await sleep(3200);

const shape = await evaluate(`(() => {
  const hall = document.getElementById('hall');
  const cs = getComputedStyle(hall);
  return { scrollW: hall.scrollWidth, clientW: hall.clientWidth,
           attach: cs.backgroundAttachment, repeat: cs.backgroundRepeat,
           size: cs.backgroundSize,
           hasWallEl: !!document.getElementById('wall') };
})()`);
console.log(`${W}x${H}  ·  walk ${shape.scrollW}px wide (${(shape.scrollW / shape.clientW).toFixed(1)} screens)`);
console.log(`attachment ${shape.attach}   repeat ${shape.repeat}   size ${shape.size}`);
console.log(`a separate #wall element exists: ${shape.hasWallEl}\n`);

let fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : '  -> ' + detail));
  if (!cond) fail++;
};

ok('the walk is many screens wide, so the range is real', shape.scrollW > shape.clientW * 10,
  'scrollWidth ' + shape.scrollW + ' vs clientWidth ' + shape.clientW);
ok('the mural is bound to the scrolled content', shape.attach === 'local, local',
  'computed attachment is "' + shape.attach + '"');
ok('no .wall layer remains', !shape.hasWallEl, '#wall is still in the DOM');

/* Sample the band just above the dock reserve: below every room's pictures, so
   what is left is the wall, its veil and the room scrim. */
const settle = async (sl) => {
  await evaluate(`document.getElementById('hall').scrollLeft = ${sl}`);
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await sleep(110);
    const now = await evaluate(`document.getElementById('hall').scrollLeft`);
    if (now === last && Math.abs(now - sl) <= 1) return now;
    last = now;
  }
  return last;
};

const band = async (sl) => {
  const got = await settle(sl);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const r = await evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const y = Math.round(img.naturalHeight * 0.78);
    const d = g.getImageData(0, y, img.naturalWidth, 12).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]);
    const lo = Math.min(...out), hi = Math.max(...out);
    const mean = out.reduce((a, b) => a + b, 0) / out.length;
    return { lo: +lo.toFixed(1), hi: +hi.toFixed(1), spread: +(hi - lo).toFixed(1), mean: +mean.toFixed(2) };
  })()`);
  return { got, ...r };
};

console.log('\nthe mural band just above the dock, along the whole walk');
const offsets = [0, Math.round(shape.scrollW * 0.1), Math.round(shape.scrollW * 0.25),
                 Math.round(shape.scrollW * 0.5), Math.round(shape.scrollW * 0.75),
                 Math.round(shape.scrollW * 0.9), shape.scrollW - shape.clientW];
for (const sl of offsets) {
  const b = await band(sl);
  const present = b.spread > 4;
  console.log('   scrollLeft ' + String(sl).padStart(6) + '   mean ' + String(b.mean).padStart(6)
    + '   spread ' + String(b.spread).padStart(6) + '   ' + (present ? 'mural present' : 'FLAT — mural absent'));
  ok('mural present at scrollLeft ' + sl, present,
    'spread ' + b.spread + ' — the band is a flat fill, so the mural does not reach here');
}

/* Travel: a 45px step must change the mural. A viewport-pinned background
   re-renders byte-identical frames, which is exactly what `scroll` and `fixed`
   measured (0.00 against 5.16 for local). */
const rowAt = async (sl) => {
  await settle(sl);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  return evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, Math.round(img.naturalHeight * 0.78), img.naturalWidth, 1).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]);
    return out;
  })()`);
};
console.log('\ntravel: frame-to-frame difference over 45px scroll steps');
let prev = await rowAt(1000);
const diffs = [];
for (let sl = 1045; sl <= 1360; sl += 45) {
  const cur = await rowAt(sl);
  let s = 0;
  for (let i = 0; i < cur.length; i++) s += Math.abs(cur[i] - prev[i]);
  diffs.push(+(s / cur.length).toFixed(2));
  prev = cur;
}
const travelMean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
console.log('   per-step ' + diffs.join(' ') + '   mean ' + travelMean.toFixed(2));
ok('the mural travels with the walk', travelMean > 1.0,
  'mean ' + travelMean.toFixed(2) + ' — a pinned background re-renders identical frames');

console.log('\n' + (fail ? fail + ' FAILED' : 'all clear'));
ws.close(); process.exit(fail ? 1 : 0);
