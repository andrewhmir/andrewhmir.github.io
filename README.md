# Andrew Alangcao

**Data Engineer · Computational Cognition Researcher**

> **Editing this repo?** Read [`AGENTS.md`](AGENTS.md) first — it routes an
> intent (change the hero, a scrim, an award) to the file and the anchor, and
> lists the vocabulary and the constraints. This README is the design's
> reasoning: read it when you want to know *why*.

A static personal portfolio: one vertical profile page, painted with two
Amorsolo landscapes, rendered from `js/data.js` by `js/main.js`. Vanilla HTML,
CSS and JavaScript — no build step, no bundler, and nothing fetched from a
third-party host: Lenis, the one vendored library, is served from `js/vendor/`.

## The page this replaces

The previous site was a horizontal gallery: one strip of exhibits, each a stack
of framed photographs with a label beside it, navigated by a scroll-position bar
and a smooth-scroll engine. It was a deliberate exhibition, and it made the
visitor walk sideways to read a person.

This page is a profile. The subject comes first, then the work, then the
record of what the work won, then the way to make contact. Every project is a
**stop** in a downward sequence rather than an exhibit in a strip. Vertical
scroll, no snap, no hidden content off the right edge. The paintings survive
from the old build because they were the best thing in it; the navigation model
does not. Lenis came back too, but only as the wheel and anchor glide on top of
ordinary scrolling — not as the walk engine.

Still static. The page is `index.html`, the generated font stylesheet, one
hand-written stylesheet, two hand-written scripts and the vendored Lenis pair:
the portfolio records and personal copy live in `js/data.js`, while section headings, labels and button
text are literals in `js/main.js`. Node is only for tests and dev tools.

## Two paintings, eleven crops

Two saved paintings carry the whole page:

| Name in code | File | What it is |
|---|---|---|
| `rice` | `files/painting-hero.jpg` | Fernando Amorsolo's *Planting Rice* (1949): the hero, three project stops, Leadership and Contact. Also the source of the Open Graph share card. |
| `harvest` | `files/painting.jpg` | A 1934 harvest scene: About, three project stops and Honours. |

The footer credits both: **Paintings by Fernando Amorsolo y Cueto (1892–1972).**

### Why two, and why crops

One painting repeated eleven times reads as wallpaper, however it is cropped.
Two paintings alternate: a bright field and a darker harvest, two different
horizons and palettes, and the page gets a rhythm without inventing a third
asset. The alternation is in the `PAN` table in `js/main.js`, in page order:

| Stop | Id | Painting | `background-position` |
|---|---|---|---|
| Hero | `top` | `rice` | `50% 58%` |
| About | `about` | `harvest` | `48% 52%` |
| PALAD | `project1` | `rice` | `18% 56%` |
| Hivemind | `project2` | `harvest` | `78% 44%` |
| C.E.N.T.H.R.O. | `project3` | `rice` | `76% 50%` |
| Focus Buddy | `project4` | `harvest` | `22% 66%` |
| SATLearn | `project5` | `rice` | `44% 22%` |
| BiyaHey! | `project6` | `harvest` | `56% 50%` |
| Leadership | `leadership` | `rice` | `8% 44%` |
| Honours | `honours` | `harvest` | `88% 36%` |
| Contact | `contact` | `rice` | `50% 88%` |

Eleven stops, two files, no per-stop downloads. A panel paints the whole image
`cover` at the stop's `background-position`; the browser does the crop. The pan
is therefore a pair of percentages, not an image edit and not a camera move.
Percentage positions survive every viewport: there is no second art direction
for mobile, and no asset that has to be re-cut when a panel's aspect ratio
changes. The crop is the design; the image is one of two.

The art sits on `.stop::before` at `z-index: -2`, with `background-color:
#1a1d18` behind it so a slow image does not flash white. `.stop` sets
`isolation: isolate`, which is what lets the two negative layers stay inside
the panel rather than sliding under the page.

### Why panels rather than one background

