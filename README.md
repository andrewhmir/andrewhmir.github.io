# Andrew Alangcao

**Data Engineer | Computational Cognition Researcher**

Personal portfolio website built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools — just clean, responsive code.

## About

My work and studies revolve around understanding perception as a foundation for building more general, adaptive AI systems, with the long-term goal of contributing to AGI development — all to improve everyday life for people in the Philippines and around the world.

## Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, responsive design, warm-toned palette
- **Vanilla JavaScript** — Data-driven rendering, no dependencies

## Structure

```
├── index.html          Entry point
├── css/
│   └── styles.css      All styles
├── js/
│   ├── data.js         Single source of truth — all content
│   └── main.js         Rendering engine & interactions
├── files/              Images, videos, and assets
│   └── posters/        Poster frames for the project preview videos
├── tools/              Dev-only checks and asset generators (not required to run the site)
├── docs/               Plans and design notes
└── .gitignore
```

## Running Locally

Open `index.html` in any browser — no server or build step required.

## Development checks

`tools/ux-check.mjs` drives headless Chrome to verify the interaction contract
(card click targets, keyboard access, modal focus containment, page weight, tap
targets). It is dev-only — the site itself still has no build step and no
dependencies. See `tools/README.md`.

## Credits

Background paintings by Fernando Amorsolo y Cueto (1892–1972).

## License

All rights reserved.
