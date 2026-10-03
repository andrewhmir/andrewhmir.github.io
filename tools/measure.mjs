/* Dev-only: measure the hall's box against the viewport, to find where the
   second scrollbar comes from. Usage: node tools/measure.mjs */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';

const list = await (await fetch(CDP + '/json/list')).json();
const target = list.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, { resolve, reject });
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 3200));

const res = await send('Runtime.evaluate', {
  expression: `(() => {
    const hall = document.getElementById('hall');
    const cl = document.querySelector('.content-layer');
    return JSON.stringify({
      innerW: innerWidth, innerH: innerHeight,
      docClientW: document.documentElement.clientWidth,
      docClientH: document.documentElement.clientHeight,
      docScrollW: document.documentElement.scrollWidth,
      docScrollH: document.documentElement.scrollHeight,
      docCanScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      bodyClientH: document.body.clientHeight,
      bodyScrollH: document.body.scrollHeight,
      contentLayerH: cl.getBoundingClientRect().height,
      contentLayerScrollH: cl.scrollHeight,
      hallClientH: hall.clientHeight,
      hallOffsetH: hall.offsetHeight,
      hallScrollH: hall.scrollHeight,
      hallRectH: +hall.getBoundingClientRect().height.toFixed(1),
      docVerticalOverflow: document.documentElement.scrollHeight - innerHeight,
      dockRect: (() => { const d = document.querySelector('.dock');
        if (!d) return null; const r = d.getBoundingClientRect();
        return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1) }; })(),
      railRect: (() => { const d = document.querySelector('.rail');
        if (!d) return null; const r = d.getBoundingClientRect();
        return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), width: +r.width.toFixed(1) }; })()
    }, null, 2);
  })()`,
  returnByValue: true
});
console.log(res.result.value);
ws.close(); process.exit(0);
