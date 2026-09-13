# Richman Gallery — Technical manual

The implementation details a page integrates with: the classes and attributes you write, the elements the library generates, and the JavaScript API and callbacks.

## The classes you write in the page

```html
<div class="rmg-gallery">
  <div class="rmg-grid">
    <img src="photo1.jpg" data-id="p1" title="Sunset">
  </div>
</div>
```

### `.rmg-gallery`

The gallery itself. Two things it does that you can adjust:

- It defines the gallery's look through CSS variables (`--gap-length` and the color tokens). Override them on your own `.rmg-gallery` rule to restyle the whole gallery.
- It holds the per-gallery configuration (`data-multiselect-enabled`, `data-like-enabled`, `data-like-position`, …). It is also where the fullscreen viewer gets attached when you click a photo.

### Gap between images — `--gap-length`

The spacing between grid images is the CSS variable **`--gap-length`** (default `2px`), used for both the column gap and each image's bottom margin. Set it either from CSS or, per gallery, with the `gaplength` init option (a number of pixels):

```html
<div class="rmg-gallery" data-columns="4" style="--gap-length: 10px">
```

```js
window.RichmanGallery.create(container, { gaplength: 10 });
```

### `.rmg-grid`

The grid that lays the photos out. Images go directly inside it. Each `<img>` may carry attributes the library reads: `data-id` (identity), `title`, `linkTo` and `linkText` (shown in the viewer), `tags` (labels on the image).

### Columns — `data-columns` on `.rmg-gallery`

The grid has **no** column count of its own. The wide-screen count is declared on the gallery via `data-columns` (1–6), and the library's CSS steps it down responsively:

```html
<div class="rmg-gallery" data-columns="4">  <!-- starts at 4, library steps it down -->
```

This works through a static table of attribute selectors in the library CSS — each supported starting count (1–6) has its own rules at the library's fixed breakpoints (`992px`, `768px`, `480px`). The breakpoints and the step-down are owned by the library; the page only states the starting count. There is deliberately **no** default and no per-gallery generated `<style>`: a gallery without `data-columns` falls back to a single natural column, and two galleries on a page can start at different counts with each stepping down on its own.

## An element the library adds, that you can still style

### `.rmg-title-container`

You never write this class — the library creates it **inside the fullscreen viewer** when you open a photo. It is the overlay that shows the photo's `title` and, when `linkTo` is set, a link to it.

**This is the class that governs how that overlay looks.** It is the element to target to change the title box's appearance — its position, background, text color, size, spacing and border. It ships with defaults (a translucent dark pill, bottom-centered on the image, white text), all of which are overridable:

```css
/* from your own CSS */
.rmg-title-container {
  bottom: 40px;       /* distance from the image's bottom edge */
  background: none;   /* drop the dark pill */
  color: #ffd;        /* text color */
  font-size: 1rem;
  border-radius: 0;
  padding: 6px 10px;
}
```

The **`(open)` link** inside it can be styled separately via the descendant selector `.rmg-title-container a`.

The overlay is anchored to the **bottom edge of the enlarged image**, not the bottom of the screen: the viewer's `.rmg-image` box shrink-wraps the image, and the title is positioned within it. So the title follows the image's size — for a tall image the title sits at its own bottom, and the overlay width tracks the image width.

It is documented because it never appears in your HTML — without this note you'd have to read the source to know it exists and that it is customizable.

## Photo link attributes — `linkTo` and `linkText`

Two attributes on the `<img>` control the link shown in the fullscreen viewer:

- **`linkTo`** — the URL the link opens (in a new tab). No `linkTo`, no link.
- **`linkText`** — the label for that link. Optional.

The link's label is resolved in this order:

1. **`linkText`** if given. The title (if any) is rendered before it as plain text.
2. Otherwise the **`title`** — the title itself becomes the clickable link (not duplicated as plain text).
3. Otherwise **`(open)`** — the fallback when there is neither `linkText` nor `title`.

The link is built as a real anchor (`textContent` + `setAttribute`), never by string-concatenating into HTML — `linkTo` and `linkText` are treated as untrusted data. It carries `target="_blank"` and `rel="noopener noreferrer"`. If `linkText` is present but `linkTo` is not, no link is rendered.

Example:

