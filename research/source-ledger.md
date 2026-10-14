# Source ledger

Research trail for the A. Sharif Commerce consumer storefront build. Every
factual claim used anywhere on the site (categories, pricing context,
regulatory statements) traces back to a row here. Status key:

- **VERIFIED** — fetched/read directly from a primary or official source on the access date.
- **INFERRED** — reasonably concluded from a VERIFIED source, but not stated outright by it.
- **PROVISIONAL** — plausible working assumption used only for scaffolding (e.g. a placeholder price range); must be replaced with a confirmed figure before launch.
- **BLOCKED** — actively attempted and could not be obtained in this session; recorded so nobody re-attempts the same dead end, and nothing downstream treats the gap as filled.

Access date for every row below: **2026-10-14**, via the session's web tools
(`WebSearch`, `WebFetch`). No account, API, or authenticated access to any
of these services was available or used.

## Temu UK — product discovery (explicitly discovery-only, never proof)

| # | Query / target | Result | Status | Notes |
|---|---|---|---|---|
| 1 | `WebFetch https://www.temu.com/uk/search_result.html?search_key=cable%20clips` | Page returned only the `<title>` tag ("Cable Clips - Temu United Kingdom"); no product names, prices, images, or listing content — the storefront is a client-side JS app that doesn't render in a non-JS fetch. | **BLOCKED** | Could not retrieve any real Temu UK listing content for cable clips. |
| 2 | `WebSearch "Temu UK cable clips organiser desk site:temu.com"` | Zero results from temu.com; all results were Amazon UK, ManoMano, a Norfolk-based UK manufacturer, and deal-aggregator sites. | **BLOCKED** | temu.com does not appear to be indexed by the search tool for this query. |
| 3 | `WebSearch "Temu UK packing cubes OR drawer organiser OR sink caddy price reviews"` | Zero results from temu.com. Results were M&S (IE site), Tesco Marketplace, eBay UK, and deal-aggregator pages for comparable (non-Temu) products. | **BLOCKED** | Same pattern as above — no Temu UK data obtained for any of the 8 seed concepts. |

**Conclusion:** Live Temu UK product data (listings, prices, ratings, stock, seller identity) was **not obtainable** in this session by either search or direct fetch. Per the brief, Temu was discovery-only in any case — it is never usable as proof of safety, authenticity, stock, resale rights, or any product claim. Because no Temu content was actually retrieved, **nothing on this site cites Temu, references Temu pricing, or implies Temu was used to validate any of the 8 seed products.** The 8 seed concepts came from the brief itself, not from Temu research.

## Adjacent UK market context (NOT Temu — general price-range orientation only)

These are real UK retail listings for broadly comparable product types, used only to sanity-check that the 8 seed categories sit in a plausible "practical, everyday, low-value household goods" price band. They are **not** supplier quotes, not landed-cost data, and are **never used as a displayed price anywhere on the site** — every product's `priceGBP` field is `null` and marked PROVISIONAL/unconfirmed (see `data/products.json`).

