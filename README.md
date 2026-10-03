# Andrew Alangcao

**Data Engineer | Computational Cognition Researcher**

Personal portfolio website, built as a single horizontal walk through a dark gallery: eight rooms
side by side in one strip, each project, post and award hung as a **group** — a composition of
framed photographs carrying one exhibition label. Vanilla HTML, CSS and JavaScript — no frameworks
and no build step.

## About

My work and studies revolve around understanding perception as a foundation for building more general, adaptive AI systems, with the long-term goal of contributing to AGI development — all to improve everyday life for people in the Philippines and around the world.

## The walk

One room is one viewport tall, and the hall is the document's only scroller, on one axis:
horizontal. Chrome lives at the **foot** of the walk — a dock carrying every room and the current
one, with a rail along the bottom edge for position. Nothing is fixed over the top of a room.

A **group** is the unit that hangs: one project, one leadership post, or one award. Its photographs
hang together in frames with mats, and one label beneath it carries a plan of the hang, the
paragraph that frames the group, and a catalogue entry per photograph.

Because a room cannot scroll vertically — it is exactly one viewport tall inside a hall with
`overflow-y: hidden` — a room holds a fixed grid of at most six groups. Thirteen honours is
therefore three rooms, split evenly from the array's own order.

## Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, container queries, responsive design, near-black gallery palette
- **Vanilla JavaScript** — Data-driven rendering
- **Lenis 1.3.26** — Smooth horizontal scrolling, vendored in `js/vendor/`. MIT ©
  darkroom.engineering. This is the site's only dependency: it is committed, pinned by
  size and SHA-256 (`js/vendor/README.md`), and never resolved from a CDN at runtime.
  There is still no build step, no bundler and no package install needed to serve the site.

## Structure

```
├── index.html          Entry point — the hall, the strip, the dock, the rail, the dialog
├── css/
│   └── styles.css      All styles
├── js/
│   ├── data.js         Single source of truth — all content, the room derivation,
│   │                   the group split, and the honours partition
│   ├── main.js         Group renderer, label renderer, light controller, the Lenis
│   │                   walk, the dock, the dialog
│   └── vendor/         Lenis 1.3.26, vendored and pinned (see its README)
├── tests/              In-process unit suites (no test framework, no spawn)
├── files/              Images, videos, and assets
│   └── posters/        Poster frames for the project preview videos
├── tools/              Dev-only checks and asset generators (not required to run the site)
├── docs/               Plans and design notes
└── .gitignore
```

## Adding content

Every label is derived from `js/data.js`. A record may carry two optional fields, both authored:

```js
{
  description: "Some Award – Champion",
  year: "April 2026",
  images: ["files/award-1.jpg", "files/award-2.jpg"],
  summary: "The paragraph that frames the group.",        // optional
  pieces: [                                               // optional, one per image
    { title: "At the podium", caption: "Receiving the award." },
    { title: "With the team" }
  ]
}
```

Both are optional and every level falls back, so a record added without copy still renders: the
narrative falls back to the record's own description, and a piece with no title is named for its
position. `npm test` asserts that every shipped record has authored copy rather than fallback text.

## Running Locally

Open `index.html` in any browser — no server or build step required.

## Tests

The unit suites run **in-process** with a ten-line runner (`tests/harness.mjs`) instead of
`node --test`, which spawns child processes and fails under a confined sandbox:

```powershell
node tests/shell-check.mjs         # markup, palette and the hard constraints, statically
node tests/derive-rooms.test.mjs   # rooms, group pieces and the honours partition
node tests/light.test.mjs          # the light falloff maths
node tests/lights.test.mjs         # the lighting controller's contract
node tests/renderer.test.mjs       # the rendered DOM contract, under a DOM stub
node tests/gallery-index.test.mjs  # the honours gallery index lookup
node tests/delegation.test.mjs     # every control in the walk does something
npm test                           # runs the above in order
```

The suites that drive `js/main.js` run it under a DOM stub (`tests/dom-harness.mjs`). It does
**not** model CSS layout — a layout rule can still be wrong with every check green, so the browser
suite below remains the authority on anything visual.

`tools/ux-check.mjs` drives headless Chrome over the DevTools Protocol and is the authority on
layout: the fold, the dock band, the rail, tap targets, the dialog's focus containment, the
lighting contract and every room's fit at 1440×900 and at the spec's 1280×704 floor. It needs
headless Chrome, which needs named pipes — see `tools/README.md`.

`tools/rooms.mjs` and `tools/pieces.mjs` print per-room geometry and per-frame boxes at any
viewport, which is how a fit problem is diagnosed. Both force `loading="lazy"` images to load
first, or they would measure frames the walk has not reached.

## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.


## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.
