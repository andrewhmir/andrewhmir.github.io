# Data contract

`PORTFOLIO` in `js/data.js` is the single source of truth for every record the page renders; the same file publishes the `Site` gallery helpers. This page is the contract an edit must keep: the keys, their live or dormant status, the record shapes, the placeholder rules and the helper inventory.

## Top-level keys

Thirteen keys. **Live** means `js/main.js` reads it; **dormant** means nothing on this page reads it — inherited from the retired horizontal build.

| Key | Status | Read by |
|---|---|---|
| `name` | live | the hero `h1` |
| `title` | live | the hero `.hero-title` |
| `bio` | live | the About paragraphs (`P.bio.map`); entry 4 (`bio[3]`, falling back to `bio[2]`) is the hero sentence |
| `email` | live | the Contact mailto link and its text |
| `social` | live | About buttons, Contact links, the hero resume (`social[0].url`) and the masthead resume (`social[0]`, the entry labelled `Resume`) |
| `projects` | live | the three Work panels (nine records), the rail labels, the project view and its dialog |
| `leadership` | live | the Leadership cards and their dialog |
| `honors` | live | the Honours tiles and their dialog |
| `profileImage` | dormant | ignored — the About portrait is hard-coded as `files/profile.jpg` in `js/main.js` |
| `favicon` | dormant | no reader |
| `scrollerIcon` | dormant | no reader |
| `nav` | dormant | the shell's menu is hand-written in `index.html` |
| `news` | live | the News stop rows (`P.news.map`); four entries with `date`, `text` and `images` — `images` is still unread because no news photograph is on disk |

## Path grammar

Every `Data` row in a component page and every path on this page uses one of five shapes. Each is resolved against a `vm`-loaded `PORTFOLIO` (or `Site`):

- a top-level field: `email`
- a collection field present on at least one record: `honors[].from`
- a collection field present on every record, marked with a trailing `!`: `honors[].year!`
- a nested object path: `projects[].overview.image`
- a helper on `Site`: `Site.posterFor`

The grammar supports one collection segment per path. An array of objects nested inside a record — `projects[].awards`, `projects[].links` — is therefore documented at the array path plus its entry field names.

## Record fields

Presence is the union across the shipped records. The marker is `required` (every record has it and the page reads it), `optional` (present on some records) or `dormant` (present but read by nothing on this page).

### `projects` — 16-key union

