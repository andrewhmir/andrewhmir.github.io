# Dev tools

Dev-only. Nothing here is needed to build or run the site: the site is plain
static files, and `npm test` does not invoke any of these tools. Most need the
site served (`node tools/serve.mjs 3333`) and headless Chrome with the sandbox
off; `BASE` and `CDP` override the URL and the debugging port. No npm
dependencies — the CDP tools use Node's built-in `WebSocket` (Node 22+).

Headless Chrome opens Mojo named pipes, which the confined sandbox forbids. Run
Chrome from a non-confined shell. On this machine only Windows PowerShell 5.1 is
installed (`pwsh` does not exist); use `powershell`, and check `$LASTEXITCODE`
for native commands rather than relying on `$ErrorActionPreference`.

## What survives

| Tool | Does | Needs |
|---|---|---|
| `serve.mjs` | Minimal static server on `127.0.0.1` (default port 3333, `node tools/serve.mjs [port]`). Correct MIME for `.mp4`, `.woff2` and the images; `cache-control: no-store`; no directory listing. | Node |
| `make-images.mjs` | Draws `files/og-card.jpg` (1200×630) from `files/painting-hero.jpg`; writes one poster per `.mp4` directly in `files/` to `files/posters/<stem>.jpg`; can derive video stills for projects whose team image is a placeholder. | serve + Chrome |
| `import-photos.mjs` | Imports the owner's staging photos into `files/`, resized to a 1600px long edge at JPEG quality 82. The `MAPPING` table is the contract between source filenames and the paths in `js/data.js`. | Chrome |
| `vendor-fonts.mjs` | Writes the vendored Newsreader/Courier Prime `.woff2` files, their OFL texts and the generated `css/fonts.css`. Preserves `unicode-range`. `--check` reports drift without writing. | serve + Chrome |
| `vendor-icons.mjs` | Writes the twelve Font Awesome glyphs as inline SVG in `js/icons.js`, plus `files/icons/LICENSE.txt`. `--check` reports drift without writing. | serve + Chrome |
| `orphans.mjs` | Lists CSS classes nothing emits, and emitted class names with no rule. Reads `css/styles.css`, `js/main.js`, `index.html` and `js/data.js`. | Node |
| `library-check.mjs` | Validates `docs/library/` against the live source: index consistency, page format, anchor resolution, `PORTFOLIO` paths, CSS/id/`data-*`/emitted-class coverage, data coverage, integration, no-line-numbers and cited files. Run as the last `npm test` suite; `--page <path>` checks one page. | Node |
| `caption-worklist.mjs` | Prints a pasteable `pieces: [...]` block for every record that has no per-photograph captions. | Node |
| `shot-url.mjs` | Captures any URL at a viewport: `node tools/shot-url.mjs <url> <out.png> [width] [height]`. Default 1440×900. | Chrome |

## The ones that matter now

### `serve.mjs`

```powershell
node tools/serve.mjs 3333
# http://127.0.0.1:3333/
```

The server is the base the CDP tools navigate to. It serves the working
directory, not a build directory, which is why opening `index.html` directly and
serving it produce the same page (apart from what the browser does with local
font and video URLs).

### `make-images.mjs`

Three passes in one run:

1. **OG card.** `files/og-card.jpg`, 1200×630, from
   `files/painting-hero.jpg`, with a bottom gradient and the name/title drawn
   in Georgia on the canvas. This is what `index.html`'s `og:image` and
   `twitter:image` point at.
2. **Film posters.** Every `.mp4` directly in `files/` gets
   `files/posters/<stem>.jpg`: 960px wide, JPEG quality 82, decoded by Chrome at
   `min(1.5s, duration / 3)`. Six posters are in the repo and
   `tests/hang.test.mjs` asserts each shipped project has its still on disk.
3. **Optional stills.** The `STILLS` table writes team images for HiveMind and
   SATLearn from their films at about 40% of the duration, then prints the
   `js/data.js` line to wire each one. As shipped, neither output is in `files/`
   and both records still point at `PlaceHolder.png`; the tool does not edit the
   data file.

It needs `files/painting-hero.jpg` and the films to stay. Do **not** substitute
the ffmpeg bundled with Playwright: it is built with `--disable-everything` and
has no H.264 decoder, so it cannot open these MP4s.

### `import-photos.mjs`

Default source is `~/Downloads/AAA`; override it with `SRC=`. It serves the
staging folder to a same-origin Chrome tab, draws each image onto a canvas at
`MAX_EDGE=1600` and `QUALITY=0.82`, and writes the JPEG into `files/`. Re-running
is idempotent: it rewrites `files/<target>` from the original source.

The `MAPPING` table at the top is authoritative. Add an entry there before
wiring a new path into `js/data.js`. The six missing photographs — Personnel's
Week (×2), Commencement (×2), Work Immersion and the 2023 National Youth
Congress — have **no** mappings today, which is why their data paths 404 and
fall back to `PlaceHolder.png`. The importer sniffs JPEG/PNG magic bytes, so a
`.CR3` that is really a JPEG imports fine.

