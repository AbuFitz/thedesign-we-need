import { test, expect } from '@playwright/test';

test.describe('Shop catalogue', () => {
  test('lists all 8 products by default', async ({ page }) => {
    await page.goto('/shop.html');
    await expect(page.locator('.product-card')).toHaveCount(8);
    await expect(page.locator('#resultCount')).toContainText('Showing 8 of 8');
  });

  test('search filters results and persists in the URL', async ({ page }) => {
    await page.goto('/shop.html');
    await page.locator('#shopSearch').fill('cable');
    await expect(page.locator('.product-card')).toHaveCount(2);
    await expect(page).toHaveURL(/[?&]q=cable/);

    // Reloading the URL directly should reproduce the same filtered state.
    await page.reload();
    await expect(page.locator('.product-card')).toHaveCount(2);
    await expect(page.locator('#shopSearch')).toHaveValue('cable');
  });

  test('category filter persists in the URL and updates aria-pressed', async ({ page }) => {
    await page.goto('/shop.html');
    await page.locator('.filter-chip', { hasText: 'Kitchen' }).click();
    await expect(page).toHaveURL(/[?&]cat=kitchen/);
    await expect(page.locator('.product-card')).toHaveCount(2);
    await expect(page.locator('.filter-chip', { hasText: 'Kitchen' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('sort order persists in the URL', async ({ page }) => {
    await page.goto('/shop.html');
    const ascFirst = await page.locator('.product-card h3').first().textContent();

    await page.locator('#shopSort').selectOption('name-desc');
    await expect(page).toHaveURL(/[?&]sort=name-desc/);
    const descFirst = await page.locator('.product-card h3').first().textContent();

    expect(descFirst.trim()).not.toBe(ascFirst.trim());
    expect(descFirst.trim()).toBe('Wall-Mounted Broom & Mop Holder');
  });

  test('empty state when nothing matches, with a working clear-filters action', async ({ page }) => {
    await page.goto('/shop.html?q=zzz-nonexistent');
    await expect(page.locator('.empty-state')).toBeVisible();
    await page.locator('#clearFilters').click();
    await expect(page.locator('.product-card')).toHaveCount(8);
    await expect(page).not.toHaveURL(/[?&]q=/);
  });

  test('direct navigation with combined URL state (search+category+sort) renders correctly', async ({ page }) => {
    await page.goto('/shop.html?cat=kitchen&sort=name-desc');
    await expect(page.locator('#shopSort')).toHaveValue('name-desc');
    await expect(page.locator('.filter-chip', { hasText: 'Kitchen' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.product-card')).toHaveCount(2);
  });

  test('every product card shows an honest "Preview" badge (none are checkout_ready yet)', async ({ page }) => {
    await page.goto('/shop.html');
    const badges = page.locator('.product-card .badge-preview');
    await expect(badges).toHaveCount(8);
  });
});
