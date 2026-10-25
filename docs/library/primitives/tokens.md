# Design tokens

The `:root` custom properties that colour the page, name its two vendored families, and set its radii, gutters and widths — the one edit surface every rule reads through `var()`.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Styles | `css/styles.css` | `:root` · `color-scheme: dark` · `--night: #080c0e` |
| Styles | `css/styles.css` | `--text: #ece2cf` · `--text-strong: #f9f4e8` · `--text-quiet: #9a9384` |
| Styles | `css/styles.css` | `--accent: #d4b06a` · `--border: rgba(236, 226, 207, .14)` |
| Styles | `css/styles.css` | `--serif:` · `--mono:` · `--sans:` |
| Styles | `css/styles.css` | `--gutter:` · `--panel-radius:` · `--frame-radius:` |
| Styles | `css/styles.css` | `--masthead-h:` · `--max:` |
| Assets | `css/fonts.css` | `@font-face` · `unicode-range:` |
| Assets | `tools/vendor-fonts.mjs` | `css/fonts.css` · `--check` |
| Markup | `index.html` | `css/fonts.css` |
| Test | `tests/page.test.mjs` | `--night: #080c0e` · `--panel-radius:` |

## Structure

`css/styles.css` opens with a single `:root` block; nothing else declares these
names except the phone override noted below.

| Group | Token | Exact value | Read by |
|---|---|---|---|
| Ground | `--night` | `#080c0e` | `body` background, scrims, scrollbar |
| Text | `--text` | `#ece2cf` | body copy, hero line, lede |
| Text | `--text-strong` | `#f9f4e8` | headings, brand, active labels |
| Text | `--text-quiet` | `#9a9384` | supporting copy, years, captions |
| Accent | `--accent` | `#d4b06a` | eyebrow, focus ring, active rail dot, progress hairline |
| Rule | `--border` | `rgba(236, 226, 207, .14)` | masthead foot, `.resume`, rail label, `.btn`, `.honour-row` top, `.contact-mail`, `.foot`, dialog card/close/video |
| Family | `--serif` | `'Newsreader', Georgia, 'Times New Roman', serif` | `h1`, `h2`, hero line, lede, brand, contact mail |
| Family | `--mono` | `'Courier Prime', ui-monospace, Consolas, monospace` | eyebrow, buttons, labels, meta, footer credit |
| Family | `--sans` | `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` | body copy and interface text |
| Metric | `--gutter` | `16px` (re-declared `10px` below 640) | panel and footer margins |
| Metric | `--panel-radius` | `16px` (re-declared `12px` below 640) | `.stop` |
| Metric | `--frame-radius` | `10px` | `.frame`, `.portrait img`, `.leader` |
| Metric | `--masthead-h` | `62px` | masthead height, `.stop` scroll-margin-top |
| Metric | `--max` | `1440px` | `.stop-in` max-width |

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| A colour tier | the named colour in `:root` | `npm test` — the five palette strings are pinned |
| A font family | `--serif:`, `--mono:` or `--sans:`; a webfont also needs vendoring | `npm test` (no third-party loads) and a screenshot |
| A panel or frame corner | `--panel-radius:` / `--frame-radius:` | `npm test` (both pinned) and a 1440×900 screenshot |
| The page edge gap or width | `--gutter:` / `--max:` | screenshots at 1440×900 and 390×844 |
| Masthead height | `--masthead-h:` | screenshot; anchor landings follow `scroll-margin-top` |
| Font bytes | re-run `node tools/vendor-fonts.mjs` — never edit `css/fonts.css` | `node tools/vendor-fonts.mjs --check` reports drift |

## Invariants

- The five palette strings are exact and pinned by `tests/page.test.mjs`; `AGENTS.md` states the same rule in its hard constraints.
- `--panel-radius` is 16px and `--frame-radius` is 10px, both pinned by the guard; radii nest panel > frame > control.
- Both families are local (`files/fonts/`, declared by `css/fonts.css`); no third-party resource load is allowed — see `AGENTS.md`.
- `css/fonts.css` is generated. `tools/vendor-fonts.mjs` is its only writer; `--check` detects drift without writing.
- `:root` sets `color-scheme: dark`; the body base is `var(--sans)` at `16px / 1.65`.
- Every rule reads a token through `var()`, so a misspelled name falls back silently instead of failing loudly.

## Traps

- The button, resume, skip-link and dialog-close radii are `8px` written into their rules, not a token: changing `--panel-radius` does not move controls. See `AGENTS.md`'s radii row.
- Below 640 a second `:root` sets `--gutter: 10px` and `--panel-radius: 12px`; editing the top block alone leaves phones unchanged (see [responsive.md](responsive.md)).
- Newsreader is vendored at 400/500/600, so the `font-weight: 300` the display rules ask for renders as 400 — a lighter face needs a new vendored file (see [type.md](type.md)).
- `--border`'s alpha is a design decision, not a pinned value; only the five colour strings are asserted.
- `--max` caps `.stop-in`, not the body; a wide screenshot still shows the full-bleed panels either side of it.
