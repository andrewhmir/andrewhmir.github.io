/* The walk's controls must actually do something when they are clicked.
   This is the check that would have caught the worst defect of this build: the
   renderer emitted `[data-action="modal"]`, `[data-gallery]` and
   `[data-action="copy"]` into #strip, but every delegated handler was still
   bound to a host element Task 3 had deleted (#projectList, #honorsList,
   #leadershipList, #newsTimeline, #heroLinks). Every click did nothing, and no
   check noticed, because the stub's closest() returned null and its
   addEventListener was a no-op. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, run } from './harness.mjs';
import { loadSite } from './dom-harness.mjs';

const scene = await loadSite({
  rooms: [
    { key: 'About', left: 0, width: 1440, works: [] },
    { key: 'Robotics', left: 1440, width: 1440, works: [
      { left: 100, width: 600, height: 340, project: 'project3' },
    ] },
    { key: 'Applications', left: 2880, width: 1440, works: [
      { left: 100, width: 600, height: 340, project: 'project6' },
    ] },
    { key: 'Honours', left: 4320, width: 1440, works: [
      { left: 100, width: 600, height: 340, gallery: 'honors', entry: 0 },
      { left: 800, width: 600, height: 340, gallery: 'honors', entry: 3 },
    ] },
  ],
});

const { workEls, plateEls, copyEls } = scene;
const modal = scene.el('modalOverlay');
const card = scene.el('modalCard');
const header = scene.el('modalHeader');

check('a project work opens the dialog when clicked', () => {
  const button = workEls.find((w) => w.canvas.getAttribute('data-project')).canvas;
  scene.click(button);
  assert.ok(modal.classList.contains('active'),
    'clicking the project work left the dialog closed — no listener handled it');
  assert.match(header.innerHTML, /<h3 id="modalTitle">/,
    'the dialog opened without a title');
  scene.click(scene.el('modalClose'));
});

check('a gallery row opens its own entry when clicked', () => {
  const row = workEls.find((w) => w.canvas.getAttribute('data-gallery')).canvas;
  scene.click(row);
  assert.ok(modal.classList.contains('active'),
    'clicking the gallery row left the dialog closed — no listener handled it');
  const entry = globalThis.PORTFOLIO.honors[Number(row.getAttribute('data-entry'))];
  assert.ok(header.innerHTML.includes(entry.description),
    'the dialog opened a different entry: expected "' + entry.description + '"');
  scene.click(scene.el('modalClose'));
});

check('a plate gallery row opens its own entry when clicked', () => {
  scene.click(plateEls[0]);
  assert.ok(modal.classList.contains('active'),
    'clicking the leadership plate left the dialog closed');
  assert.ok(header.innerHTML.includes(globalThis.PORTFOLIO.leadership[0].description),
    'the dialog opened the wrong leadership entry');
  scene.click(scene.el('modalClose'));
});

check('an email button copies the address when clicked', () => {
  /* Nothing observable is asserted about the clipboard itself (Node has no
   * navigator.clipboard); what matters is that a handler ran at all — a toast is
   * appended to the body by copyToClipboard. */
  const before = scene.document.body.children.length;
  scene.click(copyEls[0]);
  assert.ok(scene.document.body.children.length > before,
    'clicking the email button did nothing — no listener handled it');
});

check('the dialog is closed again after each of those', () => {
  assert.ok(!modal.classList.contains('active'), 'a dialog was left open');
  assert.equal(card.getAttribute('role'), 'dialog', 'the card is not a dialog');
});

check('the live region names the room the walk is in', () => {
  /* The announcer exists in index.html with role="status" aria-live="polite";
     spec §9 requires it to announce the current room. An aria-live region nobody
     writes to is dead markup, and nothing else in the build notices. */
  assert.ok(scene.announcer, 'no announcer element');
  assert.equal(scene.announcer.getAttribute('role') || 'status', 'status');
  const hall = scene.hall;
  hall.scrollLeft = 2880 + 300;         /* inside the Applications room */
  globalThis.Site.announceRoom();
  assert.equal(scene.announcer.textContent,
    scene.announcer.textContent.trim(), 'the announcement has stray whitespace');
  assert.ok(scene.announcer.textContent.length > 0,
    'the live region was never written to — screen readers get no room change');
  assert.ok(/Applications/.test(scene.announcer.textContent), 
    'announced "' + scene.announcer.textContent + '" while in Applications');

  hall.scrollLeft = 0;                  /* back to the opening room */
  globalThis.Site.announceRoom();
  assert.ok(/About/.test(scene.announcer.textContent),
    'announced "' + scene.announcer.textContent + '" while in About');
});

check('the walk is reachable from the keyboard', () => {
  /* Spec §9 assumes the strip is natively scrollable so keyboard scrolling
     "works without custom handling". That premise only holds if the scroll
     container can take focus: a scrollable region that is not focusable is
     skipped by the tab order, and with no pointer the works inside it can never
     be reached. */
  const html = readFileSync('index.html', 'utf8');
  const hall = html.match(/<main[^>]*id="hall"[^>]*>/);
  assert.ok(hall, 'no #hall element in index.html');
  assert.match(hall[0], /tabindex="0"/,
    'the scroll container is not focusable, so the keyboard cannot reach the walk');
});

check('tabbing to a work brings it into the walk', () => {
  /* Every room takes programmatic focus. When a work inside a room is focused,
     the browser scrolls its scrollable ancestor — #hall — so the focused element
     enters view; that is what makes the walk follow the keyboard. In this stub
     there is no layout engine, so what is asserted is the precondition: each room
     is focusable and the works live inside one of them, under #hall. */
  /* Five literal room tags are emitted plus the derived work rooms, whose key is
     interpolated at run time — so count the tags and the derivation. */
  const renderer = readFileSync('js/main.js', 'utf8');
  const rooms = [...renderer.matchAll(/<section class="room" data-room=[^>]*>/g)].map((m) => m[0]);
  assert.ok(rooms.length >= 5, 'fewer than five literal rooms are emitted: ' + rooms.length);
  assert.match(renderer, /<section class="room" data-room="' \+ esc\(room\.key\)/,
    'the derived work rooms are not emitted with a focusable section');
  const notFocusable = rooms.filter((r) => !/tabindex="-1"/.test(r));
  assert.deepEqual(notFocusable, [],
    'rooms that cannot take focus, so focusing a work cannot scroll the room into view');

  /* And the structural precondition: work -> room -> strip -> hall. */
  const work = scene.workEls[0];
  let sawRoom = false;
  for (let n = work; n; n = n.parentNode) {
    if (n.getAttribute && n.getAttribute('data-room')) sawRoom = true;
    if (n === scene.hall) break;
  }
  assert.ok(sawRoom, 'the work is not inside a room that is inside the hall');
});

run();
