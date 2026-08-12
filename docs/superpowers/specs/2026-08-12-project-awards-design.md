# Project Awards — Design Spec

**Date:** 2026-08-12
**Status:** Approved

## Summary

Add a per-project **Awards** button to project cards that opens the shared modal with a list of awards that project received — same pattern as the existing Overview and Team buttons.

## Data Model

Add an optional `awards` array to project objects in `js/data.js`:

```js
awards: [
  { description: "Muntinlupa Robotics Fair – Champion", year: "December 2025" },
  { description: "11th Philippine Robothon – Overall Champion", year: "February 2026" }
]
```

Each entry has `description` (string) and `year` (string). Projects without awards simply omit the field.

## UI

### Button

In `renderProjectCard()`, add an Awards button to the `links` array when `p.awards` exists and is non-empty:

```js
...(p.awards && p.awards.length ? [{ label: 'Awards', icon: 'fas fa-trophy', action: 'awards' }] : []),
```

Same `data-action="modal"` / `data-tab="awards"` pattern as Overview and Team.

### Modal

Extend `openModal()` in `main.js` to handle `tab === 'awards'`:

- **Title:** `"{Project Title} — Awards"`
- **Image area:** Hidden/empty (awards have no associated image)
- **Body:** Styled list of awards using the existing `.record-item` CSS class (same as the global Honors section):
  ```html
  <div class="record-list">
    <div class="record-item">
      <span class="record-desc">{description}</span>
      <span class="record-year">{year}</span>
    </div>
    ...
  </div>
  ```

## Files Changed

| File | Change |
|------|--------|
| `js/data.js` | Add `awards` arrays to projects that have them |
| `js/main.js` | Add Awards button to `renderProjectCard()` links; extend `openModal()` for the awards tab |

No HTML or CSS changes needed — reuse existing modal infrastructure and `.record-item` styles.

## Backfill

Award data to add based on project descriptions:

- **Project PALAD** — national and international awards (specifics need author input)
- **CENTHRO** — 4th DLSU-D Research Conference Best Paper Presentation (May 2025), national and international awards
- **Focus Buddy** — 9th Philippine Robothon 3rd People's Choice Award (February 2023)

Full award lists to be filled in by the author.
