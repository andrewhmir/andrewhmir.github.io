# Agent Component Library — Design

**Date:** 2026-10-26
**Status:** approved direction (design), implementation pending
**Branch:** `docs/agent-navigation-map`, reset onto `main` at `9e10123`
**Supersedes:** nothing. This extends the routing map in `AGENTS.md` with a
per-component reference. The old branch commit `4444103` (an `AGENTS.md` written
for the retired horizontal walk) is fully contained in `main`'s history and is
not carried forward.

## Intent

An agent asked to change "the dialog", "the frame labels", or "the accent
colour" currently reads the intent table in `AGENTS.md`, then greps
`index.html`, `js/main.js`, `js/data.js` and `css/styles.css` to reconstruct the
complete edit surface: which shell markup exists, which renderer function emits
it, which stylesheet section styles it, which data fields feed it, which tests
pin it, and which traps will bite. That reconstruction is the expensive part of
every edit, and it is repeated per task.

The library gives **one page per component** that states all of that in a fixed
shape, so the first lookup is the complete edit surface. It also gives a flat
selector index and a data contract, so an element seen in a screenshot or an
inspector resolves to its owner page and its source anchors.

**Who it serves:** agents first, humans second. It is an agent-facing reference,
not a marketing doc.

**Success criteria.** From `docs/library/README.md` alone, without opening source
first, these five queries each lead to the correct file(s) and anchors in under
a minute:

1. "Make the record dialog narrower."
2. "Change the hero sentence and the name under it."
3. "Recolour the accent and the panel radius."
4. "Add a seventh project stop and give it a painting crop."
5. "Replace a project's film still / team photograph."

**Anti-rot criterion.** `npm test` fails when the library stops telling the
truth: an anchor no longer resolves, a CSS class / HTML id / `data-*` attribute /
`PORTFOLIO` field exists in the source but is documented nowhere, a documented
data field or selector does not exist, or a required page or heading is missing.

## Context — what exists on `main`

- The page is the promoted vertical profile: `index.html` (110 lines shell),
  `css/styles.css` (623 lines, 14 section banners), `js/main.js` (436 lines,
  17 functions), `js/data.js` (678 lines: `PORTFOLIO` + `Site.*`).
- `npm test` runs six suites: `page.test.mjs` (static guard) and five data
  suites, all in-process via `tests/harness.mjs` — no `node --test`, no test
  framework dependency.
- `AGENTS.md` is the entry point: intent table, vocabulary, hard constraints,
  verification, gotchas (~290 lines). It deliberately routes at intent level and
  does not carry per-component edit surfaces.
- `tools/orphans.mjs` is the precedent for a small static scanner (28 lines); the
  repo has no dependency on a parser library and this design adds none.
- `docs/superpowers/` holds historical specs and plans; never hand-edited. This
  library is **live documentation**, not history, so it lives under
  `docs/library/`, not `docs/superpowers/`.

## Goals

1. A fixed-template page per component and primitive, all indexed from one
   README, written to be grep-friendly and free of line numbers.
2. A flat selector index for element → owner-page lookup.
3. A data contract page for `PORTFOLIO` and `Site.*`: which fields are live,
   which are dormant, and which helpers the page actually calls.
4. A validator that runs inside `npm test` and mechanically enforces anchors,
   coverage, format and index consistency.
5. A one-line pointer from `AGENTS.md` so an agent that starts at the routing map
   finds the deeper reference.

## Non-goals / deliberately absent

- **No runtime page change.** `index.html`, `css/styles.css`, `js/main.js` and
  `js/data.js` are not edited by this work.
- **No build step, no generator pipeline, no dependency.** The validator is a
  Node script using `node:fs` and `node:vm` only, run in-process.
- **No standalone HTML styleguide.** It would duplicate markup and drift from
  the real page; the pages plus the real page are the visual reference.
- **No screenshots in the repo.** They bloat the tree and date quickly;
  `tools/shot-url.mjs` takes them on demand.
- **No line numbers anywhere.** Anchors are grep strings; the validator forbids
  `file.js:123`-style citations.
- **No duplicated record content.** Pages link to `js/data.js` and name fields;
  they never paste project or honour copy.
- **No restatement of hard constraints.** Pages cite `AGENTS.md` instead of
  copying its constraint table, so there is one authority for each rule.
- **Not a replacement for `AGENTS.md`.** AGENTS.md remains the entry point and
  the intent router; the library is the per-component deep reference.

## Deliverables

