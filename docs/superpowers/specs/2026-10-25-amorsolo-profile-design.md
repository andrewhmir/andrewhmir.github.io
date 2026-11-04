# The Long Field — Amorsolo Profile Design

**Date:** 2026-10-25
**Status:** approved direction (design), implementation pending
**Supersedes:** the horizontal-walk presentation (2026-08 build). The walk's code
stays in place, untouched, until this page is promoted to `index.html`.

## Intent

A personal **profile page**, not a SaaS landing page. It borrows Railway's
sectioning and its painted-background art, not its marketing furniture: no
product-window mockups, no pricing, no testimonial cards, no invented copy.

Success: a visitor sees Andrew's name over an Amorsolo landscape, scrolls a
sequence of full-width painted panels — About, six projects, Leadership,
Honours, Contact — each one a distinct crop of the same two paintings, tied
together by a thin journey line down the left. The content is the existing
portfolio content: films, photographs, labels, awards, links. Nothing is
invented; nothing important is lost.

## Constraints

- **Static.** No build step, no bundler, no runtime dependency. `node` only runs
  dev tools.
- **No third-party fetches at runtime.** Assets are local files. (The old page's
  guard asserted this; the new page must satisfy the same rule.)
- **Content source of truth stays `js/data.js`.** Renderer reads `PORTFOLIO` +
  `Site.*`. No content is copied into HTML.
- **Old page untouched this iteration.** `index.html`, `css/styles.css`,
  `js/main.js` and the walk's tests stay byte-identical; existing `npm test`
  stays green. The new page is `preview.html`.
- **Accessibility.** Text over art must clear WCAG AA for its size; the modal
  keeps a focus trap, `aria-modal`, Escape and restore-focus; `prefers-reduced-
  motion` disables reveals and smooth scrolling.
- **Art is the two saved Amorsolo paintings.** No new artwork is authored.
  Credit stays in the footer: "Paintings by Fernando Amorsolo y Cueto (1892–1972)."
- **Fonts are the two vendored families** — Newsreader (display), Courier Prime
  (mono labels). Body copy uses the system sans stack; no new font download this
  iteration.

## Page anatomy (in order)

1. **Masthead** — sticky, transparent over the hero; name left, links
   (About · Work · Honours · Contact) right, Resume ↗ as the one bordered action.
   A 1px scroll-progress hairline at its base.
2. **Hero** — full-bleed painted panel: `Planting Rice`, bright and unscrimmed
   except a bottom gradient. Name in large Newsreader, title line in Courier
   Prime gold, one sentence of bio, two actions (See the work →, Resume ↗).
   Scroll cue at the bottom edge.
3. **About** (`#about`) — copy left (bio paragraphs, social row), framed
   `profile.jpg` portrait right; `painting.jpg` behind, content-side scrim.
4. **Projects** (`#work`, six stops `#palad` …) — one painted panel per project,
   alternating content side. Each panel: eyebrow (`Robotics · 2025—2026`), serif
   `h2` title, tagline, summary paragraph, awards line, `Open the record →`.
   Media side: one large framed overview photograph, with the film poster and
   team photograph as two smaller frames beneath it — the old "three frames"
   identity, laid flat. Every frame opens the record dialog.
5. **Leadership** (`#leadership`) — four records as two-column cards: thumbnail,
   description, years; opens the dialog gallery.
6. **Honours** (`#honours`) — the five standalone honours (project awards are
   excluded by the existing `Site.honoursTiles` partition) as a year-led list
   in two columns; photograph-carrying entries open the dialog.
7. **Contact** (`#contact`) — large serif line, email, GitHub, LinkedIn, Resume;
   painting background, scrimmed bottom.
8. **Footer** — name, copyright, painting credit.
9. **Journey rail** — fixed left gutter (≥1024px): a hairline with one stop per
   section; the active stop is gold and labelled; clicking scrolls.

## Art system

Two paintings, one panorama each, panned across the page by section:

| Section | Painting | `background-position` |
|---|---|---|
| Hero | `painting-hero.jpg` | 50% 58% |
| About | `painting.jpg` | 48% 52% |
| PALAD | `painting-hero.jpg` | 18% 56% |
| Hivemind | `painting.jpg` | 78% 44% |
| C.E.N.T.H.R.O. | `painting-hero.jpg` | 76% 50% |
| Focus Buddy | `painting.jpg` | 22% 66% |
| SATLearn | `painting-hero.jpg` | 44% 22% |
| BiyaHey! | `painting.jpg` | 56% 50% |
| Leadership | `painting-hero.jpg` | 8% 44% |
| Honours | `painting.jpg` | 88% 36% |
| Contact | `painting-hero.jpg` | 50% 88% |

Implementation: each panel carries `--art` (image URL) and `--art-pos`; a
`::before` layer paints the image `cover` at that position, and a `::after`
layer paints the scrim. The scrim is direction-aware:

