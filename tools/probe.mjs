/* Dev-only: probe — does hiding the native scrollbar recover the hall's 15px,
   and does the densest room still clear the fold at the spec's floor (1280x704)?
   Usage: node tools/probe.mjs */
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
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

await send('Page.enable'); await send('Runtime.enable');

const MEASURE = `(() => {
  const hall = document.getElementById('hall');
  const out = { hallClientH: hall.clientHeight, hallOffsetH: hall.offsetHeight,
                navHeaderH: document.getElementById('navHeader').getBoundingClientRect().height,
                directoryH: document.getElementById('directory').getBoundingClientRect().height };
  const rooms = [...document.querySelectorAll('#strip .room')];
  out.rooms = rooms.map(r => {
    const kids = [...r.children].filter(c => !c.classList.contains('sign'));
    let bottom = 0, titleTop = null, titleBottom = null;
    kids.forEach(k => {
      const b = k.getBoundingClientRect().bottom;
      if (b > bottom) bottom = b;
    });
    const t = r.querySelector('.room-title');
    if (t) { const rb = t.getBoundingClientRect(); titleTop = +rb.top.toFixed(1); titleBottom = +rb.bottom.toFixed(1); }
    const rr = r.getBoundingClientRect();
    return { room: r.getAttribute('data-room'),
             contentBottom: +bottom.toFixed(1),
             titleTop, titleBottom,
             roomH: +rr.height.toFixed(1),
             overflowBy: +(bottom - rr.bottom).toFixed(1) };
  });
  return JSON.stringify(out);
})()`;

for (const [w, h, label] of [[1440, 900, 'control'], [1440, 900, 'scrollbar hidden'], [1280, 704, 'spec floor']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE });
  await new Promise((r) => setTimeout(r, 3000));
  if (label === 'scrollbar hidden') {
    await evalJs(`(() => {
      const s = document.createElement('style');
      s.textContent = '#hall{scrollbar-width:none}#hall::-webkit-scrollbar{display:none}';
      document.head.appendChild(s);
      return 'ok';
    })()`);
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log('── ' + label + ' @ ' + w + 'x' + h);
  console.log(await evalJs(MEASURE));
  console.log('');
}
ws.close(); process.exit(0);
