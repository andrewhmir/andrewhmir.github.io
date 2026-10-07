/* Dev-only: what one screen's worth of a stand can hold, at a viewport.
   Reports the room's real content band and the four levers a stand-hang has:
   the label's fixed basis, the frame gap, the group gap, and the dock band.

   Usage: node tools/stand-fit.mjs [w] [h] */
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

const expr = [
  '(() => {',
  '  const cs = getComputedStyle(document.documentElement);',
  '  const tok = (n) => cs.getPropertyValue(n).trim();',
  '  const room = document.querySelector(\'#strip .room[data-room="Robotics"]\');',
  '  const rb = room.getBoundingClientRect();',
  '  const titleEl = room.querySelector(".room-title");',
  '  const title = titleEl.getBoundingClientRect();',
  '  const tcs = getComputedStyle(titleEl);',
  '  const groups = room.querySelector(".groups").getBoundingClientRect();',
  '  const label = room.querySelector(".label");',
  '  const wall = room.querySelector(".cluster");',
  '  const dock = document.querySelector(".dock").getBoundingClientRect();',
  '  const pad = getComputedStyle(room);',
  '  /* What the band would be if the room had no title. This was named',
  '     `impliedBand` and compared against `--band-h`, the fixed 156px picture',
  '     band the stand used to give its hang. That token is gone: the band is now',
  '     the stand\'s own height, which the stylesheet computes as the viewport',
  '     less the room\'s padding and the title block, and this is the same number',
  '     measured from the room instead of derived. It is what a stand divides. */',
  '  const overhead = innerHeight - (title.height + parseFloat(tcs.marginBottom)',
  '    + parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom) + dock.height',
  '    + (innerHeight - dock.bottom));',
  '  return JSON.stringify({',
  '    viewport: innerWidth + "x" + innerHeight,',
  '    impliedBand: Math.round(overhead),',
  '    tokens: {',
  '      /* The two cells. `--label-col` is the stand\'s right cell and the wall',
  '         takes what is left; `--band-h` / `--max-panel-h` / `--label-w` are',
  '         retired with the stacked shape and no longer resolve. */',
  '      labelCol: tok("--label-col"), labelSide: tok("--label-side"),',
  '      roomTitleH: tok("--room-title-h"), railH: tok("--rail-h"),',
  '      colGap: tok("--col-gap"), clusterGap: tok("--cluster-gap"),',
  '      groupGap: tok("--group-gap"), colGapX: tok("--group-col-gap"),',
  '      /* Resolved, not declared: what the two cells actually came out as. */',
  '      wallW: wall ? Math.round(wall.getBoundingClientRect().width) + "px" : "",',
  '      labelW: label ? Math.round(label.getBoundingClientRect().width) + "px" : "",',
  '      rowH: room.querySelector(".piece") ? getComputedStyle(room.querySelector(".piece")).height : ""',
  '    },',
  '    room: {',
  '      top: Math.round(rb.top), height: Math.round(rb.height),',
  '      padTop: pad.paddingTop, padRight: pad.paddingRight, padBottom: pad.paddingBottom',
  '    },',
  '    title: { top: Math.round(title.top), height: Math.round(title.height),',
  '      marginBottom: tcs.marginBottom, bottom: Math.round(title.bottom) },',
  '    dockTop: Math.round(dock.top),',
  '    /* The row a stand fills, and what the label has to hold. */',
  '    band: {',
  '      top: Math.round(groups.top),',
  '      bottom: Math.round(groups.bottom),',
  '      height: Math.round(groups.height)',
  '    },',
  '    label: label ? { h: label.clientHeight, content: label.scrollHeight,',
  '      over: label.scrollHeight > label.clientHeight + 1,',
  '      overflowY: getComputedStyle(label).overflowY } : null,',
  '    stands: [...room.querySelectorAll(".group")].map(g => {',
  '      const cl = g.querySelector(".cluster");',
  '      const cb = cl.getBoundingClientRect();',
  '      const pieces = [...cl.querySelectorAll(".piece")];',
  '      const boxes = pieces.map(p => p.getBoundingClientRect());',
  '      return {',
  '        entry: g.dataset.entry,',
  '        hang: cl.dataset.hang,',
  '        pieces: pieces.length,',
  '        clusterW: Math.round(cb.width), clusterH: Math.round(cb.height),',
  '        standW: Math.round(g.getBoundingClientRect().width),',
  '        standH: Math.round(g.getBoundingClientRect().height),',
  '        /* The wall\'s width against the hang\'s natural width: the one',
  '           comparison that says whether a hang is clipped by the cell it was',
  '           given, and therefore whether the arrangement has to change. */',
  '        fitsWall: Math.round(cb.width) <= Math.round(g.querySelector(".cluster").clientWidth) + 1,',
  '        frameW: boxes.length ? Math.round(Math.min(...boxes.map(b => b.width))) + "-" + Math.round(Math.max(...boxes.map(b => b.width))) : "",',
  '        firstPiece: boxes.length ? Math.round(boxes[0].width) + "x" + Math.round(boxes[0].height) : ""',
  '      };',
  '    })',
  '  }, null, 1);',
  '})()'
].join('\n');

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
console.log(r.result.value);
await send('Target.closeTarget', { targetId });
process.exit(0);
