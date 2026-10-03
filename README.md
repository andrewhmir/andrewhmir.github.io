# Andrew Alangcao

**Data Engineer | Computational Cognition Researcher**

Personal portfolio website, built as a single horizontal walk through a dark gallery: six rooms
side by side in one strip, each project hung as a work in its own pool of light. Vanilla HTML, CSS
and JavaScript — no frameworks and no build step.

## About

My work and studies revolve around understanding perception as a foundation for building more general, adaptive AI systems, with the long-term goal of contributing to AGI development — all to improve everyday life for people in the Philippines and around the world.

## Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, responsive design, near-black gallery palette
- **Vanilla JavaScript** — Data-driven rendering
- **Lenis 1.3.26** — Smooth horizontal scrolling, vendored in `js/vendor/`. MIT ©
  darkroom.engineering. This is the site's only dependency: it is committed, pinned by
  size and SHA-256 (`js/vendor/README.md`), and never resolved from a CDN at runtime.
  There is still no build step, no bundler and no package install needed to serve the site.

## Structure

```
├── index.html          Entry point — the hall, the strip, the directory, the dialog
├── css/
│   └── styles.css      All styles
├── js/
│   ├── data.js         Single source of truth — all content, plus the room derivation
│   ├── main.js         Room renderer, light controller, the Lenis walk, the dialog
│   └── vendor/         Lenis 1.3.26, vendored and pinned (see its README)
├── tests/              In-process unit suites (no test framework, no spawn)
├── files/              Images, videos, and assets
│   └── posters/        Poster frames for the project preview videos
├── tools/              Dev-only checks and asset generators (not required to run the site)
├── docs/               Plans and design notes
└── .gitignore
```

## Running Locally

Open `index.html` in any browser — no server or build step required.

## Tests

Three unit suites plus a browser contract check. The unit suites run **in-process** with a
ten-line runner (`tests/harness.mjs`) instead of `node --test`, which spawns child processes
and fails under a confined sandbox:

```powershell
node tests/derive-rooms.test.mjs   # rooms derived from project categories
node tests/light.test.mjs          # the light falloff maths
node tests/lights.test.mjs         # the lighting controller's contract
node tests/renderer.test.mjs       # the rendered DOM contract, under a DOM stub
node tests/gallery-index.test.mjs  # the honours gallery index lookup
node tests/delegation.test.mjs     # every control in the walk does something
npm test                           # runs the above in order
```

The two suites that drive `js/main.js` run it under a DOM stub (`tests/dom-harness.mjs`) that
models the parent chain, `offsetLeft`/`offsetParent`, `dataset` and event propagation. It does
**not** model CSS layout — a layout rule can still be wrong with every check green, so the browser
suite above remains the authority on anything visual.

`tools/ux-check.mjs` additionally drives headless Chrome over the DevTools Protocol to verify
the interaction contract on the horizontal axis (the walk moves and settles, lights come up and
stay up, no work hangs empty, modal focus containment, tap targets at 390×844). It is dev-only
and needs headless Chrome, which needs named pipes — see `tools/README.md`.

## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.


## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.
