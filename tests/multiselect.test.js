import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/ts/richman-gallery.ts';

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

function makePhoto(id) {
  return { src: `/photo-${id}.jpg`, 'data-id': id };
}

function markerFor(container, id) {
  const img = container.querySelector(`img[data-id="${id}"]`);
  return img.parentElement.querySelector('.rmg-circle-marker');
}

function clickMarker(container, id) {
  markerFor(container, id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function multiSelectBar() {
  return document.querySelector('.rmg-multiselect-bar');
}

const P1 = makePhoto('p1');
const P2 = makePhoto('p2');
const P3 = makePhoto('p3');

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

describe('multi-select: markers', () => {
  it('adds a circle marker to every image when multi-select is enabled', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-circle-marker').length).toBe(2);
  });

  it('adds no circle markers when multi-select is not enabled', () => {
    const container = mountGallery([P1, P2]);
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-circle-marker').length).toBe(0);
  });

  it('selects an image when its marker is clicked and marks it selected', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');

    const img = container.querySelector('img[data-id="p1"]');
    expect(img.classList.contains('rmg-selected')).toBe(true);
    const marker = markerFor(container, 'p1');
    expect(marker.classList.contains('selected')).toBe(true);
    expect(marker.textContent).toBe('\u2713');
  });

  it('deselects an image when its marker is clicked again', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    clickMarker(container, 'p1');

    const img = container.querySelector('img[data-id="p1"]');
    expect(img.classList.contains('rmg-selected')).toBe(false);
  });

  it('does not select an image lacking data-id', () => {
    const noId = { src: '/orphan.jpg' };
    const container = mountGallery([noId, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    const orphan = container.querySelector('img[src="/orphan.jpg"]');
    orphan.parentElement.querySelector('.rmg-circle-marker')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(orphan.classList.contains('rmg-selected')).toBe(false);
    expect(container._gallery.getSelectedIds()).toEqual([]);
  });
});

describe('multi-select: selection bar', () => {
  it('creates the selection bar only when multi-select is enabled', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    expect(multiSelectBar()).toBeTruthy();
  });

  it('shows the selected count with correct pluralization', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    let count = multiSelectBar().querySelector('.rmg-selection-count');
    expect(count.textContent).toBe('1 image selected');

    clickMarker(container, 'p2');
    count = multiSelectBar().querySelector('.rmg-selection-count');
    expect(count.textContent).toBe('2 images selected');
  });

  it('exposes the selected ids in selection order', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p2');
    clickMarker(container, 'p1');

    expect(container._gallery.getSelectedIds()).toEqual(['p2', 'p1']);
  });

  it('clears the selection when the Clear button is clicked', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');

    multiSelectBar().querySelector('.rmg-clear-btn')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container._gallery.getSelectedIds()).toEqual([]);
    expect(container.querySelectorAll('img.rmg-selected').length).toBe(0);
  });
});

describe('multi-select: max selectable', () => {
  it('blocks selection beyond the cap and reports the limit', () => {
    const container = mountGallery([P1, P2, P3], {
      'data-multiselect-enabled': 'true',
      'data-max-selectable': '2'
    });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');

    const count = multiSelectBar().querySelector('.rmg-selection-count');
    expect(count.textContent).toBe('2/2 images selected');
    const limit = multiSelectBar().querySelector('.rmg-selection-limit');
    expect(limit.textContent).toBe('Maximum 2 images allowed');

    clickMarker(container, 'p3');

    expect(container._gallery.getSelectedIds()).toEqual(['p1', 'p2']);
    expect(container.querySelector('img[data-id="p3"]').classList.contains('rmg-selected')).toBe(false);
  });

  it('reports the cap only once it is configured', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    const count = multiSelectBar().querySelector('.rmg-selection-count');
    expect(count.textContent).toBe('1 image selected');
    expect(multiSelectBar().querySelector('.rmg-selection-limit').textContent).toBe('');
  });

  it('selectAll drops a previously-selected image that falls outside the cap', () => {
    const container = mountGallery([P1, P2, P3], {
      'data-multiselect-enabled': 'true',
      'data-max-selectable': '2'
    });
    const gallery = window.GridGallery.create(container);

    clickMarker(container, 'p3');
    expect(gallery.getSelectedIds()).toEqual(['p3']);

    gallery.selectAll();

    expect(gallery.getSelectedIds()).toEqual(['p1', 'p2']);
    expect(container.querySelectorAll('img.rmg-selected').length).toBe(2);
    expect(container.querySelector('img[data-id="p3"]').classList.contains('rmg-selected')).toBe(false);
  });
});

