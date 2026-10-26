# AGENTS.md — routing map for this repo

Written for an agent that has to change something here. `README.md` holds the
design reasoning — read it when you want to know *why*, not to find a file.

**Find a section by NAME, never by line number.** Line numbers move on the first
edit; every anchor below is a string to search for, and each was checked against
the promoted files.

- Prefer the **function name**: `function openRecord(` is unique, where
  `openRecord` alone is not.
- A CSS token is unique with its colon — `--panel-radius:` — and a stylesheet
  section is usually unique with its banner, e.g. `── Journey rail`. A bare
  name can also appear in a comment about history.
- `index.html` and `css/styles.css` contain comments that name things the page no
  longer does. The static guard strips comments before its scans; a plain grep
  does not. Read the hit before acting on it.

## What this is

A static personal portfolio: **no build step, no bundler, no runtime dependency.**
`index.html` opens directly; `node tools/serve.mjs 3333` serves it when video,
fonts or screenshots need HTTP. Node is only for tests and dev tools.

The page is a vertical profile, in this order: fixed masthead → hero (`#top`) →
About (`#about`) → Work (`#work`, six project stops with ids `project1` …
`project6`) → Leadership (`#leadership`) → Honours (`#honours`) → Contact
(`#contact`) → footer. A fixed journey rail (≥1024px) tracks the section crossing
the middle of the viewport and carries the page's scroll progress. One shared
record dialog serves every project, every leadership record, and every honour
that has photographs.

Every stop is a full-width rounded panel painted by a different crop of one of
two saved Amorsolo paintings. A direction-aware scrim keeps the copy side dark
while the far side of the painting stays daylight-bright. The shell is static;
the sections, rail and dialog content are rendered from `PORTFOLIO` by
`js/main.js`.

The page was built as `preview.html` + `css/profile.css` + `js/profile.js`, then
promoted by rename into its final names and the preview copies deleted. Edit only
`index.html`, `css/styles.css`, `js/main.js`.

## The files

| File | Size | Holds |
|---|---|---|
| `index.html` | ~110 lines | The shell: meta/OG/canonical, `css/fonts.css` then `css/styles.css`, masthead, rail shade, rail nav, empty `#page`, footer, `<noscript>` fallback, the one dialog, then `js/data.js` before `js/main.js`. |
| `css/styles.css` | ~630 lines | All styling: tokens, masthead, rail shade, rail + its progress fill, panels/art/scrims, type, frames, project extras, leadership, honours, contact, footer, dialog, reveals, responsive. Section banners are the map. |
| `js/main.js` | ~440 lines | `PAN` (the art order), `esc`/`paragraphs`/`panel`/`frame`, `projectCopy`/`projectMedia`, `render()`, the dialog (`openRecord`, `closeDialog`, `gallery`), `buildRail`, `wireReveals`, `wireChrome`, `wireDelegation`. Publishes `window.Profile`. |
| `js/data.js` | ~680 lines | `PORTFOLIO` — the portfolio records and personal copy — plus `Site.*` helpers. The page itself reads only `Site.posterFor` and `Site.honoursTiles`; the other helpers are inherited from the retired horizontal build and are kept because the surviving data suites test them. |
| `css/fonts.css` | generated | The `@font-face` rules for Newsreader and Courier Prime. Do not hand-edit; refresh with `tools/vendor-fonts.mjs`. |
| `files/` | assets | The two paintings, portrait, project overview/team photographs, six films, generated `posters/`, generated `og-card.jpg`, favicon, vendored fonts, currently unused icons. |
| `tests/page.test.mjs` | ~108 lines | The static guard: shell order, palette, both paintings and art layers, dialog markup, no third-party loads, section ids, data counts, and that `npm test` runs it. |
| `tests/*.test.mjs` | data suites | `derive-rooms`, `hang`, `band`, `gallery-index`, `award-photos` — pure tests of inherited `Site.*` helpers and the content. None renders the page. |
| `tools/` | dev only | Static server, image/font/icon generators, asset import, orphan scan. `tools/README.md` indexes what survives and what is retired. |
| `docs/superpowers/` | historical | Specs and plans. Never hand-edit; read for the design record. |

The five data suites are **not** a renderer test. The old walk's DOM stub,
`shell-check`, `renderer`, `lights` and `delegation` suites are gone. `npm test`
green means the guard strings and data shapes still hold; it does not mean the
page laid out. See **Run and verify**.

## Where to change what

Route by **intent**, not by file.

