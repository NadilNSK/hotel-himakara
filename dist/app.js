(() => {
  'use strict';

  function initialize() {
    const hotel = window.HOTEL_DATA;
    if (!hotel) return;
    document.documentElement.classList.remove('no-js');

    const selectAll = (selector) => [...document.querySelectorAll(selector)];
    const setText = (selector, value) => {
      if (value === undefined || value === null) return;
      selectAll(selector).forEach((element) => { element.textContent = String(value); });
    };

    selectAll('[data-phone]').forEach((link) => { link.href = hotel.phoneHref; });
    selectAll('[data-directions]').forEach((link) => {
      link.href = hotel.mapsUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
    setText('[data-phone-label]', hotel.phone);
    setText('[data-hotel-name]', hotel.name);
    setText('[data-address]', hotel.address);
    setText('[data-location]', hotel.location);
    setText('[data-plus-code]', hotel.plusCode);
    setText('[data-rating]', hotel.rating);
    setText('[data-reviews]', hotel.reviewCount);
    setText('[data-classification]', hotel.classification);
    setText('[data-year]', new Date().getFullYear());
    setText('#footer-year', new Date().getFullYear());

    const photos = Array.isArray(hotel.photos) ? hotel.photos : [];
    const photoById = new Map(photos.map((photo) => [photo.id, photo]));

    selectAll('img[data-photo]').forEach((image) => {
      const role = image.dataset.photo;
      const photo = photoById.get(hotel.featured?.[role]);
      if (!photo) return;
      image.src = photo.src;
      if (photo.smallSrc) {
        image.srcset = `${photo.smallSrc} ${photo.smallWidth}w, ${photo.src} ${photo.width}w`;
        image.sizes = role === 'hero' ? '100vw' : '(max-width: 600px) 86vw, (max-width: 800px) 50vw, 600px';
      }
      image.alt = photo.alt;
      image.width = photo.width;
      image.height = photo.height;
      image.decoding = 'async';
      image.loading = role === 'hero' ? 'eager' : 'lazy';
      if (role === 'hero') image.fetchPriority = 'high';
      if (photo.position && role !== 'hero') image.style.objectPosition = photo.position;
    });
    selectAll('[data-caption]').forEach((caption) => {
      const photo = photoById.get(hotel.featured?.[caption.dataset.caption]);
      if (photo) caption.textContent = photo.caption;
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const navigation = document.getElementById('main-nav');
    if (menuToggle && navigation) {
      const closeMenu = (returnFocus = false) => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
        navigation.dataset.open = 'false';
        document.body.classList.remove('menu-open');
        if (returnFocus) menuToggle.focus();
      };
      closeMenu();
      menuToggle.addEventListener('click', () => {
        const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(opening));
        menuToggle.setAttribute('aria-label', opening ? 'Close navigation menu' : 'Open navigation menu');
        navigation.dataset.open = String(opening);
        document.body.classList.toggle('menu-open', opening);
      });
      navigation.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeMenu();
      });
      document.addEventListener('click', (event) => {
        if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
          closeMenu(true);
        }
      });
      window.addEventListener('resize', () => {
        if (getComputedStyle(menuToggle).display === 'none') closeMenu();
      }, { passive: true });
    }

    const filters = document.getElementById('gallery-filters');
    const grid = document.getElementById('gallery-grid');
    const count = document.getElementById('gallery-count');
    const moreButton = document.getElementById('gallery-more');
    const dialog = document.getElementById('photo-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerCaption = document.getElementById('viewer-caption');
    const viewerCounter = document.getElementById('viewer-counter');
    if (!filters || !grid) return;

    const categories = [
      { id: 'all', label: 'All' },
      { id: 'rooms', label: 'Rooms' },
      { id: 'exterior', label: 'Exterior' },
      { id: 'food', label: 'Food & Drinks' },
      { id: 'pool', label: 'Pool' },
    ].filter((category) => category.id === 'all' || photos.some((photo) => photo.category === category.id));
    let activeCategory = 'all';
    let expanded = false;
    let viewerPhotos = [];
    let viewerIndex = 0;
    let previousFocus = null;
    let previousOverflow = '';
    let touchStart = null;
    const pageSize = 8;
    const filteredPhotos = () => activeCategory === 'all'
      ? photos
      : photos.filter((photo) => photo.category === activeCategory);

    function updateViewer() {
      const photo = viewerPhotos[viewerIndex];
      if (!photo || !viewerImage) return;
      viewerImage.src = photo.src;
      viewerImage.alt = photo.alt;
      viewerImage.width = photo.width;
      viewerImage.height = photo.height;
      if (viewerCaption) viewerCaption.textContent = photo.caption;
      if (viewerCounter) viewerCounter.textContent = `${viewerIndex + 1} / ${viewerPhotos.length}`;
      dialog.querySelectorAll('[data-viewer-prev], [data-viewer-next]').forEach((button) => {
        button.disabled = viewerPhotos.length < 2;
      });
    }

    function openViewer(photo, trigger) {
      if (!dialog || !viewerImage || typeof dialog.showModal !== 'function') return;
      viewerPhotos = filteredPhotos();
      viewerIndex = viewerPhotos.findIndex((item) => item.id === photo.id);
      if (viewerIndex < 0) {
        viewerPhotos = photos;
        viewerIndex = viewerPhotos.findIndex((item) => item.id === photo.id);
      }
      if (viewerIndex < 0) return;
      previousFocus = trigger || document.activeElement;
      previousOverflow = document.body.style.overflow;
      updateViewer();
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      dialog.querySelector('[data-viewer-close]')?.focus();
    }

    function moveViewer(direction) {
      if (viewerPhotos.length < 2) return;
      viewerIndex = (viewerIndex + direction + viewerPhotos.length) % viewerPhotos.length;
      updateViewer();
    }

    function makeTile(photo) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-item';
      button.dataset.photoId = photo.id;
      button.dataset.category = photo.category;
      button.setAttribute('aria-label', `View photo: ${photo.caption}`);
      button.setAttribute('aria-haspopup', 'dialog');

      const image = document.createElement('img');
      image.src = photo.src;
      if (photo.smallSrc) {
        image.srcset = `${photo.smallSrc} ${photo.smallWidth}w, ${photo.src} ${photo.width}w`;
        image.sizes = '(max-width: 600px) calc((100vw - 53px) / 2), (max-width: 800px) calc((100vw - 78px) / 3), 285px';
      }
      image.alt = photo.alt;
      image.width = photo.width;
      image.height = photo.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      if (photo.position) image.style.objectPosition = photo.position;

      const caption = document.createElement('span');
      caption.className = 'gallery-caption';
      const label = document.createElement('span');
      label.textContent = photo.caption;
      const arrow = document.createElement('span');
      arrow.className = 'gallery-arrow';
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      caption.append(label, arrow);
      button.append(image, caption);
      button.addEventListener('click', () => openViewer(photo, button));
      return button;
    }

    function renderGallery() {
      const matches = filteredPhotos();
      const visible = expanded ? matches : matches.slice(0, pageSize);
      grid.replaceChildren(...visible.map(makeTile));
      filters.querySelectorAll('button').forEach((button) => {
        const active = button.dataset.filter === activeCategory;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (count) {
        const category = categories.find((item) => item.id === activeCategory)?.label;
        count.textContent = `${visible.length} of ${matches.length} photos${activeCategory === 'all' ? '' : ` · ${category}`}`;
      }
      if (moreButton) {
        moreButton.hidden = visible.length >= matches.length;
        moreButton.textContent = `View all ${matches.length} photos`;
      }
    }

    filters.replaceChildren(...categories.map((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-button';
      button.dataset.filter = category.id;
      button.textContent = category.label;
      button.setAttribute('aria-controls', 'gallery-grid');
      button.addEventListener('click', () => {
        activeCategory = category.id;
        expanded = false;
        renderGallery();
      });
      return button;
    }));
    moreButton?.addEventListener('click', () => {
      const firstNewIndex = grid.children.length;
      expanded = true;
      renderGallery();
      grid.children[firstNewIndex]?.focus({ preventScroll: true });
      grid.children[firstNewIndex]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
    selectAll('[data-gallery-category]').forEach((link) => {
      link.addEventListener('click', () => {
        const category = link.dataset.galleryCategory;
        if (!categories.some((item) => item.id === category)) return;
        activeCategory = category;
        expanded = false;
        renderGallery();
        // Keep the anchor's native hash navigation and reduced-motion behavior.
      });
    });
    renderGallery();

    selectAll('[data-open-photo]').forEach((trigger) => {
      const photoId = hotel.featured?.[trigger.dataset.openPhoto] || trigger.dataset.openPhoto;
      const photo = photoById.get(photoId);
      if (photo) trigger.addEventListener('click', () => openViewer(photo, trigger));
    });

    if (dialog) {
      dialog.querySelectorAll('[data-viewer-close]').forEach((button) => {
        button.addEventListener('click', () => dialog.close());
      });
      dialog.querySelector('[data-viewer-prev]')?.addEventListener('click', () => moveViewer(-1));
      dialog.querySelector('[data-viewer-next]')?.addEventListener('click', () => moveViewer(1));
      dialog.addEventListener('close', () => {
        document.body.style.overflow = previousOverflow;
        touchStart = null;
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      });
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          moveViewer(event.key === 'ArrowLeft' ? -1 : 1);
        }
        if (event.key === 'Tab') {
          const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]
            .filter((element) => element.getClientRects().length);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      });
      const swipeArea = viewerImage?.closest('figure') || viewerImage || dialog;
      swipeArea.addEventListener('touchstart', (event) => {
        touchStart = event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
      }, { passive: true });
      swipeArea.addEventListener('touchend', (event) => {
        if (!touchStart || !event.changedTouches.length) return;
        const deltaX = event.changedTouches[0].clientX - touchStart.x;
        const deltaY = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(deltaX) >= 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          moveViewer(deltaX < 0 ? 1 : -1);
        }
      }, { passive: true });
      swipeArea.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
