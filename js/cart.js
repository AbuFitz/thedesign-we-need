/*
 * Shared cart engine + drawer. Include on every page as:
 *   <button type="button" data-cart-toggle class="cart-link">Cart <span class="cart-count" data-cart-count>0</span></button>
 *   <script src="js/cart.js" defer></script>
 *
 * Cart state lives in localStorage ("asc_cart_v1") as [{sku, variantId, quantity}].
 * Display data (name/price/lifecycle) is resolved client-side from
 * data/products.json purely for UI purposes — the server-side checkout API
 * never trusts this and re-resolves everything itself from the same JSON
 * file read on the server.
 */
(function () {
  const STORAGE_KEY = 'asc_cart_v1';
  const listeners = [];
  let catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('/data/products.json')
        .then((r) => {
          if (!r.ok) throw new Error('catalog_fetch_failed');
          return r.json();
        })
        .catch(() => ({ products: [] }));
    }
    return catalogPromise;
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* localStorage unavailable (private mode / quota) — cart just won't persist */
    }
    listeners.forEach((fn) => fn(items));
    renderCount(items);
  }

  function addItem(sku, variantId, quantity) {
    const items = readCart();
    const existing = items.find((i) => i.sku === sku && i.variantId === variantId);
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + quantity);
    } else {
      items.push({ sku, variantId, quantity: Math.min(20, Math.max(1, quantity)) });
    }
    writeCart(items);
  }

  function updateQty(sku, variantId, quantity) {
    let items = readCart();
    const qty = Math.max(1, Math.min(20, quantity));
    items = items.map((i) => (i.sku === sku && i.variantId === variantId ? { ...i, quantity: qty } : i));
    writeCart(items);
  }

  function removeItem(sku, variantId) {
    const items = readCart().filter((i) => !(i.sku === sku && i.variantId === variantId));
    writeCart(items);
  }

  function clearCart() {
    writeCart([]);
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  async function getHydratedItems() {
    const [items, catalog] = await Promise.all([Promise.resolve(readCart()), loadCatalog()]);
    const products = catalog.products || [];
    return items
      .map((item) => {
        const product = products.find((p) => p.sku === item.sku);
        if (!product) return null;
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) return null;
        return { ...item, product, variant };
      })
      .filter(Boolean);
  }

  async function getTotals() {
    const hydrated = await getHydratedItems();
    const priceableCount = hydrated.filter((i) => typeof i.product.pricing.priceGBP === 'number').length;
    const subtotalPence = hydrated.reduce((sum, i) => {
      const price = i.product.pricing.priceGBP;
      return typeof price === 'number' ? sum + Math.round(price * 100) * i.quantity : sum;
    }, 0);
    return {
      itemCount: hydrated.reduce((n, i) => n + i.quantity, 0),
      subtotalPence,
      allPriced: priceableCount === hydrated.length && hydrated.length > 0,
      anyCheckoutBlocked: hydrated.some((i) => i.product.lifecycle.status !== 'checkout_ready' || !i.variant.stripePriceId),
      blockedItems: hydrated.filter((i) => i.product.lifecycle.status !== 'checkout_ready' || !i.variant.stripePriceId),
    };
  }

  function formatGBP(pence) {
    return `£${(pence / 100).toFixed(2)}`;
  }

  function renderCount(items) {
    const n = items.reduce((sum, i) => sum + i.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(n);
      el.dataset.empty = n === 0 ? 'true' : 'false';
    });
  }

  function placeholderIconSVG() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Zm3-3a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  }

  function buildDrawer() {
    const backdrop = document.createElement('div');
    backdrop.className = 'cart-drawer-backdrop';
    backdrop.setAttribute('data-cart-backdrop', '');

    const drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Cart');
    drawer.innerHTML = `
      <div class="cart-drawer-head">
        <h2>Your cart</h2>
        <button type="button" class="cart-drawer-close" data-cart-close aria-label="Close cart">&times;</button>
      </div>
      <div class="cart-drawer-items" data-cart-items></div>
      <div class="cart-drawer-foot" data-cart-foot></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    return { backdrop, drawer };
  }

  let lastFocused = null;

  function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function renderDrawerContents(drawer) {
    const itemsEl = drawer.querySelector('[data-cart-items]');
    const footEl = drawer.querySelector('[data-cart-foot]');
    const hydrated = await getHydratedItems();

    if (!hydrated.length) {
      itemsEl.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><p><a class="link-arrow accent" href="/shop.html">Browse the shop<span class="arrow" aria-hidden="true">→</span></a></p></div>';
      footEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = hydrated
      .map(
        (i) => `
      <div class="cart-line" data-line="${i.sku}|${i.variantId}">
        <div class="cart-line-media">${placeholderIconSVG()}</div>
        <div>
          <div class="cart-line-name">${escapeHtml(i.product.name)}</div>
          <div class="cart-line-variant">${escapeHtml(i.variant.label)} · Qty
            <select data-qty aria-label="Quantity for ${escapeHtml(i.product.name)}">
              ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}" ${n === i.quantity ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <button type="button" class="cart-line-remove" data-remove>Remove</button>
        </div>
        <div class="cart-line-price">${typeof i.product.pricing.priceGBP === 'number' ? formatGBP(Math.round(i.product.pricing.priceGBP * 100) * i.quantity) : 'Price TBC'}</div>
      </div>`
      )
      .join('');

    itemsEl.querySelectorAll('[data-line]').forEach((lineEl) => {
      const [sku, variantId] = lineEl.dataset.line.split('|');
      lineEl.querySelector('[data-remove]').addEventListener('click', () => removeItem(sku, variantId));
      lineEl.querySelector('[data-qty]').addEventListener('change', (e) => updateQty(sku, variantId, Number(e.target.value)));
    });

    const totals = await getTotals();
    footEl.innerHTML = `
      <div class="cart-totals-row total">
        <span>Subtotal</span>
        <span>${totals.allPriced ? formatGBP(totals.subtotalPence) : 'Pricing not yet confirmed'}</span>
      </div>
      <p style="margin-top:1rem;"><a class="btn-solid" href="/cart.html" style="width:100%;justify-content:center;">View cart &amp; checkout<span class="arrow" aria-hidden="true">→</span></a></p>
    `;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  function initDrawer() {
    const { backdrop, drawer } = buildDrawer();
    const toggles = document.querySelectorAll('[data-cart-toggle]');

    const open = () => {
      lastFocused = document.activeElement;
      backdrop.classList.add('open');
      drawer.classList.add('open');
      renderDrawerContents(drawer);
      const closeBtn = drawer.querySelector('[data-cart-close]');
      if (closeBtn) closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    };
    const close = () => {
      backdrop.classList.remove('open');
      drawer.classList.remove('open');
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };
    const onKeydown = (e) => {
      if (e.key === 'Escape') close();
      trapFocus(e, drawer);
    };

    toggles.forEach((btn) => btn.addEventListener('click', open));
    backdrop.addEventListener('click', close);
    drawer.querySelector('[data-cart-close]').addEventListener('click', close);

    subscribe(() => {
      if (drawer.classList.contains('open')) renderDrawerContents(drawer);
    });

    window.ASC_CART_DRAWER = { open, close };
  }

  // Public API
  window.ASC_CART = {
    readCart,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    subscribe,
    getHydratedItems,
    getTotals,
    formatGBP,
    loadCatalog,
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderCount(readCart());
    // Drawer isn't needed on the full cart page itself, but it's harmless
    // and keeps the header toggle consistent if present there too.
    initDrawer();
  });
})();
