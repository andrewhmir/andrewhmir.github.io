/* Dev-only: one stand's frames with their exact boxes, to find a frame that is
   not where its column puts it. Usage: node tools/stand-boxes.mjs <entry> [w] [h] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const ENTRY = process.argv[2] || 'Robotics:2';
const W = Number(process.argv[3] || 1536);
const H = Number(process.argv[4] || 864);
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
  const g = document.querySelector('#strip .group[data-entry="${ENTRY}"]');
  if (!g) return JSON.stringify({ error: 'no such entry' });
  const box = (el) => { const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  return JSON.stringify({
    entry: g.dataset.entry,
    hang: g.querySelector('.cluster').dataset.hang,
    group: box(g),
    label: box(g.querySelector('.label')),
    cols: [...g.querySelectorAll(':scope > .cluster > .col')].map((c, i) => ({
      col: i,
      inline: c.getAttribute('style'),
      cssMaxW: getComputedStyle(c).maxWidth,
      alignItems: getComputedStyle(c).alignItems,
      box: box(c),
      pieces: [...c.querySelectorAll(':scope > .piece')].map(p => ({
        awaited: p.classList.contains('piece--pending'),
        lead: p.classList.contains('piece--lead'),
        box: box(p),
        cssW: getComputedStyle(p).width, cssH: getComputedStyle(p).height,
        alignSelf: getComputedStyle(p).alignSelf,
        img: p.querySelector('img') ? box(p.querySelector('img')) : null
      }))
    }))
  }, null, 1);
})()`;

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
