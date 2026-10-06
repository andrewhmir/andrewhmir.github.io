/* Dev-only: the wall's average photograph size — one number for "how big do the
   pictures read". Sums the real frames' areas across every hung piece and
   divides by the number of rooms, so it is area-per-screen, not per-group.

   Usage: node tools/avg-frame.mjs [w] [h] */
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

const expr = [
  '(() => {',
  '  const rooms = [...document.querySelectorAll("#strip .room")].filter(r => r.querySelector(".piece"));',
  '  const out = rooms.map(room => {',
  '    const ps = [...room.querySelectorAll(".piece")].map(p => p.getBoundingClientRect());',
  '    const widths = ps.map(b => Math.round(b.width)).sort((a, b) => a - b);',
  '    const heights = ps.map(b => Math.round(b.height)).sort((a, b) => a - b);',
  '    const area = ps.reduce((s, b) => s + b.width * b.height, 0);',
  '    return {',
  '      room: room.getAttribute("data-room"),',
  '      screens: Math.round(room.getBoundingClientRect().width / innerWidth * 10) / 10,',
  '      pieces: ps.length,',
  '      median: widths[Math.floor(widths.length / 2)] + "x" + heights[Math.floor(heights.length / 2)],',
  '      smallest: widths[0] + "x" + heights[0],',
  '      largest: widths[widths.length - 1] + "x" + heights[heights.length - 1],',
  '      areaPerScreen: Math.round(area / (room.getBoundingClientRect().width / innerWidth))',
  '    };',
  '  });',
  '  const total = out.reduce((s, r) => s + r.areaPerScreen, 0);',
  '  return JSON.stringify({',
  '    viewport: innerWidth + "x" + innerHeight,',
  '    rooms: out,',
  '    areaPerScreenAcrossWalk: Math.round(total / out.length),',
  '    screensTotal: Math.round(out.reduce((s, r) => s + r.screens, 0) * 10) / 10',
  '  }, null, 1);',
  '})()'
].join('\n');

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
