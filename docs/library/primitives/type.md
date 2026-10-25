# Type

The page's typographic scale: one serif display voice, one mono instrument voice, a system sans for reading, and the label, lede, body and action classes that place them.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Styles | `css/styles.css` | `── Type` · `h1 {` · `h2 {` |
| Styles | `css/styles.css` | `.eyebrow` · `.hero-title` |
| Styles | `css/styles.css` | `.hero-line, .lede` · `.body` · `.body p` |
| Styles | `css/styles.css` | `.actions` |
| Styles | `css/styles.css` | `@media (max-width: 639px)` |
| Render | `js/main.js` | `'<h1>'` · `class="hero-title"` · `class="hero-line"` |
| Render | `js/main.js` | `class="lede"` · `class="body"` · `class="eyebrow"` · `class="actions"` |
| Data | `js/data.js` | `name` · `title` · `bio` · `projects[].title!` |
| Assets | `css/fonts.css` | `Newsreader` · `'Courier Prime'` |

## Structure

| Element / class | Family | Size | Line-height | Colour |
|---|---|---|---|---|
| `h1` | `--serif` | `clamp(42px, 6.4vw, 94px)` | `.96` | `--text-strong` |
| `h2` | `--serif` | `clamp(30px, 3.4vw, 52px)` | `1.02` | `--text-strong` |
| `.hero-title` | `--mono` | `clamp(12px, 1.1vw, 14px)` | inherited | `--accent` |
| `.hero-line`, `.lede` | `--serif` | `clamp(18px, 1.7vw, 24px)` | `1.35` | `--text` |
| `.body` | `--sans` | inherited `16px` | inherited `1.65` | `--text-quiet` |
| `.eyebrow` | `--mono` | `11.5px` | inherited | `--accent` |
| `.actions` | inherited | — (layout only) | — | — |

Display sizes are all `clamp()`, so they scale with the viewport between the
phone and desktop bounds; only `h1` gets an explicit phone override. `h1` and
`h2` request `font-weight: 300`; tracking is `-.035em` on `h1` and `-.025em` on
`h2`; `.hero-line`/`.lede` are capped at `32ch` and `.body` at `44ch`.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| The display scale | the `h1 {` / `h2 {` clamps | 1440×900 and 390×844 screenshots |
| The phone name size | `h1` inside `@media (max-width: 639px)` | 390×844 screenshot |
| A label voice | `.eyebrow` / `.hero-title` (family, `letter-spacing`, `text-transform`) | screenshot; labels stay uppercase mono |
| The reading measure | `.hero-line, .lede` (`32ch`) and `.body` (`44ch`) | screenshot at 1280×704 |
| Action-row spacing | `.actions` (`gap`, `flex-wrap`) | screenshot; the buttons keep their own styling |
| A family | `--serif:` / `--mono:` / `--sans:` — see [tokens.md](tokens.md) | `npm test` |

## Invariants

- The page has exactly one `<h1>`; the renderer emits it, and the `<noscript>` fallback is the only one when scripts are off — see `AGENTS.md`'s one-`<h1>` constraint.
- `h1` and `h2` are element selectors: every stop's heading is styled by the same rule, so there are no per-section type sizes.
- Display text requests weight 300, but the vendored Newsreader declares only 400/500/600 — the browser serves 400, and that is the face actually seen.
- The reading face is the system stack (`--sans`); the page deliberately ships no third webfont — `AGENTS.md` lists one as absent.
- No automated test pins the type scale; verification is a screenshot, per `AGENTS.md`'s Run and verify section.

## Traps

- `font-weight: 300` on `h1`/`h2` does not produce a lighter face; only a new vendored Newsreader weight changes the rendering (`README.md` and `AGENTS.md` both record this).
- `.hero-line` and `.lede` share one rule: editing that selector line changes the hero sentence and the project and contact ledes together.
- `.body` has two shapes — a `<div>` wrapper in About (where `.body p` margins apply) and a plain `<p>` in project and leadership copy.
- The phone `h1` size lives in the responsive block, not beside `h1 {`; two places set the same property.
- `.eyebrow` is a `<p>`, not a heading — promoting it would change the document outline.
