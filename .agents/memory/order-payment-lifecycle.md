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

# Known un-fixed risk: color stock decremented before payment

`/api/orders` decrements `colorStock` at order creation (awaiting_payment), and
`settlePaidOrder` does NOT re-decrement. So an abandoned card checkout that picked
a color permanently reduces inventory with no sale. A proper fix moves the
decrement to settlement (or reserves+restores). Flag to user before changing the
payment path.
