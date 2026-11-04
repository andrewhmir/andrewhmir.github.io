# Media stack

The three-frame stack inside a project panel: overview, generated film still and
team photograph, plus a dashed, non-clickable variant when a photograph is
awaited.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Render | `js/main.js` | `function frame(` · `function isAwaited(` |
| Render | `js/main.js` | `function projectMedia(` · `S.posterFor(p.video)` |
| Render | `js/main.js` | `'<div class="stack">'` · `'<button class="frame'` |
| Render | `js/main.js` | `'<div class="frame frame--awaited">'` · `Awaiting photograph` |
| Styles | `css/styles.css` | `── Frames and the media stack` |
| Styles | `css/styles.css` | `.stack {` · `.frame {` · `.frame img {` |
| Styles | `css/styles.css` | `.frame--lead {` · `.frame__label {` · `.frame__play {` |
| Styles | `css/styles.css` | `.frame--awaited {` · `.frame__inner` · `--frame-radius:` |
| Data | `js/data.js` | `projects[].video` · `projects[].overview.image` · `projects[].team.image` |
| Data | `js/data.js` | `Site.posterFor` |
| Test | `tests/hang.test.mjs` | `posterFor` · `every shipped project` |

## Structure

`.stack` is a two-column grid. `projectMedia(` builds the frames in fixed order:
the overview (`frame--lead`, `16/9`, spans both columns), then the film still
(`S.posterFor(p.video)`), then the team photograph — the last two are `4/3`. A
live frame is a button carrying `data-kind="project"` and `data-index`, an
`<img loading="lazy">` with the `onerror` fallback, a `.frame__label`, and
`.frame__play` on the film still. An awaited frame is a
`div.frame.frame--awaited` > `.frame__inner` "Awaiting photograph" +
`.frame__label`; it is not a button.

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| An overview or team photograph | the record's `overview.image` / `team.image` in `js/data.js` | screenshot; a missing file swaps to `PlaceHolder.png` |
| Make a frame awaited | point the field at `files/PlaceHolder.png` (or leave it empty) so `isAwaited(` matches | dashed frame, not a button |
| A film still / poster | regenerate with `tools/make-images.mjs`; never hand-edit `files/posters/` | `npm test` — `hang` asserts every poster is on disk |
| Frame labels | the literals in `projectMedia(` ("Overview", "Film", "Team") | screenshot |
| Frame radius | `--frame-radius:` | `npm test` — the token is pinned |
| Media stack gap | the `.stack` gap (`12px`) | screenshot; the gap is not asserted |
| The three-frame order | `function projectMedia(` — overview, poster, team | screenshot each project |
| The lead frame aspect | `.frame--lead` and `.frame img` | screenshot 1440×900 |

## Invariants

- Exactly three frames per project, in this order: overview, film still, team. The live source is `projectMedia(`; no committed test renders it.
- Only the overview is the lead: `.frame--lead` spans both columns and is 16/9; the other two are 4/3.
- A live frame is a button with `data-kind="project"` and `data-index`; clicking opens the one record dialog. Awaited frames are divs and open nothing.
- Awaited means the data says `files/PlaceHolder.png` or has no `src`; a path to a missing file is not awaited — the `<img>` keeps its place and `onerror` swaps in the placeholder. See the missing-photograph gotcha in `AGENTS.md`.
- The film still is generated from the video: `Site.posterFor(` maps `files/<stem>.mp4` to `files/posters/<stem>.jpg`, flat on the basename. Regenerate, never hand-edit.
- Films play only in the dialog; the panel's film frame is a still — see "Deliberately absent" in `AGENTS.md`.

## Traps

- Every shipped image path resolves to a file: a record with no photograph carries no `images` field at all, and a record whose photograph is still missing points at `files/PlaceHolder.png` and renders awaited (see the missing-photograph gotcha in `AGENTS.md`).
- Two team images are explicit `PlaceHolder.png` values, so those team frames are awaited by design; they are a content gap, not a layout bug.
- A video added without running `tools/make-images.mjs` hangs a poster path that 404s; `hang.test.mjs` fails on a missing poster, so the suite catches it before a black frame ships.
- `isAwaited(` matches only an empty `src` or the exact placeholder path; a differently-cased or differently-prefixed path is a live `<img>`.
- `.frame__play` is emitted only when the label is exactly "Film"; renaming that literal in `projectMedia(` silently drops the play badge.
- Awaited frames must not become buttons: the dashed frame has no dialog contract and delegation ignores it.