```html
<img src="a.jpg" data-id="a" title="Sunset" linkTo="https://example.com/a">
<!-- the title "Sunset" is the link -->

<img src="b.jpg" data-id="b" title="Night sky" linkTo="https://example.com/b" linkText="View photo">
<!-- renders: Night sky  View photo -->

<img src="c.jpg" data-id="c" linkTo="https://example.com/c">
<!-- renders the label "(open)" -->
```

## Tags — `.rmg-tag`

If an image has a `tags` attribute (one or more tags separated by `;`), the library builds a tag element for each and overlays them on the image. You do not write them in your HTML:

```html
<img src="a.jpg" data-id="a" tags="50mm; f/1.8; Paris">
```

Each individual tag is rendered with the **`.rmg-tag`** class. This is the class to target to change how a single tag looks — its background, text color, shape, padding, font:

```css
.rmg-tag {
  background: #1c1c1c;
  color: #ffd;
  border-radius: 4px;
}
```

`.rmg-tag` elements are generated at runtime, so they never appear in your markup — this is why the class is documented here.

## Selection — API, callbacks and limits

Multi-select is enabled per gallery with `data-multiselect-enabled` (or the `multiSelect: true` option). All of the selection API below is **per gallery** — there is no global, all-galleries helper. Get a gallery instance with `RichmanGallery.create(container)` or `RichmanGallery.get(container)`.

### Methods

| Method | What it does |
| --- | --- |
| `selectAll()` | Selects every image. Does nothing when multi-select is not enabled. Honours the cap (see below). |
| `unselectAll()` | Deselects every image and clears the selection. This is what the bar's **Clear** button calls. |
| `getSelectedIds()` | Returns the selected image ids in selection order (a copy). |
| `toggleSelectionMode()` | Turns multi-select on or off. Turning it **off** also clears the selection. |

```js
const gallery = window.RichmanGallery.get('#my-gallery');
gallery.selectAll();
gallery.getSelectedIds();   // ['p7', 'p8', 'p9', 'p10']
gallery.unselectAll();
gallery.toggleSelectionMode();
```

### Callbacks

Two callbacks report selection changes, supplied as options at initialisation or via the global hooks object:

| Callback | Fired when |
| --- | --- |
| `onSelect(photoId)` | an image becomes selected |
| `onUnselect(photoId)` | an image becomes deselected |

They fire **per image, on every change** — including bulk operations:

- a marker click fires once for that image;
- `selectAll()` fires `onSelect` once per newly-selected image;
- `unselectAll()` fires `onUnselect` once per image that was selected;
- `toggleSelectionMode()` off fires `onUnselect` once per image that was selected.

A callback fires only for a real change: an image already selected (and still selected after `selectAll()`) does not fire again.

```js
// per init options
window.RichmanGallery.create(container, {
  onSelect: (id) => console.log('selected', id),
  onUnselect: (id) => console.log('unselected', id)
});

// or, for auto-initialised galleries, via the global hooks
window.RICHMAN_GALLERY_HOOKS = {
  onSelect: (id) => console.log('selected', id),
  onUnselect: (id) => console.log('unselected', id)
};
```

### Maximum selectable

A gallery may cap the selection with **`data-max-selectable`** (or the `maxSelectable` option, which writes the attribute).

```html
<div class="rmg-gallery" data-multiselect-enabled="true" data-max-selectable="10">
```

- **Selecting interactively** is blocked once the cap is reached (a message is shown); the cap never blocks deselecting.
- The bar's counter shows `N/M images selected` with a note `Maximum M images allowed`, highlighted at the cap.
- **`selectAll()` honours the cap by position**: it selects the first `M` images in the grid. If one of those positions has an image without a `data-id`, it is skipped, so fewer than `M` may end up selected.
- `data-max-selectable="0"` blocks all selection. Non-numeric values are ignored (treated as no cap).

### Order numbers

By default a selected image's circle marker shows a checkmark (`✓`). Add **`data-show-order-numbers`** to the gallery to make each marker show the image's **selection order** instead — `1`, `2`, `3`, …:

```html
<div class="rmg-gallery" data-multiselect-enabled="true" data-show-order-numbers>
```

