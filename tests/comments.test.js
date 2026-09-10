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

function commentMarkerFor(container, id) {
  const img = container.querySelector(`img[data-id="${id}"]`);
  return img.parentElement.querySelector('.rmg-comment-marker');
}

function clickComment(container, id) {
  commentMarkerFor(container, id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

const SPEECH_BUBBLE = '\u{1F5E8}';

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

describe('comments', () => {
  it('adds a comment bubble marker to every image when comments are enabled', () => {
    const container = mountGallery([makePhoto('p1'), makePhoto('p2')], {
      'data-comments-enabled': 'true'
    });
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-comment-marker').length).toBe(2);
  });

  it('adds no comment markers when comments are not enabled', () => {
    const container = mountGallery([makePhoto('p1')]);
    window.GridGallery.create(container);

    expect(container.querySelectorAll('.rmg-comment-marker').length).toBe(0);
  });

  it('notifies the page with the image id when the bubble is clicked', () => {
    const opened = [];
    const container = mountGallery([makePhoto('p1')], { 'data-comments-enabled': 'true' });
    window.GridGallery.create(container, { onComments: (id) => opened.push(id) });

    clickComment(container, 'p1');

    expect(opened).toEqual(['p1']);
  });

  it('is stateless: it keeps no state and notifies again on each click', () => {
    const opened = [];
    const container = mountGallery([makePhoto('p1')], { 'data-comments-enabled': 'true' });
    window.GridGallery.create(container, { onComments: (id) => opened.push(id) });

    const img = container.querySelector('img[data-id="p1"]');
    const marker = commentMarkerFor(container, 'p1');
    expect(marker.classList.length).toBe(1);

    clickComment(container, 'p1');
    clickComment(container, 'p1');

    expect(marker.classList.contains('rmg-comment-marker')).toBe(true);
    expect(marker.classList.length).toBe(1);
    expect(img.classList.contains('rmg-selected')).toBe(false);
    expect(img.classList.contains('rmg-liked')).toBe(false);
    expect(opened).toEqual(['p1', 'p1']);
  });

  it('does not notify when the image lacks a data-id', () => {
    const opened = [];
    const noId = { src: '/orphan.jpg' };
    const container = mountGallery([noId], { 'data-comments-enabled': 'true' });
    window.GridGallery.create(container, { onComments: (id) => opened.push(id) });

    const orphan = container.querySelector('img[src="/orphan.jpg"]');
    orphan.parentElement.querySelector('.rmg-comment-marker')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(opened).toEqual([]);
  });

  it('enables comments and wiring from options alone', () => {
    const opened = [];
    const container = mountGallery([makePhoto('p1')]);
    window.GridGallery.create(container, { comments: true, onComments: (id) => opened.push(id) });

    expect(container.hasAttribute('data-comments-enabled')).toBe(true);
    clickComment(container, 'p1');
    expect(opened).toEqual(['p1']);
  });
});
