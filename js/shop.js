/* Catalogue page: search, category filter, sort, URL-persisted state. */
(function () {
  const grid = document.getElementById('productGrid');
  const resultCountEl = document.getElementById('resultCount');
  const searchInput = document.getElementById('shopSearch');
  const sortSelect = document.getElementById('shopSort');
  const filterListEl = document.getElementById('categoryFilters');
  if (!grid) return;

  const SORTS = {
    'name-asc': { label: 'Name: A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
    'name-desc': { label: 'Name: Z–A', fn: (a, b) => b.name.localeCompare(a.name) },
    category: { label: 'Category', fn: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) },
  };

  function getState() {
    const params = new URLSearchParams(location.search);
    return {
      q: params.get('q') || '',
      cat: params.get('cat') || '',
      sort: SORTS[params.get('sort')] ? params.get('sort') : 'name-asc',
    };
  }

  function setState(next, { replace } = {}) {
    const params = new URLSearchParams(location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    const url = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    render();
  }

  function placeholderIconSVG() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Zm3-3a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  let catalog = null;

  async function loadCatalog() {
    grid.innerHTML = '<div class="empty-state"><p>Loading the catalogue…</p></div>';
    try {
      const resp = await fetch('/data/products.json');
      if (!resp.ok) throw new Error('fetch_failed');
      catalog = await resp.json();
    } catch {
      grid.innerHTML = '<div class="error-state"><h3>The catalogue couldn\'t be loaded</h3><p>Please refresh the page. If this keeps happening, <a class="link-arrow accent" href="/contact.html">let us know<span class="arrow" aria-hidden="true">→</span></a>.</p></div>';
      throw new Error('catalog_load_failed');
    }
  }

  function renderFilters(state) {
    if (!filterListEl || !catalog) return;
    const counts = {};
    catalog.products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });

    const chips = [{ id: '', label: 'All products', count: catalog.products.length }].concat(
      catalog.categories.map((c) => ({ id: c.id, label: c.label, count: counts[c.id] || 0 }))
    );

    filterListEl.innerHTML = chips
      .map(
        (c) => `<li><button type="button" class="filter-chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">
          <span>${escapeHtml(c.label)}</span><span class="count">${c.count}</span>
        </button></li>`
      )
      .join('');

    filterListEl.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => setState({ cat: btn.dataset.cat || null }));
    });
  }

  function matches(product, state) {
    if (state.cat && product.category !== state.cat) return false;
    if (state.q) {
      const haystack = `${product.name} ${product.shortDescription} ${product.category}`.toLowerCase();
      if (!haystack.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }

  function productCardHTML(p) {
    const priced = typeof p.pricing.priceGBP === 'number';
    return `
      <a class="product-card" href="/product/${p.slug}.html">
        <div class="product-card-media">${placeholderIconSVG()}
          ${p.lifecycle.status !== 'checkout_ready' ? '<span class="badge badge-preview" style="position:absolute;top:0.7rem;left:0.7rem;">Preview</span>' : ''}
        </div>
        <p class="product-cat">${escapeHtml((catalog.categories.find((c) => c.id === p.category) || {}).label || p.category)}</p>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="product-price">${priced ? '£' + p.pricing.priceGBP.toFixed(2) : 'Price to be confirmed'}</p>
      </a>`;
  }

  function render() {
    if (!catalog) return;
    const state = getState();

    if (searchInput && searchInput.value !== state.q) searchInput.value = state.q;
    if (sortSelect && sortSelect.value !== state.sort) sortSelect.value = state.sort;

    renderFilters(state);

    const filtered = catalog.products.filter((p) => matches(p, state)).sort(SORTS[state.sort].fn);

    if (resultCountEl) {
      resultCountEl.textContent = filtered.length === 0
        ? 'No products match your filters'
        : `Showing ${filtered.length} of ${catalog.products.length} product${catalog.products.length === 1 ? '' : 's'}`;
    }

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state"><h3>Nothing matches that search</h3><p>Try a different term, or <button type="button" class="link-arrow accent" id="clearFilters">clear filters<span class="arrow" aria-hidden="true">→</span></button>.</p></div>`;
      const clearBtn = document.getElementById('clearFilters');
      if (clearBtn) clearBtn.addEventListener('click', () => setState({ q: null, cat: null }));
      return;
    }

    grid.innerHTML = filtered.map(productCardHTML).join('');
  }

  let searchDebounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => setState({ q: searchInput.value || null }, { replace: true }), 200);
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => setState({ sort: sortSelect.value === 'name-asc' ? null : sortSelect.value }));
  }
  window.addEventListener('popstate', render);

  loadCatalog().then(render).catch(() => {});
})();
