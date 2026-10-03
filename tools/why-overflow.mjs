/* Dev-only: why does Robotics overflow the fold at 1280x704?
   Prints the room's box, its padding, and each child's height. */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
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

for (const [w, h, room] of [[1280, 704, 'Robotics'], [390, 844, 'Robotics']]) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(3200);
  const out = await evaluate(`(() => {
    const r = document.querySelector('#strip .room[data-room="${room}"]');
    const cs = getComputedStyle(r);
    const kids = [...r.children].map(c => {
      const b = c.getBoundingClientRect();
      const k = getComputedStyle(c);
      return { cls: c.className, h: +b.height.toFixed(1), top: +b.top.toFixed(1),
               bottom: +b.bottom.toFixed(1), flexWrap: k.flexWrap, minH: k.minHeight, maxH: k.maxHeight };
    });
    const works = [...r.querySelectorAll('.work, .group')].slice(0, 4).map(x => {
      const b = x.getBoundingClientRect();
      return { cls: x.className, w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    });
    return { roomH: +r.getBoundingClientRect().height.toFixed(1),
             padding: cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
             justifyContent: cs.justifyContent, kids, works };
  })()`);
  console.log(`\n── ${room} @ ${w}x${h}`);
  console.log('room height ' + out.roomH + ', padding ' + out.padding + ', justify ' + out.justifyContent);
  out.kids.forEach(k => console.log(`  ${String(k.cls).padEnd(16)} h=${String(k.h).padEnd(8)} top=${String(k.top).padEnd(8)} bottom=${String(k.bottom).padEnd(8)} wrap=${k.flexWrap} minH=${k.minH}`));
  out.works.forEach(k => console.log(`    work ${String(k.cls).padEnd(22)} ${k.w} x ${k.h}`));
}
await send('Target.closeTarget', { targetId });
process.exit(0);