For a component's full edit surface — its markup, renderer function, stylesheet
section, data fields, tests and traps — open
[`docs/library/README.md`](docs/library/README.md). This table is the intent
router; the library is the per-component depth behind it.

| Intent | Goes in | Anchor |
|---|---|---|
| Hero name, title, sentence, actions | `js/data.js` + `js/main.js` | `name:`, `title:`, `bio: [`; `/* 0 — hero */` |
| About copy, portrait, social row | `js/data.js` + `js/main.js` | `/* 1 — about */`, `P.bio.map` |
| Section order, or removing a section | `js/main.js` | `function render()`, then the `out.push` blocks `/* 0 — hero */` … `/* 5 — contact */` |
| Add or edit a project | `js/data.js` | `projects: [` — page order is array order; the id becomes the anchor and rail label |
| A project's copy and award list | `js/main.js` + `js/data.js` | `function projectCopy(`, the project's `awards: [` |
| A project's three media frames | `js/main.js` | `function projectMedia(`, `function frame(` |
| Which painting and crop each stop uses | `js/main.js` + `css/styles.css` | `var PAN = [`; `.art--rice`, `.art--harvest`; `background-position: var(--pos` |
| A scrim, or which side the copy sits on | `css/styles.css` + `js/main.js` | `.stop[data-side="left"]`, `"right"`, `"center"`, `.stop--hero`, `.stop--contact`; `panel()` sets `data-side` |
| Contact closing and its dark card | `js/main.js` + `css/styles.css` | `/* 5 — contact */`; `.stop--contact .stop-in::before` |
| Leadership cards | `js/data.js` + `js/main.js` | `leadership: [`; `P.leadership.map` |
| Honours list, and which awards stay on projects | `js/data.js` + `js/main.js` | `honors: [`, `from: 'project`; `S.honoursTiles(P.honors)` |
| The dialog, its focus trap, Escape, restore | `index.html` + `js/main.js` | `#dialog`; `function openRecord(`, `function closeDialog(`, the `keydown` trap |
| The project video player | `js/main.js` | `dialog__video`; poster from `S.posterFor` |
| The journey rail, its active state and the page-progress fill | `js/main.js` + `css/styles.css` | `function buildRail(`, `wireChrome`; `.rail`, `.rail::before`, `.rail-shade`, `--rail-progress` |
| Masthead stickiness and the small-screen progress hairline | `js/main.js` + `css/styles.css` | `wireChrome`; `.masthead.is-stuck`, `.progress` |
| Reveals and reduced motion | `js/main.js` + `css/styles.css` | `function wireReveals(`; `[data-reveal]`, `prefers-reduced-motion` |
| Palette | `css/styles.css` | `:root`, `--night: #080c0e` |
| Type | `css/styles.css` + `css/fonts.css` | `--serif:`, `--mono:`, `h1 {`, `h2 {`, `h1 {` in the responsive block |
| Radii | `css/styles.css` | `--panel-radius:`, `--frame-radius:`, `.btn` |
| Responsive layout | `css/styles.css` | `@media (min-width: 1024px)`, `@media (max-width: 639px)` |
| Page title, description, Open Graph card | `index.html` | `og:image`, `twitter:image`, `<title>` |
| Missing photographs | `files/` + `js/data.js` + `tools/import-photos.mjs` | the record's `images: [` / `team.image`; `MAPPING` |

Do not hand-copy project or honour text into `index.html` or `js/main.js`. The
shell owns chrome and the no-JS fallback; `PORTFOLIO` owns the records. Section
headings, frame labels and button text are literals in `render()`.

## Vocabulary

The code names things precisely. Half the cost of a change is using the wrong
word and editing the wrong thing.

