# Vendored dependencies

Do not edit these files. They are copied verbatim from published packages.

## Lenis 1.3.26

- Source: https://unpkg.com/lenis@1.3.26/dist/
- Licence: MIT © darkroom.engineering
- Why vendored: the site has no build step and no CDN at runtime.

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| `lenis.min.js` | 18722 | `53195c9797e7ce7b` |
| `lenis.css` | 513 | `2f668ae84a668327` |

`lenis.min.js` is a classic (IIFE) build: it sets `globalThis.Lenis`. It is the
site's only vendored script. `lenis-snap.min.js` (5844 bytes,
`510e75108ec32d5f`) sat beside it and set `globalThis.Snap`; it was deleted when
the walk's snap was removed, and `js/main.js` no longer constructs `Snap`.

## Upgrading

Re-run the download, update the sizes and hashes above, then re-run
`tools/ux-check.mjs`.
