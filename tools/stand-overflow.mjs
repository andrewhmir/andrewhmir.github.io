/* Dev-only: which stands are wider than the screen they are on, and by how
   much. A stand wider than the viewport is one a visitor cannot take in at a
   glance, which is what "one stand per screen" was for.

   Usage: node tools/stand-overflow.mjs [w] [h] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 1536);
const H = Number(process.argv[3] || 864);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej });
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
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 700));
  })()`, awaitPromise: true, returnByValue: true
}, sessionId);

const expr = `(() => {
  const out = [];
  document.querySelectorAll('#strip .group').forEach(g => {
    const b = g.getBoundingClientRect();
    const cl = g.querySelector('.cluster');
    const cols = [...cl.querySelectorAll(':scope > .col')];
    const first = cl.querySelector('.piece');
    out.push({
      entry: g.dataset.entry,
      room: g.closest('.room').getAttribute('data-room'),
      hang: cl.dataset.hang,
      cols: cols.length,
      deepest: Math.max(...cols.map(c => c.querySelectorAll(':scope > .piece').length)),
      standW: Math.round(b.width),
      clusterW: Math.round(cl.getBoundingClientRect().width),
      firstFrame: first ? Math.round(first.getBoundingClientRect().width) + 'x' +
        Math.round(first.getBoundingClientRect().height) : null
    });
  });
  const over = out.filter(r => r.standW > innerWidth)
    .sort((a, b) => b.standW - a.standW);
  return JSON.stringify({
    viewport: innerWidth + 'x' + innerHeight,
    stands: out.length,
    tooWide: over.length,
    worst: over.slice(0, 12),
    maxStandW: Math.round(Math.max(...out.map(r => r.standW)))
  }, null, 1);
})()`;

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
