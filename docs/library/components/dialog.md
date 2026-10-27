# Record dialog

The one shared modal: every project, every leadership record and every honour
that has photographs opens its detail here.

## Where it lives

| Role | File | Anchor |
|---|---|---|
| Markup | `index.html` | `id="dialog"` · `role="dialog"` · `aria-labelledby="dialogTitle"` |
| Markup | `index.html` | `id="dialogClose"` |
| Render | `js/main.js` | `function openRecord(` |
| Render | `js/main.js` | `function closeDialog(` |
| Render | `js/main.js` | `function gallery(` |
| Render | `js/main.js` | `var dialogBody = document.getElementById('dialogBody');` |
| Render | `js/main.js` | `dialogCard.focus();` |
| Styles | `css/styles.css` | `── Dialog` |
| Styles | `css/styles.css` | `.dialog__card` |
| Data | `js/data.js` | `projects[].video` · `projects[].overview.image` · `projects[].team.image` |
| Data | `js/data.js` | `leadership[].images` |
| Data | `js/data.js` | `honors[].images` |
| Test | `tests/page.test.mjs` | `role="dialog"` |

## Structure

The shell ships one empty dialog: `.dialog` (`#dialog[hidden]`) > `.dialog__card`
(`role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialogTitle"`,
`tabindex="-1"`), containing `.dialog__close` (`#dialogClose`), `.dialog__meta`
(`#dialogMeta`), `.dialog__title` (`#dialogTitle`) and `.dialog__body`
(`#dialogBody`). `openRecord(kind, index)` fills title, meta and body, then
unhides the dialog. `closeDialog()` reverses it. The opening buttons carry
`data-kind` and `data-index`; their delegation lives on `#page` (see
[reveals-chrome.md](reveals-chrome.md)).

## Adjust it

| Want to change | Change here | Verify with |
|---|---|---|
| Card width, height or scroll | `.dialog__card` (`width: min(760px, 100%)`, `max-height`, `overflow`) | screenshot at 1280×704 and 390×844; no clipped controls |
| Card radius | `.dialog__card` (`border-radius`, hard-coded — `--panel-radius` does not reach it) | screenshot; `npm test` does not pin this one |
| Video player behaviour | the `.dialog__video` template inside `openRecord` (`controls muted loop playsinline`) | open a project record; controls reachable |
| Gallery grid | `.dialog__gallery` | open an honour with photographs |
| Trap, Escape, overlay close, focus restore | `closeDialog(` and the `keydown` handler | manual Tab / Escape walk; focus returns to the opener |
| Which elements open it | `data-kind` / `data-index` on the control; delegation in `wireDelegation` | click a frame, leader card and honour tile |
| Title and meta line | `dialogTitle.textContent` / `dialogMeta.textContent` in `openRecord` | open one record of each kind |
| Photographs shown | `gallery(` and the record's `images` array | an honour with and without photographs |

## Invariants

- One dialog serves all three record kinds; there is no second modal.
- `role="dialog"`, `aria-modal="true"`, a labelled close button — see the
  accessibility row in `AGENTS.md`'s hard constraints.
- `openRecord` saves `document.activeElement`, focuses the card, locks body
  scroll and stops Lenis; `closeDialog` restores the scroll, the focus and
  Lenis. The card carries `data-lenis-prevent` so its own scroll area keeps
  working while Lenis is stopped.
- Escape, a click on the overlay and the close button all close the dialog.
- Tab is trapped inside the card's focusable elements.
- The video is the only place the films play: muted, looping and inline, with
  native controls, and only while the record is open.

## Traps

- The gallery filters `PlaceHolder.png`, so an awaited photograph shows nothing
  in the dialog while the panel still renders its dashed frame.
- Honours without `images` render a `disabled` tile and never call
  `openRecord`; do not "fix" the disabled state.
- `dialogBody.innerHTML` is replaced on every open; any injected element loses
  listeners, so interaction is delegated to `document` and `.dialog`.
- The ids are looked up once when `js/main.js` loads. Renaming an id in
  `index.html` without renaming the lookup leaves the dialog silently blank.
- The film frame in a project panel is a still, not a player; the player exists
  only here.
