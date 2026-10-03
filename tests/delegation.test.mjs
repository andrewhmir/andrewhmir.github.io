/* The walk's controls must actually do something when they are clicked.
   This is the check that would have caught the worst defect of this build: the
   renderer emitted `[data-action="modal"]`, `[data-gallery]` and
   `[data-action="copy"]` into #strip, but every delegated handler was still
   bound to a host element Task 3 had deleted (#projectList, #honorsList,
   #leadershipList, #newsTimeline, #heroLinks). Every click did nothing, and no
   check noticed, because the stub's closest() returned null and its
   addEventListener was a no-op. */
import assert from 'node:assert/strict';
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

run();
