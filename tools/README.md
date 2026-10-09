# Dev tools

Not required to build or run the site — the site is plain static files.

Every tool here needs the site served (`node tools/serve.mjs 3333`) unless it
says otherwise, and every one that renders needs headless Chrome with the
sandbox off. `BASE` and `CDP` override the URL and the debugging port.

## Which tool for which symptom

| A visitor reports | Run |
|---|---|
| "content is cut off at the bottom" | `ux-check.mjs` (the authority), then `rooms.mjs` |
| "a frame is squashed / has black bars" | `pieces.mjs`, then `label-fit.mjs` |
| "a frame's bottom edge is missing" | `stand-boxes.mjs <entry>` — the cell's padding box is the edge that clips |
| "two photographs overlap" | `label-fit.mjs` |
| "one stand doesn't fit one screen" | `stand-gap.mjs`, then `stand-overflow.mjs` |
| "the pictures read too small" | `avg-frame.mjs`, then `stand-fit.mjs` |
| "the wall / mural looks wrong" | `wall-verify.mjs` first; `wall-pixels.mjs` for contrast |
| "there's a line on the wall" | `mural-columns.mjs` — is it in the picture or in the CSS? |
| "a photograph has no description" | `caption-worklist.mjs` |
| "the dock is off screen / too small" | `dock-check.mjs` |

Do not reach for `wall-drift.mjs` — it reports `STATIC` for a wall that moves.
See its note below.

## ux-check.mjs

Drives headless Chrome over the DevTools Protocol to assert the UX contract. It
is the **authority on anything geometric**: the DOM stub the unit suites use
(`tests/dom-harness.mjs`) models no layout, so a layout rule can be wrong with
every unit check green. The site is a single horizontal walk, so these checks
scroll `#hall` along its one axis rather than scrolling the document; nothing
here asserts frame rate, because headless Chrome has no GPU.

