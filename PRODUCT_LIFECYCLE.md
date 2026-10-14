# Product lifecycle status

Single source of truth for *why* checkout is gated: `data/products.json`
(`lifecycle.status` and `lifecycle.blockedReasons` per product — this file
is a human-readable summary of that, not a separate source of truth).

## Statuses

- **draft** — not yet shown anywhere on the site.
- **preview** — visible in the catalogue (shop, product page, structured
  data) so prospective customers and suppliers can see the range, but
  **checkout is blocked**. This is where all 8 seed products are today.
- **checkout_ready** — every blocking condition below has been resolved for
  that specific product, a `stripePriceId` is set on every variant, and
  `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` are configured on the
  deployment. The checkout API (`api/create-checkout-session.js`)
  independently re-checks all of this server-side on every request — it
  does not trust the client, and does not trust a stale status.

## Current status of all 8 seed products (as of 2026-10-14)

| SKU | Product | Status | Blocked on |
|---|---|---|---|
| ASC-CBLCLIP-01 | Adhesive Cable Clips | preview | sample, supplier docs, price, Stripe Price ID |
| ASC-CBLBOX-01 | Cable Management Organiser Box | preview | sample, supplier docs, price, Stripe Price ID |
| ASC-PACKCUBE-01 | Packing Cubes Set | preview | sample, supplier docs, price, Stripe Price ID |
| ASC-DRWORG-01 | Expandable Drawer Organisers | preview | sample, supplier docs, price, Stripe Price ID |
| ASC-SINKRACK-01 | Roll-Up Sink Drying Rack | preview | sample, supplier docs, **food-contact documentation**, price, Stripe Price ID |
| ASC-SINKCADDY-01 | Kitchen Sink Caddy | preview | sample, supplier docs, price, Stripe Price ID |
| ASC-BRMHOLD-01 | Wall-Mounted Broom & Mop Holder | preview | sample, supplier docs, **fixing/load-rating information**, price, Stripe Price ID |
| ASC-WRDORG-01 | Hanging Wardrobe Organiser | preview | sample, supplier docs, price, Stripe Price ID |

No product is `checkout_ready`. Site-wide, every "Add to cart" flow works
end-to-end (the cart itself is real and testable), but the Checkout action
on the cart page always shows an honest blocked message instead of
reaching Stripe, and the server-side API refuses to create a session for
any of these SKUs even if someone called it directly.

## What moves a product from preview → checkout_ready

1. A physical sample has been received and checked against the listing copy.
2. The supplier has provided: a genuine wholesale invoice made out to A.
   Sharif Commerce, clear EAN/UPC/SKU data, confirmed materials/dimensions/
   pack contents/care instructions, and any category-specific documentation
   (e.g. food-contact material data for the sink rack; fixing/load rating
   for the broom holder).
3. Stock is actually available to fulfil orders (`inventory.status` set to
   `in_stock` with a real quantity).
4. A final retail price has been set (`pricing.priceGBP`) and a delivery/
   returns position has been confirmed (not just the general draft legal
   pages).
5. A Stripe test-mode Price has been created and its ID set on the relevant
   variant (see `docs/stripe-setup.md`).
6. `lifecycle.status` is updated to `checkout_ready` in `data/products.json`.

Until all six are true for a given SKU, it stays gated — this is enforced
in code (`api/_lib/catalog.js: checkoutEligibility`), not just in copy.
