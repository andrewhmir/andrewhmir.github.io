/* Dev-only: per-room group geometry at a viewport.
   Usage: node tools/rooms.mjs [w] [h] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
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

/* Photographs in a room the walk has not reached carry loading="lazy" and are
   never fetched; force them all, or the boxes measured are the loading floor
   rather than the wall the visitor sees. */
await send('Runtime.evaluate', {
  expression: `(async () => {
    const imgs = [...document.querySelectorAll('#strip img')];
    imgs.forEach(i => { i.loading = 'eager'; });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) {
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 800));
  })()`,
  awaitPromise: true, returnByValue: true
}, sessionId);

const expr = [
  '(() => {',
  '  const dockTop = document.querySelector(".dock").getBoundingClientRect().top;',
  '  const out = [];',
  '  document.querySelectorAll("#strip .room").forEach(room => {',
  '    const gs = [...room.querySelectorAll(".group")];',
  '    const row = room.querySelector(".groups");',
  '    const title = room.querySelector(".room-title");',
  '    /* There are no grid tracks any more: a gallery is one row as wide as its',
  '       own hang, so what matters is the deepest COLUMN of each group and',
  '       whether the widest one still clears the dock band. */',
  '    const deepest = gs.length ? Math.max(...gs.map(g => Math.max(0,',
  '      ...[...g.querySelectorAll(".col")].map(c => c.getBoundingClientRect().height)))) : null;',
  '    out.push({',
  '      room: room.getAttribute("data-room"),',
  '      groups: gs.length,',
  '      roomW: Math.round(room.getBoundingClientRect().width),',
  '      rowW: row ? Math.round(row.getBoundingClientRect().width) : null,',
  '      deepest: deepest === null ? null : Math.round(deepest),',
  '      groupH: gs.length ? Math.round(gs[0].getBoundingClientRect().height) : null,',
  '      titleTop: title ? Math.round(title.getBoundingClientRect().top) : null,',
  '      lastBottom: gs.length ? Math.round(Math.max(...gs.map(g => g.getBoundingClientRect().bottom))) : null,',
  '      dockTop: Math.round(dockTop)',
  '    });',
  '  });',
  '  return JSON.stringify(out);',
  '})()'
].join('\n');

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
const rows = JSON.parse(r.result.value);
console.log(`── ${W}x${H}`);
for (const row of rows) {
  const ok = row.lastBottom === null || (row.lastBottom <= row.dockTop && row.titleTop >= 24);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${String(row.room).padEnd(16)} groups=${String(row.groups).padEnd(3)}` +
    ` roomW=${String(row.roomW).padEnd(6)} rowW=${String(row.rowW).padEnd(6)}` +
    ` deepest=${String(row.deepest).padEnd(5)} titleTop=${String(row.titleTop).padEnd(5)}` +
    ` lastBottom=${String(row.lastBottom).padEnd(6)} dockTop=${row.dockTop}`);
}
await send('Target.closeTarget', { targetId });
process.exit(0);