A single fixed painting behind the whole document would be one continuous
surface, and every section would have to fight it for contrast. A panel is a
rounded plate with its own crop, its own scrim and a 16px gutter around it. The
section boundary is visible, the art changes with the story, and the scrim can
be tuned per side instead of globally. The painting is the ground of each
section, not wallpaper behind the site.

## Sectioning: each project is a stop

The page order is fixed and semantic:

| Stop | Id | Holds | Minimum height |
|---|---|---|---|
| Hero | `top` | Name, title line, one bio sentence, two actions | `calc(100vh - 16px)` |
| About | `about` | All bio paragraphs, social row, a 4:5 framed portrait | `calc(100vh - 16px)` |
| Work | `work` | Six project stops, each with copy + three media frames | `calc(100vh - 16px)` each |
| Leadership | `leadership` | Four cards: year, description, thumbnail | `calc(100vh - 16px)` |
| Honours | `honours` | Five standalone honours, newest first | `calc(100vh - 16px)` |
| Contact | `contact` | Closing line, email, social links, on a dark card | `calc(100vh - 16px)` |
| Footer | — | Name, Amorsolo credit, copyright | auto |

Those are **minimum** heights. A stop grows if its copy or media needs more;
the page never clips a record to preserve a rhythm.

Every stop is one screen tall: the panel plus its 16px gutter make exactly one
viewport, so the sections share a size and the next panel's edge arrives on the
beat as you scroll. The hero already worked that way; Contact used to run
shorter and now matches the rest. Below 1024px the minimum is dropped and each
panel grows with its content, so a phone is not forced through ten blank screens.

### The 12-column panel

`.stop-in` is `repeat(12, 1fr)`, capped at 1440px, with `clamp(48px, 6.5vw,
100px)` padding and a `clamp(20px, 2.6vw, 40px)` gap. Copy takes columns 1–5,
media 7–12; the empty sixth column is the seam between them. Mirrored stops put
copy in 8–12 and media in 1–6. The media side is larger because three frames
need the width; the copy is held to 44ch so the line length stays readable.

The hero's copy takes 1–8 and is bottom-aligned: the name sits low over the
painting rather than floating in the middle. About is copy-left/media-right.
Leadership and Honours are copy-left with cards/list on the right. Contact is
centred across 2–10, capped at 880px.

### The six project stops

The project order is the order in `PORTFOLIO.projects`:

1. **Project PALAD** — contactless palm biometrics.
2. **Hivemind** — AI-native organizational memory.
3. **C.E.N.T.H.R.O.** — fingerprint transit and healthcare records.
4. **Focus Buddy** — a desktop robot study companion.
5. **SATLearn** — SAT practice with analytics.
6. **BiyaHey!** — a community commute map.

Each stop carries an eyebrow (`category · venue`), an `h2` title, the tagline,
the summary, the project's awards and an **Open the record →** button. The media
side is one overview frame at 16:9 spanning two columns, with the film still and
the team photograph as 4:3 supports beneath it. That is the old build's
three-frame identity, laid flat: overview leads, film and team support. The film
frame is a **generated still with a play badge**, not a playing video — the
player lives in the dialog. Six simultaneous videos would cost page weight and
compete with the painting; one player on demand does not.

Sides alternate by index, not by category: PALAD copy-left, Hivemind copy-right,
C.E.N.T.H.R.O. copy-left, and so on. The alternation keeps consecutive stops
from reading as a list and lets the scrim mirror each time, so the bright side
of the art is always the side away from the copy. Category is still legible in
the eyebrow; it does not need to drive the layout.

### Honours, and where an award lives

`PORTFOLIO.honors` holds thirteen records. Five stand alone; eight are a
project's award. The distinguishing field is authored, `from: 'projectN'`, not a
text match against the project's own award copy — one win is worded differently
on the project panel and in the honours array, and no predicate over those
strings can be trusted to leave a record on exactly one side.

