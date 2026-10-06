/* Dev-only: is the mural actually travelling with the walk?

   Compares the rendered wall at two scroll offsets and solves, by search, for
   the horizontal shift at which the second frame best matches the first. A
   parallax effect or a static wall both still "look" like a mural, so this has
   to be a number: shift 0 means the wall is not travelling, shift equal to the
   scroll delta means it travels 1:1, and anything between is parallax.

   Usage:
     1. node tools/serve.mjs 3333
     2. chrome --headless=new --remote-debugging-port=9222 ... about:blank
     3. node tools/wall-drift.mjs [width] [height] */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const BASE = process.env.BASE || 'http://127.0.0.1:3333/';
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(CDP + '/json/list')).json();
let target = list.find((t) => t.type === 'page');
if (!target) target = await (await fetch(CDP + '/json/new?about:blank')).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE });
await sleep(3500);

/* Confirm the walk is actually there before measuring. Without this the first
   `settle` throws "Cannot set properties of null", which reads as a broken tool
   rather than a page that has not loaded -- and a reused debugging target can
   still be sitting on the previous URL or on chrome-error:// when this starts. */
let ready = false;
for (let attempt = 0; attempt < 3 && !ready; attempt++) {
  if (attempt) { await send('Page.navigate', { url: BASE }); await sleep(2500); }
  try {
    ready = await evaluate(`document.readyState === 'complete' && !!document.getElementById('hall')`);
  } catch { ready = false; }
}
if (!ready) {
  const href = await evaluate('location.href').catch(() => '(unreadable)');
  console.error('the walk never appeared at ' + BASE + ' — page is at ' + href
    + '\nstart the server first: node tools/serve.mjs 3333');
  process.exit(1);
}

/* Neutralise type, or a glyph moving 120px dominates every correlation. */
await evaluate(`(() => { let s = document.getElementById('drift');
  if (!s) { s = document.createElement('style'); s.id = 'drift'; document.head.appendChild(s); }
  s.textContent = '#strip, #strip * { color: transparent !important; } #strip img { visibility: hidden !important; }'; })()`);
await sleep(400);

/* One horizontal strip of the wall, sampled at a fixed y. Lenis interpolates
   the scroll, so wait for it to stop before capturing: a frame taken mid-flight
   compares one offset against a different one and the match is meaningless. */
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

const grab = async (scrollLeft, y) => {
  await settle(scrollLeft);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  return evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, ${y}, img.naturalWidth, 1).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]);
    return out;
  })()`);
};

/* Best-match shift of B against A, over a window and a search range. */
const bestShift = (a, b, lo, hi) => {
  let best = { s: 0, err: Infinity };
  for (let s = lo; s <= hi; s++) {
    let err = 0, n = 0;
    for (let x = 300; x < 1100; x++) {
      const bx = x - s;
      if (bx < 0 || bx >= b.length) continue;
      const d = a[x] - b[bx];
      err += d * d; n++;
    }
    err /= n;
    if (err < best.err) best = { s: s, err: err };
  }
  return best;
};

const y = 120;
console.log(`${W}x${H} · wall strip at y=${y} · searching the shift that best matches\n`);
console.log('scroll A -> B   expected 1:1 shift   best-match shift   verdict');

/* 1:1 over a small delta — the case a visitor feels first. */
for (const [from, to] of [[0, 120], [0, 300], [500, 800]]) {
  const a = await grab(from, y);
  const b = await grab(to, y);
  const delta = to - from;
  const best = bestShift(a, b, 0, Math.min(delta + 60, 700));
  let verdict;
  if (best.s <= 6) verdict = 'STATIC — the wall is not travelling';
  else if (Math.abs(best.s - delta) <= 6) verdict = '1:1 — travels exactly with the walk';
  else verdict = 'PARTIAL — ' + (best.s / delta * 100).toFixed(0) + '% of the scroll';
  console.log(String(from + ' -> ' + to).padEnd(16) + String(delta).padEnd(22)
    + String(best.s).padEnd(19) + verdict);
}

/* And the loop: one tile later the wall should be indistinguishable. The tile
   width is read from the stylesheet rather than assumed — a hardcoded period
   here silently stops testing the right thing the moment --wall-tile changes. */
const tileW = await evaluate(`(() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--wall-tile').trim();
  const m = v.match(/([\\d.]+)px/);
  return m ? parseFloat(m[1]) : 1600;
})()`);
const a = await grab(0, y);
const c = await grab(tileW, y);
const best = bestShift(a, c, 0, Math.round(tileW) + 400);
const near = Math.abs(best.s - tileW) <= 6;
console.log('\none tile later (0 -> ' + tileW + '): best-match shift ' + best.s
  + (near ? '  — the tile joins itself, as designed' : '  — the loop does NOT line up'));

await evaluate(`document.getElementById('drift').remove()`);
ws.close(); process.exit(0);