describe('multi-select: order numbers', () => {
  it('shows order numbers instead of checkmarks when enabled', () => {
    const container = mountGallery([P1, P2, P3], {
      'data-multiselect-enabled': 'true',
      'data-show-order-numbers': null
    });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');

    expect(markerFor(container, 'p1').textContent).toBe('1');
    expect(markerFor(container, 'p2').textContent).toBe('2');
  });

  it('renumbers the remaining selection when an image is deselected', () => {
    const container = mountGallery([P1, P2, P3], {
      'data-multiselect-enabled': 'true',
      'data-show-order-numbers': null
    });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');
    clickMarker(container, 'p3');

    clickMarker(container, 'p2');

    expect(markerFor(container, 'p1').textContent).toBe('1');
    expect(markerFor(container, 'p3').textContent).toBe('2');
  });
});

describe('multi-select: interplay with the lightbox', () => {
  it('still opens the lightbox when the image body is clicked (not the marker)', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    const img = container.querySelector('img[data-id="p1"]');
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container.querySelector('#rmg-screen')).toBeTruthy();
  });

  it('does not open the lightbox when the marker itself is clicked', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');

    expect(container.querySelector('#rmg-screen')).toBeFalsy();
  });
});

describe('multi-select: selection bar placement', () => {
  it('renders the bar inside the gallery container, not the page body', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    const bar = multiSelectBar();
    expect(bar).toBeTruthy();
    expect(bar.parentElement).toBe(container);
  });

  it('positions the bar absolutely at the gallery bottom', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    const style = multiSelectBar().style;
    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe('0px');
    expect(style.left).toBe('0px');
    expect(style.right).toBe('0px');
  });

  it('does not intercept clicks while no image is selected', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    const bar = multiSelectBar();
    expect(bar.style.opacity).toBe('0');
    expect(bar.style.pointerEvents).toBe('none');
  });

  it('becomes interactive once an image is selected', () => {
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container);

    clickMarker(container, 'p1');

    const bar = multiSelectBar();
    expect(bar.style.opacity).toBe('1');
    expect(bar.style.pointerEvents).toBe('auto');
  });
});

describe('multi-select: onSelect / onUnselect callbacks', () => {
  function collect() {
    const events = [];
    return {
      events,
      onSelect: (id) => events.push(['select', id]),
      onUnselect: (id) => events.push(['unselect', id])
    };
  }

  it('fires onSelect when a marker selects an image', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container, { onSelect, onUnselect });

    clickMarker(container, 'p2');

    expect(events).toEqual([['select', 'p2']]);
  });

  it('fires onUnselect when a marker deselects an image', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container, { onSelect, onUnselect });

    clickMarker(container, 'p2');
    clickMarker(container, 'p2');

    expect(events).toEqual([['select', 'p2'], ['unselect', 'p2']]);
  });

  it('does not fire onUnselect for an image that was never selected', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container, { onSelect, onUnselect });

    container._gallery.unselectAll();

    expect(events).toEqual([]);
  });

  it('fires onUnselect per image when the selection is cleared', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    window.GridGallery.create(container, { onSelect, onUnselect });

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');
    events.length = 0;

    multiSelectBar().querySelector('.rmg-clear-btn')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(events).toEqual([['unselect', 'p1'], ['unselect', 'p2']]);
  });

  it('fires onSelect per image when selectAll is used', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1, P2, P3], { 'data-multiselect-enabled': 'true' });
    const gallery = window.GridGallery.create(container, { onSelect, onUnselect });

    gallery.selectAll();

    expect(events).toEqual([
      ['select', 'p1'],
      ['select', 'p2'],
      ['select', 'p3']
    ]);
  });

  it('fires onUnselect per image when multi-select mode is turned off', () => {
    const { events, onSelect, onUnselect } = collect();
    const container = mountGallery([P1, P2], { 'data-multiselect-enabled': 'true' });
    const gallery = window.GridGallery.create(container, { onSelect, onUnselect });

    clickMarker(container, 'p1');
    clickMarker(container, 'p2');
    events.length = 0;

    gallery.toggleSelectionMode();

    expect(events).toEqual([['unselect', 'p1'], ['unselect', 'p2']]);
  });
});
