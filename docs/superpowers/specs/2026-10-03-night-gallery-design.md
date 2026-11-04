# Night Gallery — Design Spec

**Date:** 2026-10-03
**Status:** Approved (design); awaiting spec review
**Supersedes:** the current warm-dark document layout of `index.html`

---

## 1. Summary

Rework the portfolio from a vertically-scrolling document into a single horizontal
walk through a dark gallery. Six rooms sit side by side in one strip; Lenis
smooths the journey; each project hangs as a work in its own pool of light, and
each achievement hangs as either a small work or a wall plate.

The museum framing is load-bearing rather than decorative. It decides the palette
(near-black), the absence of picture frames (light is the frame), the terminology
(room titles taken from real gallery floorplans), and the motion (light rises as
you arrive).

## 2. Goals and non-goals

**Goals**

- The site reads as a gallery visit, not as a themed website.
- No new content authoring: every label is derived from fields already in
  `js/data.js`.
- Keep the existing quality bar: modal focus containment, keyboard access, 44×44
  tap targets, video lazy-loading, reduced-motion support.
- Stay a static site with no build step.

**Non-goals**

- Replacing or restyling project photography. The works are the existing images.
- Vertical scrolling as a secondary axis. There is one axis: horizontal.
- A CMS, a backend, or analytics.

## 3. Decision log

Each of these was settled with the owner during brainstorming. They are recorded
because several reverse an earlier assumption.

| Decision | Choice | Note |
|---|---|---|
| What hangs in the frames | The owner's own project media | No stock art, no invented paintings |
| Movement through the building | One continuous walk | Supersedes an earlier "stacked halls" plan |
| Wall treatment | Darkness lit per work | Chosen after six other directions were rejected |
| Lighting behaviour | Lights stay on once seen | Of three models demonstrated interactively |
| Scroll axis | Horizontal only | The defining decision; see §5 |
| Scroll engine | Lenis | See §5 — this replaces an earlier recommendation |
| Room titles | Plain, descriptive, English | Derived from the owner's `category` field |

**Rejected directions**, recorded so they are not re-proposed: burgundy National
Gallery walls, narra-and-brass, white cube, oak-and-linen, cabinet room, stone
alcove, pinned study room. Draft titles also rejected: Greek nomenclature
(Πινακοθήκη etc.), and the curatorial set (The Vestibule, The Permanent
Collection, Provenance).

## 4. The building

Six rooms in one horizontal strip, in walk order:

| # | Room title | Content | Source data |
|---|---|---|---|
| 1 | About | Portrait, bio, contact links | `bio`, `profileImage`, `social` |
| 2 | Works in Robotics | Palad, CENTHRO, Focus Buddy | `projects` where `category === "Robotics"` |
| 3 | Works in Applications | Hivemind, SATLearn, BiyaHey | `projects` where `category === "Applications"` |
| 4 | Leadership | 4 posts | `leadership` |
| 5 | Honours | 13 honours | `honors` |
| — | Contact | Closing and email | `email` |

**Room titles are derived, not authored.** `Works in Robotics` and
`Works in Applications` come from the existing `category` field on each project,
which already splits the six projects 3–3. This means the gallery structure
cannot drift from the data.

A **directory** (room list with counts) is printed at the top of the walk, and the
navigation is built from the same list.

Each room carries an optional one-line note. Room 2's note is drawn from the
owner's own framing ("built to remove a small friction from ordinary use"); the
rest are short and factual.

## 5. Scroll architecture

A single horizontal scroll container. This is the load-bearing technical decision.

```
<div class="hall">                           overflow-x: auto; scroll-snap-type: none
  <div class="strip">                        display: flex
    <section class="room">…</section>
    <article class="work">…</article>        snap target, registered with Snap.addElement
    …
  </div>
</div>
```

**Native CSS `scroll-snap` is set to `none` on purpose.** It cannot coexist with
Lenis: a CSS snap container re-snaps whenever the scroll position is set
programmatically, so it would fight every animation Lenis performs. Snapping is
therefore provided solely by `lenis/snap`, which handles the wheel path, the touch
path, and the arrow-key path uniformly.

**Lenis 1.3.26, vendored** into `js/vendor/` — no CDN, no build step:

| File | Size | Purpose |
|---|---|---|
| `lenis.min.js` | 18.3 KB | Core. Exposes `globalThis.Lenis` as a classic script. |
| `lenis-snap.min.js` | 5.7 KB | Snapping. Exposes `globalThis.Snap`. |
| `lenis.css` | 0.5 KB | Required stylesheet. |

MIT licensed, verified from the published package.

Configuration:

