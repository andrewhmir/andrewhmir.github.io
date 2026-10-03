/* Dev-only: screenshot an arbitrary URL (usually a local mockup file).
   Usage: node tools/shot-url.mjs <url> <out.png> [width] [height] */
import { writeFile } from 'node:fs/promises';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const url = process.argv[2];
const out = process.argv[3];
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
if (!url || !out) { console.error('usage: node tools/shot-url.mjs <url> <out.png> [w] [h]'); process.exit(2); }

const list = await (await fetch(CDP + '/json/list')).json();
const target = list.find((t) => t.type === 'page');
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
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, { resolve, reject });
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 1, mobile: false
});
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 2600));
const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.data, 'base64'));
console.log('wrote ' + out);
ws.close();
process.exit(0);
