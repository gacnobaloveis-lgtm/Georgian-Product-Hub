---
name: Referral credit / Flitt payment settlement
description: Why referral credit + sold-count must be gated on a CONFIRMED Flitt payment, and how the dual settlement path works
---

# Referral credit must settle only on confirmed payment

Card orders must NOT award referral credit or increment sold-count when the buyer
merely clicks "pay by card". Doing so credits referrers for abandoned/unpaid
checkouts (the original fraud).

**Rule:** A card order is created as status `awaiting_payment` (referral code stored
on the order, not yet acted on). The sale is counted and referral credit awarded
ONLY when the payment is independently confirmed real.

**Why:** Real money + a public referral-credit system means any "credit on click"
path is directly exploitable for free balance.

**How it works (dual settlement, both idempotent):**
- Primary: Flitt server callback (`/api/flitt/callback`) — signature-verified via
  `flittClient.isValidResponse`; on `order_status==="approved"` settles.
- Safety net: `/payment/success` page posts our `oid` to `/api/flitt/confirm`
  (auth + ownership checked), which asks Flitt's `Status` API directly (authoritative,
  unspoofable) and settles if approved. Needed because callback delivery is NOT
  guaranteed — without this, a genuinely-paid order would be stuck `awaiting_payment`.
- Both call one helper that does an ATOMIC claim
  (`UPDATE ... SET status='pending' WHERE id=? AND status='awaiting_payment'`
  returning rows). Only the single caller that wins the transition counts the sale /
  awards credit, so concurrent callback+confirm can't double-credit.

**Pre-req:** the exact Flitt `order_id` (`${firstOrderId}-${ts}`, the `uniqueOid`) is
persisted as `flitt_order_id` on EVERY order in the payment at `/api/flitt/pay` time
so the Status query + settlement can find the whole group.

**Amount is always server-authoritative.** Order price is computed server-side from
the DB product (`discountPrice < originalPrice ? discountPrice : originalPrice` × qty)
in BOTH `/api/orders` and `/api/orders/credit`; client `productPrice`/`productName`
are ignored. `/api/flitt/pay` requires auth, accepts `orderId` or `orderIds[]`,
verifies each order belongs to the requester and is `awaiting_payment`, and derives
the Flitt amount by summing `order.productPrice`. Never trust a client-sent amount.

**Multi-item carts settle as a group.** A cart checkout creates one order per item,
all sharing one `flitt_order_id`. `settlePaidOrderGroup(flittOrderId)` settles every
order in the group (each via the atomic per-order claim). The callback's `order_id`
IS the `flitt_order_id`, so it settles the group directly (no numeric-prefix parsing).

**Rebind race guard.** `/api/flitt/pay` binds via `bindFlittOrderId` =
`UPDATE ... SET flitt_order_id=? WHERE id=? AND status='awaiting_payment' AND
flitt_order_id IS NULL RETURNING` (atomic). Binding happens BEFORE checkout and is
rolled back (`clearFlittOrderId`) if checkout fails/has no URL, so retries work; a
parallel/second pay on an already-bound order gets 409 instead of rebinding it (which
would orphan the first payment's settlement).
