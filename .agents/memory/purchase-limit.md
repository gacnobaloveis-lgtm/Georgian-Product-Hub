---
name: Per-product purchase limit
description: Business rules for the per-customer purchase limit feature (identity matching, 48h window, atomicity).
---

Rule: a product's optional `purchaseLimit` caps cumulative units per customer; identity = userId OR full last-9-digit normalized phone (shorter phone tails fall back to account-only matching).
**Why:** re-registering with the same phone must not bypass the cap; partial phone matches caused false positives, so only exact 9-digit Georgian tails count.

Rule: cancelled orders never count; `awaiting_payment` card orders count only for 48h.
**Why:** abandoned unpaid checkouts must not consume the limit forever, but parallel unpaid checkouts must not bypass it.

Rule: enforcement must be atomic — order creation under a limit goes through a transaction with pg advisory locks keyed on (product, account) and (product, phone), never a separate check-then-insert.
**Why:** architect review found parallel requests could both pass a plain pre-check and overshoot the cap. For credit orders, a lost race refunds the deducted credit.

**How to apply:** any new order-creation path (new payment method, admin manual order) must reuse the same atomic limit-checked creation, not a plain insert.
