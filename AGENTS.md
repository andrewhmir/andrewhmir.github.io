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

A static personal portfolio: **no build step, no bundler, no remote third-party
runtime loads.** Lenis, the one vendored library, adds a smooth wheel glide to
an otherwise native vertical scroll. `index.html` opens directly;
`node tools/serve.mjs 3333` serves it when video, fonts or screenshots need
HTTP. Node is only for tests and dev tools.

The page is a vertical profile, in this order: fixed masthead → hero (`#top`) →
About (`#about`) → News (`#news`) → Work (`#work`, three category panels — Applications,
DSH Plugins and Robotics — each with three project cards) → Leadership (`#leadership`) →
Honours (`#honours`) → Contact (`#contact`) → footer. A card opens `#projectView`,
the fixed full-screen project panel painted from `PORTFOLIO`. A fixed journey rail
(≥1024px) tracks the section crossing the middle of the viewport and carries the
page's scroll progress. One shared
record dialog serves every project, every leadership record, and every honour
that has photographs; it stacks above the project view.

Every stop is a full-width rounded panel painted by a different crop of one of
two saved Amorsolo paintings. A direction-aware scrim keeps the copy side dark
while the far side of the painting stays daylight-bright. The shell is static;
the sections, rail and dialog content are rendered from `PORTFOLIO` by
`js/main.js`.

The page was built as `preview.html` + `css/profile.css` + `js/profile.js`, then
promoted by rename into its final names and the preview copies deleted. Edit only
`index.html`, `css/styles.css`, `js/main.js`; `js/vendor/` is copied verbatim
and never hand-edited.

## The files