```
docs/library/
  README.md                 index + how the contract works + reading order
  selectors.md              flat lookup: selector → component page
  data.md                   PORTFOLIO contract + Site.* inventory
  components/               14 pages (table below)
  primitives/               4 pages (table below)
tools/library-check.mjs     validator; supports --check (default) and --page <path>
tests/library.test.mjs      imports the validator, registers checks with the harness
```

`package.json` test script gains `&& node tests/library.test.mjs` as the last
suite. `AGENTS.md` gains one pointer sentence and one Docs map row.
`tools/README.md` gains one row describing `library-check.mjs`.

**Size budget:** 40–90 lines per page; the whole library target ~1,400–1,900
lines including indices. A page that needs more than 90 lines is describing two
components and must be split.

## Component inventory

Every page owns its selectors: the validator requires every class declared in
`css/styles.css` to be named in at least one library page.

### `components/` — 14 pages

| Page | Component | Owns (classes / ids / data) | Key source anchors |
|---|---|---|---|
| `page-shell.md` | The document shell: script order, empty `#page`, skip link, no-JS fallback | `#page`, `.page`, `.skip`, `<noscript>`, `.noscript`, `.sr-only` | `<main id="page"`, `function init(`, `── The page and its painted panels` (the `.page` rule) |
| `masthead.md` | Fixed header: brand, menu, resume, progress hairline | `#masthead`, `.masthead`, `.masthead.is-stuck`, `.brand`, `.menu`, `.resume`, `#resumeLink`, `#progress`, `.progress`, `--masthead-h:` | `id="masthead"`, `function wireChrome(`, `── Masthead`, `--masthead-h:` |
| `rail.md` | Fixed journey rail + its left shade | `#rail`, `.rail`, `.rail::before`, `.rail__stop`, `.rail__stop.is-active`, `.rail-shade` | `id="rail"`, `function buildRail(`, `── Journey rail`, `.rail__stop` |
| `panel.md` | The painted panel, art layer, scrim, layout cells, art pan table | `.stop`, `.stop::before`, `.stop::after`, `.stop[data-side="left"]`, `.stop-in`, `.copy`, `.media`, `.copy--center`, `.art--rice`, `.art--harvest`, `--pos` | `function panel(`, `var PAN = [`, `── The page and its painted panels`, `background-position: var(--pos` |
| `hero.md` | First stop: name, title, sentence, two actions, scroll cue | `#top`, `.stop--hero`, `.hero-title`, `.hero-line`, `.hero-cue`, `.actions` | `/* 0 — hero */`, `.stop--hero`, `.hero-cue`, `P.bio[3]` |
| `about.md` | About stop: bio paragraphs, social buttons, framed portrait | `#about`, `.portrait`, `.portrait figcaption` | `/* 1 — about */`, `P.bio.map`, `.portrait` |
| `project.md` | The Work wrapper and one project stop: eyebrow, title, copy, awards, open-record button | `.work`, `#work`, `.stop--project`, `.eyebrow`, `.awards`, `.awards li`, `#project1`…`#project6` | `/* 2 — work`, `function projectCopy(`, `── Project panel extras`, `projects: [` |
| `frames.md` | The media stack: lead frame, film still, team frame, awaited frame | `.media`, `.stack`, `.frame`, `.frame--lead`, `.frame img`, `.frame__label`, `.frame__play`, `.frame--awaited`, `.frame__inner` | `function frame(`, `function isAwaited(`, `function projectMedia(`, `── Frames and the media stack` |
| `leadership.md` | Leadership stop: four cards opening the dialog gallery | `#leadership`, `.leaders`, `.leader`, `.leader__thumb`, `.leader__thumb--empty`, `.leader__body`, `.leader__year`, `.leader__text` | `/* 3 — leadership */`, `P.leadership.map`, `── Leadership cards` |
| `honours.md` | Honours stop: standalone tiles, project-award partition | `#honours`, `.stop--list` (emitted, no rule), `.honours`, `.honour-row`, `.honour-row__year`, `.honour-row__text`, `.honour-row__mark`, `data-kind="honors"` | `/* 4 — honours`, `S.honoursTiles(P.honors)`, `── Honours list` |
| `contact.md` | Contact stop: closing line, email, social links, dark card | `#contact`, `.stop--contact`, `.stop--contact .stop-in`, `.stop--contact .stop-in::before`, `.contact-mail`, `.contact-links` | `/* 5 — contact`, `── Contact`, `.stop--contact .stop-in::before` |
| `footer.md` | Page footer: name, painting credit, year | `.foot`, `.foot__name`, `.foot__credit`, `.foot__year` | `class="foot"`, `── Footer` |
| `dialog.md` | The one record dialog: markup, open/close, focus trap, video, gallery | `#dialog`, `.dialog`, `.dialog__card`, `.dialog__close`, `.dialog__meta`, `.dialog__title`, `.dialog__body`, `.dialog__video`, `.dialog__gallery`, `data-kind`, `data-index` | `id="dialog"`, `function openRecord(`, `function closeDialog(`, `function gallery(`, `── Dialog` |
| `reveals-chrome.md` | Scroll behaviour: reveal-on-scroll, reduced motion, masthead stuck state, progress width, resume href | `[data-reveal]`, `[data-reveal].is-in`, `.masthead.is-stuck`, `data-stop` | `function wireReveals(`, `function wireDelegation(`, `── Reveal` |

