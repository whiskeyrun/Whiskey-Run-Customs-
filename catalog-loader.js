
(async () => {
  function category(p) {
    const name = String(p.name || '').toLowerCase();
    if (/wallet|rfid/.test(name)) return 1;
    if (/coaster/.test(name)) return 2;
    if (/charcuterie|cutting board/.test(name)) return 3;
    if (/lazy susan/.test(name)) return 4;
    if (/carving|cnc/.test(name)) return 5;
    return 6;
  }

  try {
    const response = await fetch('/.netlify/functions/list-products', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Catalog could not be loaded.');

    const merged = new Map(products.map(p => [String(p.id), p]));

    if (Array.isArray(data)) {
      for (const p of data) {
        const product = {
          id: p.id,
          name: p.name || 'Custom product',
          desc: p.description || '',
          price: Number(p.price) || 0,
          symbol: '✦',
          tag: Number(p.price) > 0 ? 'MADE TO ORDER' : 'CUSTOM QUOTE',
          image: p.image_url || ''
        };

        const existing = merged.get(String(p.id));
        merged.set(String(p.id), existing
          ? { ...existing, ...product, image: product.image || existing.image || '' }
          : product);
      }
    }

    products.splice(0, products.length, ...merged.values());
  } catch (error) {
    console.error('Could not load dashboard products:', error);
  }

  products.sort((a, b) => category(a) - category(b));
  renderProducts();
  renderCart();
})();

