---
name: Product image editor (ImageEditor.tsx)
description: The three background modes and why colorbg uses flood-fill, not AI cutout
---

# ImageEditor background modes

Three modes: **cutout** (AI `@imgly/background-removal`, client-side w/ server fallback), **colorbg** (replace white background with a solid color), **original** (untouched).

**Why colorbg exists:** the AI cutout "eats" parts of white/light products (alpha=0 pixels are unrecoverable — the balance slider only re-thresholds existing alpha, it cannot restore eaten pixels). For products shot on a clean white studio background, colorbg gives a colored background WITHOUT losing the product.

**How colorbg works:** border flood-fill on the ORIGINAL image (`removeBgByFlood`) — seeds from all border pixels, removes only background-connected pixels within a tolerance of the averaged-corner color, so interior product whites survive. Tunable via "ფონის მგრძნობელობა" threshold slider. Result is cached by `WxH:threshold` so changing color/opacity doesn't recompute the fill.

**How to apply:** if asked to improve cutout quality for white products, prefer colorbg/flood tuning over fighting the AI alpha. Flood-fill weakness: if the product touches an image edge or a corner sits on product/shadow, background estimate skews — raise/lower threshold or fall back to original mode.
