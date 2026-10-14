#!/usr/bin/env node
/*
 * Generates product/<slug>.html for every product in data/products.json
 * from the one template in this file. Static output is committed to the
 * repo — this script is NOT run at Vercel build time (Build Command stays
 * empty). Re-run it manually after editing data/products.json:
 *
 *   node scripts/generate-products.mjs
 *
 * This is the "shared component" for product pages: one template, one
 * data file, eight consistent, honest pages — rather than eight
 * hand-maintained near-duplicates that drift apart over time.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = 'https://a-sharif-commerce.vercel.app';

const catalog = JSON.parse(readFileSync(join(ROOT, 'data', 'products.json'), 'utf8'));
const { products, categories } = catalog;

function categoryLabel(id) {
  return (categories.find((c) => c.id === id) || {}).label || id;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function placeholderIconSVG(opacity = 1) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="opacity:${opacity}"><path d="M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h8v2H8V8Zm0 4h8v2H8v-2Z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

function specRow(label, value, note) {
  const content = value ? escapeHtml(value) : `<td class="pending">${escapeHtml(note || 'Pending confirmed supplier data sheet')}</td>`;
  if (value) return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
  return `<tr><th>${escapeHtml(label)}</th>${content}</tr>`;
}

function relatedProducts(product) {
  return products.filter((p) => p.category === product.category && p.sku !== product.sku).slice(0, 3);
}

function productCardHTML(p) {
  const priced = typeof p.pricing.priceGBP === 'number';
  return `
      <a class="product-card" href="/product/${p.slug}.html">
        <div class="product-card-media">${placeholderIconSVG(0.5)}
          ${p.lifecycle.status !== 'checkout_ready' ? '<span class="badge badge-preview" style="position:absolute;top:0.7rem;left:0.7rem;">Preview</span>' : ''}
        </div>
        <p class="product-cat">${escapeHtml(categoryLabel(p.category))}</p>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="product-price">${priced ? '£' + p.pricing.priceGBP.toFixed(2) : 'Price to be confirmed'}</p>
      </a>`;
}

function jsonLd(product) {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE_URL}/shop.html` },
      { '@type': 'ListItem', position: 2, name: categoryLabel(product.category), item: `${SITE_URL}/shop.html?cat=${product.category}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/product/${product.slug}.html` },
    ],
  };

  // Truthful structured data: only fields we can actually stand behind.
  // No `offers`/price is emitted while pricing.priceGBP is null — a Product
  // schema with no offer is valid; inventing a price to satisfy a
  // nice-to-have Google rich-result would be exactly the kind of fabricated
  // claim this build is built to avoid.
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.shortDescription,
    category: categoryLabel(product.category),
    brand: { '@type': 'Brand', name: 'A. Sharif Commerce' },
  };
  if (typeof product.pricing.priceGBP === 'number' && product.lifecycle.status === 'checkout_ready') {
    productLd.offers = {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      price: product.pricing.priceGBP.toFixed(2),
      availability: product.inventory.status === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/product/${product.slug}.html`,
    };
  }

  return `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>\n  <script type="application/ld+json">${JSON.stringify(productLd)}</script>`;
}

function renderPage(product) {
  const priced = typeof product.pricing.priceGBP === 'number';
  const related = relatedProducts(product);
  const clientData = {
    sku: product.sku,
    slug: product.slug,
    variants: product.variants.map((v) => ({ id: v.id, label: v.label, stripePriceId: v.stripePriceId })),
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(product.seo.title)}</title>
  <meta name="description" content="${escapeHtml(product.seo.description)}" />
  <meta name="theme-color" content="#17160f" />
  <link rel="canonical" href="${SITE_URL}/product/${product.slug}.html" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="A. Sharif Commerce" />
  <meta property="og:title" content="${escapeHtml(product.seo.title)}" />
  <meta property="og:description" content="${escapeHtml(product.seo.description)}" />
  <meta property="og:url" content="${SITE_URL}/product/${product.slug}.html" />
  <meta property="og:image" content="${SITE_URL}/images/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(product.seo.title)}" />
  <meta name="twitter:description" content="${escapeHtml(product.seo.description)}" />
  <meta name="twitter:image" content="${SITE_URL}/images/og-image.png" />
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  ${jsonLd(product)}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" id="siteHeader">
    <div class="container header-inner">
      <a href="/index.html" class="wordmark">A. Sharif <em>Commerce</em></a>
      <nav class="main-nav" id="mainNav" aria-label="Primary">
        <ul>
          <li><a href="/index.html">Home</a></li>
          <li><a href="/shop.html">Shop</a></li>
          <li><a href="/about.html">About</a></li>
          <li><a href="/trade.html">Trade</a></li>
          <li><a href="/contact.html">Contact</a></li>
        </ul>
      </nav>
      <div class="header-actions">
        <button type="button" class="cart-link" data-cart-toggle aria-label="Open cart, 0 items">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Zm3-3a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="cart-count" data-cart-count data-empty="true">0</span>
        </button>
        <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mainNav">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <main id="main">
    <section class="section section--flush" style="padding-top: 2.4rem;">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/shop.html">Shop</a><span class="sep">/</span><a href="/shop.html?cat=${product.category}">${escapeHtml(categoryLabel(product.category))}</a><span class="sep">/</span><span aria-current="page">${escapeHtml(product.name)}</span>
        </nav>

        <div class="product-detail">
          <div>
            <div class="product-gallery-main">${placeholderIconSVG(0.4)}</div>
            <div class="product-gallery-thumbs" role="group" aria-label="Product images">
              <button type="button" data-thumb aria-current="true" aria-label="Image 1">${placeholderIconSVG(0.4)}</button>
            </div>
            <p class="note" style="margin-top: 1rem; border-top: none; padding-top: 0;">Placeholder graphic — no product photography exists yet.</p>
          </div>

          <div class="product-info">
            <p class="badge badge-preview">Preview — not yet available to buy</p>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="lede">${escapeHtml(product.shortDescription)}</p>

            <div class="product-price-row">
              <span class="price${priced ? '' : ' price-pending'}">${priced ? '£' + product.pricing.priceGBP.toFixed(2) : 'Price to be confirmed'}</span>
            </div>

            <div class="lifecycle-notice">
              <strong>Why this isn't buyable yet</strong>
              <ul>
                ${product.lifecycle.blockedReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('\n                ')}
              </ul>
            </div>

            <div class="variant-field">
              <label id="variantLabel">Option</label>
              <div class="variant-options" role="group" aria-labelledby="variantLabel">
                ${product.variants
                  .map(
                    (v, i) =>
                      `<button type="button" data-variant-id="${v.id}" aria-pressed="${i === 0}">${escapeHtml(v.label)}</button>`
                  )
                  .join('\n                ')}
              </div>
            </div>

            <div class="qty-field">
              <label for="qtyInput" style="font-size:0.85rem;font-weight:600;">Quantity</label>
              <div class="qty-stepper">
                <button type="button" id="qtyDec" aria-label="Decrease quantity">&minus;</button>
                <input type="number" id="qtyInput" value="1" min="1" max="20" inputmode="numeric" aria-live="polite" />
                <button type="button" id="qtyInc" aria-label="Increase quantity">+</button>
              </div>
            </div>

            <button type="button" id="addToCartBtn" class="btn-solid">Add to cart<span class="arrow" aria-hidden="true">→</span></button>
            <p id="addToCartStatus" role="status" style="margin-top:0.8rem;font-size:0.88rem;color:var(--ink-soft);"></p>

            <div class="detail-tabs">
              <div class="detail-tab-list" role="tablist" aria-label="Product details">
                <button type="button" role="tab" id="tab-desc" aria-controls="panel-desc" aria-selected="true" tabindex="0">Description</button>
                <button type="button" role="tab" id="tab-spec" aria-controls="panel-spec" aria-selected="false" tabindex="-1">Specification</button>
                <button type="button" role="tab" id="tab-ship" aria-controls="panel-ship" aria-selected="false" tabindex="-1">Delivery &amp; returns</button>
                <button type="button" role="tab" id="tab-safe" aria-controls="panel-safe" aria-selected="false" tabindex="-1">Safety</button>
              </div>
              <div role="tabpanel" id="panel-desc" aria-labelledby="tab-desc" class="detail-tab-panel">
                <p>${escapeHtml(product.description)}</p>
              </div>
              <div role="tabpanel" id="panel-spec" aria-labelledby="tab-spec" class="detail-tab-panel" hidden>
                <table class="spec-table">
                  <tbody>
                    ${specRow('Dimensions', product.specification.dimensions)}
                    ${specRow('Materials', product.specification.materials)}
                    ${specRow('Pack contents', product.specification.packContents)}
                    ${specRow('Care', product.specification.care)}
                    ${specRow('Country of manufacture', product.origin.countryOfManufacture, product.origin.note)}
                  </tbody>
                </table>
              </div>
              <div role="tabpanel" id="panel-ship" aria-labelledby="tab-ship" class="detail-tab-panel" hidden>
                <p>${escapeHtml(product.delivery.note)}</p>
                <p>${escapeHtml(product.returns.note)}</p>
                <p><a href="/delivery.html">Full delivery policy</a> &middot; <a href="/returns.html">Full returns policy</a></p>
              </div>
              <div role="tabpanel" id="panel-safe" aria-labelledby="tab-safe" class="detail-tab-panel" hidden>
                ${product.warnings.length ? `<ul>${product.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : '<p>No specific warnings on file yet.</p>'}
                <p>${escapeHtml(product.compliance.tradingStandardsNotes)}</p>
                <p style="font-size:0.85rem;color:var(--ink-faint);">Compliance last reviewed ${escapeHtml(product.compliance.lastReviewed)}.</p>
              </div>
            </div>
          </div>
        </div>

        ${
          related.length
            ? `<div class="related-products">
          <h2 class="display-md" style="margin-bottom:1.6rem;">You might also like</h2>
          <div class="product-grid">${related.map(productCardHTML).join('')}</div>
        </div>`
            : ''
        }
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container colophon">
      <p>&copy; <span id="year"></span> A. Sharif Commerce — Hemel Hempstead, UK</p>
      <div class="colophon-links">
        <a href="/delivery.html">Delivery</a>
        <a href="/returns.html">Returns</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
        <a href="/accessibility.html">Accessibility</a>
        <a href="/cookies.html">Cookies</a>
        <a href="/trade.html">Trade &amp; wholesale</a>
      </div>
    </div>
  </footer>

  <script type="application/json" id="productData">${JSON.stringify(clientData)}</script>
  <script src="/js/cart.js" defer></script>
  <script src="/js/main.js" defer></script>
  <script src="/js/product.js" defer></script>
</body>
</html>
`;
}

mkdirSync(join(ROOT, 'product'), { recursive: true });
for (const product of products) {
  const html = renderPage(product);
  writeFileSync(join(ROOT, 'product', `${product.slug}.html`), html, 'utf8');
  console.log('generated', `product/${product.slug}.html`);
}
console.log(`Done: ${products.length} product pages.`);
