import { test, expect } from '@playwright/test';

const STATIC_PAGES = [
  '/index.html', '/shop.html', '/trade.html', '/about.html', '/contact.html',
  '/what-we-source.html', '/how-we-buy.html', '/supplier-standards.html',
  '/delivery.html', '/returns.html', '/privacy.html', '/terms.html',
  '/accessibility.html', '/cookies.html', '/cart.html', '/404.html', '/500.html',
  '/checkout/success.html', '/checkout/cancel.html',
  '/product/cable-clips.html', '/product/cable-organiser-box.html', '/product/packing-cubes.html',
  '/product/drawer-organisers.html', '/product/roll-up-sink-rack.html', '/product/sink-caddy.html',
  '/product/broom-mop-holder.html', '/product/wardrobe-organiser.html',
];

const INTERNAL_PAGES = new Set(STATIC_PAGES.map((p) => p.replace(/^\//, '')));

async function collectErrors(page) {
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  page.on('requestfailed', (req) => failedRequests.push(req.url()));
  return { consoleErrors, failedRequests };
}

// Google Fonts is loaded from every page (a genuine external dependency,
// declared in CLAUDE.md). This sandbox's outbound proxy has repeatedly
// failed that one cross-origin TLS connection throughout this build
// (confirmed via page.on('requestfailed') across multiple runs — always
// fonts.googleapis.com, never anything same-origin) — it's a test
// environment artifact, not a site defect, so it's excluded here rather
// than ignored silently: any OTHER failed request still fails the test.
const EXTERNAL_FONT_HOST = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

test.describe('Every page: status, console, overflow, single h1', () => {
  for (const path of STATIC_PAGES) {
    test(`${path} loads clean`, async ({ page }) => {
      const { consoleErrors, failedRequests } = await collectErrors(page);
      const resp = await page.goto(path, { waitUntil: 'networkidle' });
      expect(resp.status(), `${path} should respond 200`).toBe(200);

      const unexpectedFailedRequests = failedRequests.filter((u) => !EXTERNAL_FONT_HOST.test(u));
      expect(unexpectedFailedRequests, `unexpected failed requests on ${path}`).toEqual([]);

      const genericResourceErrorPattern = /^Failed to load resource: net::/;
      const realErrors = consoleErrors.filter((e) => !genericResourceErrorPattern.test(e));
      expect(realErrors, `console errors on ${path}: ${JSON.stringify(realErrors)}`).toEqual([]);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, `${path} should not overflow horizontally`).toBe(false);

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${path} should have exactly one h1`).toBe(1);

      const title = await page.title();
      expect(title.length, `${path} should have a non-empty title`).toBeGreaterThan(0);
    });
  }
});

test.describe('Link integrity', () => {
  for (const path of STATIC_PAGES) {
    test(`internal links on ${path} resolve to known pages`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
      const bad = [];
      for (const href of hrefs) {
        if (!href || href.startsWith('mailto:') || href.startsWith('http') || href.startsWith('#')) continue;
        const [clean] = href.split(/[?#]/);
        const normalized = clean.replace(/^\//, '');
        if (normalized === '') continue; // root
        if (normalized === 'PRODUCT_LIFECYCLE.md') continue; // intentionally a markdown doc, not an HTML page
        if (!INTERNAL_PAGES.has(normalized)) bad.push(href);
      }
      expect(bad, `broken internal links on ${path}`).toEqual([]);
    });
  }
});

test('404 page is marked noindex', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toContain('noindex');
  await expect(page.locator('h1')).toContainText("doesn't exist");
});
