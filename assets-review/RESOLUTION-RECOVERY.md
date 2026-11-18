# Original-resolution photo recovery

The 30 unique supplied Google Maps photos were retrieved at higher resolution using the exact photo identifiers already present in the ZIP filenames. This is genuine source detail, not AI upscaling or generated reconstruction.

All 30 larger copies and 30 mobile copies were downloaded successfully. Each was visually checked on the contact sheet against the supplied image inventory. The full source photographs preserve content and watermarks that the small ZIP thumbnails sometimes cropped out.

- Full photos: `high-res-originals/`, 7,959,855 bytes in total.
- Mobile photos: `high-res-small/`, 2,288,235 bytes in total.
- Machine-readable provenance and dimensions: `high-resolution-report.json`.
- Reviewed contact sheet: `high-resolution-contact-sheet.jpg`.
- Reproducible downloader: `../scripts/recover-photo-originals.py`.

The courtyard hero improved from a 219 × 156 cropped thumbnail to its 1600 × 900 original frame. Most photos now have a longest dimension of 1600 pixels. The primary room is 1024 × 768 and the plated meal is 640 × 640, reflecting their available source resolution.

No pixels were retouched or generated, no watermark was removed, and the original supplied ZIP remains unchanged. The website now uses all 30 larger copies with updated intrinsic dimensions and 29 smaller responsive variants; the already-small 640-pixel meal image needs no separate variant. Featured images, the gallery, and the full-size viewer use these updated assets.