- content **left**: `linear-gradient(90deg, night .97 → .90 30% → .55 58% → .12 82% → 0)`
- content **right**: the same, mirrored
- hero/contact (centred copy): vertical `linear-gradient(180deg, night .30, night .20 40%, night .78 78%, night .94)`
- every panel also gets a 40–60px top and bottom vignette so panels stack cleanly.

The art stays **daylight-bright** on the side away from the copy. No global
darkening, no duotone. The proof of legibility is the measured contrast behind
the copy blocks, checked in the browser pass.

## Visual language

- **Radius:** 16px panels, 10px frames, 8px buttons. (The old design's
  `border-radius: 0` constraint dies with the walk; this is a deliberate change
  recorded here so the old tests' radius assertions are retired, not broken.)
- **Palette:** unchanged, already measured — `--night #080c0e`, `--text
  #ece2cf`, `--text-strong #f9f4e8`, `--text-quiet #9a9384`, `--accent #d4b06a`,
  borders `rgba(236,226,207,.14)`.
- **Type:** Newsreader 300/400 for display and section headings; system sans
  16–17px/1.65 for body; Courier Prime 11–12px uppercase tracking `.14em` for
  eyebrows, meta, awards and the rail labels.
- **Container:** `min(1440px, 100vw)`, 16px side gutter; 12-column grid, 32px
  gutters. Copy occupies columns 1–5 (or 8–12 mirrored); media 7–12.
- **Spacing:** section padding `clamp(48px, 7vw, 104px)`; panels separated by a
  16px page gutter on all sides.
- **Motion:** 12–16px fade-up reveals, 600ms, once per section; rail dot
  transitions; nothing else. Reduced motion → none.

## Interactions

- **Record dialog** — one shared modal. For a project: title, meta, overview
  copy, team caption, awards, links, and a keyboard-navigable photo gallery of
  its frames. For leadership/honours: description, year, gallery of available
  photographs. Escape/overlay/close all dismiss; focus is trapped and restored.
- **Rail** — IntersectionObserver on each stop sets the active dot and label;
  click scrolls with the masthead offset respected.
- **Reveals** — IntersectionObserver, `once`, skipped under reduced motion.
- **Masthead** — transparent at top, gains blur + border after the hero.
- **No Lenis, no scroll snap, no horizontal scrolling.** Native vertical scroll.

## Responsive

- ≥1024px: 12-column panels, rail visible, alternating sides.
- 640–1023px: stacked copy-then-media inside each panel; rail hidden; panels
  keep their painted art with a vertical scrim.
- <640px: single column, hero name at `clamp(38px, 11vw, 56px)`, media frames
  full width, masthead links collapse to About/Work/Contact.

## Polish pass (2026-10-25)

Delivered after the rough review, with the direction confirmed:

- **The rail now has a left-edge shade** (`.rail-shade`, a fixed 108px gradient)
  because the rail lost contrast whenever a bright crop sat on a panel's left
  side. Each stop also carries a label chip that appears on hover and stays
  visible on the active stop, so "where you are" is never guesswork.
- **Contact copy sits on a soft dark card** (`.stop--contact .stop-in::before`,
  blurred, painted in the panel's negative layer) instead of a radial scrim:
  the rough radial left a visible box edge and still measured 2.1:1. Measured
  after the fix: 12.4:1 for body text.
- **Contrast measured, not eyeballed.** A masked full-page capture (copy text
  hidden) sampled behind every copy column: hero 4.17 (large text only — the
  hero's only small text is the gold title, which carries a text shadow),
  section panels 8.3–9.8, contact 12.4. Measurement script:
  `.tmp-diag/contrast-shot.mjs` plus the sampling pass in the session transcript.
- **The film frame is honest:** the play badge opens the record, which now
  embeds a real muted `<video>` player for that project.
- Reveals (fade-up once per section), frame hover zoom, masthead blur on stick,
  and a 1px scroll-progress hairline were added; reduced motion disables all of
  it.

Known content gaps (not layout): six photographs referenced by the data are not
in `files/` — Personnel's Week (×2), Commencement (×2), Work Immersion, and the
2023 National Youth Congress. They render the dashed awaited frame or fall back
to `PlaceHolder.png`.

## Promotion

Promoted on 2026-10-26: `preview.html` → `index.html`, `css/profile.css` →
`css/styles.css`, `js/profile.js` → `js/main.js`, and the preview copies deleted.
The walk's presentation, DOM suites and shell-check are retired; `npm test` now
runs `tests/page.test.mjs` plus the five inherited data suites. Serve with
`node tools/serve.mjs 3333`, then `http://127.0.0.1:3333/`.


## Out of scope for this iteration

Promoting `preview.html` to `index.html`; deleting the walk's CSS/JS/tests;
updating AGENTS.md/README; adding Inter or any new font; autoplaying films in
project panels; a mobile menu panel; day/night switch; parallax.

## Later iterations (expected)

1. Promote to `index.html`; retire the walk's code, tools, tests and docs.
2. Replace poster stills with muted inline film in the project media stack.
3. Optional: vendor Inter for body copy, if the system stack reads weak.
4. Mobile masthead menu; touch targets pass.
