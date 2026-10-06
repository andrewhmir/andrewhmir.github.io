/* Dev-only: how much of the screen a stand leaves bare, and whether the next
   stand is in shot at the edge of this one. This is the check that "one stand
   per screen" is a property of the wall rather than a hope about it.

   Usage: node tools/stand-gap.mjs [w] [h] */
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

/* A stand is centred in the screen the way the walk parks it — lenis-snap
   aligns a stand's centre with the viewport's — so "what is beside it" is
   measured from the stand's centre, not from its left edge. */
const expr = `(() => {
  const out = [];
  document.querySelectorAll('#strip .room').forEach(room => {
    const gs = [...room.querySelectorAll('.group')];
    if (!gs.length) return;
    const boxes = gs.map(g => g.getBoundingClientRect());
    let worst = null, minGap = 1e9;
    boxes.forEach((b, i) => {
      const centre = b.left + b.width / 2;
      const left = centre - innerWidth / 2, right = centre + innerWidth / 2;
      const intruders = boxes
        .map((o, j) => ({ j, over: Math.max(0, Math.min(o.right, right) - Math.max(o.left, left)) }))
        .filter(x => x.j !== i && x.over > 0);
      const share = 1 - (b.width / innerWidth);
      const rec = { entry: gs[i].dataset.entry, standW: Math.round(b.width),
        bareShare: Math.round(share * 100), neighboursInShot: intruders.length,
        worstIntrusion: intruders.length ? Math.round(Math.max(...intruders.map(x => x.over))) : 0 };
      if (!worst || rec.worstIntrusion > worst.worstIntrusion) worst = rec;
      if (i > 0) minGap = Math.min(minGap, Math.round(b.left - boxes[i - 1].right));
    });
    out.push({ room: room.getAttribute('data-room'), stands: gs.length,
      minGap: minGap === 1e9 ? null : minGap, worst });
  });
  return JSON.stringify({ viewport: innerWidth + 'x' + innerHeight,
    anyIntrusion: out.filter(r => r.worst && r.worst.neighboursInShot > 0).length,
    rooms: out }, null, 1);
})()`;

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
