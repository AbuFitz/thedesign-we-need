# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

**A. Sharif Commerce** — an independent UK sole-trader e-commerce business
(Hemel Hempstead, Hertfordshire, run by Abukar Sharif) that sources
practical household goods from wholesalers for resale through online
marketplaces (including Amazon UK) and, eventually, its own storefront
here. The site has two journeys:

- **Consumer storefront** (`/`, `/shop.html`, `/product/*`, `/cart.html`,
  `/checkout/*`) — a real catalogue, cart and Stripe checkout scaffold.
  **Checkout is currently gated closed for every product** — see
  `PRODUCT_LIFECYCLE.md`. This is enforced in code
  (`api/_lib/catalog.js: checkoutEligibility`), not just in copy.
- **Trade/supplier journey** (`/trade.html`, `/what-we-source.html`,
  `/how-we-buy.html`, `/supplier-standards.html`) — lets prospective
  wholesale suppliers verify the business and its buying standards.

## Stack

Plain HTML/CSS + vanilla JS on the frontend, Vercel Functions (plain
CommonJS Node handlers, zero npm runtime dependencies — Stripe is called
via raw `fetch` against its REST API, not the `stripe` SDK) for the
checkout API. No frontend framework, no bundler, no build step — product
pages and the sitemap are generated once by a script and the **output is
committed**, not built at deploy time.

- `npm run dev` — local dev server (`scripts/dev-server.mjs`) serving
  static files and routing `/api/*` to the real handler modules, standing
  in for `vercel dev` (no Vercel CLI is available in some environments).
- `npm test` — Playwright suite (`tests/*.spec.mjs`) against that dev server.
- `npm run generate:products` — regenerate `product/*.html` from
  `data/products.json` after editing the catalogue.
- `npm run generate:sitemap` — regenerate `sitemap.xml`.

**package.json intentionally has no `"type": "module"`.** The `api/*.js`
files are CommonJS (Vercel's default Node runtime expects this unless told
otherwise); the generator/dev-server scripts are `.mjs` and so are the test
files/config, both of which force ESM regardless of the package-level
setting. Don't add `"type": "module"` without checking the `api/*.js`
files still load.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Consumer home — brand proposition, range discovery, provenance/transparency, delivery/returns pointer, trade pathway |
| `shop.html` + `js/shop.js` | Catalogue — search/filter/sort with URL-persisted state |
| `product/*.html` | Generated product pages (see `scripts/generate-products.mjs`) — gallery, variants, qty, lifecycle notice, spec/delivery/safety tabs, related products, truthful JSON-LD |
| `cart.html` + `js/cart.js` + `js/cart-page.js` | Cart drawer (every page) + full cart page — localStorage-persisted, lifecycle-gated checkout |
| `checkout/success.html`, `checkout/cancel.html` | Post-Stripe landing pages — success page verifies the session server-side before showing anything |
| `api/create-checkout-session.js`, `api/checkout-session.js`, `api/stripe-webhook.js` | Vercel Functions — all fail closed without Stripe env vars or a `checkout_ready` product |
| `api/_lib/catalog.js` | Server-side catalogue loader + `checkoutEligibility()` — the actual gate |
| `api/_lib/stripe.js` | Minimal Stripe REST client + webhook signature verification (raw `fetch`/`crypto`, no SDK) |
| `api/_lib/private-data.js` | Server-only (underscore-prefixed `api/_lib`, never routed or served) — landed cost/supplier fields never sent to the client |
| `data/products.json` | The shared product truth model — single source read by client JS, product-page generator, and the checkout API |
| `trade.html`, `what-we-source.html`, `how-we-buy.html`, `supplier-standards.html` | Supplier-facing pages |
| `about.html`, `contact.html` | Consumer-facing, each also carries the verifiable trade-details ledger |
| `delivery.html`, `returns.html`, `privacy.html`, `terms.html`, `accessibility.html`, `cookies.html` | Trust/legal pages — delivery/returns/privacy/terms explicitly marked as drafts pending legal review |
| `404.html`, `500.html` | Error states — both `noindex` |
| `css/style.css` | Entire design system (tokens + components, single file) |
| `js/main.js` | Mobile nav (focus/Escape handling), scroll header state, scroll-reveal |
| `robots.txt`, `sitemap.xml` | Production domain `https://a-sharif-commerce.vercel.app` (see Production notes) |
| `research/source-ledger.md` | Sourcing/regulatory research trail with VERIFIED/INFERRED/PROVISIONAL/BLOCKED status per claim |
| `PRODUCT_LIFECYCLE.md` | Human-readable summary of why checkout is gated, per product |
| `docs/stripe-setup.md`, `.env.example` | How to wire up real Stripe test-mode keys when a product is actually ready |
| `vercel.json` | Security headers only (no rewrites/build overrides) |

