# Controls

Buttons, links and focus behaviour: the outlined `.btn`, its gold solid variant, the resume pill, the masthead menu links, the skip link, and the one focus ring and selection colour every control shares.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Styles | `css/styles.css` | `:focus-visible` · `::selection` |
| Styles | `css/styles.css` | `.skip` · `.skip:focus` |
| Styles | `css/styles.css` | `.btn {` · `.btn:hover` · `.btn:active` |
| Styles | `css/styles.css` | `.btn--solid` · `.btn--solid:hover` |
| Styles | `css/styles.css` | `.menu a` · `.menu a:hover` · `.resume` |
| Markup | `index.html` | `class="skip"` · `class="menu"` · `class="resume"` |
| Render | `js/main.js` | `class="btn btn--solid"` · `class="btn"` |
| Data | `js/data.js` | `social[].label!` · `social[].url!` |

## Structure

| Control | Selector | Shape | Notes |
|---|---|---|---|
| Primary action | `.btn` | inline-flex, `min-height: 44px`, `padding: 0 18px`, `border-radius: 8px`, mono `11.5px` | works on `<a>` and `<button>` |
| Solid primary | `.btn--solid` | `--accent` fill, `#1a1408` ink, hover `#e2bf78` | the hero's `See the work →` action |
| Menu link | `.menu a` | mono `11.5px`, uppercase, `.1em` tracking, `--text-quiet` | hidden below 1024 (see [masthead.md](../components/masthead.md)) |
| Resume pill | `.resume` | mono `11.5px`, 1px border, `border-radius: 8px`, `padding: 9px 14px` | `#resumeLink`; its href is filled by `wireChrome` |
| Skip link | `.skip` | absolute, `top: -60px`, 8px radius, `--text-strong` on `--night` | first focusable; `:focus` brings it to `top: 12px` |
| Focus ring | `:focus-visible` | `outline: 2px solid var(--accent)`, `outline-offset: 3px` | every keyboard focus |
| Text selection | `::selection` | `rgba(212, 176, 106, .32)` ground, `--text-strong` ink | the page's gold wash |

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| How a button looks | `.btn`, `.btn:hover`, `.btn--solid` | screenshot; keyboard-focus the button |
| A new action | reuse `.btn` (optionally `.btn btn--solid`) on the element | no new CSS class — an unlisted class fails `node tools/library-check.mjs` |
| The skip link | `class="skip"` in `index.html`; keep `href="#page"` | Tab once on load — the link appears and jumps to `#page` |
| The focus ring | `:focus-visible` only | Tab through every control; the outline is never removed |
| The selection colour | `::selection` | select text over a dark and a bright panel |
| Menu and resume wiring | the masthead page: [masthead.md](../components/masthead.md) | there, not here |
| The dialog close button | [dialog.md](../components/dialog.md) — it is the dialog's control | its page owns the contract |

## Invariants

- Every external action — Resume, GitHub, LinkedIn, a record's Links list — opens in a new tab (`target="_blank" rel="noopener noreferrer"`) so the portfolio page is never replaced. In-page `#` anchors, the project view and the dialog stay in the same tab.
- Keyboard focus is always visible: the `:focus-visible` ring is the page's only focus indicator, and every control inherits it.
- `.btn` is a skin, not a tag — it styles `<a>` and `<button>` identically; semantics come from the element.
- Primary actions keep a 44px minimum target (`.btn`'s `min-height`); the dialog close button reuses the same 44px box.
- The solid button keeps dark ink (`#1a1408`) on gold; switching its text to `--text` would lose contrast.
- The skip link stays the first focusable element in the shell and targets `#page`; [page-shell.md](../components/page-shell.md) owns the shell order, and this page owns the link's styling and focus.
- The control voice is the vendored Courier Prime; no third-party font or icon load is allowed (`AGENTS.md`).

## Traps

- The 8px control radius is written into `.btn`'s rule (and `.skip`, `.resume`, `.dialog__close`), not a token — a `--panel-radius` change leaves every control behind (`AGENTS.md` radii row).
- `.btn--solid:hover` uses a one-off `#e2bf78` rather than `--accent`; changing the accent token does not move the hover shade.
- `.skip` is moved off-canvas with `top: -60px` and returns on `:focus`. Replacing that with `display: none` would make it unfocusable.
- `.menu a` sits inside `.menu`, which is `display: none` below 1024 — the links cannot be restyled into a phone menu; no drawer is deliberate (`AGENTS.md`).
- The dialog close button repeats the 8px radius and 44px box but is owned by [dialog.md](../components/dialog.md); do not edit its contract from here.
- `::selection` sets both ground and ink; recolouring only the background can drop the text below contrast.
- Transitions on controls are zeroed by `prefers-reduced-motion` (see [responsive.md](responsive.md)); a JS-driven animation would not be covered.
