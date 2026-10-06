/* Dev-only: does the mural ASSET contain dark vertical lines of its own?

   Answers "is that cut in the picture?" from the asset rather than from a
   screenshot. The browser is the only rasteriser available here (Node has no
   image decoder), so the asset is drawn into a canvas at the real tile width and
   summarised IN THE PAGE — only a summary crosses the wire.

   The scan SAMPLES rather than visiting every pixel: a full 900x251 pass touch-
   6M samples and ran for minutes, which is a probe defect, not a measurement.
   Rows are stepped by 2 and the result is a per-column mean, which is all the
   column profile needs.

   Usage: node tools/mural-columns.mjs [tileWidth] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3399/';
const TILE = Number(process.argv[2] || 900);
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
await send('Page.navigate', { url: BASE + '?mc=' + Date.now() });
await sleep(3200);

const r = await evaluate(`(async () => {
  const img = new Image();
  img.src = 'files/wall-mushoku.webp';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const AW = img.naturalWidth, AH = img.naturalHeight;
  const TW = ${TILE}, TH = Math.round(${TILE} * AH / AW);
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, TW, TH);
  /* One getImageData, then index it: calling per pixel is what was slow. */
  const d = g.getImageData(0, 0, TW, TH).data;
  const cols = new Float64Array(TW);
  const counts = new Uint32Array(TW);
  for (let y = 0; y < TH; y += 2) {
    const row = y * TW * 4;
    for (let x = 0; x < TW; x++) {
      const i = row + x * 4;
      cols[x] += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
      counts[x]++;
    }
  }
  for (let x = 0; x < TW; x++) cols[x] /= (counts[x] || 1);
  const out = [];
  for (let x = 4; x < TW - 4; x++) {
    let base = 0;
    for (let k = -4; k <= 4; k++) if (k) base += cols[x + k];
    base /= 8;
    out.push({ x, d: +(cols[x] - base).toFixed(3), l: +cols[x].toFixed(2) });
  }
  const dark = [...out].sort((a, b) => a.d - b.d).slice(0, 12);
  const bright = [...out].sort((a, b) => b.d - a.d).slice(0, 10);
  return { AW, AH, TW, TH, dark, bright,
           join: +(cols[0] - cols[TW-1]).toFixed(3),
           first: +cols[0].toFixed(2), last: +cols[TW-1].toFixed(2),
           min: +Math.min(...cols).toFixed(2), max: +Math.max(...cols).toFixed(2) };
})()`);

console.log(`asset ${r.AW}x${r.AH}  drawn at ${r.TW}x${r.TH}`);
console.log(`column luminance ${r.min}..${r.max}   first col ${r.first}   last col ${r.last}   join ${r.join}\n`);
console.log('THE MURAL\'S OWN darkest columns (deviation from a 9-wide local mean):');
for (const c of r.dark) console.log('   x=' + String(c.x).padStart(4) + '   luminance ' + String(c.l).padStart(6) + '   dev ' + c.d);
console.log('\nTHE MURAL\'S OWN brightest columns:');
for (const c of r.bright) console.log('   x=' + String(c.x).padStart(4) + '   luminance ' + String(c.l).padStart(6) + '   dev +' + c.d);
console.log('\nAt a 987px window --wall-tile resolves to 900px, so the mural repeats every 900px on screen.');
ws.close(); process.exit(0);
