# Hotel Himakara

A complete responsive, static website for Hotel Himakara in Yatadolawatta, Matugama, Sri Lanka. Built with HTML, CSS, and JavaScript, with locally hosted photography and fonts. No runtime dependencies or build step.

## Preview

Run `npm.cmd run dev` in this directory on Windows (or `npm run dev` elsewhere), then open http://127.0.0.1:4173. The deployable website is the `dist` directory.

## Edit content

Edit `dist/hotel-data.js` to update phone numbers, directions, address, classification, guest rating, review count, featured image IDs, or gallery photos. Photo records include `id`, `src`, category, dimensions, alt text, caption, and crop position. Valid categories are `rooms`, `exterior`, `food`, and `pool`. The gallery only shows categories containing photos.

Featured image roles are `hero`, `stay`, `stayDetail`, `dining`, `diningDetail`, `pool`, and `location`. The mobile hero crop is controlled separately in `dist/styles.css` to keep the building visible.

The page's text and static no-JavaScript fallbacks are in `dist/index.html`; update its title/meta description and fallback content if hotel information changes. Layout and colors are in `dist/styles.css`. Interactive components are in `dist/app.js`.

## Supplied photos

The supplied ZIP contains 43 small Google Maps thumbnails. These were visually inspected, classified, and deduplicated into 30 photographs: 10 rooms, 6 exterior/grounds, 10 food/drinks, and 4 pool. Only supplied photos represent the property. Existing photo watermarks are preserved.

The ZIP's photos were small, cropped thumbnails. The website now uses higher-resolution copies of the **exact same Google photo IDs**, recovered from the original image source. The courtyard hero is now 1600 × 900 instead of 219 × 156; the primary room photo is 1024 × 768 instead of 397 × 298. All 30 photos have been upgraded, with 640-pixel responsive variants where the original is larger. The full-size viewer uses the large originals. No artificial property details, generative reconstruction, retouching, or watermark removal was used.

See `assets-review/high-resolution-report.json` for source URLs, dimensions, file hashes, and provenance, and `assets-review/high-resolution-contact-sheet.jpg` for the visual comparison. The initial ZIP inventory is retained in `assets-review/photo-catalog.json`. The original ZIP remains untouched.

## Functionality and accessibility

- Phone-based enquiries and Google Maps directions; no checkout or invented availability.
- Filterable gallery, show-all control, native modal viewer, previous/next, arrow keys, Escape, swipe navigation, and focus return.
- Mobile menu and fixed contact actions with footer clearance and safe-area support.
- Visible keyboard focus, semantic landmarks, image descriptions, reduced-motion support, and lazy-loaded photos below the hero.
- Rating is the supplied snapshot (3.9/5 from 221 reviews), distinct from the hotel's 3-star classification. It is not a live feed.
- Fonts are self-hosted Cormorant Garamond and DM Sans; licenses are included with the font assets.

## Validation

Run `npm.cmd run check` for JavaScript syntax checks and `npm.cmd test` for the DOM integration checks. The homepage serves HTTP 200. Automated checks cover gallery filtering, show-all, modal navigation, focus handling, swipe handlers, the mobile menu, assets, hotel facts, and contact links. These simulated DOM tests do not verify rendered layout or physical touch devices. Browser visual verification remains pending because the browser connection is unavailable and the native Chrome window is in use.

## Hosting

`.openai/hosting.json` identifies the private Site and its `dist` output. The Site source and assets are ready for static hosting. There are no API keys, external booking services, or backend requirements.
