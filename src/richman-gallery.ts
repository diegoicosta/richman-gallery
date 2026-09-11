export interface GridGalleryHooks {
  onLike?: (photoId: string, liked: boolean) => void;
  onComments?: (photoId: string) => void;
  onSelect?: (photoId: string) => void;
  onUnselect?: (photoId: string) => void;
}

export interface GridGalleryOptions {
  gaplength?: number;
  columns?: number;
  multiSelect?: boolean;
  maxSelectable?: number;
  onSelect?: (photoId: string) => void;
  onUnselect?: (photoId: string) => void;
  like?: boolean;
  onLike?: (photoId: string, liked: boolean) => void;
  likePosition?: string;
  comments?: boolean;
  onComments?: (photoId: string) => void;
}

declare global {
  interface Window {
    GridGallery: GridGalleryApi;
    GRID_GALLERY_HOOKS?: GridGalleryHooks;
  }
  interface HTMLElement {
    _gallery?: GridGalleryInstance;
  }
}

declare const __RMG_VERSION__: string;

export const VERSION: string = __RMG_VERSION__;

export interface GridGalleryApi {
  version: string;
  create(containerOrSelector: HTMLElement | string, options?: GridGalleryOptions): GridGalleryInstance | null;
  get(containerOrSelector: HTMLElement | string): GridGalleryInstance | null;
  initAll(options?: GridGalleryOptions): GridGalleryInstance[];
}

type LikeHandler = (photoId: string, liked: boolean) => void;
type CommentsHandler = (photoId: string) => void;

function isElement(node: Node | null): node is Element {
  return node !== null && node.nodeType === Node.ELEMENT_NODE;
}

function asImage(el: Element | null): HTMLImageElement | null {
  return el instanceof HTMLImageElement ? el : null;
}

// ===== UTILITY: MESSAGE BOX =====
const BOX_ID = 'rmg-message-box';