| File | Size | Holds |
|---|---|---|
| `index.html` | ~140 lines | The shell: meta/OG/canonical, `css/fonts.css` then `css/styles.css` and the vendored `js/vendor/lenis.css`, masthead, rail shade, rail nav, empty `#page`, the project view layer, footer, `<noscript>` fallback, the one dialog, then `js/vendor/lenis.min.js` before `js/data.js` before `js/main.js`. |
| `css/styles.css` | ~740 lines | All styling: tokens, the `html.lenis` scroll override, masthead, rail shade, rail + its progress fill, panels/art/scrims, type, frames, category cards, project extras, project view, leadership, honours, news list, contact, footer, dialog, reveals, responsive. Section banners are the map. |
| `js/main.js` | ~700 lines | `PAN` (the page art order) and `PROJECT_ART` (each record's view crop), `esc`/`paragraphs`/`panel`/`frame`, `projectCopy`/`projectMedia`, `categoryCopy`/`categoryCards`, `render()`, the project view (`openProject`, `closeProject`, `setLock`, `trapTab`), the dialog (`openRecord`, `closeDialog`, `gallery`), `buildRail`, `wireReveals`, `wireChrome`, `wireDelegation`, `wireSmoothScroll`. Publishes `window.Profile`. |
| `js/data.js` | ~580 lines | `PORTFOLIO` — the portfolio records and personal copy — plus three `Site` helpers: `deriveRooms`, `honoursTiles` and `posterFor` (with the `ROOM_TITLES`/`ROOM_ORDER` tables `deriveRooms` reads). Everything the page does not call was deleted. |
| `js/vendor/` | vendored | Lenis 1.3.26 (`lenis.min.js` + `lenis.css`), copied verbatim; sizes and SHA-256 pins in its README. The page's only third-party runtime code, loaded locally. |
| `css/fonts.css` | generated | The `@font-face` rules for Newsreader and Courier Prime. Do not hand-edit; refresh with `tools/vendor-fonts.mjs`. |
| `files/` | assets | The two paintings (JPEG sources plus generated WebP and AVIF), portrait, project overview/team photographs as WebP, six films, generated `posters/`, generated `og-card.jpg`, favicon, vendored fonts, and `files/plugins/` — the nine GUI screenshots the DSH plugin records hang, as WebP. |
| `tests/page.test.mjs` | ~230 lines | The static guard: shell order, palette, the paintings and their `image-set()` formats, dialog markup, no third-party loads, the vendored Lenis wiring, section ids, data counts, and that `npm test` runs it. |
| `tests/*.test.mjs` | data suites | `derive-rooms` (the `Site.deriveRooms` grouping) and `hang` (the poster rule, and that every shipped video still and plugin screenshot is on disk). Neither renders the page. |
| `tools/` | dev only | Static server, image/font generators, WebP/AVIF encoder, asset import, orphan scan, library checker. `tools/README.md` indexes what each one does. |
| `docs/superpowers/` | historical | Specs and plans. Never hand-edit; read for the design record. |

The two data suites are **not** a renderer test. The old walk's DOM stub,
`shell-check`, `renderer`, `lights`, `delegation`, `band`, `gallery-index` and
`award-photos` suites are gone with the helpers they tested. `npm test` green
means the guard strings and data shapes still hold; it does not mean the page
laid out. See **Run and verify**.

## Where to change what

Route by **intent**, not by file.

For a component's full edit surface — its markup, renderer function, stylesheet
section, data fields, tests and traps — open
[`docs/library/README.md`](docs/library/README.md). This table is the intent
router; the library is the per-component depth behind it.

| Intent | Goes in | Anchor |
|---|---|---|
| Hero name, title, sentence, actions | `js/data.js` + `js/main.js` | `name:`, `title:`, `heroLine:`; `/* 0 — hero */` |
| About copy, portrait, social row | `js/data.js` + `js/main.js` | `/* 1 — about */`, `P.bio.map`, `sectionSocial()` |
| News rows and the News stop's copy | `js/data.js` + `js/main.js` | `news: [`, `/* 2 — news */` |
| Section order, or removing a section | `js/main.js` | `function render()`, then the `out.push` blocks `/* 0 — hero */` … `/* 6 — contact */` |
| Add or edit a project | `js/data.js` | `projects: [` — array order is card order inside the category; the `category` field decides the panel and the id stays the honours link |
| A project's copy and award list | `js/main.js` + `js/data.js` | `function projectCopy(`, the project's `awards: [` |
| A project's three media frames | `js/main.js` | `function projectMedia(`, `function frame(` |
| Which painting and crop each stop uses | `js/main.js` + `css/styles.css` | `var PAN = [`; `.art--rice`, `.art--harvest`; `background-position: var(--pos`; `PROJECT_ART` for the project view |
| A scrim, or which side the copy sits on | `css/styles.css` + `js/main.js` | `.stop[data-side="left"]`, `"right"`, `"center"`, `.stop--hero`, `.stop--contact`; `panel()` sets `data-side` |
| Contact closing and its dark card | `js/main.js` + `css/styles.css` | `/* 6 — contact */`; `.stop--contact .stop-in::before` |
| Leadership cards | `js/data.js` + `js/main.js` | `leadership: [`; `P.leadership.map` |
| Honours list, and which awards stay on projects | `js/data.js` + `js/main.js` | `honors: [`, `from: 'project`; `S.honoursTiles(P.honors)` |
| The dialog, its focus trap, Escape, restore | `index.html` + `js/main.js` | `#dialog`; `function openRecord(`, `function closeDialog(`, the `keydown` trap |
| The project video player | `js/main.js` | `dialog__video`; poster from `S.posterFor` |
| The journey rail, its active state and the page-progress fill | `js/main.js` + `css/styles.css` | `function buildRail(`, `wireChrome`; `.rail`, `.rail::before`, `.rail-shade`, `--rail-progress` |
| Masthead stickiness and the small-screen progress hairline | `js/main.js` + `css/styles.css` | `wireChrome`; `.masthead.is-stuck`, `.progress` |
| Smooth wheel scrolling, anchor travel, dialog scroll lock | `index.html` + `js/main.js` + `css/styles.css` | `js/vendor/lenis.min.js` before `js/data.js`; `function wireSmoothScroll(`; `function wireAnchors(`; `html.lenis`; `lenis.stop()` |
| Reveals and reduced motion | `js/main.js` + `css/styles.css` | `function wireReveals(`; `[data-reveal]`, `prefers-reduced-motion` |
| Palette | `css/styles.css` | `:root`, `--night: #080c0e` |
| Type | `css/styles.css` + `css/fonts.css` | `--serif:`, `--mono:`, `h1 {`, `h2 {`, `h1 {` in the responsive block |
| Radii | `css/styles.css` | `--panel-radius:`, `--frame-radius:`, `.btn` |
| Responsive layout | `css/styles.css` | `@media (min-width: 1024px)`, `@media (max-width: 639px)` |
| Page title, description, Open Graph card | `index.html` | `og:image`, `twitter:image`, `<title>` |
| Missing photographs | `files/` + `js/data.js` + `tools/import-photos.mjs` | the record's `images: [` / `team.image`; `MAPPING`; then `python tools/optimize-images.py` |
| Image weight or format | `tools/optimize-images.py` + `js/data.js` + `css/styles.css` | `.webp` paths; `.art--rice`/`.art--harvest` `image-set()`; `og-card.jpg` stays JPEG |

Do not hand-copy project or honour text into `index.html` or `js/main.js`. The
shell owns chrome and the no-JS fallback; `PORTFOLIO` owns the records. Section
headings, frame labels and button text are literals in `render()`.

## Vocabulary

The code names things precisely. Half the cost of a change is using the wrong
word and editing the wrong thing.

| Term | Means | Code |
|---|---|---|
| **stop / section** | One unit of page order: hero, About, News, one Work category, Leadership, Honours, Contact. `#work` itself is a wrapper `div.work`, not a stop. | `section.stop`, `.stop--category`; a rail entry is `.rail__stop` |
| **panel** | The painted surface of a stop: the rounded box, its art layer and its scrim. | `.stop`, `.stop::before`, `.stop::after` |
| **art pan** | The crop chosen by `background-position` for this stop. Not an animation and not a separate image. | `--pos`, `PAN`, `PROJECT_ART` |
| **painting** | One of the two source images. `rice` is `painting-hero.jpg` (*Planting Rice*, 1949); `harvest` is `painting.jpg` (a 1934 harvest scene). | `.art--rice`, `.art--harvest` |
| **scrim** | The direction-aware gradient over the art that keeps the copy side dark and the far side bright. | `--scrim`, `.stop[data-side]`, `.stop::after` |
| **rail** | The fixed left-hand journey nav with one stop per named section (not the hero). | `.rail`, `.rail__stop`, `buildRail` |
| **left shade** | The fixed 144px gradient behind the rail so its label chips stay legible over bright crops. | `.rail-shade` |
| **smooth scroll** | The vendored Lenis wheel layer: it smooths the wheel and the travel to a clicked in-page anchor; the click never rewrites the URL (no `#section`, no history entry); touch, the keyboard and reduced motion stay native. | `js/vendor/lenis.min.js`, `wireSmoothScroll`, `wireAnchors`, `html.lenis`, `lenis.stop()` |
| **frame** | One media box in a project's stack: the overview, the film still or the team photograph. | `.frame`, `.frame--lead` |
| **film still / poster** | The generated `files/posters/<stem>.jpg` shown in the film frame. The page does not play it in the panel; the player is in the dialog. | `S.posterFor`, `.frame__play` |
| **record** | One authored project, leadership entry or honour in `PORTFOLIO`. | `P.projects`, `P.leadership`, `P.honors` |
| **dialog** | The one shared modal. Prefer “record dialog” to “modal” when routing. | `#dialog`, `.dialog__card`, `openRecord` |
| **project card** | One project button inside a category panel; it opens that record's project view. | `.project-card`, `data-kind="panel"` |
| **project view** | The fixed full-screen project panel a card opens (`← Robotics` / Escape closes it). A view, not a route. | `#projectView`, `openProject`, `closeProject`, `setLock` |
| **honours tile** | One standalone honour row in the Honours list. Project awards are not tiles; they live as text on the project panel. | `.honour-row`, `Site.honoursTiles` |
| **news row** | One dated update in the News stop; a list item, not a button — there is no news record to open. | `.news-row`, `P.news.map` |
| **awaited frame** | A frame reserved for a photograph that is not there yet: dashed, labelled “Awaiting photograph”, not a button. Only an empty `src` or `PlaceHolder.png` becomes awaited. | `.frame--awaited`, `isAwaited` |
| **project award** | An honour carrying `from: 'projectN'`, excluded from the Honours tiles and shown under the project's Awards. | `from: 'projectN'`, `honoursTiles.projectAwards` |

**Retired vocabulary — do not present any of it as live:** hall, room, stand,
cluster, hang cell, legend, dock, snap, mural, the dragon-frieze wall, and the
exhibition-label idea. They belong to the horizontal build this page replaced,
and their code, tools and assets have been deleted. Do not restore any of it.
Lenis is the one word that came back: the vendored library is the vertical page's
smooth-wheel layer (see **smooth scroll** above), not the walk's engine — the
walk's `lenis/snap` code stays retired.

## Hard constraints

These are the constraints a change must not break. “Pinned by” is deliberately
specific: a constraint that only a review catches is marked as such.

| Constraint | What it means | Pinned by |
|---|---|---|
| **No third-party runtime loads** | No remote script, stylesheet, image or `url(http…)`. Fonts, icons, paintings and films are local. Anchor `href`s and meta URLs may be absolute; resource loads may not. | `tests/page.test.mjs`, scanning `index.html` and `css/styles.css` with comments stripped, and `js/main.js` / `js/data.js` raw |
| **Palette tokens are exact** | `--night #080c0e`, `--text #ece2cf`, `--text-strong #f9f4e8`, `--text-quiet #9a9384`, `--accent #d4b06a`; border `rgba(236,226,207,.14)`. | `page.test.mjs` asserts the five colour strings; the border alpha is not separately asserted |
| **Both paintings and the art layers exist** | `.art--rice` names `painting-hero` and `.art--harvest` names `painting`, each as AVIF → WebP → JPEG through `image-set()`, with the plain JPEG `--art` value as the no-`image-set` fallback; `.stop::before` and `background-position: var(--pos` are the layers. | `page.test.mjs` |
| **Radii** | Panels 16px, frames 10px, buttons 8px; panel 12px below 640. | `page.test.mjs` pins the two tokens; the button radius is a CSS rule |
| **Load order** | `css/fonts.css` before `css/styles.css`; `js/vendor/lenis.min.js` before `js/data.js`; `js/data.js` before `js/main.js`; `#page` empty; dialog markup present; `<noscript>` present. | `page.test.mjs` |
| **The retired build stays out of the shell** | `icons.js`, `#hall`, `#strip`, `dock-track`, `wall-mushoku` must not appear in `index.html` (comments stripped), even though their files are deleted. Lenis is the deliberate exception: the vendored library is the page's smooth-wheel layer now. | `page.test.mjs` |
| **The dialog stays accessible** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialogTitle"`, a labelled close button; `openRecord` saves focus, focuses the card, traps Tab, closes on Escape/overlay/button and restores focus; body scroll is locked while open. | Markup is pinned by `page.test.mjs`; the trap and restore are behaviour in `js/main.js` and are **not** unit-tested |
| **Reduced motion is honoured** | `prefers-reduced-motion` disables reveals and smooth scrolling, and Lenis is never constructed; the JS marks every reveal visible instead of observing. | `page.test.mjs` pins the string; the CSS media query and the JS branches implement it; behaviour is manual |
| **Smooth scroll is progressive** | Lenis is vendored local (no CDN), loaded before `js/data.js`; `wireSmoothScroll` skips construction without `window.Lenis` or under reduced motion; an in-page anchor click (`wireAnchors`) scrolls through it when active and natively otherwise, and never writes `location.hash` or a history entry; touch and the keyboard stay native; `html.lenis` turns the CSS ease off so it cannot fight the library; the dialog and the project view stop it while open through the shared `setLock` count and their own scroller opts out with `data-lenis-prevent`. | Shell order, the strings and the absence of `history.pushState`/`replaceState` are pinned by `page.test.mjs`; the wheel, anchor and layer behaviour are manual |
| **No build step** | No bundler, no build script, no npm runtime dependency; Node runs tests and tools only. | `package.json`; `page.test.mjs` pins that the guard is in the test script |
| **One `<h1>`** | The renderer emits the hero's `h1`; the no-JS fallback is the only one when JS is off. With JS on, `<noscript>` is raw text and contributes no element. | Not counted by `page.test.mjs`; keep it by inspection |
| **No content twice in one viewport** | The page prints each name, action and sentence once per screen. The fixed masthead hides its wordmark and Resume while the hero (which carries both) is on screen; the section social rows omit the masthead's Resume; the About heading is not the name, the footer does not repeat it, and the hero line is `P.heroLine` instead of a `bio` paragraph. Navigation labels and numbered kickers are chrome, not content, and stay. | `page.test.mjs` pins the masthead stand-down CSS rule, `P.heroLine` (and that `bio` does not contain it), `sectionSocial()`, and the absence of `foot__name`; the visual result is manual |
| **The content counts** | Nine projects in three categories of three, four leadership cards, five standalone honour tiles, four news rows; `PORTFOLIO.social[0].label === 'Resume'`. | `page.test.mjs` |
| **The guard follows the promoted names** | `page.test.mjs` reads `index.html`, `css/styles.css`, `js/main.js`, `js/data.js`, `package.json`. Renaming any of them without updating the guard fails it. | `page.test.mjs` |
| **CSS braces balance** | An unmatched brace silently eats the rest of the sheet. | `page.test.mjs` |

The guard is static and data-only. It does not execute `render()`, measure a
panel, or model CSS. Treat green as the floor, not as proof the page works.

## Run and verify

```powershell
node tests/page.test.mjs      # the static guard, alone
npm test                      # guard + data suites + library check
node tools/serve.mjs 3333     # http://127.0.0.1:3333/
```

`npm test` runs, in order: `page.test.mjs`, `derive-rooms.test.mjs`,
`hang.test.mjs`, then `tests/library.test.mjs`. The data suites are pure
and print `ok` per check; they use `tests/harness.mjs`, not `node --test`. `hang`
is the one that also asserts every shipped project video has its poster still on
disk and every plugin screenshot is present.

The old DOM/browser suites are retired. **There is no automated layout check for
this page.** Use headless Chrome screenshots at 1440×900, the spec's 1280×704
floor, and 390×844, and look for:

- no horizontal scrollbar, and no title overflow (`C.E.N.T.H.R.O.` and
  `BiyaHey!` at 390px);
- the copy side dark enough to read, the far side still painting;
- the rail labels, active tick and gold progress fill over the brightest crop;
- the dialog fitting the viewport, its video controls reachable, Tab staying
  inside, Escape returning focus to the button that opened it;
- a project card opening `#projectView` at the record's own crop, its back
  button and Escape returning focus to that card, its own wheel/touch scrolling
  while the page stays locked, Shift+Tab staying inside, and the dialog stacking
  above it;
- the wheel gliding and settling (`window.Profile.lenis` truthy), a long
  recorded dialog wheel/touch-scrolling its own card while the page stays put,
  and a reduced-motion reload leaving `html.lenis` off and
  `window.Profile.lenis` null;
- the masthead menu and the rail scrolling to their sections while the address
  bar keeps the URL the page loaded with — no `#section`, no new history entry —
  with Lenis active and after a reduced-motion reload.

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

## Deployment

The site deploys as static files to GitHub Pages at `andrewhmir.github.io` (the
`canonical` and `og:url` in `index.html`). There is no deploy pipeline, no build
step and no server-side code: what ships is the working tree. `.nojekyll` at the
repo root keeps Jekyll from processing the tree, which is the one deployment
file. Image weights are committed, not generated at deploy time — after adding
or re-importing a photograph run `python tools/optimize-images.py` and commit
both the `.webp` and the record's path. `npm test` before pushing is the only
gate.

## Gotchas

- **The preview trio is gone on purpose.** `preview.html`, `css/profile.css` and
  `js/profile.js` were the build copies and were deleted on promotion. A
  reintroduced preview would fork the page and can render stale CSS/JS while the
  real page ignores it; `page.test.mjs` only reads the promoted names.
- **The walk's leftovers are deleted, not dormant.** `js/icons.js`,
  `files/icons/`, `files/wall-mushoku.webp`, `vendor-icons.mjs`,
  `caption-worklist.mjs` and the retired probes are gone. `js/vendor/` is the
  exception: Lenis is loaded by `index.html` and constructed by
  `wireSmoothScroll` (its `lenis-snap` sibling is still absent).
  `page.test.mjs` still rejects the old names in `index.html` as tombstones.
- **Lenis is a wheel layer, not the page's scrolling.** It is constructed only
  when the visitor allows motion; `window.Profile.lenis` is the live instance
  (or `null`). `html.lenis { scroll-behavior: auto }` is load-bearing: with the
  CSS ease left on, every Lenis frame would start its own native smooth
  animation. Lenis subtracts an element's own `scroll-margin-top` in
  `scrollTo`, so the anchor handler only passes the panels' clearance as an
  offset for targets without one (`#work`, `#page`); adding both would double
  it. The dialog and the project view stop Lenis through the shared `setLock`
  count or the wheel fights the body scroll lock, and both carry
  `data-lenis-prevent`: a stopped Lenis still cancels the wheel/touch it would
  otherwise capture, so without the attribute a long record could not scroll.
- **`files/painting.jpg` is live.** It is the About/News/Hivemind/Focus
  Buddy/BiyaHey/Honours art (`art--harvest`). Older cleanup notes called it an
  orphan because the retired page did not use it; that is no longer true. Do not
  delete it as an unreferenced image.
- **`files/painting-hero.jpg` is the OG source and the last fallback.** The page
  requests `painting-hero.avif` or `.webp` through `image-set()`; the JPEG is the
  no-`image-set` fallback and the source `tools/make-images.mjs` draws
  `files/og-card.jpg` from, and `index.html` points `og:image` at the card.
  Deleting the JPEG makes the share card unreproducible. `og-card.jpg`,
  `files/posters/*.jpg`, the `.webp` files and `.avif` files are generated; do
  not hand-edit them — regenerate with `tools/make-images.mjs` and
  `tools/optimize-images.py`.
- **A missing photograph is not the same as an awaited frame.** Awaited means
  the data says `PlaceHolder.png` (or has no `src`); it renders the dashed,
  non-clickable frame. A path that points at a file which is not on disk renders
  an `<img>` whose `onerror` swaps in `PlaceHolder.png` — that path is a bug now,
  because every shipped reference resolves. The four photographs that never
  arrived (Commencement ×2, Work Immersion and the 2023 National Youth Congress)
  carry **no** `images` field, so their honour rows are disabled. Every
  leadership record now ships photographs; one with none would render the
  "no photo" thumb. To add a photograph, import it with
  `tools/import-photos.mjs`, run `optimize-images.py`, then wire the `.webp` path.
- **HiveMind and SATLearn teams are explicit placeholders.** Their `team.image`
  is `PlaceHolder.png`, so they render awaited frames. `tools/make-images.mjs`
  has a `STILLS` table that can derive team stills from the project videos, but
  the outputs are not in `files/` and `js/data.js` still points at the
  placeholder. That is a content decision, not a layout fix.
- **Data carries only what the page reads.** The retired walk's fields (`nav`,
  `authors`, `source`, `report`, `pieces` on leadership/honours, `profileImage`,
  `favicon`, `scrollerIcon`, social/link `icon`, `news[].images`) were deleted
  with their helpers and suites. `projects[].pieces` survives because
  `projectMedia` reads it for a plugin record's screenshot labels. Check
  `js/main.js` before adding a field you expect to appear, and document it in
  `docs/library/data.md` or `npm test` fails.
