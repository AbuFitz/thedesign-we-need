import { test, expect } from '@playwright/test';

test.describe('POST /api/create-checkout-session', () => {
  test('rejects missing items with 400', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', { data: {} });
    expect(resp.status()).toBe(400);
    const json = await resp.json();
    expect(json.error).toBe('invalid_request');
  });

  test('rejects an item missing sku/variantId with 400', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', { data: { items: [{ quantity: 1 }] } });
    expect(resp.status()).toBe(400);
  });

  test('rejects an out-of-range quantity with 400', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', {
      data: { items: [{ sku: 'ASC-CBLCLIP-01', variantId: 'cable-clips-10', quantity: 50 }] },
    });
    expect(resp.status()).toBe(400);
  });

  test('rejects a non-integer quantity with 400', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', {
      data: { items: [{ sku: 'ASC-CBLCLIP-01', variantId: 'cable-clips-10', quantity: 1.5 }] },
    });
    expect(resp.status()).toBe(400);
  });

  test('fails closed with 503 when Stripe is not configured (no STRIPE_SECRET_KEY in this test run)', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', {
      data: { items: [{ sku: 'ASC-CBLCLIP-01', variantId: 'cable-clips-10', quantity: 1 }] },
    });
    expect(resp.status()).toBe(503);
    const json = await resp.json();
    expect(json.error).toBe('checkout_unavailable');
  });

  test('rejects an unknown SKU', async ({ request }) => {
    const resp = await request.post('/api/create-checkout-session', {
      data: { items: [{ sku: 'DOES-NOT-EXIST', variantId: 'x', quantity: 1 }] },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('rejects a GET request with 405', async ({ request }) => {
    const resp = await request.get('/api/create-checkout-session');
    expect(resp.status()).toBe(405);
  });
});

test.describe('GET /api/checkout-session', () => {
  test('rejects a missing session_id with 400', async ({ request }) => {
    const resp = await request.get('/api/checkout-session');
    expect(resp.status()).toBe(400);
  });

  test('rejects a malformed session_id with 400', async ({ request }) => {
    const resp = await request.get('/api/checkout-session?session_id=not-a-real-id');
    expect(resp.status()).toBe(400);
  });

  test('fails closed with 503 when Stripe is not configured', async ({ request }) => {
    const resp = await request.get('/api/checkout-session?session_id=cs_test_abc123');
    expect(resp.status()).toBe(503);
  });
});

test.describe('POST /api/stripe-webhook', () => {
  test('fails closed with 503 when STRIPE_WEBHOOK_SECRET is not configured', async ({ request }) => {
    const resp = await request.post('/api/stripe-webhook', { data: '{}', headers: { 'content-type': 'application/json' } });
    expect(resp.status()).toBe(503);
  });

  test('rejects a GET request with 405', async ({ request }) => {
    const resp = await request.get('/api/stripe-webhook');
    expect(resp.status()).toBe(405);
  });
});

test.describe('Checkout success/cancel pages', () => {
  test('cancel page explains nothing was charged and links back to cart', async ({ page }) => {
    await page.goto('/checkout/cancel.html');
    await expect(page.locator('h1')).toContainText('cancelled');
    await expect(page.locator('a[href="/cart.html"]')).toBeVisible();
  });

  test('success page with no session_id shows an honest "no order found" state, not a fake confirmation', async ({ page }) => {
    await page.goto('/checkout/success.html');
    await expect(page.locator('#successContent')).toContainText('No order found');
  });

  test('success page with a session_id fails closed (Stripe unconfigured) and does not claim success', async ({ page }) => {
    await page.goto('/checkout/success.html?session_id=cs_test_fake');
    await expect(page.locator('#successContent')).not.toContainText('Thank you');
    await expect(page.locator('#successContent')).toContainText(/couldn.t verify|went wrong/i);
  });

  test('success and cancel pages are noindex', async ({ page }) => {
    await page.goto('/checkout/success.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.goto('/checkout/cancel.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
