# Page shell

The static document frame around the renderer: the empty `#page` mount, the
stylesheet and script load order, the skip link, and the no-JS fallback.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<main id="page" class="page"></main>` · `<a class="skip" href="#page">Skip to content</a>` |
| Markup | `index.html` | `<link rel="stylesheet" href="css/fonts.css">` · `<link rel="stylesheet" href="css/styles.css">` · `<link rel="stylesheet" href="js/vendor/lenis.css">` |
| Markup | `index.html` | `<script src="js/vendor/lenis.min.js"></script>` · `<script src="js/data.js"></script>` · `<script src="js/main.js"></script>` |
| Markup | `index.html` | `<noscript>` · `<section class="noscript">` |
| Render | `js/main.js` | `function init(` · `page.innerHTML = '';` |
| Styles | `css/styles.css` | `.page` · `.skip` · `.skip:focus` · `.sr-only` |
| Test | `tests/page.test.mjs` | `id="page" class="page"` · `<noscript>` |

## Structure

`<head>` loads `css/fonts.css`, `css/styles.css`, then the vendored
`js/vendor/lenis.css`. In `<body>`: `a.skip` → `header.masthead` →
`div.rail-shade` → `nav.rail#rail` → empty `main#page.page` → `footer.foot` →
`<noscript>` → `div#dialog` → `script[src="js/vendor/lenis.min.js"]` →
`script[src="js/data.js"]` → `script[src="js/main.js"]`. `init()` calls
`render()` first, so the mount is filled after the document has parsed, then
`wireSmoothScroll()` constructs the wheel layer.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| What the page renders | `render()` in `js/main.js`; the shell keeps `#page` empty | `npm test` pins the empty mount |
| Skip-link text or jump target | `<a class="skip" href="#page">` and `.skip:focus` | press Tab once on load |
| Font or stylesheet order | the three `<link rel="stylesheet">` lines in `<head>` | `npm test` pins fonts before styles and the Lenis sheet after them |
| A remote script, font or image | nowhere: AGENTS.md's no-third-party-loads rule forbids it | `npm test` scans `index.html` and `css/styles.css` with comments stripped, and `js/main.js` / `js/data.js` raw |
| The smooth-wheel layer, or whether it loads at all | the vendored pair in `index.html`; `wireSmoothScroll()` decides whether to construct it | `window.Profile.lenis` in the console; wheel; a reduced-motion reload |
| The no-JS fallback copy | `<noscript><section class="noscript">` in `index.html` | load the page with JavaScript disabled |
| An off-screen label utility | `.sr-only`, already declared in the stylesheet | screen-reader or inspector pass |

## Invariants

- `#page` stays empty in the shell; `render()` fills it and clears it again on
  every call. AGENTS.md's **Load order** row pins the empty mount.
- `js/data.js` must load before `js/main.js`, and `css/fonts.css` before
  `css/styles.css`; `page.test.mjs` asserts both orders (AGENTS.md, **Load
  order**).
- The shell owns chrome and the no-JS fallback; authored copy belongs to
  `PORTFOLIO` and is rendered, never pasted in (AGENTS.md, **Where to change
  what**).
- No third-party runtime loads: fonts, styles, scripts and images are all local
  (AGENTS.md, **No third-party runtime loads**).
- The Lenis pair is local and the script loads before `js/data.js`; a vendored
  file is still a runtime load, so it stays in the repo and never becomes a CDN.
  `wireSmoothScroll` is optional: the page works without the script (AGENTS.md,
  **Smooth scroll is progressive**).
- With JavaScript on, the renderer emits the page's only `h1`; `<noscript>` is
  raw text and contributes no element.

## Traps

- `render()` begins `var page = document.getElementById('page'); if (!page)
  return;` — renaming the mount blanks the page with no error.
- `.noscript` has no stylesheet rule of its own; it is a semantic wrapper, so a
  class-targeted fix has to add the rule first.
- `.sr-only` is declared but no element in the shell or renderer carries it
  today; reuse it rather than introducing a second off-screen helper.
- Deleting `<noscript>` is not a layout cleanup: it is the only content a
  JavaScript-off visitor sees.
- The two hand-written scripts sit at the end of `<body>`; `if (document.readyState ===
  'loading')` guards `init`, so moving them into `<head>` needs `defer` as well.
- The Lenis script is a classic IIFE and the shell order is pinned by
  `page.test.mjs`. `init()` defers to `DOMContentLoaded`, so a copy later in
  `<body>` would still work — but a script loaded after `init()` (async, or into
  `<head>` without `defer`) arrives too late: `wireSmoothScroll` checks
  `window.Lenis` once and silently leaves the page native.