- **The hero line is `P.heroLine`, not a bio paragraph.** The hero prints
  `PORTFOLIO.heroLine`; About prints `P.bio`. That sentence used to sit at
  `bio[3]`, which printed it in two stops at once — keep it out of `bio`. The
  portrait is hard-coded as `files/profile.jpg` in `js/main.js`; there is no data
  field for it, and bio order does not move the hero.
- **The masthead stands down over the hero.** `.masthead:not(.is-stuck) .brand`
  and `.resume` are `visibility: hidden` while the hero is on screen;
  `wireChrome`'s existing `is-stuck` toggle is the reveal. Do not remove the rule
  to “restore” the bar at the top — the hero already prints both.
- **`PAN` is indexed by page position; `PROJECT_ART` by project id.** A tenth
  project does not shift `PAN` (categories are the stops) but needs a
  `PROJECT_ART` entry or its view falls back to the category's crop, then
  `50% 50%`; the guard asserts nine projects in three rooms of three. Adding a
  category shifts every later `PAN` entry — including the hard-coded Leadership
  `PAN[6]`, Honours `PAN[7]` and Contact `PAN[8]` — so update those and the
  guard together. A category whose name has a space gets a slugged id
  (`function roomSlug(`) for the panel and its rail anchor.
- **A plugin record hangs screenshots, not a film and a team.** The three DSH
  Plugins records carry `projects[].shots` instead of `video` / `team`, and
  `projectMedia` hangs those three images with the record's own `pieces` labels;
  `openRecord` puts the same three in the dialog gallery. Their `overview.image`
  is also the card still, so it is normally `shots[0]`. `tests/hang.test.mjs`
  scopes its video checks to records that declare a video and checks every
  plugin screenshot is on disk.
