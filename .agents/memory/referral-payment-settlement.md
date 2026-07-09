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

**Canonical host matters for the callback.** Apex `spiningebi.ge` 301-redirects to
`www.spiningebi.ge`, and Flitt's server-to-server POST callback does NOT follow 301s,
so an apex `server_callback_url` silently drops every settlement. Always build the
Flitt `server_callback_url`/`response_url` from the **www** host (normalize APP_URL,
defaulting to `https://www.spiningebi.ge`). Without this, settlement falls back to the
success-page `/api/flitt/confirm` only (works only if the buyer returns).

**Verifying real payments:** FLITT_MERCHANT_ID + FLITT_SECRET_KEY are present in the
Replit dev env too, so you can query Flitt's `Status({order_id})` directly from a repo-
root node script (SDK `@flittpayments/flitt-node-js-sdk`) using the `flitt_order_id`
stored on each order. `order_status` values seen: `approved` (paid), `processing`
(in progress), `created` (opened, never paid), `expired` (window lapsed). An order stuck
`awaiting_payment` is CORRECT when Flitt says it was never `approved` — not a bug.

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

**Purchase-limit interaction (abandoned checkouts).** Unpaid `awaiting_payment`
orders count toward a product's per-customer purchase limit for only 20 MINUTES
(`limitConditions` in storage) so an abandoned card checkout frees the slot for a
returning buyer. Three guards keep this from being exploitable: (1) Flitt checkout
is created with `lifetime: 900` so payment links die at 15 min; (2) `/api/flitt/pay`
refuses (and cancels) re-payment of a limited-product order older than 20 min —
buyer must reorder, which re-checks the limit; (3) settlement logs a WARN when
settling any order older than 25 min so overshoot can be reviewed. If the counting
window is ever changed, change link lifetime and the re-pay cutoff in lockstep.
