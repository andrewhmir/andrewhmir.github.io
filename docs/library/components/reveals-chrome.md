# Reveals and chrome

The scroll-time behaviour bound once at init: reveal-on-scroll, the
reduced-motion fallback, the Lenis wheel layer, the masthead's stuck state, the
progress writes, the resume href and the delegated click that opens a record.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<main id="page" class="page"></main>` · `id="progress"` · `id="rail"` |
| Render | `js/main.js` | `function wireReveals(` · `function wireDelegation(` |
| Render | `js/main.js` | `function wireChrome(` · `window.addEventListener('scroll'` |
| Render | `js/main.js` | `function wireSmoothScroll(` · `lenis.stop()` |
| Render | `js/main.js` | `e.target.closest('[data-kind][data-index]')` · `function init(` |
| Styles | `css/styles.css` | `── Reveal` · `[data-reveal]` · `[data-reveal].is-in` · `html.lenis` |
| Styles | `css/styles.css` | `@media (prefers-reduced-motion: reduce)` |
| Test | `tests/page.test.mjs` | `IntersectionObserver` · `prefers-reduced-motion` |

## Structure

`panel()` marks each `.copy` and `.media` block with `data-reveal`; those nodes
start at `opacity: 0` and gain `.is-in` once they are 8% inside the viewport. The
section covering the viewport middle gets `.is-active` on its `data-stop` link,
toggled from the scroll handler. Scroll and resize toggle `.masthead.is-stuck`
on `#masthead`, and `paint()` eases `--rail-progress` on `#rail` (px) toward the
active stop's tick and `#progress`'s width toward the same section fraction — the
small-screen fallback. `prefers-reduced-motion` skips the ease and snaps. Clicks
bubble to `document`, where one listener reads `data-kind` and `data-index` off
the nearest control: `panel` opens the project view, the record kinds open the
dialog. Lenis, when active, smooths the wheel and routes hash-anchor clicks
through `lenis.scrollTo` so the CSS `scroll-margin-top` clearance survives; the
shared `setLock` count stops and starts it while a layer is open.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| When a reveal fires | `rootMargin: '0px 0px -8% 0px'` and `threshold: 0.08` in `wireReveals` | scroll to a panel edge |
| The reveal animation | `[data-reveal]` transition and transform, plus `[data-reveal].is-in` | slow-scroll screenshot |
| One-shot versus repeat | `io.unobserve(entry.target)` after the class is added — reveals are one-shot by design | scroll up and back |
| Which blocks reveal | add `data-reveal` where `panel()` builds `.copy` / `.media` | `npm test`, then scroll |
| Reduced-motion behaviour | the `matchMedia` branch in `wireReveals` and the `@media (prefers-reduced-motion: reduce)` block | set reduce motion; every block is visible at once |
| The stuck threshold | `masthead.classList.toggle('is-stuck', ...)` in `wireChrome` | scroll across the hero edge |
| The wheel glide, anchor travel or layer lock | `wireSmoothScroll()` and `setLock()` in `js/main.js`; `html.lenis` in `css/styles.css` | console: `window.Profile.lenis`; wheel, rail click, open/close the dialog and the project view; reduced-motion reload |
| The progress ease and computation | `activeSection()` / `railTarget()` / `fillTarget()` / `paint()` in `wireChrome`; `--rail-progress` on `#rail` and `progress.style.width` | scroll from one panel to the next: the tick flips at the centre and the fill runs between ticks; reduced motion snaps |
| What opens a record | `data-kind` / `data-index` on the control and the listener in `wireDelegation` | click a frame, a leader card and a photographed honour |
| The rail's active section | `activeSection()` in `wireChrome` (the panel covering the viewport middle) | see `rail.md` |

## Invariants

- With `prefers-reduced-motion: reduce` or no `IntersectionObserver`, every
  `[data-reveal]` is marked `.is-in` immediately (AGENTS.md, **Reduced motion is
  honoured**); no reveal may depend on an animation completing.
- Lenis is constructed only under allowed motion and with the vendored script present; `html.lenis { scroll-behavior: auto }` keeps the CSS ease off it (AGENTS.md, **Smooth scroll is progressive**).
- `setLock` is a count shared by the record dialog and the project view: it stops Lenis at the first layer and restarts it only when the last one closes, so closing the dialog over the view leaves the page still.
- Delegation is bound once on `document`, because `render()` replaces the
  mount's children and the project view sits outside `#page`.
- `data-kind` is `panel` (open the project view) or a record kind (`project`,
  `leadership`, `honors`); `data-index` is the array index, never the record id.
- `data-stop` is the id of the section the rail link targets; `.is-active` is
  applied to the link, never to the section.
- One active section feeds both cues: `--rail-progress` for the ≥1024px rail fill
  and `#progress`'s width for the small-screen hairline. They must not diverge;
  both are written in the same `draw()` call.
- `wireReveals`, `wireChrome` and `wireDelegation` run from `init()` after
  `render()`; no scroll behaviour binds before the content exists.

## Traps

- `[data-reveal]` is hidden by CSS, so a node inserted after `wireReveals` has
  built its observer stays invisible until it is observed or given `.is-in`;
  the project view deliberately carries none.
- A click listener attached to a rendered element dies on the next `render()`;
  the document listener is the only survivor, so wire new controls to it.
- A control without `data-kind` / `data-index`, or a `disabled` one, is skipped —
  honours without photographs never open (see `dialog.md`).
- `wireChrome`'s initial `update()` is what paints the stuck state, the rail fill
  and the hairline on a reload that starts mid-page; listening to `scroll` alone
  leaves them stale until the first scroll.
- The fill's ease is skipped under `prefers-reduced-motion: reduce` by the
  `reduced` branch in `wireChrome`; an always-animated fill breaks that promise.
- The `prefers-reduced-motion` string is pinned by `page.test.mjs`, while the CSS
  block and the JS branch must stay in agreement by inspection; neither alone
  proves the other.
- One document keydown owns both layers: the dialog gets Escape/Tab while it is
  open, otherwise the project view does; `trapTab` also enters at an edge when
  the layer container itself has focus.
- The anchor handler intercepts every `a[href^="#"]` (the skip link and modified clicks excepted) and must stay bound after `render()`; for targets without a `scroll-margin-top` (`#work`, `#page`) it passes the panels' clearance as an offset, because Lenis already subtracts an element's own margin and passing both would double it.
