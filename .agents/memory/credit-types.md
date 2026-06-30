---
name: Credit (bonus) system — two distinct credit types
description: site has TWO separate credit awards (referral-to-sharer vs purchase-bonus-to-buyer); both gate on confirmed card payment, neither on credit-paid orders.
---

# Two separate credit awards

The site awards `myCredit` (user balance) from two independent, admin-configurable sources. Do not conflate them:

1. **Referral credit** → rewards the SHARER. Setting key `referral_credit_amount`. Logged in `referral_logs`. Anti-fraud: valid referrer, not self, once per buyer (`hasReferralLogForBuyer`).
2. **Purchase bonus credit** → rewards the BUYER for completing a purchase. Setting key `purchase_credit_amount` (0 = disabled). Logged in `purchase_credit_logs`. Admin view enriches with buyer name.

Both are awarded ONLY inside `settlePaidOrder` (card flow), AFTER the atomic `markOrderPaidIfAwaiting` claim — so callback + /payment/success confirm races never double-award.

`credit_to_gel` is the shared conversion rate (1 credit = X ₾) used for both display and spending.

**Why purchase bonus is NOT awarded in the credit-paid flow (`/api/orders/credit`):** awarding credit for spending credit creates a farming loop. Card (real-money) purchases only.

**How to apply:** Any new "reward credit" must follow the same pattern: gate on confirmed payment inside settlePaidOrder, write a log row (who/order/product/amount), expose an admin GET endpoint + settings key. Award/log are non-transactional with catch-log (matches existing referral pattern) — acceptable, idempotency already guaranteed upstream.
