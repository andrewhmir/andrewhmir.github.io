# Agent Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `docs/library/` — 18 fixed-template component reference pages plus a selector index and a `PORTFOLIO` contract — enforced by `tools/library-check.mjs` as the seventh `npm test` suite, so an agent finds every file that makes up a component without grepping the source.

**Architecture:** The library is hand-written Markdown in a fixed page contract; `tools/library-check.mjs` parses it, resolves every cited anchor against the real source files, and enforces coverage rules (every CSS class, shell id, `data-*`, `PORTFOLIO` key and record field must be documented somewhere). It exports its checks, `tests/library.test.mjs` registers them with the existing in-process harness, and `npm test` gains one `&&` step. Four writers fill disjoint page sets; the Lead owns the shared files and is the only committer; two read-only reviewers audit accuracy and the checker's teeth.

**Tech Stack:** Markdown; Node 22 built-ins only (`node:fs`, `node:vm`); existing `tests/harness.mjs` (no `node --test`, no framework, no dependency); PowerShell 5.1 commands on this machine.

**Spec:** `docs/superpowers/specs/2026-10-26-agent-component-library-design.md` — read it in full before starting. The plan argues from the spec; where they differ, the spec wins and the plan is wrong.

## Global Constraints

- **Runtime files are untouchable:** `index.html`, `css/styles.css`, `js/main.js`, `js/data.js` must be byte-identical at the end (`git diff main...HEAD --` them must be empty).
- No build step, no bundler, no new dependency, no `node --test`; Node built-ins only.
- `package.json` test script ends with `&& node tests/library.test.mjs` **after** the six existing suites.
- Exactly 14 pages under `docs/library/components/`, 4 under `docs/library/primitives/`, plus `README.md`, `selectors.md`, `data.md`. README links each page (at least once; cross-links are allowed).
- Every page: UTF-8, 40–90 lines, starts with `# Title`, then a one-line purpose, then the required H2s `Where it lives`, `Adjust it`, `Invariants`, `Traps` (optional `Structure`); no line-number citations anywhere.
- Every `Where it lives` anchor is a literal string present in its named file (or, for `Data` rows, a valid path into a vm-loaded `PORTFOLIO`). Anchors are grep strings, never line numbers. Keep `──`, `·`, `’` exact; copy them from the source file, never retype from memory.
- Branch: `docs/agent-navigation-map` (already reset onto `main`). **Single committer: the Lead.** Writer teammates never run `git`; they edit only their own lane's files and report.
- Unless a step says otherwise, commands run from the repo root. PowerShell 5.1 only — `pwsh` does not exist; check `$LASTEXITCODE` for native commands.
- Mid-plan, `node tools/library-check.mjs` and `npm test` are **expected red** until Task 6, because pages are missing. Use `--page <path>` for per-page green during lane work.

## Review Focus

Failure modes this docs-plus-checker system implies but no single assertion in the plan fully covers; each is pinned to the task that owns it.

1. **A claim stays anchored but becomes false** — e.g. the dialog page says Escape closes the record after `closeDialog` stops binding `keydown`. Anchors only prove a string exists. Reviewer 1 re-reads the implementation behind every non-trivial `Where it lives` row and every `Adjust it` recipe (Task 6).
2. **A count or order drifts in prose** — "six project stops", "eleven crops", the `PAN` order, "four leadership cards". `page.test.mjs` catches data-count changes, but the library's prose must be re-checked by a human/agent reading `PORTFOLIO`; Reviewer 1 checks every number written in a page (Task 6).
3. **An anchor resolves only inside a comment** — CSS and JS comments name retired things (`.wall`, walk vocabulary). A token that occurs in a comment but not in live code passes V3 yet misleads. Writers confirm each anchor sits on live code; Reviewer 1 spot-checks the retired-noun hits (Tasks 2–5, re-checked in Task 6).
4. **A root selector is missing from `selectors.md`** — V5 only requires a class to appear *somewhere* in the library. A component root absent from the flat index makes the lookup slower for an agent. Lane C cross-checks `selectors.md` against the root classes of every component page (Task 4).
5. **Encoding drift on box-drawing anchors** — retyping `──` or `·` produces a different code point that V3 rejects (or worse, silently matches the wrong glyph). All files UTF-8; anchors copied from source via search; validator compares exact strings and prints the file:line of the mismatch (Task 1, then every writer).

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `tools/library-check.mjs` | The validator: V1–V10 checks, `checks()` export, `--page` CLI. Reads sources + `docs/library/`, writes nothing. |
| `tests/library.test.mjs` | Registers the validator's checks with `tests/harness.mjs`; the seventh suite. |
| `docs/library/README.md` | Entry point: purpose, "start here" lookup, index tables, page contract, validator commands, relationship to `AGENTS.md`. |
| `docs/library/components/*.md` (14) | One page per component, fixed contract. |
| `docs/library/primitives/*.md` (4) | Foundations: tokens, type, controls, responsive. |
| `docs/library/selectors.md` | Flat selector/id/`data-*` → component-page lookup. |
| `docs/library/data.md` | `PORTFOLIO` contract: top-level keys, record fields (live/dormant/required), path rules, `Site.*` used/dormant inventory. |