## Design system

Editorial/"spec sheet" direction: warm paper background, near-black ink,
one restrained clay/terracotta accent. Fraunces (serif, with italic accents)
for display type, Inter for body/UI. No card grids used as decoration,
icons-for-icons-sake, gradients, or boxed feature blocks — categories/
process/standards/shop results render as numbered lists or a plain product
grid divided by hairline rules. Each page ends in one reversed-color
"closing band" (the single high-contrast moment) before a quiet colophon
footer. Motion is minimal (hover underlines, sliding arrows, a subtle
IntersectionObserver scroll-reveal) and fully disabled under
`prefers-reduced-motion`.

**CSS Grid gotcha already hit once:** `.product-detail` uses
`grid-template-columns: 1.1fr 0.9fr` and carries `min-width: 0` on its
direct children — without it, deeply nested unshrinkable content (it was
the tab strip) silently forces the grid track wider than its container,
causing mobile horizontal overflow with no obviously-related cause. If a
similar overflow shows up elsewhere, check for a grid/flex item without
`min-width: 0` before assuming the offending content itself is wrong.

## Content/tone rules

- No invented metrics, testimonials, partner logos, certifications, clients,
  reviews, ratings, stock levels, delivery promises, discounts, scarcity, or
  any other unsupported claim.
- Every one of the 8 seed products is `lifecycle.status: "preview"` with
  honest `blockedReasons`. Specification fields (dimensions/materials/pack/
  care) are `null` with a "pending supplier data sheet" note rather than
  invented numbers — this is deliberate, not an oversight.
- Never imply wholesale invoices can be altered, backdated, or reissued in a
  different name — supplier-standards.html states the opposite explicitly.
- Keep copy factual, concise and specific; avoid generic marketing language.
- No non-essential cookies, analytics, or tracking of any kind. Cart state
  lives only in the visitor's own `localStorage`.
- Only town/county level location (Hemel Hempstead, Hertfordshire) — never
  a street address.
- Structured data (`scripts/generate-products.mjs: jsonLd()`) omits
  `offers`/price entirely while a product's price is unconfirmed — don't
  "fix" a missing rich-result by filling in a placeholder price.

## Production notes

- `robots.txt`, `sitemap.xml`, and every page's `<link rel="canonical">` /
  Open Graph `og:url` / `og:image` point at the confirmed production domain
  `https://a-sharif-commerce.vercel.app`. If that domain ever changes,
  update it site-wide (grep for it) and rerun `npm run generate:sitemap`.
- No Stripe keys are committed anywhere, ever. `.env.example` documents the
  required variable names only. Without them, `/api/create-checkout-session`
  and `/api/stripe-webhook` both return `503` — this is intentional
  fail-closed behaviour, not a bug to "fix" by relaxing the check.
- `vercel.json` exists only for security headers (`X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) — no build
  command override, no rewrites. `/api/*.js` files are picked up as
  Vercel Functions automatically; `404.html` at the repo root is the
  not-found page automatically.
- `.vercel` is gitignored — never commit Vercel project-link metadata.

## Testing changes

`npm test` runs the full Playwright suite (desktop 1440×1000 + mobile
390×844 projects) covering: shop search/filter/sort + URL state, product
pages (incl. unknown-slug 404, lifecycle notice, variant/qty/add-to-cart,
keyboard-operable tabs, truthful JSON-LD), cart persistence/calculation/
removal, checkout API input validation and fail-closed behaviour, success/
cancel page honesty, site-wide link integrity, console-error/horizontal-
overflow/single-`h1` checks on every page, and mobile-menu keyboard/focus
behaviour. When changing layout/CSS, also check both viewports for
horizontal overflow by hand if touching anything grid/flex-based (see the
Grid gotcha above).

The Playwright config forces `browserName: 'chromium'` on the mobile
project explicitly — the `devices['iPhone 12']` preset defaults to WebKit
(real iPhones run Safari), which silently fails to launch against a
Chromium-only binary. Don't remove that override.
