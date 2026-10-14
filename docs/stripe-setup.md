# Stripe test-mode setup

This describes how the site owner (not Claude, and not committed anywhere
as real values) would wire up Stripe once a product is actually approved
for checkout. Nothing here is required for the site to run today — with no
keys set, `/api/create-checkout-session` and `/api/stripe-webhook` both
return `503 checkout_unavailable` / fail closed, and the UI shows an honest
"not yet available to buy" state instead of a broken checkout button.

## 1. Create a Stripe account and stay in test mode

Use the toggle in the Stripe Dashboard to confirm you're in **test mode**
(keys starting `sk_test_` / `pk_test_`) until the business is genuinely
ready to take real payments — see `PRODUCT_LIFECYCLE.md` for what still
has to happen first (samples, supplier documents, final pricing, a real
returns process).

## 2. Create a test-mode Price for a product

In the Dashboard (test mode): **Products → Add product** → give it a name
matching the SKU in `data/products.json` (e.g. `ASC-CBLCLIP-01 — Set of
10`) and a price. Copy the resulting **Price ID** (`price_...`).

## 3. Wire the Price ID into the catalogue

Edit `data/products.json`, find the matching `variants[].id`, and set its
`stripePriceId` to the copied Price ID. Also flip that product's
`lifecycle.status` to `"checkout_ready"` **only once every other
`blockedReason` for it is actually resolved** — the checkout API
re-derives eligibility from this file on every request, so a stale status
here is the only thing standing between "preview" and "real money moving."

## 4. Set environment variables

Locally: copy `.env.example` to `.env.local` and fill in `STRIPE_SECRET_KEY`
and `STRIPE_PUBLISHABLE_KEY` (test mode values).

On Vercel: Project → Settings → Environment Variables → add the same names.
Never paste a live (`sk_live_`) key into a preview environment.

## 5. Webhook, for local testing

Install the Stripe CLI, then:

```
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

This prints a `whsec_...` value — put that in `STRIPE_WEBHOOK_SECRET`
locally. On Vercel, register the deployed `/api/stripe-webhook` URL as an
endpoint in the Dashboard (Developers → Webhooks) and use the signing
secret it gives you there instead.

## 6. What's still a placeholder after all of the above

`api/stripe-webhook.js` logs a received `checkout.session.completed` event
but does not persist an order anywhere — Vercel Functions have no
filesystem/database by default. Before this handles real orders, it needs
a real persistence layer (database or KV store) keyed on the Stripe event
ID for genuine idempotency, plus whatever fulfilment action actually needs
to happen (confirmation email, inventory decrement, etc.). This is called
out directly in the code comments in that file as well.
