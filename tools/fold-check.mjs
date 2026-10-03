/* Dev-only: run the fold assertions at the spec's floor viewport (1280x704)
   and at 1440x900, and print the numbers. Usage: node tools/fold-check.mjs */
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
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
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

let fail = 0;
for (const [w, h] of [[1440, 900], [1280, 704], [1920, 1080], [390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(3200);

  const report = await evaluate(`(() => {
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const hall = document.getElementById('hall');
    const room = document.querySelector('#strip .room');
    const rows = [];
    document.querySelectorAll('#strip .room').forEach(r => {
      const rb = r.getBoundingClientRect();
      const bad = [];
      r.querySelectorAll('h2, .group, .hang, .about-copy').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.height === 0) return;
        if (b.bottom > dock.top) bad.push((el.className || el.tagName) + ' bottom ' + Math.round(b.bottom));
        if (b.top < 24) bad.push((el.className || el.tagName) + ' top ' + Math.round(b.top));
      });
      rows.push({ room: r.getAttribute('data-room'), roomH: +rb.height.toFixed(1), bad });
    });
    return { vw: innerWidth, vh: innerHeight, dockTop: +dock.top.toFixed(1),
             hallScrollbar: hall.offsetHeight - hall.clientHeight,
             roomH: +room.getBoundingClientRect().height.toFixed(1), rows };
  })()`);

  console.log(`\n── ${w}x${h} (dock top ${report.dockTop}, room ${report.roomH}, hall scrollbar ${report.hallScrollbar})`);
  for (const row of report.rows) {
    const mark = row.bad.length ? 'FAIL' : 'ok  ';
    console.log(`  ${mark} ${row.room.padEnd(16)} roomH=${row.roomH}` +
      (row.bad.length ? '  -> ' + row.bad.join('; ') : ''));
    if (row.bad.length) fail++;
  }
}
console.log('\n' + (fail === 0 ? 'fold check: all clear' : 'fold check: ' + fail + ' rooms overflow'));
await send('Target.closeTarget', { targetId });
process.exit(fail ? 1 : 0);
