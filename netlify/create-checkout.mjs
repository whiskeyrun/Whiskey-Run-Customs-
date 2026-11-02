import Stripe from 'stripe';

const PRODUCTS = {
  4: { name: 'Laser-Engraved RFID Wallets', amount: 6000 },
  5: { name: 'Slate Coasters', amount: 2000 },
  6: { name: 'Small Slate Charcuterie Boards', amount: 2500 },
  7: { name: 'Large Slate Charcuterie Boards', amount: 5000 },
};

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405, headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured yet. Please contact the store.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
      return new Response(JSON.stringify({ error: 'Your cart is empty or invalid.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const line_items = body.items.map((item) => {
      const product = PRODUCTS[Number(item.id)];
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new Error('One or more cart items are invalid. Please refresh and try again.');
      }
      return {
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: product.amount,
          product_data: { name: product.name },
        },
      };
    });

    const stripe = new Stripe(secretKey);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    const status = error.message.includes('cart items') ? 400 : 502;
    return new Response(JSON.stringify({ error: status === 400 ? error.message : 'We could not start checkout. Please try again or contact the store.' }), {
      status, headers: { 'Content-Type': 'application/json' }
    });
  }
};
