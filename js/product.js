/* Product detail page: variant selection, quantity, add-to-cart, gallery, tabs. */
(function () {
  const dataEl = document.getElementById('productData');
  if (!dataEl) return;
  const product = JSON.parse(dataEl.textContent);

  let selectedVariantId = product.variants[0] && product.variants[0].id;
  let qty = 1;

  const variantButtons = document.querySelectorAll('[data-variant-id]');
  const qtyInput = document.getElementById('qtyInput');
  const addBtn = document.getElementById('addToCartBtn');
  const addStatus = document.getElementById('addToCartStatus');

  function currentVariant() {
    return product.variants.find((v) => v.id === selectedVariantId);
  }

  function updateVariantUI() {
    variantButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.variantId === selectedVariantId));
    });
  }

  variantButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedVariantId = btn.dataset.variantId;
      updateVariantUI();
    });
  });
  updateVariantUI();

  const qtyDec = document.getElementById('qtyDec');
  const qtyInc = document.getElementById('qtyInc');
  function setQty(n) {
    qty = Math.max(1, Math.min(20, n));
    if (qtyInput) qtyInput.value = String(qty);
  }
  if (qtyDec) qtyDec.addEventListener('click', () => setQty(qty - 1));
  if (qtyInc) qtyInc.addEventListener('click', () => setQty(qty + 1));
  if (qtyInput) qtyInput.addEventListener('change', () => setQty(Number(qtyInput.value) || 1));

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      window.ASC_CART.addItem(product.sku, selectedVariantId, qty);
      if (addStatus) {
        addStatus.textContent = `Added ${qty} × ${currentVariant().label} to your cart.`;
      }
      if (window.ASC_CART_DRAWER) window.ASC_CART_DRAWER.open();
    });
  }

  // Gallery thumbnails (placeholder media — swapping the "active" state only)
  document.querySelectorAll('[data-thumb]').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('[data-thumb]').forEach((t) => t.setAttribute('aria-current', 'false'));
      thumb.setAttribute('aria-current', 'true');
    });
  });

  // Accessible tabs: click + left/right/home/end keyboard support
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  function selectTab(tab) {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length]);
      if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length]);
      if (e.key === 'Home') selectTab(tabs[0]);
      if (e.key === 'End') selectTab(tabs[tabs.length - 1]);
    });
  });
})();