`Site.honoursTiles(PORTFOLIO.honors)` partitions the array. The page renders
only `.tiles`, which is the five that stand alone; the eight `projectAwards`
live as the project's own **Awards** list. There is no second copy of a project
award on the Honours panel, and no second visual language for it. The Honours
panel's copy says exactly that.

The five tiles are a year-led list, not cards: an honour is a register entry,
and a row scans faster than a card. A tile with declared photographs is a
button that opens the shared dialog; a tile with none is disabled rather than a
focusable control that opens nothing.

## The scrim, and the measured contrast

The paintings are daylight-bright. The text is warm off-white. A flat dark
overlay would either kill the art or fail the text, so the scrim is a gradient
whose dark end follows the copy side. On a left-copy stop:

```
linear-gradient(90deg,
  rgba(8,12,14,.97)  0%,
  rgba(8,12,14,.92) 26%,
  rgba(8,12,14,.62) 52%,
  rgba(8,12,14,.20) 78%,
  rgba(8,12,14,.06) 100%)
```

A right-copy stop uses the same stops at `270deg`; the copy side is always the
near-opaque end. The far edge is only 6% night, so the painting is essentially
untouched there. The gradient does not desaturate, duotone or blur the art.

Centred stops use a vertical gradient because there is no far side:

- **Contact:** `.5` top, `.34` at 40%, `.5` at 70%, `.92` bottom.
- **Hero:** `.62` top, `.26` at 28%, `.58` at 52%, `.9` at 74%, `.98` bottom.

Each panel also carries inset top and bottom vignettes — `60px 70px -55px`
shadows at `.95` — so two bright crops meeting across the 16px gutter do not
draw a light seam. The rounded panel edge and the vignette do the separation;
there is no border between sections.

The contact copy sits on a separate soft card inside the panel: a blur-backed
`rgba(8,12,14,.72)` surface, 20px blur, 26px radius, sized `min(72%, 780px)` by
62% and centred. The earlier radial scrim measured **2.1:1** behind the closing
copy and left a visible box edge; the card measures **12.4:1** and reads as a
deliberate surface. On narrow screens the card takes the panel's width.

### Measured, not eyeballed

A masked full-page capture hid the copy text, and the pixels behind every copy
column were sampled; the figure is the worst ground against the text tier. The
shipped numbers:

| Area | Contrast | Reading |
|---|---|---|
| Hero | **4.17:1** | Clears AA for large text only. The hero is built from display type, a shadowed gold title line and buttons on their own translucent ground; it is not a place for a normal-size paragraph. |
| Section copy columns | **8.3–9.8:1** | AA for normal text, with margin. |
| Contact | **12.4:1** | AA for normal text, on the blurred card. |

The probe was a scratch script under `.tmp-diag/` (gitignored), recorded in the
design note rather than committed. The numbers are the authority, not token
arithmetic: the same `--text` can pass on one crop and fail on another, which is
why a crop or a scrim change needs re-measurement rather than a colour swap.

## The journey rail and the left shade

The masthead has four links, but the page has ten named stops (About, the six
projects, Leadership, Honours, Contact). The rail is the full index: a fixed
5px progress bar at the left edge, a short rule per stop — the awards list's em
dash, reused as a station tick — and a label chip on hover and on the active
stop. Each rule starts on the rail's line, its left end tucked beneath the gold
so the bar and its ticks read as one mark, and the chip sits above both. A
stop's hit row is 77×34px — much larger than the 1–3px rule it shows — so the
rail is easy to click, and the chip itself is clickable while it is showing.
The hero is not a rail stop — it is the arrival, and the brand in the masthead
already returns to it.

The active stop is the panel covering the viewport's middle: as the boundary
between two panels crosses the centre, the next tick takes over (a middle that
falls in a gutter keeps the section just passed). Clicking a stop travels to
the section through Lenis when it is active; `scroll-margin-top:
calc(var(--masthead-h) + 12px)` keeps the panel's top clear of the fixed
masthead, and Lenis's `scrollTo` reads that same value off the target; the
handler only supplies it as an offset for targets that have no margin of their
own (`#work`, `#page`). Native hash travel and `html { scroll-behavior: smooth }`
are the fallback. Under reduced motion Lenis is never constructed and the CSS
smooth behaviour is turned off.

