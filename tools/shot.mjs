/* Dev-only: screenshot the portfolio and dump the geometry of the fixed chrome
   against the first room. Drives headless Chrome over the DevTools Protocol.

   Usage:
     1. node tools/serve.mjs 3333
     2. chrome --headless=new --remote-debugging-port=9222 --user-data-dir=... about:blank
     3. node tools/shot.mjs [out.png] [width] [height] [scrollLeft]
*/
import { writeFile } from 'node:fs/promises';

const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const out = process.argv[2] || 'tools/shot.png';
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const SL = Number(process.argv[5] || 0);

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) {
  target = await (await fetch(CDP + '/json/new?about:blank')).json();
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 1, mobile: false
});
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 3500));

if (SL) {
  await send('Runtime.evaluate', {
    expression: `document.getElementById('hall').scrollLeft = ${SL}`
  });
  await new Promise((r) => setTimeout(r, 1200));
}

const geom = await send('Runtime.evaluate', {
  expression: `(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1),
               left: +r.left.toFixed(1), right: +r.right.toFixed(1),
               h: +r.height.toFixed(1), z: cs.zIndex, pos: cs.position,
               font: cs.fontSize, text: (el.textContent||'').trim().slice(0,28) };
    };
    const first = document.querySelector('#strip .room');
    const title = first && first.querySelector('.room-title');
    const sign  = first && first.querySelector('.sign');
    return JSON.stringify({
      viewport: { w: innerWidth, h: innerHeight },
      navHeader: g('#navHeader'),
      navList: g('#navList'),
      navMenu: g('#navMenu'),
      directory: g('#directory'),
      directoryFirstLink: g('#directory .room-link'),
      directoryLastLink: g('#directory li:last-child .room-link'),
      hall: g('#hall'),
      firstRoom: first && { top: +first.getBoundingClientRect().top.toFixed(1),
                            h: +first.offsetHeight.toFixed(1),
                            w: +first.offsetWidth.toFixed(1) },
      roomTitle: title && { top: +title.getBoundingClientRect().top.toFixed(1),
                            bottom: +title.getBoundingClientRect().bottom.toFixed(1),
                            h: +title.getBoundingClientRect().height.toFixed(1) },
      roomTitleH2: g('#strip .room .room-title'),
      sign: sign && { top: +sign.getBoundingClientRect().top.toFixed(1),
                      bottom: +sign.getBoundingClientRect().bottom.toFixed(1) },
      docScrollW: document.documentElement.scrollWidth,
      hallScrollW: document.getElementById('hall').scrollWidth,
      hallScrollLeft: document.getElementById('hall').scrollLeft,
      bodyOverflow: getComputedStyle(document.body).overflow,
      roomCount: document.querySelectorAll('#strip .room').length
    }, null, 2);
  })()`,
  returnByValue: true
});
console.log(geom.result.value);

const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.data, 'base64'));
console.log('wrote ' + out);
ws.close();
process.exit(0);
