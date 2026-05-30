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

**Pre-req:** the exact Flitt `order_id` (`${ourId}-${ts}`) is persisted on the order
(`flitt_order_id` column) at `/api/flitt/pay` time so the Status query can find it.

**Known remaining gap (NOT fixed — out of referral scope):** `/api/flitt/pay` trusts
the client-supplied `amount` and does not verify the requester owns the order, so a
crafted request could underpay (pay 1 GEL for a 100 GEL order) and still settle.
Fix would bind amount from the DB order + require auth/ownership on `/api/flitt/pay`.
