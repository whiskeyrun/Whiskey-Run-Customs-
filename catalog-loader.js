// Loads products saved in the owner dashboard into the storefront.
(async () => {
  try {
    const client = window.supabase.createClient(
      'https://vaksbwntwarmyidkudcf.supabase.co',
      'sb_publishable_5LTFwcF5Cprv4GXd9K0bOQ_LWlpcwWD'
    );
    const { data, error } = await client
      .from('products')
      .select('id,name,description,price,image_url,available')
      .eq('available', true)
      .order('id', { ascending: true });

    if (error) throw error;
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

    // Mutate the original array so the existing cart and rendering functions
    // continue to work without replacing the site's design.
    products.splice(0, products.length, ...liveProducts);
    cart = [];
    renderProducts();
    renderCart();
  } catch (error) {
    console.error('Could not load the live product catalog:', error);
  }
})();
