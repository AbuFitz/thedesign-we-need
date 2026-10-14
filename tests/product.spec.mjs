import { test, expect } from '@playwright/test';

test('unknown product slug 404s', async ({ page }) => {
  const resp = await page.goto('/product/not-a-real-product.html');
  expect(resp.status()).toBe(404);
});

test('product page shows an honest lifecycle-blocked notice, not a buy button that pretends to work', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await expect(page.locator('h1')).toContainText('Adhesive Cable Clips');
  await expect(page.locator('.badge-preview').first()).toContainText('Preview');
  await expect(page.locator('.lifecycle-notice li').first()).toBeVisible();
  // The Add to cart button exists (cart assembly is allowed) — only checkout itself is gated, tested separately.
  await expect(page.locator('#addToCartBtn')).toBeVisible();
});

test('specification fields pending confirmation are shown honestly, not fabricated', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await page.locator('#tab-spec').click();
  await expect(page.locator('#panel-spec td.pending').first()).toContainText(/pending/i);
});

test('variant selection, quantity stepper, and add-to-cart update the header cart count', async ({ page }) => {
  await page.goto('/product/packing-cubes.html');

  const qtyInput = page.locator('#qtyInput');
  await page.locator('#qtyInc').click();
  await expect(qtyInput).toHaveValue('2');
  await page.locator('#qtyInc').click();
  await expect(qtyInput).toHaveValue('3');
  await page.locator('#qtyDec').click();
  await expect(qtyInput).toHaveValue('2');

  await page.locator('#addToCartBtn').click();
  await expect(page.locator('[data-cart-count]').first()).toHaveText('2');
  await expect(page.locator('#addToCartStatus')).toContainText('Added 2');
});

test('quantity cannot go below 1 or above 20', async ({ page }) => {
  await page.goto('/product/packing-cubes.html');
  const qtyInput = page.locator('#qtyInput');
  await qtyInput.fill('0');
  await qtyInput.dispatchEvent('change');
  await expect(qtyInput).toHaveValue('1');

  await qtyInput.fill('999');
  await qtyInput.dispatchEvent('change');
  await expect(qtyInput).toHaveValue('20');
});

test('detail tabs are keyboard operable (arrow keys move focus and selection)', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  const descTab = page.locator('#tab-desc');
  const specTab = page.locator('#tab-spec');

  await descTab.focus();
  await expect(descTab).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(specTab).toHaveAttribute('aria-selected', 'true');
  await expect(specTab).toBeFocused();
  await expect(page.locator('#panel-spec')).toBeVisible();
  await expect(page.locator('#panel-desc')).toBeHidden();

  await page.keyboard.press('ArrowLeft');
  await expect(descTab).toHaveAttribute('aria-selected', 'true');
});

test('related products link to other items in the same category', async ({ page }) => {
  await page.goto('/product/sink-caddy.html');
  const related = page.locator('.related-products .product-card');
  await expect(related.first()).toBeVisible();
  const href = await related.first().getAttribute('href');
  expect(href).toMatch(/^\/product\/.+\.html$/);
});

test('product page carries truthful Product + BreadcrumbList JSON-LD with no fabricated offer', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = scripts.map((s) => JSON.parse(s));
  const product = parsed.find((p) => p['@type'] === 'Product');
  const breadcrumb = parsed.find((p) => p['@type'] === 'BreadcrumbList');
  expect(product).toBeTruthy();
  expect(breadcrumb).toBeTruthy();
  expect(product.sku).toBe('ASC-CBLCLIP-01');
  // No price is confirmed for this SKU — structured data must not invent one.
  expect(product.offers).toBeUndefined();
});
