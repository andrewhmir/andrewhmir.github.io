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
| `.progress` | [masthead.md](components/masthead.md) | the small-screen scroll-progress hairline |
| `.rail` | [rail.md](components/rail.md) | the fixed journey nav and page-progress fill, rendered by JS |
| `.rail-shade` | [rail.md](components/rail.md) | the fixed left gradient behind the rail |
| `.rail__stop` | [rail.md](components/rail.md) | one rail entry; carries `data-stop` |
| `.stop` | [panel.md](components/panel.md) | one painted panel, the unit of page order |
| `.stop-in` | [panel.md](components/panel.md) | the 12-column grid inside a panel |
| `.art--rice` | [panel.md](components/panel.md) | painting 1 art layer (`painting-hero`; AVIF/WebP/JPEG `image-set`) |
| `.art--harvest` | [panel.md](components/panel.md) | painting 2 art layer (`painting`; AVIF/WebP/JPEG `image-set`) |
| `.work` | [project.md](components/project.md) | the Work wrapper holding the two category panels |
| `.awards` | [project.md](components/project.md) | a project's award list, present only when `awards` is non-empty |
| `.category-cards` | [project.md](components/project.md) | the three project cards inside a category panel |
| `.project-card` | [project.md](components/project.md) | one project card button; opens that project's view |
| `.project-card__art` | [project.md](components/project.md) | the card's overview still |
| `.project-card__body` | [project.md](components/project.md) | the card's text column |
| `.project-card__title` | [project.md](components/project.md) | the record title |
| `.project-card__tag` | [project.md](components/project.md) | the record tagline |
| `.project-card__meta` | [project.md](components/project.md) | award count, or the venue when there are none |
| `.category-count` | [project.md](components/project.md) | the project/award count under the room lede |
| `.project-view` | [project.md](components/project.md) | the fixed full-screen project panel |
| `.project-view__back` | [project.md](components/project.md) | the view's back button; carries `data-close-view` |
| `.portrait` | [about.md](components/about.md) | the framed About portrait |
| `.stack` | [frames.md](components/frames.md) | the three-frame media column |
| `.frame` | [frames.md](components/frames.md) | one media frame: lead, film still, team or awaited |
| `.leaders` | [leadership.md](components/leadership.md) | the Leadership card grid |
| `.leader` | [leadership.md](components/leadership.md) | one Leadership card button |
| `.honours` | [honours.md](components/honours.md) | the Honours list |
| `.honour-row` | [honours.md](components/honours.md) | one honour tile |
| `.news` | [news.md](components/news.md) | the News stop's dated list |
| `.news-row` | [news.md](components/news.md) | one dated update row |
| `.contact-mail` | [contact.md](components/contact.md) | the contact email copy button; prints the obfuscated address |
| `.contact-mail__note` | [contact.md](components/contact.md) | the copy confirmation line under the email |
| `.foot` | [footer.md](components/footer.md) | the page footer |
| `.dialog` | [dialog.md](components/dialog.md) | the one shared record modal |
| `.btn` | [primitives/controls.md](primitives/controls.md) | the button/link primitive every action uses |

## State and modifier classes

| Selector | Page | What it is |
|---|---|---|
| `.is-stuck` | [masthead.md](components/masthead.md) | `wireChrome` sets it on `.masthead` once past the hero threshold |
| `.is-active` | [rail.md](components/rail.md) | the rail entry whose section crosses the viewport middle |
| `.is-in` | [reveals-chrome.md](components/reveals-chrome.md) | a `[data-reveal]` node after it intersects (or immediately under reduced motion) |
| `html.lenis` | [reveals-chrome.md](components/reveals-chrome.md) | the `.lenis` class Lenis puts on `<html>` for the lifetime of the instance, including while stopped |
| `.btn--solid` | [primitives/controls.md](primitives/controls.md) | the gold solid button variant; hero "See the work" |
| `.is-copied` | [contact.md](components/contact.md) | `wireEmailCopy` puts it on `.contact-mail__note` while the copied confirmation shows |
| `.copy--center` | [panel.md](components/panel.md) | the centred copy column; Contact only — the hero keeps `.stop--hero .copy` on the left |
| `.stop--hero` | [hero.md](components/hero.md) | the hero panel modifier |
| `.stop--project` | [project.md](components/project.md) | the project-panel modifier; the category panels and the project view both carry it |
| `.stop--category` | [project.md](components/project.md) | the category-panel modifier on the two Work panels |
| `.stop--contact` | [contact.md](components/contact.md) | the contact panel modifier |
| `.stop--news` | [news.md](components/news.md) | the News panel modifier; widens the copy column |
| `.stop--list` | [honours.md](components/honours.md), [news.md](components/news.md) | emitted on the Honours and News panels; no CSS rule |
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
| `#progress` | [masthead.md](components/masthead.md) | the small-screen progress hairline |
| `#dialog` | [dialog.md](components/dialog.md) | the modal root, `[hidden]` until a record opens |
| `#dialogClose` | [dialog.md](components/dialog.md) | the labelled close button |
| `#dialogMeta` | [dialog.md](components/dialog.md) | the record's meta line |
| `#dialogTitle` | [dialog.md](components/dialog.md) | the record title |
| `#dialogBody` | [dialog.md](components/dialog.md) | the record body, replaced on every open |
| `#top` | [hero.md](components/hero.md) | the hero stop anchor |
| `#about` | [about.md](components/about.md) | the About stop anchor |
| `#news` | [news.md](components/news.md) | the News stop anchor |
| `#work` | [project.md](components/project.md) | the Work wrapper id; the masthead menu's Work landing, not a rail stop |
| `#projectView` | [project.md](components/project.md) | the fixed project view layer, `[hidden]` until a card opens it |
| `#leadership` | [leadership.md](components/leadership.md) | the Leadership stop anchor |
| `#honours` | [honours.md](components/honours.md) | the Honours stop anchor |
| `#contact` | [contact.md](components/contact.md) | the Contact stop anchor |

## Data attributes

| Selector | Page | What it is |
|---|---|---|
| `data-side` | [panel.md](components/panel.md) | `left` / `right` / `center`; drives the scrim direction and the copy column |
| `data-lenis-prevent` | [dialog.md](components/dialog.md) | opts the dialog card out of Lenis's wheel/touch capture so its own scroll area works while Lenis is stopped |
| `data-reveal` | [reveals-chrome.md](components/reveals-chrome.md) | marks a node for reveal-on-scroll |
| `data-kind` | [dialog.md](components/dialog.md) | record kind for the delegated opener: `panel`, `project`, `leadership` or `honors` |
| `data-index` | [dialog.md](components/dialog.md) | the record's index into that kind's array |
| `data-stop` | [rail.md](components/rail.md) | the section id on a `.rail__stop` |
| `data-close-view` | [project.md](components/project.md) | marks the project view's back button; the delegated click closes the view |
| `data-copy` | [contact.md](components/contact.md) | the real email address the `.contact-mail` button writes to the clipboard |