**Modified**

| Path | Change |
|---|---|
| `package.json` | Append the library suite to `scripts.test`. |
| `AGENTS.md` | One pointer sentence to `docs/library/README.md` near the routing table, plus a Docs map row. |
| `tools/README.md` | One row for `library-check.mjs` in "What survives". |

**Ownership (disjoint write sets; Lead commits all)**

- Lead: `tools/library-check.mjs`, `tests/library.test.mjs`, `docs/library/README.md`, `docs/library/components/dialog.md`, `package.json`, `AGENTS.md`, `tools/README.md`.
- Lane A (Task 2): `page-shell.md`, `masthead.md`, `rail.md`, `footer.md`, `reveals-chrome.md`.
- Lane B (Task 3): `panel.md`, `hero.md`, `about.md`, `project.md`, `frames.md`.
- Lane C (Task 4): `leadership.md`, `honours.md`, `contact.md`, `selectors.md`, `data.md`.
- Lane D (Task 5): `primitives/tokens.md`, `primitives/type.md`, `primitives/controls.md`, `primitives/responsive.md`.

---

### Task 1: Contract foundation — validator, harness suite, index, dialog exemplar

**Files:**
- Create: `tools/library-check.mjs`
- Create: `tests/library.test.mjs`
- Create: `docs/library/README.md`
- Create: `docs/library/components/dialog.md`
- Modify: `package.json` (test script), `AGENTS.md` (pointer + Docs map row), `tools/README.md` (tool table row)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `tools/library-check.mjs` — `export function checks(opts = {}) -> Array<{ id: string, name: string, fn: () => void }>`; `opts.page` (repo-relative path) restricts to V2–V4 + V9 for that page. CLI: `node tools/library-check.mjs [--page <path>]`, prints `ok V3 anchors (dialog.md)` / `FAIL V3: <file>: <detail>` per check, exits 0 only if all pass.
  - `docs/library/README.md` — the index format every later task appends to; required structure: title, purpose paragraph, "Start here" table of five queries → page, components table (14 rows: Component | Covers | Page link), foundations table (4 rows), "The page contract" (template + anchor grammar summary + `--page` command), "Relationship to AGENTS.md" (AGENTS.md routes intents; this library goes deeper; pages cite its constraints, never copy them), "Keeping it honest" (what V1–V10 enforce).
  - `docs/library/components/dialog.md` — the template exemplar every writer follows.

- [ ] **Step 1: Write the failing suite**

Create `tests/library.test.mjs`:

```js
/* The agent component library's guard. Runs the validator in-process. */
import { checks } from '../tools/library-check.mjs';
import { check, run } from './harness.mjs';

for (const c of checks()) check(c.id + ' ' + c.name, c.fn);
run();
```

Run: `node tests/library.test.mjs`
Expected: FAIL — `Cannot find module .../tools/library-check.mjs`.

- [ ] **Step 2: Implement `tools/library-check.mjs`**

Implement exactly the rules in the spec's **Validator design** section, with these fixed interface decisions:

