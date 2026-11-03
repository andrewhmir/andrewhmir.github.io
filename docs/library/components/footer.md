# Footer

The page footer outside `#page`: the Amorsolo painting credit and the static
copyright year.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `<footer class="foot">` · `<span class="foot__credit">` |
| Markup | `index.html` | `<span class="foot__year">` |
| Styles | `css/styles.css` | `── Footer` · `.foot__credit` |
| Styles | `css/styles.css` | `.foot` · `.foot__year` |

## Structure

`footer.foot` is a flex row of two spans: `.foot__credit` (the two-painting
attribution) and `.foot__year`, which is pushed right by
`.foot__year { margin-left: auto; }`. It sits in `index.html` after the empty
`main#page` and before the no-JS fallback, and no renderer function touches it.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| The credit line | `<span class="foot__credit">`; keep the painter's full name | screenshot |
| The year | `<span class="foot__year">`; static text, no date script | update by hand when it rolls over |
| Footer spacing or wrap | `.foot` (`display`, `gap`, `padding`, `border-top`) | 390px and 1440px screenshots |
| Phone alignment | `@media (max-width: 639px)` drops the year's auto margin | 390×844 screenshot |
| Where the footer sits | `index.html`, outside `main#page` | run `render()`; the footer survives |

## Invariants

- The footer is outside `#page`, so `render()` never replaces it; the renderer
  only rewrites the mount's innerHTML.
- The credit is attribution for the two Amorsolo paintings, not decoration; it
  must keep the painter's full name (`files/painting-hero.jpg`,
  `files/painting.jpg`).
- The footer prints no name: the masthead's wordmark is the fixed identity, and a
  second copy down here would sit on screen with it at the bottom of the page.
- Footer text is chrome hard-coded in `index.html`; `PORTFOLIO` owns records, not
  the footer (AGENTS.md, **Where to change what**).
- The footer's margins use `--gutter` and its top border uses `--border`, so
  palette and gutter changes reach it.

## Traps

- Moving `.foot` inside `#page` means the next `render()` call wipes it.
- Adding a name back here breaks the no-content-twice rule: the fixed masthead
  already prints it, so the two are on screen together at the bottom. Keep the
  name in the masthead.
- The year is static (`© 2026`); nothing rolls it over at the new year.
- `.foot` has no id, so the markup is the only reliable handle; prefer editing
  `index.html` over querying it from script.
- The 639px rule only drops the year's auto margin; the two spans still wrap, so
  a longer credit pushes the year onto its own line.
