/* Dev-only: how much of each label is actually visible, and do frames from one
   group paint over another group's photographs?
   Both questions are about overflow, which no rect comparison against the dock
   can see. Usage: node tools/label-fit.mjs [w] [h] */
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
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 800));
  })()`, awaitPromise: true, returnByValue: true
}, sessionId);

const expr = [
  '(() => {',
  '  const out = { viewport: innerWidth + "x" + innerHeight, clippedLabels: [], overlaps: [], inertPieces: 0, pieceCount: 0 };',
  '  document.querySelectorAll("#strip .group").forEach((g, gi) => {',
  '    const label = g.querySelector(".label");',
  '    if (label && label.scrollHeight > label.clientHeight + 1) {',
  '      const room = g.closest(".room").getAttribute("data-room");',
  '      const hidden = [...label.querySelectorAll(".cat-entry")].filter(e => {',
  '        const er = e.getBoundingClientRect(), lr = label.getBoundingClientRect();',
  '        return er.bottom > lr.bottom + 1;',
  '      }).length;',
  '      out.clippedLabels.push(room + " #" + g.dataset.entry + " labelH " + Math.round(label.clientHeight) +',
  '        " content " + Math.round(label.scrollHeight) + " hidden entries " + hidden);',
  '    }',
  '  });',
  '  const pieces = [...document.querySelectorAll("#strip .piece")];',
  '  out.pieceCount = pieces.length;',
  '  out.inertPieces = pieces.filter(p => !p.dataset.action && !p.dataset.gallery).length;',
  '  const boxes = pieces.map(p => ({',
  '    g: p.closest(".group"), r: p.getBoundingClientRect(),',
  '    id: p.closest(".room").getAttribute("data-room") + ":" + p.closest(".group").dataset.entry + ":" + p.dataset.piece',
  '    , inert: !p.dataset.action && !p.dataset.gallery',
  '  }));',
  '  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {',
  '    const a = boxes[i], b = boxes[j];',
  '    if (a.g === b.g) continue;',
  '    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);',
  '    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);',
  '    if (w > 2 && h > 2) out.overlaps.push(a.id + " over " + b.id + " = " + Math.round(w) + "x" + Math.round(h));',
  '  }',
  '  out.overlaps = out.overlaps.slice(0, 8);',
  '  return JSON.stringify(out, null, 1);',
  '})()'
].join('\n');
const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