### `primitives/` — 4 pages

| Page | Covers | Key source anchors |
|---|---|---|
| `tokens.md` | `:root` palette, families, radii, gutters, max width; which tokens the page actually reads; `css/fonts.css` generated note | `:root`, `--night: #080c0e`, `--panel-radius:`, `--serif:`, `--max:` |
| `type.md` | `h1`, `h2`, `.eyebrow`, `.hero-title`, `.hero-line`, `.lede`, `.body`, `.actions`; responsive sizes; Newsreader 300-not-vendored trap | `h1 {`, `h2 {`, `--serif:`, `.eyebrow`, `@media (max-width: 639px)` |
| `controls.md` | Buttons, links, focus ring, skip link, resume action, close button | `.btn`, `.btn--solid`, `.btn:hover`, `.skip`, `.skip:focus`, `:focus-visible`, `::selection`, `.resume` |
| `responsive.md` | Every `@media` block: the 1024px rail breakpoint, the 1023px fallback (including the contact card rule), the 639px phone layout, and `prefers-reduced-motion` | `@media (min-width: 1024px)`, `@media (max-width: 1023px)`, `@media (max-width: 639px)`, `@media (prefers-reduced-motion: reduce)` |

### Indices

- **`selectors.md`** — table `Selector | Page | What it is`. Lists every
  component root and every state selector (`.is-stuck`, `.is-active`, `.is-in`,
  `.frame--lead`, `.frame--awaited`, `.btn--solid`, `.copy--center`,
  `.stop--hero`, `.stop--project`, `.stop--contact`, `.stop--list`),
  plus ids and `data-*` attributes. Not a complete descendant inventory; the
  component pages own their trees.
- **`data.md`** — the `PORTFOLIO` contract:
  - top-level keys with live / dormant status (`news`, `nav`, `profileImage`,
    `favicon`, `scrollerIcon` are dormant; `name`, `title`, `bio`, `email`,
    `social`, `projects`, `leadership`, `honors` are live);
  - per-collection field tables for `projects`, `leadership`, `honors`, with
    required / optional / dormant markers and nested shapes
    (`overview.image`, `overview.text`, `team.image`, `team.text`,
    `awards[].description`, `awards[].year`, `links[].label`, `links[].url`);
  - path rules and placeholders: `PlaceHolder.png` = awaited; a missing file =
    `onerror` fallback; `files/posters/<stem>.jpg` from `S.posterFor`;
  - `Site.*` inventory: `posterFor` and `honoursTiles` are **used**; the rest
    (`deriveRooms`, `ROOM_TITLES`, `ROOM_ORDER`, `groupPieces`, `PLACEHOLDER`,
    `MIN_PIECES`, `MAX_PIECES`, `HANG_LAYOUTS`, `hangLayout`, `honoursSplit`,
    `HONOURS_ROOMS`, `evenChunks`, `visibleWork`, `progressFraction`,
    `roomAtOffset`, `bandFor`, `galleryFor`, `awardPhotos`) are **dormant** —
    inherited from the retired build and kept only because the data suites test
    them.

## Page contract

Every page under `docs/library/components/` and `docs/library/primitives/`
follows this shape exactly:

```markdown
# <Component name>

One sentence: what it is and where it is seen. (Must appear before the first H2.)

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="masthead"` |
| Render | `js/main.js` | `function wireChrome(` |
| Styles | `css/styles.css` | `── Masthead` |
| Data | `js/data.js` | `projects[].title` |
| Test | `tests/page.test.mjs` | `id="masthead"` |

## Structure            (optional, DOM + class tree + state classes)

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| ... | ... | `npm test`, screenshot, dialog probe |

## Invariants

- What must stay true, citing `AGENTS.md` or the test that pins it.

## Traps

