# Dev tools

Not required to build or run the site — the site is plain static files.

## ux-check.mjs

Drives headless Chrome over the DevTools Protocol to assert the UX contract
(card click targets, keyboard access, modal focus containment, tap targets).
No npm dependencies; uses Node's built-in `WebSocket` (Node 22+).

```powershell
# terminal 1 — serve the site
npx http-server -p 3333

# terminal 2 — headless Chrome with debugging
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 3 — run the checks
node tools/ux-check.mjs
```

Exit code is `0` when every check passes, `1` otherwise.
Override the targets with the `BASE` and `CDP` environment variables.

## make-images.mjs

Generates the Open Graph share card (`files/og-card.jpg`) and one poster frame
per project video (`files/posters/*.jpg`), using headless Chrome's own video
decoding and canvas.

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