The shade is the rail's legibility layer: a fixed 108px gradient from
`rgba(8,12,14,.82)` at the edge through `.58` at 34%, `.2` at 70%, transparent at
100%, with `pointer-events: none`. It exists because the rail is fixed over
whatever crop happens to be at the left edge; on a bright rice field the ticks
and labels disappeared. The shade is not a page overlay — it is bounded to the
rail's gutter, below the masthead (`z-index: 29`) and below the rail itself
(`30`), and it is hidden with the rail below 1024px.

The rail is a navigation, not a scrollbar, but it now carries section progress as
well. The 5px line is the track: faint from the first tick's centre to the last,
with a gold gradient bar — amber into bright gold — that reaches a stop's tick as
that panel's top reaches the top of the viewport, and runs between two ticks while
the page crosses from one panel to the next. When the viewport is split between
two panels the head sits midway between their ticks. A short ease trails the
scroll, so it glides rather than jumps; `prefers-reduced-motion` drops the ease
and the head snaps. The masthead hairline remains only below 1024px, where the
rail is hidden and the hairline reports the same progress as a fraction of the
ten stops.

## Palette, type and radii

The palette did not change with the page. It had already been measured for the
old build, and the text tiers are still the right warm values against a dark
ground:

| Token | Value | Role |
|---|---|---|
| `--night` | `#080c0e` | Page ground; also the scrim's dark end |
| `--text` | `#ece2cf` | Body and lede text |
| `--text-strong` | `#f9f4e8` | Display headings, names, active labels |
| `--text-quiet` | `#9a9384` | Supporting copy, years, captions |
| `--accent` | `#d4b06a` | Gold meta, rules, the active rail tick, links |
| `--border` | `rgba(236,226,207,.14)` | Hairlines, buttons, frame borders |

The art supplies the colour. Keeping the text palette stable means a crop can be
retuned without re-deciding the type colours, and the measured contrast table
above remains the reference.

### Type

| Face | Role | Notes |
|---|---|---|
| **Newsreader** | Display: `h1`, `h2`, hero line, lede, brand, contact email | Serif, weight 300 requested; the vendored family declares 400/500/600, so the browser serves its closest face (400). A true 300 needs a new vendored face. |
| **Courier Prime** | Meta: eyebrows, hero title, buttons, awards, rail chips, masthead nav, footer credit | 10–11.5px, uppercase with wide tracking where it labels; it is the page's instrument voice. |
| **System sans** | Body copy and interface text | 16px / 1.65; no third webfont is shipped. |

`h1` is `clamp(42px, 6.4vw, 94px)` at `.96` line-height; `h2` is
`clamp(30px, 3.4vw, 52px)`; the hero line and lede are
`clamp(18px, 1.7vw, 24px)`. The body column is capped at 44ch; the lede at 32ch.
The hero title is 12–14px Courier Prime in gold, with a text shadow — the one
small free-text line in the hero.

The two webfonts are vendored in `files/fonts/`, with their OFL licences, and
declared by the generated `css/fonts.css`. Nothing is fetched from a font CDN at
runtime. The body deliberately uses the system sans stack rather than a third
family: the display and mono faces carry the identity, and the reading face
should be the one the operating system already renders well.

### Radii

| Surface | Radius |
|---|---|
| Painted panel | 16px (`--panel-radius`; 12px below 640) |
| Media frame | 10px (`--frame-radius`) |
| Button / resume / dialog close | 8px |
| Dialog card | 14px |
| Contact card | 26px |

