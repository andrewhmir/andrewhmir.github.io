# Vendored dependencies

Do not edit these files. They are copied verbatim from published packages.

## Lenis 1.3.26

- Source: https://unpkg.com/lenis@1.3.26/dist/
- Licence: MIT © darkroom.engineering
- Why vendored: the site has no build step and no CDN at runtime.
- Wired by: `index.html` loads `lenis.min.js` before `js/data.js` and
  `lenis.css` in `<head>`; `js/main.js` constructs it in `wireSmoothScroll()`
  unless `prefers-reduced-motion: reduce`.

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| `lenis.min.js` | 18722 | `53195c9797e7ce7b` |
| `lenis.css` | 513 | `2f668ae84a668327` |

`lenis.min.js` is a classic (IIFE) build: it sets `globalThis.Lenis`. It is the
site's only vendored script and its only third-party runtime code.
`lenis-snap.min.js` (5844 bytes, `510e75108ec32d5f`) sat beside it and set
`globalThis.Snap`; it was deleted when the walk's snap was removed, and
`js/main.js` never constructs `Snap`.

## Upgrading

Re-run the download, update the sizes and hashes above, then re-run `npm test`
and re-check the reduced-motion, wheel, anchor and dialog paths in a browser.
`tools/ux-check.mjs` is retired and tests the old horizontal walk.
