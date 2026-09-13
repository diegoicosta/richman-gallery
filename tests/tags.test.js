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

function tagsContainerOf(container, id) {
  const img = container.querySelector(`img[data-id="${id}"]`);
  return img.parentElement.querySelector('.rmg-all-tags');
}

function tagTexts(container, id) {
  const allTags = tagsContainerOf(container, id);
  if (!allTags) return null;
  return Array.from(allTags.querySelectorAll('.rmg-tag')).map((tag) => tag.textContent);
}

const flushObserver = () => new Promise((resolve) => setTimeout(resolve, 150));

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

describe('tags', () => {
  it('adds a tag for each semicolon-separated tags entry', () => {
    const container = mountGallery([
      makePhoto('p1', { 'tags': '50mm; f/1.8; Paris' })
    ]);
    window.RichmanGallery.create(container);

    expect(tagTexts(container, 'p1')).toEqual(['50mm', 'f/1.8', 'Paris']);
  });

  it('ignores empty entries and trims surrounding whitespace', () => {
    const container = mountGallery([
      makePhoto('p1', { 'tags': '  50mm ; ;  f/1.8 ;' })
    ]);
    window.RichmanGallery.create(container);

    expect(tagTexts(container, 'p1')).toEqual(['50mm', 'f/1.8']);
  });

  it('adds no tags to an image without a tags attribute', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.RichmanGallery.create(container);

    expect(tagsContainerOf(container, 'p1')).toBeFalsy();
  });

  it('does not wrap images that have no tags', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.RichmanGallery.create(container);

    const img = container.querySelector('img[data-id="p1"]');
    expect(img.parentElement.classList.contains('rmg-image-wrapper')).toBe(false);
  });

  it('wraps each tagged image in a dedicated wrapper', () => {
    const container = mountGallery([
      makePhoto('p1', { 'tags': '50mm' }),
      makePhoto('p2', { 'tags': '85mm' })
    ]);
    window.RichmanGallery.create(container);

    const wrappers = container.querySelectorAll('.rmg-image-wrapper');
    expect(wrappers.length).toBe(2);
  });

  it('keeps tags and the multi-select marker in the same wrapper', () => {
    const container = mountGallery(
      [makePhoto('p1', { 'tags': '50mm' })],
      { 'data-multiselect-enabled': 'true' }
    );
    window.RichmanGallery.create(container);

    const wrapper = container.querySelector('.rmg-image-wrapper');
    expect(wrapper.querySelector('.rmg-all-tags')).toBeTruthy();
    expect(wrapper.querySelector('.rmg-circle-marker')).toBeTruthy();
  });

  it('adds tags to images inserted into the gallery after load', async () => {
    const container = mountGallery([makePhoto('p1')]);
    window.RichmanGallery.create(container);

    const img = document.createElement('img');
    img.src = '/photo-late.jpg';
    img.setAttribute('data-id', 'late');
    img.setAttribute('tags', 'Zoom; 2026');
    container.querySelector('.rmg-grid').appendChild(img);

    await flushObserver();

    expect(tagTexts(container, 'late')).toEqual(['Zoom', '2026']);
  });

  it('does not duplicate tags when the gallery is reinitialized', () => {
    const container = mountGallery([makePhoto('p1', { 'tags': '50mm' })]);
    const gallery = window.RichmanGallery.create(container);

    gallery.reinitialize();
    gallery.reinitialize();

    expect(tagTexts(container, 'p1')).toEqual(['50mm']);
    expect(container.querySelectorAll('.rmg-tag').length).toBe(1);
  });
});