| # | Source | Evidence | Status |
|---|---|---|---|
| 4 | [Amazon UK via LatestDeals — 10-pack adjustable cable clips](https://latestdeals.co.uk/deals/10-pack-adjustable-cable-clips-desk-car-use--amazon) | Listed around £2.99 at time of the deals post. | VERIFIED (deal-aggregator snapshot, not live-checked) |
| 5 | [IndoorOutdoors.co.uk — TechShieldz cable organiser products](https://indooroutdoors.co.uk/products/techshieldz-under-desk-cable-management-channel-clips) | UK-manufactured (Norfolk) cable clip/organiser strip, £5.25–£8.95 range. | VERIFIED |
| 6 | [M&S IE — 5-pack packing cubes](https://www.marksandspencer.com/ie/5-pack-packing-cubes/p/hbp60781227) | €19.50, 4.8/5 from 16 reviews, 94% would recommend. | VERIFIED (Irish site, euro pricing — not a GBP reference) |
| 7 | [Tesco Marketplace — 10-piece packing cube set](https://www.tesco.com/shop/en-GB/products/325107717) | £11.99, UK-based marketplace seller, ships from UK. | VERIFIED |
| 8 | [M&S IE — Joseph Joseph Caddy sink organiser](https://www.marksandspencer.com/ie/jj-sink-caddy/p/hbp60578314) | €27, mostly positive reviews. | VERIFIED (Irish site, euro pricing) |
| 9 | [eBay UK — Minky sink tidy](https://www.ebay.com/itm/295123783050) | £15.99 + £19.99 shipping, UK seller, 4.7/5 from 73 ratings, was out of stock at capture. | VERIFIED |

**Use on site:** none of these figures appear as a price anywhere — they only informed the PROVISIONAL "indicative range" notes kept in internal product records for future costing, and are disclosed here rather than silently assumed.

## UK product-safety & consumer-protection guidance (official / authoritative)

| # | Source | Evidence | Status |
|---|---|---|---|
| 10 | [GOV.UK — My Safety: Online Shopping](https://www.gov.uk/guidance/my-safety-online-shopping) (OPSS consumer campaign) | Buyers are told to check: how long a seller has traded, UK contact details, seller rating, reviews mentioning quality/safety, recognised safety marks (UKCA/CE) where relevant, clear instructions/warnings, and recall status. | VERIFIED |
| 11 | [Business Companion — General Product Safety](https://www.businesscompanion.info/node/543/printable/print) (official UK trading-standards-backed guidance service) | GPSR 2005 applies to GB consumer goods. Distributors must: supply only safe products; pass on all manufacturer warnings/instructions; never knowingly supply dangerous or recalled stock; maintain traceability records (origin, and for non-retail sales, onward recipient) for **at least 6 years**; cooperate with enforcement; never apply CE/UKCA marks to products that don't require them. Acting on a product (assembling, repackaging, relabelling) can shift a distributor into "producer" obligations. | VERIFIED |
| 12 | WebSearch synthesis — GPSR 2005 (GB) vs EU GPSR (in force since 13 Dec 2024, applies in NI under the Windsor Framework) | Two overlapping regimes; GB retains GPSR 2005, Northern Ireland/EU sales fall under the newer EU GPSR with added traceability expectations. | INFERRED (synthesized from multiple secondary sources — Wikipedia, SimplyBusiness, a GPSR compliance blog — not a single primary citation; flagged for legal review) |

**How this shaped the build:**
- The excluded-categories list in the brief (mains electricals, batteries/chargers, toys/children's goods, cosmetics, ingestibles, medical claims, PPE) lines up with the categories that actually require CE/UKCA marking or sector-specific regimes — the 8 seed concepts (cable clips, cable organiser box, packing cubes, drawer organisers, roll-up sink rack, sink caddy, broom/mop holders, wardrobe organisers) are plain General Product Safety Regulations goods with no CE/UKCA requirement, which is INFERRED from row 10/11, not independently verified per-SKU.
- Every product record carries `compliance.status`, `compliance.tradingStandardsNotes`, and `compliance.lastReviewed` fields reflecting GPSR distributor duties (traceability record-keeping, instructions/warnings passthrough) — currently all marked **not yet satisfied** (see `data/products.json`), because no actual supplier documentation has been obtained (that step is itself gated behind supplier onboarding, which hasn't happened).
- "Based in Hemel Hempstead, Hertfordshire, UK contact details, sole trader" is kept visible site-wide (About/Contact/footer) specifically because row 10 shows this is one of the exact signals OPSS tells buyers to look for.

## What remains BLOCKED / not attempted

- No Temu UK account or storefront browse was possible (see rows 1–3).
- No contact was made with any wholesaler or supplier — this build defines the *data shape* for supplier references (`supplierRef` fields in `data/products.json`) but every value is `null`/"not yet sourced".
- No physical samples exist; no safety testing or certification has occurred for any SKU.
- No Companies House / HMRC business-registration lookup was performed — proprietor and trading details are taken as given in the brief, not independently verified against a public register.