| Path | Marker | Notes |
|---|---|---|
| `projects[].id` | required | the record's key (`project1`–`project6`, `plugin1`–`plugin3`) and the view-crop lookup; authored, not derived |
| `projects[].title` | required | the card title, the project view `h2`, the dialog title |
| `projects[].tagline` | required | the card tag and the project view `.lede` |
| `projects[].category` | required | the Work panel a record groups into, and the `.eyebrow` and dialog meta line |
| `projects[].venue` | required | the `.eyebrow` and the dialog meta line; also the card meta when the record has no awards |
| `projects[].summary` | required | the project view `.body` and the dialog's opening paragraph |
| `projects[].video` | optional | the film still via `Site.posterFor` and the dialog player (6 of 9 records; a plugin record ships no film) |
| `projects[].overview` | required | nested `image` (the card still and lead frame) and `text` (the dialog body) |
| `projects[].team` | optional | nested `image` (the team frame) and `text` (the dialog's "The team"); 6 of 9 records |
| `projects[].shots` | optional | the three frames the project view hangs for a record with no film or team photograph (3 of 9 records, all DSH plugins); the dialog gallery uses the same three |
| `projects[].links` | required | the dialog's Links list; entries carry `label`, `url` and a dormant `icon` |
| `projects[].awards` | optional | the panel Awards and the dialog's Awards list; entries carry `description` and `year` (4 of 9 records) |
| `projects[].pieces` | dormant | retired walk vocabulary; no reader |
| `projects[].authors` | dormant | no reader |
| `projects[].source` | dormant | no reader |
| `projects[].report` | dormant | retired; no reader |

Nested object paths, also validated: `projects[].overview.image` · `projects[].overview.text` · `projects[].team.image` · `projects[].team.text`.

### `leadership` — 5-key union

| Path | Marker | Notes |
|---|---|---|
| `leadership[].description` | required | the card text, the thumb alt and the dialog title |
| `leadership[].year` | required | `.leader__year` and the dialog meta line |
| `leadership[].images` | required | the first image is the card thumb; the full array is the dialog gallery |
| `leadership[].summary` | required | the dialog body |
| `leadership[].pieces` | dormant | retired; no reader |

### `honors` — 6-key union

| Path | Marker | Notes |
|---|---|---|
| `honors[].description` | required | the tile text and the dialog title |
| `honors[].year` | required | `.honour-row__year` and the dialog meta line |
| `honors[].summary` | required | the dialog body |
| `honors[].pieces` | dormant | retired; no reader |
| `honors[].images` | optional | the dialog gallery and the enabled tile. Seven records have images, but three of those carry `from` and are project awards, so only four of the five tiles have one; images alone do not make a tile |
| `honors[].from` | optional | `'projectN'` marks a project award, excluded from the tiles (8 of 13 records) |

### `social` — 3 entries

| Path | Marker | Notes |
|---|---|---|
| `social[].label` | required | button and link text; `Resume` is matched by label for the masthead |
| `social[].url` | required | the href wherever `social` is rendered |
| `social[].icon` | dormant | an icon name; no reader |

## Path rules and placeholders

- Image paths are written relative to `index.html` (`files/...`), never absolute; they resolve against the page, not the stylesheet.
- `files/PlaceHolder.png`, and an empty or missing `src`, is **awaited**: `isAwaited` renders the dashed `.frame--awaited` with "Awaiting photograph", not a button, and the dialog gallery filters the placeholder out. `Site.PLACEHOLDER` holds the same path.
- A path that names a file which is not on disk is **not** awaited: the renderer emits a real `<img>` whose inline `onerror` swaps in `files/PlaceHolder.png`. Several shipped image references are in this state — see the missing-photograph gotcha in `AGENTS.md`.
- Film posters are `files/posters/<stem>.jpg`, derived by `Site.posterFor` from a `files/*.mp4` path: directories are stripped and `.mp4` becomes `.jpg`. Any other input (no video, a non-`.mp4`, a path outside `files/`) yields an empty string, so no request is made.
- `files/posters/` and `files/og-card.jpg` are generated by `tools/make-images.mjs`; never hand-edit them. Photo paths are imported by `tools/import-photos.mjs` from its mapping.
- The dialog gallery filters `PlaceHolder.png` and empty entries, so a record with only a placeholder opens a dialog with no gallery — that is not the same state as an awaited frame.

## `Site` helpers

Twenty names. The page calls three of them — `Site.posterFor`, `Site.honoursTiles` and `Site.deriveRooms`; the other seventeen are inherited from the retired horizontal build. Thirteen of the seventeen are referenced by a data suite; `Site.ROOM_ORDER`, `Site.visibleWork`, `Site.progressFraction` and `Site.roomAtOffset` are referenced by none. **Used by page** is `yes` only for the three `js/main.js` calls.

| Helper | Used by page | Notes |
|---|---|---|
| `Site.posterFor` | yes | a `files/*.mp4` path to `files/posters/<stem>.jpg`; also the dialog video poster |
| `Site.honoursTiles` | yes | splits `honors` into `tiles` and `projectAwards` on `from` |
| `Site.PLACEHOLDER` | no | the `files/PlaceHolder.png` constant |
| `Site.deriveRooms` | yes | groups projects by `category` into the three Work panels; carries each room's `lede` |
| `Site.ROOM_TITLES` | no | retired room titles; data-suite only |
| `Site.ROOM_ORDER` | no | retired room order; referenced by no test or page |
| `Site.groupPieces` | no | retired three-frame grouping; data-suite only |
| `Site.MIN_PIECES` | no | retired hang constant |
| `Site.MAX_PIECES` | no | retired hang constant |
| `Site.HANG_LAYOUTS` | no | retired hang arrangements |
| `Site.hangLayout` | no | retired hang selection |
| `Site.honoursSplit` | no | arithmetic honours split; data-suite only |
| `Site.HONOURS_ROOMS` | no | retired room count |
| `Site.evenChunks` | no | even chunking used by `honoursSplit` |
| `Site.visibleWork` | no | nearest work centre to the viewport centre |
| `Site.progressFraction` | no | horizontal-walk progress, 0–1 |
| `Site.roomAtOffset` | no | the box under the viewport centre |
| `Site.bandFor` | no | hang band arithmetic |
| `Site.galleryFor` | no | total record lookup for the old gallery |
| `Site.awardPhotos` | no | one award's photographs; not surfaced on this page |
