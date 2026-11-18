import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Window } from 'happy-dom';

// These are DOM integration checks, not browser rendering or device tests.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const [html, css, dataSource, appSource] = await Promise.all(
  ['index.html', 'styles.css', 'hotel-data.js', 'app.js'].map((name) => readFile(path.join(dist, name), 'utf8')),
);
const errors = [];
const window = new Window({
  url: 'http://localhost:4173/',
  width: 390,
  height: 844,
  settings: {
    enableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
    enableCSSFileLoading: false,
    enableImageFileLoading: false,
    handleDisabledFileLoadingAsSuccess: true,
    suppressInsecureJavaScriptEnvironmentWarning: true,
    navigation: { disableMainFrameNavigation: true, disableChildPageNavigation: true },
  },
});
window.addEventListener('error', (event) => errors.push(event.message));
const document = window.document;
const query = (selector) => {
  const element = document.querySelector(selector);
  assert.ok(element, `Missing element: ${selector}`);
  return element;
};
const all = (selector) => [...document.querySelectorAll(selector)];
let passed = 0;
const report = (message) => { passed++; console.log(`PASS ${message}`); };
const keyboard = (target, key, extra = {}) => {
  target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
};
const assertResponsiveImage = (image, photo, label) => {
  if (!photo.smallSrc) return;
  const candidates = image.getAttribute('srcset')?.split(',').map((candidate) => {
    const match = candidate.trim().match(/^(\S+)\s+([1-9]\d*)w$/);
    assert.ok(match, `${label}: invalid srcset width descriptor`);
    return { src: match[1], width: Number(match[2]) };
  });
  assert.ok(candidates?.length >= 2, `${label}: missing responsive image candidates`);
  assert.equal(new Set(candidates.map((candidate) => candidate.width)).size, candidates.length,
    `${label}: duplicate candidate widths`);
  assert.deepEqual(candidates, [
    { src: photo.smallSrc, width: photo.smallWidth },
    { src: photo.src, width: photo.width },
  ], `${label}: srcset does not match the photo catalog`);
  assert.ok(image.getAttribute('sizes'), `${label}: missing responsive sizes`);
};