- Read files once at module load: `index.html`, `css/styles.css`, `js/main.js`, `js/data.js`, `package.json`, `AGENTS.md`, `tools/README.md`, plus every file under `docs/library/`.
- Constants: `PAGE_DIRS = ['docs/library/components', 'docs/library/primitives']`, `COMPONENT_PAGES = [14 slugs from the spec inventory]`, `PRIMITIVE_PAGES = ['tokens','type','controls','responsive']`, `ROLES = ['Markup','Render','Styles','Data','Test','Assets']`, `REQUIRED_H2 = ['Where it lives','Adjust it','Invariants','Traps']`.
- Check ids and names: `V1 index consistency`, `V2 page format`, `V3 anchors`, `V4 data paths`, `V5 class coverage`, `V6 id/attribute/emitted-class coverage`, `V7 data coverage`, `V8 integration`, `V9 no line numbers`, `V10 cited files exist`.
- **V2/V3 table parsing:** within the `## Where it lives` section, take lines starting `|`; drop the header row and the `|---|` separator; split cells on `|`; a role in `ROLES` is required else fail. File cell has backticks or plain text; extract the path. Anchor cell: every backticked token, split on `·`, trimmed. `Data` rows are validated by V4, all other roles by literal substring in the named file (read fresh per file, cache contents).
- **V5:** strip CSS comments first (`/\/\*[\s\S]*?\*\//g`) so retired class names in prose do not count; collect base classes with `/\.([a-z][a-z0-9-]{2,})/g`; every collected class must appear as `.class` in at least one file under `docs/library/`.
- **V6:** strip comments from `index.html`; collect `id="..."`; collect `data-[a-z][a-z0-9-]*` from all four runtime sources plus `dataset\.([a-z]+)` (→ `data-<name>`); collect emitted classes from `class="..."` literals in `index.html` and `js/main.js`, from `className = '...'` and `cls: '...'` values, and from `classList.add|toggle('...')`; split on whitespace and **drop tokens shorter than 3 chars or ending in `-`** — those are concatenation prefixes (`stop art--`, `class="copy`), and their concrete values are declared in CSS and covered by V5. Every remaining collected id/attribute/class must be named (`#id`, `data-x`, `.class`) in some library file.
- **V7:** evaluate `js/data.js` in a `vm` context with `globalThis` set (copy the pattern in `tests/page.test.mjs`); collect top-level keys, per-record key unions for `projects`/`leadership`/`honors`, and `Site` keys; derive the used-helper set from `js/main.js` with `/\bS\.([A-Za-z0-9_]+)/g`; require `data.md` to contain every top-level key, every union field as a path, and every `Site.*` name, and to classify each helper one way in a `| Helper | Used by page | Notes |` table (`yes`/`no`); the set classified `yes` must equal the derived used set.
- **V9:** fail on `/[\w./-]+\.(?:js|css|html|mjs):\d+/` in any library file.
- **V10:** every `tests/*.test.mjs` and `tools/*.mjs` path cited in `docs/library/` must exist.
- **V1:** parse `README.md` links `](path.md)`; each of the 18 pages is linked at least once (cross-links from the "start here" table are allowed); each link resolves; no `.md` file in the two page dirs is unlinked.
- **V8:** `package.json` `scripts.test` includes `tests/library.test.mjs`; `AGENTS.md` includes `docs/library/README.md`; `tools/README.md` includes `library-check.mjs`.
- CLI marginals: `--page` runs only V2–V4 and V9 against that page (skip V1, V5–V8, V10); default runs all checks; print one line per check; exit 1 if any failed; each failure names the check id, file and the concrete mismatch (for V3: `file does not contain "anchor"`).

- [ ] **Step 3: Create `docs/library/README.md`**

Use the structure in the Interfaces block. Its components table lists all 14 slugs from the spec inventory with one-line "covers" cells copied from the spec's Owns column (condensed), and the foundations table lists the four primitives. Every link is a relative path from `docs/library/README.md`, e.g. `[dialog](components/dialog.md)`.

Run: `node -e "const fs=require('fs');const t=fs.readFileSync('docs/library/README.md','utf8');console.log((t.match(/\]\(components\/[a-z-]+\.md\)/g)||[]).length,(t.match(/\]\(primitives\/[a-z-]+\.md\)/g)||[]).length)"`
Expected: `14 4`.

- [ ] **Step 4: Write the dialog exemplar**