| Term | Means | Code |
|---|---|---|
| **stop / section** | One unit of page order: hero, About, one project, Leadership, Honours, Contact. `#work` itself is a wrapper `div.work`, not a stop. | `section.stop`, `.stop--project`; a rail entry is `.rail__stop` |
| **panel** | The painted surface of a stop: the rounded box, its art layer and its scrim. | `.stop`, `.stop::before`, `.stop::after` |
| **art pan** | The crop chosen by `background-position` for this stop. Not an animation and not a separate image. | `--pos`, `PAN` |
| **painting** | One of the two source images. `rice` is `painting-hero.jpg` (*Planting Rice*, 1949); `harvest` is `painting.jpg` (a 1934 harvest scene). | `.art--rice`, `.art--harvest` |
| **scrim** | The direction-aware gradient over the art that keeps the copy side dark and the far side bright. | `--scrim`, `.stop[data-side]`, `.stop::after` |
| **rail** | The fixed left-hand journey nav with one stop per named section (not the hero). | `.rail`, `.rail__stop`, `buildRail` |
| **left shade** | The fixed 108px gradient behind the rail so it stays legible over bright crops. | `.rail-shade` |
| **frame** | One media box in a project's stack: the overview, the film still or the team photograph. | `.frame`, `.frame--lead` |
| **film still / poster** | The generated `files/posters/<stem>.jpg` shown in the film frame. The page does not play it in the panel; the player is in the dialog. | `S.posterFor`, `.frame__play` |
| **record** | One authored project, leadership entry or honour in `PORTFOLIO`. | `P.projects`, `P.leadership`, `P.honors` |
| **dialog** | The one shared modal. Prefer “record dialog” to “modal” when routing. | `#dialog`, `.dialog__card`, `openRecord` |
| **honours tile** | One standalone honour row in the Honours list. Project awards are not tiles; they live as text on the project panel. | `.honour-row`, `Site.honoursTiles` |
| **awaited frame** | A frame reserved for a photograph that is not there yet: dashed, labelled “Awaiting photograph”, not a button. Only an empty `src` or `PlaceHolder.png` becomes awaited. | `.frame--awaited`, `isAwaited` |
| **project award** | An honour carrying `from: 'projectN'`, excluded from the Honours tiles and shown under the project's Awards. | `from: 'projectN'`, `honoursTiles.projectAwards` |

**Retired vocabulary — do not present any of it as live:** hall, room, stand,
cluster, hang cell, legend, dock, Lenis, snap, mural, the dragon-frieze wall
(`files/wall-mushoku.webp`), and the exhibition-label idea. They belong to the
horizontal build this page replaced. Do not restore their code. Some of those
words still appear in the surviving data-suite names and output because those
suites test inherited `Site.*` helpers; that is history, not page vocabulary.

## Hard constraints

These are the constraints a change must not break. “Pinned by” is deliberately
specific: a constraint that only a review catches is marked as such.

| Constraint | What it means | Pinned by |
|---|---|---|
| **No third-party runtime loads** | No remote script, stylesheet, image or `url(http…)`. Fonts, icons, paintings and films are local. Anchor `href`s and meta URLs may be absolute; resource loads may not. | `tests/page.test.mjs`, scanning `index.html` and `css/styles.css` with comments stripped, and `js/main.js` / `js/data.js` raw |
| **Palette tokens are exact** | `--night #080c0e`, `--text #ece2cf`, `--text-strong #f9f4e8`, `--text-quiet #9a9384`, `--accent #d4b06a`; border `rgba(236,226,207,.14)`. | `page.test.mjs` asserts the five colour strings; the border alpha is not separately asserted |
| **Both paintings and the art layers exist** | `.art--rice` points at `../files/painting-hero.jpg`, `.art--harvest` at `../files/painting.jpg`; `.stop::before` and `background-position: var(--pos` are the layers. | `page.test.mjs` |
| **Radii** | Panels 16px, frames 10px, buttons 8px; panel 12px below 640. | `page.test.mjs` pins the two tokens; the button radius is a CSS rule |
| **Load order** | `css/fonts.css` before `css/styles.css`; `js/data.js` before `js/main.js`; `#page` empty; dialog markup present; `<noscript>` present. | `page.test.mjs` |
| **The retired build stays out of the shell** | `lenis`, `icons.js`, `#hall`, `#strip`, `dock-track`, `wall-mushoku` must not appear in `index.html` (comments stripped). | `page.test.mjs` |
| **The dialog stays accessible** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialogTitle"`, a labelled close button; `openRecord` saves focus, focuses the card, traps Tab, closes on Escape/overlay/button and restores focus; body scroll is locked while open. | Markup is pinned by `page.test.mjs`; the trap and restore are behaviour in `js/main.js` and are **not** unit-tested |
| **Reduced motion is honoured** | `prefers-reduced-motion` disables reveals and smooth scrolling; the JS marks every reveal visible instead of observing. | `page.test.mjs` pins the string; the CSS media query and the JS branch implement it; behaviour is manual |
| **No build step** | No bundler, no build script, no npm runtime dependency; Node runs tests and tools only. | `package.json`; `page.test.mjs` pins that the guard is in the test script |
| **One `<h1>`** | The renderer emits the hero's `h1`; the no-JS fallback is the only one when JS is off. With JS on, `<noscript>` is raw text and contributes no element. | Not counted by `page.test.mjs`; keep it by inspection |
| **The content counts** | Six projects, four leadership cards, five standalone honour tiles; `PORTFOLIO.social[0].label === 'Resume'`. | `page.test.mjs` |
| **The guard follows the promoted names** | `page.test.mjs` reads `index.html`, `css/styles.css`, `js/main.js`, `js/data.js`, `package.json`. Renaming any of them without updating the guard fails it. | `page.test.mjs` |
| **CSS braces balance** | An unmatched brace silently eats the rest of the sheet. | `page.test.mjs` |

