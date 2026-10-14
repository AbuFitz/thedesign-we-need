// SERVER-ONLY helper. Loads the public product truth model from disk and
// provides authoritative lookups. API functions must always resolve price
// and lifecycle state from here — never trust a price, SKU validity, or
// lifecycle status sent by the client.

const fs = require('fs');
const path = require('path');

let cached = null;

function loadCatalog() {
  if (cached) return cached;
  const file = path.join(__dirname, '..', '..', 'data', 'products.json');
  const raw = fs.readFileSync(file, 'utf8');
  cached = JSON.parse(raw);
  return cached;
}

function findProductBySku(sku) {
  const { products } = loadCatalog();
  return products.find((p) => p.sku === sku) || null;
}

function findVariant(product, variantId) {
  if (!product) return null;
  return product.variants.find((v) => v.id === variantId) || null;
}

// Returns { ok: true } or { ok: false, reasons: [...] } — never throws on a
// bad/unknown SKU, always answers in the same shape so callers fail closed
// on anything unexpected rather than crashing into a 500.
function checkoutEligibility(sku, variantId) {
  const product = findProductBySku(sku);
  if (!product) return { ok: false, reasons: [`Unknown SKU: ${sku}`] };

  const variant = findVariant(product, variantId);
  if (!variant) return { ok: false, reasons: [`Unknown variant "${variantId}" for ${sku}`] };

  const reasons = [];
  if (product.lifecycle.status !== 'checkout_ready') {
    reasons.push(...(product.lifecycle.blockedReasons || ['Product is not yet approved for checkout.']));
  }
  if (!variant.stripePriceId) {
    reasons.push('No Stripe Price ID has been provisioned for this variant.');
  }
  if (product.inventory.status !== 'in_stock') {
    reasons.push('Product is not currently stocked.');
  }

  if (reasons.length) return { ok: false, reasons, product, variant };
  return { ok: true, product, variant };
}

module.exports = { loadCatalog, findProductBySku, findVariant, checkoutEligibility };
