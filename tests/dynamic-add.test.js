import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/richman-gallery.ts';

function makePhoto(id, extra = {}) {
  return { src: `/photo-${id}.jpg`, 'data-id': id, ...extra };
}

function imageEl(attrs) {
  const img = document.createElement('img');
  img.src = attrs.src;
  if (attrs['data-id']) img.setAttribute('data-id', attrs['data-id']);
  if (attrs['tags']) img.setAttribute('tags', attrs['tags']);
  if (attrs['data-liked']) img.setAttribute('data-liked', 'true');
  if (attrs.title) img.setAttribute('title', attrs.title);
  return img;
}

const flushObserver = () => new Promise((resolve) => setTimeout(resolve, 50));

const absUrl = (path) => new URL(path, window.location.href).href;

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

describe('galleries added after load', () => {
  it('auto-initializes a .rmg-gallery inserted after the page is ready', async () => {
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    box.appendChild(imageEl(makePhoto('p2')));
    container.appendChild(box);
    document.body.appendChild(container);

    await flushObserver();

    expect(container._gallery).toBeTruthy();
  });

  it('makes images of a dynamically added gallery open the lightbox', async () => {
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    container.appendChild(box);
    document.body.appendChild(container);

    await flushObserver();

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('#rmg-screen')).toBeTruthy();
  });

  it('honours data attributes when auto-initializing a dynamically added gallery', async () => {
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.setAttribute('data-multiselect-enabled', 'true');
    container.setAttribute('data-max-selectable', '1');
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    box.appendChild(imageEl(makePhoto('p2')));
    container.appendChild(box);
    document.body.appendChild(container);

    await flushObserver();

    expect(container.querySelectorAll('.rmg-circle-marker').length).toBe(2);
  });

  it('does not double-initialize a gallery that already has an instance', async () => {
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    box.appendChild(imageEl(makePhoto('p2')));
    container.appendChild(box);
    document.body.appendChild(container);

    await flushObserver();

    const galleries = window.GridGallery.initAll();
    expect(galleries.length).toBe(1);
    expect(container._gallery).toBe(galleries[0]);
  });
});

describe('reinitialization after the grid images are replaced', () => {
  it('picks up the new images', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);
    expect(gallery.images.length).toBe(1);

    box.innerHTML = '';
    box.appendChild(imageEl(makePhoto('p2')));
    box.appendChild(imageEl(makePhoto('p3')));

    gallery.reinitialize();

    expect(gallery.images.length).toBe(2);
  });

  it('re-binds click-to-open on the new images', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);

    box.innerHTML = '';
    const newImg = imageEl(makePhoto('p2'));
    box.appendChild(newImg);
    gallery.reinitialize();

    newImg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('#rmg-screen')).toBeTruthy();
    expect(container.querySelector('#rmg-screen .rmg-image img').src).toBe(absUrl('/photo-p2.jpg'));
  });

  it('restores tags on the new images', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);

    box.innerHTML = '';
    box.appendChild(imageEl(makePhoto('p2', { 'tags': '50mm; Paris' })));
    gallery.reinitialize();

    const img = container.querySelector('img[data-id="p2"]');
    const tags = img.parentElement.querySelectorAll('.rmg-tag');
    expect(Array.from(tags).map((c) => c.textContent)).toEqual(['50mm', 'Paris']);
  });

  it('restores liked state on the new images', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.setAttribute('data-like-enabled', 'true');
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);

    box.innerHTML = '';
    box.appendChild(imageEl(makePhoto('p2', { 'data-liked': true })));
    gallery.reinitialize();

    const img = container.querySelector('img[data-id="p2"]');
    expect(img.classList.contains('rmg-liked')).toBe(true);
    expect(img.parentElement.querySelector('.rmg-like-marker')).toBeTruthy();
  });

  it('clears the selection when the images are replaced', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    box.appendChild(imageEl(makePhoto('p2')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.setAttribute('data-multiselect-enabled', 'true');
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);

    const marker1 = box.querySelector('img[data-id="p1"]').parentElement.querySelector('.rmg-circle-marker');
    const marker2 = box.querySelector('img[data-id="p2"]').parentElement.querySelector('.rmg-circle-marker');
    marker1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    marker2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(gallery.getSelectedIds()).toEqual(['p1', 'p2']);

    box.innerHTML = '';
    box.appendChild(imageEl(makePhoto('p3')));
    box.appendChild(imageEl(makePhoto('p4')));
    gallery.reinitialize();

    expect(gallery.getSelectedIds()).toEqual([]);
  });

  it('resets the selection bar count when the images are replaced', () => {
    const box = document.createElement('div');
    box.className = 'rmg-grid';
    box.appendChild(imageEl(makePhoto('p1')));
    const container = document.createElement('div');
    container.className = 'rmg-gallery';
    container.setAttribute('data-multiselect-enabled', 'true');
    container.appendChild(box);
    document.body.appendChild(container);

    const gallery = window.GridGallery.create(container);

    box.querySelector('.rmg-circle-marker').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const bar = container.querySelector('.rmg-multiselect-bar');
    expect(bar.querySelector('.rmg-selection-count').textContent).toBe('1 image selected');

    box.innerHTML = '';
    box.appendChild(imageEl(makePhoto('p2')));
    gallery.reinitialize();

    const barAfter = container.querySelector('.rmg-multiselect-bar');
    expect(barAfter.querySelector('.rmg-selection-count').textContent).toBe('0 images selected');
  });
});
