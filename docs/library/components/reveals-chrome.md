# Reveals and chrome

The scroll-time behaviour bound once at init: reveal-on-scroll, the
reduced-motion fallback, the masthead's stuck state, the progress hairline, the
resume href and the delegated click that opens a record.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<main id="page" class="page"></main>` · `id="progress"` |
| Render | `js/main.js` | `function wireReveals(` · `function wireDelegation(` |
| Render | `js/main.js` | `function wireChrome(` · `window.addEventListener('scroll'` |
| Render | `js/main.js` | `e.target.closest('[data-kind][data-index]')` · `function init(` |
| Styles | `css/styles.css` | `── Reveal` · `[data-reveal]` · `[data-reveal].is-in` |
| Styles | `css/styles.css` | `@media (prefers-reduced-motion: reduce)` |
| Test | `tests/page.test.mjs` | `IntersectionObserver` · `prefers-reduced-motion` |

## Structure

`panel()` marks each `.copy` and `.media` block with `data-reveal`; those nodes
start at `opacity: 0` and gain `.is-in` once they are 8% inside the viewport. The
rail observer toggles `.is-active` on the matching `data-stop` link as a section
crosses the middle band. Scroll and resize toggle `.masthead.is-stuck` on
`#masthead` and write `#progress`'s width. Clicks bubble to `#page`, where one listener reads
`data-kind` and `data-index` off the nearest control and opens the record dialog.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| When a reveal fires | `rootMargin: '0px 0px -8% 0px'` and `threshold: 0.08` in `wireReveals` | scroll to a panel edge |
| The reveal animation | `[data-reveal]` transition and transform, plus `[data-reveal].is-in` | slow-scroll screenshot |
| One-shot versus repeat | `io.unobserve(entry.target)` after the class is added — reveals are one-shot by design | scroll up and back |
| Which blocks reveal | add `data-reveal` where `panel()` builds `.copy` / `.media` | `npm test`, then scroll |
| Reduced-motion behaviour | the `matchMedia` branch in `wireReveals` and the `@media (prefers-reduced-motion: reduce)` block | set reduce motion; every block is visible at once |
| The stuck threshold | `masthead.classList.toggle('is-stuck', ...)` in `wireChrome` | scroll across the hero edge |
| The progress computation | `progress.style.width` and its `Math.min(100, ...)` clamp | scroll to the bottom |
| What opens a record | `data-kind` / `data-index` on the control and the listener in `wireDelegation` | click a frame, a leader card and a photographed honour |
| The rail's active band | `rootMargin: '-45% 0px -45% 0px'` in `buildRail` | see `rail.md` |

## Invariants

- With `prefers-reduced-motion: reduce` or no `IntersectionObserver`, every
  `[data-reveal]` is marked `.is-in` immediately (AGENTS.md, **Reduced motion is
  honoured**); no reveal may depend on an animation completing.
- Delegation is bound once on `#page`, because `render()` replaces the mount's
  children and per-button listeners would vanish with them.
- `data-kind` is the record kind (`project`, `leadership`, `honors`);
  `data-index` is the array index into that collection, never the record id.
- `data-stop` is the id of the section the rail link targets; `.is-active` is
  applied to the link, never to the section.
- `wireReveals`, `wireChrome` and `wireDelegation` run from `init()` after
  `render()`; no scroll behaviour binds before the content exists.

## Traps

- `[data-reveal]` is hidden by CSS, so a node inserted after `wireReveals` has
  built its observer stays invisible until it is observed or given `.is-in`.
- A click listener attached to a rendered element dies on the next `render()`;
  the mount listener is the only survivor, so wire new controls to it.
- A control without `data-kind` / `data-index`, or a `disabled` one, is skipped —
  honours without photographs never open (see `dialog.md`).
- `wireChrome`'s initial `update()` is what paints the stuck state and hairline
  on a reload that starts mid-page; listening to `scroll` alone leaves them stale
  until the first scroll.
- The `prefers-reduced-motion` string is pinned by `page.test.mjs`, while the CSS
  block and the JS branch must stay in agreement by inspection; neither alone
  proves the other.
- The dialog's focus trap and Escape handling are bound separately on
  `document`; this page owns only the click that opens it.
