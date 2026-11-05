import Stripe from "stripe";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Allow": "POST" }
    });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !supabaseUrl || !supabaseKey) {
    console.error("Checkout configuration is missing STRIPE_SECRET_KEY, SUPABASE_URL, or SUPABASE_SECRET_KEY.");
    return Response.json({ error: "Checkout is temporarily unavailable. Please contact the store." }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
      return Response.json({ error: "Your cart is empty or invalid." }, { status: 400 });
    }

    const requested = body.items.map((item) => {
      const id = String(item.id ?? "");
      const quantity = Number(item.quantity);
      if (!/^\\d+$/.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new Error("One or more cart items are invalid.");
      }
      return { id, quantity };
    });

    const ids = [...new Set(requested.map((item) => item.id))];
    const query = new URLSearchParams({
      select: "id,name,price,available",
      id: `in.(${ids.join(",")})`,
      available: "eq.true"
    });
    const productResponse = await fetch(
      `${supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl}/rest/v1/products?${query.toString()}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json"
        }
      }
    );

    if (!productResponse.ok) {
      console.error("Supabase product lookup failed:", productResponse.status, await productResponse.text());
      throw new Error("Unable to verify cart products.");
    }

    const productRows = await productResponse.json();
    const productMap = new Map(productRows.map((product) => [String(product.id), product]));

    const line_items = requested.map(({ id, quantity }) => {
      const product = productMap.get(id);
      const amount = Math.round(Number(product?.price) * 100);
      if (!product || !Number.isSafeInteger(amount) || amount < 50 || amount > 99999999) {
        throw new Error("A cart item is no longer available for online payment. Custom-quote products must be requested separately.");
      }
      return {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: product.name }
        }
      };
    });

    const stripe = new Stripe(stripeKey);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`
    });

    return Response.json(
      { url: session.url },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Checkout error:", error.message);
    const invalid = /cart|available|verify/i.test(error.message);
    return Response.json(
      { error: invalid ? error.message : "Unable to start checkout. Please try again or contact the store." },
      { status: invalid ? 400 : 502 }
    );
  }
};
