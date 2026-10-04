# Dev tools

Not required to build or run the site — the site is plain static files.

## ux-check.mjs

Drives headless Chrome over the DevTools Protocol to assert the UX contract. It
is the **authority on anything geometric**: the DOM stub the unit suites use
(`tests/dom-harness.mjs`) models no layout, so a layout rule can be wrong with
every unit check green. The site is a single horizontal walk, so these checks
scroll `#hall` along its one axis rather than scrolling the document; nothing
here asserts frame rate, because headless Chrome has no GPU.

Sections cover the layout contract (the hall's own height, a room being exactly
one viewport tall, no room content crossing into the dock band at the foot, at
both 1440×900 and the spec's 1280×704 floor), the dock and the rail, the
keyboard still reaching the walk with the native scrollbar hidden, the whole
piece as a click target, a piece being framed and named, gallery rows, modal
focus containment, that the walk moves and settles, that lights come up and
stay up per piece, that no piece hangs empty, and tap targets at 390×844.

It is also the only place the gallery's own geometry can be checked, because the
DOM stub in `tests/` models no CSS: that a gallery with more hang than one
screen is wider than the viewport, that no gallery is narrower than one screen,
that every label is the same width, that the deepest arrangement stays inside
the room's band at both reference viewports, and that every frame clears 44×44
there.

No npm dependencies; uses Node's built-in `WebSocket` (Node 22+).

```powershell
# terminal 1 — serve the site
node tools/serve.mjs 3333

# terminal 2 — headless Chrome with debugging
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 3 — run the checks
node tools/ux-check.mjs
```

Exit code is `0` when every check passes, `1` otherwise.
Override the targets with the `BASE` and `CDP` environment variables.

Headless Chrome needs Mojo named pipes to start, so this tool cannot run from a
session whose sandbox forbids named-pipe access — run it with the sandbox off.

## serve.mjs

A minimal static file server, because `ux-check.mjs` and the probes below need
one and the site has no build step:

```powershell
node tools/serve.mjs 3333
```

## The geometry probes

Four read-only probes that print numbers instead of asserting them. They are how
a fit problem gets diagnosed, and all four force `loading="lazy"` images to load
before measuring — a photograph in a room the walk has not reached is never
fetched, so an un-forced probe measures the loading floor rather than the wall.

| Tool | Prints |
|---|---|
| `rooms.mjs [w] [h]` | Per room: group count, the gallery's width against one screen, the deepest column of each hang, title top, last group's bottom, dock top. Every row says `ok` or `FAIL` against the fold. |
| `pieces.mjs [room]` | Per frame in one room: its box, whether it is a lead or awaited, the image's box, its natural size, whether it loaded, and the resolved `--lead-h` / `--sup-h`. |
| `widths.mjs [w] [h] [room]` | The gallery's width against one screen, then per group: its arrangement, its width, its cluster's width and its label's. |
| `dock-check.mjs [w] [h]` | Every dock control's size and position, and which are outside the viewport. |

There are no grid tracks to print any more: a gallery is one row as wide as its
own hang, and each group's width follows its arrangement and its photographs.

`shot.mjs` and `shot-room.mjs` capture a screenshot of the walk or of one named
room; `shot-url.mjs` captures any URL, which is how the design mockups under
`.superpowers/mockups/` were checked.

## make-images.mjs

Generates the Open Graph share card (`files/og-card.jpg`), one poster frame per
project video (`files/posters/*.jpg`), and a still for each project whose media
is a video and whose image is missing or a placeholder (the `STILLS` table at
the top), using headless Chrome's own video decoding and canvas. The still pass
prints the `js/data.js` line to wire each file in — it does not edit the data
file, so nothing there ever references an image that is not on disk yet.

Do **not** substitute the ffmpeg bundled with Playwright — it is built with
`--disable-everything` and has no H.264 decoder, so it cannot open these MP4s.

## import-photos.mjs

Imports the source photos from the staging folder (`~/Downloads/AAA` by default,
override with `SRC=`) into `files/`, resized to 1600px on the long edge at JPEG
quality 82. The `MAPPING` table at the top of the script is the contract between
the source filenames and the paths referenced in `js/data.js`; add an entry there
before wiring a new path into the data file.

It serves the staging folder to a headless Chrome tab (same-origin, so the canvas
stays untainted) and lets Chrome do the decoding and resizing. Re-running is
idempotent and reports `source -> shipped` sizes.

```powershell
# terminal 1 — headless Chrome with debugging (also used by ux-check.mjs)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 2 — import
node tools/import-photos.mjs
```

Source files whose extension lies about their format are handled — the server
sniffs the JPEG/PNG magic bytes, so a `.CR3` that is really a JPEG imports fine.

Note: headless Chrome needs Mojo named pipes to start, so these tools cannot run
from a session whose sandbox forbids named-pipe access.


Generates the Open Graph share card (`files/og-card.jpg`), one poster frame per
project video (`files/posters/*.jpg`), and a still for each project whose media
is a video and whose image is missing or a placeholder (the `STILLS` table at
the top), using headless Chrome's own video decoding and canvas. The still pass
prints the `js/data.js` line to wire each file in — it does not edit the data
file, so nothing there ever references an image that is not on disk yet.

Do **not** substitute the ffmpeg bundled with Playwright — it is built with
`--disable-everything` and has no H.264 decoder, so it cannot open these MP4s.

## import-photos.mjs

Imports the source photos from the staging folder (`~/Downloads/AAA` by default,
override with `SRC=`) into `files/`, resized to 1600px on the long edge at JPEG
quality 82. The `MAPPING` table at the top of the script is the contract between
the source filenames and the paths referenced in `js/data.js`; add an entry there
before wiring a new path into the data file.

It serves the staging folder to a headless Chrome tab (same-origin, so the canvas
stays untainted) and lets Chrome do the decoding and resizing. Re-running is
idempotent and reports `source -> shipped` sizes.

```powershell
# terminal 1 — headless Chrome with debugging (also used by ux-check.mjs)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 2 — import
node tools/import-photos.mjs
```

Source files whose extension lies about their format are handled — the server
sniffs the JPEG/PNG magic bytes, so a `.CR3` that is really a JPEG imports fine.

Note: headless Chrome needs Mojo named pipes to start, so these tools cannot run
from a session whose sandbox forbids named-pipe access.
