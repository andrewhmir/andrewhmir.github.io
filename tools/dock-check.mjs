/* Dev-only: is every dock control reachable and correctly sized at a viewport?
   The dock scrolls horizontally when its rooms will not fit, so this checks
   that the controls exist, are at least 44px tall, and that the dock's own
   overflow is the only thing hiding any.
   Usage: node tools/dock-check.mjs [w] [h] */
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

const expr = `
(async () => {
  const dock = document.querySelector('.dock');
  const box = () => { const b = dock.getBoundingClientRect();
    return [Math.round(b.left), Math.round(b.right), Math.round(b.width), Math.round(b.height)]; };
  const links = () => [...dock.querySelectorAll('.dock-link')].map(x => {
    const q = x.getBoundingClientRect();
    return {
      goto: x.getAttribute('data-goto'),
      left: Math.round(q.left), right: Math.round(q.right),
      w: Math.round(q.width), h: Math.round(q.height),
      label: (x.getAttribute('aria-label') || '').slice(0, 40)
    };
  });
  const live = () => {
    const el = document.getElementById('dockCurrent');
    return el ? { text: el.textContent, w: Math.round(el.getBoundingClientRect().width) } : null;
  };
  const state = () => ({
    dock: box(), dockScrollW: dock.scrollWidth, dockClientW: dock.clientWidth,
    live: live(),
    current: [...dock.querySelectorAll('.dock-link[aria-current="true"]')].map(x => x.getAttribute('data-goto')),
    currentOnScreen: [...dock.querySelectorAll('.dock-link[aria-current="true"]')]
      .every(x => { const q = x.getBoundingClientRect(); return q.left >= 0 && q.right <= innerWidth; })
  });

  const first = Object.assign({ viewport: innerWidth + 'x' + innerHeight }, state(),
    { links: links(), unnamed: links().filter(l => !l.label).length,
      tooShort: links().filter(l => l.h < 44).map(l => l.goto + ' ' + l.h),
      offscreen: links().filter(l => l.right < 0 || l.left > innerWidth).map(l => l.goto) });

  /* Walk the whole strip and confirm each room names itself on the way. */
  const hall = document.getElementById('hall');
  const seen = [];
  const order = [...document.querySelectorAll('#strip .room')].map(r => r.getAttribute('data-room'));
  for (const name of order) {
    const room = document.querySelector('#strip .room[data-room="' + name + '"]');
    hall.scrollLeft = room.offsetLeft + 10;
    await new Promise(r => setTimeout(r, 350));
    const s = state();
    seen.push({ room: name, live: s.live ? s.live.text : null,
      current: s.current.join(','), onScreen: s.currentOnScreen });
  }
  first.walk = seen;
  hall.scrollLeft = 0;
  return JSON.stringify(first, null, 1);
})()`;
const r = await send('Runtime.evaluate',
  { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
