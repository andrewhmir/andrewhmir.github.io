# Agent component library

One page per component, in a fixed shape: where its markup, renderer, styles and
data live; how to adjust it; what must stay true; and the traps specific to it.
Read this index first, then one page — ~60 lines instead of grepping four files.
`AGENTS.md` remains the entry point and the intent router; this library is the
per-component depth behind it.

## Start here

| I want to change… | Read |
|---|---|
| The record dialog's size, player, gallery or focus trap | [components/dialog.md](components/dialog.md) |
| The hero name, title, sentence or actions | [components/hero.md](components/hero.md) |
| The palette, a radius, a font family or a gutter | [primitives/tokens.md](primitives/tokens.md) |
| Add a seventh project, or change where its art pan comes from | [components/project.md](components/project.md) (the crop table is on the panel page) |
| A film still, team photograph or awaited frame | [components/frames.md](components/frames.md) |

## Lookups

- [selectors.md](selectors.md) — a flat table: selector, id or `data-*` → the
  page that owns it.
- [data.md](data.md) — the `PORTFOLIO` contract: record shapes, live vs dormant
  fields, and which `Site.*` helpers the page actually calls.

## Components

| Component | Covers | Page |
|---|---|---|
| Page shell | Script order, empty `#page`, skip link, no-JS fallback | [components/page-shell.md](components/page-shell.md) |
| Masthead | Fixed header, brand, menu, resume, progress hairline | [components/masthead.md](components/masthead.md) |
| Journey rail | Fixed section nav, active stop, left shade | [components/rail.md](components/rail.md) |
| Painted panel | `.stop`, art layer, scrim, copy/media cells, the `PAN` crops | [components/panel.md](components/panel.md) |
| Hero | First stop: name, title, sentence, actions, scroll cue | [components/hero.md](components/hero.md) |
| About | Bio paragraphs, social buttons, framed portrait | [components/about.md](components/about.md) |
| Project stop | Work wrapper, copy, awards, open-record button, stop ids | [components/project.md](components/project.md) |
| Media stack | Three frames: lead, film still, team; awaited frame | [components/frames.md](components/frames.md) |
| Leadership | Four cards opening the dialog gallery | [components/leadership.md](components/leadership.md) |
| Honours | Standalone tiles and the project-award partition | [components/honours.md](components/honours.md) |
| Contact | Closing line, email, social links, dark card | [components/contact.md](components/contact.md) |
| Footer | Name, painting credit, year | [components/footer.md](components/footer.md) |
| Record dialog | One shared modal: open, close, trap, video, gallery | [components/dialog.md](components/dialog.md) |
| Reveals and chrome | Reveal-on-scroll, reduced motion, stuck state, delegation | [components/reveals-chrome.md](components/reveals-chrome.md) |

## Foundations

| Primitive | Covers | Page |
|---|---|---|
| Tokens | Palette, families, radii, gutters, max width | [primitives/tokens.md](primitives/tokens.md) |
| Type | `h1`, `h2`, eyebrow, lede, body scale and responsive sizes | [primitives/type.md](primitives/type.md) |
| Controls | Buttons, links, focus ring, skip link, resume action | [primitives/controls.md](primitives/controls.md) |
| Responsive | Every `@media` block and reduced motion | [primitives/responsive.md](primitives/responsive.md) |

## The page contract

Every page under `components/` and `primitives/` is 40–90 lines and has this
shape:

```markdown
# <Component name>

One sentence: what it is and where it is seen.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="masthead"` |
| Render | `js/main.js` | `function wireChrome(` |
| Styles | `css/styles.css` | `── Masthead` |
| Data | `js/data.js` | `projects[].title` |
| Test | `tests/page.test.mjs` | `id="masthead"` |

## Structure            (optional: DOM/class tree, state classes)

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|

## Invariants
## Traps
```

Rules:

- **Anchors are grep strings, never line numbers.** Each backticked token in
  `Where it lives` must appear literally in its named file (a function
  definition, a CSS section banner like `── Dialog`, a token with its colon like
  `--frame-radius:`, a selector, an HTML attribute). Data rows use
  `collection[].field`, with a trailing `!` when every record must have the
  field, or `Site.helper`.
- **One file per row.** A component touching several files gets several rows.
- **No record copy.** Name fields and link to `js/data.js`; never paste project
  or honour text.
- **Cite, don't copy, the constraints.** `AGENTS.md` owns the hard constraints;
  pages reference them.
- **No line numbers anywhere.**

## Keeping it honest

`tools/library-check.mjs` runs as the last suite in `npm test` and fails when:

- the index and the page files disagree, or a page is missing (V1);
- a page's shape drifts or an anchor no longer resolves in its file (V2, V3);
- a `Data` path does not exist in `PORTFOLIO` (V4);
- a CSS class, shell id, `data-*` attribute, emitted class, `PORTFOLIO` key,
  record field or `Site.*` helper is documented nowhere (V5–V7);
- the suite or the `AGENTS.md` pointer is unwired (V8);
- a page cites a line number or a non-existent test/tool file (V9, V10).

```powershell
node tools/library-check.mjs                                  # all ten checks
node tools/library-check.mjs --page docs/library/components/dialog.md   # one page
```

A new component, class or data field therefore forces the docs to change in the
same commit — that is the point of the library.

## Relationship to `AGENTS.md`

`AGENTS.md` routes an intent ("change the scrim", "add a project") to a file and
the vocabulary that names it, and owns the hard constraints. This library answers
the next question: *what is the complete edit surface for this one component?*
Read `AGENTS.md` first; open one page here for the component you are changing.