The guard is static and data-only. It does not execute `render()`, measure a
panel, or model CSS. Treat green as the floor, not as proof the page works.

## Run and verify

```powershell
node tests/page.test.mjs      # the static guard, alone
npm test                      # guard + the five data suites
node tools/serve.mjs 3333     # http://127.0.0.1:3333/
```

`npm test` runs, in order: `page.test.mjs`, `derive-rooms.test.mjs`,
`hang.test.mjs`, `band.test.mjs`, `gallery-index.test.mjs`,
`award-photos.test.mjs`. The data suites are pure and print `ok` per check; they
use `tests/harness.mjs`, not `node --test`. `hang` is the one that also asserts
every shipped project video has its poster still on disk.

The old DOM/browser suites are retired. **There is no automated layout check for
this page.** Use headless Chrome screenshots at 1440×900, the spec's 1280×704
floor, and 390×844, and look for:

- no horizontal scrollbar, and no title overflow (`C.E.N.T.H.R.O.` and
  `BiyaHey!` at 390px);
- the copy side dark enough to read, the far side still painting;
- the rail labels, active dot and gold progress fill over the brightest crop;
- the dialog fitting the viewport, its video controls reachable, Tab staying
  inside, Escape returning focus to the button that opened it.

`tools/shot-url.mjs` captures one viewport at a URL; for scrolled or full-page
shots use Chrome DevTools' capture or a scratch CDP script under `.tmp-diag/`.
The scratch directory is gitignored; screenshots and probe scripts belong there,
not in `files/` or `tools/`.

```powershell
# terminal 1
node tools/serve.mjs 3333
# terminal 2 — headless Chrome needs named pipes, so run this with the sandbox off
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\profile-shots" about:blank
# terminal 3
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/home-1440.png 1440 900
```

A CSS or JS change needs a page refresh. There is no live reload and no dev
server build.

## Gotchas

- **The preview trio is gone on purpose.** `preview.html`, `css/profile.css` and
  `js/profile.js` were the build copies and were deleted on promotion. A
  reintroduced preview would fork the page and can render stale CSS/JS while the
  real page ignores it; `page.test.mjs` only reads the promoted names.
- **Leftover walk files are not live.** `js/icons.js`, `js/vendor/`,
  `files/wall-mushoku.webp` and the retired tools are unreferenced by the page.
  `page.test.mjs` rejects `icons.js` and `wall-mushoku` in `index.html`. Do not
  wire any of them back without a reason.
- **`files/painting.jpg` is live.** It is the About/Hivemind/Focus
  Buddy/BiyaHey/Honours art (`art--harvest`). Older cleanup notes called it an
  orphan because the retired page did not use it; that is no longer true. Do not
  delete it as an unreferenced image.
- **`files/painting-hero.jpg` is the OG source, not just the hero art.**
  `tools/make-images.mjs` draws `files/og-card.jpg` from it, and `index.html`
  points `og:image` at the card. Deleting the painting makes the share card
  unreproducible. `og-card.jpg` and `files/posters/*.jpg` are generated; do not
  hand-edit them.
- **A missing photograph is not the same as an awaited frame.** Awaited means
  the data says `PlaceHolder.png` (or has no `src`); it renders the dashed,
  non-clickable frame. A path that points at a file which is not on disk renders
  an `<img>` whose `onerror` swaps in `PlaceHolder.png`. Six references are in
  the second state: Personnel's Week (×2), Commencement (×2), Work Immersion and
  the 2023 National Youth Congress. `tools/import-photos.mjs`'s `MAPPING` has no
  entries for them; add the mappings and import the sources, or point the data
  at `PlaceHolder.png` to make the gap explicit.
- **HiveMind and SATLearn teams are explicit placeholders.** Their `team.image`
  is `PlaceHolder.png`, so they render awaited frames. `tools/make-images.mjs`
  has a `STILLS` table that can derive team stills from the project videos, but
  the outputs are not in `files/` and `js/data.js` still points at the
  placeholder. That is a content decision, not a layout fix.
