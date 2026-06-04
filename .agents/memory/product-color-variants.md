---
name: Product color/image variant mapping
description: How album images map to color variants on the product page, and why mapping is by index
---

# Color variant ↔ album image mapping

There is NO stored mapping between a product's album images and its color names. `albumImages` is a JSON string[] (upload order); `colorStock` is a JSON object `{colorName: stock}` whose key order = admin entry order. Admin enters colors and uploads images in two independent UI sections.

**Decision:** On the product page (`ProductDetail.tsx`), when `albumImages.length === colorNames.length`, treat it as "image = color" mode (`imageColorMode`): clicking album thumbnail `i` selects `colorNames[i]`. The separate color-dot selectors are hidden and replaced by a small stock-counter badge for the current variant.

**Why:** The shop owner uploads exactly one image per color and expects clicking the photo to pick that color (no second selector). Index/position is the only available signal.

**How to apply:** Use `effectiveColor = imageColorMode ? colorNames[selectedImage] : selectedColor` for ALL stock/cart/buy/dialog logic. The owner must upload images in the SAME order as colors are entered, or the pairing is wrong. If a more robust pairing is ever needed, add explicit image→color metadata in the admin product form instead of relying on count-equality.