The old build was `border-radius: 0` because it was a gallery wall. This page is
a stack of painted plates and framed prints; the radii separate the two: a panel
is a surface, a frame is an object sitting on it. The nested values (16 panel,
10 frame, 8 control) keep the corners concentric rather than arbitrary. The
contact card is softer than the panel because it is a light-catching surface,
not a frame.

## Interactions

### One dialog

Every record that opens uses the same dialog. For a project it holds the title
and meta, a real `<video controls muted loop playsinline
preload="metadata">` with the generated poster, the summary, the overview
paragraphs (split on blank lines), the team caption, the awards list, the links,
and a gallery of the project's frames. For a leadership record or an honour it
holds the description, the year, the summary and the record's photographs.

One dialog means one focus trap, one escape path and one body layout. The
project/leadership/honour difference is in the data, not in three modal
implementations.

The accessibility contract is explicit:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialogTitle"`, and a
  44px close button with an accessible name.
- Opening saves `document.activeElement`, focuses the dialog card, and locks
  body scroll.
- Tab and Shift-Tab wrap between the first and last focusable elements.
- Escape, the close button and a click on the overlay all close it; closing
  restores focus to the control that opened it.

The video is a player, not decoration: it is muted and looping by default, has
controls, and does not autoplay. The rest of the page's motion is the reveal,
the frame hover and the masthead/rail transitions.

### Frames

A frame with a real image is a `<button>`; an awaited frame is a `<div>` with a
dashed border and the words **Awaiting photograph**, because a control that
opens nothing is worse than an honest reserved place. The film frame carries a
decorative play badge; the whole frame is the button, and the dialog supplies the
player.

### Honours and empty records

A standalone honour with photographs is a button; one without is a disabled row.
Leadership cards always open; a record with no photographs still has its summary
to show. A photograph path that is missing falls back to `PlaceHolder.png`
through `onerror`; it is not the same as the explicit awaited state, which the
data declares with `PlaceHolder.png` itself.

### Reveals and chrome

Copy and media blocks fade up 16px over 650ms when they first cross the
viewport; the observer unobserves each block, so scrolling back does not replay
the entrance. `prefers-reduced-motion: reduce` makes every reveal visible
immediately, collapses the transitions to effectively zero and turns smooth
scrolling off — the CSS ease and the Lenis layer both.

The masthead starts transparent over the hero and gains a blur and a hairline
once the hero is behind it. Below 1024px its foot carries the page's scroll
progress; from 1024px up that progress is drawn down the journey rail's line
instead, so the rail is both navigation and page meter (see above). There is no
scroll snap: the page uses the browser's own scrolling. Lenis 1.3.26, vendored
in `js/vendor/`, adds the wheel glide and smooth hash-anchor travel, and nothing
else — touch and the keyboard stay native, the record dialog stops it and its
card opts out of the capture (`data-lenis-prevent`) so a long record still
scrolls, and a reduced-motion visitor never gets the library constructed at all.

## Missing photographs

Six rendered references point at files that are not in `files/`:

- Personnel's Week — two photographs;
- Annual Commencement — two;
- Best in Work Immersion — one;
- 2023 National Youth Congress — one.

They are a content gap, not a layout bug. The affected leadership thumbnail shows
the `PlaceHolder.png` fallback; the honours rows that declare those images still
open a gallery whose broken images fall back to the same placeholder. The import
tool's `MAPPING` has no entries for them, so the fix is to add the mappings,
import the sources, and keep the existing data paths.

HiveMind and SATLearn are a different case: their `team.image` is explicitly
`PlaceHolder.png`, so they render awaited frames. `tools/make-images.mjs` can
derive team stills from the project films (the `STILLS` table), but the outputs
are not in `files/` and the data is not wired to them. That is a content decision,
not something the renderer should guess.

## Responsive behaviour

The page has two breakpoints: 1024px and 639px.

