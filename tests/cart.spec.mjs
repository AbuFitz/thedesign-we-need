import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_CATALOG = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'products.json'), 'utf8'));

test('cart persists across page reloads and across pages (localStorage)', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await page.locator('#addToCartBtn').click();
  await expect(page.locator('[data-cart-count]').first()).toHaveText('1');

  await page.reload();
  await expect(page.locator('[data-cart-count]').first()).toHaveText('1');

  await page.goto('/shop.html');
  await expect(page.locator('[data-cart-count]').first()).toHaveText('1');

  await page.goto('/cart.html');
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.locator('.cart-line-name')).toContainText('Adhesive Cable Clips');
});

test('cart page shows an honest empty state with a link back to the shop', async ({ page }) => {
  await page.goto('/cart.html');
  await expect(page.locator('.cart-empty')).toBeVisible();
  await expect(page.locator('.cart-empty a[href="/shop.html"]')).toBeVisible();
});

test('removing a line item updates the cart and the header count', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await page.locator('#addToCartBtn').click();
  await page.goto('/product/packing-cubes.html');
  await page.locator('#addToCartBtn').click();
  await expect(page.locator('[data-cart-count]').first()).toHaveText('2');

  await page.goto('/cart.html');
  await expect(page.locator('.cart-line')).toHaveCount(2);

  await page.locator('.cart-line', { hasText: 'Adhesive Cable Clips' }).locator('[data-remove]').click();
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.locator('[data-cart-count]').first()).toHaveText('1');
});

test('changing quantity on the cart page updates the stored cart', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await page.locator('#addToCartBtn').click();
  await page.goto('/cart.html');

  await page.locator('.cart-line [data-qty]').selectOption('3');
  await page.waitForTimeout(150);

  await page.reload();
  await expect(page.locator('.cart-line [data-qty]')).toHaveValue('3');
});

test('checkout is gated on the cart page while every product is in preview (honest, no fake buy button)', async ({ page }) => {
  await page.goto('/product/cable-clips.html');
  await page.locator('#addToCartBtn').click();
  await page.goto('/cart.html');

  await expect(page.locator('.lifecycle-notice')).toBeVisible();
  await expect(page.locator('#checkoutBtn')).toHaveCount(0);
  await expect(page.locator('.lifecycle-notice')).toContainText('No physical sample');
});

test('cart math is exact once pricing exists (verified against a controlled fixture, not real catalog data)', async ({ page }) => {
  // The real catalogue has no confirmed prices yet (honestly, by design — see
  // PRODUCT_LIFECYCLE.md). To prove the arithmetic itself is correct, this
  // test serves a modified COPY of the catalogue with one price filled in,
  // only inside this test's browser context. Nothing in the real site or
  // data/products.json is touched.
  const fixture = structuredClone(REAL_CATALOG);
  const target = fixture.products.find((p) => p.sku === 'ASC-CBLCLIP-01');
  target.pricing.priceGBP = 4.99;

  await page.route('**/data/products.json', (route) => route.fulfill({ json: fixture }));

  await page.goto('/product/cable-clips.html');
  // Re-fetch inside the page also needs the route active for the product page's own JS, which loadCatalog() handles via cart.js fetch — already routed above.
  await page.locator('#qtyInc').click(); // -> 2
  await page.locator('#addToCartBtn').click();

  await page.goto('/cart.html');
  await expect(page.locator('.cart-line-price')).toHaveText('£9.98');
  await expect(page.locator('.cart-totals-row.total span').nth(1)).toHaveText('£9.98');
});
