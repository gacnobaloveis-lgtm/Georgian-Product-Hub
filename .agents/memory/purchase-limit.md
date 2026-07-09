---
name: Per-product purchase limit
description: Business rules for the per-customer purchase limit feature (identity matching, 20-min unpaid window, atomicity).
---

Rule: a product's optional `purchaseLimit` caps cumulative units per customer; identity = userId OR full last-9-digit normalized phone (shorter phone tails fall back to account-only matching).
**Why:** re-registering with the same phone must not bypass the cap; partial phone matches caused false positives, so only exact 9-digit Georgian tails count.

Rule: cancelled orders never count; `awaiting_payment` card orders count only for 20 MINUTES.
**Why:** an abandoned card checkout blocked the returning buyer ("limit exhausted" though they never paid) — owner explicitly wants only completed purchases to consume the limit. Parallel unpaid checkouts still can't bypass it inside the window.
**Guards that keep the short window safe (change them in lockstep):** Flitt checkout `lifetime: 900` (link dies at 15 min); `/api/flitt/pay` cancels + refuses re-payment of limited-product orders older than 20 min; settlement WARN-logs any settle of an order older than 25 min.

Rule: enforcement must be atomic — order creation under a limit goes through a transaction with pg advisory locks keyed on (product, account) and (product, phone), never a separate check-then-insert.
**Why:** architect review found parallel requests could both pass a plain pre-check and overshoot the cap. For credit orders, a lost race refunds the deducted credit.

**How to apply:** any new order-creation path (new payment method, admin manual order) must reuse the same atomic limit-checked creation, not a plain insert.
