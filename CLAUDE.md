# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

Static, informational website for **A. Sharif Commerce**, an independent UK
sole-trader e-commerce business (Hemel Hempstead, Hertfordshire, run by
Abukar Sharif) that sources practical products from wholesalers for resale
through online marketplaces (including Amazon UK). The site is aimed at
prospective UK wholesale/distribution suppliers — it lets them verify who
the business is and what it buys against. It is **not** a storefront: there
is no cart, checkout, product catalogue with prices, or customer-facing shop.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no dependencies. Open any
`.html` file directly or serve the directory with any static file server
(e.g. `python3 -m http.server`). Deploys to Vercel with zero configuration
(static file hosting — see below).

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home — hero, trade profile strip, category/process/standards teasers, closing CTA |
| `what-we-source.html` | Full category list |
| `how-we-buy.html` | Buying process |
| `supplier-standards.html` | Requirements for suppliers (invoicing, compliance, etc.) |
| `about.html` | Company background + trade details ledger |
| `contact.html` | Supplier contact — email is the page's centerpiece, no form |
| `privacy.html` / `terms.html` | Legal templates — explicitly marked as drafts, not legal advice |
| `404.html` | Custom not-found page, `noindex` |
| `css/style.css` | Entire design system (tokens + components, single file) |
| `js/main.js` | Mobile nav (with focus/Escape handling), scroll header state, scroll-reveal, footer year |
| `robots.txt`, `sitemap.xml` | SEO — **use placeholder domain `https://example.com`, must be replaced before go-live** |
| `images/favicon.svg`, `images/apple-touch-icon.png`, `images/og-image.png` | Brand marks — generated to match the design system, not stock art |

## Design system

Editorial/"spec sheet" direction: warm paper background, near-black ink,
one restrained clay/terracotta accent. Fraunces (serif, with italic accents)
for display type, Inter for body/UI. No card grids, icons-for-icons-sake,
gradients, or boxed feature blocks — categories/process/standards render as
numbered lists divided by hairline rules. Each page ends in one reversed-color
"closing band" (the single high-contrast moment) before a quiet colophon
footer. Motion is minimal (hover underlines, sliding arrows, a subtle
IntersectionObserver scroll-reveal) and fully disabled under
`prefers-reduced-motion`.

## Content/tone rules

- No invented metrics, testimonials, partner logos, certifications, clients,
  history/scale claims, or unsupported claims of any kind.
- Never imply wholesale invoices can be altered, backdated, or reissued in a
  different name — supplier-standards.html and index.html state the opposite
  explicitly.
- Keep copy factual, concise and specific; avoid generic marketing language.
- No non-essential cookies, analytics, or tracking of any kind.
- Contact is email-only (mailto), no enquiry form — there's no reviewed
  privacy/data-handling infrastructure behind one.
- Only town/county level location (Hemel Hempstead, Hertfordshire) — never
  a street address.

## Production notes (before deploying for real)

- `robots.txt`, `sitemap.xml`, and every page's `<link rel="canonical">` /
  Open Graph `og:url` / `og:image` currently use the placeholder domain
  `https://example.com`. Replace it site-wide with the real production
  domain before going live.
- No `vercel.json` — not needed. It's a plain multi-page static site with
  `.html` extensions in every internal link; Vercel serves it with zero
  config, and `404.html` at the repo root is picked up automatically as the
  not-found page.

## Testing changes

There's no test suite. When changing layout/CSS, check both desktop and
mobile widths (~390px) for horizontal overflow, verify the mobile nav
overlay (open/close, Escape key, focus return), and confirm internal and
mailto links resolve — e.g. with Playwright against a local static server.
