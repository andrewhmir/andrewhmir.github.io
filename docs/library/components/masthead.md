# Masthead

The fixed header bar: the brand, the section menu, the resume action and the
hairline that tracks how far the page has been scrolled.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<header class="masthead" id="masthead">` · `<a class="brand" href="#top">Andrew Alangcao</a>` |
| Markup | `index.html` | `<nav class="menu" aria-label="Sections">` · `<a class="resume" id="resumeLink"` |
| Markup | `index.html` | `<div class="progress" id="progress" aria-hidden="true"></div>` |
| Render | `js/main.js` | `function wireChrome(` · `masthead.classList.toggle('is-stuck'` |
| Render | `js/main.js` | `var resumeLink = P.social.filter(` · `progress.style.width` |
| Styles | `css/styles.css` | `── Masthead` · `.masthead.is-stuck` · `--masthead-h:` |
| Styles | `css/styles.css` | `.brand` · `.menu a` · `.resume` · `.progress` |
| Data | `js/data.js` | `social[].label` · `social[].url` |
| Test | `tests/page.test.mjs` | `P.social[0].label` |

## Structure

`header.masthead#masthead` is fixed to the top and sized by `--masthead-h:`. It
holds `a.brand` (jumps to `#top`), `nav.menu` with four section jumps,
`a.resume#resumeLink`, and `div.progress#progress`. `.is-stuck` is toggled on the
header once the scroll passes the hero; `.progress` is a 1px gold bar whose width
is the scroll fraction.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Brand text or home target | `<a class="brand" href="#top">` in `index.html` | screenshot; the brand returns to the hero |
| Menu links and their order | `<nav class="menu" aria-label="Sections">`; each `href` must match a rendered section id | click each link; the target panel exists |
| Resume URL | the markup only starts at `#`; `wireChrome` copies the URL of the `social` entry labelled `Resume` | `npm test` pins `P.social[0].label`; click Resume |
| Header height | `--masthead-h:` in `css/styles.css`; panels' `scroll-margin-top` reads it too | jump to an anchor; the panel top clears the bar |
| When the bar turns solid | `masthead.classList.toggle('is-stuck', y > Math.max(120, heroH - 72))` | scroll across the hero edge |
| Hairline colour or thickness | `.progress` (`height`, `background`) | screenshot at the bottom of the page |
| Menu visibility on small screens | `@media (max-width: 1023px)` hides `.menu`; no drawer exists | 390×844 screenshot |

## Invariants

- One header, fixed, with its height in `--masthead-h:`; see AGENTS.md's
  **Masthead stickiness and progress hairline** row for the route.
- `.progress` is `aria-hidden` decoration: width 0–100% of the scrollable part
  of the document, never anything interactive.
- `#resumeLink` ships with `href="#"` and is filled at init from data; the URL is
  never hard-coded in the markup.
- The menu is anchor jumps to ids the renderer emits; it is not a drawer, and
  AGENTS.md's **Deliberately absent** list forbids adding one unasked.
- The bar's type and button styling belong to `primitives/type.md` and
  `primitives/controls.md`; this page owns the bar's box and behaviour.

## Traps

- `is-stuck` flips at `Math.max(120, heroH - 72)`: if `#top` has not rendered,
  `heroH` is 0 and the bar sticks at 120px instead of the hero edge.
- `wireChrome` looks up `#resumeLink` and `#progress` once at init; renaming
  either id silently leaves the resume at `#` and the hairline at width 0.
- The progress maths clamps to 100% and falls back to 0 when the document is
  shorter than the viewport, so a short page shows no hairline.
- `--masthead-h:` also feeds panels' `scroll-margin-top`, which adds 12px to the
  bar height, so resizing the bar changes where every in-page jump lands.
- Below 1024px `.menu` is `display: none` with nothing replacing it; hiding it
  is deliberate, not a missing feature.
