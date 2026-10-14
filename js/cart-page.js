/* Full /cart.html page: line items, totals, lifecycle-gated checkout. */
(function () {
  const itemsEl = document.getElementById('cartPageItems');
  const summaryEl = document.getElementById('cartSummary');
  if (!itemsEl) return;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
  function placeholderIconSVG() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Zm3-3a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  }

  async function render() {
    const hydrated = await window.ASC_CART.getHydratedItems();

    if (!hydrated.length) {
      itemsEl.innerHTML = '<div class="cart-empty"><h2 class="display-md">Your cart is empty</h2><p class="lede">Nothing added yet.</p><p style="margin-top:1.4rem;"><a class="btn-solid" href="/shop.html">Browse the shop<span class="arrow" aria-hidden="true">→</span></a></p></div>';
      summaryEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = hydrated
      .map(
        (i) => `
      <div class="cart-line" data-line="${i.sku}|${i.variantId}">
        <div class="cart-line-media">${placeholderIconSVG()}</div>
        <div>
          <div class="cart-line-name"><a href="/product/${i.product.slug}.html">${escapeHtml(i.product.name)}</a></div>
          <div class="cart-line-variant">${escapeHtml(i.variant.label)} · Qty
            <select data-qty aria-label="Quantity for ${escapeHtml(i.product.name)}">
              ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}" ${n === i.quantity ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          ${i.product.lifecycle.status !== 'checkout_ready' ? `<p class="badge badge-blocked" style="margin-top:0.5rem;">Not yet available to buy</p>` : ''}
          <button type="button" class="cart-line-remove" data-remove>Remove</button>
        </div>
        <div class="cart-line-price">${typeof i.product.pricing.priceGBP === 'number' ? window.ASC_CART.formatGBP(Math.round(i.product.pricing.priceGBP * 100) * i.quantity) : 'Price TBC'}</div>
      </div>`
      )
      .join('');

    itemsEl.querySelectorAll('[data-line]').forEach((lineEl) => {
      const [sku, variantId] = lineEl.dataset.line.split('|');
      lineEl.querySelector('[data-remove]').addEventListener('click', () => window.ASC_CART.removeItem(sku, variantId));
      lineEl.querySelector('[data-qty]').addEventListener('change', (e) => window.ASC_CART.updateQty(sku, variantId, Number(e.target.value)));
    });

    const totals = await window.ASC_CART.getTotals();

    const blockedList = totals.blockedItems
      .map((i) => `<li><strong>${escapeHtml(i.product.name)}</strong> — ${(i.product.lifecycle.blockedReasons || []).join('; ') || 'not yet approved for checkout'}</li>`)
      .join('');

    summaryEl.innerHTML = `
      <div class="cart-totals-row total">
        <span>Subtotal</span>
        <span>${totals.allPriced ? window.ASC_CART.formatGBP(totals.subtotalPence) : 'Pricing not yet confirmed'}</span>
      </div>
      ${
        totals.anyCheckoutBlocked
          ? `<div class="lifecycle-notice" role="status" style="margin-top:1.4rem;">
              <strong>Checkout isn't available yet</strong>
              One or more items in your cart aren't approved for checkout:
              <ul>${blockedList}</ul>
              <p style="margin-top:0.6rem;">You can still browse and build your cart — see <a href="/PRODUCT_LIFECYCLE.md">what has to happen before checkout opens</a>.</p>
            </div>`
          : `<button type="button" id="checkoutBtn" class="btn-solid" style="width:100%;justify-content:center;margin-top:1.4rem;">Checkout<span class="arrow" aria-hidden="true">→</span></button>`
      }
      <div id="checkoutError" class="checkout-status is-error" hidden></div>
    `;

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Starting checkout…';
        const errorEl = document.getElementById('checkoutError');
        try {
          const items = window.ASC_CART.readCart();
          const resp = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });
          const json = await resp.json();
          if (!resp.ok) {
            const message = json.message || (json.blocked && json.blocked.map((b) => b.reasons.join('; ')).join(' | ')) || 'Checkout is not available right now.';
            throw new Error(message);
          }
          window.location.href = json.url;
        } catch (err) {
          checkoutBtn.disabled = false;
          checkoutBtn.innerHTML = 'Checkout<span class="arrow" aria-hidden="true">→</span>';
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = err.message || 'Something went wrong starting checkout.';
          }
        }
      });
    }
  }

  window.ASC_CART.subscribe(render);
  render();
})();
