/* Dev-only: list the pieces of one room with their boxes and natural sizes,
   to find a frame that renders as a sliver. Usage: node tools/pieces.mjs [room] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const ROOM = process.argv[2] || 'Robotics';
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
  { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(3400);

/* Some project stills are 4096px and take seconds to decode. Measuring before
   every image has settled reports a sliver for a frame whose photograph simply
   had not arrived — a measurement artefact, not a layout fault. */
/* Photographs in a room the walk has not reached carry loading="lazy" and are
   never fetched, so they measure at the loading floor rather than at their own
   proportions. That is correct behaviour, but it hides the layout under test:
   force every piece to load, then settle. */
await send('Runtime.evaluate', {
  expression: `(async () => {
    const imgs = [...document.querySelectorAll('#strip img')];
    imgs.forEach(i => { i.loading = 'eager'; });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && imgs.some(i => !i.complete)) {
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 800));
    return imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src'));
  })()`,
  awaitPromise: true, returnByValue: true
}, sessionId).then(r => {
  const missing = r.result.value || [];
  if (missing.length) console.log('NOT LOADED: ' + missing.join(', '));
});

const expr = [
  '(() => {',
  `  const room = document.querySelector('#strip .room[data-room="${ROOM}"]');`,
  '  if (!room) return JSON.stringify({ error: "no such room" });',
  '  const out = [];',
  '  room.querySelectorAll(".piece").forEach(p => {',
  '    const b = p.getBoundingClientRect();',
  '    const img = p.querySelector("img");',
  '    const ib = img ? img.getBoundingClientRect() : null;',
  '    const cs = getComputedStyle(p);',
  '    out.push({',
  '      piece: p.dataset.piece,',
  '      /* An awaited frame draws no picture and is a span, not a button. */',
  '      awaited: p.classList.contains("piece--pending"),',
  '      lead: p.classList.contains("piece--lead"),',
  '      frame: Math.round(b.width) + "x" + Math.round(b.height),',
  '      img: ib ? Math.round(ib.width) + "x" + Math.round(ib.height) : "none",',
  '      natural: img ? img.naturalWidth + "x" + img.naturalHeight : "none",',
  '      complete: img ? img.complete : false,',
  '      src: img ? img.getAttribute("src") : "none",',
  '      h: cs.height',
  '    });',
  '  });',
  '  /* The heights come from the stylesheet now, not from an inline --h per',
  '     frame, so what a piece reports is what the stylesheet resolved. Each',
  '     column computes its own --panel-h from its depth, so the token is read',
  '     from the column rather than from :root. */',
  '  const root = getComputedStyle(document.documentElement);',
  '  const firstCol = document.querySelector("#strip .col");',
  '  return JSON.stringify({',
  '    bandH: root.getPropertyValue("--band-h").trim(),',
  '    maxPanelH: root.getPropertyValue("--max-panel-h").trim(),',
  '    panelH: firstCol ? getComputedStyle(firstCol).getPropertyValue("--panel-h").trim() : "",',
  '    pieces: out',
  '  }, null, 1);',
  '})()'
].join('\n');

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