try {
  document.write(html);
  document.close();
  await window.happyDOM.waitUntilComplete();
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  // Static fallback is useful before the interactive scripts load.
  assert.equal(document.documentElement.classList.contains('no-js'), true);
  for (const image of all('img[data-photo]')) {
    assert.ok(image.getAttribute('src'), `No-JS photo source missing: ${image.dataset.photo}`);
    assert.ok(image.alt.length > 12);
  }
  for (const anchor of all('a[data-phone]')) assert.equal(anchor.getAttribute('href'), 'tel:+94702313213');
  assert.ok(query('noscript').textContent.includes('gallery'));
  const staticFeaturedImages = all('img[data-photo]').map((image) => image.cloneNode());
  report('static fallback has working phone links, featured image sources, and gallery guidance');

  window.eval(dataSource);
  window.eval(appSource);
  // Normalize data out of the browser realm so strict comparisons test values,
  // rather than failing because Happy DOM arrays have a different prototype.
  const hotel = JSON.parse(JSON.stringify(window.HOTEL_DATA));
  assert.equal(document.documentElement.classList.contains('no-js'), false);
  assert.equal(hotel.photos.length, 30);
  assert.equal(new Set(hotel.photos.map((photo) => photo.id)).size, hotel.photos.length);
  assert.equal(new Set(hotel.photos.map((photo) => photo.src)).size, hotel.photos.length);

  for (const photo of hotel.photos) {
    assert.ok(photo.alt.length > 12 && photo.caption.length > 3, `Photo metadata: ${photo.id}`);
    assert.ok(photo.width > 0 && photo.height > 0);
    await access(path.join(dist, photo.src));
    if (photo.smallSrc) {
      assert.ok(Number.isInteger(photo.smallWidth) && photo.smallWidth > 0 && photo.smallWidth < photo.width,
        `Responsive widths must be distinct and positive: ${photo.id}`);
      await access(path.join(dist, photo.smallSrc));
    }
  }
  for (const element of all('[src], link[href]')) {
    const resource = element.getAttribute('src') || element.getAttribute('href');
    if (!resource || /^(?:https?:|data:|#)/.test(resource)) continue;
    await access(path.join(dist, resource));
  }
  report('30 unique catalog photos and every local page asset exist with descriptive metadata');

  for (const image of staticFeaturedImages) {
    const photo = hotel.photos.find((item) => item.id === hotel.featured[image.dataset.photo]);
    assertResponsiveImage(image, photo, `Static ${image.dataset.photo}`);
  }

  for (const image of all('img[data-photo]')) {
    const expected = hotel.photos.find((photo) => photo.id === hotel.featured[image.dataset.photo]);
    assert.ok(expected, `Featured role: ${image.dataset.photo}`);
    assert.equal(image.getAttribute('src'), expected.src);
    assert.equal(image.alt, expected.alt);
    assert.equal(image.width, expected.width);
    assert.equal(image.height, expected.height);
    assert.equal(image.loading, image.dataset.photo === 'hero' ? 'eager' : 'lazy');
    assertResponsiveImage(image, expected, `Featured ${image.dataset.photo}`);
  }
  assert.equal(query('[data-photo="hero"]').style.objectPosition, '');
  assert.equal(query('#footer-year').textContent, String(new Date().getFullYear()));
  report('all 7 featured photo roles hydrate; hero crop stays in CSS and lower images lazy-load');
  report('responsive photo assets exist; static and hydrated featured srcsets have distinct positive widths');

  for (const link of all('[data-phone]')) assert.equal(link.getAttribute('href'), hotel.phoneHref);
  for (const label of all('[data-phone-label]')) assert.equal(label.textContent, hotel.phone);
  for (const link of all('[data-directions]')) {
    assert.equal(link.href, hotel.mapsUrl);
    const url = new URL(link.href);
    assert.equal(url.hostname, 'www.google.com');
    assert.equal(url.searchParams.get('destination'), 'Hotel Himakara G39G+FF Matugama');
    assert.equal(link.target, '_blank');
    assert.ok(link.rel.includes('noopener'));
  }
  for (const link of all('a[href^="#"]')) {
    if (link.hash.length > 1) assert.ok(document.getElementById(link.hash.slice(1)), `Broken hash: ${link.hash}`);
  }
  report('all phone, directions, and in-page navigation destinations are valid');

  const filterButtons = all('#gallery-filters button');
  assert.deepEqual(filterButtons.map((button) => button.dataset.filter), ['all', 'rooms', 'exterior', 'food', 'pool']);
  assert.equal(all('.gallery-item').length, 8);
  assert.equal(query('#gallery-more').hidden, false);
  query('#gallery-more').click();
  assert.equal(all('.gallery-item').length, 30);
  assert.equal(query('#gallery-more').hidden, true);
  assert.equal(document.activeElement, all('.gallery-item')[8]);
  const counts = {};
  for (const button of filterButtons) {
    const category = button.dataset.filter;
    button.click();
    const expected = hotel.photos.filter((photo) => category === 'all' || photo.category === category);
    counts[category] = expected.length;
    assert.equal(all('.gallery-item').length, Math.min(8, expected.length));
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(all('#gallery-filters [aria-pressed="true"]').length, 1);
    assert.equal(query('#gallery-more').hidden, expected.length <= 8);
    if (expected.length > 8) query('#gallery-more').click();
    assert.deepEqual(all('.gallery-item').map((tile) => tile.dataset.photoId), expected.map((photo) => photo.id));
    for (const image of all('.gallery-item img')) {
      assert.equal(image.loading, 'lazy');
      const photo = hotel.photos.find((item) => item.id === image.closest('.gallery-item').dataset.photoId);
      assertResponsiveImage(image, photo, `Gallery ${photo.id}`);
    }
  }
  assert.deepEqual(counts, { all: 30, rooms: 10, exterior: 6, food: 10, pool: 4 });
  report(`gallery filters and show-all: ${JSON.stringify(counts)}`);

  for (const link of all('[data-gallery-category]')) {
    link.click();
    assert.equal(query('#gallery-filters [aria-pressed="true"]').dataset.filter, link.dataset.galleryCategory);
    assert.equal(window.location.hash, '#gallery');
  }
  report('Dining and Pool section links select matching gallery categories and retain anchor navigation');

  query('[data-filter="rooms"]').click();
  const tile = query('.gallery-item');
  tile.focus();
  tile.click();
  const dialog = query('#photo-viewer');
  const image = query('#viewer-image');
  const close = query('[data-viewer-close]');
  assert.equal(dialog.open, true);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(document.activeElement, close);
  assert.equal(query('#viewer-counter').textContent, '1 / 10');
  const firstPhoto = image.src;
  query('[data-viewer-next]').click();
  assert.equal(query('#viewer-counter').textContent, '2 / 10');
  assert.notEqual(image.src, firstPhoto);
  keyboard(dialog, 'ArrowLeft');
  assert.equal(image.src, firstPhoto);
  query('[data-viewer-prev]').click();
  assert.equal(query('#viewer-counter').textContent, '10 / 10');
  keyboard(dialog, 'ArrowRight');
  assert.equal(query('#viewer-counter').textContent, '1 / 10');

  // Happy DOM has no visual layout: only supply non-empty rects to exercise our
  // explicit focus-loop handler. Native modal inertness remains a browser check.
  const controls = all('#photo-viewer button');
  controls.forEach((button) => { button.getClientRects = () => [{ width: 44, height: 44 }]; });
  controls[0].focus();
  keyboard(dialog, 'Tab', { shiftKey: true });
  assert.equal(document.activeElement, controls.at(-1));
  keyboard(dialog, 'Tab');
  assert.equal(document.activeElement, controls[0]);
  report('viewer next/previous, keyboard arrows, wraparound, and explicit focus loop (visibility stub) work');

  function swipe(start, end) {
    const startEvent = new window.Event('touchstart', { bubbles: true });
    Object.defineProperty(startEvent, 'touches', { value: [{ clientX: start[0], clientY: start[1] }] });
    image.dispatchEvent(startEvent);
    const endEvent = new window.Event('touchend', { bubbles: true });
    Object.defineProperty(endEvent, 'changedTouches', { value: [{ clientX: end[0], clientY: end[1] }] });
    image.dispatchEvent(endEvent);
  }
  swipe([200, 100], [100, 110]);
  assert.equal(query('#viewer-counter').textContent, '2 / 10');
  swipe([100, 100], [200, 110]);
  assert.equal(query('#viewer-counter').textContent, '1 / 10');
  swipe([200, 100], [190, 200]);
  assert.equal(query('#viewer-counter').textContent, '1 / 10');
  swipe([200, 100], [180, 100]);
  assert.equal(query('#viewer-counter').textContent, '1 / 10');
  close.click();
  assert.equal(dialog.open, false);
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.activeElement, tile);
  report('swipe handlers navigate horizontally, ignore vertical/short gestures; closing restores focus and scroll');

  const menu = query('.menu-toggle');
  const nav = query('#main-nav');
  menu.click();
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  assert.equal(nav.dataset.open, 'true');
  assert.equal(document.body.classList.contains('menu-open'), true);
  query('#main-nav a').click();
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  menu.click();
  keyboard(document, 'Escape');
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, menu);
  menu.click();
  query('main').click();
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  report('mobile menu toggle, navigation links, Escape, outside-click, and focus return work');

  assert.equal(document.title, 'Hotel Himakara | Stay in Matugama, Sri Lanka.');
  assert.ok(query('meta[name="description"]').content.includes('Yatadolawatta, Matugama'));
  assert.equal(query('[data-address]').textContent, 'Yatadolawatta, Matugama 12100, Sri Lanka');
  assert.equal(query('[data-plus-code]').textContent, 'G39G+FF Matugama');
  assert.equal(query('[data-classification]').textContent, '3-star hotel');
  assert.equal(query('[data-rating]').textContent, '3.9');
  assert.equal(query('[data-reviews]').textContent, '221');
  assert.deepEqual(all('.amenities li').map((element) => element.textContent.trim()),
    ['Wi-Fi', 'Free breakfast', 'Free parking', 'Pool', 'Kid-friendly', 'Restaurant']);
  assert.ok(document.body.textContent.includes('For room rates and availability,'));
  assert.equal(all('form').length, 0);
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.deepEqual(errors, []);
  report('confirmed hotel details, six amenities, metadata, phone-based enquiries, and accessibility CSS are present');
  console.log(`\n${passed} integration groups passed. No DOM runtime errors.`);
  console.log('Limits: simulated DOM only; no rendered layout, contrast measurement, image decoding, real touch device, or native dialog Escape/inertness verification.');
} finally {
  await window.happyDOM.close();
}