- Silent failure modes specific to this component.
```

Rules for the `Where it lives` table, all enforced by the validator:

- **Role** is one of `Markup`, `Render`, `Styles`, `Data`, `Test`, `Assets`.
- **File** is exactly one repo-relative path per row; use another row if a
  component touches several files. Paths must exist.
- **Anchor** is one or more backticked tokens, separated by `·`. Every token
  must appear literally in the named file, except `Data` rows which use the
  path grammar below.
- Anchors may be: a function definition (`function openRecord(`), a CSS section
  banner (`── Record dialog`), a CSS custom property with its colon
  (`--frame-radius:`), a selector (`.frame__play`), an HTML id (`id="dialog"`),
  a literal marker (`/* 0 — hero */`), or a file/attribute name
  (`class="skip"`). They must be **unique enough to grep**; a token that occurs
  more than once in its file is still valid but should be qualified.
- **No line numbers**, anywhere in the library.

Data path grammar (only in `Data` rows):

- `field` — a top-level `PORTFOLIO` key (e.g. `bio`).
- `collection[].field` — a key present on at least one record of that
  collection (e.g. `honors[].from`).
- `collection[].field!` — a key present on every record (e.g.
  `projects[].title!`).
- `collection[].a.b` (and deeper) — a nested path present on at least one
  record; the `!` marker applies at the leaf (e.g. `social[].url!`,
  `projects[].overview.image`).
- `Site.helper` — a helper published on `Site` (validated separately in
  `data.md`).

## Validator design

`tools/library-check.mjs` exports a check list and runs as a CLI:

```powershell
node tools/library-check.mjs              # all checks, exit 1 on first failure summary
node tools/library-check.mjs --page docs/library/components/dialog.md
```

`tests/library.test.mjs` imports the checks and registers each with
`tests/harness.mjs` (`check(name, fn)` + `run()`), so failures print one line each
and `npm test` stops on non-zero exit. The validator is read-only.

### Sources it reads

`index.html`, `css/styles.css`, `js/main.js`, `js/data.js`, `package.json`,
`AGENTS.md`, `tools/README.md`, every file under `docs/library/`, and the
existence of `tests/*.test.mjs` and `tools/*.mjs` paths it cites.

### Checks

| # | Check | Failure means |
|---|---|---|
| V1 | **Index consistency** — every `.md` under `docs/library/components|primitives` is linked from `README.md` at least once (cross-links from the "start here" table are allowed), every link resolves, no orphan page file | the library cannot be entered from one place |
| V2 | **Page format** — H1, one-line purpose before the first H2, required H2s (`Where it lives`, `Adjust it`, `Invariants`, `Traps`), table header shape | a page's shape drifted and grep/read habits break |
| V3 | **Anchors** — for every `Where it lives` row: file exists; every backticked anchor token occurs in the file; multi-token cells split on `·` | a documented anchor is stale |
| V4 | **Data paths** — every `Data` row path resolves against a `vm`-loaded `PORTFOLIO`; `!` paths exist on every record; `Site.helper` exists | the data contract lies |
| V5 | **Class coverage** — every base class declared in `css/styles.css` (pseudo-states stripped) is named as `.class` in at least one library file; every selector in `selectors.md` resolves in CSS/HTML/JS | source grew a component the library does not know |
| V6 | **Id / attribute / emitted-class coverage** — every `id="..."` in `index.html` is named in the library; every `data-*` attribute used in HTML/CSS/JS is named (`dataset.side` counts as `data-side`); every class literal emitted by `index.html` or `js/main.js` (`class="..."`, `className =`, `cls: '...'`, `classList.add/toggle('...')`) is named as `.class`. Pseudo-class state selectors are covered by V5. | a new hook, state or element is undocumented |
| V7 | **Data coverage** — every top-level `PORTFOLIO` key is named in `data.md`; every field in the union of each collection's records is named as a path; every `Site.*` defined is named; `data.md`'s used/dormant classification of helpers matches `S.` calls in `js/main.js` | data.md drifts when records change |
| V8 | **Integration** — `package.json` test script contains `tests/library.test.mjs`; `AGENTS.md` names `docs/library/README.md`; the Docs map row exists; `tools/README.md` names `library-check.mjs` | the library becomes unreachable or unrun |
| V9 | **No line numbers** — no library file matches `[\w./-]+\.(?:js|css|html|mjs):\d+` | anchors replaced with brittle citations |
| V10 | **Cited files exist** — every `tests/*.test.mjs` and `tools/*.mjs` path cited in the library exists on disk | a test/tool reference rotted |

Every check is independently reported; the CLI prints `ok`/`FAIL` per check and
exits non-zero if any fails. `--page` runs V2–V4 and V9 for one page only, for
writer self-checks.

## Execution shape

- **Branch:** `docs/agent-navigation-map` (reset to `main`; already done).
- **Single committer:** the Lead. Writer teammates edit disjoint files and never
  run `git`.
- **TDD:** the checker, its test, the README index, the page template and one
  exemplar page (`dialog.md`, the densest component) are written and committed
  first, with `npm test` red because the remaining pages are missing. Then the
  remaining pages are written until `npm test` is green.
- **Writer lanes (disjoint files):**
  - Lane A — shell: `page-shell`, `masthead`, `rail`, `footer`, `reveals-chrome`.
  - Lane B — rendered stops: `panel`, `hero`, `about`, `project`, `frames`.
  - Lane C — content stops and indices: `leadership`, `honours`, `contact`,
    `selectors.md`, `data.md`.
  - Lane D — foundations: `primitives/tokens`, `primitives/type`,
    `primitives/controls`, `primitives/responsive`.
  - Lead owns `tools/library-check.mjs`, `tests/library.test.mjs`,
    `docs/library/README.md`, the exemplar page, `package.json`, `AGENTS.md`,
    `tools/README.md`.
- **Review:** two read-only reviewers after the writers land. Reviewer 1
  (accuracy) runs `node tools/library-check.mjs --page <page>` on every page and
  spot-checks three claims per page against source. Reviewer 2 (adversarial)
  attacks the validator: breaks an anchor, removes a class from a page, removes
  a data path, drops an index entry, and confirms each produces a specific
  failure. Findings go back to the owning writer; the Lead re-runs everything.

## Verification

1. `node tools/library-check.mjs` — green.
2. `npm test` — all seven suites green (six existing + library).
3. **Mutation checks**, each applied then reverted: break one anchor, delete
   one class from the docs, remove one data path, drop one page from the index —
   the validator must fail each time with a specific message.
4. **Coverage mutations**, each applied to the working tree and reverted with
   `git checkout --`: add a throwaway CSS class (V5 must fail), add an `id` to
   `index.html` (V6 must fail), add a `PORTFOLIO` field (V7 must fail) — proves
   the coverage rules are live, not vacuous.
5. **Navigation walkthrough:** the five success queries, executed only from
   `docs/library/README.md`, recording the page and anchors reached.
6. `git diff --stat` confirms `index.html`, `css/styles.css`, `js/main.js` and
   `js/data.js` are unchanged by this work.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Library rots after the first change | V3/V5/V6/V7 are coverage rules, not sample checks: new source forces docs edits in the same commit |
| Duplicated authority with `AGENTS.md` | AGENTS.md keeps intent routing and constraints; pages cite it and never copy it; README states the split |
| Pages become mini-essays and stop being scannable | 90-line cap per page, fixed headings, tables over prose, no record copy |
| Anchors too generic to grep | validator accepts only tokens that occur in the named file; page contract says qualify ambiguous tokens |
| Writer invents anchors / structure | exemplar page + `--page` self-check per writer; reviewer re-runs it |
| Checker over-fitting to today's repo | rules are small, documented in this spec, and tested by mutation checks; V5/V6 use the same string heuristics as `tools/orphans.mjs` |
| Encoding drift on box-drawing anchors (`──`) | all files UTF-8; validator compares decoded strings exactly and fails loudly |
| Token cost of the library itself | index-first README lets an agent read one page (~60 lines) instead of ~1,600 lines of source; pages carry no duplicated content |

## Acceptance criteria

- [ ] `docs/library/` contains exactly the 14 component pages, 4 primitive pages,
      `README.md`, `selectors.md`, `data.md`; README links every page (at least
      once; cross-links are allowed).
- [ ] `tools/library-check.mjs` supports default run and `--page`, exits non-zero
      on failure, and V1–V10 are all implemented.
- [ ] `tests/library.test.mjs` is registered in `package.json` **after** the six
      existing suites; `npm test` is green with 7 suites.
- [ ] Mutation checks 3 and 4 above were performed and each produced the
      expected failure; results recorded in the plan's progress report.
- [ ] The five navigation queries land on the documented pages and anchors.
- [ ] `index.html`, `css/styles.css`, `js/main.js`, `js/data.js` unchanged in the
      branch diff.
- [ ] No line numbers in the library; every `Where it lives` anchor resolves.
- [ ] `AGENTS.md` points at `docs/library/README.md`; `tools/README.md` lists the
      new tool.
- [ ] Read-only reviewer sign-off per lane, with any disputed claim checked
      against source.
