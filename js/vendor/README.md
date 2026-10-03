# Vendored dependencies

Do not edit these files. They are copied verbatim from published packages.

## Lenis 1.3.26

- Source: https://unpkg.com/lenis@1.3.26/dist/
- Licence: MIT © darkroom.engineering
- Why vendored: the site has no build step and no CDN at runtime.

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| `lenis.min.js` | 18722 | `53195c9797e7ce7b` |
| `lenis-snap.min.js` | 5844 | `510e75108ec32d5f` |
| `lenis.css` | 513 | `2f668ae84a668327` |

Both scripts are classic (IIFE) builds: `lenis.min.js` sets `globalThis.Lenis`,
`lenis-snap.min.js` sets `globalThis.Snap`.

## Upgrading

Re-run the download, update the sizes and hashes above, then re-run
`tools/ux-check.mjs`. `lenis-snap` switching on `isHorizontal` is load-bearing
for this project — confirm it still reads `isHorizontal` before accepting a
newer build.