| Range | Layout | Rail / menu | Scrim |
|---|---|---|---|
| ≥1024px | 12 columns; copy 5, media 6; sides alternate | Rail and left shade visible; masthead menu visible | Side-aware |
| 640–1023px | One column; copy then media; panels lose the full-viewport minimum | Rail, shade and menu hidden | Vertical `.93` → `.8` at 55% → `.52` |
| <640px | One column; 10px gutter; 12px panel radius; `h1` 38–56px; leadership one column; honours year column 74px; dialog gallery one column | Hidden | Vertical |

The 1024px breakpoint is where a 5+6 split stops being readable: below it the
two columns cramp, so the panel becomes one column and the art scrim rotates to
vertical because the copy now spans the width and there is no far side to keep
bright. The art crop itself does not change; percentage positions and `cover`
already survive the narrower panel, so there is no second set of images.

The hero keeps its full-height composition and gains 118px of top padding to
clear the masthead. Contact's dark card becomes full width. On a phone the
masthead keeps the brand and the Resume link, but there is no menu drawer: the
page is one scroll, and the rail is removed rather than shrunk into something
that would sit over the copy.

## Verification

```powershell
npm test
node tools/serve.mjs 3333
```

`npm test` runs the static guard first, then the five surviving data suites and
the component-library checker:

- `tests/page.test.mjs` — shell order, palette, both paintings, art layers,
  dialog markup, no third-party resource loads, the vendored Lenis wiring and
  reduced-motion opt-out, section ids, the 6/4/5 content counts, and the
  guard's place in the npm script.
- `tests/derive-rooms.test.mjs`, `hang.test.mjs`, `band.test.mjs`,
  `gallery-index.test.mjs`, `award-photos.test.mjs` — inherited pure helpers and
  data shapes. `hang` also checks that every shipped film has a poster still on
  disk.
- `tests/library.test.mjs` — the `docs/library` validator: page shape, anchors,
  class/id coverage and cross-links.

The guard is static and the data suites are pure. **No committed test renders
the page or models CSS.** The browser probe that was the old walk's geometry
authority is retired with the walk and slated for the cleanup commit; this page
has no equivalent. A green `npm test` is the floor, not a layout verification.

Layout was verified by headless Chrome screenshots at 1440×900, the spec's
1280×704 floor and 390×844. Chrome needs a non-confined shell on this machine
(Mojo named pipes), and the `.tmp-diag/` scratch directory is gitignored. If you
re-measure contrast, hide the copy text, sample behind each copy column and
compare against the text tier; do not compute a ratio from the token values
alone.

`tools/shot-url.mjs` captures a viewport at any URL. For scrolled or full-page
captures use Chrome DevTools or a scratch CDP script under `.tmp-diag/`.
`tools/README.md` indexes what survives and what is retired.

## Design record

- [The Long Field — Amorsolo profile design](docs/superpowers/specs/2026-10-25-amorsolo-profile-design.md)
- [The Long Field — implementation plan](docs/superpowers/plans/2026-10-25-amorsolo-profile.md)

The spec and plan are the record of the direction and the polish pass. They are
not a line-by-line description of the shipped CSS: the scrim stops, the honours
side and some responsive details were tuned during implementation. Where they
differ, `css/styles.css` and the measurements above are current.

Everything earlier under `docs/superpowers/` is historical — some of it
describes the horizontal build, some the vertical document before that. It is
never hand-edited.

## Running locally

Open `index.html` directly, or serve the folder when checking video, fonts or
screenshots:

```powershell
node tools/serve.mjs 3333
# http://127.0.0.1:3333/
```

No install and no build; the optional static server is only for checking video,
fonts or screenshots. A change to a CSS or JS file needs a page refresh; there is
no live reload.

## Credits

Paintings by Fernando Amorsolo y Cueto (1892–1972): *Planting Rice* (1949) and
the 1934 harvest scene.

Newsreader and Courier Prime are vendored under the SIL Open Font License 1.1;
the licence texts are in `files/fonts/`. Lenis 1.3.26 is vendored under the MIT
licence in `js/vendor/`. The site fetches nothing from a third-party host at
runtime.

## License

All rights reserved.
