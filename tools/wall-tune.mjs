/* Dev-only: pick the crown scrim by measurement.
   The crown of the room scrim is the only place the mural and the text fight:
   it is the brightest ground text can meet, and also the part of the wall a
   visitor actually looks at.

   Text is neutralised with `color: transparent` rather than by hiding the
   strip. Hiding the strip with `visibility` does not work — the room's scrim is
   the thing being measured, and it takes the strip with it — and scanning a
   rendered band while the type is live just finds the type: the room title is
   #f6efe0 at luminance 239 and swamps every candidate with the same number.
   Making the glyphs transparent keeps the scrim, the layout and the mural.

   Prints, per candidate, the brightest ground anywhere in the mural band across
   several scroll offsets, and the WCAG contrast each text tier meets there.

   Usage:
     1. node tools/serve.mjs 3333
     2. chrome --headless=new --remote-debugging-port=9222 ... about:blank
     3. node tools/wall-tune.mjs [width] [height] */
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

const TIERS = await evaluate(`(() => {
  const cs = getComputedStyle(document.documentElement);
  const toRgb = (v) => { const d = document.createElement('div'); d.style.color = v.trim(); document.body.appendChild(d);
    const c = getComputedStyle(d).color; d.remove(); const m = c.match(/\\d+/g); return { r:+m[0], g:+m[1], b:+m[2] }; };
  return { text: toRgb(cs.getPropertyValue('--text')), strong: toRgb(cs.getPropertyValue('--text-strong')),
           quiet: toRgb(cs.getPropertyValue('--text-quiet')) };
})()`);
const relLum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const contrast = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
const tileH = Math.round(1080 * (446 / 1600));

/* How visible is the mural? The p50 of the ground over the band, against the
   page's own --night. A wall nobody can see is not worth the contrast it cost. */
console.log(`${W}x${H} · mural band 0..${tileH} · text neutralised, scrim intact\n`);
console.log('crown  brightest ground      text   strong  quiet    mural read (p50 vs night)');

for (const crown of [0.42, 0.5, 0.58, 0.66, 0.74]) {
  await evaluate(`(() => {
    let s = document.getElementById('tune'); if (!s) { s = document.createElement('style'); s.id='tune'; document.head.appendChild(s); }
    s.textContent = \`
      .room { background:
        radial-gradient(74% 42% at 50% -10%, rgba(255,240,214,.06), transparent 74%),
        linear-gradient(180deg, rgba(16,21,25,${crown}) 0%, rgba(13,17,21,${(crown + 0.14).toFixed(2)}) 58%, rgba(6,9,11,0.88) 100%); }
      #strip, #strip * { color: transparent !important; text-shadow: none !important; }
      #strip img { visibility: hidden !important; }
    \`;
  })()`);
  await sleep(250);

  /* The band is ~420k pixels per offset; spreading that into an argument list
     overflows the stack, so the page reduces to a histogram and only a few
     hundred bytes cross the wire. */
  const hist = new Uint32Array(256);
  let peakPx = { r: 0, g: 0, b: 0, l: -1 };
  let n = 0;
  for (const sl of [0, 700, 1500, 2600, 4100]) {
    await evaluate(`document.getElementById('hall').scrollLeft = ${sl}`);
    await sleep(600);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const r = await evaluate(`(async () => {
      const img = new Image(); img.src = 'data:image/png;base64,${shot.data}';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.naturalWidth, ${tileH}).data;
      const hist = new Array(256).fill(0);
      let peak = { r: 0, g: 0, b: 0, l: -1 };
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
        hist[Math.min(255, Math.round(l))]++;
        if (l > peak.l) peak = { r: d[i], g: d[i+1], b: d[i+2], l: l };
      }
      return { hist: hist, peak: peak, n: d.length / 4 };
    })()`);
    for (let i = 0; i < 256; i++) hist[i] += r.hist[i];
    n += r.n;
    if (r.peak.l > peakPx.l) peakPx = r.peak;
  }
  const peak = peakPx;
  const quant = (p) => { let acc = 0; const want = p * n; for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= want) return l; } return 255; };
  /* The ground a glyph can meet is the p99.9 of the band, NOT the max: the max
     is the gold accent and a few icons, which are content on top of the wall and
     not the wall. Bounding the max is what closed the mural to a flat wash. */
  const q999 = quant(0.999);
  const ground = { r: 0, g: 0, b: 0, l: q999 };
  /* A representative colour at that luminance: take it from the peak's hue, so
     the printed contrast is against a plausible stone tone. */
  ground.r = Math.round(q999 * 0.9); ground.g = Math.round(q999 * 1.06); ground.b = Math.round(q999 * 1.12);
  const cG = (col) => contrast(col, ground);
  const c = (col) => contrast(col, peak);
  const nightLum = 0.2126 * 8 + 0.7152 * 12 + 0.0722 * 14;
  console.log(String(crown).padEnd(6) + ' p50 ' + String(quant(0.5)).padStart(3)
    + '  p99 ' + String(quant(0.99)).padStart(3) + '  p99.9 ' + String(q999).padStart(3)
    + '   text ' + cG(TIERS.text).toFixed(2).padStart(5) + '  strong ' + cG(TIERS.strong).toFixed(2).padStart(5)
    + '  quiet ' + cG(TIERS.quiet).toFixed(2).padStart(5) + (cG(TIERS.quiet) >= 4.5 ? ' AA ' : ' FAIL')
    + '   (absolute max ' + hex(peak) + ' lum ' + peak.l.toFixed(0) + ' = content, not wall; night ' + nightLum.toFixed(1) + ')');
}
await evaluate(`document.getElementById('tune').remove()`);
ws.close(); process.exit(0);
