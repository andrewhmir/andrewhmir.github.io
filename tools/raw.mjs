/* Dev-only: raw numbers at a viewport, for any commit. Works on the old
   markup too (.work) and the new (.group). Usage: node tools/raw.mjs [w] [h] */
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
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 }, sessionId);
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(3400);

console.log(await evaluate(`(() => {
  const r = document.querySelector('#strip .room[data-room="Robotics"]');
  const cs = getComputedStyle(r);
  const items = [...r.querySelectorAll('.work, .group')].map(x => {
    const b = x.getBoundingClientRect();
    const img = x.querySelector('img');
    const ib = img ? img.getBoundingClientRect() : null;
    return { cls: x.className, w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             imgW: ib ? +ib.width.toFixed(1) : null, imgH: ib ? +ib.height.toFixed(1) : null };
  });
  return JSON.stringify({
    viewport: innerWidth + 'x' + innerHeight,
    roomW: +r.getBoundingClientRect().width.toFixed(1),
    roomH: +r.getBoundingClientRect().height.toFixed(1),
    roomScrollH: r.scrollHeight,
    roomOverflowY: cs.overflowY,
    stripW: +document.getElementById('strip').getBoundingClientRect().width.toFixed(1),
    hallW: document.getElementById('hall').clientWidth,
    hallScrollW: document.getElementById('hall').scrollWidth,
    docScrollW: document.documentElement.scrollWidth,
    bodyOverflow: getComputedStyle(document.body).overflow,
    imgMaxH: cs.getPropertyValue('--img-max-h'),
    items
  }, null, 2);
})()`));

await send('Target.closeTarget', { targetId });
process.exit(0);
