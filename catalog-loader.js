// Merge dashboard products into the original catalog without hiding any
// of the products already present in the storefront.
(async () => {
  try {
    const response = await fetch('/.netlify/functions/list-products', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Product catalog could not be loaded.');
    if (!Array.isArray(data) || data.length === 0) return;

    const dashboardProducts = data.map((p) => ({
      id: p.id,
      name: p.name || 'Custom product',
      desc: p.description || '',
      price: Number(p.price) || 0,
      symbol: '✦',
      tag: Number(p.price) > 0 ? 'MADE TO ORDER' : 'CUSTOM QUOTE',
      image: p.image_url || ''
    }));

    // Preserve the complete built-in catalog. Only update products with a
    // matching ID, and append dashboard-only products rather than replacing
    // the entire list with a possibly partial database result.
    const merged = new Map(products.map((p) => [String(p.id), p]));
    for (const product of dashboardProducts) {
      const existing = merged.get(String(product.id));
      merged.set(String(product.id), existing
        ? { ...existing, ...product, image: product.image || existing.image || '' }
        : product);
    }

    products.splice(0, products.length, ...merged.values());
    renderProducts();
    renderCart();
  } catch (error) {
    console.error('Could not load dashboard products; keeping the original catalog:', error);
  }
})();
