/* Dev-only: is the About/Robotics boundary VISIBLE on the wall?

   Each .room carries `border-right: 1px solid var(--edge-soft)`. At scrollLeft 0
   the About room's right edge sits at x = 100vw, exactly where the mural's first
   900px tile also ends -- so the border, the tile seam and the room boundary all
   coincide on one column and are easy to confuse. This walks the boundary across
   the viewport by scrolling, so the border is measured away from that coincidence,
   and reports how far the column stands above its neighbours.

   Usage: node tools/wall-roomseam.mjs [width] [height] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3399/';
const W = Number(process.argv[2] || 987);
const H = Number(process.argv[3] || 852);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) target = (await (await fetch(CDP + '/json/new?about:blank')).json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '?rs=' + Date.now() });
await sleep(3600);

const settle = async (sl) => {
  await evaluate(`document.getElementById('hall').scrollLeft = ${sl}`);
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await sleep(110);
    const now = await evaluate(`document.getElementById('hall').scrollLeft`);
    if (now === last && Math.abs(now - sl) <= 1) return now;
    last = now;
  }
  return last;
};

const probe = async (sl) => {
  const got = await settle(sl);
  /* Where is the About/Robotics boundary right now? */
  const geo = await evaluate(`(() => {
    const rooms = [...document.querySelectorAll('#strip .room')];
    const a = rooms[0], b = rooms[1];
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const cs = getComputedStyle(a);
    return { aRoom: a.dataset.room, bRoom: b.dataset.room,
             boundaryX: Math.round(rb.left), aboutRight: Math.round(ra.right),
             borderRight: cs.borderRightWidth + ' ' + cs.borderRightColor,
             tileW: Math.round((() => { const d = document.createElement('div');
               d.style.cssText = 'position:absolute;visibility:hidden;width:clamp(900px,66vw,1500px)';
               document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; })()) };
  })()`);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const r = await evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
    await new Promise((res) => { img.onload = res; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const Wd = img.naturalWidth, Hd = img.naturalHeight;
    const px = g.getImageData(0, 0, Wd, Hd).data;
    const L = (x, y) => { const i = (y*Wd+x)*4; return 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2]; };
    /* Only rows below every room's pictures, above the dock. */
    const y0 = Math.round(Hd * 0.62), y1 = Math.round(Hd * 0.80);
    const out = [];
    for (let x = 2; x < Wd - 2; x++) {
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y++) { sum += L(x, y) - (L(x-1, y) + L(x+1, y)) / 2; n++; }
      out.push({ x, d: +(sum / n).toFixed(3) });
    }
    return { out };
  })()`);
  return { got, geo, out: r.out };
};

console.log(`${W}x${H}\n`);
for (const sl of [0, 200, 500, 900]) {
  const p = await probe(sl);
  const bx = p.geo.boundaryX;
  const at = p.out.find((o) => o.x === bx);
  const atPlus = p.out.find((o) => o.x === bx + 1);
  const atMinus = p.out.find((o) => o.x === bx - 1);
  /* The largest deviation anywhere, for scale. */
  const worst = [...p.out].sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  console.log('scrollLeft ' + String(sl).padStart(4) + '   ' + p.geo.aRoom + '->' + p.geo.bRoom
    + ' boundary at viewport x=' + String(bx).padStart(4)
    + '   tile ' + p.geo.tileW);
  console.log('    border ' + p.geo.borderRight
    + '   at boundary: x-1 ' + (atMinus ? atMinus.d : '?')
    + '  x ' + (at ? at.d : '?') + '  x+1 ' + (atPlus ? atPlus.d : '?'));
  console.log('    biggest deviation anywhere in this row band: x=' + worst.x + ' d' + worst.d
    + '   (boundary ranks ' + (p.out.filter((o) => Math.abs(o.d) > Math.abs(at ? at.d : 0)).length + 1) + ' of ' + p.out.length + ')');
}

/* ── Which part of the boundary draws the edge? At scrollLeft 500 the boundary
   is mid-viewport (x=487) and well clear of the mural's 900px tile seam
   (x=400), so the two can finally be told apart. */
console.log('\nABLATION at scrollLeft 500 (boundary x=487, tile seam x=400)\n');
const VARIANTS = [
  ['as shipped', ''],
  ['room border-right removed', '#strip .room { border-right: none !important }'],
  ['room scrims removed', '#strip .room { background: none !important }'],
  ['border + scrims removed', '#strip .room { border-right: none !important; background: none !important }'],
  ['border + scrims + nap removed', '#strip .room { border-right: none !important; background: none !important } #strip .room::before { display: none !important }']
];
for (const [label, css] of VARIANTS) {
  await evaluate(`(() => {
    let s = document.getElementById('rs'); if (!s) { s = document.createElement('style'); s.id = 'rs'; document.head.appendChild(s); }
    s.textContent = ${JSON.stringify(css)};
  })()`);
  await sleep(450);
  const p = await probe(500);
  const bx = p.geo.boundaryX;
  const at = p.out.find((o) => o.x === bx) || { d: 0 };
  const atMinus = p.out.find((o) => o.x === bx - 1) || { d: 0 };
  const atPlus = p.out.find((o) => o.x === bx + 1) || { d: 0 };
  const step = Math.abs(atMinus.d) + Math.abs(atPlus.d) + Math.abs(at.d);
  const tileSeam = p.out.find((o) => o.x === 400) || { d: 0 };
  console.log('  ' + label.padEnd(34)
    + ' boundary x=487: ' + atMinus.d + ' / ' + at.d + ' / ' + atPlus.d
    + '  (total ' + step.toFixed(2) + ')'
    + '   tile seam x=400: ' + tileSeam.d
    + (step < 1 ? '   EDGE GONE' : ''));
}
await evaluate(`document.getElementById('rs').remove()`);
ws.close(); process.exit(0);
