#!/usr/bin/env node
/* Regenerates sitemap.xml from the static page list + data/products.json.
 * Run manually after adding a page or changing the catalogue:
 *   node scripts/generate-sitemap.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = 'https://a-sharif-commerce.vercel.app';
const today = new Date().toISOString().slice(0, 10);

const staticPages = [
  '/',
  '/shop.html',
  '/trade.html',
  '/about.html',
  '/contact.html',
  '/what-we-source.html',
  '/how-we-buy.html',
  '/supplier-standards.html',
  '/delivery.html',
  '/returns.html',
  '/privacy.html',
  '/terms.html',
  '/accessibility.html',
  '/cookies.html',
];

const catalog = JSON.parse(readFileSync(join(ROOT, 'data', 'products.json'), 'utf8'));
const productPages = catalog.products.map((p) => `/product/${p.slug}.html`);

const urls = [...staticPages, ...productPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${SITE_URL}${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml written with ${urls.length} URLs.`);
