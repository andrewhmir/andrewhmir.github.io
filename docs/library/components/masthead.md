# Masthead

The fixed header bar: the brand, the section menu, the resume action and the
scroll-progress hairline on small screens. The menu is centre-anchored on the
page; over the hero the brand and resume stand down — the hero prints both.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<header class="masthead" id="masthead">` · `<a class="brand" href="#top">Andrew Alangcao</a>` · `<nav class="menu" aria-label="Sections">` · `<a class="resume" id="resumeLink"` · `<div class="progress" id="progress" aria-hidden="true"></div>` |
| Render | `js/main.js` | `function wireChrome(` · `masthead.classList.toggle('is-stuck'` · `var resumeLink = P.social.filter(` · `progress.style.width` |
| Styles | `css/styles.css` | `── Masthead` · `.masthead.is-stuck` · `--masthead-h:` |
| Styles | `css/styles.css` | `.masthead:not(.is-stuck)` · `.brand` · `.menu a` · `.resume` · `.progress` |
| Data | `js/data.js` | `social[].label` · `social[].url` |
| Test | `tests/page.test.mjs` | `P.social[0].label` |

## Structure

`header.masthead#masthead` is fixed to the top and sized by `--masthead-h:`. It
is a flex row: `a.brand` (jumps to `#top`) left, `a.resume#resumeLink` right
through its `margin-left: auto`, and `nav.menu` with five section jumps taken
out of the flow and centred with `left: 50%` / `transform: translate(-50%, -50%)`.
That keeps the bar's only visible element over the hero on the page's centre
line and lets the wordmark and Resume fade in and out without moving it.
`.is-stuck` is toggled once the scroll passes the hero and is also the reveal
for the brand and resume: while it is off they are `visibility: hidden`, so the
bar never repeats the hero's own name and button. The links' caps are nudged
down 3px with asymmetric padding (`11px 2px 5px`) because the mono face has
more descent than ascent and a symmetric box reads high; the hit box stays 35px.
`.progress` is 1px of gold whose width is the section fraction the rail fill
shows (0 at the hero, 100% at Contact); it is `display: none` from 1024px up,
where the rail draws progress instead, and is the small-screen cue below.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Brand text or home target | `<a class="brand" href="#top">` in `index.html` | screenshot; the brand returns to the hero |
| Menu links and their order | `<nav class="menu" aria-label="Sections">`; each `href` must match a rendered section id | click each link; the target panel exists |
| Where and how the menu sits | `.menu`'s `left`/`top: 50%` + translate pair centres it on the page, not between brand and Resume; `.menu a`'s asymmetric `padding: 11px 2px 5px` centres the caps optically | hero shots at 1440/1024: links' centre = viewport centre; crop the bar and compare the caps' ink centre with the midline |
| Resume URL | the markup only starts at `#`; `wireChrome` copies the URL of the `social` entry labelled `Resume` | `npm test` pins `P.social[0].label`; click Resume |
| Header height | `--masthead-h:` in `css/styles.css`; panels' `scroll-margin-top` reads it too | jump to an anchor; the panel top clears the bar |
| When the bar turns solid | `masthead.classList.toggle('is-stuck', y > Math.max(120, copyEnd))` — `copyEnd` is the hero copy's page-bottom, measured in `update()` | scroll across the hero edge; the bar must not show its Resume while the hero's is still on screen, at 1440 and 390 |
| What the bar repeats over the hero | `.masthead:not(.is-stuck) .brand` and `.resume` in `css/styles.css`; keeping them hidden at the top is deliberate | top of the page: one name and one Resume (the hero's); past the hero: the bar's copies fade in |
| Hairline colour or thickness | `.progress` (`height`, `background`); it is visible below 1024px only | 390×844 screenshot |
| Menu visibility on small screens | `@media (max-width: 1023px)` hides `.menu`; no drawer exists | 390×844 screenshot |

## Invariants

- One header, fixed, its height in `--masthead-h:`; see AGENTS.md's **Masthead
  stickiness and the small-screen progress hairline** row.
- The menu is centred on the page, not on the space between the brand and the
  Resume, so those standing down never shift it.
- `.progress` is `aria-hidden` decoration: width 0–100% of the seven-stop
  journey, never interactive; it is the small-screen fallback for the rail's
  fill, not a second indicator.
- The bar never repeats what the page is already showing: over the hero its
  wordmark and Resume are hidden, and the `is-stuck` state that gives the bar
  its background reveals them.
- `#resumeLink` ships with `href="#"` and is filled at init from data; the URL
  is never hard-coded in the markup.
- The menu is anchor jumps to ids the renderer emits; it is not a drawer, and
  AGENTS.md's **Deliberately absent** list forbids adding one unasked.

## Traps

- `is-stuck` flips at `Math.max(120, copyEnd)`: `copyEnd` is the hero `.copy`
  box's page-bottom, so the bar reveals only after the hero's name and Resume
  have passed. Measuring the panel instead (`heroH - 72`) fires early on phones,
  where the panel is content-height, and shows two Resume buttons at once.
- Removing the `.masthead:not(.is-stuck)` hide rule puts "Andrew Alangcao" and
  Resume on screen twice at the top of the page; the hero carries both.
- `.menu` is out of the flex flow, so its percentages resolve against the fixed
  header's padding box; putting it back in the flow reintroduces the drift,
  because the hidden brand and Resume still occupy space. `.resume` relies on
  `margin-left: auto` now that the menu no longer pushes it right.
- The 3px nudge is metric-specific: if the menu's family or size changes,
  re-measure the caps against the bar's midline instead of forcing symmetric
  padding.
- `wireChrome` looks up `#resumeLink`, `#progress` and `#rail` once at init;
  renaming an id silently leaves the resume at `#`, the hairline at 0% or the
  rail fill unwritten.
- `.progress` is `display: none` from 1024px up and re-shown by the 1023px
  block; removing either half silently loses the small-screen cue. The hairline
  is anchored to sections, not raw scroll, so page length does not skew it.
- `--masthead-h:` also feeds panels' `scroll-margin-top` (+12px), so resizing
  the bar changes where every in-page jump lands.
- Below 1024px `.menu` is `display: none` with nothing replacing it; hiding it
  is deliberate, not a missing feature.
