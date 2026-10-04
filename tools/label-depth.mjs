/* Dev-only: what actually decides a group's row height?
   Prints the label's parts and the cluster's parts for every group in a room,
   so the fit can be reasoned about instead of guessed at.
   Usage: node tools/label-depth.mjs [w] [h] [room] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const ROOM = process.argv[4] || 'Leadership';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, { resolve, reject });
  const msg = { id: n, method, params }; if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(3400);
await send('Runtime.evaluate', {
  expression: `(async () => {
    const imgs = [...document.querySelectorAll('#strip img')];
    imgs.forEach(i => { i.loading = 'eager'; });
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 700));
  })()`, awaitPromise: true, returnByValue: true
}, sessionId);

const expr = `
(() => {
  const room = document.querySelector('#strip .room[data-room=${JSON.stringify(ROOM)}]');
  const h = (el) => el ? Math.round(el.getBoundingClientRect().height) : null;
  const w = (el) => el ? Math.round(el.getBoundingClientRect().width) : null;
  const box = (el) => el ? Object.assign({ h: h(el), w: w(el) }, (() => {
    const c = getComputedStyle(el);
    return { flex: c.flex, gap: c.gap, pad: c.paddingTop, pos: c.position };
  })()) : null;
  return JSON.stringify({
    groups: [...room.querySelectorAll('.group')].map((g) => {
      const label = g.querySelector('.label');
      return {
        entry: g.dataset.entry,
        pieces: g.querySelectorAll('.piece').length,
        cell: [w(g), h(g)],
        cluster: box(g.querySelector('.cluster')),
        /* The columns of the hang, in the order the arrangement names them. */
        hang: g.querySelector('.cluster') ? g.querySelector('.cluster').dataset.hang : null,
        cols: [...g.querySelectorAll('.col')].map((c) => box(c)),
        frames: [...g.querySelectorAll('.piece')].map((p) =>
          p.dataset.piece + ' h' + h(p) + ' ' + getComputedStyle(p).height),
        label: box(label),
        labelScroll: label.scrollHeight,
        plan: box(label.querySelector('.plan')),
        narr: box(label.querySelector('.narr')),
        cat: box(label.querySelector('.cat')),
        entries: [...label.querySelectorAll('.cat-entry')].map((e) => [w(e), h(e)])
      };
    })
  }, null, 1);
})()`;
const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description);
console.log(res.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