```js
const lenis = new Lenis({
  wrapper: hall,
  content: strip,
  orientation: 'horizontal',
  lerp: 0.1,                 // the smoothness
  autoRaf: true,
  anchors: true,             // required, or in-page links stop working
  prevent: (node) => node.closest('.modal-overlay')
});

const snap = new Snap(lenis, {
  type: 'proximity',         // gentle, not 'mandatory'
  distanceThreshold: '35%',  // relative to viewport
  debounce: 150              // default 500ms is sluggish
});
```

**Verified behaviours** (checked against the shipped 1.3.26 code, not the docs):

- `lenis-snap.min.js` reads `this.lenis.isHorizontal` and switches between
  `scrollLeft` and `scrollTop`, so snapping follows the axis correctly.
- Lenis **disables native CSS `scroll-snap`**. `Snap` in `proximity` mode is the
  mechanism for the "slight snap" requirement.
- `anchors: true` is required; without it Lenis prevents anchor navigation.
- Nested scroll containers need `data-lenis-prevent` or the `prevent` option.
  `allowNestedScroll` is documented as a performance trap and is not used.
- `respectReducedMotion` defaults to `true`: smoothing is disabled, programmatic
  scrolls become instant, and native scrolling and snapping keep working.

**Panel widths** vary by content type so the journey does not become a metronome:
a project work is ~62–80vw, a text plate ~26–34vw, the About room is full-viewport.
Target: the whole walk is roughly 17 screens.

**Touch** uses native swipe — with `syncTouch` left at its default `false`, Lenis
does not take over touch input, so the browser's own inertia applies and the
`prevent` option keeps Lenis out of it entirely. Touch therefore never competes
with the vertical page axis because there is no vertical page axis: the walk is
the only scrolling in the document.

## 6. Visual system

### Palette

Two solid text tiers and an accent. Note that an earlier three-tier ramp with
opacity variants was rejected: it produced six distinct colours and its lowest
tier failed contrast (see below).

| Token | Value | Role |
|---|---|---|
| `--night` | `#0d0c0b` | Page void |
| `--room` | `#131211` | Room wall |
| `--room-warm` | `#171513` | Room wall, upper wash |
| `--text` | `#e8dcc6` | Labels, body, secondary |
| `--text-strong` | `#f6efe0` | Room titles |
| `--text-quiet` | `#8c8375` | Metadata, accession numbers not accented |
| `--accent` | `#c9a45c` | Accession numbers, active room, plate rules |

### Measured contrast

Computed against WCAG 2.1 on the lightest room background (`#171513`), which is
the worst case:

| Pair | Ratio | AA normal | AA large |
|---|---|---|---|
| `--text` on `--room-warm` | **13.43:1** | PASS | PASS |
| `--text-strong` on `--room-warm` | **15.91:1** | PASS | PASS |
| `--accent` on `--room-warm` | **7.76:1** | PASS | PASS |
| `--text-quiet` on `--room-warm` | **4.87:1** | PASS | PASS |

Every text role clears AA for normal text. The rejected `#6d6559` third tier
measured **3.17:1** and would have failed.

### Geometry and treatment

- Border radius: zero.
- Frames: none. A work is a 2px black pad inside a 1px `rgba(255,240,214,.17)`
  hairline, plus a warm ambient glow and a deep cast shadow.
- **Wall nap** — two offset dot grids at 2–3% opacity, pure CSS, no image
  request. Film grain is deliberately not used: on near-black it lifts the blacks
  and reads as dirt.
- Light pools: a radial gradient behind each work, whose opacity and the work's
  own `filter: brightness()` are both driven by a single per-work custom property.

### Typography

| Face | Role |
|---|---|
| Newsreader | Room titles, work titles, body, room notes |
| Courier Prime | Accession numbers, dates, provenance lines, plate metadata |

No new font is needed. The site's existing Google Fonts request covers both.
(A Greek-nomenclature draft would have required EB Garamond for its Greek subset
and was abandoned along with the Greek titles.)

## 7. Lighting

Model: **lights stay on**. Each work carries a light value `w` in `[0,1]`:

- `w → 1` when the work is in view, and it stays at 1 afterwards.
- The work nearest the centre of the viewport is brightest; this is computed from
  scroll position, not from an intersection callback alone.
- `w` drives the pool's opacity, the hairline's alpha, and the work's brightness.

Under `prefers-reduced-motion: reduce`, every work renders at `w = 1` with no
transition, and Lenis's own `respectReducedMotion` removes smoothing.

**Performance constraint.** `w` is written to **leaf elements only**. Writing an
inherited custom property on a large subtree is the documented cause of a
measured 503 ms of `RecalcStyleDuration` per 3 s of scrolling in the owner's
prior project. Where a room-level effect is needed, the property is registered
`@property { inherits: false }` and written to the few elements that read it.

## 8. The dialog ("step closer to the work")

The existing modal becomes a lightbox. It keeps every behaviour the current test
harness asserts:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- focus moved inside on open, `inert` on background siblings, Tab trapped
- Escape closes; focus returns to the element that opened it
- body scroll locked while open (and Lenis stopped, via `prevent`)