`docs/library/components/dialog.md` — 40–90 lines, exact contract. Required `Where it lives` rows (one anchor per row; verify each with `Select-String`):

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="dialog"` · `role="dialog"` · `aria-labelledby="dialogTitle"` |
| Markup | `index.html` | `id="dialogClose"` |
| Render | `js/main.js` | `function openRecord(` |
| Render | `js/main.js` | `function closeDialog(` |
| Render | `js/main.js` | `function gallery(` |
| Render | `js/main.js` | `var dialogBody = document.getElementById('dialogBody');` |
| Render | `js/main.js` | `dialogCard.focus();` |
| Styles | `css/styles.css` | `── Dialog` |
| Styles | `css/styles.css` | `.dialog__card` |
| Data | `js/data.js` | `projects[].video` |
| Data | `js/data.js` | `leadership[].images` |
| Data | `js/data.js` | `honors[].images` |
| Test | `tests/page.test.mjs` | `role="dialog"` |

`Adjust it` rows must cover: card width/height (`--panel-radius`, `.dialog__card` max height); the video player attributes (`dialog__video`, `muted loop playsinline controls`); focus trap (`keydown` handler); gallery grid (`.dialog__gallery`); what opens the dialog (`wireDelegation` section of the page links to `reveals-chrome.md`). `Invariants`: one shared dialog serves all three record kinds; `aria-modal` + `aria-labelledby`; Escape/overlay/close-button close; Tab is trapped; focus is saved and restored; body scroll is locked while open; video is muted/looping/inline and only plays in the dialog. `Traps`: the three `images` arrays are filtered for `PlaceHolder.png`; `dialogBody.innerHTML` is replaced per open; honours without photographs render disabled and never open; renaming an id breaks the cached `getElementById` lookups at module load.

Run: `node tools/library-check.mjs --page docs/library/components/dialog.md`
Expected: `ok V2`, `ok V3`, `ok V4`, `ok V9`, exit 0.

- [ ] **Step 5: Wire the suite and the pointers**

- `package.json`: append `&& node tests/library.test.mjs` to `scripts.test` (after `award-photos.test.mjs`).
- `AGENTS.md`: in the paragraph under **Where to change what**, add: "For a component's full edit surface — markup, renderer, styles, data, tests and traps — see [`docs/library/README.md`](docs/library/README.md); this table is the intent router, that library is the per-component depth." Add a Docs map row: `| docs/library/README.md | The component library: one page per component plus the selector index and data contract |`.
- `tools/README.md`: add a row in **What survives**: `| library-check.mjs | Validates docs/library against the source: anchors, coverage, data contract, index. \`--page <path>\` checks one page. Run by npm test. | Node |`.

- [ ] **Step 6: Run the full validator and record the expected red**

Run: `node tools/library-check.mjs`
Expected: FAIL with, at minimum, `V1 index consistency` (17 pages missing), `V5 class coverage`, `V6 ... coverage`, `V7 data coverage`; the message lists missing page files. This is the TDD red state: content lands in Tasks 2–5. Do **not** make the checks lenient to go green.

- [ ] **Step 7: Commit**

```bash
git add tools/library-check.mjs tests/library.test.mjs docs/library/README.md docs/library/components/dialog.md package.json AGENTS.md tools/README.md docs/superpowers/plans/2026-10-26-agent-component-library.md
git commit -m "feat(library): add the component-library checker, index and dialog exemplar"
```

---

### Task 2: Lane A — shell pages (runs in parallel with Tasks 3–5)

**Files:**
- Create: `docs/library/components/page-shell.md`, `masthead.md`, `rail.md`, `footer.md`, `reveals-chrome.md`

**Interfaces:**
- Consumes: Task 1's page contract, `docs/library/components/dialog.md` as the format exemplar, the spec inventory rows for these five pages, and the live sources.
- Produces: five pages whose `Where it lives` anchors pass V3 and whose owned classes pass V5. Lead commits: `docs(library): add the shell component pages`.

- [ ] **Step 1: Read the sources, not the old docs**

Read `index.html`, `js/main.js` (functions `esc`, `panel`, `buildRail`, `wireReveals`, `wireChrome`, `wireDelegation`, `init`), and `css/styles.css` sections `── Masthead`, `── The left shade`, `── Journey rail`, `── Footer`, `── Reveal`, plus the `@media` blocks at the end. AGENTS.md's vocabulary and gotchas are current; anything from the retired horizontal walk is not.

- [ ] **Step 2: Write `page-shell.md`**

Owns `#page`, `.page`, `.skip`, `<noscript>`, `.noscript` (emitted, no rule), `.sr-only`, script load order. Anchors: `<main id="page" class="page"></main>`, `<script src="js/data.js"></script>`, `<noscript>`, `class="skip"`, `function init(`, `── The page and its painted panels`. Traps: `#page` must stay empty in the shell (renderer owns its content); `js/data.js` must stay before `js/main.js`; the no-JS fallback is the only content when scripts are off and must not be deleted; `.noscript` has no stylesheet rule.

- [ ] **Step 3: Write `masthead.md`**

Owns `#masthead`, `.masthead`, `.masthead.is-stuck`, `.brand`, `.menu`, `.resume`, `#resumeLink`, `#progress`, `.progress`, `--masthead-h:`. Anchors as in the spec inventory. Traps: `is-stuck` flips at `Math.max(120, heroH - 72)` in `wireChrome`; the progress width is `(scrollY / (scrollHeight - innerHeight))` clamped; the resume `href` is filled from the `social` entry labelled `Resume`, not hard-coded; the menu links are anchor jumps to section ids.

- [ ] **Step 4: Write `rail.md`**

Owns `.rail`, `.rail::before`, `.rail__stop`, `.rail__stop.is-active`, `.rail-shade`, `data-stop`. Anchors: `id="rail"`, `function buildRail(`, `── Journey rail`, `.rail__stop`, `── The left shade`. Traps: the rail is rendered entirely by JS (empty `<nav>` in the shell); the observer uses `rootMargin: '-45% 0px -45% 0px'` and toggles `is-active` on `data-stop`; the rail is hidden below 1024px; the shade exists so labels stay legible over bright crops — deleting it is a contrast regression.

- [ ] **Step 5: Write `footer.md`**

Owns `.foot`, `.foot__name`, `.foot__credit`, `.foot__year`. Anchors: `class="foot"`, `── Footer`, `.foot__credit`. Traps: the Amorsolo credit is attribution, not decoration; the footer sits outside `#page` (never re-rendered); the year is static text.

- [ ] **Step 6: Write `reveals-chrome.md`**

Owns `[data-reveal]`, `[data-reveal].is-in`, `.masthead.is-stuck`, `data-stop`, `data-kind`, `data-index`. Anchors: `function wireReveals(`, `function wireDelegation(`, `function wireChrome(`, `prefers-reduced-motion`, `── Reveal`. Traps: with `prefers-reduced-motion` or no `IntersectionObserver` every `[data-reveal]` is marked `is-in` immediately; delegation is bound once on `#page` so re-rendered buttons still open records; `data-kind` is the record kind and `data-index` is the array index, not an id.

- [ ] **Step 7: Per-page validation**

For each file in this lane run:
`node tools/library-check.mjs --page docs/library/components/<file>.md`
Expected: every line `ok`, exit 0. Fix any V3 mismatch by copying the exact source substring (watch `──`, `·`, curly quotes).

- [ ] **Step 8: Report and hand off**

Message the Lead: the five file paths, the exact `--page` output per file, and anything discovered that contradicts the spec inventory. Do not run `git`. The Lead commits the lane.

---

### Task 3: Lane B — rendered stops (runs in parallel with Tasks 2, 4, 5)

**Files:**
- Create: `docs/library/components/panel.md`, `hero.md`, `about.md`, `project.md`, `frames.md`

**Interfaces:**
- Consumes: same as Task 2.
- Produces: five pages passing V3 for their anchors; Lead commits `docs(library): add the rendered-stop pages`.

- [ ] **Step 1: Read the sources**

Read `js/main.js` in full (`PAN`, `panel`, `frame`, `isAwaited`, `projectMedia`, `projectCopy`, `render`), `css/styles.css` sections `── The page and its painted panels`, `── Type`, `── Frames and the media stack`, `── Project panel extras`, and the `.stop--hero` rules.

- [ ] **Step 2: Write `panel.md`**

Owns `.stop`, `.stop::before`, `.stop::after`, `.stop[data-side="left"]`, `"right"`, `"center"`, `.stop-in`, `.copy`, `.media`, `.copy--center`, `.art--rice`, `.art--harvest`, `--pos`, plus the `PAN` order. Anchors: `function panel(`, `var PAN = [`, `── The page and its painted panels`, `background-position: var(--pos`, `.stop[data-side="left"]`. Include the eleven-crop table (`PAN` index → stop) exactly as in `js/main.js`, and the art/scrim stacking invariant (`isolation: isolate`, art `z-index: -2`, scrim `-1`). Traps: adding a seventh project collides with `PAN[8]` (Leadership) and `page.test.mjs`'s six-project assertion; reordering projects shifts every later crop; `data-side` drives the scrim direction and the copy column.

- [ ] **Step 3: Write `hero.md`**

Owns `#top`, `.stop--hero`, `.hero-title`, `.hero-line`, `.hero-cue`, `.actions`, the only `<h1>`. Anchors: `/* 0 — hero */`, `.stop--hero`, `.hero-cue`, `P.bio[3]`, `<h1>`. Traps: the sentence is `P.bio[3]` (fallback `bio[2]`); there must be exactly one `h1` on the page; the two actions are "See the work →" (anchor to `#work`) and Resume (from `social[0].url`, so reordering `social` changes it).

- [ ] **Step 4: Write `about.md`**

Owns `#about`, `.portrait`, `.portrait figcaption`. Anchors: `/* 1 — about */`, `P.bio.map`, `.portrait`, `bio: [`, `social: [`. Traps: the portrait is hard-coded `files/profile.jpg` in `js/main.js` — `PORTFOLIO.profileImage` is ignored; every `bio` entry renders as its own paragraph; the social row maps `P.social` to buttons.

- [ ] **Step 5: Write `project.md`**

Owns `.work`, `#work`, `.stop--project`, `.eyebrow`, `.awards`, `.awards li`, the six stop ids (`project1`…`project6` — they are record ids, so say "one per record id"). Anchors: `/* 2 — work`, `function projectCopy(`, `── Project panel extras`, `projects: [`, `work.className = 'work';`, `#work`. Traps: page order is `PORTFOLIO.projects` order and the id becomes the anchor the rail targets; the awards `<ul>` only renders when `p.awards` is non-empty; frame labels "Overview"/"Film"/"Team" and the "Open the record →" copy are literals in `projectMedia`/`projectCopy`, not data; a seventh project requires the `PAN` table and `page.test.mjs` counts updated together.

- [ ] **Step 6: Write `frames.md`**

Owns `.media`, `.stack`, `.frame`, `.frame--lead`, `.frame img`, `.frame__label`, `.frame__play`, `.frame--awaited`, `.frame__inner`, `--frame-radius:`. Anchors: `function frame(`, `function isAwaited(`, `function projectMedia(`, `── Frames and the media stack`, `.frame--awaited`. Traps: exactly three frames per project in the order overview → poster → team; the lead frame is `16/9` and spans the grid; the film still is `S.posterFor(p.video)` from `files/posters/`, generated by `tools/make-images.mjs` — never hand-edit; `PlaceHolder.png` (or an empty src) renders the dashed non-button awaited frame; a missing file renders an `<img>` that swaps to the placeholder via `onerror`.

- [ ] **Step 7: Per-page validation and report** — same commands and handoff as Task 2 Step 7–8.

---

### Task 4: Lane C — content stops and indices (runs in parallel with Tasks 2, 3, 5)

**Files:**
- Create: `docs/library/components/leadership.md`, `honours.md`, `contact.md`
- Create: `docs/library/selectors.md`, `docs/library/data.md`

**Interfaces:**
- Consumes: Task 1 contract, live sources, `data.js` evaluated shape.
- Produces: three pages passing V3, a `selectors.md` resolving under V5, and a `data.md` satisfying V7's coverage and classification rules. Lead commits `docs(library): add the content stops, selector index and data contract`.

- [ ] **Step 1: Write the three content-stop pages**

- `leadership.md` — owns `#leadership`, `.leaders`, `.leader`, `.leader__thumb`, `.leader__thumb--empty`, `.leader__body`, `.leader__year`, `.leader__text`; anchors `/* 3 — leadership */`, `P.leadership.map`, `── Leadership cards`; traps: a record with no `images` renders the `leader__thumb--empty` span instead of an `<img>`; every card is a button opening the dialog gallery; four records today (a count).
- `honours.md` — owns `#honours`, `.stop--list` (emitted, no rule), `.honours`, `.honour-row`, `.honour-row__year`, `.honour-row__text`, `.honour-row__mark`; anchors `/* 4 — honours`, `S.honoursTiles(P.honors)`, `── Honours list`, `honors: [`; traps: tiles are the standalone honours — project awards are excluded through `from: 'projectN'`; a tile with no `images` is `disabled` and shows no mark; five tiles today.
- `contact.md` — owns `#contact`, `.stop--contact`, `.stop--contact .stop-in`, `.stop--contact .stop-in::before`, `.contact-mail`, `.contact-links`; anchors `/* 5 — contact`, `── Contact`, `.stop--contact .stop-in::before`, `@media (max-width: 1023px)`; traps: the dark card is a `::before` at `z-index: -1` inside `.stop-in` and depends on `.stop`'s `isolation: isolate`; the email is `P.email`, the links are `P.social`; a 1023px rule shrinks the card.

- [ ] **Step 2: Write `selectors.md`**

Table `Selector | Page | What it is`. List: every component root (`.stop`, `.masthead`, `.rail`, `.page`, `.foot`, `.dialog`, `.stack`, `.leaders`, `.honours`, …), every state/modifier (`.is-stuck`, `.is-active`, `.is-in`, `.frame--lead`, `.frame--awaited`, `.btn--solid`, `.copy--center`, `.stop--hero`, `.stop--project`, `.stop--contact`, `.stop--list`, `.leader__thumb--empty`), every shell id (`#page`, `#masthead`, `#rail`, `#resumeLink`, `#progress`, `#dialog` and its children, `#top`, `#about`, `#work`, `#leadership`, `#honours`, `#contact`), and every `data-*` (`data-side`, `data-reveal`, `data-kind`, `data-index`, `data-stop`). Each row links the owning page (`components/x.md` or `primitives/x.md`). Cross-check the roots against every page's Owns list — Review Focus 4.

- [ ] **Step 3: Write `data.md`**

Follow the spec's **`data.md`** bullet exactly: top-level keys with live/dormant status; per-collection tables with required/optional/dormant markers for the unions (`projects` 15 keys, `leadership` 5, `honors` 6) and nested paths (`overview.image`, `overview.text`, `team.image`, `team.text`, `awards[].description`, `awards[].year`, `links[].label`, `links[].url`, `social[].label`, `social[].url!` …); path rules (`PlaceHolder.png` awaited, missing-file `onerror`, `posters/<stem>.jpg` via `Site.posterFor`); and the `| Helper | Used by page | Notes |` table listing all 20 `Site.*` names with `yes` only for `posterFor` and `honoursTiles`. Use the exact path grammar from the spec (`.field!` for every-record, `[]` for collections, dotted nested paths).

- [ ] **Step 4: Validate the lane**

`--page` each of the three component pages (expect all `ok`). Then run `node tools/library-check.mjs` and read the V1/V5/V6/V7 failures: **none may name a file in this lane**. Failures naming other lanes' pages are expected until those land. Fix any V5/V6/V7 failure caused by `selectors.md`/`data.md` (e.g. a class still undocumented, a union field missing).

- [ ] **Step 5: Report and hand off** — message the Lead with paths and the filtered failure list (empty for lane-owned items). Do not run `git`.

---

### Task 5: Lane D — foundations (runs in parallel with Tasks 2–4)

**Files:**
- Create: `docs/library/primitives/tokens.md`, `type.md`, `controls.md`, `responsive.md`

**Interfaces:**
- Consumes: Task 1 contract, `css/styles.css`, `css/fonts.css`, `tools/vendor-fonts.mjs`, `README.md`'s design reasoning.
- Produces: four pages passing V3; Lead commits `docs(library): add the foundation pages`.

- [ ] **Step 1: Write `tokens.md`**

Owns `:root`, `--night:`, `--text:`, `--text-strong:`, `--text-quiet:`, `--accent:`, `--border:`, `--serif:`, `--mono:`, `--sans:`, `--gutter:`, `--panel-radius:`, `--frame-radius:`, `--masthead-h:`, `--max:`. Quote the exact values. Traps: the palette values are pinned by `page.test.mjs`; `--panel-radius` drops to 12px below 640; the two radii are 16/10 and `.btn` hard-codes 8px rather than using a token; `css/fonts.css` is generated by `tools/vendor-fonts.mjs` — never hand-edit.

- [ ] **Step 2: Write `type.md`**

Owns `h1`, `h2`, `.hero-title`, `.hero-line`, `.lede`, `.body`, `.eyebrow`, `.actions`. Anchors: `h1 {`, `h2 {`, `--serif:`, `.eyebrow`, the `@media (max-width: 639px)` block for the responsive sizes, `css/fonts.css` link. Traps: Newsreader is vendored at 400/500/600, so `font-weight: 300` on display text resolves to 400 — a real 300 needs a new face, not a number change; `.eyebrow` is the mono label; `.body` is capped at 44ch.

- [ ] **Step 3: Write `controls.md`**

Owns `.btn`, `.btn--solid`, `.btn:hover`, `.btn:active`, `.skip`, `.skip:focus`, `:focus-visible`, `::selection`, `.resume`, `.menu a`. Anchors: `.btn {`, `.btn--solid`, `.skip`, `:focus-visible`, `aria-label="Close record"`. Traps: radius is 8px hard-coded; the solid button flips to dark text on gold; the close button is a control owned by `dialog.md` — link to it rather than duplicating its contract; focus is always visible (`:focus-visible` outline) — do not remove.

- [ ] **Step 4: Write `responsive.md`**

Document every `@media` block: `@media (min-width: 1024px)` (rail layout), `@media (max-width: 1023px)` twice (the contact card rule at the Contact section and the main fallback block), `@media (max-width: 639px)` (phone type/stack adjustments) and `@media (prefers-reduced-motion: reduce)` (reveals and smooth scrolling). For each: what changes and which page owns the component. Traps: the rail disappears below 1024 without a replacement drawer; reduced motion is honoured in both CSS and `wireReveals`; there is no automated layout test — screenshots are the verification (`tools/shot-url.mjs`).

- [ ] **Step 5: Validate and report** — `--page` each of the four files; every line `ok`, exit 0. Message the Lead with paths and output. Do not run `git`.

---

### Task 6: Integration, mutation proof, reviews and final commit

**Files:**
- Modify: any library file a review finding lands on (same owner rules: Lead for shared files, the lane writer for its pages).
- No runtime files.

**Interfaces:**
- Consumes: every prior task.
- Produces: a green 7-suite `npm test`, recorded mutation evidence, the navigation walkthrough, reviewer sign-offs, and the final commit.

- [ ] **Step 1: Full validator and suite green**

Run: `node tools/library-check.mjs`
Expected: every check `ok`, exit 0.
Run: `npm test`
Expected: six existing suites pass, then `tests/library.test.mjs` prints one `ok` line per validator check and exits 0; total `7` suites' worth of output; `$LASTEXITCODE` is 0.

- [ ] **Step 2: Mutation proof — the checker must fail when the library lies**

For each mutation: apply, run `node tools/library-check.mjs`, record the failing check id and message, then revert with `git checkout -- <file>`. All must fail with the named check.

| Mutation | Expected failure |
|---|---|
| In `dialog.md`, change one anchor from `function openRecord(` to `function openDialog(` | V3, naming `js/main.js` |
| Delete every `.rail-shade` mention from the library (`rail.md` **and** `selectors.md`) | V5 |
| Remove the `projects[].title!` row from `data.md` | V7 |
| Comment out the `dialog.md` link in `README.md` | V1 |
| Append `.mutant-check { color: red; }` to `css/styles.css` | V5 |
| Add `id="mutant-check"` to `index.html` | V6 |
| Add `mutantCheck: true,` as a top-level `PORTFOLIO` key in `js/data.js` | V7 |

Revert every mutation; re-run the validator and confirm green again. Paste the failure lines into the final report.

- [ ] **Step 3: Five navigation queries, README-only**

Using only `docs/library/README.md` as the entry (no source greps before choosing a page), record the page and anchors for: (1) narrower dialog, (2) hero sentence + name, (3) accent + panel radius, (4) seventh project + painting crop, (5) replace a film still / team photograph. Each must name the right page and at least one correct file+anchor. Fix the README/page if any query dead-ends or misroutes; re-run V1/V3 after edits.

- [ ] **Step 4: Runtime untouched**

Run: `git diff --stat main...HEAD` and `git diff main...HEAD -- index.html css/styles.css js/main.js js/data.js`.
Expected: the second command prints nothing; the first lists only `docs/library/`, the spec, the plan, `tools/library-check.mjs`, `tests/library.test.mjs`, `package.json`, `AGENTS.md`, `tools/README.md`.

- [ ] **Step 5: Dispatch the two reviewers (read-only, parallel)**

- Reviewer 1 — accuracy: for every page, run `node tools/library-check.mjs --page <path>`, then verify claims against source: every `Adjust it` recipe points at a real touchpoint; every number/prose count matches `PORTFOLIO`/CSS (Review Focus 1 and 2); three anchors per page checked as "live code, not comment-only" (Review Focus 3); report `page:line claim → evidence` for anything wrong.
- Reviewer 2 — adversarial validator: independently reproduce Step 2's mutations, plus two of their own (e.g. a `Data` path with a valid-looking but non-existent nested field; a page missing a required H2). Report each expected vs actual check id and whether the failure message is specific enough for a writer to act on.
Both receive the spec path and the branch; neither edits files.

- [ ] **Step 6: Fix and re-verify**

Route findings to the owning writer (lane pages) or fix shared files yourself. Re-run Step 1, Step 2 (regression on the mutated rule) and the affected `--page` checks. **Critical/Important findings must be closed; Minor findings may ship only if recorded as a follow-up in the final commit message.**

- [ ] **Step 7: Final commit and report**

```bash
git add docs/library tools/library-check.mjs tests/library.test.mjs package.json AGENTS.md tools/README.md docs/superpowers/plans/2026-10-26-agent-component-library.md
git commit -m "docs(library): complete the agent component library

18 pages (14 components, 4 primitives), selectors.md and data.md, all
anchors resolved against live source. tools/library-check.mjs runs as the
seventh npm test suite: V1-V10 enforce index consistency, page format,
page:line->evidence anchor resolution, data paths, CSS class / id / data-*
/ emitted-class coverage, PORTFOLIO coverage, integration, no-line-number
and cited-file rules.

Verification: npm test green (7 suites); mutation proof recorded (each of
seven deliberate lies fails the named check); five navigation queries land
from docs/library/README.md alone; runtime files byte-identical."
```

Commit message must include the mutation-failure evidence summary and any reviewer-accepted Minor findings. Then present the branch result to the human, with the spec/plan links and the `git diff --stat main...HEAD` summary.
