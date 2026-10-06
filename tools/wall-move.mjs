/* Dev-only: does the mural move between two nearby scroll offsets? Prints the
   raw column means of the SAME viewport strip at two offsets. If the wall is
   pinned they are identical; if it travels they differ.

   This is the direct form of the argument wall-drift.mjs makes by correlation,
   and it is used here because correlation ALIASES on a tiling mural: with a
   900px tile, shift 0 and shift 900 are the same picture, so the search returns
   0 for every delta and reports "STATIC" for a wall that moves.

   Usage: node tools/wall-move.mjs [width] [height] */
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
await send('Page.navigate', { url: BASE + '?move=' + Date.now() });
await sleep(3500);

/* Only the mural may move: pictures and chrome suppressed by opacity so the walk
   keeps its layout and its scrollable width. */
await evaluate(`(() => {
  const s = document.createElement('style'); s.id = 'mv';
  s.textContent = '#strip img, #strip button, #strip .plate, .dock, .rail { opacity: 0 !important }';
  document.head.appendChild(s);
})()`);
await sleep(400);

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

const strip = async (sl) => {
  await settle(sl);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  return evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
    await new Promise((r) => { img.onload = r; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const W = img.naturalWidth;
    const y = Math.round(img.naturalHeight * 0.38);
    const d = g.getImageData(0, y, W, 1).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]);
    return out;
  })()`);
};

console.log(`${W}x${H}  ·  mural isolated (rooms transparent, still laid out)\n`);
console.log('offset A   offset B   mean|A(x) - B(x)|   verdict');
for (const [a, b] of [[0, 45], [0, 120], [0, 300], [500, 545], [500, 800], [0, 900]]) {
  const A = await strip(a), B = await strip(b);
  let s = 0;
  for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]);
  const mean = s / A.length;
  /* A pinned background re-renders identical frames for a small step. A
     travelled one differs. A step of exactly the tile width is expected to
     match again, because the mural is periodic by design. */
  const tileStep = (b - a) === 900;
  console.log(String(a).padStart(8) + String(b).padStart(11) + mean.toFixed(3).padStart(20) + '   '
    + (mean < 0.05 ? (tileStep ? 'identical (one tile on — correct)' : 'IDENTICAL — pinned, does not move')
       : 'differs — the mural moved with the walk'));
}
await evaluate(`document.getElementById('mv').remove()`);
ws.close(); process.exit(0);
