# Vendored webfonts

Do not edit these files. They are downloaded from Google Fonts, and
`css/fonts.css` — which names them — is generated. Re-run
`tools/vendor-fonts.mjs` to refresh; `--check` reports drift without writing.

- Source: `https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime&display=swap`
- Licences: both families are **SIL OFL 1.1**. The licence text ships beside the
  bytes as `newsreader-OFL.txt` and `courier-prime-OFL.txt`, which the OFL
  requires.
- Why vendored: the site has no build step and no CDN at runtime.
  `index.html` used to link `fonts.googleapis.com` for the stylesheet and
  `fonts.gstatic.com` for the bytes, behind two `preconnect`s. This is what
  replaced that.

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| `courier-prime-latin.woff2` | 18640 | `f09844e1f4fe9e67` |
| `courier-prime-latin-ext.woff2` | 12736 | `efbea074e3d87eec` |
| `newsreader-latin.woff2` | 58084 | `62981321d9a3cc7a` |
| `newsreader-latin-ext.woff2` | 36244 | `ac6fa9ed533278f4` |
| `newsreader-extra.woff2` | 11932 | `f0dcc9795666850c` |
| `newsreader-italic-latin.woff2` | 24340 | `fa9b900403949d9a` |
| `newsreader-italic-latin-ext.woff2` | 15228 | `b775f4faa4ffd1bb` |
| `newsreader-italic-extra.woff2` | 5556 | `f7e98aa7b0c65d42` |
| `newsreader-OFL.txt` | 4394 | `fdfad38143ec4705` |
| `courier-prime-OFL.txt` | 4403 | `9a755af092b49494` |

## Why eight files for two families

**Newsreader is a variable font.** One file per subset serves weights 400, 500
and 600 — which is why `css/fonts.css` holds 14 `@font-face` rules but only
eight files exist. The roman and italic faces are separate files.

The three subsets are `latin` (`U+0000-00FF`), `latin-ext` (`U+0100-02BA` and
friends) and `extra` (the small `U+0102-0103` range). The names are cosmetic:
`unicode-range` in `css/fonts.css` is preserved verbatim from Google's own
stylesheet, and that is what a browser obeys.

**So the file count is not the page cost.** An English visitor downloads the two
`latin` files and never asks for `latin-ext` or `extra`. 178.5 KB is what the
repo carries, not what a visit transfers.

## Upgrading

```powershell
# terminal 1 — headless Chrome with debugging (shared with ux-check.mjs)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\ux-check-profile" about:blank

# terminal 2
node tools/serve.mjs 3333

# terminal 3 — report drift, or write it
node tools/vendor-fonts.mjs --check
node tools/vendor-fonts.mjs
```

Then update the sizes and hashes above and re-run `npm test`. A change to a
family's *metrics* is a layout change, so `tools/ux-check.mjs` is worth a run
too — the label's fit is measured against real rendered type.

The tool drives headless Chrome rather than fetching from Node: the session that
wrote it had no network egress, and Chrome does. It is also the only way to get
the bytes, because Chrome *downloads* a `.woff2` instead of rendering it, so
navigating to one yields no response body to read back.
