# Vendored icons

Do not hand-edit the generated file. `js/icons.js` is written by
`tools/vendor-icons.mjs`; re-run it to refresh, `--check` to report drift.

- Source: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.15.4/svgs`
- Licence: **CC BY 4.0** for the icons. The full licence is `LICENSE.txt` here,
  and the attribution is repeated in the banner of `js/icons.js` — CC BY
  requires attribution, so neither may be dropped.
- Why vendored: the site has no build step and no CDN at runtime.
  `index.html` used to link `use.fontawesome.com/releases/v5.15.4/css/all.css`.

## Why inline SVG instead of a vendored webfont

That stylesheet was **59,305 bytes** describing several thousand glyphs, plus
whatever webfont subset the browser then decided to download, in order to draw
**twelve** shapes. Twelve paths are about 8 KB of markup: one fewer request, no
second `font-display` decision, no flash of missing glyph, and they inherit
`currentColor`, so an icon takes the colour of the text it sits in.

Vendoring the font would have kept the CDN's shape and most of its weight.
Inlining removes both.

The twelve names are the Font Awesome names minus their `fa-` prefix, so the
call sites read as the glyph rather than as a library path:

`play` · `images` · `eye` · `trophy` · `chevron-left` · `chevron-right` ·
`file-pdf` · `file-alt` · `users` · `envelope` · `github` · `linkedin`

Read them with `Site.icon(name, cls)`, which returns an `<svg aria-hidden>`.
Every one of these glyphs sits beside text that already says what it means, so
announcing it as well would be the fault. An unknown name returns an empty
string rather than a broken box — a missing glyph should cost a decoration, not
a stand.

Each icon carries **its own `viewBox`**, and they differ (`320`, `384`, `448`,
`496`, `512`, `576` and `640` wide). A single shared box would scale the narrow
glyphs — the chevrons and `play` — down to nothing, which is the quiet failure
this table exists to prevent.

Because the aspect ratios differ, the `.icon` rule in `css/styles.css` sizes by
**height with `width: auto`**, never a square box:

```css
.icon { display: inline-block; height: 1em; width: auto;
        fill: currentColor; vertical-align: -0.125em; flex: 0 0 auto; }
```

Two of those declarations are load-bearing rather than taste. A `<svg>` with a
`viewBox` but **no `width`/`height` attribute falls back to the replaced-element
default of 300×150** — so without a size the glyphs blow the pills apart, which
is why this rule is not optional. And an SVG with a `viewBox` has an intrinsic
aspect ratio, so `height: 1em` gives a 320-wide chevron a narrow box and a
640-wide `users` a wide one; a square `1em × 1em` would letterbox both.
`fill: currentColor` keeps a glyph from introducing a colour of its own, which
the measured palette does not allow.

## Pinned source files

Fetched at the tag `5.15.4`, never `master`, so a re-run is reproducible and a
diff means the tag moved.

| Icon | Style | viewBox | SHA-256 (first 16) |
|---|---|---|---|
| `play` | solid | `0 0 448 512` | `42b50476e6dc7775` |
| `images` | solid | `0 0 576 512` | `c13557a5d11e270e` |
| `eye` | solid | `0 0 576 512` | `305c20b8dfbacfb5` |
| `trophy` | solid | `0 0 576 512` | `599f2d6589d75d97` |
| `chevron-left` | solid | `0 0 320 512` | `fa6ddb6d040f6332` |
| `chevron-right` | solid | `0 0 320 512` | `f993c47194ef99a2` |
| `file-pdf` | solid | `0 0 384 512` | `c375a9b1daf5a063` |
| `file-alt` | solid | `0 0 384 512` | `45ac25091979cf7b` |
| `users` | solid | `0 0 640 512` | `9adb70233e257dc8` |
| `envelope` | solid | `0 0 512 512` | `6950976b2ee254c3` |
| `github` | brands | `0 0 496 512` | `479961ff3f790ccb` |
| `linkedin` | brands | `0 0 448 512` | `b5d39a8ede55967a` |

The tool asserts that each source SVG holds **exactly one `<path>`**. A release
that split a glyph into two would otherwise be vendored as a silently
half-drawn icon.

## Upgrading

See `files/fonts/README.md` — the same three terminals, with
`node tools/vendor-icons.mjs` instead. Then update the table above, re-run
`npm test`, and check the glyphs still render: a wrong `viewBox` shows up as a
cropped icon and nothing in the suite would notice.
