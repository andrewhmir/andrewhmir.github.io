/* Dev-only: the room's width and a sample of frame boxes at a viewport.
   Usage: node tools/widths.mjs [w] [h] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 390);
const H = Number(process.argv[3] || 844);
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
  { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 }, sessionId);
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

const expr = [
  '(() => {',
  '  const hall = document.getElementById("hall");',
  `  const room = document.querySelector('#strip .room[data-room="${process.argv[4] || 'Robotics'}"]')`,
  '    || document.querySelector("#strip .room");',
  '  const grid = room.querySelector(".groups");',
  '  const pieces = [...room.querySelectorAll(".piece")].map(p => {',
  '    const b = p.getBoundingClientRect();',
  '    return Math.round(b.width) + "x" + Math.round(b.height);',
  '  });',
  '  return JSON.stringify({',
  '    viewport: innerWidth + "x" + innerHeight,',
  '    roomW: Math.round(room.getBoundingClientRect().width),',
  '    cols: grid ? getComputedStyle(grid).gridTemplateColumns : null,',
  '    rows: grid ? getComputedStyle(grid).gridTemplateRows : null,',
  '    pieces',
  '  }, null, 1);',
  '})()'
].join('\n');
const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