The number is the position in the selection order, so it renumbers automatically as images are selected/deselected (no gaps). This is the class `.rmg-circle-marker` on the image's marker; the number is the marker's text content.

### The selection bar

While multi-select is enabled, the library places the selection bar at the **bottom of the gallery** (not the page). It is hidden until the first image is selected; the bar's **Clear** button calls `unselectAll()`.

## Likes and comments — API, callbacks and state

Both features add a marker to each image and report interaction through a callback. They differ in one important way: **a like is stateful, a comment is stateless.**

Enable them per gallery:

```html
<div class="rmg-gallery" data-like-enabled="true" data-comments-enabled="true" data-like-position="bottom-right">
```

| Attribute | Effect |
| --- | --- |
| `data-like-enabled` | adds the heart marker to every image |
| `data-comments-enabled` | adds the comment bubble to every image |
| `data-like-position="bottom-right"` | places the like/comment markers in the bottom-right corner (default: top-left) |
| `data-liked="true"` (on an image) | renders that image as already liked |

### Marker positioning

The markers are absolutely positioned within each image's wrapper (`.rmg-image-wrapper`). The like marker has class **`.rmg-like-marker`**, the comment marker **`.rmg-comment-marker`**. Two placements are supported, chosen by `data-like-position` on the gallery:

| `data-like-position` | Like heart | Comment bubble |
| --- | --- | --- |
| *(absent)* — default | top-left corner | top-left, immediately to the right of the heart |
| `"bottom-right"` | bottom-right corner | bottom-right, immediately to the left of the heart |