- **Some data fields have no reader on this page.** `news`, `nav`, `authors`,
  `source`, `report`, `pieces`, `profileImage`, `favicon`, `scrollerIcon` and
  the social `icon` names are inherited or unused. `PORTFOLIO.news` is not
  rendered at all; editing it changes nothing visible. Check `js/main.js` before
  wiring a field you expect to appear.
- **The hero sentence is `P.bio[3]`, not `bio[2]`.** The portrait is hard-coded
  as `files/profile.jpg` in `js/main.js`; `PORTFOLIO.profileImage` is ignored.
  Changing bio order changes the hero sentence.
- **`PAN` is indexed by page position.** Adding a seventh project collides with
  `PAN[8]` (Leadership), and `page.test.mjs` asserts six projects. Adding one
  means extending the `PAN` table, revisiting the rail, and updating the guard;
  reordering projects shifts every later crop.
- **The art/scrim stacking is deliberate.** `.stop` sets `isolation: isolate`;
  the art is `::before` at `z-index: -2`, the scrim `::after` at `-1`, and the
  contact card is a `::before` on `.stop-in` at `-1`. A new positive-z layer
  hides the art; removing `isolation` lets the negative layers escape.
- **Newsreader is vendored at 400/500/600, not 300.** The CSS asks for 300 on
  display text; the browser serves the closest declared face (400). A real 300
  needs a new vendored face, not a number change.
- **The data suites print retired nouns.** `derive-rooms`, `hang` and `band`
  still say room, stand and wall because they test the inherited helpers. Do not
  “fix” the page to match that vocabulary; the page is stops and panels.
- **`Site.awardPhotos` and `Site.galleryFor` are inherited, not live.**
  `js/main.js` reads `honoursTiles` and the records' own `images` arrays; it does
  not call either helper. Project-linked award photographs are therefore not
  surfaced by the project dialog. Reaching them is a feature change, not a
  rename.
- **PowerShell 5.1 only.** `pwsh` does not exist on this machine. Use
  `powershell`; check `$LASTEXITCODE` for native commands rather than relying on
  `$ErrorActionPreference`, because 5.1 turns native stderr into a red
  `RemoteException` even on success. `npm test`'s `&&` chain is run by npm under
  cmd; do not paste it into a PowerShell 5.1 prompt.
- **`npm run serve` is not the offline server.** It shells out to
  `npx http-server`, which may fetch a package. Use `node tools/serve.mjs 3333`.
- **Chrome needs a non-confined shell.** Headless Chrome opens Mojo named pipes,
  which the confined sandbox forbids. A reused `--remote-debugging-port` can also
  still be attached to the previous URL; check the page before trusting a shot.
- **`.tmp-diag/` is gitignored.** It is a scratch directory for screenshots and
  probe scripts, sometimes tens of MB. `git add -A` will not sweep it up; keeping
  or deleting its contents is still a deliberate decision.

## Deliberately absent

Do not add these without being asked: a build step, a bundler, an npm runtime
dependency, a CDN at runtime, analytics, a CMS, a test framework or
`node --test`; an icon font or a loaded `js/icons.js`; Lenis, scroll snap or a
horizontal page; a mobile menu drawer; a News section; inline or autoplaying
video in project panels; a third webfont; TypeScript or JSX.

The films are local and play only in the dialog. The panel's film frame is a
generated still. That is a page-weight and attention decision, not a missing
feature.

## Docs map

| File | Read it for |
|---|---|
| `AGENTS.md` | Routing, vocabulary, constraints, verification — start here |
| `README.md` | The design reasoning and the measurements behind the art, scrims, rail and type |
| `tools/README.md` | Which dev tools survive, which are retired, and what each one does |
| `docs/library/README.md` | The component library: one page per component plus the selector index and the data contract, and the checker that keeps them honest |
| `css/styles.css` | The section banners and the actual values |
| `files/fonts/README.md` | The vendored families, licences and SHA-256 pins |
| `files/icons/README.md` | The vendored glyphs — currently unused by this page |
| `docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md` | The design record for this page |
| `docs/superpowers/plans/2026-10-25-amorsolo-profile.md` | The implementation plan and the polish pass |
| `docs/superpowers/` (everything earlier) | Historical design records from earlier builds — never hand-edited |
| `tests/` · `tools/` | The guard/data suites and the dev tools themselves |
