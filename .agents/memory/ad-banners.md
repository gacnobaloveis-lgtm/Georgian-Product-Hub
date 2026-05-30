---
name: Ad banners
description: How the homepage "your ad here" banners work and how to change them
---

# Ad banners (spiningebi.ge)

The rotating ad banners ("შენი რეკლამა აქ") are **images** served from `/uploads/<uuid>.webp` (in repo `public/uploads/`). The text is **baked into the image pixels**, not rendered as HTML — so changing the wording means pixel-editing the webp (inpaint + re-composite), not editing a string.

The list of which banners show lives in the **Railway DB**, table `site_settings`, key `ad_banners`, as JSON: `[{"imageUrl":"/uploads/<uuid>.webp"}, ...]`. `GET /api/ads` returns this directly (no rebuild needed for DB changes; image file changes need a Railway rebuild).

**Why:** A typo fix request looked like a code/string change but was actually image-baked text.

**How to apply:**
- To add/remove/reorder banners or swap which image shows: just update the `ad_banners` JSON in the DB (immediate).
- To change a banner's wording: upload a corrected webp under a **new** filename (avoids browser/Cloudflare/SW cache), wait for Railway rebuild, then point the DB entry to the new URL.
- Heavy Georgian display text ≈ Noto Georgian variable font, `set_variation_by_name("Black")` (axis order is [Weight, Width] — passing weight second renders thin). cv2 inpaint with a color-threshold mask misses anti-aliased edges; a solid rectangular mask removes baked text reliably when the background is smooth sky.
