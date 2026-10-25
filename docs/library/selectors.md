# Selector index

A flat lookup from a selector, shell id or `data-*` attribute to the page that owns it. Component pages own their own trees and states; this index is the entry point for an element seen in the inspector.

## Component roots

| Selector | Page | What it is |
|---|---|---|
| `.page` | [page-shell.md](components/page-shell.md) | the `#page` class; the empty host the renderer fills |
| `.skip` | [page-shell.md](components/page-shell.md) | the skip-to-content link |
| `.sr-only` | [page-shell.md](components/page-shell.md) | the visually-hidden utility class |
| `.masthead` | [masthead.md](components/masthead.md) | the fixed header |
| `.brand` | [masthead.md](components/masthead.md) | the masthead name link |
| `.menu` | [masthead.md](components/masthead.md) | the masthead section nav |
| `.resume` | [masthead.md](components/masthead.md) | the masthead resume chip |
| `.progress` | [masthead.md](components/masthead.md) | the scroll-progress hairline |
| `.rail` | [rail.md](components/rail.md) | the fixed journey nav, rendered by JS |
| `.rail-shade` | [rail.md](components/rail.md) | the fixed left gradient behind the rail |
| `.rail__stop` | [rail.md](components/rail.md) | one rail entry; carries `data-stop` |
| `.stop` | [panel.md](components/panel.md) | one painted panel, the unit of page order |
| `.stop-in` | [panel.md](components/panel.md) | the 12-column grid inside a panel |
| `.art--rice` | [panel.md](components/panel.md) | painting 1 art layer (`painting-hero.jpg`) |
| `.art--harvest` | [panel.md](components/panel.md) | painting 2 art layer (`painting.jpg`) |
| `.work` | [project.md](components/project.md) | the Work wrapper holding the six project stops |
| `.awards` | [project.md](components/project.md) | a project's award list, present only when `awards` is non-empty |
| `.portrait` | [about.md](components/about.md) | the framed About portrait |
| `.stack` | [frames.md](components/frames.md) | the three-frame media column |
| `.frame` | [frames.md](components/frames.md) | one media frame: lead, film still, team or awaited |
| `.leaders` | [leadership.md](components/leadership.md) | the Leadership card grid |
| `.leader` | [leadership.md](components/leadership.md) | one Leadership card button |
| `.honours` | [honours.md](components/honours.md) | the Honours list |
| `.honour-row` | [honours.md](components/honours.md) | one honour tile |
| `.foot` | [footer.md](components/footer.md) | the page footer |
| `.dialog` | [dialog.md](components/dialog.md) | the one shared record modal |
| `.btn` | [primitives/controls.md](primitives/controls.md) | the button/link primitive every action uses |

## State and modifier classes

| Selector | Page | What it is |
|---|---|---|
| `.is-stuck` | [masthead.md](components/masthead.md) | `wireChrome` sets it on `.masthead` once past the hero threshold |
| `.is-active` | [rail.md](components/rail.md) | the rail entry whose section crosses the viewport middle |
| `.is-in` | [reveals-chrome.md](components/reveals-chrome.md) | a `[data-reveal]` node after it intersects (or immediately under reduced motion) |
| `.btn--solid` | [primitives/controls.md](primitives/controls.md) | the gold solid button variant; hero "See the work" |
| `.copy--center` | [panel.md](components/panel.md) | the centred copy column; Contact only — the hero keeps `.stop--hero .copy` on the left |
| `.stop--hero` | [hero.md](components/hero.md) | the hero panel modifier |
| `.stop--project` | [project.md](components/project.md) | one project panel; emitted once per project record |
| `.stop--contact` | [contact.md](components/contact.md) | the contact panel modifier |
| `.stop--list` | [honours.md](components/honours.md) | emitted on the Honours panel; no CSS rule |
| `.frame--lead` | [frames.md](components/frames.md) | the 16/9 lead frame that spans the stack |
| `.frame--awaited` | [frames.md](components/frames.md) | the dashed non-button frame for `PlaceHolder.png` |
| `.leader__thumb--empty` | [leadership.md](components/leadership.md) | the "no photo" span replacing a missing leader thumb |

## Shell ids

| Selector | Page | What it is |
|---|---|---|
| `#page` | [page-shell.md](components/page-shell.md) | the main content host; empty in the shell |
| `#masthead` | [masthead.md](components/masthead.md) | the fixed header |
| `#rail` | [rail.md](components/rail.md) | the empty journey nav the renderer fills |
| `#resumeLink` | [masthead.md](components/masthead.md) | the resume chip; its `href` is filled from the Resume social entry |
| `#progress` | [masthead.md](components/masthead.md) | the progress hairline |
| `#dialog` | [dialog.md](components/dialog.md) | the modal root, `[hidden]` until a record opens |
| `#dialogClose` | [dialog.md](components/dialog.md) | the labelled close button |
| `#dialogMeta` | [dialog.md](components/dialog.md) | the record's meta line |
| `#dialogTitle` | [dialog.md](components/dialog.md) | the record title |
| `#dialogBody` | [dialog.md](components/dialog.md) | the record body, replaced on every open |
| `#top` | [hero.md](components/hero.md) | the hero stop anchor |
| `#about` | [about.md](components/about.md) | the About stop anchor |
| `#work` | [project.md](components/project.md) | the Work wrapper id; the masthead menu's Work landing, not a rail stop |
| `#leadership` | [leadership.md](components/leadership.md) | the Leadership stop anchor |
| `#honours` | [honours.md](components/honours.md) | the Honours stop anchor |
| `#contact` | [contact.md](components/contact.md) | the Contact stop anchor |

## Data attributes

| Selector | Page | What it is |
|---|---|---|
| `data-side` | [panel.md](components/panel.md) | `left` / `right` / `center`; drives the scrim direction and the copy column |
| `data-reveal` | [reveals-chrome.md](components/reveals-chrome.md) | marks a node for reveal-on-scroll |
| `data-kind` | [dialog.md](components/dialog.md) | record kind for the delegated opener: `project`, `leadership` or `honors` |
| `data-index` | [dialog.md](components/dialog.md) | the record's index into that kind's array |
| `data-stop` | [rail.md](components/rail.md) | the section id on a `.rail__stop` |
