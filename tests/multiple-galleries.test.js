import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/richman-gallery.ts';

function makePhoto(prefix, n, extra = {}) {
  return { src: `/${prefix}${n}.jpg`, 'data-id': `${prefix}${n}`, ...extra };
}

function imageEl(attrs) {
  const img = document.createElement('img');
  img.src = attrs.src;
  if (attrs['data-id']) img.setAttribute('data-id', attrs['data-id']);
  return img;
}

function mountTwoGalleries() {
  const first = document.createElement('div');
  first.className = 'rmg-gallery';
  first.setAttribute('data-multiselect-enabled', 'true');
  const boxA = document.createElement('div');
  boxA.className = 'rmg-grid';
  boxA.appendChild(imageEl(makePhoto('a', 1)));
  boxA.appendChild(imageEl(makePhoto('a', 2)));
  first.appendChild(boxA);

  const second = document.createElement('div');
  second.className = 'rmg-gallery';
  second.setAttribute('data-multiselect-enabled', 'true');
  const boxB = document.createElement('div');
  boxB.className = 'rmg-grid';
  boxB.appendChild(imageEl(makePhoto('b', 1)));
  boxB.appendChild(imageEl(makePhoto('b', 2)));
  second.appendChild(boxB);

  document.body.innerHTML = '';
  document.body.appendChild(first);
  document.body.appendChild(second);
  return [first, second];
}

function markerFor(container, id) {
  const img = container.querySelector(`img[data-id="${id}"]`);
  return img.parentElement.querySelector('.rmg-circle-marker');
}

function clickMarker(container, id) {
  markerFor(container, id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

const absUrl = (path) => new URL(path, window.location.href).href;

afterEach(() => {
  document.querySelectorAll('.rmg-gallery').forEach((container) => {
    if (container._gallery && container._gallery.screenItem) {
      container._gallery.closeFullscreen();
    }
  });
  document.body.innerHTML = '';
});

describe('multiple galleries on one page', () => {
  it('gives each container its own independent instance', () => {
    const [first, second] = mountTwoGalleries();

    window.RichmanGallery.initAll();

    expect(first._gallery).toBeTruthy();
    expect(second._gallery).toBeTruthy();
    expect(first._gallery).not.toBe(second._gallery);
  });

  it('keeps each gallery selection independent', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    clickMarker(first, 'a1');
    clickMarker(first, 'a2');

    expect(first._gallery.getSelectedIds()).toEqual(['a1', 'a2']);
    expect(second._gallery.getSelectedIds()).toEqual([]);
    expect(second.querySelectorAll('img.rmg-selected').length).toBe(0);
  });

  it('lets clearing one gallery leave the other selection intact', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    clickMarker(first, 'a1');
    clickMarker(second, 'b1');

    first._gallery.unselectAll();

    expect(first._gallery.getSelectedIds()).toEqual([]);
    expect(second._gallery.getSelectedIds()).toEqual(['b1']);
  });

  it('selectAll on one gallery leaves the other untouched', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    first._gallery.selectAll();

    expect(first._gallery.getSelectedIds()).toEqual(['a1', 'a2']);
    expect(second._gallery.getSelectedIds()).toEqual([]);
  });

  it('opens the lightbox inside the gallery that was clicked', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    second.querySelector('img[data-id="b1"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(second.querySelector('#rmg-screen')).toBeTruthy();
    expect(first.querySelector('#rmg-screen')).toBeFalsy();
    expect(second.querySelector('#rmg-screen .rmg-image img').src).toBe(absUrl('/b1.jpg'));
  });

  it('navigates only the clicked gallery images in the lightbox', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    second.querySelector('img[data-id="b1"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = second.querySelector('#rmg-screen');
    screen.querySelector('.rmg-next').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/b2.jpg'));

    const firstScreen = first.querySelector('#rmg-screen');
    expect(firstScreen ? firstScreen.querySelector('.rmg-image img').src : null)
      .not.toBe(absUrl('/a2.jpg'));
  });

  it('toggling multi-select on one gallery does not affect the other', () => {
    const [first, second] = mountTwoGalleries();
    window.RichmanGallery.initAll();

    first._gallery.toggleSelectionMode();

    expect(first.hasAttribute('data-multiselect-enabled')).toBe(false);
    expect(second.hasAttribute('data-multiselect-enabled')).toBe(true);
    expect(second.querySelectorAll('.rmg-circle-marker').length).toBe(2);
  });
});
