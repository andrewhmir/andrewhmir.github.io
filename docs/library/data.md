# Data contract

`PORTFOLIO` in `js/data.js` is the single source of truth for every record the page renders; the same file publishes the three `Site` helpers the page calls. This page is the contract an edit must keep: the keys, the record shapes, the placeholder rules, the image formats and the helper inventory.

## Top-level keys

Ten keys, all live. A field that nothing reads is not kept: the retired walk's `profileImage`, `favicon`, `scrollerIcon` and `nav` were deleted, and the About portrait is hard-coded in the renderer instead.

| Key | Read by |
|---|---|
| `name` | the hero `h1` |
| `title` | the hero `.hero-title` |
| `bio` | the About paragraphs (`P.bio.map`); the hero line is deliberately not one of them |
| `heroLine` | the hero `.hero-line` (`P.heroLine`); kept out of `bio` so the same sentence cannot print in About |
| `email` | the Contact copy value; `emailText()` derives the printed, obfuscated label from it |
| `social` | About buttons, Contact links, the hero resume (`social[0].url`) and the masthead resume (the entry labelled `Resume`); the two section rows skip `Resume` |
| `news` | the News stop rows (`P.news.map`) |
| `projects` | the three Work panels (nine records), the rail labels, the project view and its dialog |
| `leadership` | the Leadership cards and their dialog |
| `honors` | the Honours tiles and their dialog |

## Path grammar

Every `Data` row in a component page and every path on this page uses one of five shapes. Each is resolved against a `vm`-loaded `PORTFOLIO` (or `Site`):

- a top-level field: `email`
- a collection field present on at least one record: `honors[].from`
- a collection field present on every record, marked with a trailing `!`: `honors[].year!`
- a nested object path: `projects[].overview.image`
- a helper on `Site`: `Site.posterFor`

The grammar supports one collection segment per path. An array of objects nested inside a record — `projects[].awards`, `projects[].links` — is therefore documented at the array path plus its entry field names.

## Record fields

Presence is the union across the shipped records. The marker is `required` (every record has it and the page reads it), `optional` (present on some records) or `dormant` (present but read by nothing — none ship today).

### `projects` — 13-key union

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
| `projects[].links` | required | the dialog's Links list; entries carry `label` and `url` |
| `projects[].awards` | optional | the panel Awards and the dialog's Awards list; entries carry `description` and `year` (4 of 9 records) |
| `projects[].pieces` | optional | per-frame labels for a plugin record's three screenshots; the frame falls back to "Screenshot N" when absent |

Nested object paths, also validated: `projects[].overview.image` · `projects[].overview.text` · `projects[].team.image` · `projects[].team.text`.

### `leadership` — 4-key union

| Path | Marker | Notes |
|---|---|---|
| `leadership[].description` | required | the card text, the thumb alt and the dialog title |
| `leadership[].year` | required | `.leader__year` and the dialog meta line |
| `leadership[].summary` | required | the dialog body |
| `leadership[].images` | optional | the first image is the card thumb; the full array is the dialog gallery. Every shipped record has photographs; a record with none renders the no-photo thumb |

### `honors` — 5-key union

| Path | Marker | Notes |
|---|---|---|
| `honors[].description` | required | the tile text and the dialog title |
| `honors[].year` | required | `.honour-row__year` and the dialog meta line |
| `honors[].summary` | required | the dialog body |
| `honors[].images` | optional | the dialog gallery and the enabled tile. A tile with no images is disabled |
| `honors[].from` | optional | `'projectN'` marks a project award, excluded from the tiles (8 of 13 records) |

### `social` — 3 entries

| Path | Marker | Notes |
|---|---|---|
| `social[].label` | required | button and link text; `Resume` is matched by label for the masthead |
| `social[].url` | required | the href wherever `social` is rendered |

### `news` — 2-key union

| Path | Marker | Notes |
|---|---|---|
| `news[].date` | required | the `.news-row__date` |
| `news[].text` | required | the `.news-row__text`; rows are inert, there is no news dialog |

## Path rules and placeholders

- Image paths are written relative to `index.html` (`files/...`), never absolute; they resolve against the page, not the stylesheet.
- Photographs are WebP (`files/<name>.webp`), generated from the JPEG sources by `tools/optimize-images.py`. Both files stay on disk; only the WebP is requested.
- The two paintings keep a three-format chain in `css/styles.css`: `.art--rice` and `.art--harvest` use `image-set()` with AVIF, then WebP, then the JPEG. The JPEG is the fallback for a browser without `image-set()`.
- `files/PlaceHolder.png`, and an empty or missing `src`, is **awaited**: `isAwaited` renders the dashed `.frame--awaited` with "Awaiting photograph", not a button, and the dialog gallery filters the placeholder out.
- Every shipped image path resolves to a file. A record with no photograph at all carries no `images` field rather than a path that 404s: the leadership card renders its no-photo thumb and the honour row is disabled.
- Film posters are `files/posters/<stem>.jpg`, derived by `Site.posterFor` from a `files/*.mp4` path: directories are stripped and `.mp4` becomes `.jpg`. Any other input (no video, a non-`.mp4`, a path outside `files/`) yields an empty string, so no request is made. Posters stay JPEG, and `files/og-card.jpg` stays JPEG because not every social crawler accepts WebP.

## `Site` helpers

Five names. The page calls three — `Site.deriveRooms`, `Site.posterFor` and `Site.honoursTiles`; `Site.ROOM_TITLES` and `Site.ROOM_ORDER` are the tables `deriveRooms` reads. **Used by page** is `yes` only for the three `js/main.js` calls.

| Helper | Used by page | Notes |
|---|---|---|
| `Site.deriveRooms` | yes | groups projects by `category` into the three Work panels; carries each room's `lede` |
| `Site.posterFor` | yes | a `files/*.mp4` path to `files/posters/<stem>.jpg`; also the dialog video poster |
| `Site.honoursTiles` | yes | splits `honors` into `tiles` and `projectAwards` on `from` |
| `Site.ROOM_TITLES` | no | the panel heading per category; read by `deriveRooms` |
| `Site.ROOM_ORDER` | no | the order the known categories are listed in; read by `deriveRooms` |
