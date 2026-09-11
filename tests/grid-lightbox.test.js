import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/richman-gallery.ts';

function mountGallery(imageAttrs) {
  const images = imageAttrs
    .map((attrs) => {
      const attrsStr = Object.entries(attrs)
        .map(([k, v]) => (v === null ? k : `${k}="${v}"`))
        .join(' ');
      return `<img ${attrsStr}>`;
    })
    .join('');
  document.body.innerHTML = `<div class="rmg-gallery"><div class="rmg-grid">${images}</div></div>`;
  const container = document.querySelector('.rmg-gallery');
  return container;
}

const PHOTO = { src: '/photo.jpg', 'data-id': 'p1' };
const PHOTO2 = { src: '/photo2.jpg', 'data-id': 'p2' };
const PHOTO3 = { src: '/photo3.jpg', 'data-id': 'p3' };

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

describe('basic grid', () => {
  it('keeps the provided images in the DOM, in order', () => {
    const container = mountGallery([PHOTO, PHOTO2, PHOTO3]);
    window.GridGallery.create(container);

    const imgs = container.querySelectorAll('.rmg-grid img');
    expect(imgs.length).toBe(3);
    expect(imgs[0].getAttribute('src')).toBe('/photo.jpg');
    expect(imgs[2].getAttribute('src')).toBe('/photo3.jpg');
  });

  it('stores a gallery instance on the container', () => {
    const container = mountGallery([PHOTO]);
    const gallery = window.GridGallery.create(container);

    expect(gallery).toBeTruthy();
    expect(container._gallery).toBe(gallery);
  });

  it('returns the same instance if the container is already a gallery', () => {
    const container = mountGallery([PHOTO]);
    const first = window.GridGallery.create(container);
    const second = window.GridGallery.create(container);

    expect(second).toBe(first);
  });
});

describe('lightbox', () => {
  it('opens a fullscreen viewer when an image is clicked', () => {
    const container = mountGallery([PHOTO, PHOTO2]);
    window.GridGallery.create(container);

    const img = container.querySelector('img');
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    expect(screen).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/photo.jpg'));
  });

  it('hides prev/next when the gallery has a single image', () => {
    const container = mountGallery([PHOTO]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-prev').hidden).toBe(true);
    expect(screen.querySelector('.rmg-next').hidden).toBe(true);
  });

  it('shows prev/next and hides prev on the first image of a multi-image gallery', () => {
    const container = mountGallery([PHOTO, PHOTO2, PHOTO3]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-prev').hidden).toBe(true);
    expect(screen.querySelector('.rmg-next').hidden).toBe(false);
  });

  it('navigates to the next image and hides next on the last image', () => {
    const container = mountGallery([PHOTO, PHOTO2]);
    window.GridGallery.create(container);

    const img = container.querySelector('img');
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    screen.querySelector('.rmg-next').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/photo2.jpg'));
    expect(screen.querySelector('.rmg-next').hidden).toBe(true);
    expect(screen.querySelector('.rmg-prev').hidden).toBe(false);
  });

  it('navigates with the arrow keys and closes with Escape', () => {
    const container = mountGallery([PHOTO, PHOTO2]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    let screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/photo2.jpg'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/photo.jpg'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(container.querySelector('#rmg-screen')).toBeFalsy();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes a single-image gallery with Escape too', () => {
    const container = mountGallery([PHOTO]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('#rmg-screen')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(container.querySelector('#rmg-screen')).toBeFalsy();
    expect(document.body.style.overflow).toBe('');
  });

  it('ignores the arrow keys in a single-image gallery', () => {
    const container = mountGallery([PHOTO]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    const screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-image img').src).toBe(absUrl('/photo.jpg'));
  });

  it('closes when the close button is clicked', () => {
    const container = mountGallery([PHOTO]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    screen.querySelector('.rmg-close').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container.querySelector('#rmg-screen')).toBeFalsy();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes when the backdrop is clicked', () => {
    const container = mountGallery([PHOTO, PHOTO2]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    screen.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container.querySelector('#rmg-screen')).toBeFalsy();
  });

  it('shows the image title under the viewer when the image has a title', () => {
    const container = mountGallery([{ src: '/photo.jpg', 'data-id': 'p1', title: 'Sunset by Ana' }]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    const titleContainer = screen.querySelector('.rmg-title-container');
    expect(titleContainer.style.display).not.toBe('none');
    expect(titleContainer.textContent).toContain('Sunset by Ana');
  });

  it('hides the title area when the image has no title', () => {
    const container = mountGallery([{ src: '/photo.jpg', 'data-id': 'p1' }]);
    window.GridGallery.create(container);

    container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const screen = container.querySelector('#rmg-screen');
    expect(screen.querySelector('.rmg-title-container').style.display).toBe('none');
  });

  describe('photo link', () => {
    const open = (attrs) => {
      const container = mountGallery([{ src: '/photo.jpg', 'data-id': 'p1', ...attrs }]);
      window.GridGallery.create(container);
      container.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return container.querySelector('#rmg-screen .rmg-title-container');
    };

    it('makes the title the link when linkTo is set without linkText', () => {
      const title = open({ title: 'Sunset', linkTo: '/photo/p1' });

      const link = title.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe('Sunset');
      expect(link.getAttribute('href')).toBe('/photo/p1');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('does not duplicate the title when it becomes the link', () => {
      const title = open({ title: 'Sunset', linkTo: '/photo/p1' });

      expect(title.textContent).toBe('Sunset');
    });

    it('shows title as plain text plus a link labeled linkText', () => {
      const title = open({ title: 'Sunset', linkTo: '/photo/p1', linkText: 'View photo' });

      const link = title.querySelector('a');
      expect(link.textContent).toBe('View photo');
      expect(title.textContent).toBe('Sunset  View photo');
    });

    it('uses linkText alone when there is no title', () => {
      const title = open({ linkTo: '/photo/p1', linkText: 'View photo' });

      const link = title.querySelector('a');
      expect(link.textContent).toBe('View photo');
      expect(link.getAttribute('href')).toBe('/photo/p1');
    });

    it('falls back to (open) when there is neither linkText nor title', () => {
      const title = open({ linkTo: '/photo/p1' });

      const link = title.querySelector('a');
      expect(link.textContent).toBe('(open)');
    });

    it('renders no link when linkTo is absent', () => {
      const title = open({ title: 'Sunset' });

      expect(title.querySelector('a')).toBeFalsy();
      expect(title.textContent).toBe('Sunset');
    });

    it('renders no link when linkText is set but linkTo is absent', () => {
      const title = open({ title: 'Sunset', linkText: 'View photo' });

      expect(title.querySelector('a')).toBeFalsy();
      expect(title.textContent).toBe('Sunset');
    });
  });
});
