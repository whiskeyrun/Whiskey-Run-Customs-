// Loads the owner's live Supabase catalog into the existing storefront design.
(async () => {
  try {
    const response = await fetch('/.netlify/functions/list-products', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Product catalog could not be loaded.');
    if (!Array.isArray(data) || data.length === 0) {
      console.info('No active dashboard products yet; showing the existing catalog.');
      return;
    }

    const liveProducts = data.map((p) => ({
      id: Number(p.id),
      name: p.name || 'Custom product',
      desc: p.description || '',
      price: Number(p.price) || 0,
      symbol: '✦',
      tag: Number(p.price) > 0 ? 'MADE TO ORDER' : 'CUSTOM QUOTE',
      image: p.image_url || ''
    }));

    // Mutate the existing array so the site's cart and design keep working.
    products.splice(0, products.length, ...liveProducts);
    cart = [];
    renderProducts();
    renderCart();
  } catch (error) {
    console.error('Could not load the live product catalog:', error);
  }
})();
