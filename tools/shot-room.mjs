/* Dev-only: screenshot a room by its data-room key, centred in the hall.
   Usage: node tools/shot-room.mjs <room> <out.png> [w] [h] */
import { writeFile } from 'node:fs/promises';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const room = process.argv[2];
const out = process.argv[3] || 'tools/room.png';
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
if (!room) { console.error('usage: node tools/shot-room.mjs <room> <out.png> [w] [h]'); process.exit(2); }

const list = await (await fetch(CDP + '/json/list')).json();
const target = list.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, { resolve, reject });
  ws.send(JSON.stringify({ id: n, method, params }));
});
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 3500));
await send('Runtime.evaluate', {
  expression: `(async () => {
    const imgs = [...document.querySelectorAll('#strip img')];
    imgs.forEach(i => { i.loading = 'eager'; });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 800));
  })()`,
  awaitPromise: true, returnByValue: true
});
const scrolled = await send('Runtime.evaluate', {
  expression: `(() => {
    const hall = document.getElementById('hall');
    const r = document.querySelector('#strip .room[data-room=${JSON.stringify(room)}]');
    if (!r) return null;
    const hr = hall.getBoundingClientRect(), rr = r.getBoundingClientRect();
    hall.scrollLeft += (rr.left - hr.left) - 34;
    return Math.round(hall.scrollLeft);
  })()`,
  returnByValue: true
});
if (scrolled.result.value === null) {
  console.error('no room named ' + room);
  process.exit(1);
}
await new Promise((r) => setTimeout(r, 900));
const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.data, 'base64'));
console.log('wrote ' + out + ' (scrollLeft ' + scrolled.result.value + ')');
ws.close();
process.exit(0);