When the bubble shares a corner with the heart, it sits *beside* it (the heart occupies the 8px corner; the bubble is offset by the heart's width). When likes are **disabled** but comments are enabled, there is no heart to sit beside, so the bubble takes the heart's own slot — top-left by default, or bottom-right with `data-like-position="bottom-right"`.

Only these two corners exist: the default (top-left) and `bottom-right`. There is no arbitrary per-marker positioning — any other `data-like-position` value falls back to the default corner. To place markers somewhere else entirely, override the marker classes from your own CSS.

### Likes — stateful, with a previous state

Clicking a heart flips the image between liked and not-liked. The library **holds this state** (the `liked` class on the image and the list of liked ids), so a like always has a *previous state* that can be restored:

- `onLike(photoId, liked)` — fired after every like/unlike. `liked` is the **new** state.
- `setLiked(photoId, liked)` — forces an image to a given liked state. This is the **rollback** hook: because the marker already changed optimistically when `onLike` fired, the page calls `setLiked(photoId, !liked)` to restore the previous state if persistence failed.

```js
window.RichmanGallery.create(container, {
  like: true,
  onLike: (photoId, liked) => {
    save(photoId, liked).catch(() => {
      // persistence failed — put the marker back the way it was
      window.RichmanGallery.get(container).setLiked(photoId, !liked);
    });
  }
});
```

The sequence is always: marker updates immediately (optimistic) → `onLike` fires with the new state → the page may roll back with `setLiked`.

### Comments — stateless

The comment bubble changes **nothing** in the viewer. It is a pure trigger:

- `onComments(photoId)` — fired on every bubble click.

There is no comment state to hold and no setter to roll back: clicking a bubble does not mark it, count it, or change the display. The page owns everything that happens next (opening a panel, showing a modal, fetching a thread). Because there is no state, there is no "previous state" and nothing to undo.

### Supplying the callbacks

Both callbacks can be given either per gallery (init options) or globally (for auto-initialised galleries):

```js
// per init
window.RichmanGallery.create(container, { onLike, onComments });

// global, used when a gallery is initialised without its own callbacks
window.RICHMAN_GALLERY_HOOKS = { onLike, onComments };
```

When both are provided, the per-gallery option wins. The same applies to selection callbacks (`onSelect` / `onUnselect`).

## Galleries added or changed after load

Galleries and their images often appear after the page has loaded (AJAX, user interaction). The library handles the two distinct cases differently.

### Use cases

**Inserting a whole gallery** is for when an *entirely new* gallery appears on the page, rather than the initial HTML containing it:

- a "load more" or infinite-scroll action that appends another gallery block;
- a single-page app or widget that fetches content and renders a gallery into a placeholder after the fetch resolves;
- a panel, tab, or modal that is opened on demand and reveals a gallery it builds at that moment;
- any flow where the gallery does not exist when the page loads and the page has no explicit initialization call of its own.

Because initialization is automatic, such code only has to append the markup — it does not need to know about or call the library.

**Reinitializing** is for when the *same* gallery stays on the page but its images change:

- a search or filter that rebuilds the results grid with a different set of photos;
- pagination that replaces the grid's contents, or lazy-loading that appends more photos;
- a settings/preview screen that re-renders the grid after the user changes a preference;
- any AJAX response that swaps the `<img>` elements inside an existing `.rmg-grid`.

In every one of those cases the page swaps the markup; the gallery then needs to be told to re-scan it (see below). Tags are the one exception — the gallery watches its own grid and re-renders tags for added images on its own — but click-to-open, liked state and selection markers require `reinitialize()`.

### Inserting a whole gallery — automatic

Adding a `.rmg-gallery` element to the page **after load** initializes it with no call required: the library watches `document.body` (including descendants) and builds a gallery for any newly-added `.rmg-gallery`, exactly as if it had been in the original HTML.

```js
const container = document.createElement('div');
container.className = 'rmg-gallery';
container.setAttribute('data-columns', '3');
container.innerHTML = '<div class="rmg-grid"><img src="a.jpg" data-id="a"></div>';
document.body.appendChild(container);
// → auto-initialized: click-to-open, tags, markers all work immediately
```

The inserted element's **configuration attributes are read at that moment** — `data-columns`, `data-multiselect-enabled`, `data-max-selectable`, `data-like-enabled`, `data-comments-enabled`, `data-like-position`. A container that already has a gallery instance is left alone (insertion is idempotent).

### Changing a gallery's images — `reinitialize()`

Auto-init only fires when a `.rmg-gallery` element itself is added. Appending or replacing `<img>` elements *inside an existing* grid does **not** re-run it, so those new images do not get their click-to-open handler, liked state, or markers — call **`reinitialize()`** on the gallery to restore all of them:

```js
const gallery = window.RichmanGallery.get('#my-gallery');
container.querySelector('.rmg-grid').innerHTML = newImagesHtml;
gallery.reinitialize();
```

`reinitialize()` re-reads the images from the grid and restores everything on them: click-to-open, tags, liked state (`data-liked`) and selection markers. The typical pattern is: swap the grid's images (e.g. after an AJAX response), then call `reinitialize()` so the new content is interactive.

> **Note:** tags are a partial exception. A gallery observes its own grid, so `<img>` elements appended to an existing `.rmg-grid` get their tags rendered automatically even without `reinitialize()`. But their click-to-open handler, liked state, and markers are only applied by `reinitialize()` — so for a full, consistent swap, always call it.

There is no global reinitialize helper — like the selection API, it is a per-gallery method. Get the instance with `RichmanGallery.get(container)` (or keep the one returned by `RichmanGallery.create`).

## Public API

The library exposes a single global, `window.RichmanGallery`.

| Method | Description |
| --- | --- |
| `RichmanGallery.create(containerOrSelector, options?)` | Builds a gallery for one container (element or selector) and returns the instance. If the container already has a gallery, returns the existing instance. Returns `null` for a selector that matches nothing. |
| `RichmanGallery.get(containerOrSelector)` | Returns the existing gallery instance for a container, or `null`. Use it to call per-gallery methods (`selectAll()`, `reinitialize()`, `closeFullscreen()`, …). |
| `RichmanGallery.initAll(options?)` | Scans the document for every `.rmg-gallery` and initializes those that are not yet initialized, returning an array of instances. This is what the library runs automatically on load; call it yourself after adding markup if you do not want to rely on the automatic observer (existing galleries are reused, not duplicated). |

```js
const galleries = window.RichmanGallery.initAll();
const one = window.RichmanGallery.get('#compact-gallery');
```

### The fullscreen viewer — `closeFullscreen()`

`closeFullscreen()` closes the viewer if it is open and returns the page to its normal state (restores `document.body` scrolling and detaches the key listener). It is safe to call when nothing is open.

The viewer can also be closed by the user with the close button, by clicking the backdrop, and with the **Escape** key. Escape closes a gallery of any size — the arrow keys simply have nothing to do in a single-image gallery.
