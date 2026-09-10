import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/ts/richman-gallery.ts';

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

function mountGallery(imageAttrs, containerAttrs = {}) {
  const attrsString = Object.entries(containerAttrs)
    .map(([k, v]) => (v === null ? k : `${k}="${v}"`))
    .join(' ');
  const images = imageAttrs
    .map((attrs) => {
      const imgAttrs = Object.entries(attrs)
        .map(([k, v]) => (v === null ? k : `${k}="${v}"`))
        .join(' ');
      return `<img ${imgAttrs}>`;
    })
    .join('');
  document.body.innerHTML = `<div class="rmg-gallery" ${attrsString}><div class="rmg-grid">${images}</div></div>`;
  return document.querySelector('.rmg-gallery');
}

const photo = (id) => ({ src: `/photo-${id}.jpg`, 'data-id': id });

describe('columns configuration', () => {
  it('sets the data-columns attribute from the columns option', () => {
    const container = mountGallery([photo('p1')]);
    window.GridGallery.create(container, { columns: 4 });

    expect(container.getAttribute('data-columns')).toBe('4');
  });

  it('preserves a data-columns attribute present on the markup', () => {
    const container = mountGallery([photo('p1')], { 'data-columns': '2' });
    window.GridGallery.create(container);

    expect(container.getAttribute('data-columns')).toBe('2');
  });

  it('reads data-columns during initAll', () => {
    mountGallery([photo('p1')], { 'data-columns': '3' });
    const [gallery] = window.GridGallery.initAll();

    expect(gallery.container.getAttribute('data-columns')).toBe('3');
  });

  it('leaves the container without data-columns when not configured', () => {
    const container = mountGallery([photo('p1')]);
    window.GridGallery.create(container);

    expect(container.hasAttribute('data-columns')).toBe(false);
  });
});