- **The art/scrim stacking is deliberate.** `.stop` sets `isolation: isolate`;
  the art is `::before` at `z-index: -2`, the scrim `::after` at `-1`, and the
  contact card is a `::before` on `.stop-in` at `-1`. A new positive-z layer
  hides the art; removing `isolation` lets the negative layers escape.
- **Newsreader is vendored at 400/500/600, not 300.** The CSS asks for 300 on
  display text; the browser serves the closest declared face (400). A real 300
  needs a new vendored face, not a number change.
- **The data suites still say room.** `derive-rooms.test.mjs` names the grouping
  by its inherited noun because `Site.deriveRooms` returns `key`/`title`/`lede`;
  the page's UI says category and panel. Do not “fix” the page to match the
  suite's vocabulary.
- **Scroll lock is a count.** The project view and the record dialog both call
  `setLock`; closing one must not release the page or restart Lenis while the
  other is still open. The project view is injected with no `data-reveal` — the
  reveal observer runs once at init, so an attribute there would stay invisible.
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
`node --test`; an icon font or an icon script; scroll snap or a
horizontal page; a mobile menu drawer; inline or autoplaying
video in project panels; a third webfont; TypeScript or JSX.

The films are local and play only in the dialog. The panel's film frame is a
generated still. That is a page-weight and attention decision, not a missing
feature.

## Docs map

| File | Read it for |
|---|---|
| `AGENTS.md` | Routing, vocabulary, constraints, verification — start here |
| `README.md` | The design reasoning and the measurements behind the art, scrims, rail and type |
| `tools/README.md` | Which dev tools survive and what each one does |
| `docs/library/README.md` | The component library: one page per component plus the selector index and the data contract, and the checker that keeps them honest |
| `css/styles.css` | The section banners and the actual values |
| `files/fonts/README.md` | The vendored families, licences and SHA-256 pins |
| `docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md` | The design record for this page |
| `docs/superpowers/plans/2026-10-25-amorsolo-profile.md` | The implementation plan and the polish pass |
| `docs/superpowers/` (everything earlier) | Historical design records from earlier builds — never hand-edited |
| `tests/` · `tools/` | The guard/data suites and the dev tools themselves |
