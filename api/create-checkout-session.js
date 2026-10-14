// POST /api/create-checkout-session
// Body: { items: [{ sku, variantId, quantity }] }
//
// Fails closed: refuses to create a Stripe Checkout Session unless every
// line item is checkout_ready, has a provisioned Stripe Price ID, is
// in stock, AND STRIPE_SECRET_KEY is configured. The server never trusts
// a price from the request — every price comes from the server-side
// catalogue, resolved by SKU.

const { checkoutEligibility } = require('./_lib/catalog');
const { createCheckoutSession, requireSecretKey } = require('./_lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      return res.status(400).json({ error: 'invalid_json' });
    }
  }

  const items = Array.isArray(body && body.items) ? body.items : null;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'items must be a non-empty array of { sku, variantId, quantity }.' });
  }

  for (const item of items) {
    if (!item || typeof item.sku !== 'string' || typeof item.variantId !== 'string') {
      return res.status(400).json({ error: 'invalid_request', message: 'Each item needs a sku and variantId.' });
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: 'invalid_request', message: 'quantity must be an integer between 1 and 20.' });
    }
  }

  // Fail closed #1: no Stripe credentials configured at all.
  if (!requireSecretKey()) {
    return res.status(503).json({
      error: 'checkout_unavailable',
      message: 'Checkout is not yet configured on this deployment (missing STRIPE_SECRET_KEY).',
    });
  }

  // Fail closed #2: resolve every item against the server-side catalogue.
  const blocked = [];
  const lineItems = [];
  for (const item of items) {
    const eligibility = checkoutEligibility(item.sku, item.variantId);
    if (!eligibility.ok) {
      blocked.push({ sku: item.sku, variantId: item.variantId, reasons: eligibility.reasons });
      continue;
    }
    lineItems.push({ price: eligibility.variant.stripePriceId, quantity: Number(item.quantity) });
  }

  if (blocked.length) {
    return res.status(503).json({
      error: 'checkout_unavailable',
      message: 'One or more items in your cart are not yet available for checkout.',
      blocked,
    });
  }

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

  try {
    const session = await createCheckoutSession({
      lineItems,
      successUrl: `${siteUrl}/checkout/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/checkout/cancel.html`,
      metadata: { source: 'a-sharif-commerce-shop' },
    });
    return res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    return res.status(502).json({ error: 'stripe_error', message: err.message });
  }
};
