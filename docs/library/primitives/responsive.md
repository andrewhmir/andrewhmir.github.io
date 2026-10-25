# Responsive

The five `@media` blocks that change the page's structure — the 1024px rail breakpoint, two 1023px blocks, the 639px phone layout and reduced motion — and the component pages that own what each block touches.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Styles | `css/styles.css` | `── Responsive` · `scroll-behavior: smooth` |
| Styles | `css/styles.css` | `@media (min-width: 1024px)` |
| Styles | `css/styles.css` | `@media (max-width: 1023px)` |
| Styles | `css/styles.css` | `@media (max-width: 639px)` |
| Styles | `css/styles.css` | `@media (prefers-reduced-motion: reduce)` |
| Render | `js/main.js` | `prefers-reduced-motion` · `classList.add('is-in')` |
| Markup | `index.html` | `name="viewport"` |
| Test | `tests/page.test.mjs` | `prefers-reduced-motion` |

## Structure

| Block | What it changes | Component page |
|---|---|---|
| `@media (min-width: 1024px)` | `.rail { display: flex; }`; `.menu { margin-right: 8px; }` | [rail.md](../components/rail.md), [masthead.md](../components/masthead.md) |
| `@media (max-width: 1023px)` in `── Contact` | the dark card `.stop--contact .stop-in::before` becomes `width: calc(100% - 20px)` and `height: calc(100% - 12px)` | [contact.md](../components/contact.md) |
| `@media (max-width: 1023px)` fallback | hides `.rail` and `.rail-shade`; `.stop-in` becomes one column with `min-height: 0`, `gap: 28px` and smaller padding; `.copy`/`.media` span the column; hero padding-top `118px`; `.copy--center` goes left (except Contact); `.menu` and `.hero-cue` hidden; left/right scrims become vertical | [rail.md](../components/rail.md), [panel.md](../components/panel.md), [hero.md](../components/hero.md) |
| `@media (max-width: 639px)` | re-declares `--gutter: 10px` and `--panel-radius: 12px`; `h1` becomes `clamp(38px, 11vw, 56px)`; `.leaders` one column; narrower `.honour-row`; `.dialog__gallery` one column; footer and awards adjustments | [tokens.md](tokens.md), [type.md](type.md), [leadership.md](../components/leadership.md), [honours.md](../components/honours.md), [dialog.md](../components/dialog.md), [footer.md](../components/footer.md) |
| `@media (prefers-reduced-motion: reduce)` | `scroll-behavior: auto`; every transition and animation collapses to `.001ms`; `[data-reveal]` is visible with no transform | [reveals-chrome.md](../components/reveals-chrome.md) |

Most fluid resizing is done by the `clamp()` values inside the type and spacing
rules; the breakpoints only change structure, so a new one should be the last
resort.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A breakpoint | every block that mentions it — the two 1023 rules move together with the 1024 rule | `node tools/library-check.mjs`; screenshots at 1024 and 1023 |
| The phone layout | `@media (max-width: 639px)` | 390×844 screenshot |
| The rail below 1024 | not a CSS tweak: no replacement nav is deliberate (`AGENTS.md` absent list) | decide the feature first |
| Reduced motion | the `prefers-reduced-motion` block plus the `matchMedia` branch in `wireReveals` | emulate reduced motion in devtools; reveals show immediately |
| Layout verification | `tools/shot-url.mjs` at 1440×900, 1280×704 and 390×844 | `AGENTS.md` Run and verify |

## Invariants

- `css/styles.css` holds exactly these five `@media` blocks; a sixth changes layout and belongs on this page.
- The rail exists only at 1024px and wider; below it there is no drawer or alternate nav, and that absence is deliberate (`AGENTS.md`).
- Reduced motion is honoured twice: the CSS collapses motion, and `wireReveals` marks every `[data-reveal]` visible instead of observing — see `AGENTS.md`'s hard constraints.
- `css/fonts.css` has no `@media`; font subsets are chosen by `unicode-range`, not by breakpoint.
- There is no automated layout test: green `npm test` means the guard strings hold, not that the page laid out (`AGENTS.md` Run and verify).

## Traps

- The two `@media (max-width: 1023px)` blocks sit apart in the sheet: the Contact one lives inside `── Contact`, the fallback one inside `── Responsive`. Editing one does not move the other.
- `1023px` and `1024px` are contiguous. Moving one edge without the other opens a dead band in which neither the rail nor the fallback applies.
- The 639 block re-declares `:root` tokens; changing the top `:root` leaves phones on the old gutter and panel radius.
- The reduced-motion block comes last, so it wins the cascade; its `!important` durations also swallow any transition a new component adds — intended, but retest that the component still works.
- `wireReveals` reads `matchMedia` once at start-up. Flipping the OS preference later reveals content through CSS, but the observer does not re-branch until reload.
- `.hero-cue` and `.menu` are hidden in the 1023 fallback; a new absolutely positioned decoration must be hidden there too or it will overlap the copy.
