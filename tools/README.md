# Dev tools

Dev-only. Nothing here is needed to build or run the site: the site is plain
static files, and `npm test` invokes only `library-check.mjs` (through
`tests/library.test.mjs`). The browser tools need the site served
(`node tools/serve.mjs 3333`) and headless Chrome with the sandbox off; `BASE`
and `CDP` override the URL and the debugging port. No npm dependencies — the
CDP tools use Node's built-in `WebSocket` (Node 22+).

Headless Chrome opens Mojo named pipes, which the confined sandbox forbids. Run
Chrome from a non-confined shell. On this machine only Windows PowerShell 5.1 is
installed (`pwsh` does not exist); use `powershell`, and check `$LASTEXITCODE`
for native commands rather than relying on `$ErrorActionPreference`.

## What survives

| Tool | Does | Needs |
|---|---|---|
| `serve.mjs` | Minimal static server on `127.0.0.1` (default port 3333, `node tools/serve.mjs [port]`). Correct MIME for `.mp4`, `.woff2`, `.webp`, `.avif` and the images; `cache-control: no-store`; no directory listing. | Node |
| `optimize-images.py` | Encodes the committed image weights: every photograph to WebP, each painting to WebP **and** AVIF (the JPEG stays as the `image-set()` fallback). Idempotent, skips up-to-date outputs unless `--force`. Run after importing or adding a photograph. | Python + Pillow |
| `make-images.mjs` | Draws `files/og-card.jpg` (1200×630) from `files/painting-hero.jpg`; writes one poster per `.mp4` directly in `files/` to `files/posters/<stem>.jpg`; can derive video stills for projects whose team image is a placeholder. | serve + Chrome |
| `import-photos.mjs` | Imports the owner's staging photos into `files/`, resized to a 1600px long edge. The `MAPPING` table is the contract between source filenames and the paths in `js/data.js`. Writes JPEG; run `optimize-images.py` afterwards. | Chrome |
| `vendor-fonts.mjs` | Writes the vendored Newsreader/Courier Prime `.woff2` files, their OFL texts and the generated `css/fonts.css`. Preserves `unicode-range`. `--check` reports drift without writing. | serve + Chrome |
| `orphans.mjs` | Lists CSS classes nothing emits, and emitted class names with no rule. Reads `css/styles.css`, `js/main.js`, `index.html` and `js/data.js`. | Node |
| `library-check.mjs` | Validates `docs/library/` against the live source: index consistency, page format, anchor resolution, `PORTFOLIO` paths, CSS/id/`data-*`/emitted-class coverage, data coverage, integration, no-line-numbers and cited files. Run as the last `npm test` suite; `--page <path>` checks one page. | Node |
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

### `optimize-images.py`

```powershell
python tools/optimize-images.py
python tools/optimize-images.py --force
```

Writes, next to each source and without deleting it:

- `files/**/*.jpg` → `<stem>.webp` at quality 82. `js/data.js` points at these;
  `tests/hang.test.mjs` checks every recorded plugin screenshot exists.
- The two paintings → `painting-hero.webp` / `painting.webp` and
  `painting-hero.avif` / `painting.avif`. `css/styles.css` wires the three
  formats through `image-set()`; the JPEG is the fallback.
- `files/og-card.jpg`, `files/posters/*.jpg` and the small `files/profile.jpg`
  stay JPEG: social crawlers, the `Site.posterFor` rule and a 585px portrait
  where WebP came out larger.

Requires Python 3 with Pillow built with WebP and AVIF support (Pillow 12.x
ships both). This is a machine tool, not a project dependency, and the site has
no build step: the encoded files are committed.

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
`MAX_EDGE=1600` and writes the JPEG into `files/`. Re-running is idempotent: it
rewrites `files/<target>` from the original source. After importing, run
`python tools/optimize-images.py` to produce the WebP the page requests.

The `MAPPING` table at the top is authoritative. Add an entry there before
wiring a new path into `js/data.js`. The four missing photographs — Commencement
(×2), Work Immersion and the 2023 National Youth Congress — have **no** mappings
today and **no** data paths: their records carry no `images` field, so nothing
404s. The importer sniffs JPEG/PNG magic bytes, so a `.CR3` that is really a
JPEG imports fine.

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

## What was deleted

The horizontal walk's tools — `ux-check`, the `stand-*`, `label-*`, `wall-*` and
`mural-*` probes, `rooms`, `widths`, `avg-frame`, `pieces`, `dock-check`,
`shot-room`, `overlap-diag`, `key-diag`, `probe`, `shot` — were deleted with the
walk they measured. So were `vendor-icons.mjs` and `caption-worklist.mjs`: the
page loads no icon set, and captions are no longer authored. `js/icons.js`,
`files/icons/` and `files/wall-mushoku.webp` went with them.

There is **no replacement geometry suite** for this page: the static guard and
the data suites do not model layout, so screenshots and manual inspection are the
verification. `shot-url.mjs` is the one generic capture tool that survives.
