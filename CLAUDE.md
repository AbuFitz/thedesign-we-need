# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

Static, informational website for **A. Sharif Commerce**, an independent UK
sole-trader e-commerce business (Hemel Hempstead, Hertfordshire) that sources
practical products from wholesalers for resale through online marketplaces
(including Amazon UK). The site is aimed at prospective UK wholesale/
distribution suppliers — it lets them verify who the business is and what it
buys against. It is **not** a storefront: there is no cart, checkout, product
catalogue with prices, or customer-facing shop.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no dependencies. Open any
`.html` file directly or serve the directory with any static file server
(e.g. `python3 -m http.server`).

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home — hero, trade profile snippet, category/process/standards teasers |
| `what-we-source.html` | Full category list |
| `how-we-buy.html` | Buying process |
| `supplier-standards.html` | Requirements for suppliers (invoicing, compliance, etc.) |
| `about.html` | Company background + trade profile |
| `contact.html` | Supplier contact (mailto CTA), trade profile table |
| `privacy.html` / `terms.html` | Legal templates — explicitly marked as drafts, not legal advice |
| `css/style.css` | All styling (single stylesheet, CSS custom properties for tokens) |
| `js/main.js` | Mobile nav toggle + footer year only |

## Content/tone rules

- No invented metrics, testimonials, partner logos, or unsupported claims.
- Never imply wholesale invoices can be altered, backdated, or reissued in a
  different name — supplier-standards.html and index.html state the opposite
  explicitly.
- Keep copy factual and specific; avoid generic marketing/AI-sounding language.
- No non-essential cookies or analytics.
- Contact is email-only (mailto), no enquiry form, since there's no reviewed
  privacy infrastructure behind one.

## Testing changes

There's no test suite. When changing layout/CSS, check both desktop and
mobile widths (~390px) for horizontal overflow, verify the mobile nav toggle,
and confirm internal links resolve — e.g. with Playwright against a local
static server, or by eye in a browser.