### `vendor-fonts.mjs`

```powershell
node tools/vendor-fonts.mjs --check
node tools/vendor-fonts.mjs
```

Writes the woff2 files and OFL texts under `files/fonts/`, then rewrites
`css/fonts.css` with local URLs. The source stylesheet and bytes are fetched
once, at dev time, inside Chrome; the runtime page stays entirely local. The
`unicode-range` on each face is preserved, so an English visit downloads only the
latin files.

The vendored Newsreader declares weights 400/500/600. `css/styles.css` asks for
300 on display text, which resolves to the closest declared face (400). A true
300 would require vendoring that face, not changing a number.

### `vendor-icons.mjs`

Writes `js/icons.js` and the CC BY 4.0 licence at `files/icons/LICENSE.txt`,
using the pinned Font Awesome 5.15.4 tag. `--check` reports drift without
writing.

**The profile page does not load `js/icons.js` and never calls `Site.icon()`.**
The social records still carry `icon` names, but the masthead, buttons and rail
draw no glyphs. The file is kept for a future surface, not because the page needs
it; do not add the script back without a reason.

### `orphans.mjs`

A quick static sanity check after a rename or a section deletion:

```powershell
node tools/orphans.mjs
```

It prints two lists: declared CSS classes that no emitted class name matches, and
emitted class names with no stylesheet rule. It is a string scan, not a CSS
parser and not a renderer, so it can report a false orphan for a class assembled
in a way it does not anticipate. Use it to find the obvious tail of a deleted
feature, then confirm by grep.

### `caption-worklist.mjs`

Prints `pieces: [...]` blocks for records that lack captions, using
`Site.groupPieces`. It is still runnable, but the profile page does not render
`pieces[]` or a catalogue: the frames are labelled Overview / Film / Team and the
records are described by their own copy. Treat its output as dormant data
maintenance, not as a page fix.

### `shot-url.mjs`

```powershell
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/home-1440.png 1440 900
```

Captures the viewport after a fixed wait. It does not scroll, auto-load lazy
images or capture beyond the viewport; for section-by-section or full-page shots
use Chrome DevTools' capture or a scratch CDP script under `.tmp-diag/`
(gitignored).

## The usual pair

```powershell
# terminal 1
node tools/serve.mjs 3333

# terminal 2 — Chrome must run outside the confined sandbox
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new `
  --remote-debugging-port=9222 --user-data-dir="$env:TEMP\profile-tools" about:blank

# terminal 3
node tools/shot-url.mjs http://127.0.0.1:3333/ .tmp-diag/home-1440.png 1440 900
```

A reused debugging port can still be attached to the previous URL; check the page
before trusting a capture. `.tmp-diag/` is gitignored, so screenshots and scratch
probes do not enter the repo.

## Retired with the horizontal walk

The following are walk-era tools. They target `#hall`, `#strip`, `.room`,
`.stand`, `.piece`, the dock, the Lenis build or the mural — none of which exist
on this page. They are **retired and will be deleted in the cleanup commit**.
The page probes among them yield `null`, `NaN` or an immediate selector failure;
none of them measures this page.

| Group | Tools |
|---|---|
| Browser/UX and geometry | `ux-check.mjs`, `stand-boxes.mjs`, `stand-fit.mjs`, `stand-gap.mjs`, `stand-overflow.mjs`, `label-depth.mjs`, `label-fit.mjs`, `rooms.mjs`, `widths.mjs`, `avg-frame.mjs`, `pieces.mjs`, `dock-check.mjs`, `shot-room.mjs` |
| Mural / wall | `wall-crop.mjs`, `wall-drift.mjs`, `wall-import.mjs`, `wall-move.mjs`, `wall-pixels.mjs`, `wall-readshot.mjs`, `wall-roomseam.mjs`, `wall-tune.mjs`, `wall-verify.mjs`, `mural-columns.mjs`, `mural-map.mjs` |
| Old diagnostics | `overlap-diag.mjs`, `key-diag.mjs`, `probe.mjs`, `shot.mjs` |

`probe.mjs` and `shot.mjs` are easier to miss, but they are equally walk-bound:
both query `#hall` / `#strip` / `.room`, so they cannot measure the profile page.
Include them in the cleanup.

The DOM and browser suites those tools were paired with (`shell-check.mjs`,
`renderer.test.mjs`, `lights.test.mjs`, `delegation.test.mjs`,
`tests/dom-harness.mjs`) are already gone. There is **no replacement geometry
suite** for this page: the static guard and the data suites do not model layout,
so screenshots and manual inspection are the verification. `shot-url.mjs` is the
one generic capture tool that survives.

The assets those tools measured are also retired and unreferenced by the page:
`js/vendor/` (Lenis), `js/icons.js` (no loader) and
`files/wall-mushoku.webp` (the dragon-frieze wall). `files/painting.jpg`, by
contrast, is live — it is the harvest painting behind About, Hivemind, Focus
Buddy, BiyaHey! and Honours. Do not sweep it up with the walk's leftovers.