Contents: the work at full size, its title, medium, provenance, and the project's
Overview / Team / Awards / Report actions. Photo galleries for news, leadership
and honours keep the existing carousel.

## 9. Accessibility

- All text meets AA; see §6.
- The strip is natively scrollable, so keyboard scrolling, browser find, and
  screen-reader traversal work without custom handling.
- Every work is a real focusable control with an accessible name; the whole work
  is a click target.
- Tap targets are at least 44×44.
- Room navigation is a real list of links/buttons, not pointer-only hotspots.
- An `aria-live` status announces the current room on change.
- Reduced motion is honoured by both Lenis and the lighting.

## 10. Defects to fix in this work

1. **Wrong gallery opens for photo-less honours.** `renderRecordItem` passes the
   *filtered* index into `data-index`, while `openGallery` indexes the
   *unfiltered* `PORTFOLIO.honors`. Selecting a photo-less honour therefore opens
   a different honour's photographs. Masked today because most honours have
   photos. Fix: identify the row explicitly rather than by position.
2. **Empty frames.** `files/BiyaHey.mp4` is the only asset for BiyaHey — there is
   no still image, so Room 3 would show an empty work. Hivemind and SATLearn team
   photos are `files/PlaceHolder.png`. Fix: capture stills from the existing MP4s
   using the decoding path already in `tools/make-images.mjs`.
3. **README is inaccurate after this work.** It currently states the site has no
   dependencies. After vendoring Lenis it has one, and the README must say so.

## 11. Files

| File | Change |
|---|---|
| `index.html` | Rebuilt: hall, strip, six rooms, directory, nav |
| `css/styles.css` | New token layer; rooms, works, plates, pools; modal restyle |
| `js/main.js` | Room renderer, light controller, Lenis + Snap init, defect 10.1 fix |
| `js/data.js` | Room grouping helper; add BiyaHey still; replace placeholders |
| `js/vendor/lenis.min.js` | New (vendored, 18.3 KB) |
| `js/vendor/lenis-snap.min.js` | New (vendored, 5.7 KB) |
| `js/vendor/lenis.css` | New (vendored, 0.5 KB) |
| `tools/ux-check.mjs` | Reworked for the horizontal axis; see §12 |
| `tools/make-images.mjs` | Add still-capture for projects with video and no image |
| `README.md` | Correct the dependency claim and the structure section |

## 12. Verification

`tools/ux-check.mjs` asserts the UX contract over the DevTools Protocol. Its four
viewport passes assume vertical scrolling and must be ported, not weakened.

Retained, adapted to the horizontal axis:

- whole-work click target (thumbnail, title, and card padding all open the work)
- keyboard reachability and accessible naming
- view cue hidden by default, revealed on focus-within
- gallery rows are real `<button>`s, focusable and named
- modal dialog semantics, inert background, Tab containment, Escape, focus return
- no unexpected 4xx/5xx
- no video fetched before a work is on screen
- all tap targets ≥ 44×44 at 390×844

New checks:

- **the walk moves horizontally** — after a scroll gesture the strip's
  `scrollLeft` changes and `scrollTop` stays 0
- **snap lands** — after a wheel gesture the journey settles with a work aligned
  to its snap point, within a small tolerance
- **lights come up** — a work's light value is 0 when off-screen and 1 once seen,
  and never returns to 0
- **every work has content** — no work renders an empty frame, which is the check
  that would have caught the BiyaHey gap

Manual acceptance, because headless Chrome cannot judge it: the feel of the
smooth scroll and snap, and the lighting on a real display.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Lenis + a long strip is a re-measurement, not a port | Use the owner's `trace-scroll.mjs` methodology: count raster tiles per fixed distance, interleave variants, take medians. Do not trust wall-clock CPU or headless fps. |
| A 17-screen horizontal walk is long | Vary panel widths; provide the directory and room navigation so any room is one click away. |
| Horizontal scroll can confuse a first-time visitor | The directory, a visible next-work affordance, and the room name always on screen. |
| Lenis is unmaintained or changes behaviour | It is vendored and version-pinned; the site never resolves it at runtime. |
| `lenis/snap` may re-engage in the moment after a touch gesture ends, nudging the walk | To be confirmed against real behaviour before shipping; if it is distracting, `Snap` is disabled on coarse pointers and touch keeps native free scrolling. |
| Touch snapping may be too passive: with Lenis out of the touch path, `Snap` must pick the gesture up at its end | Verified during implementation; if it does not, `syncTouch: true` is the fallback, accepting its documented iOS caveat. |
| Headless verification of smooth scrolling is unreliable | Assert geometry and state, never frame rate. The owner is the judge of feel. |

## 14. Out of scope

- Re-shooting or restyling photography
- Audio, ambient or otherwise
- Room transitions beyond scroll position
- Any second axis of navigation
