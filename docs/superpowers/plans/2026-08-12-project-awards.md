# Project Awards Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-project "Awards" button to project cards that opens the shared modal with a list of awards that project received.

**Architecture:** Three surgical changes across two files. Add an optional `awards` array to project objects in `data.js`, add an Awards button to the `links` array in `renderProjectCard()`, and extend `openModal()` to handle the `awards` tab by rendering a record list (no image). Reuses existing modal, `.record-item` CSS, and the exact pattern established by Overview/Team.

**Tech Stack:** Vanilla JS, no dependencies.

## Global Constraints

- Reuse existing modal infrastructure — no new HTML or CSS
- Match existing code patterns exactly (spread operator for links, `data-action="modal"` / `data-tab` attributes)
- Awards field is optional — projects without awards omit the field
- Each award entry: `{ description: string, year: string }`

---

### Task 1: Add awards data to projects

**Files:**
- Modify: `js/data.js`

**Interfaces:**
- Produces: `PORTFOLIO.projects[*].awards` — optional array of `{ description: string, year: string }` objects

- [ ] **Step 1: Add `awards` array to Project PALAD (project1)**

In `js/data.js`, after the `team` block of the PALAD project (around line 68), insert:

```js
      awards: [
        { description: "Muntinlupa Robotics Fair – Champion", year: "December 2025" },
        { description: "11th Philippine Robothon – Innovative Open Category, Overall Champion", year: "February 2026" }
      ],
```

- [ ] **Step 2: Add `awards` array to CENTHRO (project3)**

In `js/data.js`, after the `team` block of the CENTHRO project (around line 113), insert:

```js
      awards: [
        { description: "5th DLSU-D Research Conference – Best Paper Presentation", year: "May 2025" },
        { description: "2025 International Robothon – Innovative Open Category, 1st Runner Up", year: "November 2025" }
      ],
```

- [ ] **Step 3: Add `awards` array to Focus Buddy (project4)**

In `js/data.js`, after the `team` block of the Focus Buddy project (around line 138), insert:

```js
      awards: [
        { description: "9th Philippine Robothon – Innovative Open Category, 3rd People's Choice Award", year: "February 2023" }
      ],
```

- [ ] **Step 4: Verify the file is valid JavaScript**

Open `index.html` in a browser and check the browser console (F12 → Console). No errors should appear.

- [ ] **Step 5: Commit**

```bash
git add js/data.js
git commit -m "feat: add awards data to project entries"
```

---

### Task 2: Add Awards button to project cards

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `p.awards` (from Task 1)
- Produces: Awards pill button in the DOM, `data-action="modal"` / `data-tab="awards"`

- [ ] **Step 1: Add Awards entry to the links array in `renderProjectCard()`**

In `js/main.js`, inside `renderProjectCard()`, find the `links` array (around line 125). Insert the Awards spread after the Team spread and before the Report spread:

```js
      ...(p.awards && p.awards.length ? [{ label: 'Awards', icon: 'fas fa-trophy', action: 'awards' }] : []),
```

The resulting `links` array should read:

```js
    const links = [
      { label: 'Overview', icon: 'fas fa-eye', action: 'overview' },
      ...(!isSolo ? [{ label: 'Team', icon: 'fas fa-users', action: 'team' }] : []),
      ...(p.awards && p.awards.length ? [{ label: 'Awards', icon: 'fas fa-trophy', action: 'awards' }] : []),
      ...(p.report && p.report.image && p.report.text ? [{ label: 'Report', icon: 'fas fa-file-pdf', action: 'report' }] : []),
      ...p.links.map(l => ({ label: l.label, icon: l.icon, url: l.url }))
    ];
```

- [ ] **Step 2: Verify the button renders**

Open `index.html` in a browser. Projects with awards (PALAD, CENTHRO, Focus Buddy) should show an "Awards" pill button with a trophy icon. Projects without awards (Hivemind, SATLearn, BiyaHey!) should not show the button.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add Awards button to project cards"
```

---

### Task 3: Handle awards tab in modal

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `tab === 'awards'` from button click (Task 2), `proj.awards` from data (Task 1)
- Produces: Modal renders award list using `.record-item` markup

- [ ] **Step 1: Extend `openModal()` to handle the awards tab**

In `js/main.js`, inside `openModal()`, replace the current tab-handling block (lines 254–269) with:

```js
    const isTeam   = (tab === 'team');
    const isReport = (tab === 'report');
    const isAwards = (tab === 'awards');
    const data = isReport ? proj.report : (isTeam ? proj.team : (isAwards ? proj.awards : proj.overview));
    const title = isReport ? `${proj.title} — Technical Report`
      : (isTeam ? `${proj.title} — Team`
      : (isAwards ? `${proj.title} — Awards`
      : `${proj.title} — Overview`));

    $modalHeader.innerHTML = `
      <h3>${title}</h3>
      <p class="modal-subtitle">${proj.venue}</p>`;

    if (isAwards) {
      $modalImage.innerHTML = '';
      $modalBody.innerHTML = '<div class="record-list">'
        + data.map((a, i) =>
            `<div class="record-item reveal" style="--reveal-delay: ${i * 40}ms">
              <span class="record-desc">${a.description}</span>
              <span class="record-year">${a.year}</span>
            </div>`
          ).join('')
        + '</div>';
    } else {
      $modalImage.innerHTML = `<img src="${data.image}" alt="${title}">`;
      if (isTeam && Array.isArray(data.text)) {
        $modalBody.innerHTML = data.text.map(t => `<p>${t}</p>`).join('');
      } else {
        $modalBody.innerHTML = `<p>${data.text}</p>`;
      }
    }
```

- [ ] **Step 2: Verify the modal works end-to-end**

Open `index.html` in a browser:
1. Click a project's "Awards" button → modal opens with title "{Project} — Awards", no image, and a styled list of awards with descriptions and years.
2. Click "Overview" and "Team" buttons → verify they still work as before.
3. Test keyboard Escape and overlay click → modal closes correctly.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: render awards in modal on project cards"
```
