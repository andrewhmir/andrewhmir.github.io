/* Dev-only: does the arrow key actually move the walk once #hall has focus?
   Prints the state at every step rather than asserting, because the question
   is which step is missing.
   Usage: node tools/key-diag.mjs */
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
  { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: BASE }, sessionId);
await sleep(3400);

const state = async (label) => {
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const h = document.getElementById('hall');
      return JSON.stringify({
        scrollLeft: Math.round(h.scrollLeft),
        active: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
        tabindex: h.getAttribute('tabindex'),
        overflowX: getComputedStyle(h).overflowX,
        lenisRunning: !!(globalThis.Site && globalThis.Site.walk && globalThis.Site.walk.lenis)
      });
    })()`, returnByValue: true
  }, sessionId);
  console.log(label.padEnd(34) + r.result.value);
};

const arrow = async (key, vk) => {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId);
  await sleep(800);
};

await state('initial');
await send('Runtime.evaluate', { expression: `document.getElementById('hall').focus()` }, sessionId);
await sleep(400);
await state('after focus()');
await arrow('ArrowRight', 39);
await state('after ArrowRight');
await arrow('ArrowRight', 39);
await state('after ArrowRight (2)');
await arrow('PageDown', 34);
await state('after PageDown');

/* And the same without the click-free focus: a real click into the walk. */
await send('Runtime.evaluate', { expression: `document.getElementById('hall').scrollLeft = 0` }, sessionId);
await sleep(300);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 400, button: 'left', clickCount: 1, buttons: 1 }, sessionId);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 400, button: 'left', clickCount: 1, buttons: 0 }, sessionId);
await sleep(500);
await state('after a click into the walk');
await arrow('ArrowRight', 39);
await state('after ArrowRight following a click');

await send('Target.closeTarget', { targetId });
process.exit(0);
