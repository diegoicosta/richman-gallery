# Richman Gallery — Features

This document describes the **observable behavior** of the library — what a page shows and does — feature by feature, from the most basic usage up. It is deliberately **not** a technical/API reference: implementation details (how state is stored, internal helpers, DOM strategies) are intentionally out of scope because they may change.

Each feature below is written the way a user or a test would experience it. Together they form the contract that tests assert against.

---

## Basic usage

A gallery is a container holding a masonry grid of images. Given this markup:

```html
<div class="rmg-gallery" data-columns="4">
  <div class="rmg-grid">
    <img src="photo1.jpg" data-id="p1">
    <img src="photo2.jpg" data-id="p2">
    <img src="photo3.jpg" data-id="p3">
  </div>
</div>
```

the images are laid out in a masonry grid (CSS columns).

### Columns — you declare the starting count

The gallery states its **starting column count** with `data-columns`, a value from 1 to 6. The library owns everything after that:

- `data-columns` is the number of columns on a wide screen.
- The library steps the count down at its own fixed breakpoints as the viewport narrows, always down to 1 column on the smallest screens.

For example `data-columns="4"` renders 4 columns on wide screens, then steps down automatically as the window shrinks (3, then 2, then 1). A gallery with `data-columns="2"` starts at 2 and steps down to 1 on small screens. Two galleries on one page can declare different starting points and each responds to the viewport independently.

There is no hidden default: a gallery **without** `data-columns` has no column count applied, so its images flow in a single column. If you want columns, say how many.

The same value can be supplied at initialization as a `columns` option (equivalent to writing `data-columns`).

Each image must carry a unique `data-id`; it is the image's identity for every feature below (selection, likes, comments, tags). Images without `data-id` can still be displayed but are not interactive.

The page can hold any number of galleries; each one is independent.

---

## Lightbox (fullscreen view)

Clicking an image opens it fullscreen, centered over a dimmed backdrop.

The viewer shows:

- the image, scaled to fit the screen
- the image's `title` attribute, displayed under the image when present
- a link to the image's `linkTo` attribute (opens in a new tab), labelled per the rules below
- a close button (top-right)
- prev/next buttons (bottom-right) **only when the gallery has more than one image**

### The photo link

If an image has a `linkTo` attribute, the viewer renders a link to that URL. Its label is decided in this order:

1. `linkText`, when given — the title (if any) is shown next to it as plain text.
2. Otherwise the `title` — the title itself becomes the link.
3. Otherwise `(open)` — used only when there is neither `linkText` nor `title`.

An image without `linkTo` never renders a link, even if `linkText` is present.

Navigation:

- click prev/next buttons, or press the arrow keys, to move between images
- press `Escape` (or click the backdrop / close button) to exit the viewer and return to the page
- the prev button is hidden on the first image; the next button is hidden on the last image

Clicking an image while multi-select mode is **off** always opens the lightbox.

---

## Multi-select

A gallery can be put in multi-select mode, which lets the user pick a subset of images. When multi-select is on, each image gets a **circular marker** in its top-left corner.

### Selecting

- Clicking an image's circle marker selects it; clicking the marker again deselects it.
- A selected image is visually dimmed and its marker fills with a checkmark.
- The image body itself (not the marker) still opens the lightbox.

### Selection counter bar

A bar appears at the bottom of the screen while at least one image is selected. It shows:

- the running count, e.g. `3 images selected`
- a **Clear** button that deselects everything and hides the bar

### Maximum selectable

A gallery may define a cap on how many images can be selected. When the cap is reached:

- further selection attempts are blocked with a message
- the counter shows the cap, e.g. `3/10 images selected`, and a note that reads `Maximum 10 images allowed`

### Order numbers

A gallery may ask for order numbers instead of a plain checkmark: the marker of the 1st selected image shows `1`, the 2nd shows `2`, and so on. Deselecting an image renumbers the remaining selection (no gaps).

### Reading the selection

The selection is exposed so the page can act on it (for example, submitting the chosen ids with a form). The selected ids are returned in selection order.

### Bulk actions

