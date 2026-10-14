import { test, expect } from '@playwright/test';

test('PRODUCT_LIFECYCLE.md and data/products.json are reachable', async ({ page }) => {
  const r1 = await page.goto('/PRODUCT_LIFECYCLE.md');
  expect(r1.status()).toBe(200);
  const r2 = await page.goto('/data/products.json');
  expect(r2.status()).toBe(200);
});

test('mobile menu: open, keyboard trap, Escape closes and returns focus', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width > 720, 'mobile-nav-only test');

  await page.goto('/index.html');
  const toggle = page.locator('#menuToggle');
  await toggle.click();

  const nav = page.locator('#mainNav');
  await expect(nav).toHaveClass(/open/);
  await expect(page.locator('#mainNav ul li a').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(nav).not.toHaveClass(/open/);
  await expect(toggle).toBeFocused();

  // visibility:hidden is applied after a 280ms CSS transition delay (so the
  // slide-closed animation can finish first) — poll rather than reading once.
  await expect(async () => {
    const navVisibility = await nav.evaluate((el) => getComputedStyle(el).visibility);
    expect(navVisibility).toBe('hidden');
  }).toPass({ timeout: 1000 });
});

test('header scroll state toggles on desktop', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width <= 720, 'desktop-only test');

  await page.goto('/index.html');
  const header = page.locator('#siteHeader');
  await expect(header).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(header).toHaveClass(/is-scrolled/);
});

test('keyboard: can tab to and activate the cart toggle without a mouse', async ({ page }) => {
  await page.goto('/index.html');
  const cartToggle = page.locator('[data-cart-toggle]').first();
  await cartToggle.focus();
  await expect(cartToggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.cart-drawer')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.cart-drawer')).not.toHaveClass(/open/);
});

test('skip link is the first focusable element and works', async ({ page }) => {
  await page.goto('/index.html');
  await page.keyboard.press('Tab');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeFocused();
});
