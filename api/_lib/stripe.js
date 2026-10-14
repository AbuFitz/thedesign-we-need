// SERVER-ONLY. Minimal Stripe REST client using global fetch (Node 18+ on
// Vercel) — deliberately not the `stripe` npm package, to keep the project
// at zero runtime dependencies. Implements only what this site needs:
// creating a Checkout Session, retrieving one, and verifying a webhook
// signature per Stripe's documented scheme.

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function requireSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key;
}

function toFormBody(obj, prefix) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') {
          parts.push(toFormBody(item, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else if (typeof v === 'object') {
      parts.push(toFormBody(v, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join('&');
}

async function createCheckoutSession({ lineItems, successUrl, cancelUrl, metadata }) {
  const secretKey = requireSecretKey();
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');

  const body = toFormBody({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: lineItems.map((li) => ({ price: li.price, quantity: li.quantity })),
    metadata,
  });

  const resp = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const json = await resp.json();
  if (!resp.ok) {
    const message = json && json.error ? json.error.message : `Stripe error (${resp.status})`;
    throw new Error(message);
  }
  return json;
}

async function retrieveCheckoutSession(sessionId) {
  const secretKey = requireSecretKey();
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');

  const resp = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await resp.json();
  if (!resp.ok) {
    const message = json && json.error ? json.error.message : `Stripe error (${resp.status})`;
    throw new Error(message);
  }
  return json;
}

// Verifies the Stripe-Signature header per Stripe's documented v1 scheme:
// HMAC-SHA256 of "{timestamp}.{rawBody}" using the webhook signing secret,
// compared in constant time, with a tolerance window on the timestamp.
const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) {
  if (!webhookSecret) return { ok: false, reason: 'STRIPE_WEBHOOK_SECRET is not configured' };
  if (!signatureHeader) return { ok: false, reason: 'Missing Stripe-Signature header' };

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k === 't') acc.timestamp = v;
    if (k === 'v1') (acc.signatures = acc.signatures || []).push(v);
    return acc;
  }, {});

  if (!parts.timestamp || !parts.signatures || !parts.signatures.length) {
    return { ok: false, reason: 'Malformed Stripe-Signature header' };
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${parts.timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const matches = parts.signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  });

  if (!matches) return { ok: false, reason: 'Signature mismatch' };

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(parts.timestamp));
  if (ageSeconds > toleranceSeconds) return { ok: false, reason: 'Timestamp outside tolerance window' };

  return { ok: true };
}

module.exports = { createCheckoutSession, retrieveCheckoutSession, verifyWebhookSignature, requireSecretKey };
