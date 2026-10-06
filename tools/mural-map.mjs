/* Dev-only: what does the mural actually DEPICT? Prints a coarse luminance map
   of the asset so its structure can be read without viewing it: a photograph of
   carved panels and columns reads as vertical banding, a smooth texture does not.

   Usage: node tools/mural-map.mjs [tileWidth] [cols] [rows] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3399/';
const TILE = Number(process.argv[2] || 900);
const COLS = Number(process.argv[3] || 60);
const ROWS = Number(process.argv[4] || 14);
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
await send('Page.navigate', { url: BASE + '?mm=' + Date.now() });
await sleep(3200);

const r = await evaluate(`(async () => {
  const img = new Image(); img.src = 'files/wall-mushoku.webp';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data;
  const AW = img.naturalWidth, AH = img.naturalHeight;
  const map = [];
  for (let ry = 0; ry < ${ROWS}; ry++) {
    const row = [];
    for (let rx = 0; rx < ${COLS}; rx++) {
      const x0 = Math.floor(rx * AW / ${COLS}), x1 = Math.floor((rx + 1) * AW / ${COLS});
      const y0 = Math.floor(ry * AH / ${ROWS}), y1 = Math.floor((ry + 1) * AH / ${ROWS});
      let s = 0, n = 0;
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        const i = (y*AW+x)*4; s += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; n++;
      }
      row.push(s / n);
    }
    map.push(row);
  }
  return { AW, AH, map };
})()`);

const all = r.map.flat();
const lo = Math.min(...all), hi = Math.max(...all);
const ramp = ' .:-=+*#%@';
console.log(`mural ${r.AW}x${r.AH}  ·  luminance ${lo.toFixed(1)}..${hi.toFixed(1)}  ·  each cell is one ${Math.round(r.AW / COLS)}px block\n`);
for (const row of r.map) {
  console.log('  ' + row.map((v) => ramp[Math.min(ramp.length - 1, Math.floor((v - lo) / (hi - lo || 1) * ramp.length))]).join(''));
}
console.log('\nvertical structure would show as a column of the same character running down');
console.log('every row; the mural is mostly smooth, so the wall has no drawn divisions.');
ws.close(); process.exit(0);
