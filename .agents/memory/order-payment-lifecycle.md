---
name: Order payment lifecycle (Flitt card orders)
description: How card orders move through statuses and what must NOT happen before payment is confirmed.
---

# Card order lifecycle

A card order is created in `/api/orders` with status `awaiting_payment` BEFORE the
buyer pays (Flitt needs an order id to reference). Payment is confirmed later via
`/api/flitt/callback` (signed) or `/api/flitt/confirm` (success page asks Flitt
Status API). Settlement happens in `settlePaidOrder` which flips
`awaiting_payment → pending` atomically and only THEN counts the sale + awards
referral credit.

**Rule: an `awaiting_payment` order is NOT a real order.** A buyer who abandons
the card-entry screen leaves a lingering `awaiting_payment` row.

**Why:** users panicked seeing abandoned/unpaid checkouts appear as real orders in
the admin "შეკვეთები" panel and in their own order history.

**How to apply:** any order *list* must exclude `awaiting_payment`. This is done at
the storage layer — `getOrders()` and `getOrdersByUser()` filter it out. Single
lookups (`getOrder`, `getOrdersByFlittOrderId`) must NOT filter, because the
payment-confirmation path needs to find the awaiting row to settle it.

# Color stock: decremented only on real payment

Color stock (`colorStock`, a JSON text map `{color: count}`) is reduced only when
a sale becomes real:
- Card: `/api/orders` only CHECKS availability; `settlePaidOrder` decrements via
  `storage.decrementColorStock` after the atomic `markOrderPaidIfAwaiting` claim
  (so callback + confirm cannot double-decrement).
- Credit: `/api/orders/credit` checks up front and decrements after order creation
  (credit = instant paid sale).

**Why:** abandoned card checkouts used to decrement at creation and never restore,
permanently eating inventory.

**How to apply:** never decrement color stock at checkout/creation for card orders;
only on confirmed payment. `decrementColorStock` clamps at 0.

**Known limitation (accepted for this low-volume shop):** `decrementColorStock` is a
non-atomic read-modify-write and the check→decrement is TOCTOU, so true concurrent
purchases of the same color can lose updates. Fine at current scale; if volume
grows, make the decrement a single conditional SQL update and wrap settlement in a
transaction.