The page can also select everything, unselect everything, or turn multi-select mode on and off.

### Toggling mode

Multi-select can be turned on and off from the page. Turning it off clears the current selection.

---

## Likes

A gallery can show a **heart marker** on each image (top-left corner by default). The heart is visual state plus a callback — the library tracks the liked state in the page (so it can be rolled back), but it does not persist it; the page decides what "like" means and saves it.

- A not-liked image shows an outlined heart; clicking it marks the image as liked and turns the heart solid.
- Clicking again unlikes it.
- Images the server already knows are liked are rendered pre-liked (`data-liked`), so the heart is solid from the start.

When a like changes, the page is notified with the image id and the new state (liked / not liked). The library applies the change optimistically (the heart updates immediately); the page may later **roll back** that change if persistence failed, and the marker returns to its previous state. In other words, a like is **stateful** — it always has a previous state that can be restored.

---

## Comments

A gallery can show a **comment bubble marker** on each image. It is stateless: the library does not hold or manage comments, and clicking the bubble changes nothing in the viewer. Clicking it only notifies the page with the image id; the page owns whatever happens next (opening a comment panel, a modal, etc.).

Because a comment has no state, there is no previous state and nothing to roll back — unlike a like.

When both like and comment markers are enabled, the bubble sits beside the heart. The marker positions adapt to the configured corner (e.g. top-left by default, or bottom-right), and the bubble yields to the heart's slot when likes are disabled.

---

## Tags

An image may carry small labels via its `tags` attribute — one or more tags separated by `;` — shown overlaid on the bottom of the image, for example the camera, lens, or subject. Tags are decorative and not interactive.

Each tag is rendered as its own element, so a user can style them individually (see the technical manual). Tags are added automatically for any image that declares them, including images inserted into the gallery after the page has already loaded.

---

## Multiple galleries on one page

Any number of galleries may exist on the same page. Each is fully independent:

- its own images, selection, liked state, and markers
- its own lightbox instance (only one lightbox is ever open at a time, but it always shows the gallery that was clicked)
- toggling multi-select, clearing the selection, selecting all, or reading the selected ids act per gallery

---

## Galleries added or changed after load

Galleries and images may appear or change after the initial page load (AJAX, user interaction). The library handles this in two ways:

1. **Dynamically inserted galleries** — a `.rmg-gallery` added to the page after load is initialized automatically, just as if it had been there from the start.
2. **Reinitialization** — when the images *inside* an existing gallery are replaced (removed and re-added, or the whole grid swapped out), the page asks the gallery to reinitialize. The gallery picks up the new images and restores everything on them: click-to-open, tags, liked state, and markers.

A common pattern is: swap the grid's images via AJAX, then reinitialize so the new content is fully interactive.

---

## Configuration at a glance

The following are the user-facing switches referenced by the features above. They are provided either as markup attributes on the container, as initialization options, or both.

| Switch | Effect | Markup attribute |
| --- | --- | --- |
| columns | starting column count (1–6), stepped down responsively | `data-columns` |
| multi-select | enables circle markers + selection bar | `data-multiselect-enabled` |
| max selectable | caps how many images can be selected | `data-max-selectable` |
| order numbers | markers show 1, 2, 3… instead of a checkmark | `data-show-order-numbers` |
| likes | shows the heart marker per image | `data-like-enabled` |
| comments | shows the comment bubble per image | `data-comments-enabled` |
| marker corner | positions like/comment markers (e.g. bottom-right) | `data-like-position` |
| pre-liked | marks an image as already liked | `data-liked` (on the image) |
| tags | adds tags to an image | `tags` (on the image) |
| title / link | shown in the lightbox | `title`, `linkTo`, `linkText` (on the image) |
| gap | space between images | — (CSS variable `--gap-length`) |

---

## Scope notes

The following are **explicitly out of scope** for the library — they are the page's responsibility, not the gallery's:

- **Persistence** of likes or comments (the page receives callbacks and does the saving)
- **Authentication / permissions** (e.g. whether a visitor may like)
- **The content of the images themselves**
- Any server-side behavior