Sections cover the layout contract (the hall's own height, a room being exactly
one viewport tall, no room content crossing into the dock band at the foot, at
both 1440×900 and the spec's 1280×704 floor), the dock and the room heading that
pins itself to the walk, the keyboard still reaching the walk with the native
scrollbar hidden, the whole
piece as a click target, a piece being framed and named, gallery rows, modal
focus containment, that the walk moves and settles, that lights come up and
stay up per piece, that no piece hangs empty, and tap targets at 390×844.

It is also the only place the gallery's own geometry can be checked, because the
DOM stub in `tests/` models no CSS: that no gallery is narrower than one screen,
that every label is the same width, that the deepest arrangement stays inside
the room's band at both reference viewports, and that every frame clears 44×44
there. Each frame is measured against its own WALL CELL as well as against its
stand, because the cell is the box that clips and the stand is the looser of the
two: a stand-level check passed a frame the cell had cut, which is how the 14px
drop shaved the bottom off one frame per stand — six of them photographs —
without any check noticing. The honours room is measured here too, because
"three columns" is a layout fact and no unit check can see it: that it is exactly
one screen wide,
that its tiles land in three columns and no more than two rows, that none of
them crosses the dock band or the fold at 1440×900 and at 1280×704, and that
each one clears 44×44.

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

Read-only probes that print numbers instead of asserting them. They are how a fit
problem gets diagnosed, and all of them force `loading="lazy"` images to load
before measuring — a photograph in a room the walk has not reached is never
fetched, so an un-forced probe measures the loading floor rather than the wall.

| Tool | Prints |
|---|---|
| `rooms.mjs [w] [h]` | Per room: group count, the gallery's width against one screen, the deepest column of each hang, title top, last group's bottom, dock top. Every row says `ok` or `FAIL` against the fold. The honours room reports no groups and exactly one screen, both by design. |
| `stand-fit.mjs [w] [h]` | The band one stand may use, the resolved `--band-h` / `--max-panel-h` / `--label-w` tokens, and every stand in the Robotics gallery with its cluster's width, height and first frame. Also prints the band the room's own furniture IMPLIES, which is the number `--band-h` has to beat. |
| `stand-gap.mjs [w] [h]` | Per room: the smallest gap between two stands, and — with each stand centred in the screen the way the snap parks it — how much of the screen it leaves bare and whether any neighbouring stand is in shot. This is the check that "one stand per screen" is a property of the wall. |
| `stand-overflow.mjs [w] [h]` | Every stand wider than the screen it is being looked at on, worst first, with its arrangement, its column count and its first frame. A stand wider than the viewport is one a visitor cannot take in at a glance. |
| `stand-boxes.mjs <entry> [w] [h]` | One stand, dissected: every column's inline style, resolved max-width and box, then every frame in it with its box, its computed width and height, and its photograph's box. This is how a frame that is not where its column puts it gets found. |
| `label-fit.mjs [w] [h]` | How much of each label is actually visible, and whether frames from one stand paint over another's photographs — both overflow questions no rect-against-the-dock check can see. |
| `caption-worklist.mjs [filter]` | Every record with no per-photograph captions, as a `pieces: [...]` block to paste into `js/data.js`, each entry carrying its letter and its file. The catalogue's text comes from `pieces[]` and nowhere else, so this is the list of photographs a visitor cannot be told about. |
| `avg-frame.mjs [w] [h]` | Per room: the median, smallest and largest frame, the walk's length in screens, and the **photograph area per screen** — the one number for "how big do the pictures read". |
| `pieces.mjs [room]` | Per frame in one room: its box, whether it is a lead or awaited, the image's box, its natural size, whether it loaded, and the resolved `--band-h` / `--max-panel-h` / `--panel-h`. |
| `widths.mjs [w] [h] [room]` | The gallery's width against one screen, then per group: its arrangement, its width, its cluster's width and its label's. |
| `dock-check.mjs [w] [h]` | Every dock control's size and position, and which are outside the viewport. |

There are no grid tracks to print any more: a gallery is one row as wide as its
own hang, and each stand's width follows its arrangement and its photographs.
A frame's height is its column's `--panel-h`, which the column computes from its
own depth — so the number that moves when the hang is retuned is `--max-panel-h`
and `--band-h` in `css/styles.css`, and these probes are how to see the effect.

`shot.mjs` and `shot-room.mjs` capture a screenshot of the walk or of one named
room; `shot-url.mjs` captures any URL, which is how the design mockups under
`.superpowers/mockups/` were checked.

## The wall: `wall-import.mjs`, `wall-verify.mjs`, `wall-move.mjs`, `wall-tune.mjs`, `wall-pixels.mjs`

The museum's background mural is one image, tiling on both axes, painted as
`#hall`'s OWN background with `background-attachment: local`. Both halves of that
are load-bearing and both fail silently:

- `local` binds the painting to the SCROLLED CONTENT. A background on a scroll
  container is pinned to the container's box by default, so the wall holds still
  while the rooms slide past. Measured frame-to-frame over nine 45px steps:
  `local` 5.16, `scroll` 0.00, `fixed` 0.00.
- It has to be the hall's background, because nothing inside this walk can span
  it. `#hall` and `#strip` both have a 987px layout box inside a 32227px scroll
  — the rooms overflow the strip, they do not widen it — so a separate
  absolutely-positioned `.wall` layer resolved `inset: 0` to one VIEWPORT. It
  measured 987px backing a 30601px walk, and the mural's fill area ended at
  x=987: scroll past the first screen and the visitor was on bare `--night`.
  That is what `wall-verify.mjs` now guards.

| Tool | Does |
|---|---|
| `wall-import.mjs` | Imports the mural from `~/Downloads` into `files/wall-mushoku.webp` — scale, re-encode, **peak targeting**, optional seam blending. Prints the palette, the luminance quantiles and the brightest pixel. |
| `wall-verify.mjs` | The regression check for the arrangement above: asserts the walk is many screens wide, that the computed `background-attachment` is `local`, that no `.wall` layer exists, that the mural band is textured at seven offsets spread across the whole walk, and that a 45px scroll step actually changes the mural. |
| `wall-move.mjs` | The direct form of the travel argument: prints `mean|A(x) - B(x)|` for the same viewport strip at six pairs of offsets. A pinned background gives 0.000. |
| `wall-crop.mjs` | Renders the wall at several candidate `--wall-tile` sizes and prints, per candidate, the resolved tile, copies across, copies down and image scale — plus a screenshot of each. This is the authority on "is the loop visible and is the whole picture on the wall". |
| `wall-tune.mjs` | Sweeps crown-scrim alphas over the live page and prints, per candidate, the brightened-ground quantiles and the contrast each text tier meets. This is how the crown's alpha was chosen. |
| `wall-pixels.mjs` | Reads the rendered page at one scroll offset: a column of real pixels down the wall and the WCAG contrast of each text tier against the lightest ground found. This is the authority on whether the wall passes. |
| `wall-readshot.mjs` | Reads a SCREENSHOT rather than the page — row, column and periodicity profiles, with no browser and no server. Useful for diagnosing a render someone else captured. |
| `wall-roomseam.mjs` | Measures the About/Robotics boundary, which `.room`'s `border-right` draws. Reports the luminance step across it and ablates the border, the scrims and the wall nap to show which one makes the edge. This is how the border was caught drawing a visible line down the mural, and it is why the border is now a dark recess. |

## A room's edge is a recess

`.room` carries `border-right: 1px solid rgba(8, 12, 14, 0.55)` — a DARK hairline.
It used to be `var(--edge-soft)`, a cool white at 7%, and that is a LIGHT line. On
a flat black wall a light line reads as a soft division; over the mural it reads
as a line drawn down the wall, because the eye finds a bright hairline far more
easily against texture than against a void. It only became visible once the mural
was actually behind it — the two bugs were independent, and fixing the mural is
what exposed this one.

Measured at scrollLeft 500 on the About/Robotics boundary, the bright border put a
+13.9/-7.0 luminance step on one column (21.49 summed across three), ranking it the
8th largest deviation of 983 columns on the whole wall. The dark recess measures
5.57 and reads as a joint in stone. `tests/shell-check.mjs` asserts the border's
LUMINANCE is no lighter than the wall, so it can be retuned but not lit up again.

## The wall nap is gone, and sub-pixel dots are why

`.room::before` used to draw a "wall nap": two offset dot grids on a 4px period,
at 0.5px and 0.6px. A dot smaller than a pixel inside a `radial-gradient` is
antialiased against the pixel grid, and on a WIDE viewport at a non-integer device
pixel ratio that quantises into hard vertical columns running the whole height of
the room — literal lines drawn on the mural.

This is why every earlier probe at 987x852 missed it. The artefact needs width and
a fractional dpr together:

| window | dpr | worst column, % of rows |
|---|---|---|
| 987x852 | 1 | 33.8% — ordinary texture |
| 1917x1078 | 1 | 23.3% — ordinary texture |
| 1917x1078 | 2 | **97.4%** — a line, mean -3.3 |
| 1917x1078, nap removed | 2 | 19.9% — back to texture |

It survived removing the room border, the scrims AND the mural, which is what
identified it: the nap was the only layer left. `tests/shell-check.mjs` now has
two guards — the layer must be absent, and no `radial-gradient` stop may describe a
dot under one pixel. **Do not reintroduce a sub-pixel dot grid over the wall**; the
mural is the surface.

Two tools are useful for the next time a line appears:

| Tool | Does |
|---|---|
| `mural-columns.mjs` | Decodes the shipped asset through the browser and prints its per-column luminance and the darkest/brightest columns, plus whether the tile's edges join. This is the authority on "is that line in the picture?" — the asset's whole column range is only 32.9..41.06, so a line deeper than that cannot be mural content. |
| `mural-map.mjs` | Prints a coarse ASCII luminance map of the asset, to read what it depicts without opening it. |

Note that a probe which renders a screenshot must APPEND a fresh `<style>` element
per variant: replacing an existing rule's text can be missed, and two captures that
come back with the same SHA-256 are the same picture, not a negative result.


**`wall-drift.mjs` reports "STATIC" for a wall that moves, and its verdict should
not be trusted on this mural.** It searches, by correlation, for the shift at
which one scroll offset best matches another; but the mural is a periodic tiling
with a 900px period, so shift 0 and shift 900 are genuinely the same picture and
the search returns 0 for every delta. It aliases by construction. Use
`wall-verify.mjs` (frame differencing) or `wall-move.mjs` (raw column means)
instead — neither can be fooled by the period, because neither compares an image
against a shifted copy of itself.


`wall-import.mjs` takes `SRC`, `NAME`, `TARGET`, `WIDTH`, `PEAK`, `SAT` and
`SEAM`. Three of them matter:

- `PEAK` scales the whole asset so its brightest pixel lands there, because a
  background is composited per pixel and one bright chip is enough to fail a
  light text tier. Raising it makes the wall more visible and costs contrast.
- `WIDTH` sets the asset's width. It does not constrain `--wall-tile` — the tile
  is how large the picture is drawn, and `background-size: ... auto` scales the
  asset into it, so a tile is never a crop. What the tile controls is how many
  copies are in shot, and that is the whole "is the loop visible" question:
  wider than the window shows a single copy and reads as one image cut short,
  narrow enough to guarantee a repeat at every size turns a frieze into
  wallpaper. `--wall-tile` is therefore a bounded viewport-relative value, and
  `wall-compare.mjs` prints the copies-across/down table for any candidate.
- `PEAK` scales the whole asset so its brightest pixel lands there, because a
  background is composited per pixel and one bright chip is enough to fail a
  light text tier. Raising it makes the wall more visible and costs contrast.
- `SEAM` is off (0). It cross-fades each edge into the opposite edge, which is
  how a texture is made to loop; on a picture it dissolves the two ends of the
  composition. Raise it only if the join reads badly.

`tests/shell-check.mjs` re-derives the contrast floor from the shipped asset and
asserts the tile's shape and the `local`/own-background arrangement, failing if
either drifts.

Note: headless Chrome needs Mojo named pipes, so every one of these needs the
sandbox off. They also need the page served: `node tools/serve.mjs 3333` unless
`BASE` overrides it, and a reused debugging port can still be sitting on the
previous URL — `wall-drift.mjs` and `wall-verify.mjs` both check that the walk
actually loaded before measuring.

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
