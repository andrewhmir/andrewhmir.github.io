/* Dev-only probe: read the ATTACHED SCREENSHOT as data.
   Answers "does the mural extend / loop" without a browser, by looking at the
   actual rendered pixels: a row profile (where does the wall stop?), a column
   profile, and a periodicity scan for the tile repeat.

   The PNG is decoded here with node:zlib -- no subprocess, because the sandbox
   refuses piped child stdio, and no image library, because none is installed.

   Usage: node tools/wall-readshot.mjs <path-to-png> */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/wall-readshot.mjs <png>'); process.exit(2); }

/* ── A minimal PNG reader: 8-bit RGB/RGBA, non-interlaced, which is what a
   screenshot is. Signature, IHDR, concatenated IDAT, then the per-scanline
   filters. Channel order is normalised to RGBA. ── */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let o = 8, W = 0, H = 0, depth = 0, color = 0, interlace = 0;
  const idat = [];
  let palette = null, trns = null;
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('ascii', o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      W = data.readUInt32BE(0); H = data.readUInt32BE(4);
      depth = data[8]; color = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8) throw new Error('only 8-bit PNGs are read here, got ' + depth);
  if (interlace) throw new Error('interlaced PNG not supported');
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (!chans) throw new Error('unsupported colour type ' + color);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = chans;
  const stride = W * bpp;
  const out = Buffer.alloc(W * H * 4);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < H; y++) {
    const filter = raw[p++];
    const src = raw.subarray(p, p + stride); p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
        default: throw new Error('bad filter ' + filter + ' on row ' + y);
      }
      line[x] = v & 0xff;
    }
    for (let x = 0; x < W; x++) {
      const s = x * bpp, d = (y * W + x) * 4;
      if (color === 2 || color === 6) { out[d] = line[s]; out[d+1] = line[s+1]; out[d+2] = line[s+2]; out[d+3] = color === 6 ? line[s+3] : 255; }
      else if (color === 0 || color === 4) { out[d] = out[d+1] = out[d+2] = line[s]; out[d+3] = color === 4 ? line[s+1] : 255; }
      else if (color === 3) { const i = line[s] * 3; out[d] = palette[i]; out[d+1] = palette[i+1]; out[d+2] = palette[i+2]; out[d+3] = trns && line[s] < trns.length ? trns[line[s]] : 255; }
    }
    line.copy(prev);
  }
  return { W, H, data: out };
}

const buf = readFileSync(file);
const { W, H, data: px } = decodePng(buf);

const lum = (x, y) => { const i = (y * W + x) * 4; return 0.2126 * px[i] + 0.7152 * px[i+1] + 0.0722 * px[i+2]; };
const rgb = (x, y) => { const i = (y * W + x) * 4; return [px[i], px[i+1], px[i+2]]; };

console.log(`${file}\n${W}x${H}\n`);

/* ── Row profile: the mean luminance of each band of 20 rows. A wall that
   stops shows up as a step change; a wall that loops shows up as a repeating
   ripple at the tile period. ── */
const band = 10;
console.log('rows    meanLum   minLum   maxLum   spread   left-third  right-two-thirds');
for (let y = 0; y + band <= H; y += band) {
  let s = 0, n = 0, lo = 999, hi = -1, ls = 0, ln = 0, rs = 0, rn = 0;
  for (let yy = y; yy < y + band; yy++) {
    for (let x = 0; x < W; x += 2) {
      const L = lum(x, yy); s += L; n++; if (L < lo) lo = L; if (L > hi) hi = L;
      if (x < W / 3) { ls += L; ln++; } else { rs += L; rn++; }
    }
  }
  const l3 = ls / ln, r23 = rs / rn;
  console.log(String(y).padStart(5) + String((s / n).toFixed(1)).padStart(10)
    + String(lo.toFixed(0)).padStart(9) + String(hi.toFixed(0)).padStart(9)
    + String((hi - lo).toFixed(0)).padStart(9)
    + String(l3.toFixed(1)).padStart(12) + String(r23.toFixed(1)).padStart(18)
    + (l3 - r23 > 3 ? '   left brighter' : r23 - l3 > 3 ? '   right brighter' : ''));
}

/* ── Column profile across the whole width, in 40px bands, to find the seam
   between "wall visible" and "wall absent". ── */
console.log('\ncols    meanLum   spread');
for (let x = 0; x + 40 <= W; x += 40) {
  let s = 0, n = 0, lo = 999, hi = -1;
  for (let y = 0; y < H; y += 3) {
    for (let xx = x; xx < x + 40; xx += 4) {
      const L = lum(xx, y); s += L; n++; if (L < lo) lo = L; if (L > hi) hi = L;
    }
  }
  console.log(String(x).padStart(5) + String((s / n).toFixed(1)).padStart(10) + String((hi - lo).toFixed(0)).padStart(9));
}

/* ── Periodicity: for each candidate period, the mean absolute difference
   between a column and the column one period over. A tiling mural dips hard at
   its true tile width; noise stays flat. ── */
console.log('\nperiodicity over a mid-height band (lower = better match)');
const y0 = Math.round(H * 0.30), y1 = Math.round(H * 0.62);
const col = [];
for (let x = 0; x < W; x++) {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y += 2) { s += lum(x, y); n++; }
  col.push(s / n);
}
const best = [];
for (let p = 60; p <= Math.floor(W / 2); p++) {
  let e = 0, n = 0;
  for (let x = 0; x + p < W; x++) { const d = col[x] - col[x + p]; e += d * d; n++; }
  best.push({ p, e: Math.sqrt(e / n) });
}
best.sort((a, b) => a.e - b.e);
console.log('  five best periods: ' + best.slice(0, 5).map((b) => b.p + 'px(' + b.e.toFixed(2) + ')').join('  '));
const worst = best[best.length - 1];
console.log('  worst period: ' + worst.p + 'px(' + worst.e.toFixed(2) + ')  — the baseline noise floor');

/* ── The darkest band anywhere. If the wall is extending, no horizontal band
   should be dramatically darker than its neighbours except the dock reserve. */
console.log('\nsampled pixels down the left edge (x=20) and mid-wall (x=' + Math.round(W * 0.30) + '):');
for (let y = 0; y < H; y += 40) {
  const a = rgb(20, y), b = rgb(Math.round(W * 0.30), y);
  console.log('  y=' + String(y).padStart(4)
    + '  x20 rgb(' + a.join(',') + ') L' + lum(20, y).toFixed(1)
    + '   x' + Math.round(W * 0.30) + ' rgb(' + b.join(',') + ') L' + lum(Math.round(W * 0.30), y).toFixed(1));
}