function createMessageBox(): HTMLDivElement {
  const box = document.createElement('div');
  box.id = BOX_ID;
  box.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000;
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
    font-family: Inter, sans-serif; max-width: 300px; color: white;
    transform: translateY(-100px);
  `;
  document.body.appendChild(box);
  return box;
}

function messageColor(type: string): string {
  switch (type) {
    case 'success': return '#4CAF50';
    case 'error': return '#f44336';
    default: return '#333';
  }
}

function showMessage(message: string, type: string = 'info'): void {
  let box = document.getElementById(BOX_ID) as HTMLDivElement | null;
  if (!box) box = createMessageBox();

  box.style.backgroundColor = messageColor(type);
  box.textContent = message;
  box.style.opacity = '1';
  box.style.transform = 'translateY(0)';

  window.setTimeout(() => {
    box.style.opacity = '0';
    box.style.transform = 'translateY(-100px)';
    window.setTimeout(() => {
      if (box.parentNode) box.remove();
    }, 300);
  }, 3000);
}

function readWindowHooks(): GridGalleryHooks {
  return window.GRID_GALLERY_HOOKS || {};
}

// ===== GALLERY CLASS =====
export class GridGalleryInstance {
  container: HTMLElement;
  images: HTMLImageElement[] = [];
  selectedIds: string[] = [];
  likedIds: string[] = [];
  onSelect: ((photoId: string) => void) | null = null;
  onUnselect: ((photoId: string) => void) | null = null;
  onLike: LikeHandler | null = null;
  onComments: CommentsHandler | null = null;
  multiSelectBar: HTMLDivElement | null = null;
  screenItem: HTMLDivElement | null = null;
  currentImg: HTMLImageElement | null = null;
  currentIndex = -1;
  clickHandler: ((event: Event) => void) | null = null;
  keyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLElement, options: GridGalleryOptions = {}) {
    this.container = container;

    this.container._gallery = this;

    this.init(options);
  }

  init(options: GridGalleryOptions = {}): void {
    const galleryBox = this.container.querySelector('.rmg-grid');
    if (galleryBox) {
      this.images = Array.from(galleryBox.querySelectorAll('img'));
    } else {
      this.images = [];
    }

    this.configure(options);

    this.addTags();
    this.seedLikedState();
    this.updateUI();
    this.attachEvents();
    this.setupObservers();
  }

  configure(options: GridGalleryOptions = {}): void {
    if (options.columns !== undefined) {
      this.container.setAttribute('data-columns', String(options.columns));
    }
    if (options.gaplength !== undefined) this.container.style.setProperty('--gap-length', options.gaplength + 'px');

    if (options.multiSelect !== undefined) {
      if (options.multiSelect) {
        this.container.setAttribute('data-multiselect-enabled', 'true');
      } else {
        this.container.removeAttribute('data-multiselect-enabled');
      }
    }

    if (options.maxSelectable !== undefined && options.maxSelectable !== null) {
      this.container.setAttribute('data-max-selectable', options.maxSelectable.toString());
    }

    if (typeof options.onSelect === 'function') {
      this.onSelect = options.onSelect;
    } else if (typeof readWindowHooks().onSelect === 'function') {
      this.onSelect = readWindowHooks().onSelect || null;
    }

    if (typeof options.onUnselect === 'function') {
      this.onUnselect = options.onUnselect;
    } else if (typeof readWindowHooks().onUnselect === 'function') {
      this.onUnselect = readWindowHooks().onUnselect || null;
    }

    if (options.like !== undefined) {
      if (options.like) {
        this.container.setAttribute('data-like-enabled', 'true');
      } else {
        this.container.removeAttribute('data-like-enabled');
      }
    }

    if (typeof options.onLike === 'function') {
      this.onLike = options.onLike;
    } else if (typeof readWindowHooks().onLike === 'function') {
      this.onLike = readWindowHooks().onLike || null;
    }

    if (options.likePosition) {
      this.container.setAttribute('data-like-position', options.likePosition);
    }

    if (options.comments !== undefined) {
      if (options.comments) {
        this.container.setAttribute('data-comments-enabled', 'true');
      } else {
        this.container.removeAttribute('data-comments-enabled');
      }
    }

    if (typeof options.onComments === 'function') {
      this.onComments = options.onComments;
    } else if (typeof readWindowHooks().onComments === 'function') {
      this.onComments = readWindowHooks().onComments || null;
    }
  }

  // ===== TAGS =====
  addTags(): void {
    const galleryImages = this.container.querySelectorAll('.rmg-grid > img');

    galleryImages.forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.hasAttribute('data-tags-added')) return;

      const tagAttr = img.getAttribute('tags');
      if (!tagAttr) return;

      const tags = tagAttr.split(';')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (tags.length === 0) return;

      let wrapper = img.parentElement;
      if (!wrapper || !wrapper.classList.contains('rmg-image-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'rmg-image-wrapper';
        img.parentNode!.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }

      let tagsContainer = wrapper.querySelector('.rmg-all-tags');
      if (!tagsContainer) {
        tagsContainer = document.createElement('div');
        tagsContainer.className = 'rmg-all-tags';
        wrapper.appendChild(tagsContainer);
      }

      tags.forEach((tagText) => {
        const tag = document.createElement('span');
        tag.className = 'rmg-tag';
        tag.textContent = tagText;
        tagsContainer!.appendChild(tag);
      });

      img.setAttribute('data-tags-added', 'true');
    });
  }

  setupObservers(): void {
    const observer = new MutationObserver((mutations) => {
      let shouldAddTags = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldAddTags = true;
          break;
        }
      }
      if (shouldAddTags) {
        window.setTimeout(() => this.addTags(), 100);
      }
    });

    const galleryBox = this.container.querySelector('.rmg-grid');
    if (galleryBox) {
      observer.observe(galleryBox, { childList: true, subtree: true });
    }
  }

  // ===== MULTI-SELECT =====
  createMultiSelectBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'rmg-multiselect-bar';
    bar.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      background-color: rgba(30, 41, 59, 0.95);
      color: white; padding: 12px 20px;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 500; box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
      font-family: Inter, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      pointer-events: auto;
    `;

    bar.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span class="rmg-selection-count" style="font-size: 14px; font-weight: 500;">0 image${this.selectedIds.length !== 1 ? 's' : ''} selected</span>
        <span class="rmg-selection-limit" style="font-size: 12px; opacity: 0.8;"></span>
      </div>
      <div>
        <button class="rmg-clear-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">Clear</button>
      </div>
    `;

    this.container.appendChild(bar);

    const clearBtn = bar.querySelector('.rmg-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.unselectAll());
    }

    return bar;
  }

  updateUI(): void {
    const isEnabled = this.container.hasAttribute('data-multiselect-enabled');

    if (!isEnabled) {
      if (this.multiSelectBar) {
        this.multiSelectBar.remove();
        this.multiSelectBar = null;
      }
      this.updateCircleMarkers();
      this.updateLikeMarkers();
      this.updateCommentMarkers();
      return;
    }

    if (!this.multiSelectBar) {
      this.multiSelectBar = this.createMultiSelectBar();
    }

    const countSpan = this.multiSelectBar.querySelector('.rmg-selection-count');
    const limitSpan = this.multiSelectBar.querySelector('.rmg-selection-limit');

    const maxAttr = this.container.getAttribute('data-max-selectable');
    let maxSelectable: number | null = null;
    if (maxAttr) {
      maxSelectable = parseInt(maxAttr, 10);
      if (isNaN(maxSelectable)) maxSelectable = null;
    }

    let countText = `${this.selectedIds.length} image${this.selectedIds.length !== 1 ? 's' : ''} selected`;
    if (maxSelectable !== null) {
      countText = `${this.selectedIds.length}/${maxSelectable} images selected`;

      if (limitSpan) {
        limitSpan.textContent = `Maximum ${maxSelectable} image${maxSelectable !== 1 ? 's' : ''} allowed`;

        if (this.selectedIds.length >= maxSelectable) {
          (limitSpan as HTMLElement).style.color = '#f87171';
          (limitSpan as HTMLElement).style.fontWeight = '600';
        } else {
          (limitSpan as HTMLElement).style.color = '';
          (limitSpan as HTMLElement).style.fontWeight = '';
        }
      }
    } else if (limitSpan) {
      limitSpan.textContent = '';
    }

    if (countSpan) countSpan.textContent = countText;
    if (this.multiSelectBar) {
      const hasSelection = this.selectedIds.length > 0;
      this.multiSelectBar.style.opacity = hasSelection ? '1' : '0';
      this.multiSelectBar.style.pointerEvents = hasSelection ? 'auto' : 'none';
    }

    this.updateCircleMarkers();
    this.updateLikeMarkers();
    this.updateCommentMarkers();
  }

  getSelectionMarkerText(imgElement: HTMLImageElement): string {
    if (!imgElement.classList.contains('rmg-selected')) return '';
    if (!this.container.hasAttribute('data-show-order-numbers')) return '\u2713';
    const index = this.selectedIds.indexOf(imgElement.getAttribute('data-id') || '');
    return index >= 0 ? String(index + 1) : '\u2713';
  }

  createCircleMarker(imgElement: HTMLImageElement): HTMLDivElement {
    const marker = document.createElement('div');
    marker.className = 'rmg-circle-marker';
    marker.setAttribute('data-image-id', imgElement.getAttribute('data-id') || '');

    if (imgElement.classList.contains('rmg-selected')) {
      marker.textContent = this.getSelectionMarkerText(imgElement);
      marker.classList.add('selected');
    } else {
      marker.textContent = '';
    }

    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      this.handleImageClick(imgElement, event);
    });

    return marker;
  }

  updateCircleMarkers(): void {
    const isEnabled = this.container.hasAttribute('data-multiselect-enabled');

    this.images.forEach((img) => {
      let wrapper = img.parentElement;

      if (isEnabled) {
        if (!wrapper || !wrapper.classList.contains('rmg-image-wrapper')) {
          wrapper = document.createElement('div');
          wrapper.className = 'rmg-image-wrapper';
          img.parentNode!.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }

        let marker = wrapper.querySelector('.rmg-circle-marker');
        if (!marker) {
          marker = this.createCircleMarker(img);
          wrapper.appendChild(marker);
        } else {
          if (img.classList.contains('rmg-selected')) {
            marker.classList.add('selected');
            marker.textContent = this.getSelectionMarkerText(img);
          } else {
            marker.classList.remove('selected');
            marker.textContent = '';
          }
        }
      } else {
        if (wrapper) {
          const marker = wrapper.querySelector('.rmg-circle-marker');
          if (marker) marker.remove();

          if (wrapper.classList.contains('rmg-image-wrapper') && wrapper.children.length === 1) {
            const imgEl = asImage(wrapper.querySelector('img'));
            if (imgEl) {
              wrapper.parentNode!.insertBefore(imgEl, wrapper);
            }
            wrapper.remove();
          }
        }
      }
    });
  }

  // ===== LIKE (HEART) =====
  seedLikedState(): void {
    this.images.forEach((img) => {
      const imageId = img.getAttribute('data-id');
      if (!imageId) return;
      if (img.getAttribute('data-liked') === 'true' && !this.likedIds.includes(imageId)) {
        img.classList.add('rmg-liked');
        this.likedIds.push(imageId);
      }
    });
  }

  refreshLikeMarker(marker: HTMLElement, imgElement: HTMLImageElement): void {
    const liked = imgElement.classList.contains('rmg-liked');
    marker.classList.toggle('liked', liked);
    marker.textContent = liked ? '\u2764\uFE0F' : '\u{1F90D}';
  }

  createLikeMarker(imgElement: HTMLImageElement): HTMLDivElement {
    const marker = document.createElement('div');
    marker.className = 'rmg-like-marker';
    marker.setAttribute('data-image-id', imgElement.getAttribute('data-id') || '');
    this.refreshLikeMarker(marker, imgElement);

    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      this.handleLikeClick(imgElement);
    });

    return marker;
  }

  updateLikeMarkers(): void {
    const isEnabled = this.container.hasAttribute('data-like-enabled');

    this.images.forEach((img) => {
      let wrapper = img.parentElement;

      if (isEnabled) {
        if (!wrapper || !wrapper.classList.contains('rmg-image-wrapper')) {
          wrapper = document.createElement('div');
          wrapper.className = 'rmg-image-wrapper';
          img.parentNode!.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }

        let marker = wrapper.querySelector('.rmg-like-marker');
        if (!marker) {
          wrapper.appendChild(this.createLikeMarker(img));
        } else {
          this.refreshLikeMarker(marker as HTMLElement, img);
        }
      } else {
        if (wrapper) {
          const marker = wrapper.querySelector('.rmg-like-marker');
          if (marker) marker.remove();

          if (wrapper.classList.contains('rmg-image-wrapper') && wrapper.children.length === 1) {
            const imgEl = asImage(wrapper.querySelector('img'));
            if (imgEl) {
              wrapper.parentNode!.insertBefore(imgEl, wrapper);
            }
            wrapper.remove();
          }
        }
      }
    });
  }

  handleLikeClick(imgElement: HTMLImageElement): void {
    const imageId = imgElement.getAttribute('data-id');
    if (!imageId) {
      showMessage('Image is missing required "data-id" attribute for like.', 'error');
      return;
    }

    const liked = !imgElement.classList.contains('rmg-liked');
    if (liked) {
      imgElement.classList.add('rmg-liked');
      if (!this.likedIds.includes(imageId)) {
        this.likedIds.push(imageId);
      }
    } else {
      imgElement.classList.remove('rmg-liked');
      this.likedIds = this.likedIds.filter((id) => id !== imageId);
    }

    this.updateLikeMarkers();

    if (typeof this.onLike === 'function') {
      this.onLike(imageId, liked);
    }
  }

  setLiked(photoId: string, liked: boolean): void {
    const img = this.images.find((i) => i.getAttribute('data-id') === photoId);
    if (!img) return;

    if (liked) {
      img.classList.add('rmg-liked');
      if (!this.likedIds.includes(photoId)) {
        this.likedIds.push(photoId);
      }
    } else {
      img.classList.remove('rmg-liked');
      this.likedIds = this.likedIds.filter((id) => id !== photoId);
    }

    this.updateLikeMarkers();
  }

  // ===== COMMENT MARKER =====
  createCommentMarker(imgElement: HTMLImageElement): HTMLDivElement {
    const marker = document.createElement('div');
    marker.className = 'rmg-comment-marker';
    marker.setAttribute('data-image-id', imgElement.getAttribute('data-id') || '');
    marker.textContent = '\u{1F5E8}';

    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      this.handleCommentClick(imgElement);
    });

    return marker;
  }

  handleCommentClick(imgElement: HTMLImageElement): void {
    const imageId = imgElement.getAttribute('data-id');
    if (!imageId) {
      showMessage('Image is missing required "data-id" attribute for comments.', 'error');
      return;
    }

    if (typeof this.onComments === 'function') {
      this.onComments(imageId);
    }
  }

  updateCommentMarkers(): void {
    const isEnabled = this.container.hasAttribute('data-comments-enabled');

    this.images.forEach((img) => {
      let wrapper = img.parentElement;

      if (isEnabled) {
        if (!wrapper || !wrapper.classList.contains('rmg-image-wrapper')) {
          wrapper = document.createElement('div');
          wrapper.className = 'rmg-image-wrapper';
          img.parentNode!.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }

        let marker = wrapper.querySelector('.rmg-comment-marker');
        if (!marker) {
          wrapper.appendChild(this.createCommentMarker(img));
        }
      } else {
        if (wrapper) {
          const marker = wrapper.querySelector('.rmg-comment-marker');
          if (marker) marker.remove();

          if (wrapper.classList.contains('rmg-image-wrapper') && wrapper.children.length === 1) {
            const imgEl = asImage(wrapper.querySelector('img'));
            if (imgEl) {
              wrapper.parentNode!.insertBefore(imgEl, wrapper);
            }
            wrapper.remove();
          }
        }
      }
    });
  }

  handleImageClick(imgElement: HTMLImageElement, event: Event): boolean {
    const isEnabled = this.container.hasAttribute('data-multiselect-enabled');

    if (!isEnabled) {
      return false;
    }

    const target = event.target;
    const circle = target instanceof Element ? target.closest('.rmg-circle-marker') : null;
    const isCircleClick = circle !== null;

    if (!isCircleClick) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const imageId = imgElement.getAttribute('data-id');
    if (!imageId) {
      showMessage('Image is missing required "data-id" attribute for selection.', 'error');
      return true;
    }

    const isSelected = imgElement.classList.contains('rmg-selected');

    if (isSelected) {
      imgElement.classList.remove('rmg-selected');
      this.selectedIds = this.selectedIds.filter((id) => id !== imageId);
      this.notifyUnselect(imageId);
    } else {
      const maxAttr = this.container.getAttribute('data-max-selectable');
      if (maxAttr) {
        const maxSelectable = parseInt(maxAttr, 10);
        if (!isNaN(maxSelectable) && this.selectedIds.length >= maxSelectable) {
          showMessage(`Maximum ${maxSelectable} image${maxSelectable !== 1 ? 's' : ''} can be selected. Deselect some images first.`, 'error');
          return true;
        }
      }

      imgElement.classList.add('rmg-selected');
      if (!this.selectedIds.includes(imageId)) {
        this.selectedIds.push(imageId);
      }
      this.notifySelect(imageId);
    }

    this.updateUI();
    return true;
  }

  notifySelect(photoId: string): void {
    if (typeof this.onSelect === 'function') this.onSelect(photoId);
  }

  notifyUnselect(photoId: string): void {
    if (typeof this.onUnselect === 'function') this.onUnselect(photoId);
  }

  // Fire per-image callbacks for a change from one selection to another.
  notifySelectionDiff(previous: string[], next: string[]): void {
    next.forEach((id) => {
      if (!previous.includes(id)) this.notifySelect(id);
    });
    previous.forEach((id) => {
      if (!next.includes(id)) this.notifyUnselect(id);
    });
  }

  unselectAll(): void {
    const previous = this.selectedIds;
    this.selectedIds = [];
    this.container.querySelectorAll('img.rmg-selected').forEach((el) => {
      el.classList.remove('rmg-selected');
    });
    this.notifySelectionDiff(previous, this.selectedIds);
    this.updateUI();
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  selectAll(): void {
    const isEnabled = this.container.hasAttribute('data-multiselect-enabled');
    if (!isEnabled) return;

    const maxAttr = this.container.getAttribute('data-max-selectable');
    let maxSelectable: number | null = null;
    if (maxAttr) {
      maxSelectable = parseInt(maxAttr, 10);
      if (isNaN(maxSelectable)) maxSelectable = null;
    }

    const previous = this.selectedIds;
    this.selectedIds = [];

    this.container.querySelectorAll('img.rmg-selected').forEach((el) => {
      el.classList.remove('rmg-selected');
    });

    this.images.forEach((img, index) => {
      if (maxSelectable !== null && index >= maxSelectable) return;

      const imageId = img.getAttribute('data-id');
      if (imageId) {
        img.classList.add('rmg-selected');
        this.selectedIds.push(imageId);
      }
    });

    this.notifySelectionDiff(previous, this.selectedIds);
    this.updateUI();
  }

  toggleSelectionMode(): void {
    const isEnabled = this.container.hasAttribute('data-multiselect-enabled');

    if (isEnabled) {
      this.container.removeAttribute('data-multiselect-enabled');
      this.unselectAll();
      showMessage('Multi-select mode disabled. Click to zoom enabled.', 'info');
    } else {
      this.container.setAttribute('data-multiselect-enabled', 'true');
      this.updateUI();
      showMessage('Multi-select mode enabled. Click circle markers to select, click image to zoom.', 'info');
    }
  }

  // ===== FULLSCREEN GALLERY =====
  updateTitleDisplay(imgElement: HTMLImageElement): void {
    const imageTitle = imgElement.getAttribute('title');
    const linkTo = imgElement.getAttribute('linkTo');
    const linkText = imgElement.getAttribute('linkText');
    const titleContainer = document.getElementById('rmg-fullscreen-title-container');

    if (!titleContainer || !this.screenItem || !this.screenItem.contains(titleContainer)) {
      return;
    }

    titleContainer.textContent = '';

    const makeLink = (label: string): HTMLAnchorElement => {
      const link = document.createElement('a');
      link.textContent = label;
      link.setAttribute('href', linkTo || '');
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.style.color = 'white';
      link.style.textDecoration = 'underline';
      return link;
    };

    if (linkTo) {
      if (linkText) {
        if (imageTitle) {
          titleContainer.appendChild(document.createTextNode(imageTitle));
          titleContainer.appendChild(document.createTextNode('  '));
        }
        titleContainer.appendChild(makeLink(linkText));
      } else {
        titleContainer.appendChild(makeLink(imageTitle || '(open)'));
      }
      titleContainer.style.display = 'block';
    } else if (imageTitle) {
      titleContainer.appendChild(document.createTextNode(imageTitle));
      titleContainer.style.display = 'block';
    } else {
      titleContainer.style.display = 'none';
    }
  }

  openFullscreen(imgElement: HTMLImageElement): void {
    if (!this.container) return;

    this.currentImg = imgElement;

    this.screenItem = document.createElement('div');
    this.screenItem.id = 'rmg-screen';
    this.container.prepend(this.screenItem);

    const route = this.currentImg.src;
    document.body.style.overflow = 'hidden';

    this.screenItem.innerHTML = `
      <div class="rmg-image">
        <div class="rmg-title-container" id="rmg-fullscreen-title-container"></div>
      </div>
      <div class="rmg-close rmg-btn">&times;</div>
      <div class="rmg-next rmg-btn">&rarr;</div>
      <div class="rmg-prev rmg-btn">&larr;</div>
    `;

    const imgItem = this.screenItem.querySelector('.rmg-image') as HTMLElement;
    const viewerImg = document.createElement('img');
    viewerImg.src = route;
    imgItem.prepend(viewerImg);

    this.updateTitleDisplay(this.currentImg);

    const prevBtn = this.screenItem.querySelector('.rmg-prev') as HTMLElement;
    const nextBtn = this.screenItem.querySelector('.rmg-next') as HTMLElement;
    const close = this.screenItem.querySelector('.rmg-close') as HTMLElement;

    this.currentIndex = this.images.indexOf(this.currentImg);

    const prev = () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        const prevImg = this.images[this.currentIndex];
        viewerImg.src = prevImg.src;
        this.updateTitleDisplay(prevImg);
        prevBtn.hidden = this.currentIndex === 0;
        nextBtn.hidden = false;
      }
    };

    const next = () => {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
        const nextImg = this.images[this.currentIndex];
        viewerImg.src = nextImg.src;
        this.updateTitleDisplay(nextImg);
        nextBtn.hidden = this.currentIndex === this.images.length - 1;
        prevBtn.hidden = false;
      }
    };

    const hasMultiple = this.images.length > 1;
    prevBtn.hidden = !hasMultiple || this.currentIndex === 0;
    nextBtn.hidden = !hasMultiple || this.currentIndex === this.images.length - 1;

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeFullscreen();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    };

    document.addEventListener('keydown', this.keyHandler);

    const closeGallery = () => this.closeFullscreen();

    this.screenItem.addEventListener('click', (e) => {
      if (e.target === this.screenItem || e.target === close) closeGallery();
    });

    close.addEventListener('click', closeGallery);
  }

  closeFullscreen(): void {
    document.body.style.overflow = '';
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.screenItem) {
      this.screenItem.remove();
      this.screenItem = null;
    }
    this.currentImg = null;
  }

  // ===== EVENT HANDLERS =====
  attachEvents(): void {
    this.detachEvents();

    this.clickHandler = (event: Event) => {
      const imgElement = asImage(event.currentTarget as Element | null);
      if (!imgElement) return;
      const handledByMultiSelect = this.handleImageClick(imgElement, event);
      if (handledByMultiSelect) return;
      this.openFullscreen(imgElement);
    };

    this.images.forEach((img) => {
      img.addEventListener('click', this.clickHandler as EventListener);
    });
  }

  detachEvents(): void {
    if (this.clickHandler) {
      this.images.forEach((img) => {
        img.removeEventListener('click', this.clickHandler as EventListener);
      });
      this.clickHandler = null;
    }
  }

  reinitialize(): void {
    const previousSelection = this.selectedIds;
    this.selectedIds = [];

    const galleryBox = this.container.querySelector('.rmg-grid');
    if (galleryBox) {
      this.images = Array.from(galleryBox.querySelectorAll('img'));
    }

    this.container.querySelectorAll('img.rmg-selected').forEach((el) => {
      el.classList.remove('rmg-selected');
    });

    this.detachEvents();
    this.attachEvents();

    this.addTags();
    this.seedLikedState();
    this.notifySelectionDiff(previousSelection, this.selectedIds);
    this.updateUI();
  }
}

// ===== PUBLIC API =====
export const GridGallery: GridGalleryApi = {
  version: VERSION,
  create(containerOrSelector: HTMLElement | string, options: GridGalleryOptions = {}): GridGalleryInstance | null {
    let container: HTMLElement | null;
    if (typeof containerOrSelector === 'string') {
      container = document.querySelector(containerOrSelector);
      if (!container) {
        console.error(`GridGallery: Container "${containerOrSelector}" not found`);
        return null;
      }
    } else {
      container = containerOrSelector;
    }

    if (container._gallery) {
      return container._gallery;
    }

    return new GridGalleryInstance(container, options);
  },

  get(containerOrSelector: HTMLElement | string): GridGalleryInstance | null {
    let container: HTMLElement | null;
    if (typeof containerOrSelector === 'string') {
      container = document.querySelector(containerOrSelector);
    } else {
      container = containerOrSelector;
    }

    return container ? container._gallery || null : null;
  },

  initAll(options: GridGalleryOptions = {}): GridGalleryInstance[] {
    const containers = document.querySelectorAll('.rmg-gallery');
    const galleries: GridGalleryInstance[] = [];

    containers.forEach((container) => {
      if (!(container instanceof HTMLElement)) return;

      if (container._gallery) {
        galleries.push(container._gallery);
        return;
      }

      const galleryOptions: GridGalleryOptions = { ...options };

      if (container.hasAttribute('data-multiselect-enabled')) {
        galleryOptions.multiSelect = true;
      }
      if (container.hasAttribute('data-max-selectable')) {
        galleryOptions.maxSelectable = parseInt(container.getAttribute('data-max-selectable') || '', 10);
      }
      if (container.hasAttribute('data-like-enabled')) {
        galleryOptions.like = true;
      }
      if (container.hasAttribute('data-comments-enabled')) {
        galleryOptions.comments = true;
      }
      if (container.hasAttribute('data-like-position')) {
        galleryOptions.likePosition = container.getAttribute('data-like-position') || undefined;
      }
      if (container.hasAttribute('data-columns')) {
        const parsed = parseInt(container.getAttribute('data-columns') || '', 10);
        if (!isNaN(parsed)) galleryOptions.columns = parsed;
      }

      const gallery = new GridGalleryInstance(container, galleryOptions);
      galleries.push(gallery);
    });

    return galleries;
  }
};

window.GridGallery = GridGallery;

// ===== AUTO-INITIALIZATION =====
function autoInit(): void {
  window.GridGallery.initAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

// Handle dynamically added galleries
const bodyObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (isElement(node) && node.matches && node.matches('.rmg-gallery')) {
        const galleryContainer = node as HTMLElement;
        if (!galleryContainer._gallery) {
          const options: GridGalleryOptions = {};
          if (galleryContainer.hasAttribute('data-multiselect-enabled')) options.multiSelect = true;
          if (galleryContainer.hasAttribute('data-max-selectable')) options.maxSelectable = parseInt(galleryContainer.getAttribute('data-max-selectable') || '', 10);
          if (galleryContainer.hasAttribute('data-like-enabled')) options.like = true;
          if (galleryContainer.hasAttribute('data-comments-enabled')) options.comments = true;
          if (galleryContainer.hasAttribute('data-like-position')) options.likePosition = galleryContainer.getAttribute('data-like-position') || undefined;
          if (galleryContainer.hasAttribute('data-columns')) {
            const parsed = parseInt(galleryContainer.getAttribute('data-columns') || '', 10);
            if (!isNaN(parsed)) options.columns = parsed;
          }

          new GridGalleryInstance(galleryContainer, options);
        }
      }
    });
  });
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

