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
- Availability check at order creation must ALSO cover the color-less else-branch (`prod.stock < qty`), or out-of-stock items can be ordered.
- Card flow decrements only at settlement, never at checkout, so abandoned unpaid orders don't eat inventory.

**Deduct exactly once via `orders.stock_deducted` flag (do NOT decrement inline):** all realization paths now funnel through `applyStockDeduction(order, source)` in routes.ts, which atomically claims `markStockDeductedIfNot` (stock_deducted false→true RETURNING) then increments soldCount + decrements stock. Three trigger points: `settlePaidOrder` (Flitt confirm), `/api/orders/credit` (immediate), and admin `PATCH /api/admin/orders/:id/status` when status→shipped/completed.
**Why the admin-ship trigger was added:** in practice Flitt callbacks rarely fire — prod had ZERO `pending` orders (only awaiting_payment + shipped), so card sales sat unpaid and the admin manually shipped them, and stock NEVER decremented (the "stock doesn't go down" bug). Manual ship is the real sale-realization event here.
**Deliberate:** no auto-restore of stock on un-ship (shipped→pending); the flag stays true so repeated ship toggles deduct at most once, and genuinely paid orders aren't wrongly re-stocked. Existing rows default false (no historical backfill — soldCount is partly manual/inflated, bulk reconcile is risky).
