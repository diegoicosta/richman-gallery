import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/richman-gallery.ts';

function attrsString(attrs) {
  return Object.entries(attrs)
    .map(([k, v]) => (v === null ? k : `${k}="${v}"`))
    .join(' ');
}

function mountGallery(imageAttrs, containerAttrs = {}) {
  const images = imageAttrs.map((attrs) => `<img ${attrsString(attrs)}>`).join('');
  const containerStr = attrsString(containerAttrs);
  document.body.innerHTML = `<div class="rmg-gallery" ${containerStr}><div class="rmg-grid">${images}</div></div>`;
  return document.querySelector('.rmg-gallery');
}

function makePhoto(id, extra = {}) {
  return { src: `/photo-${id}.jpg`, 'data-id': id, ...extra };
}

function likeMarkerFor(container, id) {
  const img = container.querySelector(`img[data-id="${id}"]`);
  return img.parentElement.querySelector('.rmg-like-marker');
}

function clickLike(container, id) {
  likeMarkerFor(container, id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

const WHITE_HEART = '\u{1F90D}';
const RED_HEART = '\u2764\uFE0F';

function collectLikes() {
  const calls = [];
  return {
    calls,
    onLike: (id, liked) => calls.push({ id, liked })
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.querySelectorAll('.rmg-gallery').forEach((container) => {
    if (container._gallery && container._gallery.screenItem) {
      container._gallery.closeFullscreen();
    }
  });
  document.body.innerHTML = '';
});

describe('likes', () => {
  it('adds a heart marker to every image when likes are enabled', () => {
    const container = mountGallery([makePhoto('p1'), makePhoto('p2')], {
      'data-like-enabled': 'true'
    });
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-like-marker').length).toBe(2);
  });

  it('adds no heart markers when likes are not enabled', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-like-marker').length).toBe(0);
  });

  it('shows an outlined heart on an image that is not liked', () => {
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    window.GridGallery.create(container);

    const marker = likeMarkerFor(container, 'p1');
    expect(marker.classList.contains('liked')).toBe(false);
    expect(marker.textContent).toBe(WHITE_HEART);
  });

  it('likes an image on marker click and turns the heart solid', () => {
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    window.GridGallery.create(container);

    clickLike(container, 'p1');

    const img = container.querySelector('img[data-id="p1"]');
    const marker = likeMarkerFor(container, 'p1');
    expect(img.classList.contains('rmg-liked')).toBe(true);
    expect(marker.classList.contains('liked')).toBe(true);
    expect(marker.textContent).toBe(RED_HEART);
  });

  it('unlikes an image on a second marker click', () => {
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    window.GridGallery.create(container);

    clickLike(container, 'p1');
    clickLike(container, 'p1');

    const img = container.querySelector('img[data-id="p1"]');
    const marker = likeMarkerFor(container, 'p1');
    expect(img.classList.contains('rmg-liked')).toBe(false);
    expect(marker.classList.contains('liked')).toBe(false);
    expect(marker.textContent).toBe(WHITE_HEART);
  });

  it('notifies the page with the id and the new state on every change', () => {
    const { calls, onLike } = collectLikes();
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    window.GridGallery.create(container, { onLike });

    clickLike(container, 'p1');
    clickLike(container, 'p1');
    clickLike(container, 'p1');

    expect(calls).toEqual([
      { id: 'p1', liked: true },
      { id: 'p1', liked: false },
      { id: 'p1', liked: true }
    ]);
  });

  it('renders server-seeded liked images as already liked', () => {
    const container = mountGallery([makePhoto('p1', { 'data-liked': true })], {
      'data-like-enabled': 'true'
    });
    window.GridGallery.create(container);

    const img = container.querySelector('img[data-id="p1"]');
    const marker = likeMarkerFor(container, 'p1');
    expect(img.classList.contains('rmg-liked')).toBe(true);
    expect(marker.classList.contains('liked')).toBe(true);
    expect(marker.textContent).toBe(RED_HEART);
  });

  it('rolls back a like to its previous state when persistence fails', () => {
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    const gallery = window.GridGallery.create(container);

    clickLike(container, 'p1');
    gallery.setLiked('p1', false);

    const img = container.querySelector('img[data-id="p1"]');
    const marker = likeMarkerFor(container, 'p1');
    expect(img.classList.contains('rmg-liked')).toBe(false);
    expect(marker.classList.contains('liked')).toBe(false);
    expect(marker.textContent).toBe(WHITE_HEART);
  });

  it('rolls forward a server-confirmed like that was not yet applied', () => {
    const container = mountGallery([makePhoto('p1')], { 'data-like-enabled': 'true' });
    const gallery = window.GridGallery.create(container);

    gallery.setLiked('p1', true);

    const img = container.querySelector('img[data-id="p1"]');
    const marker = likeMarkerFor(container, 'p1');
    expect(img.classList.contains('rmg-liked')).toBe(true);
    expect(marker.classList.contains('liked')).toBe(true);
  });

  it('sets the like-position attribute when configured', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.GridGallery.create(container, { like: true, likePosition: 'bottom-right' });

    expect(container.getAttribute('data-like-position')).toBe('bottom-right');
  });

  it('enables likes from options even without the data attribute', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.GridGallery.create(container, { like: true });

    expect(container.hasAttribute('data-like-enabled')).toBe(true);
    expect(container.querySelectorAll('.rmg-like-marker').length).toBe(1);
  });
});
