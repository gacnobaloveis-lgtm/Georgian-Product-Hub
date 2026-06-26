---
name: Product stock model
description: products has TWO stock sources (stock int vs colorStock JSON); which one to decrement depends on whether the order has a selectedColor.
---

# Product stock: two separate sources

A product's displayed "მარაგი" (stock) comes from one of two places depending on whether it has color variants:

- **Color products** (colorStock JSON non-empty): displayed stock = SUM of colorStock values. Decrement via `decrementColorStock(productId, color, qty)`.
- **Color-less products**: displayed stock = the `products.stock` integer. Decrement via `decrementStock(productId, qty)`.

Frontend mirrors this: `totalStock = hasColors ? sum(colorStock) : product.stock`.

**Why:** Originally only `decrementColorStock` existed and it ran only `if (selectedColor)`, so color-less products' stock NEVER decreased on a sale (bug: "მარაგი 3 stays 3"). Fix added `decrementStock` and an else-branch.

**How to apply:** Any sale-realization path must branch on `selectedColor`:
- `if (selectedColor)` → decrementColorStock; `else` → decrementStock.
- Two realization paths exist: `settlePaidOrder` (card, gated by atomic `markOrderPaidIfAwaiting` — idempotent) and `/api/orders/credit` (immediate). Keep both in sync.
- Availability check at order creation must ALSO cover the color-less else-branch (`prod.stock < qty`), or out-of-stock items can be ordered.
- Card flow decrements only at settlement, never at checkout, so abandoned unpaid orders don't eat inventory.
